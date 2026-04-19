import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Sparkles } from 'lucide-react';

// Hooks
import { useLocalStorage } from './hooks/useLocalStorage';

// Components
import { TopNav } from './components/TopNav';
import { DiscoveryBar } from './components/DiscoveryBar';
import { TopTenShelf } from './components/TopTenShelf';
import { MovieCard } from './components/MovieCard';
import { MovieSkeleton } from './components/MovieSkeleton';
import { MediaPlayer } from './components/MediaPlayer';
import { MovieDetails } from './components/MovieDetails';
import { MovieRow } from './components/MovieRow';
import { Hero } from './components/Hero';
import { SearchOverlay } from './components/SearchOverlay';
import { CategoryView } from './components/CategoryView';

// Data & Utils
import { ALL_MOVIES, FEATURED_MOVIES } from './data/movies';
import { GENRES } from './data/constants';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [viewingCategory, setViewingCategory] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Recently Added');
  const [activeMood, setActiveMood] = useState('All Moods');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);

  const [scrolled, setScrolled] = useState(false);
  const [myList, setMyList] = useLocalStorage<number[]>('nebula-my-list', []);
  const [history, setHistory] = useLocalStorage<number[]>('nebula-history', []);
  const [visibleCount, setVisibleCount] = useState(12);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 500], [0, 150]);

  useEffect(() => {
    setVisibleCount(12);
  }, [viewingCategory, activeTab]);

  const loadMore = () => setVisibleCount(prev => prev + 12);

  const getCategoryMovies = () => {
    switch (viewingCategory) {
      case 'Movies': return ALL_MOVIES.slice().reverse();
      case 'TV Shows': return [...ALL_MOVIES].sort((a, b) => a.id - b.id).slice(3, 10).concat([...ALL_MOVIES].slice(0, 3));
      case 'My Secure Records': return ALL_MOVIES.filter(m => myList.includes(m.id));
      default: return ALL_MOVIES;
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const toggleMyList = (movieId: number) => {
    setMyList(prev => prev.includes(movieId) ? prev.filter(id => id !== movieId) : [...prev, movieId]);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen) { e.preventDefault(); setIsSearchOpen(true); }
      else if (e.key === 'Escape' && isSearchOpen) setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    if (isHoveringHero || isPlaying || isSearchOpen) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % FEATURED_MOVIES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isHoveringHero, isPlaying, isSearchOpen]);

  const filteredMovies = React.useMemo(() => {
    return ALL_MOVIES
      .filter(m => {
        const matchesSearch = debouncedSearchQuery === '' || 
                              m.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
                              m.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
        const matchesGenre = selectedGenre === 'All' || m.genre === selectedGenre;
        const matchesMood = activeMood === 'All Moods' || m.genre.toLowerCase().includes(activeMood.toLowerCase().split(' ')[0]);
        if (activeTab === 'my-list') return myList.includes(m.id) && matchesSearch;
        return matchesSearch && matchesGenre && matchesMood;
      })
      .sort((a, b) => {
        if (sortBy === 'IMDB Rating') {
          const imdbA = (a as any).imdb || (9.9 - (a.id * 0.1));
          const imdbB = (b as any).imdb || (9.9 - (b.id * 0.1));
          return imdbB - imdbA;
        }
        return sortBy === 'Release Date' ? b.id - a.id : 0;
      });
  }, [debouncedSearchQuery, selectedGenre, activeMood, activeTab, myList, sortBy]);

  const startPlayback = (movie: any) => {
    setHistory(prev => [...prev.filter(id => id !== movie.id), movie.id]);
    setSelectedMovie(movie);
    setIsPlaying(true);
  };

  const handleNavClick = (id: string) => {
    if (id === 'search') setIsSearchOpen(true);
    else {
      setActiveTab(id);
      if (id === 'movies') setViewingCategory('Movies');
      else if (id === 'tv') setViewingCategory('TV Shows');
      else if (id === 'library') setViewingCategory('Library');
      else setViewingCategory(null);
    }
  };

  const searchResults = debouncedSearchQuery 
    ? ALL_MOVIES.filter(m => m.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || m.genre.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
    : [];

  const recommendations = React.useMemo(() => ALL_MOVIES.slice().sort(() => Math.random() - 0.5), []);

  return (
    <div className="flex min-h-screen bg-obsidian font-sans overflow-x-hidden" ref={containerRef}>
      <AnimatePresence>
        <TopNav 
          activeTab={activeTab} onTabChange={handleNavClick} scrolled={scrolled}
          onSearchClick={() => setIsSearchOpen(true)} viewingCategory={viewingCategory} setViewingCategory={setViewingCategory}
        />

        <main className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-700 pb-24 lg:pb-0 ${isSearchOpen ? 'blur-2xl scale-[0.98] opacity-50' : ''}`}>
          <div className="relative z-40">
          {!viewingCategory ? (
            <>
              <Hero 
                currentHeroIndex={currentHeroIndex} setCurrentHeroIndex={setCurrentHeroIndex} heroParallax={heroParallax}
                myList={myList} toggleMyList={toggleMyList} startPlayback={startPlayback} setSelectedMovie={setSelectedMovie}
              />

              <div className="px-4 sm:px-6 md:px-12 mt-6 md:-mt-10 pb-20 relative z-30 flex flex-col gap-8">
                <DiscoveryBar 
                  sortBy={sortBy} setSortBy={setSortBy} activeMood={activeMood} 
                  setActiveMood={setActiveMood} onRandomize={() => {}} 
                />

                <section className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
                  <Sparkles size={18} className="text-nebula-cyan shrink-0" />
                  {GENRES.map(genre => (
                    <button
                      key={genre} onClick={() => setSelectedGenre(genre)}
                      className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-all border ${
                        selectedGenre === genre ? 'bg-white text-obsidian border-white scale-105' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </section>

                <TopTenShelf onSelect={setSelectedMovie} />

                <MovieRow title="Trending Operations" onTitleClick={() => setViewingCategory('Trending Operations')}>
                  {isLoading ? [...Array(6)].map((_, i) => <MovieSkeleton key={`sk-trend-${i}`} />) : filteredMovies.map((m, i) => <MovieCard key={`m-trend-${m.id}-${i}`} movie={m} snap onSelect={setSelectedMovie} isInList={myList.includes(m.id)} onToggleList={() => toggleMyList(m.id)} />)}
                </MovieRow>

                <MovieRow title="Based on Mission History">
                  {isLoading ? [...Array(6)].map((_, i) => <MovieSkeleton key={`sk-rec-${i}`} />) : recommendations.map((m, i) => <MovieCard key={`m-rec-${m.id}-${i}`} movie={m} snap onSelect={setSelectedMovie} isInList={myList.includes(m.id)} onToggleList={() => toggleMyList(m.id)} />)}
                </MovieRow>
              </div>
            </>
          ) : (
            <CategoryView 
              viewingCategory={viewingCategory} setViewingCategory={setViewingCategory} setActiveTab={setActiveTab}
              onSelectMovie={setSelectedMovie} myList={myList} toggleMyList={toggleMyList} history={history}
              startPlayback={startPlayback} getCategoryMovies={getCategoryMovies} visibleCount={visibleCount} loadMore={loadMore}
            />
          )}
          </div>
        </main>
      </AnimatePresence>

      <SearchOverlay 
        isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        searchResults={searchResults} onSelectMovie={setSelectedMovie} searchInputRef={searchInputRef}
      />

      <AnimatePresence>
        {isPlaying && <MediaPlayer key="media-player" movie={selectedMovie || FEATURED_MOVIES[currentHeroIndex]} onClose={() => setIsPlaying(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedMovie && (
          <MovieDetails 
            key="movie-details-modal" movie={selectedMovie} onClose={() => setSelectedMovie(null)} 
            onPlay={() => startPlayback(selectedMovie)} onSelectMovie={(m) => setSelectedMovie(m)}
            isInList={myList.includes(selectedMovie.id)} onToggleList={() => toggleMyList(selectedMovie.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
