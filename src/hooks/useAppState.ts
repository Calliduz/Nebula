import React, { useState, useEffect, useRef, useMemo } from 'react';

import { useLocalStorage } from './useLocalStorage';
import { 
  getTrending, searchMedia, getPopularMovies, getPopularTV, 
  getTopRatedMovies, getMoviesByGenre, enrichMoviesWithMetadata, NebulaMovie,
  discoverMedia, getSimilarMedia, getMediaBasicInfo
} from '../services/tmdb';

import { useLocation, useNavigate, useParams } from 'react-router-dom';

const SPOTLIGHT_POOL = [
  { name: 'Leonardo DiCaprio', id: '6193' },
  { name: 'Johnny Depp', id: '85' },
  { name: 'Tom Cruise', id: '500' },
  { name: 'Scarlett Johansson', id: '1245' },
  { name: 'Christopher Nolan', id: '525' },
  { name: 'Cillian Murphy', id: '2037' },
  { name: 'Robert Downey Jr.', id: '3223' },
  { name: 'Florence Pugh', id: '1373733' },
  { name: 'Zendaya', id: '505710' },
  { name: 'Keanu Reeves', id: '6384' }
];

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
  const [myList, setMyList] = useLocalStorage<any[]>('nebula-my-list', []);
  const [history, setHistory] = useLocalStorage<any[]>('nebula-history', []);
  const [visibleCount, setVisibleCount] = useState(12);
  const [dramaPage, setDramaPage] = useState(1);

  // Data States
  const [featuredMovies, setFeaturedMovies] = useState<NebulaMovie[]>([]);
  const [rows, setRows] = useState<{title: string, items: NebulaMovie[]}[]>([]);
  const [searchResults, setSearchResults] = useState<NebulaMovie[]>([]);

  const [allMovies, setAllMovies] = useState<NebulaMovie[]>([]); 

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper to merge new movies into the global pool uniquely
  const updateGlobalPool = (newMovies: NebulaMovie[]) => {
    setAllMovies(prev => {
      const existingIds = new Set(prev.map(m => m.id.toString()));
      const uniqueNew = newMovies.filter(m => !existingIds.has(m.id.toString()));
      return [...prev, ...uniqueNew];
    });
  };

  useEffect(() => {
    setVisibleCount(12);
    setDramaPage(1); // Reset pagination on category/tab change
  }, [viewingCategory, activeTab, selectedRegion]);

  const loadMore = () => {
    if (viewingCategory === 'Dramas') {
      setDramaPage(prev => prev + 1);
    }
    setVisibleCount(prev => prev + 12);
  };

  const getCategoryMovies = () => {
    switch (viewingCategory) {
      case 'Movies': return allMovies.filter(m => m.type === 'movie');
      case 'TV Shows': return allMovies.filter(m => m.type === 'tv');
      case 'Library':
        const libraryIds = new Set([...myList, ...history].map(id => id.toString()));
        return allMovies.filter(m => libraryIds.has(m.id.toString()));
      case 'My Secure Records': 
        const myListIds = new Set(myList.map(id => id.toString()));
        return allMovies.filter(m => myListIds.has(m.id.toString()));
      case 'Watch History':
        const historyIds = new Set(history.map(id => id.toString()));
        return allMovies.filter(m => historyIds.has(m.id.toString()));
      case 'Dramas':
        return allMovies.filter(m => (m as any).isDrama);
      default: return rows.flatMap(r => r.items);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch all raw data in parallel
        // Detect API base. If missing, warn the user about environment variables.
        let rawApi = import.meta.env.VITE_API_BASE_URL;
        if (!rawApi) {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            rawApi = 'http://localhost:4000';
          } else if (window.location.hostname === 'nebula.clev.studio') {
            rawApi = 'https://nebula-server-qbp6.onrender.com';
          } else {
            rawApi = `${window.location.origin}/api`;
          }
        }
        const apiBase = rawApi.replace(/\/api\/?$/, '').replace(/\/$/, '');
        const [
          rawTrending, rawPop, rawTop, rawTV, dramaRes, pinoyRes,
          sciFiRaw, acclaimedRaw, actionRaw, comedyRaw, horrorRaw, mysteryRaw, docRaw, animationRaw,
          awardRaw, newRaw, gemsRaw,
          leoRaw
        ] = await Promise.all([
          getTrending('all').catch(() => []),
          getPopularMovies().catch(() => []),
          getTopRatedMovies().catch(() => []),
          getPopularTV().catch(() => []),
          fetch(`${apiBase}/api/drama/list?page=1&order=2`).then(r => r.json()).catch(() => ({results:[]})),
          fetch(`${apiBase}/api/drama/list?page=1&country=8`).then(r => r.json()).catch(() => ({results:[]})),
          discoverMedia('movie', { with_genres: '878', sort_by: 'vote_count.desc' }).catch(() => []),
          discoverMedia('movie', { 'vote_average.gte': '8.0', 'vote_count.gte': '1000' }).catch(() => []),
          discoverMedia('movie', { with_genres: '28' }).catch(() => []), 
          discoverMedia('movie', { with_genres: '35' }).catch(() => []), 
          discoverMedia('movie', { with_genres: '27' }).catch(() => []), 
          discoverMedia('movie', { with_genres: '9648' }).catch(() => []), 
          discoverMedia('movie', { with_genres: '99' }).catch(() => []), 
          discoverMedia('movie', { with_genres: '16' }).catch(() => []), 
          discoverMedia('movie', { 'vote_average.gte': '8.5', 'vote_count.gte': '500' }).catch(() => []), 
          discoverMedia('movie', { 'primary_release_year': '2025' }).catch(() => []), 
          discoverMedia('movie', { 'vote_average.gte': '7.5', 'vote_count.lte': '1000', 'vote_count.gte': '100' }).catch(() => []),
          (() => {
            const randomSpotlight = SPOTLIGHT_POOL[Math.floor(Math.random() * SPOTLIGHT_POOL.length)];
            return discoverMedia('movie', { with_cast: randomSpotlight.id }).then(res => ({
              actor: randomSpotlight.name,
              results: res
            }));
          })().catch(() => ({ actor: 'Leonardo DiCaprio', results: [] }))
        ]);

        const hardDedupe = (arr: any[]) => {
          const seen = new Set<string>();
          const results = [];
          for (const m of arr) {
            const id = (m.tmdbId || m.id).toString();
            if (id && !seen.has(id)) {
              seen.add(id);
              results.push(m);
            }
          }
          return results;
        };

        const trending = hardDedupe(rawTrending);
        const popMovies = hardDedupe(rawPop);
        const topRated = hardDedupe(rawTop);
        const tvShows = hardDedupe(rawTV);
        const sciFiMovies = hardDedupe(sciFiRaw);
        const acclaimedMovies = hardDedupe(acclaimedRaw);
        const actionMovies = hardDedupe(actionRaw);
        const comedyMovies = hardDedupe(comedyRaw);
        const horrorMovies = hardDedupe(horrorRaw);
        const mysteryMovies = hardDedupe(mysteryRaw);
        const documentaryMovies = hardDedupe(docRaw);
        const animationMovies = hardDedupe(animationRaw);
        const awardMovies = hardDedupe(awardRaw);
        const newMovies = hardDedupe(newRaw);
        const gemMovies = hardDedupe(gemsRaw);
        const spotlightData = leoRaw as any;
        const spotlightMovies = hardDedupe(spotlightData.results || []);
        const spotlightActor = spotlightData.actor || 'Leonardo DiCaprio';
        const topDramas = dramaRes.results || [];
        const pinoyDramas = (pinoyRes.results || []).filter((p: any) => !topDramas.some((t: any) => t.id === p.id));

        // 2. Global Deduplication logic (Exclusive rows)
        const globalShown = new Set<string>();
        const topTenItems = trending.slice(0, 10);
        topTenItems.forEach(m => globalShown.add((m.tmdbId || m.id).toString()));

        const filteredTrending = trending.filter(m => !globalShown.has((m.tmdbId || m.id).toString())).slice(0, 20);
        filteredTrending.forEach(m => globalShown.add((m.tmdbId || m.id).toString()));

        // 3. Multi-Item Personalized Recommendation Rows
        const recommendationRows: any[] = [];
        const historyIds = [...history].reverse().slice(0, 3); // Take last 3 watched items
        
        for (const histId of historyIds) {
          let movie = allMovies.find(m => m.id.toString() === histId.toString());
          if (!movie) movie = await getMediaBasicInfo(histId, 'movie');
          
          if (movie) {
            const similar = await getSimilarMedia(histId, movie.type || 'movie').catch(() => []);
            const filtered = similar.filter(m => !globalShown.has(m.id.toString())).slice(0, 20);
            if (filtered.length > 5) {
               recommendationRows.push({
                 title: historyIds.indexOf(histId) === 0 ? `Since you watched ${movie.title}` : `More like ${movie.title}`,
                 items: filtered
               });
               // Optional: don't dedupe to keep personalization strong
            }
          }
        }

        const filterRow = (items: any[]) => {
          const filtered = items.filter(m => !globalShown.has(m.id.toString())).slice(0, 20);
          filtered.forEach(m => globalShown.add(m.id.toString()));
          return filtered;
        };

        const sciFiFiltered = filterRow(sciFiMovies);
        const acclaimedFiltered = filterRow(acclaimedMovies);
        const actionFiltered = filterRow(actionMovies);
        const comedyFiltered = filterRow(comedyMovies);
        const horrorFiltered = filterRow(horrorMovies);
        const mysteryFiltered = filterRow(mysteryMovies);
        const docFiltered = filterRow(documentaryMovies);
        const animationFiltered = filterRow(animationMovies);
        const awardFiltered = filterRow(awardMovies);
        const newFiltered = filterRow(newMovies);
        const gemFiltered = filterRow(gemMovies);
        const spotlightFiltered = filterRow(spotlightMovies);

        const filteredPop = popMovies.filter(m => !globalShown.has((m.tmdbId || m.id).toString())).slice(0, 20);
        filteredPop.forEach(m => globalShown.add((m.tmdbId || m.id).toString()));

        const filteredTV = tvShows.filter(m => !globalShown.has((m.tmdbId || m.id).toString())).slice(0, 20);
        filteredTV.forEach(m => globalShown.add((m.tmdbId || m.id).toString()));

        const filteredTop = topRated.filter(m => !globalShown.has((m.tmdbId || m.id).toString())).slice(0, 20);

        // 3c. My List Row
        const myListItems = allMovies.filter(m => myList.includes(m.id.toString())).slice(0, 20);

        const initialRows = [
          { title: 'Trending Missions', items: filteredTrending },
          ...(myListItems.length > 0 ? [{ title: 'My Secure Records', items: myListItems }] : []),
          ...recommendationRows,
          { title: 'Popular Asian Dramas', items: topDramas, isDramaRow: true }, 
          { title: 'Critically Acclaimed: Missions', items: acclaimedFiltered },
          { title: 'New Intel: 2025 Releases', items: newFiltered },
          { title: 'Award-Winning Hits', items: awardFiltered },
          { title: 'Action Packed Missions', items: actionFiltered },
          { title: `Actor Spotlight: ${spotlightActor}`, items: spotlightFiltered },
          { title: 'Hidden Gems', items: gemFiltered },
          { title: 'Comedy Gold', items: comedyFiltered },
          { title: 'Scary Nights (Horror)', items: horrorFiltered },
          { title: 'Mystery & Suspense', items: mysteryFiltered },
          { title: 'Popular Movies', items: filteredPop },
          { title: 'Animation Favorites', items: animationFiltered },
          { title: 'Sci-Fi Spectacles', items: sciFiFiltered },
          { title: 'Documentary Collection', items: docFiltered },
          { title: 'Pinoy Movies & TV', items: pinoyDramas, isDramaRow: true },    
          { title: 'Trending TV Shows', items: filteredTV },
          { title: 'Top Rated Movies', items: filteredTop },
        ];

        // 4. Set Initial State
        const initialFeatured = trending.slice(0, 5);
        setFeaturedMovies(initialFeatured);
        setRows(initialRows);

        // 5. Enrich Spotlight & Top 10 immediately for logos
        const [enrichedTop, enrichedFeatured] = await Promise.all([
          enrichMoviesWithMetadata(topTenItems),
          enrichMoviesWithMetadata(initialFeatured)
        ]);
        
        setFeaturedMovies(enrichedFeatured);
        const finalPool = hardDedupe([
          ...enrichedTop, ...enrichedFeatured, ...trending, ...popMovies, ...tvShows, 
          ...topRated, ...topDramas, ...pinoyDramas, ...sciFiMovies, ...acclaimedMovies, ...spotlightMovies,
          ...actionMovies, ...comedyMovies, ...horrorMovies, ...mysteryMovies, ...documentaryMovies, ...animationMovies,
          ...awardMovies, ...newMovies, ...gemMovies
        ]);
        setAllMovies(finalPool);

        // 6. Background enrichment for all rows (Skip Dramas as requested)
        initialRows.forEach(async (row, i) => {
           if (row.items.length === 0 || row.isDramaRow) return;
           const enriched = await enrichMoviesWithMetadata(row.items.slice(0, 10));
           setRows(prev => {
              const updated = [...prev];
              updated[i] = { ...updated[i], items: [...enriched, ...row.items.slice(10)] };
              return updated;
           });
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

  const toggleMyList = (movieId: any) => {
    const mid = movieId.toString();
    setMyList(prev => {
      const isAlreadyIn = prev.some(id => id.toString() === mid);
      if (isAlreadyIn) {
        return prev.filter(id => id.toString() !== mid);
      } else {
        return [...prev, mid];
      }
    });
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
       const rawId = parts[2];
       const id = rawId.startsWith('k') ? rawId : parseInt(rawId);
       
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

  useEffect(() => {
    if (viewingCategory === 'Dramas') {
      const fetchRegionalDramas = async () => {
        setIsLoading(true);
        try {
          const rawApi = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
          const apiBase = rawApi.replace(/\/api\/?$/, '').replace(/\/$/, '');
          const countryParam = selectedRegion !== 'All' ? `&country=${selectedRegion}` : '';
          const r = await fetch(`${apiBase}/api/drama/list?page=${dramaPage}${countryParam}&order=2`);
          const data = await r.json();
          if (data.results) {
            updateGlobalPool(data.results);
          }
        } catch (e) {
          console.error('Failed to fetch regional dramas', e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchRegionalDramas();
    }
  }, [viewingCategory, selectedRegion, dramaPage]);

  const filteredMovies = useMemo(() => {
    const source = viewingCategory ? getCategoryMovies() : rows[0]?.items || [];
    return source
      .filter(m => {
        const matchesGenre = selectedGenre === 'All' || m.genre.includes(selectedGenre);
        const matchesMood = activeMood === 'All Moods' || m.genre.toLowerCase().includes(activeMood.toLowerCase().split(' ')[0]);
        // Regional filter for Dramas
        const mRegion = (m as any).countryId?.toString();
        const matchesRegion = selectedRegion === 'All' || mRegion === selectedRegion;
        
        if (activeTab === 'my-list') return myList.includes(m.id);
        return matchesGenre && matchesMood && matchesRegion;
      })
      .sort((a, b) => {
        if (sortBy === 'IMDB Rating') return (b.imdb || 0) - (a.imdb || 0);
        return sortBy === 'Release Date' ? b.year - a.year : 0;
      });
  }, [selectedGenre, activeMood, activeTab, myList, sortBy, rows, viewingCategory, selectedRegion, allMovies]);

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
