import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useShowtimes, type Movie, type Showtime } from "@/hooks/useMovies";
import { useCreateBooking, useProcessPayment } from "@/hooks/useBookings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Minus, Plus, CreditCard, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BookingModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
}

type BookingStep = "showtime" | "seats" | "payment" | "confirmation";

export const BookingModal = ({ movie, isOpen, onClose, onRequireAuth }: BookingModalProps) => {
  const { user } = useAuth();
  const { data: showtimes, isLoading } = useShowtimes(movie.id);
  const createBooking = useCreateBooking();
  const processPayment = useProcessPayment();
  
  const [step, setStep] = useState<BookingStep>("showtime");
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const totalAmount = selectedShowtime ? (selectedShowtime.price || 0) * seatCount : 0;

  const resetBooking = () => {
    setStep("showtime");
    setSelectedShowtime(null);
    setSeatCount(1);
    setBookingId(null);
  };

  const handleClose = () => {
    resetBooking();
    onClose();
  };

  const handleSelectShowtime = (showtime: Showtime) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setSelectedShowtime(showtime);
    setStep("seats");
  };

  const handleProceedToPayment = async () => {
    if (!selectedShowtime) return;
    
    try {
      const booking = await createBooking.mutateAsync({
        movieId: movie.id,
        showtimeId: selectedShowtime.id,
        seatsBooked: seatCount,
        totalAmount,
      });
      setBookingId(booking.id);
      setStep("payment");
    } catch (error) {
      toast.error("Failed to create booking", { 
        description: error instanceof Error ? error.message : "Please try again" 
      });
    }
  };

  const handlePayment = async () => {
    if (!bookingId) return;
    
    try {
      await processPayment.mutateAsync(bookingId);
      setStep("confirmation");
    } catch (error) {
      toast.error("Payment failed", { 
        description: error instanceof Error ? error.message : "Please try again" 
      });
    }
  };

  // Group showtimes by date
  const groupedShowtimes = showtimes?.reduce((acc, showtime) => {
    const date = showtime.show_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(showtime);
    return acc;
  }, {} as Record<string, Showtime[]>) || {};

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">
            {step === "confirmation" ? "Booking Confirmed!" : `Book: ${movie.title}`}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Showtime */}
          {step === "showtime" && (
            <motion.div
              key="showtime"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : Object.keys(groupedShowtimes).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No showtimes available for this movie.
                </p>
              ) : (
                Object.entries(groupedShowtimes).map(([date, shows]) => (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(date), "EEEE, MMMM d, yyyy")}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {shows.map((showtime) => (
                        <button
                          key={showtime.id}
                          onClick={() => handleSelectShowtime(showtime)}
                          disabled={(showtime.available_seats || 0) === 0}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-foreground">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium">
                                {showtime.show_time.slice(0, 5)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                              <MapPin className="h-3 w-3" />
                              <span>{showtime.theater_name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">₹{showtime.price}</p>
                            <p className="text-xs text-muted-foreground">
                              {showtime.available_seats} seats left
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* Step 2: Select Seats */}
          {step === "seats" && selectedShowtime && (
            <motion.div
              key="seats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(selectedShowtime.show_date), "EEEE, MMMM d")}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{selectedShowtime.show_time.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedShowtime.theater_name}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-foreground">Number of Seats</Label>
                <div className="flex items-center justify-center gap-6">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                    disabled={seatCount <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-3xl font-bold text-foreground w-12 text-center">
                    {seatCount}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSeatCount(Math.min(10, seatCount + 1))}
                    disabled={seatCount >= (selectedShowtime.available_seats || 10)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Max {Math.min(10, selectedShowtime.available_seats || 10)} tickets per booking
                </p>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Ticket Price</span>
                  <span>₹{selectedShowtime.price} × {seatCount}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-foreground">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("showtime")} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleProceedToPayment} 
                  className="flex-1"
                  disabled={createBooking.isPending}
                >
                  {createBooking.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Proceed to Pay
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Payment */}
          {step === "payment" && selectedShowtime && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-secondary p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-foreground">{movie.title}</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{format(new Date(selectedShowtime.show_date), "EEEE, MMMM d")} at {selectedShowtime.show_time.slice(0, 5)}</p>
                  <p>{selectedShowtime.theater_name}</p>
                  <p>{seatCount} {seatCount === 1 ? "Ticket" : "Tickets"}</p>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">Mock Payment</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is a simulated payment. Click "Pay Now" to complete your booking.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("seats")} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handlePayment} 
                  className="flex-1"
                  disabled={processPayment.isPending}
                >
                  {processPayment.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>Pay ₹{totalAmount.toFixed(2)}</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {step === "confirmation" && selectedShowtime && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"
              >
                <Check className="h-8 w-8 text-green-500" />
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">Payment Successful!</h3>
                <p className="text-muted-foreground">
                  Your tickets for <span className="text-foreground font-medium">{movie.title}</span> have been booked.
                </p>
              </div>

              <div className="bg-secondary p-4 rounded-lg text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-foreground">{format(new Date(selectedShowtime.show_date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="text-foreground">{selectedShowtime.show_time.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Theater</span>
                  <span className="text-foreground">{selectedShowtime.theater_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tickets</span>
                  <span className="text-foreground">{seatCount}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-medium text-foreground">Amount Paid</span>
                  <span className="font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
