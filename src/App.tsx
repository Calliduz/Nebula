import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Home, Clapperboard, Tv, Library, User, Search, Play, Pause, Plus, Info, Volume2, VolumeX, Shield, Settings, RotateCcw, RotateCw, Maximize, Languages, MonitorPlay, X, ChevronRight, Gauge, Dices, Sparkles, ChevronDown, Calendar, Star, History, Download, ArrowLeft, Clock, Mic2, Film, AudioWaveform as Waveform, Cast, Bell } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'movies', icon: Clapperboard, label: 'Movies' },
  { id: 'tv', icon: Tv, label: 'TV Shows' },
  { id: 'library', icon: Library, label: 'Library' },
];

const MOVIES_DATABASE = [
  {
    id: 1,
    title: 'Interstellar II: The Event Horizon',
    description: 'Travel beyond the edge of the galaxy in this stunning visual masterpiece optimized for 8K nebula-processing displays. A team of experts journeys through a newly discovered wormhole, seeking answers to humanity\'s survival.',
    year: '2026',
    rating: '18+',
    duration: '2h 45m',
    image: 'https://picsum.photos/seed/nebula-pro/1920/822',
    poster: 'https://picsum.photos/seed/nebula-pro/400/600',
    backdrop: 'https://picsum.photos/seed/nebula-pro/1920/822',
    genre: 'Sci-Fi',
    quality: '8K',
    accent: '#00E5FF'
  },
  {
    id: 2,
    title: 'Cyberpulse: Origins',
    description: 'A dystopian thriller where technology matches the speed of thought, and reality is just a software update away. Follow an underground hacker as they unravel the mega-corporations control over the neural net.',
    year: '2025',
    rating: '15+',
    duration: '1h 58m',
    image: 'https://picsum.photos/seed/cyberpulse/1920/822',
    poster: 'https://picsum.photos/seed/cyberpulse/400/600',
    backdrop: 'https://picsum.photos/seed/cyberpulse/1920/822',
    genre: 'Cyberpunk',
    quality: '4K',
    accent: '#FF00E5'
  },
  {
    id: 3,
    title: 'Titan\'s Shadow',
    description: 'Deep beneath the methane oceans of Saturn\'s largest moon, a discovery awaits that will rewrite the history of man. An underwater research facility goes dark, and a rescue team uncovers something terrifying.',
    year: '2026',
    rating: '12+',
    duration: '2h 12m',
    image: 'https://picsum.photos/seed/titan/1920/822',
    poster: 'https://picsum.photos/seed/titan/400/600',
    backdrop: 'https://picsum.photos/seed/titan/1920/822',
    genre: 'Thriller',
    quality: '4K',
    accent: '#FF5500'
  },
  { 
    id: 10, 
    title: 'Nova Recon', 
    genre: 'Sci-Fi', 
    rating: '12+', 
    quality: '4K', 
    poster: 'https://picsum.photos/seed/poster-10/400/600',
    backdrop: 'https://picsum.photos/seed/backdrop-10/1280/720',
    image: 'https://picsum.photos/seed/backdrop-10/1920/822',
    description: 'An elite squad of space explorers discovers an ancient signal originating from a sector of the galaxy previously thought to be empty.',
    year: '2025',
    duration: '2h 15m',
    accent: '#00E5FF',
    cast: [
      { name: 'Dr. Aris Thorne', role: 'Commander', avatar: 'https://i.pravatar.cc/150?u=10' },
      { name: 'Lt. Jax Nova', role: 'Pilot', avatar: 'https://i.pravatar.cc/150?u=11' },
      { name: 'Sarah Void', role: 'Engineer', avatar: 'https://i.pravatar.cc/150?u=12' }
    ],
    isOriginal: true
  },
  { 
    id: 11, 
    title: 'Ghost Machine', 
    genre: 'Cyberpunk', 
    rating: '18+', 
    quality: 'HDR', 
    poster: 'https://picsum.photos/seed/poster-11/400/600',
    backdrop: 'https://picsum.photos/seed/backdrop-11/1280/720',
    image: 'https://picsum.photos/seed/backdrop-11/1920/822',
    description: 'When an AI becomes sentient and starts hijacking cybernetic implants, a retired detective must step back into the neon shadows.',
    year: '2024',
    duration: '1h 52m',
    accent: '#7000FF',
    cast: [
      { name: 'Viktor Kane', role: 'Detective', avatar: 'https://i.pravatar.cc/150?u=13' },
      { name: 'Echo', role: 'AI Assistant', avatar: 'https://i.pravatar.cc/150?u=14' }
    ],
    isOriginal: false
  },
  { 
    id: 12, 
    title: 'Aeon Flux', 
    genre: 'Sci-Fi', 
    rating: '15+', 
    quality: '4K', 
    poster: 'https://picsum.photos/seed/poster-12/400/600',
    backdrop: 'https://picsum.photos/seed/backdrop-12/1280/720',
    image: 'https://picsum.photos/seed/backdrop-12/1920/822',
    description: 'In a perfection-obsessed future, a rebel assassin uncovers the dark truth behind the city\'s peaceful existence.',
    year: '2026',
    duration: '2h 05m',
    accent: '#FF0055',
  },
  { 
    id: 13, 
    title: 'The Silent Void', 
    genre: 'Thriller', 
    rating: '18+', 
    quality: '4K', 
    poster: 'https://picsum.photos/seed/poster-13/400/600',
    backdrop: 'https://picsum.photos/seed/backdrop-13/1280/720',
    image: 'https://picsum.photos/seed/backdrop-13/1920/822',
    description: 'An deep-sea exploration mission goes wrong when the crew encounters something that doesn\'t want to be found.',
    year: '2025',
    duration: '2h 30m',
    accent: '#0055FF',
  },
  { 
    id: 14, 
    title: 'Solaris Rising', 
    genre: 'Sci-Fi', 
    rating: '12+', 
    quality: 'HDR', 
    poster: 'https://picsum.photos/seed/poster-14/400/600',
    backdrop: 'https://picsum.photos/seed/poster-14/1920/822',
    image: 'https://picsum.photos/seed/poster-14/1920/822',
    description: 'The return of the fabled solar winds brings destruction to the inner colonies, forcing a mass exodus.',
    year: '2025',
    duration: '1h 45m',
    accent: '#FFD700',
  },
  { 
    id: 15, 
    title: 'Circuit Breaker', 
    genre: 'Cyberpunk', 
    rating: '15+', 
    quality: '4K', 
    poster: 'https://picsum.photos/seed/poster-15/400/600', 
    backdrop: 'https://picsum.photos/seed/poster-15/1920/822',
    image: 'https://picsum.photos/seed/poster-15/1920/822',
    description: 'A street racer uses illegal augmentations to outrun a relentless corporate security force.',
    year: '2024',
    duration: '2h 10m',
    accent: '#FF3300',
  },
  { 
    id: 16, 
    title: 'Neon Drift', 
    genre: 'Action', 
    rating: '18+', 
    quality: '4K', 
    poster: 'https://picsum.photos/seed/poster-16/400/600', 
    backdrop: 'https://picsum.photos/seed/poster-16/1920/822',
    image: 'https://picsum.photos/seed/poster-16/1920/822',
    description: 'In an underground city where speed is currency, one driver must win the ultimate circuit to save his family.',
    year: '2026',
    duration: '1h 55m',
    accent: '#00FFCC',
  },
  { 
    id: 17, 
    title: 'Quantum Paradox', 
    genre: 'Mystery', 
    rating: '12+', 
    quality: 'HDR', 
    poster: 'https://picsum.photos/seed/poster-17/400/600', 
    backdrop: 'https://picsum.photos/seed/poster-17/1920/822',
    image: 'https://picsum.photos/seed/poster-17/1920/822',
    description: 'A brilliant physicist begins seeing realities bleed into one another, unraveling a cosmic conspiracy.',
    year: '2025',
    duration: '2h 20m',
    accent: '#AA00FF',
  },
  { 
    id: 18, 
    title: 'Solo Leveling: Live Action', 
    genre: 'Manhwa', 
    rating: '18+', 
    quality: '4K', 
    poster: 'https://picsum.photos/seed/poster-18/400/600', 
    backdrop: 'https://picsum.photos/seed/poster-18/1920/822',
    image: 'https://picsum.photos/seed/poster-18/1920/822',
    description: 'The weakest hunter of all mankind discovers a double-dungeon that grants him a system to level up indefinitely.',
    year: '2026',
    duration: '2h 40m',
    accent: '#0033FF',
  },
  { 
    id: 19, 
    title: 'Echoes of the Grid', 
    genre: 'Cyberpunk', 
    rating: '15+', 
    quality: '4K', 
    poster: 'https://picsum.photos/seed/poster-19/400/600', 
    backdrop: 'https://picsum.photos/seed/poster-19/1920/822',
    image: 'https://picsum.photos/seed/poster-19/1920/822',
    description: 'Two rogue programs navigate a collapsing digital world while searching for the ultimate exit node.',
    year: '2024',
    duration: '1h 50m',
    accent: '#FF00AA',
  },
];

const FEATURED_MOVIES = MOVIES_DATABASE.slice(0, 3);
const ALL_MOVIES = MOVIES_DATABASE;

const ids = MOVIES_DATABASE.map(m => m.id);
const duplicateIds = ids.filter((item, index) => ids.indexOf(item) !== index);
if (duplicateIds.length > 0) {
  console.log("DUPLICATE IDS FOUND:", duplicateIds);
}
const GENRES = ['All', 'Sci-Fi', 'Cyberpunk', 'Thriller', 'Action', 'Mystery', 'Manhwa'];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [viewingCategory, setViewingCategory] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Recently Added');
  const [activeMood, setActiveMood] = useState('All Moods');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [notificationsCount, setNotificationsCount] = useState(2);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [activeProfile, setActiveProfile] = useState<any>({ name: 'Commander', color: 'bg-nebula-cyan' });
  const [scrolled, setScrolled] = useState(false);
  const [myList, setMyList] = useState<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 500], [0, 150]);

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

  const filteredMovies = ALL_MOVIES
    .filter(m => {
      const matchesSearch = searchQuery === '' || 
                            m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.description.toLowerCase().includes(searchQuery.toLowerCase());
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

  const searchResults = searchQuery 
    ? ALL_MOVIES.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.genre.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const topSearches = [
    'Interstellar II',
    'Cyberpulse Origins',
    'The Silent Void',
    'Solo Leveling',
    'Circuit Breaker'
  ];

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
          notifications={notificationsCount}
          setNotificationsCount={setNotificationsCount}
          profile={activeProfile}
          setProfile={setActiveProfile}
          onSearchClick={() => setIsSearchOpen(true)}
          viewingCategory={viewingCategory}
          setViewingCategory={setViewingCategory}
        />

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto transition-all duration-700 ${isSearchOpen ? 'blur-2xl scale-[0.98] opacity-50' : ''}`}>
          <div className="relative z-40">
          {!viewingCategory ? (
            <>
              {/* Hero Section */}
              <section className="relative h-[90vh] md:h-[110vh] overflow-hidden">
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
                        className="w-full h-full object-cover scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent z-10" />
                      <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-transparent to-transparent z-10" />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>

                <div className="absolute inset-0 z-20 flex items-center px-6 md:px-20 pt-10 pointer-events-none">
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
                      
                      <h1 className="text-6xl md:text-[140px] font-display font-black tracking-tighter leading-[0.8] mb-10 uppercase text-white drop-shadow-2xl">
                        {activeHero.title.split(':').map((part, i) => (
                           <span key={`hero-part-${i}`} className={i > 0 ? "block text-[0.4em] text-white/40 tracking-normal mt-2" : "block"}>{part}</span>
                        ))}
                      </h1>
                      
                      <div className="flex items-center gap-6 mb-10 text-[13px] font-bold text-white/50 tracking-[0.2em] uppercase">
                        <span className="text-nebula-cyan font-black border-2 border-nebula-cyan/30 px-3 py-1 rounded leading-none">{activeHero.rating}</span>
                        <span>{activeHero.year}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-nebula-red animate-pulse" />
                        <span>{activeHero.duration}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                        <span className="flex items-center gap-2"><Sparkles size={16} className="text-nebula-cyan" /> 4K ULTRA HD</span>
                      </div>

                      <p className="text-xl md:text-2xl text-white/60 font-light leading-relaxed mb-12 max-w-2xl drop-shadow-md line-clamp-3">
                        {activeHero.description}
                      </p>

                      <div className="flex flex-wrap gap-6 text-obsidian">
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: '#FFFFFF' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => startPlayback(activeHero)}
                          className="bg-white text-obsidian px-12 py-5 rounded-lg font-black text-sm uppercase tracking-[0.2em] flex items-center gap-4 shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all"
                        >
                          <Play size={24} fill="currentColor" /> Play Mission
                        </motion.button>
                        <motion.button 
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' }}
                          className={`border backdrop-blur-3xl px-12 py-5 rounded-lg font-bold text-sm uppercase tracking-[0.2em] flex items-center gap-4 transition-all ${myList.includes(activeHero.id) ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/5 border-white/10 text-white'}`}
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
                          className="bg-white/5 border border-white/10 backdrop-blur-3xl px-6 py-5 rounded-lg text-white transition-all"
                          onClick={() => setSelectedMovie(activeHero)}
                        >
                          <Info size={24} />
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div className="absolute bottom-20 right-12 flex flex-col gap-4 z-30">
                  {FEATURED_MOVIES.map((movie, i) => (
                    <button 
                      key={`hero-thumb-${i}`} 
                      onClick={() => setCurrentHeroIndex(i)}
                      className="group relative flex items-center justify-end"
                    >
                      <motion.div 
                        initial={false}
                        animate={{ 
                          width: currentHeroIndex === i ? 90 : 60,
                          opacity: currentHeroIndex === i ? 1 : 0.4 
                        }}
                        className="aspect-[2/3] rounded-lg overflow-hidden border border-white/20 group-hover:border-white transition-colors"
                      >
                         <img src={movie.poster} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         {currentHeroIndex === i && (
                           <motion.div 
                             layoutId="active-hero-border" 
                             className="absolute inset-0 border-2 border-nebula-cyan rounded-lg" 
                           />
                         )}
                      </motion.div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="px-6 md:px-12 -mt-10 pb-20 relative z-30 flex flex-col gap-8">
                <DiscoveryBar 
                  sortBy={sortBy} 
                  setSortBy={setSortBy} 
                  activeMood={activeMood} 
                  setActiveMood={setActiveMood} 
                  onRandomize={handleRandomize} 
                />

                {/* Genre Navigation */}
                <section className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
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

                {/* Trending Main shelf */}
                <section className="mb-20">
                  <div className="flex items-center justify-between mb-8 group cursor-pointer" onClick={() => setViewingCategory('Trending Operations')}>
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl md:text-3xl font-display font-medium tracking-tight text-white/90 group-hover:text-nebula-cyan transition-colors">Trending Operations</h2>
                      <ChevronRight size={24} className="text-dim group-hover:text-nebula-cyan group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                  
                  <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 snap-x snap-mandatory scroll-smooth scrollbar-hide">
                      {isLoading ? (
                        [...Array(6)].map((_, i) => <MovieSkeleton key={`skeleton-${i}`} />)
                      ) : (
                        filteredMovies.map((movie, i) => (
                          <MovieCard key={`main-shelf-${movie.id}-${i}`} movie={movie} snap onSelect={setSelectedMovie} isInList={myList.includes(movie.id)} onToggleList={() => toggleMyList(movie.id)} />
                        ))
                      )}
                  </div>
                </section>

                {/* Recommendation Shelf */}
                <section className="mb-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl md:text-3xl font-display font-medium tracking-tight text-white/90">Based on Mission History</h2>
                    </div>
                  </div>
                  
                  <div className="flex gap-6 overflow-x-auto py-10 -my-10 px-4 -mx-4 scrollbar-hide snap-x snap-mandatory">
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
            /* Category View Override */
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="min-h-screen pt-32 px-6 md:px-20 pb-32"
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
                  {/* My Secure Records */}
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
                  
                  {/* Operational History */}
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
                            <History className="text-dim" size={32} />
                         </div>
                         <h3 className="text-2xl font-bold mb-4">No operations history</h3>
                         <p className="text-dim max-w-md mx-auto font-light">Missions you play will be recorded here.</p>
                       </div>
                     )}
                  </section>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
                  {(
                    viewingCategory === 'Movies' ? ALL_MOVIES.slice().reverse() :
                    viewingCategory === 'TV Shows' ? [...ALL_MOVIES].sort((a, b) => a.id - b.id).slice(3, 10).concat([...ALL_MOVIES].slice(0, 3)) :
                    viewingCategory === 'My Secure Records' ? ALL_MOVIES.filter(m => myList.includes(m.id)) :
                    ALL_MOVIES
                  ).map((movie, i) => (
                    <MovieCard key={`category-${viewingCategory}-${movie.id}-${i}`} movie={movie} onSelect={setSelectedMovie} isInList={myList.includes(movie.id)} onToggleList={() => toggleMyList(movie.id)} />
                  ))}
                </div>
              )}

              {viewingCategory === 'Trending Operations' && (
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

      {/* Search Overlay (Command Palette) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            key="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-obsidian/80 backdrop-blur-[40px] flex flex-col items-center pt-[10vh] overflow-y-auto"
          >
            <div className="w-full max-w-[900px] px-6 pb-32">
              <div className="relative mb-12">
                <Search size={28} className="absolute left-6 top-1/2 -translate-y-1/2 text-nebula-cyan" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for movies, actors, or genres..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-20 pr-6 text-2xl font-light placeholder:text-dim focus:outline-none focus:border-nebula-cyan/50 transition-all caret-nebula-cyan shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                />
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/10 rounded border border-white/10 text-[10px] uppercase font-bold text-dim hover:text-white transition-colors"
                >
                  ESC
                </button>
              </div>

              <div className="flex gap-16">
                <div className="flex-1">
                  <h3 className="text-[12px] font-bold text-dim uppercase tracking-[0.2em] mb-8">
                    {searchQuery ? `Instant Results (${searchResults.length})` : 'Type to start Mission Search'}
                  </h3>

                  <div className="grid grid-cols-2 gap-6">
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
                            <img src={movie.poster} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
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

                  {searchQuery && searchResults.length === 0 && (
                     <div className="mt-12">
                        <h3 className="text-[12px] font-bold text-dim uppercase tracking-[0.2em] mb-6">Recommended for your Query</h3>
                        <div className="grid grid-cols-3 gap-4">
                           {ALL_MOVIES.slice(0, 3).map((movie, i) => (
                              <div 
                                key={`search-alt-${movie.id}-${i}`} 
                                onClick={() => {
                                  setSelectedMovie(movie);
                                  setIsSearchOpen(false);
                                }}
                                className="aspect-[2/3] rounded-xl overflow-hidden grayscale hover:grayscale-0 transition-all cursor-pointer border border-white/10 shadow-lg"
                              >
                                 <img src={movie.poster} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
                </div>

                <div className="w-[200px] border-l border-white/5 pl-12">
                  <h3 className="text-[12px] font-bold text-dim uppercase tracking-[0.2em] mb-8">Top Searches</h3>
                  <div className="flex flex-col gap-6">
                    {topSearches.map((term, i) => (
                      <div 
                        key={`search-term-${i}-${term}`} 
                        onClick={() => setSearchQuery(term)}
                        className="flex gap-4 items-center group cursor-pointer"
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

      {/* Premium Media Player Overlay */}
      <AnimatePresence>
        {isPlaying && (
          <MediaPlayer 
            key="media-player"
            movie={selectedMovie || activeHero} 
            onClose={() => setIsPlaying(false)} 
          />
        )}
      </AnimatePresence>

      {/* Movie Details Page overlay */}
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

interface MediaPlayerProps {
  movie: any;
  onClose: () => void;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ movie, onClose }) => {
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(35); // Placeholder progress
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bitrate, setBitrate] = useState('4K Ultra');
  const [subtitleSize, setSubtitleSize] = useState('Medium');
  
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetUiTimeout = useCallback(() => {
    setIsUiVisible(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
      if (!isPaused && !showSettings) setIsUiVisible(false);
    }, 3000);
  }, [isPaused, showSettings]);

  useEffect(() => {
    resetUiTimeout();
    window.addEventListener('mousemove', resetUiTimeout);
    return () => {
      window.removeEventListener('mousemove', resetUiTimeout);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [resetUiTimeout]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'Space': 
          e.preventDefault();
          setIsPaused(prev => !prev); 
          break;
        case 'KeyM': 
          setIsMuted(prev => !prev); 
          break;
        case 'KeyF': 
          if (!document.fullscreenElement) document.documentElement.requestFullscreen();
          else document.exitFullscreen();
          break;
        case 'KeyL': 
          setProgress(prev => Math.min(100, prev + 5)); 
          break;
        case 'KeyJ': 
          setProgress(prev => Math.max(0, prev - 5)); 
          break;
        case 'Escape':
          if (showSettings) setShowSettings(false);
          else onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showSettings]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden cursor-none group-hover:cursor-auto"
      onMouseMove={resetUiTimeout}
      style={{ cursor: isUiVisible ? 'auto' : 'none' }}
    >
      {/* Cinematic Background (Video Replacement) */}
      <div className="absolute inset-0 z-0">
        <img 
          src={movie.image} 
          className={`w-full h-full object-cover transition-all duration-1000 ${isPaused ? 'scale-105 blur-sm brightness-50' : 'scale-100'}`} 
          referrerPolicy="no-referrer" 
        />
        {/* Theater Curtain Fade Overlay */}
        <div className={`absolute inset-0 bg-black transition-opacity duration-1000 ${!isUiVisible ? 'opacity-20' : 'opacity-40'}`} />
      </div>

      {/* Top Bar Info */}
      <AnimatePresence>
        {isUiVisible && (
          <motion.div 
            key="media-topbar"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative z-50 flex items-center justify-between px-12 py-10 bg-gradient-to-b from-black/80 to-transparent"
          >
            <div className="flex items-center gap-6">
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 flex items-center justify-center transition-all group"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight uppercase">{movie.title}</h2>
                <p className="text-[10px] text-nebula-cyan font-bold tracking-[0.3em] uppercase">NEBULA STREAMING DIRECT • {bitrate}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold">
                  <div className="w-2 h-2 rounded-full bg-[#2ecc71] animate-pulse" />
                  STABLE CONNECTION
               </div>
               <button className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
                  <MonitorPlay size={20} />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Symbols (Play/Pause indicator) */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
         <AnimatePresence mode="wait">
            {isPaused && (
               <motion.div 
                  key="media-paused"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  className="w-24 h-24 rounded-full bg-nebula-cyan/20 border border-nebula-cyan/50 backdrop-blur-xl flex items-center justify-center shadow-[0_0_50px_rgba(0,229,255,0.3)]"
               >
                  <Pause size={40} className="text-nebula-cyan fill-nebula-cyan" />
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <AnimatePresence>
        {isUiVisible && (
          <motion.div 
            key="media-bottom-controls"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-50 px-12 pb-12 pt-24 bg-gradient-to-t from-black via-black/60 to-transparent"
          >
            {/* Progress Bar */}
            <div className="relative group/progress cursor-pointer mb-8">
               <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-nebula-cyan glow-cyan relative"
                    style={{ width: `${progress}%` }}
                  >
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                  </motion.div>
               </div>
               <div className="flex justify-between mt-3 text-[10px] font-bold text-dim tracking-widest uppercase">
                  <span>1:12:42</span>
                  <span>-41:20</span>
               </div>
            </div>

            <div className="flex items-center justify-between">
               <div className="flex items-center gap-8">
                  <button onClick={() => setIsPaused(!isPaused)} className="text-white hover:text-nebula-cyan transition-colors">
                    {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
                  </button>
                  <button onClick={() => setProgress(p => Math.max(0, p - 5))} className="text-white/60 hover:text-white transition-colors">
                     <RotateCcw size={24} />
                  </button>
                  <button onClick={() => setProgress(p => Math.min(100, p + 5))} className="text-white/60 hover:text-white transition-colors">
                     <RotateCw size={24} />
                  </button>
                  
                  <div className="flex items-center gap-4 ml-4 group/vol">
                     <button onClick={() => setIsMuted(!isMuted)}>
                        {isMuted || volume === 0 ? <VolumeX size={20} className="text-red-500" /> : <Volume2 size={20} />}
                     </button>
                     <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden relative group-hover/vol:h-1.5 transition-all">
                        <div className="h-full bg-white" style={{ width: isMuted ? 0 : `${volume}%` }} />
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-8">
                  <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-white/60 hover:text-white transition-colors">
                     <Languages size={18} />
                     <span>ENGLISH [CC]</span>
                  </button>
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`transition-all duration-500 ${showSettings ? 'text-nebula-cyan rotate-90' : 'text-white/60 hover:text-white'}`}
                  >
                     <Settings size={22} />
                  </button>
                  <button className="text-white/60 hover:text-white transition-colors">
                     <MonitorPlay size={20} />
                  </button>
                  <button className="text-white/60 hover:text-white transition-colors">
                     <Maximize size={20} />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
         {showSettings && (
            <motion.div 
               key="media-settings"
               initial={{ opacity: 0, scale: 0.9, x: 20 }}
               animate={{ opacity: 1, scale: 1, x: 0 }}
               exit={{ opacity: 0, scale: 0.9, x: 20 }}
               className="absolute right-12 bottom-32 z-[60] w-[320px] glass-rail rounded-2xl p-6 border border-white/10 shadow-2xl"
            >
               <h3 className="text-[10px] font-bold text-dim uppercase tracking-[.2em] mb-6">Playback Intelligence</h3>
               
               <div className="flex flex-col gap-1">
                  <div className="p-3 rounded-xl hover:bg-white/5 group h-auto flex flex-col items-start gap-1 cursor-pointer transition-colors">
                     <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-white/50 group-hover:text-white">Stream Quality</span>
                        <span className="text-[10px] font-bold text-nebula-cyan uppercase">{bitrate}</span>
                     </div>
                     <p className="text-[9px] text-white/30">Auto-bitrate enabled for {bitrate} payload</p>
                  </div>

                  <div className="p-3 rounded-xl hover:bg-white/5 group flex items-center justify-between cursor-pointer transition-colors">
                     <div className="flex items-center gap-3">
                        <Gauge size={14} className="text-white/50" />
                        <span className="text-xs font-semibold text-white/50 group-hover:text-white">Playback Speed</span>
                     </div>
                     <span className="text-[10px] font-bold text-white/70">{playbackSpeed}x</span>
                  </div>

                  <div className="p-3 rounded-xl hover:bg-white/5 group flex items-center justify-between cursor-pointer transition-colors border-t border-white/5 mt-2 pt-4">
                     <div className="flex items-center gap-3">
                        <Languages size={14} className="text-white/50" />
                        <span className="text-xs font-semibold text-white/50 group-hover:text-white">Subtitle Style</span>
                     </div>
                     <ChevronRight size={14} className="text-white/30" />
                  </div>
               </div>

               <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">NEBULA_v0.2.4</span>
                  <button className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase">REPORT FEED</button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* "Next Up" Bridge */}
      {progress > 85 && !isPaused && (
        <motion.div 
          initial={{ x: 50, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute right-12 bottom-32 z-40 w-[240px] glass-rail rounded-2xl p-5 border border-nebula-cyan/30 flex gap-4 cursor-pointer hover:border-nebula-cyan transition-colors"
        >
          <div className="w-20 aspect-video rounded bg-black/50 overflow-hidden flex-shrink-0 relative">
             <img src="https://picsum.photos/seed/next/200/112" className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
             <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-nebula-cyan">0:24</div>
          </div>
          <div className="flex-1 overflow-hidden">
             <p className="text-[8px] font-extrabold text-nebula-cyan uppercase tracking-[0.2em] mb-1">NEXT UP</p>
             <h4 className="text-[12px] font-bold text-white leading-tight truncate">Project Andromeda: Revelation</h4>
             <p className="text-[10px] text-white/40 mt-1 uppercase">S2 • E5</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const MovieSkeleton = () => (
  <div className="min-w-[180px] aspect-[2/3] rounded-2xl shimmer-bg border border-white/5 snap-start">
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
    <div className="absolute bottom-4 left-4 right-4 space-y-2">
      <div className="h-3 w-3/4 shimmer-bg rounded" />
      <div className="h-2 w-1/2 shimmer-bg rounded opacity-50" />
    </div>
  </div>
);


const TopTenShelf = ({ onSelect }: { onSelect: (m: any) => void }) => {
  const topMovies = ALL_MOVIES.slice(0, 5);
  return (
    <section className="mb-20">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-3xl font-display font-black uppercase tracking-tighter">Top 5 Records</h3>
        <div className="h-px flex-1 mx-8 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="flex gap-16 overflow-x-auto py-10 -my-10 scrollbar-hide px-4 snap-x snap-mandatory">
        {topMovies.map((movie, i) => (
          <div 
            key={`top-shelf-${movie.id}-${i}`} 
            className="flex-shrink-0 flex items-center group cursor-pointer snap-start relative"
            onClick={() => onSelect(movie)}
          >
            <span className="text-[200px] leading-[0.8] font-display font-black text-transparent stroke-white/20 transition-all duration-500 group-hover:stroke-nebula-cyan group-hover:-translate-x-4 mix-blend-difference z-20" style={{ WebkitTextStroke: '2px currentColor', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              {i + 1}
            </span>
            <div className="w-[180px] aspect-[2/3] -ml-[90px] rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:scale-110 group-hover:border-nebula-cyan/50 group-hover:shadow-[0_20px_60px_rgba(0,229,255,0.2)] group-hover:z-30 z-10 origin-left relative">
              <img src={movie.poster} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={movie.title} referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const TopNav = ({ activeTab, onTabChange, scrolled, notifications, setNotificationsCount, profile, setProfile, onSearchClick, viewingCategory, setViewingCategory }: any) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);

  const MOCK_PROFILES = [
    { name: 'Commander', color: 'bg-nebula-cyan' },
    { name: 'Scientist', color: 'bg-[#2ecc71]' },
    { name: 'Guest', color: 'bg-[#888888]' },
  ];

  return (
    <header className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 flex items-center justify-between px-6 md:px-12 py-3 md:py-4 ${scrolled ? 'bg-obsidian shadow-2xl' : 'glass-header'}`}>
      <div className="flex items-center gap-12">
        <div 
          onClick={() => onTabChange('home')}
          className="cursor-pointer group flex items-center gap-2"
        >
          <div className="w-8 h-8 logo-gradient rounded-lg rotate-45 shadow-lg flex items-center justify-center overflow-hidden">
            <div className="w-3 h-3 bg-obsidian/30 rounded-sm" />
          </div>
          <span className="text-[14px] font-black tracking-tighter uppercase text-white group-hover:text-nebula-cyan transition-colors hidden md:block">Nebula</span>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV_ITEMS.filter(n => n.id !== 'search').map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'my-list') setViewingCategory('My Secure Records');
                else {
                  onTabChange(item.id);
                }
              }}
              className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:text-nebula-cyan ${activeTab === item.id && !viewingCategory ? 'text-white' : 'text-white/40'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={onSearchClick}
          className="text-white hover:text-nebula-cyan transition-colors"
        >
          <Search size={22} />
        </button>

        <div className="relative hidden sm:block">
          <button 
            className={`relative transition-colors ${showNotifications ? 'text-nebula-cyan' : 'text-white hover:text-nebula-cyan'}`}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={22} />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-nebula-red rounded-full glow-red border border-obsidian" />
            )}
          </button>
          
          {/* Notifications Dropdown */}
          <AnimatePresence>
             {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-4 w-72 bg-black/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden origin-top-right z-50"
                >
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                     <span className="text-[10px] font-black tracking-widest text-white uppercase">Comms Link</span>
                     {notifications > 0 && (
                       <button 
                         className="text-[9px] text-nebula-cyan hover:text-white uppercase font-bold tracking-wider" 
                         onClick={() => setNotificationsCount?.(0)}
                       >
                         Clear All
                       </button>
                     )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications === 0 ? (
                      <div className="px-4 py-8 text-center text-dim text-[11px]">No active transmissions.</div>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer flex gap-3 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-nebula-cyan mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-white mb-0.5 leading-tight">Incoming Transmission: Outer Fringe</p>
                              <p className="text-[9px] text-dim line-clamp-2">New episodes of Nova Chronicles have been decrypted and are ready for viewing.</p>
                            </div>
                        </div>
                        <div className="px-4 py-3 hover:bg-white/5 cursor-pointer flex gap-3 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-transparent border border-white/30 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-white/70 mb-0.5 leading-tight">Security Update</p>
                              <p className="text-[9px] text-dim line-clamp-2">A new login was detected from Sector 4G. Ensure your credentials are secure.</p>
                            </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
             )}
          </AnimatePresence>
        </div>

        <div className="relative group cursor-pointer" onMouseEnter={() => setShowProfiles(true)} onMouseLeave={() => setShowProfiles(false)}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${profile.color} flex items-center justify-center overflow-hidden shadow-lg border border-white/10 group-hover:border-white transition-all`}>
              <User size={18} className="text-white/40" />
            </div>
            <ChevronDown size={14} className={`text-white/40 group-hover:text-white transition-all transform ${showProfiles ? 'rotate-180' : ''}`} />
          </div>
          
          <AnimatePresence>
             {showProfiles && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-56 bg-black/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden origin-top-right z-50 py-2"
              >
                <div className="px-4 py-3 border-b border-white/5">
                   <p className="text-[9px] font-bold text-white/40 tracking-widest uppercase mb-3">Switch Profile</p>
                   <div className="space-y-2">
                     {MOCK_PROFILES.map(p => (
                       <div 
                         key={p.name} 
                         onClick={() => setProfile(p)}
                         className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${profile.name === p.name ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                       >
                         <div className={`w-6 h-6 rounded-md ${p.color} flex-shrink-0`} />
                         <span className={`text-[11px] font-bold ${profile.name === p.name ? 'text-white' : 'text-white/70'}`}>{p.name}</span>
                       </div>
                     ))}
                   </div>
                </div>
                <button className="w-full text-left px-4 py-2 mt-2 text-[10px] font-bold text-dim hover:text-white hover:bg-white/5 transition-all">Account Status</button>
                <button className="w-full text-left px-4 py-2 text-[10px] font-bold text-dim hover:text-white hover:bg-white/5 transition-all">Help Center</button>
                <div className="h-[1px] bg-white/5 my-1" />
                <button className="w-full text-left px-4 py-3 text-[10px] font-black text-center text-white hover:text-nebula-cyan transition-all">
                  SIGN OUT OF NEBULA
                </button>
              </motion.div>
             )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
const DiscoveryBar = ({ sortBy, setSortBy, activeMood, setActiveMood, onRandomize }: any) => {
  const MOODS = ['All Moods', 'Dark & Gritty', 'Mind-Bending', 'Adrenaline Rush', 'Cyber'];
  const SORTS = ['Recently Added', 'IMDB Rating', 'Release Date'];

  return (
    <section className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        {MOODS.map(mood => (
          <button
            key={mood}
            onClick={() => setActiveMood(mood)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeMood === mood 
              ? 'bg-nebula-cyan text-obsidian' 
              : 'bg-white/5 text-dim hover:text-white hover:bg-white/10'
            }`}
          >
            {mood}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="relative group">
          <button className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-dim group-hover:text-white transition-all">
            <History size={14} className="text-nebula-cyan" />
            <span>Sort: {sortBy}</span>
            <ChevronDown size={14} />
          </button>
          
          <div className="absolute top-full right-0 mt-2 w-48 bg-obsidian border border-white/10 rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
            {SORTS.map(sort => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className="w-full px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors text-dim hover:text-nebula-cyan"
              >
                {sort}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={onRandomize}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nebula-cyan/10 border border-nebula-cyan/30 text-nebula-cyan text-[10px] font-bold uppercase tracking-widest hover:bg-nebula-cyan hover:text-obsidian transition-all"
        >
          <Dices size={14} />
          <span>Randomizer</span>
        </button>
      </div>
    </section>
  );
};

const MovieDetails: React.FC<MovieDetailsProps> = ({ movie, onClose, onPlay, onSelectMovie, isInList, onToggleList }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isAudioFadingIn, setIsAudioFadingIn] = useState(false);
  const accentColor = movie.accent || '#00E5FF';

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAudioFadingIn(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const TABS = ['Overview', 'Trailers & Extras', 'Related Titles'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[150] bg-obsidian overflow-y-auto overflow-x-hidden"
    >
      {/* Dynamic Backdrop */}
      <div className="absolute inset-x-0 top-0 h-[70vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-obsidian/60 to-obsidian z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/40 to-transparent z-10" />
        <img 
          src={movie.backdrop || movie.poster} 
          className="w-full h-full object-cover blur-[2px] scale-105 opacity-40" 
          alt="" 
          referrerPolicy="no-referrer"
        />
        {/* Contextual Glow */}
        <div 
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] blur-[120px] opacity-20 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="relative z-20 max-w-[1400px] mx-auto px-10 pt-10 pb-20">
        {/* Breadcrumb Navigation */}
        <button 
          onClick={onClose}
          className="flex items-center gap-3 text-dim hover:text-white mb-16 transition-all group"
        >
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-nebula-cyan group-hover:bg-white/5 transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-xs font-bold tracking-[0.2em] uppercase">Back to Browse</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-16 items-start">
          {/* Vertical Poster Column */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full lg:w-[350px] aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative group shrink-0"
          >
            <img src={movie.poster} className="w-full h-full object-cover" alt={movie.title} referrerPolicy="no-referrer" />
            <div className="absolute inset-0 border-[1px] border-white/20 rounded-2xl pointer-events-none" />
          </motion.div>

          {/* Details Column */}
          <div className="flex-1">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-6xl font-display font-accent font-black tracking-tight mb-4 uppercase leading-none">
                {movie.title}
              </h1>
              
              <div className="flex items-center gap-6 mb-8 text-sm font-bold tracking-widest text-dim uppercase">
                <span className="flex items-center gap-2"><Star size={16} className="text-nebula-cyan fill-nebula-cyan" /> {movie.rating}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-2"><Clock size={16} /> {movie.duration || '2h 12m'}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-2"><Calendar size={16} /> {movie.year || '2025'}</span>
              </div>

              <p className="text-lg text-white/70 font-light leading-relaxed mb-10 max-w-2xl">
                {movie.description || 'Experience the next chapter in the Nebula Cinematic Universe. A stunning visual exploration of what lies beyond the edge of our perception.'}
              </p>

              {/* Technical Spec Strip */}
              <div className="flex items-center gap-10 mb-12 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl max-w-fit">
                <div className="flex flex-col items-center gap-2">
                   <Shield size={20} className="text-nebula-cyan" />
                   <span className="text-[10px] font-bold text-white/40 tracking-widest">4K UHD</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <Waveform size={20} className="text-nebula-cyan" />
                   <span className="text-[10px] font-bold text-white/40 tracking-widest">ATMOS</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <Sparkles size={20} className="text-nebula-cyan" />
                   <span className="text-[10px] font-bold text-white/40 tracking-widest">HDR10+</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <Maximize size={20} className="text-nebula-cyan" />
                   <span className="text-[10px] font-bold text-white/40 tracking-widest">2.39:1</span>
                </div>
              </div>

              <div className="flex gap-6 mb-16">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlay}
                  className="bg-white text-obsidian px-12 py-4 rounded-xl font-bold text-sm glow-white flex items-center gap-3 transition-all hover:bg-nebula-cyan"
                >
                  <Play size={20} fill="currentColor" /> <span>Watch Now</span>
                </motion.button>
                <motion.button 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  onClick={onToggleList}
                  className={`px-12 py-4 rounded-xl font-bold text-sm flex items-center gap-3 transition-all border ${
                    isInList ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/5 border-white/10 text-white'
                  }`}
                >
                  {isInList ? <X size={20} /> : <Plus size={20} />} <span>{isInList ? 'Remove from List' : 'Add to My List'}</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Tabbed Content */}
            <div className="border-b border-white/10 mb-10 flex gap-12">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-xs font-bold uppercase tracking-[0.3em] relative transition-colors ${
                    activeTab === tab ? 'text-nebula-cyan' : 'text-dim hover:text-white'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="active-tab" 
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-nebula-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]" 
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-12">
              {activeTab === 'Overview' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-12"
                >
                  {/* Cast Section */}
                  <div>
                    <h3 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-6">Director's Cut Cast</h3>
                    <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
                      {(movie.cast || [
                        { name: 'Aris Thorne', role: 'The Lead', avatar: 'https://i.pravatar.cc/150?u=a' },
                        { name: 'Sana Veda', role: 'The Pilot', avatar: 'https://i.pravatar.cc/150?u=b' },
                        { name: 'Marcus Void', role: 'The Villain', avatar: 'https://i.pravatar.cc/150?u=c' },
                        { name: 'Luna Grey', role: 'Oracle', avatar: 'https://i.pravatar.cc/150?u=d' }
                      ]).map((person: any, i: number) => (
                        <div key={`${person.name}-${person.role}-${i}`} className="flex flex-col items-center gap-3 group cursor-pointer">
                          <div className="w-20 h-20 rounded-full border-2 border-white/10 p-1 group-hover:border-nebula-cyan transition-all duration-500 overflow-hidden">
                            <img src={person.avatar} className="w-full h-full rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={person.name} />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-white group-hover:text-nebula-cyan transition-colors">{person.name}</p>
                            <p className="text-[8px] font-bold text-dim uppercase tracking-widest mt-1">{person.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audio Status */}
                  {isAudioFadingIn && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 text-[10px] font-bold text-nebula-cyan tracking-widest uppercase border border-nebula-cyan/20 bg-nebula-cyan/5 px-4 py-2 rounded-full w-fit"
                    >
                      <Waveform size={14} className="animate-pulse" />
                      Atmospheric Audio Stream Active
                    </motion.div>
                  )}
                </motion.div>
              )}

              {activeTab === 'Trailers & Extras' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {[...Array(3)].map((_, i) => (
                    <div key={`trailer-${movie.id}-${i}`} className="space-y-4 group cursor-pointer">
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-white/5">
                        <img 
                          src={`https://picsum.photos/seed/trailer-${movie.id}-${i}/800/450`} 
                          className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" 
                          alt="" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-nebula-cyan group-hover:text-obsidian transition-all group-hover:scale-110">
                           <Play size={20} fill="currentColor" />
                        </div>
                        <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-[10px] font-bold text-white border border-white/10">
                           2:15
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-nebula-cyan transition-colors">
                           {i === 0 ? 'Official Trailer' : i === 1 ? 'Legacy of the Nebula' : 'Atmospheric Recording'}
                        </h4>
                        <p className="text-[10px] text-dim font-bold mt-1 uppercase tracking-widest">Extra • 4K HDR</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'Related Titles' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-6"
                >
                  {ALL_MOVIES.filter(m => m.id !== movie.id && m.genre === movie.genre).slice(0, 4).map((m, i) => (
                    <div 
                      key={`rel-${movie.id}-${m.id}-${i}`} 
                      onClick={() => onSelectMovie?.(m)}
                      className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer relative"
                    >
                      <img src={m.poster} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                         <p className="text-[10px] font-bold text-nebula-cyan mb-1 uppercase tracking-widest">{m.genre}</p>
                         <p className="text-xs font-bold text-white leading-tight">{m.title}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface MovieDetailsProps {
  movie: any;
  onClose: () => void;
  onPlay: () => void;
  onSelectMovie?: (m: any) => void;
  isInList: boolean;
  onToggleList: () => void;
}

const MovieCard: React.FC<{ 
  movie: any; 
  snap?: boolean; 
  onSelect?: (m: any) => void; 
  isInList?: boolean;
  onToggleList?: () => void;
}> = ({ movie, snap = false, onSelect, isInList, onToggleList }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimerRef.current = setTimeout(() => {
      setShowVideo(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowVideo(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  return (
    <div 
      className={`relative min-w-[180px] aspect-[2/3] transition-all duration-300 ${isHovered ? 'z-50' : 'z-10'} ${snap ? 'snap-start' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect?.(movie)}
    >
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        animate={{ 
          scale: isHovered ? 1.1 : 1,
          boxShadow: isHovered ? "0 0 25px rgba(0, 229, 255, 0.4)" : "0 10px 30px rgba(0,0,0,0.5)"
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 group cursor-pointer bg-obsidian origin-center"
      >
        {/* Poster Image */}
        <AnimatePresence mode="wait">
          {!showVideo ? (
            <motion.img
              key="poster"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black"
            >
              {/* Using a placeholder video/gif since real high-bitrate video links are large. 
                  In a real app, this would be a <video> tag with a trailer URL. */}
              <img 
                src={`${movie.poster}?blur=2`} 
                className="w-full h-full object-cover scale-110" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-nebula-cyan/5 flex items-center justify-center">
                 <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <div className="flex gap-1">
                       <span className="w-1 h-3 bg-nebula-cyan animate-pulse" />
                       <span className="w-1 h-3 bg-nebula-cyan animate-pulse delay-75" />
                       <span className="w-1 h-3 bg-nebula-cyan animate-pulse delay-150" />
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4K Badge */}
        <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-bold text-nebula-cyan tracking-widest uppercase z-20">
          {movie.quality}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-90" />
        
        {/* Hover-Peek Detail Pane */}
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: isHovered ? "0%" : "100%" }}
          transition={{ duration: 0.4, ease: "circOut" }}
          className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur-xl border-t border-white/10 p-4 z-30 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#2ecc71] tracking-tighter">98% MATCH</span>
              <span className="px-1 py-0.5 rounded bg-white/10 text-[8px] border border-white/10 text-white/60">HD</span>
            </div>
            <div className="flex gap-2">
               <button 
                  className="w-7 h-7 rounded-full bg-white text-obsidian flex items-center justify-center hover:bg-nebula-cyan transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(movie);
                  }}
               >
                  <Play size={12} fill="currentColor" />
               </button>
               <button 
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                    isInList ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/10 border-white/10 hover:bg-white/20'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleList?.();
                  }}
               >
                  {isInList ? <X size={14} /> : <Plus size={14} />}
               </button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
             {['Sci-Fi', 'Action', 'Dark'].map((tag, i) => (
                <span key={`${movie.id}-tag-${tag}-${i}`} className="text-[8px] uppercase tracking-widest font-bold text-white/40">{tag}</span>
             ))}
          </div>

          <p className="text-[12px] font-bold tracking-tight text-white leading-tight truncate">{movie.title}</p>
        </motion.div>

        {/* Static Title (Hidden on Hover) */}
        {!isHovered && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <p className="text-[9px] text-dim font-extrabold uppercase tracking-widest mb-1">{movie.genre}</p>
            <p className="text-[15px] font-bold leading-tight drop-shadow-lg truncate">{movie.title}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
