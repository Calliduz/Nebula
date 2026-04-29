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

      // 3b. Continue Watching Row
      const progressData = JSON.parse(localStorage.getItem('nebula-progress') || '{}');
      const continueWatchingItems: any[] = [];
      const finishedItems: any[] = [];

      for (const [key, timestamp] of Object.entries(progressData)) {
        const id = key.toString().split('-')[0]; // Handle S1E1 suffixes
        let movie = allMovies.find(m => m.id.toString() === id.toString());
        if (!movie) movie = await getMediaBasicInfo(id, 'movie');
        
        if (movie) {
          const movieWithProgress = { ...movie, progress: timestamp };
          continueWatchingItems.push(movieWithProgress);
        }
      }

      // 3c. My List Row
      const myListItems = allMovies.filter(m => myList.includes(m.id.toString())).slice(0, 20);

      // 3d. User Genre Preference Profile
      const genreCounts: Record<string, number> = {};
      [...history, ...myList].forEach(id => {
        const m = allMovies.find(item => item.id.toString() === id.toString());
        if (m?.genre) {
          m.genre.split(', ').forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        }
      });
      const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]).slice(0, 2);

      const initialRows = [
        ...(continueWatchingItems.length > 0 ? [{ title: 'Continue Watching', items: continueWatchingItems }] : []),
        { title: 'Trending Missions: Global Feed', items: filteredTrending },
        ...(myListItems.length > 0 ? [{ title: 'My Secure Records', items: myListItems }] : []),
        ...recommendationRows,
        { title: 'Watch It Again', items: history.map(id => allMovies.find(m => m.id.toString() === id.toString())).filter(Boolean).slice(0, 10).sort(() => Math.random() - 0.5) },
        { title: 'Popular Asian Dramas', items: topDramas, isDramaRow: true }, 
        ...topGenres.map(g => ({ title: `Because you like ${g}`, items: allMovies.filter(m => m.genre.includes(g) && !globalShown.has(m.id.toString())).slice(0, 20) })),
        { title: 'Trending in your Sector: Philippines', items: pinoyDramas.slice(0, 10), isDramaRow: true },
        { title: 'Critically Acclaimed: Missions', items: acclaimedFiltered },
        { title: 'New Intel: 2025 Releases', items: newFiltered },
        { title: 'Cinematic Masterpieces', items: filteredTop.slice(0, 15) },
        { title: 'Award-Winning Hits', items: awardFiltered },
        { title: 'Action Packed Missions', items: actionFiltered },
        { title: `Actor Spotlight: ${spotlightActor}`, items: spotlightFiltered },
        { title: 'Bingeworthy TV Shows', items: filteredTV },
        { title: 'Hidden Gems', items: gemFiltered },
        { title: 'Comedy Gold', items: comedyFiltered },
        { title: 'Scary Nights (Horror)', items: horrorFiltered },
        { title: 'Mystery & Suspense', items: mysteryFiltered },
        { title: 'Popular Movies', items: filteredPop },
        { title: 'Animation Favorites', items: animationFiltered },
        { title: 'Sci-Fi Spectacles', items: sciFiFiltered },
        { title: 'Documentary Collection', items: docFiltered },
        { title: 'Pinoy Movies & TV', items: pinoyDramas.slice(10, 30), isDramaRow: true },    
        { title: 'Top Rated Movies', items: filteredTop.slice(15) },
      ].filter(r => r.items.length > 0);

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

  useEffect(() => {
    setVisibleCount(12);
    setDramaPage(1); // Reset pagination on category/tab change
  }, [viewingCategory, activeTab, selectedRegion]);

  const loadMore = () => {
    setDramaPage(prev => prev + 1);
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
      default: {
        // Find if this is a row title
        const row = rows.find(r => r.title === viewingCategory);
        if (row) {
          // Precise mapping for categories
          const CATEGORY_MAP: Record<string, any> = {
            'Trending Missions: Global Feed': (m: any) => m.type === 'movie' || m.type === 'tv',
            'Popular Asian Dramas': (m: any) => m.isDrama,
            'Critically Acclaimed: Missions': (m: any) => m.vote_average >= 8,
            'New Intel: 2025 Releases': (m: any) => m.release_date?.startsWith('2025'),
            'Award-Winning Hits': (m: any) => m.vote_average >= 8.5,
            'Action Packed Missions': (m: any) => m.genre.includes('Action'),
            'Bingeworthy TV Shows': (m: any) => m.type === 'tv',
            'Hidden Gems': (m: any) => m.vote_count < 1000 && m.vote_average >= 7,
            'Comedy Gold': (m: any) => m.genre.includes('Comedy'),
            'Scary Nights (Horror)': (m: any) => m.genre.includes('Horror'),
            'Mystery & Suspense': (m: any) => m.genre.includes('Mystery') || m.genre.includes('Thriller'),
            'Popular Movies': (m: any) => m.type === 'movie',
            'Animation Favorites': (m: any) => m.genre.includes('Animation'),
            'Sci-Fi Spectacles': (m: any) => m.genre.includes('Sci-Fi'),
            'Documentary Collection': (m: any) => m.genre.includes('Documentary'),
            'Top Rated Movies': (m: any) => m.type === 'movie' && m.vote_average >= 8,
            'Pinoy Movies & TV': (m: any) => m.isDrama // Simplification
          };

          const filterFn = CATEGORY_MAP[viewingCategory];
          if (filterFn) {
            const matches = allMovies.filter(filterFn);
            if (matches.length > 10) return matches;
          }

          // Fallback to genre-based matching
          const genreMatch = row.title.match(/Because you like (.*)|(.*) (Missions|Gold|Nights|Favorites|Spectacles|Collection|Spectacles)/i);
          const genreName = genreMatch ? (genreMatch[1] || genreMatch[2]) : null;
          
          if (genreName) {
            const poolMatches = allMovies.filter(m => 
              m.genre.toLowerCase().includes(genreName.toLowerCase())
            );
            return poolMatches.length > 0 ? poolMatches : row.items;
          }
          return row.items;
        }
        return allMovies;
      }
    }
  };

  useEffect(() => {
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

  const removeFromHistory = (id: number) => {
    const newHistory = history.filter(hid => hid !== id);
    setHistory(newHistory);
    localStorage.setItem('nebula-history', JSON.stringify(newHistory));
  };

  const removeFromProgress = (id: string) => {
    const p = JSON.parse(localStorage.getItem('nebula-progress') || '{}');
    // Remove all keys starting with this ID (to handle S1E1 etc)
    Object.keys(p).forEach(key => {
      if (key.startsWith(id)) delete p[key];
    });
    localStorage.setItem('nebula-progress', JSON.stringify(p));
    // Trigger a refresh of rows to remove it from UI
    fetchInitialData();
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('nebula-history');
    localStorage.removeItem('nebula-progress');
    fetchInitialData();
  };

  const clearMyList = () => {
    setMyList([]);
    localStorage.removeItem('nebula-my-list');
  };


  const clearFinishedProgress = () => {
    const p = JSON.parse(localStorage.getItem('nebula-progress') || '{}');
    Object.keys(p).forEach(key => {
      const val = p[key];
      if (typeof val === 'object' && val.duration - val.time < 60) {
        delete p[key];
      }
    });
    localStorage.setItem('nebula-progress', JSON.stringify(p));
    fetchInitialData();
  };

  // Auto-Cleanup Logic (Prune items older than 30 days)
  useEffect(() => {
    const cleanup = () => {
      // Prune History (Keep last 100 items only for performance)
      if (history.length > 100) {
        const newHistory = history.slice(-100);
        setHistory(newHistory);
        localStorage.setItem('nebula-history', JSON.stringify(newHistory));
      }
    };
    cleanup();
  }, []);

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
    if (!viewingCategory) return;

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
    } else if (!['Movies', 'TV Shows', 'Library', 'My Secure Records', 'Watch History'].includes(viewingCategory)) {
      const fetchMoreForCategory = async () => {
        const row = rows.find(r => r.title === viewingCategory);
        if (!row) return;

        let discoverOptions: any = { page: dramaPage.toString() };

        const TMDB_GENRES: Record<string, number> = {
          'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35, 'Crime': 80,
          'Documentary': 99, 'Drama': 18, 'Family': 10751, 'Fantasy': 14, 'History': 36,
          'Horror': 27, 'Music': 10402, 'Mystery': 9648, 'Romance': 10749, 'Sci-Fi': 878,
          'Thriller': 53, 'War': 10752, 'Western': 37
        };

        const genreMatch = row.title.match(/Because you like (.*)|(.*) (Missions|Gold|Nights|Favorites|Spectacles|Collection)/i);
        const genreName = genreMatch ? (genreMatch[1] || genreMatch[2]) : null;
        
        if (genreName && TMDB_GENRES[genreName as keyof typeof TMDB_GENRES]) {
          discoverOptions.with_genres = TMDB_GENRES[genreName as keyof typeof TMDB_GENRES].toString();
        } else if (viewingCategory.includes('Top Rated')) {
          discoverOptions.sort_by = 'vote_average.desc';
          discoverOptions['vote_count.gte'] = '500';
        } else if (viewingCategory.includes('Trending')) {
          // For trending, we might just fetch page N of trending
          const more = await getTrending('all', dramaPage.toString());
          updateGlobalPool(more);
          return;
        }

        const more = await discoverMedia('movie', discoverOptions);
        updateGlobalPool(more);
      };
      fetchMoreForCategory();
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
      clearHistory,
      clearMyList,
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
