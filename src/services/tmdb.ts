const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'PLACEHOLDER';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

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
}

const fetchFromTMDB = async (endpoint: string, params: Record<string, string> = {}) => {
  if (API_KEY === 'PLACEHOLDER' || !API_KEY) {
    console.warn('TMDB API Key is missing. Returning empty array.');
    return { results: [] };
  }

  const isV4Token = API_KEY.length > 40;
  const query = new URLSearchParams({ language: 'en-US', ...params });
  if (!isV4Token) {
    query.append('api_key', API_KEY);
  }

  const headers: HeadersInit = { 'Accept': 'application/json' };
  if (isV4Token) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${query.toString()}`, { headers });
  if (!res.ok) throw new Error(`TMDB Error: ${res.status}`);
  return res.json();
};

const normalizeMovie = (item: any, type: 'movie' | 'tv' = 'movie'): NebulaMovie => ({
  id: item.id,
  title: item.title || item.name || 'Unknown Title',
  description: item.overview || 'No overview available.',
  image: item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : 'https://picsum.photos/seed/nebula/400/600',
  backdrop: item.backdrop_path ? `${BACKDROP_BASE_URL}${item.backdrop_path}` : '',
  genre: item.genre_ids ? item.genre_ids.join(', ') : 'Unknown Genre', // We can map IDs to names later if needed
  year: parseInt((item.release_date || item.first_air_date || '2024').substring(0, 4), 10),
  imdb: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : undefined,
  type: item.media_type || type,
});

export const getTrending = async (type: 'movie' | 'tv' | 'all' = 'all'): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB(`/trending/${type}/day`);
    const normalized = data.results.map((m: any) => normalizeMovie(m, m.media_type || (type === 'all' ? 'movie' : type)));
    
    // Attach ClearLOGOs for top 5 (Featured)
    const top5Ids = normalized.slice(0, 5).map((m: NebulaMovie) => m.id).join(',');
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
      const logoRes = await fetch(`${apiBase}/metadata?batch=${top5Ids}`);
      const logoData = await logoRes.json();
      if (logoData && logoData.results) {
         logoData.results.forEach((meta: any) => {
            const index = normalized.findIndex((m: NebulaMovie) => m.id.toString() === meta.id.toString());
            if (index !== -1) normalized[index].clearLogo = meta.logoUrl;
         });
      }
    } catch (e) {
      console.error('Failed to attach fanart metadata', e);
    }

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
