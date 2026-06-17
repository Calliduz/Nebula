const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY || "PLACEHOLDER";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

const CACHE_VERSION = "v2.0"; // Bump to invalidate all old caches

// ─── TTL Constants ────────────────────────────────────────────────────────────
const TTL = {
  TRENDING: 1000 * 60 * 60 * 4, // 4 hours — changes frequently
  POPULAR: 1000 * 60 * 60 * 24, // 24 hours
  GENRE: 1000 * 60 * 60 * 24, // 24 hours
  DETAILS: 1000 * 60 * 60 * 24 * 7, // 7 days
  LEGACY: 1000 * 60 * 60 * 24 * 365 * 30, // ~30 years for pre-2000 films
  META: 1000 * 60 * 60 * 24 * 7, // 7 days for logos/backdrops
  SEARCH: 1000 * 60 * 15, // 15 minutes — search queries change, 7 days is too stale
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
  image: string;
  backdrop: string;
  genre: string;
  year: number;
  release_date?: string; // NEW: full date string for filtering
  vote_count?: number; // NEW: for Hidden Gems filter
  duration?: string;
  imdb?: number;
  type: "movie" | "tv";
  clearLogo?: string | null;
  fanartBackground?: string | null;
  quality?: string;
  isVerified?: boolean;
  isDead?: boolean;
}

import { API_BASE_URL } from "../config";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getApiBase = (): string => API_BASE_URL;

const proxyImage = (url: string): string => {
  if (!url) return "";
  return `${getApiBase()}/api/image?url=${encodeURIComponent(url)}`;
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
): NebulaMovie => ({
  id: item.id || Math.floor(Math.random() * 1_000_000),
  title: item.title || item.name || "Unknown Title",
  description: item.overview || "No overview available.",
  image: item.poster_path
    ? proxyImage(`${IMAGE_BASE_URL}${item.poster_path}`)
    : proxyImage("https://picsum.photos/seed/nebula/400/600"),
  backdrop: item.backdrop_path
    ? proxyImage(`${BACKDROP_BASE_URL}${item.backdrop_path}`)
    : "",
  genre: item.genre_ids
    ? item.genre_ids.map((id: number) => GENRE_MAP[id] || "Unknown").join(", ")
    : item.genres
      ? item.genres.map((g: any) => g.name).join(", ")
      : "Unknown Genre",
  year: parseInt(
    (item.release_date || item.first_air_date || "2024").substring(0, 4),
    10,
  ),
  release_date: item.release_date || item.first_air_date || undefined,
  vote_count: item.vote_count ?? undefined,
  imdb: item.vote_average
    ? parseFloat(item.vote_average.toFixed(1))
    : undefined,
  type: item.media_type || type,
  duration: item.runtime ? `${item.runtime}m` : undefined,
  quality: (() => {
    if (!item.release_date && !item.first_air_date) return "HD";
    const releaseDate = new Date(item.release_date || item.first_air_date);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) return "TBA"; // Not released yet
    if (type === "tv") return "HD"; // TV shows usually HD immediately
    if (diffDays < 14) return "CAM"; // Very new movies
    if (diffDays < 45) return "HD (Early)"; // Likely early digital or high-quality CAM
    return "HD";
  })(),
});

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
  if (titleNorm === queryNorm) return 3; // Exact match

  // Collapse spaces for compound word matching (e.g., "viral hit" vs "viralhit")
  const titleCollapsed = titleNorm.replace(/\s+/g, "");
  const queryCollapsed = queryNorm.replace(/\s+/g, "");

  if (titleCollapsed === queryCollapsed) return 3; // Exact match collapsed
  if (titleCollapsed.startsWith(queryCollapsed)) return 2; // Starts with collapsed
  if (titleCollapsed.includes(queryCollapsed)) return 1; // Contains collapsed
  return 0; // No match
};

export const searchMedia = async (
  query: string,
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
        { query: q, page: "1" },
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
        { query: trimmedQuery, page: "2" },
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

    const getScore = (item: any) => {
      const title = item.title || item.name || "";
      const titleNorm = getNormalizedTitle(title);
      const tier = getMatchTier(titleNorm, queryNorm);
      const popularity = item.popularity || 0;
      return { tier, popularity };
    };

    directResults.sort((a, b) => {
      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreA.tier !== scoreB.tier) {
        return scoreB.tier - scoreA.tier;
      }
      return scoreB.popularity - scoreA.popularity;
    });

    const getPersonScore = (item: any) => {
      const name = item.name || "";
      const nameNorm = getNormalizedTitle(name);
      const tier = getMatchTier(nameNorm, queryNorm);
      const popularity = item.popularity || 0;
      return { tier, popularity };
    };

    people.sort((a, b) => {
      const scoreA = getPersonScore(a);
      const scoreB = getPersonScore(b);
      if (scoreA.tier !== scoreB.tier) {
        return scoreB.tier - scoreA.tier;
      }
      return scoreB.popularity - scoreA.popularity;
    });

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

        // Deduplicate movies within this person's credits to prevent duplicate crew entries
        const uniqueCredits: any[] = [];
        const seenCreditIds = new Set<number | string>();
        for (const c of credits) {
          if (!c || !c.id) continue;
          if (seenCreditIds.has(c.id)) continue;
          seenCreditIds.add(c.id);
          uniqueCredits.push(c);
        }

        return uniqueCredits
          .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10)
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

    // Combine all results
    const finalResults: NebulaMovie[] = [];

    // 1. Direct results first
    directResults.forEach((m) => {
      finalResults.push(normalizeMovie(m, m.media_type));
    });

    // 2. Credits from people searches next
    creditsLists.forEach((list) => {
      list.forEach((m) => {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          finalResults.push(normalizeMovie(m, m.media_type));
        }
      });
    });

    // 3. Recommendations next
    recsLists.forEach((list) => {
      list.forEach((m) => {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          finalResults.push(normalizeMovie(m, m.media_type));
        }
      });
    });

    return finalResults.slice(0, 50); // limit to top 50
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
      TTL.DETAILS,
    );
    const results = (data.results || []).map((m: any) =>
      normalizeMovie(m, type),
    );
    if (results.length >= 5) return results;
    // Fallback: /similar if recommendations are sparse
    const fallback = await fetchFromTMDB(
      `/${type}/${id}/similar`,
      { page },
      TTL.DETAILS,
    );
    return (fallback.results || []).map((m: any) => normalizeMovie(m, type));
  } catch {
    return [];
  }
};

// Keep getSimilarMedia for backward compat — delegates to recommendations now
export const getSimilarMedia = getRecommendations;

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
    const movie = normalizeMovie(data, type);

    // Enrich with single availability check
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/stream/availability?ids=${id}`);
      if (res.ok) {
        const { results } = await res.json();
        if (results && results.length > 0) {
          movie.isVerified = results[0].isVerified;
          movie.isDead = results[0].isDead;
        }
      }
    } catch {
      /* ignore */
    }

    return movie;
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
    const data = await fetchFromTMDB(
      `/${type}/${id}`,
      { append_to_response: "videos,recommendations,credits" },
      ttl,
    );
    return {
      trailers:
        data.videos?.results.filter(
          (v: any) => v.type === "Trailer" || v.type === "Teaser",
        ) || [],
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
          m.clearLogo = logoUrl;
          m.fanartBackground = backgroundUrl;
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
          normalized[index].clearLogo = meta.logoUrl;
          normalized[index].fanartBackground = meta.backgroundUrl;
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

export const getPopularActors = async (): Promise<
  { id: string; name: string }[]
> => {
  try {
    const data = await fetchFromTMDB("/person/popular", {}, TTL.POPULAR);
    return (data.results || []).slice(0, 20).map((p: any) => ({
      id: p.id.toString(),
      name: p.name,
    }));
  } catch {
    return [];
  }
};
