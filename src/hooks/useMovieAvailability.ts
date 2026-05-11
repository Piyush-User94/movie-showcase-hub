import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MovieAvailability {
  showCount: number;
  seatsLeft: number;
  nextShow: { show_date: string; show_time: string; theater_name: string } | null;
}

const empty: MovieAvailability = { showCount: 0, seatsLeft: 0, nextShow: null };

/**
 * Fetches upcoming showtimes for ALL movies in one query and aggregates
 * per-movie availability. Used by the home grid for filtering + card badges.
 */
export const useAllMoviesAvailability = () => {
  return useQuery({
    queryKey: ["all-movies-availability"],
    queryFn: async (): Promise<Record<string, MovieAvailability>> => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("showtimes")
        .select("movie_id, show_date, show_time, theater_name, available_seats")
        .eq("is_active", true)
        .gte("show_date", today)
        .order("show_date", { ascending: true })
        .order("show_time", { ascending: true });

      if (error) throw error;

      const map: Record<string, MovieAvailability> = {};
      for (const row of data ?? []) {
        const cur = map[row.movie_id] ?? { ...empty };
        cur.showCount += 1;
        cur.seatsLeft += row.available_seats ?? 0;
        if (!cur.nextShow) {
          cur.nextShow = {
            show_date: row.show_date,
            show_time: row.show_time,
            theater_name: row.theater_name,
          };
        }
        map[row.movie_id] = cur;
      }
      return map;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};

/**
 * Per-movie convenience hook (used inside the modal / detail views).
 */
export const useMovieAvailability = (movieId: string) => {
  return useQuery({
    queryKey: ["movie-availability", movieId],
    queryFn: async (): Promise<MovieAvailability> => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("showtimes")
        .select("show_date, show_time, theater_name, available_seats")
        .eq("movie_id", movieId)
        .eq("is_active", true)
        .gte("show_date", today)
        .order("show_date", { ascending: true })
        .order("show_time", { ascending: true });

      if (error) throw error;

      const rows = data ?? [];
      const seatsLeft = rows.reduce((sum, r) => sum + (r.available_seats ?? 0), 0);
      return {
        showCount: rows.length,
        seatsLeft,
        nextShow: rows[0]
          ? {
              show_date: rows[0].show_date,
              show_time: rows[0].show_time,
              theater_name: rows[0].theater_name,
            }
          : null,
      };
    },
    enabled: !!movieId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
};
