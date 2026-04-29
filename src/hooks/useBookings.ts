import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Booking {
  id: string;
  user_id: string;
  movie_id: string;
  showtime_id: string;
  seats_booked: number | null;
  seat_numbers: string[] | null;
  total_amount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  payment_id: string | null;
  created_at: string;
  movies?: {
    title: string;
    poster_url: string | null;
  };
  showtimes?: {
    show_date: string;
    show_time: string;
    theater_name: string;
    price: number | null;
  };
}

export const useBookings = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          movies (title, poster_url),
          showtimes (show_date, show_time, theater_name, price)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });
};

interface CreateBookingParams {
  movieId: string;
  showtimeId: string;
  seatsBooked: number;
  totalAmount: number;
  seatNumbers: string[];
}

export const useCreateBooking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ movieId, showtimeId, seatsBooked, totalAmount, seatNumbers }: CreateBookingParams) => {
      if (!user) throw new Error("User must be logged in");
      
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          movie_id: movieId,
          showtime_id: showtimeId,
          seats_booked: seatsBooked,
          total_amount: totalAmount,
          seat_numbers: seatNumbers,
          status: "pending",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["showtimes"] });
      queryClient.invalidateQueries({ queryKey: ["booked-seats", variables.showtimeId] });
    },
  });
};

export const useBookedSeats = (showtimeId: string | null) => {
  return useQuery({
    queryKey: ["booked-seats", showtimeId],
    queryFn: async () => {
      if (!showtimeId) return [] as string[];
      const { data, error } = await supabase.rpc("get_booked_seats", {
        showtime_uuid: showtimeId,
      });
      if (error) throw error;
      return (data ?? []) as string[];
    },
    enabled: !!showtimeId,
  });
};

/**
 * Returns ALL unavailable seats for a showtime (booked + actively locked by anyone).
 * Polls every 10s so other users' selections appear quickly.
 */
export const useUnavailableSeats = (showtimeId: string | null) => {
  return useQuery({
    queryKey: ["unavailable-seats", showtimeId],
    queryFn: async () => {
      if (!showtimeId) return [] as string[];
      const { data, error } = await supabase.rpc("get_unavailable_seats", {
        showtime_uuid: showtimeId,
      });
      if (error) throw error;
      return (data ?? []) as string[];
    },
    enabled: !!showtimeId,
    refetchInterval: 10000,
  });
};

/**
 * Live seats-left counts for many showtimes at once.
 * Returns a map of showtime_id -> remaining seats (capacity - unavailable).
 */
export const useShowtimeAvailability = (
  showtimes: Array<{ id: string; available_seats: number | null }> | undefined
) => {
  const queryClient = useQueryClient();
  const ids = (showtimes ?? []).map((s) => s.id).sort().join(",");

  return useQuery({
    queryKey: ["showtime-availability", ids],
    queryFn: async () => {
      const map: Record<string, number> = {};
      if (!showtimes || showtimes.length === 0) return map;

      await Promise.all(
        showtimes.map(async (s) => {
          const { data } = await supabase.rpc("get_unavailable_seats", {
            showtime_uuid: s.id,
          });
          const taken = (data ?? []) as string[];
          // available_seats column already accounts for paid bookings;
          // subtract locks that aren't yet paid by approximating with taken count
          // capped so we never exceed the column value.
          const remaining = Math.max(
            0,
            (s.available_seats ?? 0) - taken.length
          );
          map[s.id] = remaining;
        })
      );

      return map;
    },
    enabled: !!showtimes && showtimes.length > 0,
    refetchInterval: 15000,
    staleTime: 5000,
  });
};

export const useLockSeats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      showtimeId,
      seats,
    }: {
      showtimeId: string;
      seats: string[];
    }) => {
      const { data, error } = await supabase.rpc("lock_seats", {
        showtime_uuid: showtimeId,
        seats,
      });
      if (error) throw error;
      if (data !== true) {
        throw new Error("One or more seats were just taken. Please pick different seats.");
      }
      return true;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["unavailable-seats", vars.showtimeId] });
      queryClient.invalidateQueries({ queryKey: ["showtime-availability"] });
    },
  });
};

export const useReleaseSeats = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (showtimeId: string) => {
      const { error } = await supabase.rpc("release_seats", {
        showtime_uuid: showtimeId,
      });
      if (error) throw error;
    },
    onSuccess: (_d, showtimeId) => {
      queryClient.invalidateQueries({ queryKey: ["unavailable-seats", showtimeId] });
      queryClient.invalidateQueries({ queryKey: ["showtime-availability"] });
    },
  });
};

export const useProcessPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock payment ID
      const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "paid",
          payment_id: paymentId,
        })
        .eq("id", bookingId)
        .select()
        .single();
      
      if (error) throw error;

      // Decrement available seats on the showtime so listings reflect reality
      if (data?.showtime_id && data?.seats_booked) {
        await supabase.rpc("decrease_available_seats", {
          showtime_uuid: data.showtime_id,
          seats_count: data.seats_booked,
        });
      }
      
      // Mock email notification - show toast
      toast.success("Booking Confirmed! 🎉", {
        description: "A confirmation email has been sent to your registered email address.",
        duration: 5000,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["showtimes"] });
      if (data?.showtime_id) {
        queryClient.invalidateQueries({ queryKey: ["booked-seats", data.showtime_id] });
      }
    },
  });
};
