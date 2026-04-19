import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Search, Play, Plus, Info, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';

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

// Data & Utils
import { ALL_MOVIES, FEATURED_MOVIES } from './data/movies';
import { GENRES, topSearches } from './data/constants';
import { handleImageError } from './utils/helpers';

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

  // Reset visible count when category changes
  useEffect(() => {
    setVisibleCount(12);
  }, [viewingCategory, activeTab]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 12);
  };

  const getCategoryMovies = () => {
    switch (viewingCategory) {
      case 'Movies': return ALL_MOVIES.slice().reverse();
      case 'TV Shows': return [...ALL_MOVIES].sort((a, b) => a.id - b.id).slice(3, 10).concat([...ALL_MOVIES].slice(0, 3));
      case 'My Secure Records': return ALL_MOVIES.filter(m => myList.includes(m.id));
      default: return ALL_MOVIES;
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const toggleMyList = (movieId: number) => {
    setMyList(prev => 
      prev.includes(movieId) 
        ? prev.filter(id => id !== movieId) 
        : [...prev, movieId]
    );
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simulated loading effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Focus search input when overlay opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Auto-cycle logic
  useEffect(() => {
    if (isHoveringHero || isPlaying || isSearchOpen) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % FEATURED_MOVIES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isHoveringHero, isPlaying, isSearchOpen]);

  const activeHero = FEATURED_MOVIES[currentHeroIndex];

  const filteredMovies = React.useMemo(() => {
    return ALL_MOVIES
      .filter(m => {
        const matchesSearch = debouncedSearchQuery === '' || 
                              m.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
                              m.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
        const matchesGenre = selectedGenre === 'All' || m.genre === selectedGenre;
        const matchesMood = activeMood === 'All Moods' || m.genre.toLowerCase().includes(activeMood.toLowerCase().split(' ')[0]);
        
        if (activeTab === 'my-list') return myList.includes(m.id) && matchesSearch;
        if (activeTab === 'new') return m.year === '2024' && matchesSearch;
        
        return matchesSearch && matchesGenre && matchesMood;
      })
      .sort((a, b) => {
        if (sortBy === 'IMDB Rating') {
          const imdbA = (a as any).imdb || (9.9 - (a.id * 0.1));
          const imdbB = (b as any).imdb || (9.9 - (b.id * 0.1));
          return imdbB - imdbA;
        }
        if (sortBy === 'Release Date') return b.id - a.id; 
        return 0; 
      });
  }, [debouncedSearchQuery, selectedGenre, activeMood, activeTab, myList, sortBy]);

  const handleRandomize = () => {
    const randomMovie = ALL_MOVIES[Math.floor(Math.random() * ALL_MOVIES.length)];
    setSearchQuery(randomMovie.title);
    setIsSearchOpen(true);
  };

  const startPlayback = (movie: any) => {
    setHistory(prev => [...prev.filter(id => id !== movie.id), movie.id]);
    setSelectedMovie(movie);
    setIsPlaying(true);
  };

  const handleNavClick = (id: string) => {
    if (id === 'search') {
      setIsSearchOpen(true);
    } else {
      setActiveTab(id);
      if (id === 'movies') {
        setViewingCategory('Movies');
      } else if (id === 'tv') {
        setViewingCategory('TV Shows');
      } else if (id === 'library') {
        setViewingCategory('Library');
      } else {
        setViewingCategory(null);
      }
    }
  };

  const searchResults = debouncedSearchQuery 
    ? ALL_MOVIES.filter(m => 
        m.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
        m.genre.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      )
    : [];

  const recommendations = React.useMemo(() => {
    return ALL_MOVIES.slice().sort(() => Math.random() - 0.5);
  }, []);

  return (
    <div className="flex min-h-screen bg-obsidian font-sans overflow-x-hidden" ref={containerRef}>
      <AnimatePresence>
        <TopNav 
          activeTab={activeTab} 
          onTabChange={handleNavClick} 
          scrolled={scrolled}
          onSearchClick={() => setIsSearchOpen(true)}
          viewingCategory={viewingCategory}
          setViewingCategory={setViewingCategory}
        />

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-700 pb-24 lg:pb-0 ${isSearchOpen ? 'blur-2xl scale-[0.98] opacity-50' : ''}`}>
          <div className="relative z-40">
          {!viewingCategory ? (
            <>
              {/* Hero Section */}
              <section className="relative h-[85vh] md:h-[95vh] overflow-hidden">
                <div className="absolute inset-0 z-10 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentHeroIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0"
                  >
                    <motion.div 
                      className="absolute inset-0 z-0"
                      style={{ y: heroParallax }}
                    >
                      <img 
                        src={activeHero.image} 
                        alt={activeHero.title}
                        className="w-full h-full object-cover md:scale-105"
                        referrerPolicy="no-referrer" onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent z-10" />
                      <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-transparent to-transparent z-10" />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>

                <div className="absolute inset-0 z-20 flex items-center px-4 sm:px-6 md:px-12 pt-10 pointer-events-none">
                  <div className="max-w-3xl pointer-events-auto mt-20">
                    <motion.div
                      key={`hero-content-${currentHeroIndex}`}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-[2px] bg-nebula-red glow-red" />
                        <span className="text-white text-[10px] font-black uppercase tracking-[0.5em] flex items-center gap-2">
                           Nebula Original
                        </span>
                      </div>
                      
                      <h1 className="text-5xl sm:text-6xl md:text-[140px] font-display font-black tracking-tighter leading-[0.85] mb-8 md:mb-10 uppercase text-white drop-shadow-2xl">
                        {activeHero.title.split(':').map((part, i) => (
                           <span key={`hero-part-${i}`} className={i > 0 ? "block text-[0.4em] md:text-[0.4em] text-white/40 tracking-normal mt-2" : "block"}>{part}</span>
                        ))}
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-8 md:mb-10 text-[11px] md:text-[13px] font-bold text-white/50 tracking-[0.2em] uppercase">
                        <span className="text-nebula-cyan font-black border-2 border-nebula-cyan/30 px-3 py-1 rounded leading-none">{activeHero.rating}</span>
                        <span>{activeHero.year}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-nebula-red animate-pulse hidden sm:block" />
                        <span>{activeHero.duration}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 hidden sm:block" />
                        <span className="flex items-center gap-2"><Sparkles size={16} className="text-nebula-cyan" /> 4K ULTRA HD</span>
                      </div>

                      <p className="text-lg md:text-2xl text-white/60 font-light leading-relaxed mb-10 md:mb-12 max-w-2xl drop-shadow-md line-clamp-3">
                        {activeHero.description}
                      </p>

                      <div className="flex flex-wrap gap-4 md:gap-6 text-obsidian pb-10 md:pb-0">
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: '#FFFFFF' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => startPlayback(activeHero)}
                          className="bg-white text-obsidian px-6 sm:px-12 py-4 sm:py-5 rounded-lg font-black text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-4 shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all flex-1 sm:flex-none justify-center"
                        >
                          <Play size={24} fill="currentColor" /> Play Mission
                        </motion.button>
                        <motion.button 
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' }}
                          className={`border backdrop-blur-3xl px-6 sm:px-12 py-4 sm:py-5 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-4 transition-all flex-1 sm:flex-none ${myList.includes(activeHero.id) ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/5 border-white/10 text-white'}`}
                          onClick={() => toggleMyList(activeHero.id)}
                        >
                          {myList.includes(activeHero.id) ? (
                            <><X size={24} /> Remove</>
                          ) : (
                            <><Plus size={24} /> Registry</>
                          )}
                        </motion.button>
                        <motion.button 
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' }}
                          className="bg-white/5 border border-white/10 backdrop-blur-3xl px-4 sm:px-6 py-4 sm:py-5 rounded-lg text-white transition-all shrink-0"
                          onClick={() => setSelectedMovie(activeHero)}
                        >
                          <Info size={24} />
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div className="absolute bottom-10 left-4 right-4 md:left-auto md:bottom-20 md:right-12 flex flex-row md:flex-col justify-center gap-3 md:gap-4 z-30">
                  {FEATURED_MOVIES.map((movie, i) => (
                    <button 
                      key={`hero-thumb-${i}`} 
                      onClick={() => setCurrentHeroIndex(i)}
                      className="group relative flex items-center justify-center md:justify-end"
                    >
                        <motion.div 
                          initial={false}
                          className={`aspect-[2/3] rounded-lg overflow-hidden border border-white/20 group-hover:border-white transition-all duration-300 ${
                            currentHeroIndex === i ? 'w-[60px] md:w-[100px] opacity-100' : 'w-[40px] md:w-[70px] opacity-40'
                          }`}
                        >
                         <img src={movie.poster} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                         {currentHeroIndex === i && (
                           <motion.div 
                             layoutId="active-hero-border" 
                             className="absolute inset-0 border-2 border-nebula-cyan rounded-lg z-10" 
                           />
                         )}
                      </motion.div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="px-4 sm:px-6 md:px-12 mt-6 md:-mt-10 pb-20 relative z-30 flex flex-col gap-8">
                <DiscoveryBar 
                  sortBy={sortBy} 
                  setSortBy={setSortBy} 
                  activeMood={activeMood} 
                  setActiveMood={setActiveMood} 
                  onRandomize={handleRandomize} 
                />

                <section className="flex items-center gap-4 overflow-x-auto custom-scrollbar pb-2">
                  <Sparkles size={18} className="text-nebula-cyan shrink-0" />
                  {GENRES.map(genre => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-all border ${
                        selectedGenre === genre 
                          ? 'bg-white text-obsidian border-white scale-105' 
                          : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </section>

                <TopTenShelf onSelect={setSelectedMovie} />

                <section className="mb-20">
                  <div className="flex items-center justify-between mb-8 group cursor-pointer" onClick={() => setViewingCategory('Trending Operations')}>
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl md:text-3xl font-display font-medium tracking-tight text-white/90 group-hover:text-nebula-cyan transition-colors">Trending Operations</h2>
                      <ChevronRight size={24} className="text-dim group-hover:text-nebula-cyan group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 -mx-4 px-4 snap-x snap-mandatory scroll-smooth custom-scrollbar">
                      {isLoading ? (
                        [...Array(6)].map((_, i) => <MovieSkeleton key={`skeleton-${i}`} />)
                      ) : (
                        filteredMovies.map((movie, i) => (
                          <MovieCard key={`main-shelf-${movie.id}-${i}`} movie={movie} snap onSelect={setSelectedMovie} isInList={myList.includes(movie.id)} onToggleList={() => toggleMyList(movie.id)} />
                        ))
                      )}
                  </div>
                </section>

                <section className="mb-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl md:text-3xl font-display font-medium tracking-tight text-white/90">Based on Mission History</h2>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 sm:gap-6 overflow-x-auto py-10 -my-10 px-4 -mx-4 custom-scrollbar pb-2 snap-x snap-mandatory">
                    {isLoading ? (
                      [...Array(6)].map((_, i) => <MovieSkeleton key={`skeleton-rec-${i}`} />)
                    ) : (
                      recommendations.map((movie, i) => (
                        <MovieCard key={`rec-shelf-${movie.id}-${i}`} movie={movie} snap onSelect={setSelectedMovie} isInList={myList.includes(movie.id)} onToggleList={() => toggleMyList(movie.id)} />
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="min-h-screen pt-32 px-4 sm:px-6 md:px-12 pb-32"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <button 
                    onClick={() => { setActiveTab('home'); setViewingCategory(null); }}
                    className="flex items-center gap-2 text-nebula-cyan hover:text-white mb-6 transition-colors group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black tracking-widest uppercase">Back to Command Center</span>
                  </button>
                  <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter uppercase">{viewingCategory}</h2>
                </div>
                
                {viewingCategory === 'Trending Operations' && <div className="px-4 py-2 rounded-full bg-nebula-cyan/10 border border-nebula-cyan/30 text-nebula-cyan text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Live Signal Feed</div>}
              </div>
              
              {viewingCategory === 'Library' ? (
                <div className="space-y-16">
                  <section>
                     <h3 className="text-2xl font-display font-medium tracking-tight text-white mb-8">My Secure Records</h3>
                     {myList.length > 0 ? (
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
                         {ALL_MOVIES.filter(m => myList.includes(m.id)).map((movie, i) => (
                             <MovieCard key={`lib-my-${movie.id}-${i}`} movie={movie} onSelect={setSelectedMovie} isInList={true} onToggleList={() => toggleMyList(movie.id)} />
                         ))}
                       </div>
                     ) : (
                       <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                         <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                            <Plus className="text-dim" size={32} />
                         </div>
                         <h3 className="text-2xl font-bold mb-4">Your registry is empty</h3>
                         <p className="text-dim max-w-md mx-auto font-light">Add missions to your list for quick access during deep-space operation.</p>
                       </div>
                     )}
                  </section>
                  
                  <section>
                     <h3 className="text-2xl font-display font-medium tracking-tight text-white mb-8">Operational History</h3>
                     {history.length > 0 ? (
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
                         {history.slice().reverse().map(id => ALL_MOVIES.find(m => m.id === id)).filter(Boolean).map((movie: any, i) => (
                           <div key={`lib-hist-${movie.id}-${i}`} className="relative group">
                             <MovieCard movie={movie} onSelect={setSelectedMovie} isInList={myList.includes(movie.id)} onToggleList={() => toggleMyList(movie.id)} />
                             <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => startPlayback(movie)} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center pointer-events-auto border border-white/50 hover:bg-white hover:text-black transition-colors pl-1">
                                 <Play size={20} fill="currentColor" />
                               </button>
                             </div>
                             <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-40 rounded-b-2xl overflow-hidden pointer-events-none">
                               <div className="h-full bg-nebula-cyan w-3/4" />
                             </div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                         <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                            <Search className="text-dim" size={32} />
                         </div>
                         <h3 className="text-2xl font-bold mb-4">No operations history</h3>
                         <p className="text-dim max-w-md mx-auto font-light">Missions you play will be recorded here.</p>
                       </div>
                     )}
                  </section>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 md:gap-x-6 gap-y-12">
                  {getCategoryMovies().slice(0, visibleCount).map((movie, i) => (
                    <MovieCard key={`category-${viewingCategory}-${movie.id}-${i}`} movie={movie} onSelect={setSelectedMovie} isInList={myList.includes(movie.id)} onToggleList={() => toggleMyList(movie.id)} />
                  ))}
                </div>
                {getCategoryMovies().length > visibleCount && (
                  <div className="mt-16 flex justify-center">
                    <button 
                      onClick={loadMore}
                      className="px-8 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] uppercase font-bold tracking-[0.2em] transition-all group"
                    >
                      <span className="group-hover:text-nebula-cyan transition-colors">Decrypt More Records</span>
                    </button>
                  </div>
                )}
                </>
              )}

              {viewingCategory === 'Trending Operations' && visibleCount >= getCategoryMovies().length && (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-2 border-nebula-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-dim text-sm font-light">Decrypting more data streams from the fringe...</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-obsidian/80 backdrop-blur-[40px] flex flex-col items-center pt-[5vh] sm:pt-[10vh] overflow-y-auto custom-scrollbar"
          >
            <div className="w-full max-w-[900px] px-4 sm:px-6 pb-32">
              <div className="relative mb-8 sm:mb-12">
                <Search size={24} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-nebula-cyan sm:w-[28px] sm:h-[28px]" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for movies, actors, or genres..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 sm:py-6 pl-12 sm:pl-20 pr-16 sm:pr-24 text-lg sm:text-2xl font-light placeholder:text-dim focus:outline-none focus:border-nebula-cyan/50 transition-all caret-nebula-cyan shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                />
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 px-2 sm:px-3 py-1 bg-white/10 rounded border border-white/10 text-[8px] sm:text-[10px] uppercase font-bold text-dim hover:text-white transition-colors flex items-center justify-center shrink-0"
                >
                  ESC
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
                <div className="flex-1">
                  <h3 className="text-[12px] font-bold text-dim uppercase tracking-[0.2em] mb-8">
                    {searchQuery ? `Instant Results (${searchResults.length})` : 'Type to start Mission Search'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {searchQuery && searchResults.length > 0 ? (
                      searchResults.map((movie, i) => (
                        <motion.div 
                          key={`search-res-${movie.id}-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => {
                            setSelectedMovie(movie);
                            setIsSearchOpen(false);
                          }}
                          className="flex gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-all"
                        >
                          <div className="w-20 aspect-[2/3] rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                            <img src={movie.poster} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" onError={handleImageError} />
                          </div>
                          <div className="py-2">
                             <h4 className="font-bold text-white group-hover:text-nebula-cyan transition-colors">{movie.title}</h4>
                             <p className="text-[10px] text-dim uppercase mt-1 tracking-widest">{movie.genre}</p>
                             <div className="flex items-center gap-2 mt-2">
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] border border-white/10 text-white/50">{movie.quality}</span>
                                <span className="text-[10px] text-nebula-cyan font-bold leading-none">{movie.rating}</span>
                             </div>
                          </div>
                        </motion.div>
                      ))
                    ) : searchQuery ? (
                      <div className="col-span-2 py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-dim opacity-30">
                           <Search size={32} />
                        </div>
                        <h4 className="text-xl font-bold mb-2">No data streams found</h4>
                        <p className="text-dim font-light">Try searching for generic terms like "Sci-Fi" or "Nova".</p>
                      </div>
                    ) : (
                      <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-dim italic font-light">The Nebula library is vast... start your query.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full lg:w-[200px] border-t lg:border-t-0 lg:border-l border-white/5 pt-8 lg:pt-0 lg:pl-12">
                  <h3 className="text-[12px] font-bold text-dim uppercase tracking-[0.2em] mb-8">Top Searches</h3>
                  <div className="flex flex-row overflow-x-auto lg:flex-col gap-6 hide-scrollbar">
                    {topSearches.map((term, i) => (
                      <div 
                        key={`search-term-${i}-${term}`} 
                        onClick={() => setSearchQuery(term)}
                        className="flex gap-4 items-center group cursor-pointer whitespace-nowrap lg:whitespace-normal"
                      >
                         <span className="text-2xl font-display font-light text-white/10 group-hover:text-nebula-cyan/30 transition-colors">0{i+1}</span>
                         <span className="text-[13px] font-bold text-white/70 group-hover:text-white transition-colors leading-tight">{term}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Player */}
      <AnimatePresence>
        {isPlaying && (
          <MediaPlayer 
            key="media-player"
            movie={selectedMovie || activeHero} 
            onClose={() => setIsPlaying(false)} 
          />
        )}
      </AnimatePresence>

      {/* Movie Details */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieDetails 
            key="movie-details-modal"
            movie={selectedMovie} 
            onClose={() => setSelectedMovie(null)} 
            onPlay={() => startPlayback(selectedMovie)}
            onSelectMovie={(m) => setSelectedMovie(m)}
            isInList={myList.includes(selectedMovie.id)}
            onToggleList={() => toggleMyList(selectedMovie.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const X = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
