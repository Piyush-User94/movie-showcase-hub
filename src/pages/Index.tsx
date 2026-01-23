import Header from "@/components/Header";
import HeroCarouselDB from "@/components/HeroCarouselDB";
import GenreFilter from "@/components/GenreFilter";
import MovieGridDB from "@/components/MovieGridDB";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 md:pt-20">
        <HeroCarouselDB />
        <GenreFilter />
        <MovieGridDB />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
