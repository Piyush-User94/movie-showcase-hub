import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import GenreFilter from "@/components/GenreFilter";
import MovieGrid from "@/components/MovieGrid";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-20">
        <HeroCarousel />
        <GenreFilter />
        <MovieGrid />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
