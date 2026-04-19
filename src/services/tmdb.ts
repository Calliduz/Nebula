const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'PLACEHOLDER';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const fetchWithCache = async (key: string, fetcher: () => Promise<any>) => {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    } catch (e) {
      localStorage.removeItem(key);
    }
  }
  const data = await fetcher();
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  return data;
};

export interface NebulaMovie {
  id: number;
  title: string;
  description: string;
  image: string;
  backdrop: string;
  genre: string;
  year: number;
  duration?: string;
  imdb?: number;
  type: 'movie' | 'tv';
  clearLogo?: string | null;
  fanartBackground?: string | null;
}

const fetchFromTMDB = async (endpoint: string, params: Record<string, string> = {}) => {
  if (API_KEY === 'PLACEHOLDER' || !API_KEY) {
    console.warn('TMDB API Key is missing. Returning empty array.');
    return { results: [] };
  }

  const isV4Token = API_KEY.length > 40;
  const query = new URLSearchParams({ language: 'en-US', ...params });
  if (!isV4Token) query.append('api_key', API_KEY);

  const key = `tmdb-${endpoint}-${query.toString()}`;
  return fetchWithCache(key, async () => {
    const headers: HeadersInit = { 'Accept': 'application/json' };
    if (isV4Token) headers['Authorization'] = `Bearer ${API_KEY}`;

    const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${query.toString()}`, { headers });
    if (!res.ok) throw new Error(`TMDB Error: ${res.status}`);
    return res.json();
  });
};

export const getMediaDetails = async (id: number, type: 'movie' | 'tv') => {
  try {
    const data = await fetchFromTMDB(`/${type}/${id}`, { append_to_response: 'videos,similar,credits' });
    return {
      trailers: data.videos?.results.filter((v: any) => v.type === 'Trailer' || v.type === 'Teaser') || [],
      similar: data.similar?.results.map((m: any) => normalizeMovie(m, type)) || [],
      cast: data.credits?.cast.slice(0, 10).map((c: any) => ({
        name: c.name,
        role: c.character,
        avatar: c.profile_path ? proxyImage(`${IMAGE_BASE_URL}${c.profile_path}`) : `https://i.pravatar.cc/150?u=${c.name}`
      })) || []
    };
  } catch (err) {
    console.error(err);
    return { trailers: [], similar: [], cast: [] };
  }
};

const proxyImage = (url: string) => {
  if (!url) return '';
  return `http://localhost:4000/api/image?url=${encodeURIComponent(url)}`;
};

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
};

export const enrichMoviesWithMetadata = async (normalized: NebulaMovie[]): Promise<NebulaMovie[]> => {
  if (!normalized.length) return normalized;
  
  try {
    const ids = normalized.map(m => m.id).join(',');
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
    const logoRes = await fetch(`${apiBase}/metadata?batch=${ids}`);
    const logoData = await logoRes.json();
    
    if (logoData && logoData.results) {
      logoData.results.forEach((meta: any) => {
        const index = normalized.findIndex((m: NebulaMovie) => m.id.toString() === meta.id.toString());
        if (index !== -1) {
          normalized[index].clearLogo = meta.logoUrl;
          normalized[index].fanartBackground = meta.backgroundUrl;
        }
      });
    }
  } catch (e) {
    console.warn('Metadata enrichment failed', e);
  }
  return normalized;
};

const normalizeMovie = (item: any, type: 'movie' | 'tv' = 'movie'): NebulaMovie => ({
  id: item.id || Math.floor(Math.random() * 1000000),
  title: item.title || item.name || 'Unknown Title',
  description: item.overview || 'No overview available.',
  image: item.poster_path ? proxyImage(`${IMAGE_BASE_URL}${item.poster_path}`) : proxyImage('https://picsum.photos/seed/nebula/400/600'),
  backdrop: item.backdrop_path ? proxyImage(`${BACKDROP_BASE_URL}${item.backdrop_path}`) : '',
  genre: item.genre_ids ? item.genre_ids.map((id: number) => GENRE_MAP[id] || 'Unknown').join(', ') : 'Unknown Genre', 
  year: parseInt((item.release_date || item.first_air_date || '2024').substring(0, 4), 10),
  imdb: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : undefined,
  type: item.media_type || type,
  duration: item.runtime ? `${item.runtime}m` : '124m',
  quality: '4K',
});

export const getTrending = async (type: 'movie' | 'tv' | 'all' = 'all'): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB(`/trending/${type}/day`);
    const normalized = data.results.map((m: any) => normalizeMovie(m, m.media_type || (type === 'all' ? 'movie' : type)));
    return normalized;
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const searchMedia = async (query: string): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/search/multi', { query });
    return data.results.filter((m: any) => m.media_type === 'movie' || m.media_type === 'tv').map((m: any) => normalizeMovie(m, m.media_type));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getPopularMovies = async (): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/movie/popular');
    return data.results.map((m: any) => normalizeMovie(m, 'movie'));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getPopularTV = async (): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/tv/popular');
    return data.results.map((m: any) => normalizeMovie(m, 'tv'));
  } catch (err) {
    console.error(err);
    return [];
  }
};
export const getTopRatedMovies = async (): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/movie/top_rated');
    return data.results.map((m: any) => normalizeMovie(m, 'movie'));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const getMoviesByGenre = async (genreId: number): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB('/discover/movie', { with_genres: genreId.toString(), sort_by: 'popularity.desc' });
    return data.results.map((m: any) => normalizeMovie(m, 'movie'));
  } catch (err) {
    console.error(err);
    return [];
  }
};
