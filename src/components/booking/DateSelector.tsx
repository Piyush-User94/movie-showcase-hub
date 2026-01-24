import { useRef, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateSelectorProps {
  dates: Date[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

const DateSelector = ({ dates, selectedDate, onSelectDate }: DateSelectorProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Generate next 14 days if no dates provided
  const displayDates = dates.length > 0 
    ? dates 
    : Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  return (
    <div className="relative">
      {/* Left scroll button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
        onClick={() => scroll("left")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Scrollable date container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-10 py-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {displayDates.map((date) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[70px] h-[72px] rounded-xl border-2 transition-all",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/10"
              )}
            >
              <span className={cn(
                "text-xs font-medium uppercase",
                isSelected ? "text-primary-foreground" : "text-muted-foreground"
              )}>
                {format(date, "EEE")}
              </span>
              <span className={cn(
                "text-xl font-bold",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {format(date, "d")}
              </span>
              <span className={cn(
                "text-xs",
                isSelected ? "text-primary-foreground" : "text-muted-foreground"
              )}>
                {format(date, "MMM")}
              </span>
              {isToday && !isSelected && (
                <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right scroll button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md hover:bg-background"
        onClick={() => scroll("right")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default DateSelector;
