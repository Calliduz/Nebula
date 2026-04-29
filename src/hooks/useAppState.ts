import React, { useState, useEffect, useRef, useMemo } from 'react';

import { useLocalStorage } from './useLocalStorage';
import {
  getTrending, searchMedia, getPopularMovies, getPopularTV,
  getTopRatedMovies, enrichMoviesWithMetadata, NebulaMovie,
  discoverMedia, getRecommendations, getMediaBasicInfo,
  getMediaDetails, getPersonMovies, getPopularActors,
  GENRE_MAP
} from '../services/tmdb';

import { useLocation, useNavigate, useParams } from 'react-router-dom';

// Expanded actor pool — rotates day-by-day, personalised when history exists
const SPOTLIGHT_POOL = [
  { name: 'Leonardo DiCaprio', id: '6193' },
  { name: 'Tom Cruise', id: '500' },
  { name: 'Scarlett Johansson', id: '1245' },
  { name: 'Cillian Murphy', id: '2037' },
  { name: 'Robert Downey Jr.', id: '3223' },
  { name: 'Florence Pugh', id: '1373733' },
  { name: 'Zendaya', id: '505710' },
  { name: 'Keanu Reeves', id: '6384' },
  { name: 'Margot Robbie', id: '234352' },
  { name: 'Timothée Chalamet', id: '1190668' },
  { name: 'Denzel Washington', id: '5292' },
  { name: 'Ana de Armas', id: '1373737' },
  { name: 'Ryan Gosling', id: '30614' },
  { name: 'Saoirse Ronan', id: '1023483' },
  { name: 'Pedro Pascal', id: '1253360' },
  { name: 'Viola Davis', id: '19492' },
  { name: 'Paul Mescal', id: '3131315' },
  { name: 'Anya Taylor-Joy', id: '1241974' },
];

// ─── ROW_FETCH_CONFIG ─────────────────────────────────────────────────────────
// Single source of truth. Each entry drives: initial fetch, See-All pagination,
// and getCategoryMovies filter — so all three always stay perfectly in sync.
export interface RowConfig {
  mediaType: 'movie' | 'tv' | 'all';
  discoverParams: Record<string, string>; // TMDB discover params
  filterFn: (m: NebulaMovie) => boolean;  // client-side filter for getCategoryMovies
  type?: 'recommendations' | 'similar' | 'discover'; // Pagination fetch type
  targetId?: string | number; // For recommendations
}

export const ROW_FETCH_CONFIG: Record<string, RowConfig> = {
  'Trending Missions: Global Feed': {
    mediaType: 'all',
    discoverParams: {},
    filterFn: () => true,
  },
  'Bingeworthy TV Shows': {
    mediaType: 'tv',
    discoverParams: { sort_by: 'popularity.desc' },
    filterFn: m => m.type === 'tv',
  },
  'Critically Acclaimed: Missions': {
    mediaType: 'movie',
    discoverParams: { 'vote_average.gte': '7.5', 'vote_count.gte': '300', sort_by: 'vote_average.desc' },
    filterFn: m => (m.imdb ?? 0) >= 7.5,
  },
  'New Intel: 2025 Releases': {
    mediaType: 'movie',
    discoverParams: { primary_release_year: new Date().getFullYear().toString(), sort_by: 'popularity.desc' },
    filterFn: m => (m.release_date ?? '').startsWith(new Date().getFullYear().toString()),
  },
  'Cinematic Masterpieces': {
    mediaType: 'movie',
    discoverParams: { sort_by: 'vote_average.desc', 'vote_count.gte': '500' },
    filterFn: m => (m.imdb ?? 0) >= 7.5 && m.type === 'movie',
  },
  'Award-Winning Hits': {
    mediaType: 'movie',
    discoverParams: { 'vote_average.gte': '7.5', 'vote_count.gte': '200', sort_by: 'vote_average.desc' },
    filterFn: m => (m.imdb ?? 0) >= 7.5,
  },
  'Action Packed Missions': {
    mediaType: 'movie',
    discoverParams: { with_genres: '28', 'primary_release_date.gte': '2000-01-01', sort_by: 'popularity.desc' },
    filterFn: m => m.genre.includes('Action'),
  },
  'Hidden Gems': {
    mediaType: 'movie',
    discoverParams: { 'vote_average.gte': '7.5', 'vote_count.lte': '1000', 'vote_count.gte': '100', sort_by: 'vote_average.desc' },
    filterFn: m => (m.vote_count ?? 9999) < 1000 && (m.imdb ?? 0) >= 7,
  },
  'Comedy Gold': {
    mediaType: 'movie',
    discoverParams: { with_genres: '35', 'primary_release_date.gte': '2000-01-01', sort_by: 'popularity.desc' },
    filterFn: m => m.genre.includes('Comedy'),
  },
  'Scary Nights (Horror)': {
    mediaType: 'movie',
    discoverParams: { with_genres: '27', 'primary_release_date.gte': '2000-01-01', sort_by: 'popularity.desc' },
    filterFn: m => m.genre.includes('Horror'),
  },
  'Mystery & Suspense': {
    mediaType: 'movie',
    discoverParams: { with_genres: '9648', 'primary_release_date.gte': '2000-01-01', sort_by: 'popularity.desc' },
    filterFn: m => m.genre.includes('Mystery') || m.genre.includes('Thriller'),
  },
  'Popular Movies': {
    mediaType: 'movie',
    discoverParams: { 'primary_release_date.gte': '2000-01-01', sort_by: 'popularity.desc' },
    filterFn: m => m.type === 'movie',
  },
  'Animation Favorites': {
    mediaType: 'movie',
    discoverParams: { with_genres: '16', 'primary_release_date.gte': '2000-01-01', sort_by: 'popularity.desc' },
    filterFn: m => m.genre.includes('Animation'),
  },
  'Sci-Fi Spectacles': {
    mediaType: 'movie',
    discoverParams: { with_genres: '878', 'primary_release_date.gte': '2000-01-01', sort_by: 'vote_count.desc' },
    filterFn: m => m.genre.includes('Sci-Fi'),
  },
  'Documentary Collection': {
    mediaType: 'movie',
    discoverParams: { with_genres: '99', 'primary_release_date.gte': '2000-01-01', sort_by: 'popularity.desc' },
    filterFn: m => m.genre.includes('Documentary'),
  },
  'Top Rated Movies': {
    mediaType: 'movie',
    discoverParams: { sort_by: 'vote_average.desc', 'vote_count.gte': '1000' },
    filterFn: m => m.type === 'movie' && (m.imdb ?? 0) >= 7.0,
  },
};

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
  const [rows, setRows] = useState<{title: string, items: NebulaMovie[], config?: RowConfig}[]>([]);
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
    // 0. Hydrate from Cache for instant load
    const cachedFeed = localStorage.getItem('nebula-feed-cache');
    if (cachedFeed) {
      try {
        const { rows: cRows, featured: cFeatured, all: cAll, timestamp } = JSON.parse(cachedFeed);
        // If cache is fresh (< 4 hours), use it to skip initial loader
        if (Date.now() - timestamp < 1000 * 60 * 60 * 4) {
          setRows(cRows);
          setFeaturedMovies(cFeatured);
          setAllMovies(cAll);
          setIsLoading(false);
          // Still proceed with fetch in background to refresh data
        }
      } catch (e) {
        localStorage.removeItem('nebula-feed-cache');
      }
    }

    if (isLoading) setIsLoading(true);
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
        (async () => {
          let actorToUse = SPOTLIGHT_POOL[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % SPOTLIGHT_POOL.length];
          
          // Try to find a personal connection: Get an actor from history
          if (history.length > 0) {
             try {
                // Take a recent item and get its cast
                const recentId = history[history.length - 1];
                const movie = allMovies.find(m => m.id === recentId) || await getMediaBasicInfo(recentId, 'movie') as any;
                if (movie) {
                   const { cast } = await getMediaDetails(movie.id, movie.type || 'movie', movie.year);
                   if (cast && cast.length > 0) {
                      // Pick a top-billed actor that isn't already the default for the day
                      const candidate = cast[0];
                      if (candidate && candidate.id) {
                         actorToUse = { name: candidate.name, id: candidate.id.toString() };
                      }
                   }
                }
             } catch (e) { /* Fallback to day-based default */ }
          }

          return discoverMedia('movie', { with_cast: actorToUse.id }).then(res => ({
            actor: actorToUse.name,
            actorId: actorToUse.id,
            results: res
          }));
        })().catch(() => ({ actor: 'Leonardo DiCaprio', actorId: '6193', results: [] }))
      ]);

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
      const spotlightActorId = spotlightData.actorId || '6193';
      const topDramas = dramaRes.results || [];
      const pinoyDramas = (pinoyRes.results || []).filter((p: any) => !topDramas.some((t: any) => t.id === p.id));

      // 2. Global Deduplication logic (Exclusive rows)
      const globalShown = new Set<string>();
      const topTenItems = trending.slice(0, 10);
      topTenItems.forEach(m => globalShown.add((m.tmdbId || m.id).toString()));

      const filteredTrending = trending.filter(m => !globalShown.has((m.tmdbId || m.id).toString())).slice(0, 20);
      filteredTrending.forEach(m => globalShown.add((m.tmdbId || m.id).toString()));

      // 3. Personalized recommendation rows from watch history
      const recommendationRows: any[] = [];
      const historyIds = [...history].reverse().slice(0, 3);
      for (const histId of historyIds) {
        let movie = allMovies.find(m => m.id.toString() === histId.toString());
        if (!movie) movie = await getMediaBasicInfo(histId, 'movie') as any;
        if (movie) {
          const recs = await getRecommendations(histId, movie.type || 'movie').catch(() => []);
          const filtered = recs.filter(m => !globalShown.has(m.id.toString())).slice(0, 20);
          if (filtered.length > 5) {
            const label = historyIds.indexOf(histId) === 0 ? `Since you watched ${movie.title}` : `More like ${movie.title}`;
            recommendationRows.push({ 
              title: label, 
              items: filtered,
              config: {
                mediaType: movie.type || 'movie',
                type: 'recommendations',
                targetId: histId,
                discoverParams: {},
                filterFn: (m: any) => m.type === (movie?.type || 'movie')
              }
            });
          }
        }
      }

      const filterRow = (items: any[]) => {
        const uniqueItems = [];
        for (const m of items) {
          if (!globalShown.has(m.id.toString())) {
            uniqueItems.push(m);
            globalShown.add(m.id.toString());
          }
          if (uniqueItems.length >= 20) break;
        }
        // If the row is too sparse because of deduplication, fill it back up
        if (uniqueItems.length < 10) {
          const extras = items.filter(m => !uniqueItems.some(u => u.id === m.id)).slice(0, 20 - uniqueItems.length);
          uniqueItems.push(...extras);
        }
        return uniqueItems;
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

      const filteredPop = filterRow(popMovies);
      const filteredTV = filterRow(tvShows);
      const filteredTop = filterRow(topRated);

      // 3b. Continue Watching Row — collapse episodes to 1 card per title
      const progressData = JSON.parse(localStorage.getItem('nebula-progress') || '{}');
      // Group all progress keys by base ID (strip -S1E1 suffixes)
      const progressByTitle: Record<string, { key: string; val: any }> = {};
      for (const [key, val] of Object.entries(progressData)) {
        const baseId = key.toString().split('-')[0];
        // Keep the entry with the highest timestamp (most recently watched episode)
        const existing = progressByTitle[baseId];
        const ts = typeof val === 'object' && val !== null ? (val as any).timestamp ?? 0 : 0;
        const existingTs = existing ? (typeof existing.val === 'object' && existing.val !== null ? (existing.val as any).timestamp ?? 0 : 0) : -1;
        if (!existing || ts > existingTs) {
          progressByTitle[baseId] = { key, val };
        }
      }
      const continueWatchingItems: any[] = [];
      for (const [baseId, { key, val }] of Object.entries(progressByTitle)) {
        let movie = allMovies.find(m => m.id.toString() === baseId);
        if (!movie) movie = await getMediaBasicInfo(baseId, 'movie') as any;
        if (movie) {
          continueWatchingItems.push({ ...movie, progressKey: key, progress: val });
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
        ...topGenres.map(g => {
          const gId = Object.entries(GENRE_MAP).find(([_, name]) => name === g)?.[0];
          return { 
            title: `Because you like ${g}`, 
            items: allMovies.filter(m => m.genre.includes(g) && !globalShown.has(m.id.toString())).slice(0, 20),
            config: gId ? {
              mediaType: 'movie',
              discoverParams: { with_genres: gId, sort_by: 'popularity.desc' },
              filterFn: (m: any) => m.genre.includes(g)
            } : undefined
          };
        }),
        { title: 'Trending in your Sector: Philippines', items: pinoyDramas.slice(0, 10), isDramaRow: true },
        { title: 'Critically Acclaimed: Missions', items: acclaimedFiltered },
        { title: 'New Intel: 2025 Releases', items: newFiltered },
        { title: 'Cinematic Masterpieces', items: filteredTop.slice(0, 15) },
        { title: 'Award-Winning Hits', items: awardFiltered },
        { title: 'Action Packed Missions', items: actionFiltered },
        { 
          title: `Actor Spotlight: ${spotlightActor}`, 
          items: spotlightFiltered,
          config: {
            mediaType: 'movie',
            discoverParams: { with_cast: spotlightActorId, sort_by: 'popularity.desc' },
            filterFn: () => true
          }
        },
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

      // 7. Save to Cache for next session
      try {
        localStorage.setItem('nebula-feed-cache', JSON.stringify({
          rows: initialRows,
          featured: initialFeatured,
          all: finalPool,
          timestamp: Date.now()
        }));
      } catch (e) {
        // If quota exceeded, clear and skip
        localStorage.removeItem('nebula-feed-cache');
      }

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
        // Use ROW_FETCH_CONFIG for all standard rows — single source of truth
        const config = ROW_FETCH_CONFIG[viewingCategory || ''];
        if (config) {
          const matches = allMovies.filter(config.filterFn);
          if (matches.length > 0) return matches;
        }
        // Fallback: row items or genre match
        const row = rows.find(r => r.title === viewingCategory);
        if (row) {
          // "Because you like X" rows
          const genreMatch = row.title.match(/Because you like (.+)/i);
          if (genreMatch) {
            const g = genreMatch[1];
            return allMovies.filter(m => m.genre.toLowerCase().includes(g.toLowerCase()));
          }
          // Actor spotlight rows
          const actorMatch = row.title.match(/Actor Spotlight: (.+)/i);
          if (actorMatch) return row.items;
          // Rec rows ("Since you watched X", "More like X")
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

  const removeFromHistory = (id: string | number) => {
    setHistory(prev => prev.filter(h => h.toString() !== id.toString()));
    fetchInitialData();
  };

  const removeFromProgress = (id: string | number) => {
    const p = JSON.parse(localStorage.getItem('nebula-progress') || '{}');
    Object.keys(p).forEach(key => {
      if (key.includes(id.toString())) {
        delete p[key];
      }
    });
    localStorage.setItem('nebula-progress', JSON.stringify(p));
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
        let config = ROW_FETCH_CONFIG[viewingCategory];
        if (!config) {
          // Look for dynamic config attached to the row (e.g. Recommendations)
          const dynamicRow = rows.find(r => r.title === viewingCategory);
          if (dynamicRow?.config) config = dynamicRow.config;
        }

        if (config) {
          setIsLoading(true);
          try {
            let more: NebulaMovie[] = [];
            if (config.type === 'recommendations' && config.targetId) {
              more = await getRecommendations(config.targetId, config.mediaType as any, dramaPage.toString());
            } else if (config.mediaType === 'all') {
              more = await getTrending('all', dramaPage.toString());
            } else {
              more = await discoverMedia(
                config.mediaType,
                { ...config.discoverParams, page: dramaPage.toString() }
              );
            }

            if (more.length > 0) {
              updateGlobalPool(more);
              // For dynamic rows, also update the row state so getCategoryMovies/CategoryView sees them
              setRows(prev => prev.map(r => 
                r.title === viewingCategory 
                  ? { ...r, items: hardDedupe([...r.items, ...more]) } 
                  : r
              ));
            }
          } finally {
            setIsLoading(false);
          }
          return;
        }
        // Personalised rows ("Since you watched X", "More like X", "Because you like X") — no pagination needed
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
      removeFromHistory,
      removeFromProgress,
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
