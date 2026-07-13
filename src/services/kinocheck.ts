// KinoCheck API service — fetches official trailers for movies and TV shows.
// Docs: https://api.kinocheck.com/
// Quota: 10,000 requests/day with API key.

const KINOCHECK_BASE = "https://api.kinocheck.com";
const API_KEY = import.meta.env.VITE_KINOCHECK_API_KEY as string | undefined;

export interface KinoCheckTrailer {
  youtubeId: string;
  title: string;
  thumbnail: string;
  category: string;
  views: number;
  published: string;
}

// In-memory session cache — avoids redundant API calls for the same tmdb_id.
const cache = new Map<string, KinoCheckTrailer[]>();

const buildHeaders = (): HeadersInit => {
  const h: Record<string, string> = {
    Accept: "application/json",
  };
  if (API_KEY) {
    h["X-Api-Key"] = API_KEY;
    h["X-Api-Host"] = "api.kinocheck.com";
  }
  return h;
};

const normalizeVideos = (videos: any[]): KinoCheckTrailer[] =>
  (videos || [])
    .filter((v: any) => v.youtube_video_id)
    .map((v: any) => ({
      youtubeId: v.youtube_video_id as string,
      title: v.title as string,
      thumbnail:
        v.youtube_thumbnail ||
        `https://img.youtube.com/vi/${v.youtube_video_id}/maxresdefault.jpg`,
      category: (v.categories?.[0] as string) || "Trailer",
      views: Number(v.views) || 0,
      published: v.published as string,
    }));

/**
 * Fetch KinoCheck trailers for a movie or TV show by TMDB ID.
 * Returns an empty array (not an error) if nothing is found.
 */
export const fetchKinoCheckTrailers = async (
  tmdbId: number,
  type: "movie" | "tv",
): Promise<KinoCheckTrailer[]> => {
  const cacheKey = `${type}:${tmdbId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const endpoint = type === "movie" ? "movies" : "shows";
  const params = new URLSearchParams({
    tmdb_id: String(tmdbId),
    categories: "Trailer,Teaser,Clip,Featurette",
    language: "en",
  });

  try {
    const res = await fetch(
      `${KINOCHECK_BASE}/${endpoint}?${params.toString()}`,
      { headers: buildHeaders() },
    );
    if (!res.ok) {
      cache.set(cacheKey, []);
      return [];
    }
    const data = await res.json();
    // /movies returns { trailer: {...}, videos: [...] }
    // We prefer videos array (has all categories) and fall back to trailer field.
    const all: any[] = [];
    if (Array.isArray(data.videos) && data.videos.length > 0) {
      all.push(...data.videos);
    } else if (data.trailer) {
      all.push(data.trailer);
    }
    const normalized = normalizeVideos(all);
    cache.set(cacheKey, normalized);
    return normalized;
  } catch {
    cache.set(cacheKey, []);
    return [];
  }
};
