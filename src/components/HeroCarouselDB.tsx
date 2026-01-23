import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFeaturedMovies, type Movie } from "@/hooks/useMovies";
import { Button } from "@/components/ui/button";
import { BookingModal } from "./booking/BookingModal";
import { AuthModal } from "./auth/AuthModal";
import { Loader2 } from "lucide-react";

import heroBanner1 from "@/assets/hero-banner-1.jpg";
import heroBanner2 from "@/assets/hero-banner-2.jpg";

const bannerMap: Record<string, string> = {
  "/hero-banner-1.jpg": heroBanner1,
  "/hero-banner-2.jpg": heroBanner2,
};

const HeroCarouselDB = () => {
  const { data: movies, isLoading } = useFeaturedMovies();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!movies || movies.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [movies]);

  const goToPrevious = () => {
    if (!movies) return;
    setCurrentIndex((prev) =>
      prev === 0 ? movies.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    if (!movies) return;
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const handleBookNow = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowBookingModal(true);
  };

  const handleRequireAuth = () => {
    setShowBookingModal(false);
    setShowAuthModal(true);
  };

  if (isLoading) {
    return (
      <section className="relative w-full h-[50vh] md:h-[70vh] flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </section>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <section className="relative w-full h-[50vh] md:h-[70vh] flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No featured movies available</p>
      </section>
    );
  }

  const currentMovie = movies[currentIndex];
  const bannerUrl = currentMovie.banner_url ? (bannerMap[currentMovie.banner_url] || currentMovie.banner_url) : heroBanner1;

  return (
    <>
      <section className="relative w-full h-[50vh] md:h-[70vh] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            <img
              src={bannerUrl}
              alt={currentMovie.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="absolute inset-0 flex items-end pb-16 md:pb-24">
          <div className="container mx-auto px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-2xl"
              >
                <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                  Now Showing
                </span>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3">
                  {currentMovie.title}
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-4 line-clamp-2">
                  {currentMovie.description || "Experience the thrill of cinema"}
                </p>
                <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="text-primary font-bold">{currentMovie.rating || 0}</span>/10
                  </span>
                  <span>•</span>
                  <span>{currentMovie.duration_minutes || 120} mins</span>
                  <span>•</span>
                  <span>{currentMovie.language || "English"}</span>
                </div>
                <div className="flex gap-4">
                  <Button size="lg" className="px-8" onClick={() => handleBookNow(currentMovie)}>
                    Book Now
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Arrows */}
        {movies.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 text-foreground transition-all backdrop-blur-sm hidden md:flex items-center justify-center"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/50 hover:bg-background/80 text-foreground transition-all backdrop-blur-sm hidden md:flex items-center justify-center"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {movies.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {movies.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-8 bg-primary"
                    : "bg-foreground/30 hover:bg-foreground/50"
                }`}
              />
            ))}
          </div>
        )}
      </section>

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
    </>
  );
};

export default HeroCarouselDB;
