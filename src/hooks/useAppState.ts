import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useScroll, useTransform } from 'motion/react';
import { useLocalStorage } from './useLocalStorage';
import { ALL_MOVIES, FEATURED_MOVIES } from '../data/movies';

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

  const filteredMovies = useMemo(() => {
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

  const recommendations = useMemo(() => ALL_MOVIES.slice().sort(() => Math.random() - 0.5), []);

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
      recommendations
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
