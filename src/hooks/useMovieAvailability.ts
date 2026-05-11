import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MovieAvailability {
  showCount: number;
  seatsLeft: number;
  nextShow: { show_date: string; show_time: string; theater_name: string } | null;
}

/**
 * Aggregates upcoming showtime availability for a single movie.
 * Uses the showtimes.available_seats column (already accounts for paid bookings).
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
