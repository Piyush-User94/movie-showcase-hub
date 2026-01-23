import moviePoster1 from "@/assets/movie-poster-1.jpg";
import moviePoster2 from "@/assets/movie-poster-2.jpg";
import moviePoster3 from "@/assets/movie-poster-3.jpg";
import moviePoster4 from "@/assets/movie-poster-4.jpg";
import moviePoster5 from "@/assets/movie-poster-5.jpg";
import moviePoster6 from "@/assets/movie-poster-6.jpg";
import heroBanner1 from "@/assets/hero-banner-1.jpg";
import heroBanner2 from "@/assets/hero-banner-2.jpg";

export interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  votes: string;
  genres: string[];
  language: string;
  certificate: string;
}

export interface FeaturedMovie {
  id: number;
  title: string;
  banner: string;
  tagline: string;
  releaseDate: string;
}

export const movies: Movie[] = [
  {
    id: 1,
    title: "Inferno Rising",
    poster: moviePoster1,
    rating: 8.4,
    votes: "124.5K",
    genres: ["Action", "Thriller"],
    language: "English",
    certificate: "UA",
  },
  {
    id: 2,
    title: "Sunset Hearts",
    poster: moviePoster2,
    rating: 7.8,
    votes: "89.2K",
    genres: ["Romance", "Drama"],
    language: "English",
    certificate: "U",
  },
  {
    id: 3,
    title: "The Haunting Hour",
    poster: moviePoster3,
    rating: 7.2,
    votes: "56.8K",
    genres: ["Horror", "Mystery"],
    language: "English",
    certificate: "A",
  },
  {
    id: 4,
    title: "Beyond the Stars",
    poster: moviePoster4,
    rating: 9.1,
    votes: "245.3K",
    genres: ["Sci-Fi", "Adventure"],
    language: "English",
    certificate: "UA",
  },
  {
    id: 5,
    title: "Family Quest",
    poster: moviePoster5,
    rating: 8.0,
    votes: "178.9K",
    genres: ["Animation", "Family"],
    language: "English",
    certificate: "U",
  },
  {
    id: 6,
    title: "Shadows of the City",
    poster: moviePoster6,
    rating: 8.7,
    votes: "92.1K",
    genres: ["Crime", "Drama"],
    language: "English",
    certificate: "A",
  },
];

export const featuredMovies: FeaturedMovie[] = [
  {
    id: 1,
    title: "Epic Blockbusters Await",
    banner: heroBanner1,
    tagline: "Experience the thrill of cinema like never before",
    releaseDate: "Now Showing",
  },
  {
    id: 2,
    title: "Dragon's Reign",
    banner: heroBanner2,
    tagline: "The battle for the kingdom begins",
    releaseDate: "Coming Soon",
  },
];
