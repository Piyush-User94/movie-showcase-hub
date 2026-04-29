import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SeatSelectorProps {
  totalSeats: number;
  availableSeats: number;
  maxSelectable: number;
  selectedSeats: string[];
  bookedSeats?: string[];
  onSelectionChange: (seats: string[]) => void;
}

type SeatStatus = "available" | "booked" | "selected";

interface Seat {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
}

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const SEATS_PER_ROW = 12;

const SeatSelector = ({
  totalSeats,
  availableSeats,
  maxSelectable,
  selectedSeats,
  bookedSeats = [],
  onSelectionChange,
}: SeatSelectorProps) => {
  // Generate seats; mark persisted booked seats as unavailable
  const seats = useMemo(() => {
    const allSeats: Seat[] = [];

    ROWS.forEach((row) => {
      for (let i = 1; i <= SEATS_PER_ROW; i++) {
        const id = `${row}${i}`;
        allSeats.push({
          id,
          row,
          number: i,
          status: bookedSeats.includes(id) ? "booked" : "available",
        });
      }
    });

    return allSeats;
  }, [bookedSeats]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === "booked") return;

    const isSelected = selectedSeats.includes(seat.id);
    
    if (isSelected) {
      // Deselect
      onSelectionChange(selectedSeats.filter((id) => id !== seat.id));
    } else {
      // Select if under limit
      if (selectedSeats.length < maxSelectable) {
        onSelectionChange([...selectedSeats, seat.id]);
      }
    }
  };

  const getSeatStatus = (seat: Seat): SeatStatus => {
    if (seat.status === "booked") return "booked";
    if (selectedSeats.includes(seat.id)) return "selected";
    return "available";
  };

  // Group seats by row
  const seatsByRow = ROWS.map((row) => ({
    row,
    seats: seats.filter((s) => s.row === row),
  }));

  return (
    <div className="space-y-6">
      {/* Screen indicator */}
      <div className="relative">
        <div className="w-3/4 mx-auto h-2 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
        <p className="text-center text-xs text-muted-foreground mt-2">SCREEN</p>
      </div>

      {/* Seat grid */}
      <div className="flex flex-col items-center gap-1.5 py-4">
        {seatsByRow.map(({ row, seats: rowSeats }) => (
          <div key={row} className="flex items-center gap-1.5">
            {/* Row label */}
            <span className="w-6 text-xs font-medium text-muted-foreground text-right">
              {row}
            </span>
            
            {/* Seats */}
            <div className="flex gap-1">
              {rowSeats.slice(0, 6).map((seat) => {
                const status = getSeatStatus(seat);
                return (
                  <motion.button
                    key={seat.id}
                    whileHover={status !== "booked" ? { scale: 1.1 } : {}}
                    whileTap={status !== "booked" ? { scale: 0.95 } : {}}
                    onClick={() => handleSeatClick(seat)}
                    disabled={status === "booked"}
                    className={cn(
                      "w-7 h-7 md:w-8 md:h-8 rounded text-xs font-semibold flex items-center justify-center transition-all",
                      status === "booked" && "bg-muted text-muted-foreground cursor-not-allowed",
                      status === "available" && "border-2 border-green-500 text-green-500 hover:bg-green-500/10 cursor-pointer",
                      status === "selected" && "bg-primary text-primary-foreground border-2 border-primary"
                    )}
                    title={status === "booked" ? "Seat unavailable" : `Seat ${seat.id}`}
                  >
                    {seat.number}
                  </motion.button>
                );
              })}
            </div>

            {/* Aisle gap */}
            <div className="w-4" />

            {/* More seats */}
            <div className="flex gap-1">
              {rowSeats.slice(6).map((seat) => {
                const status = getSeatStatus(seat);
                return (
                  <motion.button
                    key={seat.id}
                    whileHover={status !== "booked" ? { scale: 1.1 } : {}}
                    whileTap={status !== "booked" ? { scale: 0.95 } : {}}
                    onClick={() => handleSeatClick(seat)}
                    disabled={status === "booked"}
                    className={cn(
                      "w-7 h-7 md:w-8 md:h-8 rounded text-xs font-semibold flex items-center justify-center transition-all",
                      status === "booked" && "bg-muted text-muted-foreground cursor-not-allowed",
                      status === "available" && "border-2 border-green-500 text-green-500 hover:bg-green-500/10 cursor-pointer",
                      status === "selected" && "bg-primary text-primary-foreground border-2 border-primary"
                    )}
                    title={status === "booked" ? "Seat unavailable" : `Seat ${seat.id}`}
                  >
                    {seat.number}
                  </motion.button>
                );
              })}
            </div>

            {/* Row label */}
            <span className="w-6 text-xs font-medium text-muted-foreground">
              {row}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-green-500 rounded" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary rounded" />
          <span className="text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-muted rounded" />
          <span className="text-muted-foreground">Booked</span>
        </div>
      </div>

      {/* Selection count */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{selectedSeats.length}</span> / {maxSelectable} seats
        </p>
        {selectedSeats.length > 0 && (
          <p className="text-sm text-primary font-medium mt-1">
            Seats: {selectedSeats.sort().join(", ")}
          </p>
        )}
      </div>
    </div>
  );
};

export default SeatSelector;
