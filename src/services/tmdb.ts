import { fetchKinoCheckTrailers } from "./kinocheck";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || "PLACEHOLDER";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

const CACHE_VERSION = "v3.0"; // Bumped to v3.0 to invalidate stale cached items lacking original_language/origin_country

const TTL = {
  TRENDING: 1000 * 60 * 60 * 4, // 4 hours — changes frequently
  POPULAR: 1000 * 60 * 60 * 24, // 24 hours
  GENRE: 1000 * 60 * 60 * 24, // 24 hours
  DETAILS: 1000 * 60 * 60 * 24 * 7, // 7 days
  LEGACY: 1000 * 60 * 60 * 24 * 365 * 30, // ~30 years for pre-2000 films
  META: 1000 * 60 * 60 * 24 * 7, // 7 days for logos/backdrops
  SEARCH: 1000 * 60 * 15, // 15 minutes — search queries change, 7 days is too stale
  RECOMMENDATIONS: 1000 * 60 * 60 * 4, // 4 hours — recommendations change on activity
};

const CURRENT_YEAR = new Date().getFullYear();

// ─── Cache with eviction ──────────────────────────────────────────────────────
const MAX_CACHE_BYTES = 4 * 1024 * 1024; // 4 MB

// Incremental byte counter — avoids an O(n) full scan on every write.
// -1 means "not yet computed"; getCacheSize() will populate it on first call.
let _cacheSizeBytes = -1;

const getCacheSize = (): number => {
  if (_cacheSizeBytes >= 0) return _cacheSizeBytes;
  // One-time bootstrap scan
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CACHE_VERSION)) {
      total += (localStorage.getItem(key) || "").length * 2; // UTF-16 bytes
    }
  }
  _cacheSizeBytes = total;
  return total;
};

const evictOldest = () => {
  const entries: { key: string; ts: number; size: number }[] = [];
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(CACHE_VERSION)) continue;
    const raw = localStorage.getItem(key) || "";
    try {
      const { timestamp } = JSON.parse(raw);
      entries.push({ key, ts: timestamp || 0, size: raw.length * 2 });
    } catch {
      entries.push({ key, ts: 0, size: raw.length * 2 });
    }
  }
  // Sort oldest first, remove bottom 25%
  entries.sort((a, b) => a.ts - b.ts);
  const toRemove = entries.slice(0, Math.ceil(entries.length * 0.25));
  toRemove.forEach((e) => {
    localStorage.removeItem(e.key);
    // Adjust the running counter
    if (_cacheSizeBytes >= 0)
      _cacheSizeBytes = Math.max(0, _cacheSizeBytes - e.size);
  });
};

const fetchWithCache = async (
  key: string,
  fetcher: () => Promise<any>,
  ttl: number,
): Promise<any> => {
  const versionedKey = `${CACHE_VERSION}-${key}`;
  const cached = localStorage.getItem(versionedKey);
  const oldSize = cached ? cached.length * 2 : 0;

  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) return data;
    } catch {
      localStorage.removeItem(versionedKey);
      // Adjust counter for the removed entry
      if (_cacheSizeBytes >= 0)
        _cacheSizeBytes = Math.max(0, _cacheSizeBytes - oldSize);
    }
  }

  const data = await fetcher();

  try {
    const serialized = JSON.stringify({ data, timestamp: Date.now() });
    const newSize = serialized.length * 2;

    if (getCacheSize() - oldSize + newSize > MAX_CACHE_BYTES) evictOldest();

    localStorage.setItem(versionedKey, serialized);
    // Update running counter: subtract old entry, add new
    if (_cacheSizeBytes >= 0)
      _cacheSizeBytes = Math.max(0, _cacheSizeBytes - oldSize) + newSize;
  } catch {
    evictOldest();
    // Counter may be stale after eviction-triggered retry; reset to force rescan
    _cacheSizeBytes = -1;
    try {
      const serialized = JSON.stringify({ data, timestamp: Date.now() });
      localStorage.setItem(versionedKey, serialized);
      _cacheSizeBytes = -1; // let next call rescan cleanly
    } catch {
      /* quota hard-fail: skip caching silently */
    }
  }

  return data;
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface NebulaMovie {
  id: string | number;
  title: string;
  description: string;
  tagline?: string;
  image: string;
  backdrop: string;
  genre: string;
  genres?: string[];
  isDocumentary?: boolean;
  displayType?: string;
  year: number;
  release_date?: string; // NEW: full date string for filtering
  vote_count?: number; // NEW: for Hidden Gems filter
  popularity?: number;
  duration?: string;
  imdb?: number;
  type: "movie" | "tv";
  clearLogo?: string | null;
  fanartBackground?: string | null;
  quality?: string;
  isVerified?: boolean;
  isDead?: boolean;
  adult?: boolean;
  progress?: any;
  hasNewEpisode?: boolean;
  original_language?: string;
  origin_country?: string[];
}

import { API_BASE_URL } from "../config";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getApiBase = (): string => API_BASE_URL;

const proxyImage = (url: string): string => {
  if (!url) return "";
  if (
    url.startsWith("/") ||
    url.startsWith("data:") ||
    url.includes("/api/image?url=")
  ) {
    return url;
  }
  let optimizedUrl = url;
  if (url.includes("image.tmdb.org/t/p/original/")) {
    if (url.toLowerCase().includes(".png")) {
      // Logos: downscale to w500
      optimizedUrl = url.replace("/original/", "/w500/");
    } else {
      // Backdrops: optimize to w1280 for high resolution without original file sizes
      optimizedUrl = url.replace("/original/", "/w1280/");
    }
  }
  return `${getApiBase()}/api/image?url=${encodeURIComponent(optimizedUrl)}`;
};

export const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

// ─── Core TMDB Fetcher ────────────────────────────────────────────────────────
const fetchFromTMDB = async (
  endpoint: string,
  params: Record<string, string> = {},
  ttl: number = TTL.DETAILS,
  signal?: AbortSignal,
): Promise<any> => {
  // Safety: never fetch KissKH IDs from TMDB
  const lastPart = endpoint.split("/").pop() || "";
  if (lastPart.startsWith("k")) {
    console.log(`[TMDB] Skipping native ID: ${lastPart}`);
    return { results: [] };
  }

  // Construct query parameters for the server-side proxy
  const queryParams = new URLSearchParams({
    endpoint,
    ...params,
  });

  const cacheKey = `tmdb-proxy-${endpoint}-${queryParams.toString()}`;
  return fetchWithCache(
    cacheKey,
    async () => {
      const fetchArgs: [string, RequestInit?] = [
        `${getApiBase()}/api/tmdb-proxy?${queryParams.toString()}`,
      ];
      if (signal) {
        fetchArgs.push({ signal });
      }
      const res = await fetch(...fetchArgs);
      if (!res.ok) throw new Error(`TMDB Proxy ${res.status}: ${endpoint}`);
      return res.json();
    },
    ttl,
  );
};

// ─── Normalizer ───────────────────────────────────────────────────────────────
const normalizeMovie = (
  item: any,
  type: "movie" | "tv" = "movie",
): NebulaMovie => {
  const genreList: string[] = item.genre_ids
    ? item.genre_ids.map((id: number) => GENRE_MAP[id] || "Unknown")
    : item.genres
      ? item.genres.map((g: any) => g.name || "")
      : [];

  const genreStr =
    genreList.length > 0 ? genreList.join(", ") : "Unknown Genre";
  const isDoc =
    (item.genre_ids && item.genre_ids.includes(99)) ||
    genreList.some((g) => g.toLowerCase().includes("documentary")) ||
    (item.title || item.name || "").toLowerCase().includes("documentary");

  const isAnime =
    (item.original_language === "ja" ||
      (Array.isArray(item.origin_country) &&
        item.origin_country.includes("JP"))) &&
    genreList.some((g) => g.toLowerCase().includes("animation"));

  const resolvedType: "movie" | "tv" = item.media_type || type;
  const displayType = isAnime
    ? "Anime"
    : isDoc
      ? "Doc"
      : resolvedType === "tv"
        ? "TV"
        : "Film";

  return {
    id: item.id || Math.floor(Math.random() * 1_000_000),
    title: item.title || item.name || "Unknown Title",
    description: item.overview || "No overview available.",
    tagline: item.tagline?.trim() || undefined,
    image: item.poster_path
      ? proxyImage(`${IMAGE_BASE_URL}${item.poster_path}`)
      : "/no-image.svg",
    backdrop: item.backdrop_path
      ? proxyImage(`${BACKDROP_BASE_URL}${item.backdrop_path}`)
      : "",
    genre: genreStr,
    genres: genreList,
    isDocumentary: isDoc,
    displayType,
    year: parseInt(
      (item.release_date || item.first_air_date || "2024").substring(0, 4),
      10,
    ),
    release_date: item.release_date || item.first_air_date || undefined,
    vote_count: item.vote_count ?? undefined,
    popularity: item.popularity ?? undefined,
    imdb: item.vote_average
      ? parseFloat(item.vote_average.toFixed(1))
      : undefined,
    type: resolvedType,
    duration: item.runtime ? `${item.runtime}m` : undefined,
    quality: (() => {
      if (!item.release_date && !item.first_air_date) return "HD";
      const releaseDate = new Date(item.release_date || item.first_air_date);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays < 0) return "TBA";
      if (type === "tv") return "HD";
      if (diffDays < 14) return "CAM";
      if (diffDays < 45) return "HD (Early)";
      return "HD";
    })(),
    adult: !!item.adult,
    original_language: item.original_language || undefined,
    origin_country: Array.isArray(item.origin_country)
      ? item.origin_country
      : item.origin_country
        ? [item.origin_country]
        : undefined,
  };
};

// Known adult / ecchi short series to filter out from general Anime tab unless allowAdult is true
const EXCLUDED_ECCHI_PATTERNS = [
  "overflow",
  "secret mission",
  "caressing my hibernating bear",
  "choking my virginity away",
  "xl joushi",
  "showtime!",
  "araiya-san",
  "omaera zenbu mendokusai",
  "sweet punishment",
  "yubisaki kara no honki no netsujou",
  "joshikousei no mudazukai",
  "ore wo suki nano wa omae dake ka yo",
  "harem in the labyrinth of another world",
  "redo of healer",
  "interspecies reviewers",
  "peter grill",
  "world's end harem",
];

export const isAnimeMedia = (
  m: NebulaMovie,
  allowAdult: boolean = false,
): boolean => {
  if (!m) return false;
  const titleLower = (m.title || "").toLowerCase();

  // 1. Exclude Ecchi / Adult Hentai shorts from general Anime tab unless allowAdult is true
  if (!allowAdult) {
    if (m.adult) return false;
    for (let i = 0; i < EXCLUDED_ECCHI_PATTERNS.length; i++) {
      if (titleLower.includes(EXCLUDED_ECCHI_PATTERNS[i])) return false;
    }
  }

  // 2. Must be Animation or Anime genre
  const genreLower = (m.genre || "").toLowerCase();
  const isAnimation =
    genreLower.includes("animation") || genreLower.includes("anime");
  if (!isAnimation) return false;

  // 3. Primary check: Japanese original language ('ja') or origin country ('JP')
  const isJapaneseLang = m.original_language === "ja";
  const isJapaneseCountry =
    Array.isArray(m.origin_country) && m.origin_country.includes("JP");

  if (isJapaneseLang || isJapaneseCountry) {
    return true;
  }

  // 4. Reject explicitly non-Japanese languages (e.g. 'en', 'fr', 'es', 'de', 'cn', 'kr')
  if (m.original_language && m.original_language !== "ja") {
    return false;
  }

  // 5. Reject explicitly non-Japanese origin countries (e.g. 'US', 'GB', 'FR', 'CA')
  if (
    Array.isArray(m.origin_country) &&
    m.origin_country.length > 0 &&
    !m.origin_country.includes("JP")
  ) {
    return false;
  }

  return false;
};

/**
 * Batches a check against the server's StreamCache to verify if we definitely have a copy.
 * Uses an in-memory cache (60s) to deduplicate identical requests.
 */
const availabilityCache = new Map<
  string,
  { ts: number; data: Map<string, { isVerified: boolean; isDead: boolean }> }
>();
const AVAIL_CACHE_TTL = 60_000; // 60 seconds

export const fetchAvailability = async (
  movies: NebulaMovie[],
): Promise<NebulaMovie[]> => {
  const ids = movies.map((m) => m.id).join(",");
  if (!ids) return movies;

  // Check in-memory cache first
  const cached = availabilityCache.get(ids);
  if (cached && Date.now() - cached.ts < AVAIL_CACHE_TTL) {
    return movies.map((m) => {
      const info = cached.data.get(m.id.toString());
      if (info) {
        return {
          ...m,
          isVerified: info.isVerified,
          quality: info.isVerified && m.quality === "TBA" ? "HD" : m.quality,
        };
      }
      return m;
    });
  }

  try {
    const response = await fetch(
      `${getApiBase()}/api/stream/availability?ids=${ids}`,
    );
    const { results } = await response.json();

    // Store in cache
    const cacheData = new Map<
      string,
      { isVerified: boolean; isDead: boolean }
    >();
    results.forEach((r: any) =>
      cacheData.set(r.id.toString(), {
        isVerified: r.isVerified,
        isDead: r.isDead,
      }),
    );
    availabilityCache.set(ids, { ts: Date.now(), data: cacheData });

    const verifiedMap = new Map<string, boolean>(
      results.map((r: any) => [r.id.toString(), r.isVerified]),
    );

    return movies.map((m) => {
      const isVerified = verifiedMap.get(m.id.toString()) || false;
      return {
        ...m,
        isVerified,
        quality: isVerified && m.quality === "TBA" ? "HD" : m.quality,
      };
    });
  } catch (error) {
    console.error("[AVAILABILITY ERROR]", error);
    return movies;
  }
};

// ─── Exported API Functions ───────────────────────────────────────────────────

export const getTrending = async (
  type: "movie" | "tv" | "all" = "all",
  page = "1",
): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB(
      `/trending/${type}/day`,
      { page },
      TTL.TRENDING,
    );
    return data.results.map((m: any) =>
      normalizeMovie(m, m.media_type || (type === "all" ? "movie" : type)),
    );
  } catch {
    return [];
  }
};

export const getPopularMovies = async (page = "1"): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB("/movie/popular", { page }, TTL.POPULAR);
    return data.results.map((m: any) => normalizeMovie(m, "movie"));
  } catch {
    return [];
  }
};

export const getPopularTV = async (page = "1"): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB("/tv/popular", { page }, TTL.POPULAR);
    return data.results.map((m: any) => normalizeMovie(m, "tv"));
  } catch {
    return [];
  }
};

export const getTopRatedMovies = async (page = "1"): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB("/movie/top_rated", { page }, TTL.POPULAR);
    return data.results.map((m: any) => normalizeMovie(m, "movie"));
  } catch {
    return [];
  }
};

export const getMoviesByGenre = async (
  genreId: number,
): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB(
      "/discover/movie",
      {
        with_genres: genreId.toString(),
        sort_by: "popularity.desc",
      },
      TTL.GENRE,
    );
    return data.results.map((m: any) => normalizeMovie(m, "movie"));
  } catch {
    return [];
  }
};

export const discoverMedia = async (
  type: "movie" | "tv",
  params: Record<string, string>,
  ttl: number = TTL.GENRE,
): Promise<NebulaMovie[]> => {
  try {
    // Don't force sort_by if caller already specified one
    const finalParams = params.sort_by
      ? params
      : { ...params, sort_by: "popularity.desc" };
    const data = await fetchFromTMDB(`/discover/${type}`, finalParams, ttl);
    return data.results.map((m: any) => normalizeMovie(m, type));
  } catch {
    return [];
  }
};

export const GENRE_NAME_TO_ID: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Sci-Fi": 878,
  "Sci-Fi & Fantasy": 10765,
  Thriller: 53,
  War: 10752,
  Western: 37,
  "Action & Adventure": 10759,
};

export interface DiscoverFilters {
  type?: "all" | "movie" | "tv" | "anime" | "people";
  sortBy?:
    | "relevance"
    | "popularity"
    | "most_watched"
    | "rating"
    | "newest"
    | "oldest"
    | "title";
  year?: string | number; // "all", "2026", "2025", "2024", "2023", "2020-2022", "2010s", "2000s", "90s", "classic"
  genre?: string; // "All", "Action", etc.
  minRating?: number; // 0, 6, 7, 7.5, 8, 8.5
  includeAdult?: boolean;
  page?: number;
}

export const matchYearFilter = (
  movieYear: number | undefined,
  yearFilter: string | number | undefined,
): boolean => {
  if (!yearFilter || yearFilter === "all" || yearFilter === "All") return true;
  if (!movieYear || isNaN(movieYear)) return false;

  const str = String(yearFilter).trim().toLowerCase();
  if (/^\d{4}$/.test(str)) {
    return movieYear === parseInt(str, 10);
  }

  const rangeMatch = str.match(/^(\d{4})-(\d{4})$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    return movieYear >= start && movieYear <= end;
  }

  if (str === "2010s") return movieYear >= 2010 && movieYear <= 2019;
  if (str === "2000s") return movieYear >= 2000 && movieYear <= 2009;
  if (str === "90s" || str === "1990s")
    return movieYear >= 1990 && movieYear <= 1999;
  if (str === "80s" || str === "1980s")
    return movieYear >= 1980 && movieYear <= 1989;
  if (str === "classic" || str === "pre-1990") return movieYear < 1990;
  if (str === "pre-2000") return movieYear < 2000;

  return true;
};

const getYearFilterDates = (
  yearValue: string | number,
): {
  movieParams: Record<string, string>;
  tvParams: Record<string, string>;
} => {
  if (!yearValue || yearValue === "all" || yearValue === "All") {
    return { movieParams: {}, tvParams: {} };
  }

  const str = String(yearValue).trim().toLowerCase();

  // Exact single 4-digit year
  if (/^\d{4}$/.test(str)) {
    return {
      movieParams: { primary_release_year: str },
      tvParams: { first_air_date_year: str },
    };
  }

  // Range: "2020-2022" or "2020-2024"
  const rangeMatch = str.match(/^(\d{4})-(\d{4})$/);
  if (rangeMatch) {
    const [, startYear, endYear] = rangeMatch;
    return {
      movieParams: {
        "primary_release_date.gte": `${startYear}-01-01`,
        "primary_release_date.lte": `${endYear}-12-31`,
      },
      tvParams: {
        "first_air_date.gte": `${startYear}-01-01`,
        "first_air_date.lte": `${endYear}-12-31`,
      },
    };
  }

  // Decades
  if (str === "2010s") {
    return {
      movieParams: {
        "primary_release_date.gte": "2010-01-01",
        "primary_release_date.lte": "2019-12-31",
      },
      tvParams: {
        "first_air_date.gte": "2010-01-01",
        "first_air_date.lte": "2019-12-31",
      },
    };
  }
  if (str === "2000s") {
    return {
      movieParams: {
        "primary_release_date.gte": "2000-01-01",
        "primary_release_date.lte": "2009-12-31",
      },
      tvParams: {
        "first_air_date.gte": "2000-01-01",
        "first_air_date.lte": "2009-12-31",
      },
    };
  }
  if (str === "90s" || str === "1990s") {
    return {
      movieParams: {
        "primary_release_date.gte": "1990-01-01",
        "primary_release_date.lte": "1999-12-31",
      },
      tvParams: {
        "first_air_date.gte": "1990-01-01",
        "first_air_date.lte": "1999-12-31",
      },
    };
  }
  if (str === "80s" || str === "1980s") {
    return {
      movieParams: {
        "primary_release_date.gte": "1980-01-01",
        "primary_release_date.lte": "1989-12-31",
      },
      tvParams: {
        "first_air_date.gte": "1980-01-01",
        "first_air_date.lte": "1989-12-31",
      },
    };
  }
  if (str === "classic" || str === "pre-1990") {
    return {
      movieParams: {
        "primary_release_date.lte": "1989-12-31",
      },
      tvParams: {
        "first_air_date.lte": "1989-12-31",
      },
    };
  }

  return { movieParams: {}, tvParams: {} };
};

export const filterAndSortSearchResults = (
  items: NebulaMovie[],
  filters: DiscoverFilters,
): NebulaMovie[] => {
  if (!items || !Array.isArray(items)) return [];

  let result = [...items];

  // 1. Media Type Filter
  if (filters.type && filters.type !== "all" && filters.type !== "people") {
    if (filters.type === "anime") {
      result = result.filter((m) => isAnimeMedia(m, filters.includeAdult));
    } else if (filters.type === "movie") {
      result = result.filter(
        (m) => m.type === "movie" && !isAnimeMedia(m, filters.includeAdult),
      );
    } else if (filters.type === "tv") {
      result = result.filter(
        (m) => m.type === "tv" && !isAnimeMedia(m, filters.includeAdult),
      );
    }
  }

  // 2. Year Filter
  if (filters.year && filters.year !== "all") {
    result = result.filter((m) => matchYearFilter(m.year, filters.year));
  }

  // 3. Genre Filter
  if (filters.genre && filters.genre !== "All") {
    if (filters.genre === "Anime") {
      result = result.filter((m) => isAnimeMedia(m, filters.includeAdult));
    } else {
      const gLower = filters.genre.toLowerCase();
      result = result.filter((m) => {
        const genreStr = Array.isArray((m as any).genres)
          ? (m as any).genres.join(" ")
          : m.genre || "";
        return genreStr.toLowerCase().includes(gLower);
      });
    }
  }

  // 4. Rating Filter
  if (filters.minRating && filters.minRating > 0) {
    result = result.filter((m) => (m.imdb || 0) >= filters.minRating!);
  }

  // 5. Sort By
  if (filters.sortBy && filters.sortBy !== "relevance") {
    if (filters.sortBy === "popularity" || filters.sortBy === "most_watched") {
      result.sort((a, b) => {
        const scoreA = (a.popularity || 0) + (a.vote_count || 0) * 0.01;
        const scoreB = (b.popularity || 0) + (b.vote_count || 0) * 0.01;
        return scoreB - scoreA;
      });
    } else if (filters.sortBy === "rating") {
      result.sort((a, b) => (b.imdb || 0) - (a.imdb || 0));
    } else if (filters.sortBy === "newest") {
      result.sort((a, b) => {
        const dateA = a.release_date
          ? new Date(a.release_date).getTime()
          : (a.year || 0) * 10000;
        const dateB = b.release_date
          ? new Date(b.release_date).getTime()
          : (b.year || 0) * 10000;
        return dateB - dateA;
      });
    } else if (filters.sortBy === "oldest") {
      result.sort((a, b) => {
        const dateA = a.release_date
          ? new Date(a.release_date).getTime()
          : (a.year || 9999) * 10000;
        const dateB = b.release_date
          ? new Date(b.release_date).getTime()
          : (b.year || 9999) * 10000;
        return dateA - dateB;
      });
    } else if (filters.sortBy === "title") {
      result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }
  }

  return result;
};

export const discoverMediaWithFilters = async (
  filters: DiscoverFilters = {},
  signal?: AbortSignal,
): Promise<NebulaMovie[]> => {
  const {
    type = "all",
    sortBy = "popularity",
    year = "all",
    genre = "All",
    minRating = 0,
    includeAdult = false,
    page = 1,
  } = filters;

  const { movieParams: yearMovieParams, tvParams: yearTvParams } =
    getYearFilterDates(year);

  // Common sort mappings
  let movieSort = "popularity.desc";
  let tvSort = "popularity.desc";
  let minVoteCount = "20";

  if (sortBy === "rating") {
    movieSort = "vote_average.desc";
    tvSort = "vote_average.desc";
    minVoteCount = "100";
  } else if (sortBy === "newest") {
    movieSort = "primary_release_date.desc";
    tvSort = "first_air_date.desc";
    minVoteCount = "5";
  } else if (sortBy === "oldest") {
    movieSort = "primary_release_date.asc";
    tvSort = "first_air_date.asc";
    minVoteCount = "10";
  } else if (sortBy === "title") {
    movieSort = "original_title.asc";
    tvSort = "name.asc";
    minVoteCount = "0";
  }

  // Genre mappings
  let movieGenreParam: string | undefined;
  let tvGenreParam: string | undefined;
  const isAnime = type === "anime" || genre === "Anime";

  if (genre && genre !== "All" && genre !== "Anime") {
    const genreId = GENRE_NAME_TO_ID[genre];
    if (genreId) {
      movieGenreParam = genreId.toString();
      if (genre === "Action")
        tvGenreParam = "10759"; // Action & Adventure for TV
      else if (genre === "Sci-Fi")
        tvGenreParam = "10765"; // Sci-Fi & Fantasy for TV
      else tvGenreParam = genreId.toString();
    }
  }

  const baseMovieParams: Record<string, string> = {
    sort_by: movieSort,
    page: page.toString(),
    include_adult: includeAdult.toString(),
    ...yearMovieParams,
  };

  const baseTvParams: Record<string, string> = {
    sort_by: tvSort,
    page: page.toString(),
    include_adult: includeAdult.toString(),
    ...yearTvParams,
  };

  if (minRating > 0) {
    baseMovieParams["vote_average.gte"] = minRating.toString();
    baseMovieParams["vote_count.gte"] = minVoteCount;
    baseTvParams["vote_average.gte"] = minRating.toString();
    baseTvParams["vote_count.gte"] = minVoteCount;
  } else if (sortBy === "rating") {
    baseMovieParams["vote_count.gte"] = minVoteCount;
    baseTvParams["vote_count.gte"] = minVoteCount;
  }

  if (movieGenreParam) baseMovieParams["with_genres"] = movieGenreParam;
  if (tvGenreParam) baseTvParams["with_genres"] = tvGenreParam;

  if (isAnime) {
    baseMovieParams["with_genres"] = "16";
    baseMovieParams["with_original_language"] = "ja";
    baseTvParams["with_genres"] = "16";
    baseTvParams["with_original_language"] = "ja";
  }

  try {
    const promises: Promise<any>[] = [];

    if (type === "movie" || type === "all" || isAnime) {
      promises.push(
        fetchFromTMDB("/discover/movie", baseMovieParams, TTL.GENRE, signal)
          .then((data) =>
            (data.results || []).map((m: any) => normalizeMovie(m, "movie")),
          )
          .catch(() => []),
      );
    }

    if (type === "tv" || type === "all" || isAnime) {
      promises.push(
        fetchFromTMDB("/discover/tv", baseTvParams, TTL.GENRE, signal)
          .then((data) =>
            (data.results || []).map((m: any) => normalizeMovie(m, "tv")),
          )
          .catch(() => []),
      );
    }

    const results = await Promise.all(promises);
    const flattened = results.flat();

    // Deduplicate
    const seen = new Set<string | number>();
    const deduped: NebulaMovie[] = [];
    for (const item of flattened) {
      if (!item || !item.id) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push(item);
    }

    // Re-sort combined list
    return filterAndSortSearchResults(deduped, {
      type,
      sortBy: sortBy === "relevance" ? "popularity" : (sortBy as any),
      year,
      genre,
      minRating,
      includeAdult,
    });
  } catch (err) {
    console.error("[TMDB] discoverMediaWithFilters failed:", err);
    return [];
  }
};

const COMMON_MEDIA_WORDS = [
  "viral",
  "hit",
  "piece",
  "one",
  "stranger",
  "things",
  "dark",
  "knight",
  "breaking",
  "bad",
  "demon",
  "slayer",
  "bear",
  "inception",
  "interstellar",
  "attack",
  "titan",
  "jujutsu",
  "kaisen",
  "hunter",
  "death",
  "note",
  "ball",
  "dragon",
  "naruto",
  "bleach",
  "punch",
  "solo",
  "leveling",
  "avatar",
  "last",
  "airbender",
  "cyber",
  "punk",
  "star",
  "wars",
  "trek",
  "dead",
  "pool",
  "avengers",
  "game",
  "thrones",
  "spider",
  "man",
  "bat",
  "iron",
  "super",
  "loki",
];

const splitCompoundWords = (query: string): string => {
  const q = query.toLowerCase().trim();
  if (
    !q ||
    q.includes(" ") ||
    q.includes("-") ||
    q.includes("_") ||
    q.includes(".")
  ) {
    return query;
  }

  for (let i = 2; i <= q.length - 2; i++) {
    const left = q.slice(0, i);
    const right = q.slice(i);
    if (
      COMMON_MEDIA_WORDS.includes(left) &&
      COMMON_MEDIA_WORDS.includes(right)
    ) {
      return (
        left.charAt(0).toUpperCase() +
        left.slice(1) +
        " " +
        right.charAt(0).toUpperCase() +
        right.slice(1)
      );
    }
  }

  return query;
};

const getNormalizedTitle = (title: string): string => {
  if (!title) return "";
  return title
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[_\-\.:\/\\()\[\]]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const getMatchTier = (titleNorm: string, queryNorm: string): number => {
  if (!queryNorm || !titleNorm) return 0;
  if (titleNorm === queryNorm) return 4; // Exact full match (e.g. "dune" === "dune")

  // Direct franchise sequel / leading whole-word match (e.g. "dune: part two", "dune 2", "dune part three")
  if (
    titleNorm.startsWith(queryNorm + " ") ||
    titleNorm.startsWith(queryNorm + ":") ||
    titleNorm.startsWith(queryNorm + "-")
  ) {
    return 3.8;
  }

  // Collapse spaces for compound word matching (e.g., "viral hit" vs "viralhit", "spider man" vs "spiderman")
  const titleCollapsed = titleNorm.replace(/\s+/g, "");
  const queryCollapsed = queryNorm.replace(/\s+/g, "");

  if (titleCollapsed === queryCollapsed) return 4; // Exact match collapsed
  if (titleCollapsed.startsWith(queryCollapsed)) return 3.0; // General prefix match

  // Check if query is a distinct word within the title (e.g. "planet dune", "the dark knight")
  const words = titleNorm.split(/\s+/);
  if (words.includes(queryNorm)) return 2.0;

  if (titleCollapsed.includes(queryCollapsed)) return 1.0; // Substring match
  return 0; // No match
};

export const searchMedia = async (
  query: string,
  includeAdult = false,
  signal?: AbortSignal,
): Promise<NebulaMovie[]> => {
  try {
    const trimmedQuery = query ? query.trim() : "";
    if (!trimmedQuery) return [];

    // Split camelCase, abbreviations, and alphanumeric boundaries
    const splitSpaced = trimmedQuery
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
      .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
      .replace(/[_\-\.:\/\\()\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const variations = [trimmedQuery];
    if (
      splitSpaced &&
      splitSpaced.toLowerCase() !== trimmedQuery.toLowerCase()
    ) {
      variations.push(splitSpaced);
    }

    const compoundSplit = splitCompoundWords(trimmedQuery);
    if (
      compoundSplit &&
      compoundSplit.toLowerCase() !== trimmedQuery.toLowerCase() &&
      !variations.includes(compoundSplit)
    ) {
      variations.push(compoundSplit);
    }

    // Parallel fetch for all query variations (page 1)
    const queryPromises: Promise<any[]>[] = variations.map((q) =>
      fetchFromTMDB(
        "/search/multi",
        { query: q, page: "1", include_adult: includeAdult.toString() },
        TTL.SEARCH,
        signal,
      )
        .then((data) => data.results || [])
        .catch(() => []),
    );

    // Also fetch page 2 for the primary query to return more than 20 direct titles
    queryPromises.push(
      fetchFromTMDB(
        "/search/multi",
        {
          query: trimmedQuery,
          page: "2",
          include_adult: includeAdult.toString(),
        },
        TTL.SEARCH,
        signal,
      )
        .then((data) => data.results || [])
        .catch(() => []),
    );

    const resultsLists = await Promise.all(queryPromises);

    // Flatten and deduplicate initial multi-search results
    const seenIds = new Set<string | number>();
    const directResults: any[] = [];
    const people: any[] = [];

    for (const list of resultsLists) {
      for (const item of list) {
        if (!item || !item.id) continue;
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        if (item.media_type === "person") {
          people.push(item);
        } else if (item.media_type === "movie" || item.media_type === "tv") {
          directResults.push(item);
        }
      }
    }

    // Sort direct results and people by relevance/popularity before slicing
    const queryNorm = getNormalizedTitle(trimmedQuery);
    const now = Date.now();

    /**
     * Composite score designed for modern cinematic search (matching TMDB/Netflix accuracy):
     * - matchTier × 400 — exact title (4) & franchise sequels (3.8) dominate over distant matches
     * - popularity  × 1.5  — strong indicator of current relevance
     * - log(vote_count) × 80 — robust measure of true viewership scale without runaway linear inflation
     * - vote_avg    × 5    — quality signal
     * - future penalty      — unreleased content softly demoted below watchable titles
     * - no-match penalty    — completely unrelated items pushed to bottom
     */
    const getCompositeScore = (item: any): number => {
      const title = item.title || item.name || "";
      const titleNorm = getNormalizedTitle(title);
      const tier = getMatchTier(titleNorm, queryNorm);
      const popularity = item.popularity || 0;
      const voteCount = item.vote_count || 0;
      const voteAvg = item.vote_average || 0;

      // Soft penalty for unreleased future content
      const releaseStr = item.release_date || item.first_air_date || "";
      let futurePenalty = 0;
      if (releaseStr) {
        const releaseMs = new Date(releaseStr).getTime();
        if (!isNaN(releaseMs) && releaseMs > now) futurePenalty = 150;
      }

      // Strong penalty for items with zero title match
      const noMatchPenalty = tier === 0 ? 500 : 0;

      // Log-scaled vote count gives balanced weight for 100 vs 1,000 vs 10,000+ votes
      const voteLogScore = Math.log10(voteCount + 1) * 80;

      return (
        tier * 400 +
        popularity * 1.5 +
        voteLogScore +
        voteAvg * 5 -
        futurePenalty -
        noMatchPenalty
      );
    };

    // Filter out extremely obscure / irrelevant noise entries
    const filteredDirectResults = directResults.filter((item) => {
      const voteCount = item.vote_count || 0;
      const popularity = item.popularity || 0;
      // Keep items that have ANY real engagement, or are an exact/close title match
      const title = item.title || item.name || "";
      const titleNorm = getNormalizedTitle(title);
      const tier = getMatchTier(titleNorm, queryNorm);
      if (tier >= 2) return true; // Always keep exact/prefix matches regardless of votes
      return voteCount >= 3 || popularity >= 1.5;
    });

    filteredDirectResults.sort(
      (a, b) => getCompositeScore(b) - getCompositeScore(a),
    );

    // Replace directResults with filtered+sorted version
    directResults.length = 0;
    filteredDirectResults.forEach((r) => directResults.push(r));

    const getPersonScore = (item: any) => {
      const name = item.name || "";
      const nameNorm = getNormalizedTitle(name);
      const tier = getMatchTier(nameNorm, queryNorm);
      const popularity = item.popularity || 0;
      const voteCount = item.vote_count || 0;
      return tier * 1000 + popularity * 0.3 + voteCount * 0.005;
    };

    people.sort((a, b) => getPersonScore(b) - getPersonScore(a));
    const topPerson = people[0];

    // Detect if there is a dominant exact direct title match (e.g. searching "Dune", "Inception", "Deadpool")
    const topDirect = directResults[0];
    const hasDominantTitleMatch =
      topDirect &&
      getMatchTier(
        getNormalizedTitle(topDirect.title || topDirect.name || ""),
        queryNorm,
      ) >= 2 &&
      ((topDirect.vote_count || 0) >= 30 || (topDirect.popularity || 0) >= 10);

    // Only treat as an actor/director search if there is NO dominant direct title match,
    // AND the top person is a prominent exact/prefix match (e.g. "Tom Cruise", "Christopher Nolan")
    const isActorOrDirectorSearch =
      !hasDominantTitleMatch &&
      topPerson &&
      getMatchTier(getNormalizedTitle(topPerson.name || ""), queryNorm) >= 2 &&
      (topPerson.popularity || 0) >= 20 &&
      (queryNorm.includes(" ") || (topPerson.popularity || 0) >= 40);

    // Parallel fetch credits for top 3 people matched
    const personCreditsPromises = people.slice(0, 3).map(async (p) => {
      try {
        const data = await fetchFromTMDB(
          `/person/${p.id}/combined_credits`,
          {},
          TTL.DETAILS,
          signal,
        );
        let credits = [];
        if (p.known_for_department === "Acting") {
          credits = data.cast || [];
        } else {
          credits = data.crew || data.cast || [];
        }

        // Deduplicate and filter out obscure trivia/self-interviews
        const uniqueCredits: any[] = [];
        const seenCreditIds = new Set<number | string>();
        for (const c of credits) {
          if (!c || !c.id) continue;
          if (seenCreditIds.has(c.id)) continue;
          const char = (c.character || "").toLowerCase();
          // Filter out low-vote archive footage / special thanks / trivia
          if (
            (char.includes("self") ||
              char.includes("uncredited") ||
              char.includes("special thanks")) &&
            (c.vote_count || 0) < 100
          ) {
            continue;
          }
          seenCreditIds.add(c.id);
          uniqueCredits.push(c);
        }

        return uniqueCredits
          .sort((a: any, b: any) => {
            const scoreA =
              (a.popularity || 0) * 0.5 +
              (a.vote_count || 0) * 0.015 +
              (a.vote_average || 0) * 2;
            const scoreB =
              (b.popularity || 0) * 0.5 +
              (b.vote_count || 0) * 0.015 +
              (b.vote_average || 0) * 2;
            return scoreB - scoreA;
          })
          .slice(0, 25)
          .map((m: any) => ({
            ...m,
            media_type: m.media_type || (m.first_air_date ? "tv" : "movie"),
          }));
      } catch {
        return [];
      }
    });

    // Parallel fetch recommendations for top 2 direct movie/TV results
    const recsPromises = directResults.slice(0, 2).map(async (m) => {
      try {
        const data = await fetchFromTMDB(
          `/${m.media_type}/${m.id}/recommendations`,
          {},
          TTL.DETAILS,
          signal,
        );
        return (data.results || []).slice(0, 8).map((rec: any) => ({
          ...rec,
          media_type: rec.media_type || m.media_type,
        }));
      } catch {
        return [];
      }
    });

    const [creditsLists, recsLists] = await Promise.all([
      Promise.all(personCreditsPromises),
      Promise.all(recsPromises),
    ]);

    // Combine all results with intelligent prioritization
    const finalResults: NebulaMovie[] = [];
    const finalSeenIds = new Set<string | number>();

    if (isActorOrDirectorSearch) {
      // ── Actor/Director Search Branch ─────────────────────────────────────────
      // 1. Star filmography credits first (sorted by popularity + votes + rating)
      const allActorCredits = creditsLists.flat().sort((a, b) => {
        const scoreA =
          (a.popularity || 0) * 0.4 +
          (a.vote_count || 0) * 0.01 +
          (a.vote_average || 0) * 2;
        const scoreB =
          (b.popularity || 0) * 0.4 +
          (b.vote_count || 0) * 0.01 +
          (b.vote_average || 0) * 2;
        return scoreB - scoreA;
      });

      for (const m of allActorCredits) {
        if (!finalSeenIds.has(m.id)) {
          // Exclude low-vote documentaries / biographies
          const isLowVoteDoc =
            (m.genre_ids?.includes(99) ||
              (m.title || "").toLowerCase().includes("biography") ||
              (m.title || "").toLowerCase().includes("documentary")) &&
            (m.vote_count || 0) < 150;
          if (!isLowVoteDoc) {
            finalSeenIds.add(m.id);
            finalResults.push(normalizeMovie(m, m.media_type));
          }
        }
      }

      // 2. Direct results second
      for (const m of directResults) {
        if (!finalSeenIds.has(m.id)) {
          finalSeenIds.add(m.id);
          finalResults.push(normalizeMovie(m, m.media_type));
        }
      }
    } else {
      // ── Standard Movie/Show Search Branch (e.g. "Dune", "Breaking Bad") ──────
      const allCandidates: any[] = [];

      // 1. Direct results
      directResults.forEach((m) => {
        if (!finalSeenIds.has(m.id)) {
          finalSeenIds.add(m.id);
          allCandidates.push(m);
        }
      });

      // 2. Only high-engagement person credits
      creditsLists.forEach((list) => {
        list.forEach((m) => {
          if (!finalSeenIds.has(m.id)) {
            const voteCount = m.vote_count || 0;
            const pop = m.popularity || 0;
            if (voteCount >= 100 || pop >= 15) {
              finalSeenIds.add(m.id);
              allCandidates.push(m);
            }
          }
        });
      });

      // 3. Recommendations
      recsLists.forEach((list) => {
        list.forEach((m) => {
          if (!finalSeenIds.has(m.id)) {
            finalSeenIds.add(m.id);
            allCandidates.push(m);
          }
        });
      });

      // Sort ALL candidates using composite scoring (Exact title match >>> popularity > votes)
      allCandidates.sort((a, b) => getCompositeScore(b) - getCompositeScore(a));

      for (const m of allCandidates.slice(0, 50)) {
        finalResults.push(normalizeMovie(m, m.media_type));
      }
    }

    return finalResults.slice(0, 50);
  } catch (err) {
    console.error("[TMDB] Intelligent search failed:", err);
    return [];
  }
};

// TMDB /recommendations uses collaborative filtering — much more relevant than /similar
export const getRecommendations = async (
  id: number | string,
  type: "movie" | "tv",
  page = "1",
): Promise<NebulaMovie[]> => {
  try {
    const data = await fetchFromTMDB(
      `/${type}/${id}/recommendations`,
      { page },
      TTL.RECOMMENDATIONS,
    );
    const results = (data.results || []).map((m: any) =>
      normalizeMovie(m, type),
    );
    if (results.length >= 5) return results;
    // Fallback: /similar if recommendations are sparse
    const fallback = await fetchFromTMDB(
      `/${type}/${id}/similar`,
      { page },
      TTL.RECOMMENDATIONS,
    );
    return (fallback.results || []).map((m: any) => normalizeMovie(m, type));
  } catch {
    return [];
  }
};

// Keep getSimilarMedia for backward compat — delegates to recommendations now
export const getSimilarMedia = getRecommendations;

export interface TMDBReview {
  id: string;
  author: string;
  author_details?: {
    name?: string;
    username?: string;
    avatar_path?: string | null;
    rating?: number | null;
  };
  content: string;
  created_at: string;
  url?: string;
}

export const getMediaReviews = async (
  id: string | number,
  type: "movie" | "tv" = "movie",
  page = 1,
): Promise<{
  results: TMDBReview[];
  total_pages: number;
  total_results: number;
}> => {
  if (id.toString().startsWith("k")) {
    return { results: [], total_pages: 0, total_results: 0 };
  }
  try {
    const data = await fetchFromTMDB(
      `/${type}/${id}/reviews`,
      { page: page.toString() },
      TTL.DETAILS,
    );
    const results: TMDBReview[] = (data.results || []).map((r: any) => {
      let avatar = r.author_details?.avatar_path;
      if (avatar) {
        if (avatar.startsWith("/https://") || avatar.startsWith("/http://")) {
          avatar = avatar.substring(1);
        } else if (!avatar.startsWith("http")) {
          avatar = `${IMAGE_BASE_URL}${avatar}`;
        }
        avatar = proxyImage(avatar);
      }
      return {
        id: r.id,
        author:
          r.author ||
          r.author_details?.name ||
          r.author_details?.username ||
          "Anonymous",
        author_details: {
          name: r.author_details?.name,
          username: r.author_details?.username,
          avatar_path: avatar,
          rating: r.author_details?.rating ?? null,
        },
        content: r.content || "",
        created_at: r.created_at || new Date().toISOString(),
        url: r.url,
      };
    });
    return {
      results,
      total_pages: data.total_pages || 1,
      total_results: data.total_results || results.length,
    };
  } catch (err) {
    console.error(`[TMDB] Failed to fetch reviews for ${type} ${id}:`, err);
    return { results: [], total_pages: 0, total_results: 0 };
  }
};

export const getMediaBasicInfo = async (
  id: string | number,
  type: "movie" | "tv",
): Promise<NebulaMovie | null> => {
  // KissKH native drama IDs
  if (id.toString().startsWith("k")) {
    try {
      const apiBase = getApiBase();
      const numId = id.toString().replace("k", "");
      const r = await fetch(`${apiBase}/api/drama/detail/${numId}`);
      if (r.ok) {
        const data = await r.json();
        return {
          id: id.toString(),
          title: data.title || "Unknown Drama",
          type: "movie",
          year: 0,
          genre: "Drama",
          image: data.image || "",
          backdrop: "",
          description: "",
          isDrama: true,
        } as any;
      }
    } catch {
      /* ignore */
    }
    return {
      id: id.toString(),
      title: "Loading...",
      type,
      year: 0,
      genre: "Drama",
      image: "",
      backdrop: "",
      description: "",
      isDrama: true,
    } as any;
  }

  try {
    const data = await fetchFromTMDB(`/${type}/${id}`, {}, TTL.DETAILS);
    if (!data || data.status_code === 34) return null;
    const normalized = normalizeMovie(data, type);
    const enriched = await enrichMovies([normalized]);
    return enriched[0] || normalized;
  } catch {
    return null;
  }
};

export const getMediaDetails = async (
  id: number,
  type: "movie" | "tv",
  releaseYear?: number,
): Promise<{ trailers: any[]; similar: any[]; cast: any[] }> => {
  try {
    const ttl =
      releaseYear && CURRENT_YEAR - releaseYear >= 2 ? TTL.LEGACY : TTL.DETAILS;
    const [data, kinoTrailers] = await Promise.all([
      fetchFromTMDB(
        `/${type}/${id}`,
        { append_to_response: "videos,recommendations,credits" },
        ttl,
      ),
      fetchKinoCheckTrailers(id, type),
    ]);

    // TMDB trailers normalised into a compatible shape: { key, name, type, source }
    const tmdbRaw: any[] =
      data.videos?.results.filter(
        (v: any) => v.type === "Trailer" || v.type === "Teaser",
      ) || [];

    // Build the merged list: KinoCheck first (higher quality), then append any
    // TMDB entries whose YouTube ID wasn't already covered by KinoCheck.
    const kinoIds = new Set(kinoTrailers.map((t) => t.youtubeId));
    const tmdbExtra = tmdbRaw
      .filter((v: any) => !kinoIds.has(v.key))
      .map((v: any) => ({
        youtubeId: v.key as string,
        title: v.name as string,
        thumbnail: `https://img.youtube.com/vi/${v.key}/maxresdefault.jpg`,
        category: v.type as string,
        views: 0,
        published: "",
      }));

    const mergedTrailers =
      kinoTrailers.length > 0
        ? [...kinoTrailers, ...tmdbExtra]
        : // KinoCheck had nothing → use TMDB shape so the UI always receives the
          // same interface
          tmdbRaw.map((v: any) => ({
            youtubeId: v.key as string,
            title: v.name as string,
            thumbnail: `https://img.youtube.com/vi/${v.key}/maxresdefault.jpg`,
            category: v.type as string,
            views: 0,
            published: "",
          }));

    // Sort trailers to bubble the primary "Official Trailer" to index 0
    const scoreTrailer = (t: any): number => {
      const title = (t.title || "").toLowerCase();
      const category = (t.category || "").toLowerCase();

      let score = 0;

      // Prioritize actual Trailers over Teasers, Promos, and Clips
      if (category === "trailer") {
        score += 100;
      } else if (category === "teaser") {
        score += 50;
      }

      // Strong priority for "Official Trailer" title keywords
      if (title.includes("official trailer")) {
        score += 1000;
      } else if (title.includes("official teaser")) {
        score += 400;
      } else if (title.includes("trailer")) {
        score += 200;
      } else if (title.includes("teaser")) {
        score += 100;
      }

      // Penalize promo clips, previews, and featurettes
      if (
        title.includes("promo") ||
        title.includes("preview") ||
        title.includes("clip") ||
        title.includes("featurette")
      ) {
        score -= 300;
      }

      return score;
    };

    mergedTrailers.sort((a, b) => scoreTrailer(b) - scoreTrailer(a));

    return {
      trailers: mergedTrailers,
      similar: (data.recommendations?.results || [])
        .filter((m: any) => m.id.toString() !== id.toString())
        .map((m: any) => normalizeMovie(m, type)),
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

export const enrichMovies = async (
  normalized: NebulaMovie[],
  signal?: AbortSignal,
): Promise<NebulaMovie[]> => {
  if (!normalized.length) return normalized;

  const targetMovies = normalized.filter(
    (m) =>
      !(m as any).isDrama &&
      (m as any).origin !== "kisskh" &&
      (m as any).origin !== "dramacool",
  );
  if (!targetMovies.length) return normalized;

  // 1. Try to check local cache for logos
  normalized.forEach((m) => {
    const key = `v2.0-meta-${m.id}:${m.type}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const { logoUrl, backgroundUrl, ts } = JSON.parse(cached);
        if (logoUrl && Date.now() - ts < TTL.META) {
          m.clearLogo = proxyImage(logoUrl);
          const isBadBg = backgroundUrl && /thumb|banner/i.test(backgroundUrl);
          m.fanartBackground = isBadBg ? undefined : proxyImage(backgroundUrl);
        }
      } catch {
        /* stale */
      }
    }
  });

  try {
    const comboIds = targetMovies
      .map((m) => `${m.id}:${m.type || "movie"}`)
      .sort()
      .join(",");
    const simpleIds = targetMovies.map((m) => m.id).join(",");
    const apiBase = getApiBase();

    // Parallel fetch for Logos and Availability
    const metaArgs: [string, RequestInit?] = [
      `${apiBase}/api/metadata?batch=${comboIds}`,
    ];
    if (signal) metaArgs.push({ signal });

    const availArgs: [string, RequestInit?] = [
      `${apiBase}/api/stream/availability?ids=${simpleIds}`,
    ];
    if (signal) availArgs.push({ signal });

    const [metaRes, availRes] = await Promise.all([
      fetch(...metaArgs)
        .then((r) => r.json())
        .catch(() => ({ results: [] })),
      fetch(...availArgs)
        .then((r) => r.json())
        .catch(() => ({ results: [] })),
    ]);

    // Apply Verification & Dead Status
    if (availRes?.results) {
      const availMap = new Map<string, any>(
        availRes.results.map((r: any) => [r.id.toString(), r]),
      );
      normalized.forEach((m) => {
        const info = availMap.get(m.id.toString());
        if (info) {
          m.isVerified = info.isVerified || false;
          m.isDead = info.isDead || false;
        }
      });
    }

    // Apply Logo Data
    if (metaRes?.results) {
      metaRes.results.forEach((meta: any) => {
        const index = normalized.findIndex(
          (m) => m.id.toString() === meta.id.toString(),
        );
        if (index !== -1) {
          normalized[index].clearLogo = proxyImage(meta.logoUrl);
          const isBadBg =
            meta.backgroundUrl && /thumb|banner/i.test(meta.backgroundUrl);
          normalized[index].fanartBackground = isBadBg
            ? undefined
            : proxyImage(meta.backgroundUrl);
          if (meta.logoUrl) {
            try {
              localStorage.setItem(
                `v2.0-meta-${meta.id}:${normalized[index].type}`,
                JSON.stringify({
                  logoUrl: meta.logoUrl,
                  backgroundUrl: meta.backgroundUrl,
                  ts: Date.now(),
                }),
              );
            } catch {
              /* quota: skip */
            }
          }
        }
      });
    }
  } catch {
    /* degrade gracefully */
  }
  return normalized;
};

// Backward compat
export const enrichMoviesWithMetadata = enrichMovies;

export const getTVDetails = async (id: string | number) => {
  try {
    const data = await fetchFromTMDB(`/tv/${id}`, {}, TTL.DETAILS);
    if (!data) return null;
    return {
      number_of_seasons: data.number_of_seasons,
      seasons: data.seasons,
      in_production: data.in_production,
      status: data.status,
      last_episode_to_air: data.last_episode_to_air,
      next_episode_to_air: data.next_episode_to_air,
    };
  } catch {
    return null;
  }
};

export const getTVSeasonEpisodes = async (
  tvId: string | number,
  seasonNumber: number,
) => {
  try {
    const data = await fetchFromTMDB(
      `/tv/${tvId}/season/${seasonNumber}`,
      {},
      TTL.DETAILS,
    );
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
        still_path: ep.still_path
          ? proxyImage(`${IMAGE_BASE_URL}${ep.still_path}`)
          : null,
        air_date: ep.air_date,
        vote_average: ep.vote_average,
      }));
  } catch {
    return [];
  }
};

// ─── Actor/Person helpers ─────────────────────────────────────────────────────
export const getPersonMovies = async (
  personId: string,
  type: "movie" | "tv" = "movie",
): Promise<NebulaMovie[]> => {
  try {
    const endpoint =
      type === "movie"
        ? `/person/${personId}/movie_credits`
        : `/person/${personId}/tv_credits`;
    const data = await fetchFromTMDB(endpoint, {}, TTL.DETAILS);
    const raw = type === "movie" ? data.cast || [] : data.cast || [];
    return raw
      .filter((m: any) => m.poster_path && (m.vote_count ?? 0) > 50)
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 30)
      .map((m: any) => normalizeMovie(m, type));
  } catch {
    return [];
  }
};

export interface NebulaPersonSummary {
  id: string | number;
  name: string;
  avatar: string | null;
  department: string;
  popularity?: number;
  known_for?: {
    id: number;
    title: string;
    poster: string | null;
    type: string;
  }[];
}

export const TOP_CREATORS_POOL = [
  // Acclaimed Directors
  { id: "525", name: "Christopher Nolan", department: "Directing" },
  { id: "137427", name: "Denis Villeneuve", department: "Directing" },
  { id: "138", name: "Quentin Tarantino", department: "Directing" },
  { id: "1032", name: "Martin Scorsese", department: "Directing" },
  { id: "7467", name: "David Fincher", department: "Directing" },
  { id: "488", name: "Steven Spielberg", department: "Directing" },
  { id: "2710", name: "James Cameron", department: "Directing" },
  { id: "10828", name: "Guillermo del Toro", department: "Directing" },
  { id: "61502", name: "Greta Gerwig", department: "Directing" },
  { id: "608", name: "Hayao Miyazaki", department: "Directing" },
  { id: "21684", name: "Bong Joon-ho", department: "Directing" },
  { id: "578", name: "Ridley Scott", department: "Directing" },
  { id: "5655", name: "Wes Anderson", department: "Directing" },
  { id: "1226274", name: "Jordan Peele", department: "Directing" },
  { id: "7623", name: "Sam Raimi", department: "Directing" },
  { id: "11218", name: "Alfonso Cuarón", department: "Directing" },
  { id: "116805", name: "Makoto Shinkai", department: "Directing" },
  { id: "956", name: "Guy Ritchie", department: "Directing" },
  { id: "15217", name: "Zack Snyder", department: "Directing" },
  { id: "55934", name: "Taika Waititi", department: "Directing" },
  { id: "928543", name: "Chad Stahelski", department: "Directing" },
  { id: "20629", name: "George Miller", department: "Directing" },
  { id: "108", name: "Peter Jackson", department: "Directing" },
  { id: "4762", name: "Paul Thomas Anderson", department: "Directing" },
];

export const LEGENDARY_DIRECTORS = TOP_CREATORS_POOL.filter(
  (c) => c.department === "Directing",
);

export const getPopularPeople = async (
  department: "all" | "Acting" | "Directing" = "all",
  page: number = 1,
): Promise<NebulaPersonSummary[]> => {
  try {
    const BATCH_SIZE = 24;

    if (department === "Directing") {
      // For directors, fetch popular director profiles from TMDB & cache with combined credits
      const startIndex = (page - 1) * BATCH_SIZE;
      const directorsSlice = LEGENDARY_DIRECTORS.slice(
        startIndex,
        startIndex + BATCH_SIZE,
      );

      const directorPromises = directorsSlice.map(async (d) => {
        try {
          const data = await fetchFromTMDB(
            `/person/${d.id}`,
            { append_to_response: "combined_credits" },
            TTL.DETAILS,
          );
          if (!data) return null;

          const directingCredits = (data.combined_credits?.crew || [])
            .filter(
              (c: any) =>
                c.job === "Director" ||
                (c.department === "Directing" && c.poster_path),
            )
            .sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0))
            .slice(0, 3)
            .map((k: any) => ({
              id: k.id,
              title: k.title || k.name || "",
              poster: k.poster_path
                ? proxyImage(`${IMAGE_BASE_URL}${k.poster_path}`)
                : null,
              type: k.media_type || "movie",
            }));

          return {
            id: data.id,
            name: data.name,
            avatar: data.profile_path
              ? proxyImage(`${IMAGE_BASE_URL}${data.profile_path}`)
              : null,
            department: "Directing",
            popularity: data.popularity || 50,
            known_for: directingCredits,
          };
        } catch {
          return {
            id: d.id,
            name: d.name,
            avatar: null,
            department: "Directing",
            popularity: 50,
          };
        }
      });

      const resolved = (await Promise.all(directorPromises)).filter(
        Boolean,
      ) as NebulaPersonSummary[];
      return resolved;
    }

    // Fetch from TMDB popular people (multiple pages if needed to reach BATCH_SIZE high-quality entries)
    const tmdbPage1 = (page - 1) * 2 + 1;
    const tmdbPage2 = tmdbPage1 + 1;

    const [data1, data2] = await Promise.all([
      fetchFromTMDB(
        "/person/popular",
        { page: tmdbPage1.toString() },
        TTL.POPULAR,
      ),
      fetchFromTMDB(
        "/person/popular",
        { page: tmdbPage2.toString() },
        TTL.POPULAR,
      ),
    ]);

    let rawList = [...(data1.results || []), ...(data2.results || [])];

    // Filter by department if Acting
    if (department === "Acting") {
      rawList = rawList.filter(
        (p: any) => (p.known_for_department || "Acting") === "Acting",
      );
    }

    // High quality filter: Must have profile path and known works
    const filtered = rawList.filter(
      (p: any) =>
        p.profile_path &&
        p.popularity > 8 &&
        p.known_for &&
        p.known_for.length > 0 &&
        p.known_for.some((k: any) => (k.vote_count || 0) > 20),
    );

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const unique = filtered.filter((p: any) => {
      const idStr = p.id.toString();
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });

    // In 'all' tab, if on page 1, blend in top directors for great variety
    let combinedResults = unique;
    if (department === "all" && page === 1) {
      const topDirectors = await Promise.all(
        LEGENDARY_DIRECTORS.slice(0, 6).map(async (d) => {
          try {
            const data = await fetchFromTMDB(
              `/person/${d.id}`,
              { append_to_response: "combined_credits" },
              TTL.DETAILS,
            );
            if (!data || !data.profile_path) return null;
            return {
              id: data.id,
              name: data.name,
              profile_path: data.profile_path,
              known_for_department: "Directing",
              popularity: (data.popularity || 40) + 50,
              known_for: (data.combined_credits?.crew || [])
                .filter((c: any) => c.job === "Director")
                .slice(0, 3),
            };
          } catch {
            return null;
          }
        }),
      );
      const validDirectors = topDirectors.filter(Boolean);
      combinedResults = [...validDirectors, ...unique];
    }

    // Sort by popularity descending
    combinedResults.sort(
      (a: any, b: any) => (b.popularity || 0) - (a.popularity || 0),
    );

    return combinedResults.slice(0, BATCH_SIZE).map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: p.profile_path
        ? proxyImage(`${IMAGE_BASE_URL}${p.profile_path}`)
        : null,
      department: p.known_for_department || p.department || "Acting",
      popularity: p.popularity,
      known_for: (p.known_for || []).map((k: any) => ({
        id: k.id,
        title: k.title || k.name || "",
        poster: k.poster_path
          ? proxyImage(`${IMAGE_BASE_URL}${k.poster_path}`)
          : null,
        type: k.media_type || "movie",
      })),
    }));
  } catch (err) {
    console.error("[TMDB] Error fetching popular people:", err);
    return [];
  }
};

export const getPopularActors = async (): Promise<NebulaPersonSummary[]> => {
  return getPopularPeople("Acting", 1);
};

export const getPopularDirectors = async (
  page = 1,
): Promise<NebulaPersonSummary[]> => {
  return getPopularPeople("Directing", page);
};

export const invalidateRecommendationCache = (
  id: string | number,
  type: "movie" | "tv",
) => {
  const versionedPrefix = `${CACHE_VERSION}-tmdb-proxy-/${type}/${id}/`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(versionedPrefix)) {
        localStorage.removeItem(key);
        i--;
      }
    }
  } catch (e) {
    console.error("Error clearing recommendation cache", e);
  }
};

export interface NebulaPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  combined_credits: NebulaMovie[];
}

export const getPersonDetails = async (
  personId: string | number,
): Promise<NebulaPersonDetails | null> => {
  try {
    const data = await fetchFromTMDB(
      `/person/${personId}`,
      { append_to_response: "combined_credits" },
      TTL.DETAILS,
    );

    if (!data || !data.id) return null;

    // Merge cast + crew credits and deduplicate by id (keeps higher-popularity entry)
    const castCredits = data.combined_credits?.cast || [];
    const crewCredits = data.combined_credits?.crew || [];
    const allCredits = [...castCredits, ...crewCredits];
    const deduped = new Map<number, any>();
    for (const c of allCredits) {
      if (!c || !c.id) continue;
      const existing = deduped.get(c.id);
      if (!existing || (c.popularity || 0) > (existing.popularity || 0)) {
        deduped.set(c.id, c);
      }
    }

    // Genre IDs for talk shows and news — these are guest appearances, not real roles
    const GUEST_GENRE_IDS = new Set([10767, 10763, 10764]); // Talk, News, Reality

    const isActingDept = (data.known_for_department || "Acting") === "Acting";

    const normalizedCredits = Array.from(deduped.values())
      .filter((m: any) => {
        if (!m.poster_path || (m.vote_count ?? 0) <= 10) return false;
        // Filter out talk shows, news, and reality TV
        const genres: number[] = m.genre_ids || [];
        if (genres.some((g: number) => GUEST_GENRE_IDS.has(g))) return false;
        // For TV entries: filter out guest appearances (≤2 episodes)
        if (
          m.media_type === "tv" &&
          (m.episode_count ?? 0) > 0 &&
          m.episode_count <= 2
        )
          return false;
        return true;
      })
      .sort((a: any, b: any) => {
        // For actors, boost movie credits so their actual filmography ranks first
        const popA =
          (a.popularity || 0) *
          (isActingDept && a.media_type === "movie" ? 2 : 1);
        const popB =
          (b.popularity || 0) *
          (isActingDept && a.media_type === "movie" ? 2 : 1);
        return popB - popA;
      })
      .slice(0, 40)
      .map((m: any) => normalizeMovie(m, m.media_type || "movie"));

    return {
      id: data.id,
      name: data.name,
      biography: data.biography || "",
      birthday: data.birthday || null,
      place_of_birth: data.place_of_birth || null,
      profile_path: data.profile_path
        ? proxyImage(`${IMAGE_BASE_URL}${data.profile_path}`)
        : null,
      known_for_department: data.known_for_department || "Acting",
      combined_credits: normalizedCredits,
    };
  } catch (err) {
    console.error(
      `[TMDB] Failed to fetch person details for ${personId}:`,
      err,
    );
    return null;
  }
};

export const searchPeople = async (
  query: string,
  signal?: AbortSignal,
): Promise<any[]> => {
  try {
    const trimmedQuery = query ? query.trim() : "";
    if (!trimmedQuery) return [];

    const data = await fetchFromTMDB(
      "/search/person",
      { query: trimmedQuery },
      TTL.SEARCH,
      signal,
    );

    const raw = (data.results || []).filter((p: any) => p.profile_path);
    const lowerQuery = trimmedQuery.toLowerCase();

    // Score and rank search results for maximum relevance
    const scored = raw.map((p: any) => {
      const lowerName = (p.name || "").toLowerCase();
      let score = Number(p.popularity) || 0;

      // Exact match bonus
      if (lowerName === lowerQuery) {
        score += 5000;
      } else if (lowerName.startsWith(lowerQuery)) {
        score += 2000;
      } else if (lowerName.includes(lowerQuery)) {
        score += 500;
      }

      // Has legitimate known works
      const hasKnownWorks =
        p.known_for &&
        p.known_for.some(
          (k: any) => (k.vote_count || 0) > 10 || Boolean(k.poster_path),
        );
      if (hasKnownWorks) {
        score += 500;
      }

      return { ...p, _relevanceScore: score };
    });

    // Sort by relevance score descending
    scored.sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);

    // If top result is an exact match with high popularity, filter out trivial low-popularity namesake duplicates
    let finalResults = scored;
    if (scored.length > 1 && scored[0].popularity > 15) {
      const topPop = scored[0].popularity;
      finalResults = scored.filter(
        (p: any) =>
          p.id === scored[0].id ||
          p.popularity > 2 ||
          (p.popularity > topPop * 0.05 &&
            p.known_for &&
            p.known_for.length > 0),
      );
    }

    return finalResults.slice(0, 24).map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: proxyImage(`${IMAGE_BASE_URL}${p.profile_path}`),
      role: p.known_for_department || "Acting",
      department: p.known_for_department || "Acting",
      popularity: p.popularity,
      known_for: (p.known_for || []).map((k: any) => ({
        id: k.id,
        title: k.title || k.name || "",
        poster: k.poster_path
          ? proxyImage(`${IMAGE_BASE_URL}${k.poster_path}`)
          : null,
        type: k.media_type || "movie",
      })),
    }));
  } catch (err) {
    console.error(`[TMDB] Failed to search people for "${query}":`, err);
    return [];
  }
};
