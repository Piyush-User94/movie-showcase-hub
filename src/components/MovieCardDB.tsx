import { Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Movie } from "@/hooks/useMovies";

// Import local images for fallback
import moviePoster1 from "@/assets/movie-poster-1.jpg";
import moviePoster2 from "@/assets/movie-poster-2.jpg";
import moviePoster3 from "@/assets/movie-poster-3.jpg";
import moviePoster4 from "@/assets/movie-poster-4.jpg";
import moviePoster5 from "@/assets/movie-poster-5.jpg";
import moviePoster6 from "@/assets/movie-poster-6.jpg";

const posterMap: Record<string, string> = {
  "/movie-poster-1.jpg": moviePoster1,
  "/movie-poster-2.jpg": moviePoster2,
  "/movie-poster-3.jpg": moviePoster3,
  "/movie-poster-4.jpg": moviePoster4,
  "/movie-poster-5.jpg": moviePoster5,
  "/movie-poster-6.jpg": moviePoster6,
};

interface MovieCardDBProps {
  movie: Movie;
  index: number;
  onClick: () => void;
}

const MovieCardDB = ({ movie, index, onClick }: MovieCardDBProps) => {
  const posterUrl = movie.poster_url ? (posterMap[movie.poster_url] || movie.poster_url) : moviePoster1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative overflow-hidden rounded-lg card-hover">
        {/* Poster */}
        <div className="aspect-[2/3] overflow-hidden">
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-[var(--gradient-card)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating Badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-background/90 backdrop-blur-sm">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {movie.rating || 0}
          </span>
        </div>

        {/* Certificate Badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-secondary/90 backdrop-blur-sm">
          <span className="text-xs font-medium text-foreground">
            {movie.certificate || "U"}
          </span>
        </div>

        {/* Hover Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex flex-wrap gap-1">
            {movie.genres?.map((genre) => (
              <span
                key={genre}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {movie.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {movie.genres?.join("/") || "N/A"} • {movie.language || "English"}
        </p>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="font-medium text-foreground">{movie.rating || 0}/10</span>
          <span>({movie.votes_count || "0"} votes)</span>
        </div>
      </div>
    </motion.div>
  );
};

export default MovieCardDB;
