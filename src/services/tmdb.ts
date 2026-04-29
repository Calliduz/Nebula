const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'PLACEHOLDER';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

const CACHE_VERSION = 'v2.0'; // Bump to invalidate all old caches

// ─── TTL Constants ────────────────────────────────────────────────────────────
const TTL = {
  TRENDING:  1000 * 60 * 60 * 4,        // 4 hours — changes frequently
  POPULAR:   1000 * 60 * 60 * 24,       // 24 hours
  GENRE:     1000 * 60 * 60 * 24,       // 24 hours
  DETAILS:   1000 * 60 * 60 * 24 * 7,  // 7 days
  LEGACY:    1000 * 60 * 60 * 24 * 365 * 30, // ~30 years for pre-2000 films
  META:      1000 * 60 * 60 * 24 * 7,  // 7 days for logos/backdrops
};

const CURRENT_YEAR = new Date().getFullYear();

// ─── Cache with eviction ──────────────────────────────────────────────────────
const MAX_CACHE_BYTES = 4 * 1024 * 1024; // 4 MB

const getCacheSize = (): number => {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CACHE_VERSION)) {
      total += (localStorage.getItem(key) || '').length * 2; // UTF-16
    }
  }
  return total;
};

const evictOldest = () => {
  const entries: { key: string; ts: number }[] = [];
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(CACHE_VERSION)) continue;
    try {
      const { timestamp } = JSON.parse(localStorage.getItem(key) || '{}');
      entries.push({ key, ts: timestamp || 0 });
    } catch { entries.push({ key, ts: 0 }); }
  }
  // Sort oldest first, remove bottom 25%
  entries.sort((a, b) => a.ts - b.ts);
  const toRemove = entries.slice(0, Math.ceil(entries.length * 0.25));
  toRemove.forEach(e => localStorage.removeItem(e.key));
};

const fetchWithCache = async (key: string, fetcher: () => Promise<any>, ttl: number): Promise<any> => {
  const versionedKey = `${CACHE_VERSION}-${key}`;
  const cached = localStorage.getItem(versionedKey);

  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) return data;
    } catch {
      localStorage.removeItem(versionedKey);
    }
  }

  const data = await fetcher();

  try {
    if (getCacheSize() > MAX_CACHE_BYTES) evictOldest();
    localStorage.setItem(versionedKey, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    evictOldest();
    try {
      localStorage.setItem(versionedKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch { /* quota hard-fail: skip caching silently */ }
  }

  return data;
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface NebulaMovie {
  id: string | number;
  title: string;
  description: string;
  image: string;
  backdrop: string;
  genre: string;
  year: number;
  release_date?: string;   // NEW: full date string for filtering
  vote_count?: number;     // NEW: for Hidden Gems filter
  duration?: string;
  imdb?: number;
  type: 'movie' | 'tv';
  clearLogo?: string | null;
  fanartBackground?: string | null;
  quality?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getApiBase = (): string => {
  let rawApi = import.meta.env.VITE_API_BASE_URL;
  if (!rawApi) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') rawApi = 'http://localhost:4000';
    else if (host === 'nebula.clev.studio') rawApi = 'https://nebula-server-qbp6.onrender.com';
    else rawApi = `${window.location.origin}/api`;
  }
  return rawApi.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

const proxyImage = (url: string): string => {
  if (!url) return '';
  return `${getApiBase()}/api/image?url=${encodeURIComponent(url)}`;
};

export const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
};

// ─── Core TMDB Fetcher ────────────────────────────────────────────────────────
const fetchFromTMDB = async (
  endpoint: string,
  params: Record<string, string> = {},
  ttl: number = TTL.DETAILS
): Promise<any> => {
  if (API_KEY === 'PLACEHOLDER' || !API_KEY) {
    console.warn('[TMDB] API Key missing.');
    return { results: [] };
  }

  // Safety: never fetch KissKH IDs from TMDB
  const lastPart = endpoint.split('/').pop() || '';
  if (lastPart.startsWith('k')) {
    console.log(`[TMDB] Skipping native ID: ${lastPart}`);
    return { results: [] };
  }

  const isV4Token = API_KEY.length > 40;
  const query = new URLSearchParams({ language: 'en-US', ...params });
  if (!isV4Token) query.append('api_key', API_KEY);

  const cacheKey = `tmdb-${endpoint}-${query.toString()}`;
  return fetchWithCache(cacheKey, async () => {
    const headers: HeadersInit = { 'Accept': 'application/json' };
    if (isV4Token) headers['Authorization'] = `Bearer ${API_KEY}`;
    const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${query}`, { headers });
    if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
    return res.json();
  }, ttl);
};

// ─── Normalizer ───────────────────────────────────────────────────────────────
const normalizeMovie = (item: any, type: 'movie' | 'tv' = 'movie'): NebulaMovie => ({
  id: item.id || Math.floor(Math.random() * 1_000_000),
  title: item.title || item.name || 'Unknown Title',
  description: item.overview || 'No overview available.',
  image: item.poster_path
    ? proxyImage(`${IMAGE_BASE_URL}${item.poster_path}`)
    : proxyImage('https://picsum.photos/seed/nebula/400/600'),
  backdrop: item.backdrop_path ? proxyImage(`${BACKDROP_BASE_URL}${item.backdrop_path}`) : '',
  genre: item.genre_ids
    ? item.genre_ids.map((id: number) => GENRE_MAP[id] || 'Unknown').join(', ')
    : (item.genres ? item.genres.map((g: any) => g.name).join(', ') : 'Unknown Genre'),
  year: parseInt((item.release_date || item.first_air_date || '2024').substring(0, 4), 10),
  release_date: item.release_date || item.first_air_date || undefined,
  vote_count: item.vote_count ?? undefined,
  imdb: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : undefined,
  type: item.media_type || type,
  duration: item.runtime ? `${item.runtime}m` : undefined,
  quality: '4K',
});

// ─── Exported API Functions ───────────────────────────────────────────────────

export const getTrending = async (
  type: 'movie' | 'tv' | 'all' = 'all',
  page = '1'
): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB(`/trending/${type}/day`, { page }, TTL.TRENDING);
    return data.results.map((m: any) =>
      normalizeMovie(m, m.media_type || (type === 'all' ? 'movie' : type))
    );
  } catch { return []; }
};

export const getPopularMovies = async (page = '1'): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/movie/popular', { page }, TTL.POPULAR);
    return data.results.map((m: any) => normalizeMovie(m, 'movie'));
  } catch { return []; }
};

export const getPopularTV = async (page = '1'): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/tv/popular', { page }, TTL.POPULAR);
    return data.results.map((m: any) => normalizeMovie(m, 'tv'));
  } catch { return []; }
};

export const getTopRatedMovies = async (page = '1'): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/movie/top_rated', { page }, TTL.POPULAR);
    return data.results.map((m: any) => normalizeMovie(m, 'movie'));
  } catch { return []; }
};

export const getMoviesByGenre = async (genreId: number): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/discover/movie', {
      with_genres: genreId.toString(),
      sort_by: 'popularity.desc',
    }, TTL.GENRE);
    return data.results.map((m: any) => normalizeMovie(m, 'movie'));
  } catch { return []; }
};

export const discoverMedia = async (
  type: 'movie' | 'tv',
  params: Record<string, string>,
  ttl: number = TTL.GENRE
): Promise<NebulaMovie[]> => {
  try {
    // Don't force sort_by if caller already specified one
    const finalParams = params.sort_by ? params : { ...params, sort_by: 'popularity.desc' };
    const data = await fetchFromTMDB(`/discover/${type}`, finalParams, ttl);
    return data.results.map((m: any) => normalizeMovie(m, type));
  } catch { return []; }
};

export const searchMedia = async (query: string): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/search/multi', { query }, TTL.DETAILS);
    return data.results
      .filter((m: any) => m.media_type === 'movie' || m.media_type === 'tv')
      .map((m: any) => normalizeMovie(m, m.media_type));
  } catch { return []; }
};

// TMDB /recommendations uses collaborative filtering — much more relevant than /similar
export const getRecommendations = async (
  id: number | string,
  type: 'movie' | 'tv',
  page = '1'
): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB(`/${type}/${id}/recommendations`, { page }, TTL.DETAILS);
    const results = (data.results || []).map((m: any) => normalizeMovie(m, type));
    if (results.length >= 5) return results;
    // Fallback: /similar if recommendations are sparse
    const fallback = await fetchFromTMDB(`/${type}/${id}/similar`, { page }, TTL.DETAILS);
    return (fallback.results || []).map((m: any) => normalizeMovie(m, type));
  } catch { return []; }
};

// Keep getSimilarMedia for backward compat — delegates to recommendations now
export const getSimilarMedia = getRecommendations;

export const getMediaBasicInfo = async (
  id: string | number,
  type: 'movie' | 'tv'
): Promise<NebulaMovie | null> => {
  // KissKH native drama IDs
  if (id.toString().startsWith('k')) {
    try {
      const apiBase = getApiBase();
      const numId = id.toString().replace('k', '');
      const r = await fetch(`${apiBase}/api/drama/detail/${numId}`);
      if (r.ok) {
        const data = await r.json();
        return {
          id: id.toString(),
          title: data.title || 'Unknown Drama',
          type: 'movie',
          year: 0,
          genre: 'Drama',
          image: data.image || '',
          backdrop: '',
          description: '',
          isDrama: true,
        } as any;
      }
    } catch { /* ignore */ }
    return {
      id: id.toString(),
      title: 'Loading...',
      type,
      year: 0,
      genre: 'Drama',
      image: '',
      backdrop: '',
      description: '',
      isDrama: true,
    } as any;
  }

  try {
    const releaseYear = undefined; // unknown at this point
    const data = await fetchFromTMDB(`/${type}/${id}`, {}, TTL.DETAILS);
    if (!data || data.status_code === 34) return null;
    return normalizeMovie(data, type);
  } catch { return null; }
};

export const getMediaDetails = async (
  id: number,
  type: 'movie' | 'tv',
  releaseYear?: number
): Promise<{ trailers: any[]; similar: any[]; cast: any[] }> => {
  try {
    const ttl = releaseYear && (CURRENT_YEAR - releaseYear) >= 2 ? TTL.LEGACY : TTL.DETAILS;
    const data = await fetchFromTMDB(
      `/${type}/${id}`,
      { append_to_response: 'videos,recommendations,credits' },
      ttl
    );
    return {
      trailers: data.videos?.results.filter(
        (v: any) => v.type === 'Trailer' || v.type === 'Teaser'
      ) || [],
      similar: (data.recommendations?.results || []).map((m: any) => normalizeMovie(m, type)),
      cast: (data.credits?.cast || []).slice(0, 12).map((c: any) => ({
        id: c.id,
        name: c.name,
        role: c.character,
        avatar: c.profile_path
          ? proxyImage(`${IMAGE_BASE_URL}${c.profile_path}`)
          : `https://i.pravatar.cc/150?u=${c.name}`,
      })),
    };
  } catch {
    return { trailers: [], similar: [], cast: [] };
  }
};

export const enrichMoviesWithMetadata = async (
  normalized: NebulaMovie[]
): Promise<NebulaMovie[]> => {
  if (!normalized.length) return normalized;

  const targetMovies = normalized.filter(
    m => !(m as any).isDrama && (m as any).origin !== 'kisskh'
  );
  if (!targetMovies.length) return normalized;

  // Check per-item cache
  const allCached = normalized.every(m => {
    const key = `v2.0-meta-${m.id}:${m.type}`;
    const cached = localStorage.getItem(key);
    if (!cached) return false;
    try {
      const { logoUrl, backgroundUrl, ts } = JSON.parse(cached);
      if (logoUrl && Date.now() - ts < TTL.META) {
        m.clearLogo = logoUrl;
        m.fanartBackground = backgroundUrl;
        return true;
      }
    } catch { /* stale */ }
    return false;
  });

  if (allCached) return normalized;

  try {
    const comboIds = targetMovies.map(m => `${m.id}:${m.type || 'movie'}`).sort().join(',');
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/api/metadata?batch=${comboIds}`);
    if (!res.ok) return normalized;
    const logoData = await res.json();

    if (logoData?.results) {
      logoData.results.forEach((meta: any) => {
        const index = normalized.findIndex(m => m.id.toString() === meta.id.toString());
        if (index !== -1) {
          normalized[index].clearLogo = meta.logoUrl;
          normalized[index].fanartBackground = meta.backgroundUrl;
          if (meta.logoUrl) {
            try {
              localStorage.setItem(
                `v2.0-meta-${meta.id}:${normalized[index].type}`,
                JSON.stringify({ logoUrl: meta.logoUrl, backgroundUrl: meta.backgroundUrl, ts: Date.now() })
              );
            } catch { /* quota: skip */ }
          }
        }
      });
    }
  } catch { /* degrade gracefully */ }
  return normalized;
};

export const getTVDetails = async (id: string | number) => {
  try {
    const data = await fetchFromTMDB(`/tv/${id}`, {}, TTL.DETAILS);
    if (!data) return null;
    return {
      number_of_seasons: data.number_of_seasons,
      seasons: data.seasons,
    };
  } catch { return null; }
};

export const getTVSeasonEpisodes = async (tvId: string | number, seasonNumber: number) => {
  try {
    const data = await fetchFromTMDB(`/tv/${tvId}/season/${seasonNumber}`, {}, TTL.DETAILS);
    if (!data?.episodes) return [];
    const now = new Date();
    return data.episodes
      .filter((ep: any) => {
        if (!ep.air_date) return false;
        return new Date(ep.air_date) <= now;
      })
      .map((ep: any) => ({
        episode_number: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        still_path: ep.still_path ? proxyImage(`${IMAGE_BASE_URL}${ep.still_path}`) : null,
        air_date: ep.air_date,
        vote_average: ep.vote_average,
      }));
  } catch { return []; }
};

// ─── Actor/Person helpers ─────────────────────────────────────────────────────
export const getPersonMovies = async (
  personId: string,
  type: 'movie' | 'tv' = 'movie'
): Promise<NebulaMovie[]> => {
  try {
    const endpoint = type === 'movie'
      ? `/person/${personId}/movie_credits`
      : `/person/${personId}/tv_credits`;
    const data = await fetchFromTMDB(endpoint, {}, TTL.DETAILS);
    const raw = type === 'movie' ? data.cast || [] : data.cast || [];
    return raw
      .filter((m: any) => m.poster_path && (m.vote_count ?? 0) > 50)
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 30)
      .map((m: any) => normalizeMovie(m, type));
  } catch { return []; }
};

export const getPopularActors = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const data = await fetchFromTMDB('/person/popular', {}, TTL.POPULAR);
    return (data.results || []).slice(0, 20).map((p: any) => ({
      id: p.id.toString(),
      name: p.name,
    }));
  } catch { return []; }
};
