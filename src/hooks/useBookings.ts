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
