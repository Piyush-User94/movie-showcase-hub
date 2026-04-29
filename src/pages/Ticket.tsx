import { useEffect, useMemo } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Ticket as TicketIcon,
  Calendar,
  Clock,
  MapPin,
  Armchair,
  Loader2,
  Printer,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/hooks/useBookings";

const useBooking = (bookingId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          movies (title, poster_url),
          showtimes (show_date, show_time, theater_name, price)
        `)
        .eq("id", bookingId!)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Booking | null;
    },
    enabled: !!bookingId && !!userId,
  });
};

const Ticket = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { data: booking, isLoading } = useBooking(id, user?.id);

  // QR-ish placeholder pattern
  const qrCells = useMemo(() => {
    if (!id) return [] as boolean[];
    const cells: boolean[] = [];
    for (let i = 0; i < 169; i++) {
      const ch = id.charCodeAt(i % id.length);
      cells.push(((ch + i) * 7) % 3 === 0);
    }
    return cells;
  }, [id]);

  useEffect(() => {
    document.title = booking?.movies?.title
      ? `Ticket — ${booking.movies.title}`
      : "Ticket";
  }, [booking]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Ticket not found.</p>
        <Button asChild variant="outline">
          <Link to="/bookings">Back to my bookings</Link>
        </Button>
      </div>
    );
  }

  const showDate = booking.showtimes?.show_date
    ? format(new Date(booking.showtimes.show_date), "EEE, MMM d, yyyy")
    : "—";
  const showTime = booking.showtimes?.show_time?.slice(0, 5) ?? "—";
  const seats = [...(booking.seat_numbers ?? [])].sort();

  return (
    <div className="min-h-screen bg-background py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Top bar — hidden on print */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/bookings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            My Bookings
          </Link>
        </Button>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      {/* Ticket */}
      <article
        className="max-w-2xl mx-auto bg-card border border-border rounded-2xl overflow-hidden shadow-2xl print:shadow-none print:border-0 print:rounded-none print:bg-white print:text-black"
      >
        {/* Header */}
        <header className="bg-primary text-primary-foreground px-6 py-5 flex items-center justify-between print:bg-black print:text-white">
          <div className="flex items-center gap-3">
            <TicketIcon className="h-7 w-7" />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">e-Ticket</p>
              <p className="text-lg font-bold leading-tight">CinemaBook</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="opacity-80">Booking ID</p>
            <p className="font-mono font-semibold">{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </header>

        {/* Movie */}
        <section className="px-6 pt-6 pb-4 border-b border-dashed border-border print:border-black/30">
          <h1 className="text-2xl font-bold text-foreground print:text-black">
            {booking.movies?.title ?? "Movie"}
          </h1>
          <span
            className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
              booking.status === "paid"
                ? "bg-green-500/20 text-green-500"
                : "bg-yellow-500/20 text-yellow-500"
            } print:bg-transparent print:text-black print:border print:border-black`}
          >
            {booking.status.toUpperCase()}
          </span>
        </section>

        {/* Details grid */}
        <section className="px-6 py-5 grid grid-cols-2 gap-y-4 gap-x-6 text-sm print:text-black">
          <div>
            <p className="text-xs uppercase text-muted-foreground tracking-wider print:text-gray-600">
              Date
            </p>
            <p className="mt-1 flex items-center gap-2 text-foreground print:text-black font-medium">
              <Calendar className="h-4 w-4" /> {showDate}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground tracking-wider print:text-gray-600">
              Time
            </p>
            <p className="mt-1 flex items-center gap-2 text-foreground print:text-black font-medium">
              <Clock className="h-4 w-4" /> {showTime}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs uppercase text-muted-foreground tracking-wider print:text-gray-600">
              Theater
            </p>
            <p className="mt-1 flex items-center gap-2 text-foreground print:text-black font-medium">
              <MapPin className="h-4 w-4" /> {booking.showtimes?.theater_name ?? "—"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs uppercase text-muted-foreground tracking-wider print:text-gray-600">
              Seats ({booking.seats_booked ?? seats.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {seats.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                seats.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-primary/40 text-primary font-mono text-sm print:border-black print:text-black"
                  >
                    <Armchair className="h-3 w-3" /> {s}
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Tear-line */}
        <div className="relative h-px bg-border print:bg-black/30">
          <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-background print:bg-white" />
          <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-background print:bg-white" />
        </div>

        {/* QR + price */}
        <section className="px-6 py-5 grid grid-cols-[auto_1fr] gap-6 items-center">
          <div
            className="grid grid-cols-13 gap-px p-2 bg-foreground/5 rounded print:bg-white"
            style={{ gridTemplateColumns: "repeat(13, 1fr)" }}
          >
            {qrCells.map((on, i) => (
              <span
                key={i}
                className={`block w-2 h-2 ${
                  on ? "bg-foreground print:bg-black" : "bg-transparent"
                }`}
              />
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground print:text-gray-700">
              <span>Ticket price</span>
              <span>
                ₹{booking.showtimes?.price ?? "—"} × {booking.seats_booked ?? seats.length}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span className="text-foreground print:text-black">Total paid</span>
              <span className="text-primary print:text-black">
                ₹{booking.total_amount.toFixed(2)}
              </span>
            </div>
            {booking.payment_id && (
              <p className="pt-2 text-[11px] text-muted-foreground print:text-gray-600 break-all">
                Payment ID: {booking.payment_id}
              </p>
            )}
          </div>
        </section>

        <footer className="px-6 py-4 bg-secondary/40 border-t border-border text-xs text-muted-foreground print:bg-white print:text-gray-700 print:border-black/30">
          Please arrive 15 minutes before showtime. Carry a valid photo ID. This ticket is
          non-transferable.
        </footer>
      </article>
    </div>
  );
};

export default Ticket;
