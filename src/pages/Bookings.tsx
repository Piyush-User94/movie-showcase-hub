import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useBookings } from "@/hooks/useBookings";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Ticket, Calendar, Clock, MapPin, Loader2, Armchair } from "lucide-react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  paid: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const Bookings = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: bookings, isLoading, error } = useBookings();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-28 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              My Bookings
            </h1>
            <p className="text-muted-foreground">
              View and manage your movie ticket bookings
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-destructive">Failed to load bookings. Please try again.</p>
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <Ticket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Bookings Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                You haven't booked any tickets yet. Start exploring movies!
              </p>
              <a
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Browse Movies
              </a>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {bookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-border rounded-xl p-4 md:p-6"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Movie Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {booking.movies?.title || "Unknown Movie"}
                          </h3>
                          <Badge className={`mt-1 ${statusColors[booking.status]}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            ₹{booking.total_amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.seats_booked} {booking.seats_booked === 1 ? "Ticket" : "Tickets"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>
                            {booking.showtimes?.show_date
                              ? format(new Date(booking.showtimes.show_date), "MMM d, yyyy")
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>
                            {booking.showtimes?.show_time?.slice(0, 5) || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="truncate">
                            {booking.showtimes?.theater_name || "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Seats */}
                      {booking.seat_numbers && booking.seat_numbers.length > 0 && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
                          <Armchair className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div className="flex flex-wrap gap-1.5">
                            {[...booking.seat_numbers].sort().map((seat) => (
                              <Badge
                                key={seat}
                                variant="outline"
                                className="border-primary/50 text-primary font-mono"
                              >
                                {seat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Price breakdown */}
                      {booking.showtimes?.price && booking.seats_booked ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          ₹{booking.showtimes.price} × {booking.seats_booked} {booking.seats_booked === 1 ? "ticket" : "tickets"}
                        </p>
                      ) : null}

                      {booking.payment_id && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Payment ID: {booking.payment_id}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Bookings;
