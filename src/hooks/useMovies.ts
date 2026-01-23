import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  banner_url: string | null;
  rating: number | null;
  votes_count: string | null;
  genres: string[] | null;
  language: string | null;
  certificate: string | null;
  duration_minutes: number | null;
  release_date: string | null;
  is_featured: boolean | null;
  is_available: boolean | null;
}

export interface Showtime {
  id: string;
  movie_id: string;
  show_date: string;
  show_time: string;
  theater_name: string;
  available_seats: number | null;
  price: number | null;
  is_active: boolean | null;
}

export const useMovies = () => {
  return useQuery({
    queryKey: ["movies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("is_available", true)
        .order("rating", { ascending: false });
      
      if (error) throw error;
      return data as Movie[];
    },
  });
};

export const useFeaturedMovies = () => {
  return useQuery({
    queryKey: ["featured-movies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("is_featured", true)
        .eq("is_available", true);
      
      if (error) throw error;
      return data as Movie[];
    },
  });
};

export const useMovie = (movieId: string) => {
  return useQuery({
    queryKey: ["movie", movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("id", movieId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Movie | null;
    },
    enabled: !!movieId,
  });
};

export const useShowtimes = (movieId: string) => {
  return useQuery({
    queryKey: ["showtimes", movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showtimes")
        .select("*")
        .eq("movie_id", movieId)
        .eq("is_active", true)
        .gte("show_date", new Date().toISOString().split("T")[0])
        .order("show_date", { ascending: true })
        .order("show_time", { ascending: true });
      
      if (error) throw error;
      return data as Showtime[];
    },
    enabled: !!movieId,
  });
};
