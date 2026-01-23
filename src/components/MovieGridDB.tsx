import { useState } from "react";
import { useMovies, type Movie } from "@/hooks/useMovies";
import MovieCardDB from "./MovieCardDB";
import { BookingModal } from "./booking/BookingModal";
import { AuthModal } from "./auth/AuthModal";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const MovieGridDB = () => {
  const { data: movies, isLoading, error } = useMovies();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowBookingModal(true);
  };

  const handleRequireAuth = () => {
    setShowBookingModal(false);
    setShowAuthModal(true);
  };

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
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Now Showing
            </h2>
            <p className="text-muted-foreground mt-1">
              Book your tickets now
            </p>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : movies && movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {movies.map((movie, index) => (
              <MovieCardDB 
                key={movie.id} 
                movie={movie} 
                index={index}
                onClick={() => handleMovieClick(movie)}
              />
            ))}
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
