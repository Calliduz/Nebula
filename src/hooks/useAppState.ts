import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useScroll, useTransform } from 'motion/react';
import { useLocalStorage } from './useLocalStorage';
import { getTrending, searchMedia, getPopularMovies, getPopularTV, NebulaMovie } from '../services/tmdb';

export function useAppState() {
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

  // Data States
  const [allMovies, setAllMovies] = useState<NebulaMovie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<NebulaMovie[]>([]);
  const [searchResults, setSearchResults] = useState<NebulaMovie[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 500], [0, 150]);

  useEffect(() => {
    setVisibleCount(12);
  }, [viewingCategory, activeTab]);

  const loadMore = () => setVisibleCount(prev => prev + 12);

  const getCategoryMovies = () => {
    switch (viewingCategory) {
      case 'Movies': return allMovies.filter(m => m.type === 'movie');
      case 'TV Shows': return allMovies.filter(m => m.type === 'tv');
      case 'My Secure Records': return allMovies.filter(m => myList.includes(m.id));
      default: return allMovies;
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const trending = await getTrending('all');
      setFeaturedMovies(trending.slice(0, 5));
      setAllMovies(trending);
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handler = setTimeout(async () => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery.trim().length > 1) {
        setIsLoading(true);
        const results = await searchMedia(searchQuery);
        setSearchResults(results);
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

  useEffect(() => {
    if (isHoveringHero || isPlaying || isSearchOpen || featuredMovies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isHoveringHero, isPlaying, isSearchOpen, featuredMovies.length]);

  const filteredMovies = useMemo(() => {
    return allMovies
      .filter(m => {
        // Search is now handled externally, but we still apply genre/mood
        const matchesGenre = selectedGenre === 'All' || m.genre.includes(selectedGenre);
        const matchesMood = activeMood === 'All Moods' || m.genre.toLowerCase().includes(activeMood.toLowerCase().split(' ')[0]);
        if (activeTab === 'my-list') return myList.includes(m.id);
        return matchesGenre && matchesMood;
      })
      .sort((a, b) => {
        if (sortBy === 'IMDB Rating') {
          return (b.imdb || 0) - (a.imdb || 0);
        }
        return sortBy === 'Release Date' ? b.year - a.year : 0;
      });
  }, [selectedGenre, activeMood, activeTab, myList, sortBy, allMovies]);

  const recommendations = useMemo(() => {
    // Shuffled copy for recommendations
    return [...allMovies].sort(() => Math.random() - 0.5);
  }, [allMovies]);

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
      heroParallax,
      filteredMovies,
      searchResults,
      recommendations,
      allMovies,
      featuredMovies
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
      setSelectedMovie,
      setSortBy,
      setActiveMood,
      toggleMyList,
      loadMore,
      getCategoryMovies,
      startPlayback,
      handleNavClick
    },
    refs: {
      searchInputRef
    }
  };
}
