import React, { useState, useEffect, useRef, useMemo } from 'react';

import { useLocalStorage } from './useLocalStorage';
import { 
  getTrending, searchMedia, getPopularMovies, getPopularTV, 
  getTopRatedMovies, getMoviesByGenre, enrichMoviesWithMetadata, NebulaMovie 
} from '../services/tmdb';

import { useLocation, useNavigate, useParams } from 'react-router-dom';

export function useAppState() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

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
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  const [myList, setMyList] = useLocalStorage<number[]>('nebula-my-list', []);
  const [history, setHistory] = useLocalStorage<number[]>('nebula-history', []);
  const [visibleCount, setVisibleCount] = useState(12);

  // Data States
  const [featuredMovies, setFeaturedMovies] = useState<NebulaMovie[]>([]);
  const [rows, setRows] = useState<{title: string, items: NebulaMovie[]}[]>([]);
  const [searchResults, setSearchResults] = useState<NebulaMovie[]>([]);

  const [allMovies, setAllMovies] = useState<NebulaMovie[]>([]); 

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper to merge new movies into the global pool uniquely
  const updateGlobalPool = (newMovies: NebulaMovie[]) => {
    setAllMovies(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const uniqueNew = newMovies.filter(m => !existingIds.has(m.id));
      return [...prev, ...uniqueNew];
    });
  };

  useEffect(() => {
    setVisibleCount(12);
  }, [viewingCategory, activeTab]);

  const loadMore = () => setVisibleCount(prev => prev + 12);

  const getCategoryMovies = () => {
    switch (viewingCategory) {
      case 'Movies': return allMovies.filter(m => m.type === 'movie');
      case 'TV Shows': return allMovies.filter(m => m.type === 'tv');
      case 'Library':
        const libraryIds = new Set([...myList, ...history]);
        return allMovies.filter(m => libraryIds.has(m.id));
      case 'My Secure Records': 
        return allMovies.filter(m => myList.includes(m.id));
      case 'Watch History':
        return allMovies.filter(m => history.includes(m.id));
      case 'Dramas':
        return allMovies.filter(m => (m as any).isDrama);
      default: return rows.flatMap(r => r.items);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch Categories
        const [trending, popMovies, topRated, action, scifi, animation, tvShows] = await Promise.all([
          getTrending('all'),
          getPopularMovies(),
          getTopRatedMovies(),
          getMoviesByGenre(28),
          getMoviesByGenre(878),
          getMoviesByGenre(16),
          getPopularTV()
        ]);

        // Enrich Featured
        const enrichedFeatured = await enrichMoviesWithMetadata(trending.slice(0, 5));
        setFeaturedMovies(enrichedFeatured);

        // Prepare Rows
        const newRows = [
          { title: 'Trending Operations', items: trending },
          { title: 'Popular Field Assets', items: popMovies },
          { title: 'Asian Drama Transmission', items: [] }, // Will be filled below
          { title: 'Pinoy Operations (PH)', items: [] },    // Will be filled below
          { title: 'Trending Transmissions (TV)', items: tvShows },
          { title: 'Top Rated Missions', items: topRated },
        ];
        
        setRows(newRows);
        updateGlobalPool([...trending, ...popMovies, ...tvShows, ...topRated, ...action, ...scifi, ...animation]);

        // Fetch KissKH specialized rows (Direct from server)
        const fetchDramas = async () => {
          try {
            const apiBase = (window as any).nebula_api || 'http://localhost:4000';
            const [topDramas, pinoyDramas] = await Promise.all([
               fetch(`${apiBase}/api/drama/list?page=1&order=2`).then(r => r.json()),
               fetch(`${apiBase}/api/drama/list?page=1&country=8`).then(r => r.json())
            ]);

            setRows(prev => {
              const updated = [...prev];
              updated[2] = { ...updated[2], items: topDramas.results || [] };
              updated[3] = { ...updated[3], items: pinoyDramas.results || [] };
              return updated;
            });
            updateGlobalPool([...(topDramas.results || []), ...(pinoyDramas.results || [])]);
          } catch (e) {
            console.error('Failed to fetch KissKH drama rows', e);
          }
        };
        fetchDramas();

        // Background Enrichment for row items (Async)
        newRows.forEach(async (row, i) => {
           if (row.items.length === 0) return;
           const enriched = await enrichMoviesWithMetadata(row.items.slice(0, 10));
           setRows(prev => {
              const updated = [...prev];
              updated[i] = { ...updated[i], items: [...enriched, ...row.items.slice(10)] };
              return updated;
           });
           updateGlobalPool(enriched);
        });

      } catch (err) {
        console.error('Data acquisition failure', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handler = setTimeout(async () => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery.trim().length > 1) {
        setIsLoading(true);
        const results = await searchMedia(searchQuery);
        const enriched = await enrichMoviesWithMetadata(results.slice(0, 6)); // Enrich first 6 search results
        const finalResults = [...enriched, ...results.slice(6)];
        setSearchResults(finalResults);
        updateGlobalPool(finalResults);
        setIsLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 400);
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
  const handleRandomize = () => {
    const pool = filteredMovies.length > 0 ? filteredMovies : allMovies;
    if (pool.length > 0) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      setSelectedMovie(random);
    }
  };

  // Sync state with URL changes
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
       setSelectedMovie(null);
       setIsPlaying(false);
    } else if (path.startsWith('/movie/') || path.startsWith('/tv/')) {
       const parts = path.split('/');
       const type = parts[1];
       const id = parseInt(parts[2]);
       
       if (!selectedMovie || selectedMovie.id !== id) {
          const found = allMovies.find(m => m.id === id && m.type === type);
          if (found) setSelectedMovie(found);
          // Note: If not found in pool, the MovieDetails component handles its own fetch
       }
    }
  }, [location.pathname, allMovies]);

  useEffect(() => {
    if (isHoveringHero || isPlaying || isSearchOpen || featuredMovies.length === 0) return;
    
    // Auto-transition timer
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 10000); // 10s for better readability

    return () => clearInterval(interval);
  }, [isHoveringHero, isPlaying, isSearchOpen, featuredMovies.length, currentHeroIndex]); // Reset on index change

  const filteredMovies = useMemo(() => {
    const source = viewingCategory ? getCategoryMovies() : rows[0]?.items || [];
    return source
      .filter(m => {
        const matchesGenre = selectedGenre === 'All' || m.genre.includes(selectedGenre);
        const matchesMood = activeMood === 'All Moods' || m.genre.toLowerCase().includes(activeMood.toLowerCase().split(' ')[0]);
        // Regional filter for Dramas
        const matchesRegion = selectedRegion === 'All' || (m as any).countryId === parseInt(selectedRegion);
        
        if (activeTab === 'my-list') return myList.includes(m.id);
        return matchesGenre && matchesMood && matchesRegion;
      })
      .sort((a, b) => {
        if (sortBy === 'IMDB Rating') return (b.imdb || 0) - (a.imdb || 0);
        return sortBy === 'Release Date' ? b.year - a.year : 0;
      });
  }, [selectedGenre, activeMood, activeTab, myList, sortBy, rows, viewingCategory]);

  const recommendations = useMemo(() => {
    const flat = rows.flatMap(r => r.items);
    return [...flat].sort(() => Math.random() - 0.5).slice(0, 20);
  }, [rows]);

  const startPlayback = (movie: any, s?: number, e?: number) => {
    setIsTransitioning(true);
    setHistory(prev => [...prev.filter(id => id !== movie.id), movie.id]);
    const target = s !== undefined && e !== undefined 
      ? `/watch/${movie.type}/${movie.id}?season=${s}&episode=${e}`
      : `/watch/${movie.type}/${movie.id}`;
    
    navigate(target);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  const wrappedSetSelectedMovie = (movie: any) => {
    if (!movie) {
      navigate('/');
    } else {
      navigate(`/${movie.type}/${movie.id}`);
    }
    setSelectedMovie(movie);
  };

  const handleNavClick = (id: string) => {
    if (id === 'search') setIsSearchOpen(true);
    else {
      setActiveTab(id);
      if (id === 'movies') setViewingCategory('Movies');
      else if (id === 'tv') setViewingCategory('TV Shows');
      else if (id === 'drama') setViewingCategory('Dramas');
      else if (id === 'library') setViewingCategory('Library');
      else setViewingCategory(null);
    }
  };

  const handleBack = () => {
    setIsTransitioning(true);
    navigate(-1);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  return {
    state: {
      activeTab,
      currentHeroIndex,
      isHoveringHero,
      isPlaying,
      selectedGenre,
      viewingCategory,
      isSearchOpen,
      searchQuery,
      debouncedSearchQuery,
      isLoading,
      sortBy,
      activeMood,
      selectedMovie,
      scrolled,
      myList,
      history,
      visibleCount,
      filteredMovies,
      searchResults,
      recommendations,
      allMovies,
      featuredMovies,
      rows,
      isTransitioning,
      selectedRegion
    },
    actions: {
      setActiveTab,
      setCurrentHeroIndex,
      setIsHoveringHero,
      setIsPlaying,
      setSelectedGenre,
      setViewingCategory,
      setIsSearchOpen,
      setSearchQuery,
      setSelectedMovie: wrappedSetSelectedMovie,
      setSortBy,
      setActiveMood,
      setSelectedRegion,
      toggleMyList,
      loadMore,
      getCategoryMovies,
      startPlayback,
      handleNavClick,
      handleRandomize,
      setIsTransitioning,
      handleBack
    },
    refs: {
      searchInputRef
    }
  };
}
