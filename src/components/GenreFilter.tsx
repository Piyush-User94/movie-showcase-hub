import { useState } from "react";
import { motion } from "framer-motion";

const genres = [
  "All",
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Animation",
];

const GenreFilter = () => {
  const [activeGenre, setActiveGenre] = useState("All");

  return (
    <section className="py-6 border-b border-border bg-card/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
          {genres.map((genre) => (
            <motion.button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeGenre === genre
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              {genre}
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GenreFilter;
