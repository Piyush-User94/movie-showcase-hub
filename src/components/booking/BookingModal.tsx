import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShowtimes, type Movie, type Showtime } from "@/hooks/useMovies";
import {
  useCreateBooking,
  useProcessPayment,
  useUnavailableSeats,
  useShowtimeAvailability,
  useLockSeats,
  useReleaseSeats,
} from "@/hooks/useBookings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isSameDay, parseISO } from "date-fns";
import { Calendar, Clock, MapPin, Minus, Plus, CreditCard, Loader2, Check, Armchair, Filter, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SeatSelector from "./SeatSelector";
import DateSelector from "./DateSelector";
import { supabase } from "@/integrations/supabase/client";

interface BookingModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
}

type BookingStep = "showtime" | "seats" | "seatSelection" | "payment" | "confirmation";

const TOTAL_THEATER_SEATS = 96; // 8 rows x 12 seats

export const BookingModal = ({ movie, isOpen, onClose, onRequireAuth }: BookingModalProps) => {
  const { user } = useAuth();
  const { data: showtimes, isLoading } = useShowtimes(movie.id);
  const createBooking = useCreateBooking();
  const processPayment = useProcessPayment();
  const lockSeats = useLockSeats();
  const releaseSeats = useReleaseSeats();

  const [step, setStep] = useState<BookingStep>("showtime");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [theaterFilter, setTheaterFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const releasedRef = useRef(false);

  // Live unavailable seats for the current showtime (booked + locked)
  const { data: unavailableSeats = [] } = useUnavailableSeats(
    step === "seatSelection" || step === "payment"
      ? selectedShowtime?.id ?? null
      : null
  );

  const totalAmount = selectedShowtime ? (selectedShowtime.price || 0) * seatCount : 0;

  // Get unique dates from showtimes
  const availableDates = useMemo(() => {
    if (!showtimes) return [];
    const uniqueDates = [...new Set(showtimes.map((s) => s.show_date))];
    return uniqueDates.sort().map((dateStr) => parseISO(dateStr));
  }, [showtimes]);

  // Auto-select first available date when showtimes load
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Filter showtimes by date + theater + price tier
  const filteredShowtimes = useMemo(() => {
    if (!showtimes || !selectedDate) return [];
    return showtimes.filter((s) => {
      if (!isSameDay(parseISO(s.show_date), selectedDate)) return false;
      if (theaterFilter !== "all" && s.theater_name !== theaterFilter) return false;
      const price = s.price ?? 0;
      if (priceFilter === "low" && price >= 200) return false;
      if (priceFilter === "mid" && (price < 200 || price > 400)) return false;
      if (priceFilter === "high" && price <= 400) return false;
      return true;
    });
  }, [showtimes, selectedDate, theaterFilter, priceFilter]);

  // Group filtered showtimes by theater
  const showtimesForDate = useMemo(() => {
    return filteredShowtimes.reduce((acc, showtime) => {
      const theater = showtime.theater_name;
      if (!acc[theater]) acc[theater] = [];
      acc[theater].push(showtime);
      return acc;
    }, {} as Record<string, Showtime[]>);
  }, [filteredShowtimes]);

  const theaterNames = Object.keys(showtimesForDate);

  // All theaters available for the selected date (for the filter dropdown)
  const allTheatersForDate = useMemo(() => {
    if (!showtimes || !selectedDate) return [];
    return Array.from(
      new Set(
        showtimes
          .filter((s) => isSameDay(parseISO(s.show_date), selectedDate))
          .map((s) => s.theater_name)
      )
    );
  }, [showtimes, selectedDate]);

  // Live availability map for ALL showtimes shown
  const availabilityShowtimes = useMemo(
    () =>
      (showtimes ?? [])
        .filter((s) => selectedDate && isSameDay(parseISO(s.show_date), selectedDate))
        .map((s) => ({ id: s.id, available_seats: s.available_seats })),
    [showtimes, selectedDate]
  );
  const { data: availabilityMap = {} } = useShowtimeAvailability(availabilityShowtimes);

  const releaseCurrentLock = async () => {
    if (selectedShowtime && !releasedRef.current) {
      releasedRef.current = true;
      try {
        await releaseSeats.mutateAsync(selectedShowtime.id);
      } catch {
        // ignore
      }
    }
  };

  const resetBooking = () => {
    setStep("showtime");
    setSelectedDate(availableDates[0] || null);
    setSelectedShowtime(null);
    setSeatCount(1);
    setSelectedSeats([]);
    setBookingId(null);
    setLockExpiresAt(null);
    setSecondsLeft(0);
    releasedRef.current = false;
  };

  const handleClose = async () => {
    await releaseCurrentLock();
    resetBooking();
    onClose();
  };

  // Countdown for lock expiry
  useEffect(() => {
    if (!lockExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((lockExpiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        toast.error("Seat reservation expired", {
          description: "Please pick your seats again.",
        });
        releasedRef.current = true; // already gone server-side
        setLockExpiresAt(null);
        setSelectedSeats([]);
        setStep("seatSelection");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockExpiresAt]);

  // Release lock if the modal closes via the X button (unmount)
  useEffect(() => {
    return () => {
      if (selectedShowtime && !releasedRef.current) {
        releasedRef.current = true;
        supabase.rpc("release_seats", { showtime_uuid: selectedShowtime.id });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectShowtime = (showtime: Showtime) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setSelectedShowtime(showtime);
    setStep("seats");
  };

  const handleProceedToSeatSelection = () => {
    setSelectedSeats([]);
    setStep("seatSelection");
  };

  const handleProceedToPayment = async () => {
    if (!selectedShowtime) return;

    if (selectedSeats.length !== seatCount) {
      toast.error("Please select all seats", {
        description: `You need to select ${seatCount} seat(s)`,
      });
      return;
    }

    // 1. Lock seats first
    try {
      await lockSeats.mutateAsync({
        showtimeId: selectedShowtime.id,
        seats: selectedSeats,
      });
      releasedRef.current = false;
      setLockExpiresAt(Date.now() + 5 * 60 * 1000);
    } catch (error) {
      toast.error("Could not lock seats", {
        description: error instanceof Error ? error.message : "Please try again",
      });
      return;
    }

    // 2. Create the pending booking
    try {
      const booking = await createBooking.mutateAsync({
        movieId: movie.id,
        showtimeId: selectedShowtime.id,
        seatsBooked: seatCount,
        totalAmount,
        seatNumbers: selectedSeats,
      });
      setBookingId(booking.id);
      setStep("payment");
    } catch (error) {
      await releaseCurrentLock();
      setLockExpiresAt(null);
      toast.error("Failed to create booking", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleBackFromPayment = async () => {
    await releaseCurrentLock();
    setLockExpiresAt(null);
    releasedRef.current = false;
    setStep("seatSelection");
  };

  const handlePayment = async () => {
    if (!bookingId) return;

    try {
      await processPayment.mutateAsync(bookingId);
      // Booking is paid; lock will be cleared on close. Mark released so we
      // don't re-release after seats are committed.
      releasedRef.current = true;
      setLockExpiresAt(null);
      setStep("confirmation");
    } catch (error) {
      toast.error("Payment failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">
            {step === "confirmation" ? "Booking Confirmed!" : `Book: ${movie.title}`}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Date & Showtime */}
          {step === "showtime" && (
            <motion.div
              key="showtime"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : availableDates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No showtimes available for this movie.
                </p>
              ) : (
                <>
                  {/* Date Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium text-foreground">Select Date</Label>
                    </div>
                    <DateSelector
                      dates={availableDates}
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                    />
                  </div>

                  {/* Filters: theater + price */}
                  {selectedDate && allTheatersForDate.length > 0 && (
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium text-foreground">Filters</Label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Select value={theaterFilter} onValueChange={setTheaterFilter}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="All theaters" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All theaters</SelectItem>
                            {allTheatersForDate.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={priceFilter} onValueChange={setPriceFilter}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Any price" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any price</SelectItem>
                            <SelectItem value="low">Under ₹200</SelectItem>
                            <SelectItem value="mid">₹200 – ₹400</SelectItem>
                            <SelectItem value="high">Over ₹400</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Theaters & Showtimes for Selected Date */}
                  {selectedDate && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-border pb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          Theaters on {format(selectedDate, "EEEE, MMMM d")}
                        </span>
                      </div>

                      {theaterNames.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          No showtimes available for this date.
                        </p>
                      ) : (
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                          {theaterNames.map((theaterName) => (
                            <div 
                              key={theaterName} 
                              className="rounded-lg border border-border bg-secondary/30 overflow-hidden"
                            >
                              {/* Theater Header */}
                              <div className="bg-secondary px-4 py-2.5 border-b border-border">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <h3 className="font-semibold text-foreground text-sm">{theaterName}</h3>
                                </div>
                              </div>

                              {/* Showtime Grid */}
                              <div className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  {showtimesForDate[theaterName]
                                    .sort((a, b) => a.show_time.localeCompare(b.show_time))
                                    .map((showtime) => (
                                      <button
                                        key={showtime.id}
                                        onClick={() => handleSelectShowtime(showtime)}
                                        disabled={(showtime.available_seats || 0) === 0}
                                        className="flex flex-col items-center px-4 py-2 rounded-lg bg-background border border-border hover:border-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-background group"
                                      >
                                        <div className="flex items-center gap-1 text-foreground group-hover:text-primary transition-colors">
                                          <Clock className="h-3 w-3" />
                                          <span className="font-semibold text-sm">
                                            {showtime.show_time.slice(0, 5)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs font-bold text-primary">₹{showtime.price}</span>
                                          <span
                                            className={`text-xs font-medium ${
                                              (showtime.available_seats || 0) === 0
                                                ? "text-destructive"
                                                : (showtime.available_seats || 0) < 20
                                                ? "text-yellow-500"
                                                : "text-green-500"
                                            }`}
                                          >
                                            • {(showtime.available_seats || 0) === 0
                                              ? "Sold out"
                                              : `${showtime.available_seats} seats left`}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
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
                  onClick={handleProceedToSeatSelection} 
                  className="flex-1"
                >
                  <Armchair className="h-4 w-4 mr-2" />
                  Select Seats
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Seat Selection */}
          {step === "seatSelection" && selectedShowtime && (
            <motion.div
              key="seatSelection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-primary" />
                  Select Your Seats
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(selectedShowtime.show_date), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{selectedShowtime.show_time.slice(0, 5)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{selectedShowtime.theater_name}</span>
                  </div>
                </div>
              </div>

              <SeatSelector
                totalSeats={TOTAL_THEATER_SEATS}
                availableSeats={selectedShowtime.available_seats || TOTAL_THEATER_SEATS}
                maxSelectable={seatCount}
                selectedSeats={selectedSeats}
                bookedSeats={unavailableSeats}
                onSelectionChange={setSelectedSeats}
              />

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
                <Button variant="outline" onClick={() => setStep("seats")} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleProceedToPayment} 
                  className="flex-1"
                  disabled={selectedSeats.length !== seatCount || createBooking.isPending}
                >
                  {createBooking.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Proceed to Pay
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Payment */}
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
                  <p className="text-primary font-medium">Seats: {selectedSeats.sort().join(", ")}</p>
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
                <Button variant="outline" onClick={() => setStep("seatSelection")} className="flex-1">
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="text-foreground">{selectedSeats.sort().join(", ")}</span>
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
