import { useState, useMemo } from "react";
import { useMovies, type Movie } from "@/hooks/useMovies";
import { useAllMoviesAvailability } from "@/hooks/useMovieAvailability";
import MovieCardDB from "./MovieCardDB";
import { BookingModal } from "./booking/BookingModal";
import { AuthModal } from "./auth/AuthModal";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MovieGridDB = () => {
  const { data: movies, isLoading, error } = useMovies();
  const { data: availabilityMap } = useAllMoviesAvailability();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowBookingModal(true);
  };

  const handleRequireAuth = () => {
    setShowBookingModal(false);
    setShowAuthModal(true);
  };

  const filteredMovies = useMemo(() => {
    if (!movies) return [];
    if (!availableOnly) return movies;
    return movies.filter((m) => {
      const a = availabilityMap?.[m.id];
      return a && a.showCount > 0 && a.seatsLeft > 0;
    });
  }, [movies, availableOnly, availabilityMap]);

  const availableCount = useMemo(() => {
    if (!movies || !availabilityMap) return 0;
    return movies.filter((m) => {
      const a = availabilityMap[m.id];
      return a && a.showCount > 0 && a.seatsLeft > 0;
    }).length;
  }, [movies, availabilityMap]);

  if (error) {
    return (
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-destructive">Failed to load movies. Please try again later.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Now Showing
            </h2>
            <p className="text-muted-foreground mt-1">
              Book your tickets now
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Label
              htmlFor="available-only"
              className="text-sm font-medium text-foreground cursor-pointer select-none"
            >
              Available now
              {availableOnly && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({availableCount})
                </span>
              )}
            </Label>
            <Switch
              id="available-only"
              checked={availableOnly}
              onCheckedChange={setAvailableOnly}
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : filteredMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {filteredMovies.map((movie, index) => (
              <MovieCardDB
                key={movie.id}
                movie={movie}
                index={index}
                onClick={() => handleMovieClick(movie)}
              />
            ))}
          </div>
        ) : availableOnly ? (
          <div className="text-center py-16 px-4 rounded-lg border border-dashed border-border bg-secondary/20">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">No movies with open seats right now</p>
            <p className="text-sm text-muted-foreground mt-1">
              Turn off the “Available now” filter to browse the full catalogue.
            </p>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">
            No movies available at the moment.
          </p>
        )}
      </div>

      {selectedMovie && (
        <BookingModal
          movie={selectedMovie}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedMovie(null);
          }}
          onRequireAuth={handleRequireAuth}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </section>
  );
};

export default MovieGridDB;
