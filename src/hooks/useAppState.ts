import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

import { API_BASE_URL } from "../config";
import { useLocalStorage } from "./useLocalStorage";
import {
  getTrending,
  searchMedia,
  searchPeople,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  enrichMoviesWithMetadata,
  NebulaMovie,
  discoverMedia,
  getRecommendations,
  getMediaBasicInfo,
  getMediaDetails,
  getPersonMovies,
  getPopularActors,
  GENRE_MAP,
  invalidateRecommendationCache,
} from "../services/tmdb";

import { useLocation, useNavigate, useParams } from "react-router-dom";

// Expanded actor pool — rotates day-by-day, personalised when history exists
const SPOTLIGHT_POOL = [
  { name: "Leonardo DiCaprio", id: "6193" },
  { name: "Tom Cruise", id: "500" },
  { name: "Scarlett Johansson", id: "1245" },
  { name: "Cillian Murphy", id: "2037" },
  { name: "Robert Downey Jr.", id: "3223" },
  { name: "Florence Pugh", id: "1373733" },
  { name: "Zendaya", id: "505710" },
  { name: "Keanu Reeves", id: "6384" },
  { name: "Margot Robbie", id: "234352" },
  { name: "Timothée Chalamet", id: "1190668" },
  { name: "Denzel Washington", id: "5292" },
  { name: "Ana de Armas", id: "1373737" },
  { name: "Ryan Gosling", id: "30614" },
  { name: "Saoirse Ronan", id: "1023483" },
  { name: "Pedro Pascal", id: "1253360" },
  { name: "Viola Davis", id: "19492" },
  { name: "Paul Mescal", id: "3131315" },
  { name: "Anya Taylor-Joy", id: "1241974" },
];

// ─── ROW_FETCH_CONFIG ─────────────────────────────────────────────────────────
// Single source of truth. Each entry drives: initial fetch, See-All pagination,
// and getCategoryMovies filter — so all three always stay perfectly in sync.
export interface RowConfig {
  mediaType: "movie" | "tv" | "all";
  discoverParams: Record<string, string>; // TMDB discover params
  filterFn: (m: NebulaMovie) => boolean; // client-side filter for getCategoryMovies
  type?: "recommendations" | "similar" | "discover"; // Pagination fetch type
  targetId?: string | number; // For recommendations
}

export const ROW_FETCH_CONFIG: Record<string, RowConfig> = {
  "Trending Now": {
    mediaType: "all",
    discoverParams: {},
    filterFn: () => true,
  },
  "Bingeworthy TV Shows": {
    mediaType: "tv",
    discoverParams: { sort_by: "popularity.desc" },
    filterFn: (m) => m.type === "tv",
  },
  "Critically Acclaimed": {
    mediaType: "movie",
    discoverParams: {
      "vote_average.gte": "7.5",
      "vote_count.gte": "300",
      sort_by: "vote_average.desc",
    },
    filterFn: (m) => (m.imdb ?? 0) >= 7.5,
  },
  "New Releases": {
    mediaType: "movie",
    discoverParams: {
      primary_release_year: new Date().getFullYear().toString(),
      sort_by: "popularity.desc",
    },
    filterFn: (m) =>
      (m.release_date ?? "").startsWith(new Date().getFullYear().toString()),
  },
  "Cinematic Masterpieces": {
    mediaType: "movie",
    discoverParams: { sort_by: "vote_average.desc", "vote_count.gte": "500" },
    filterFn: (m) => (m.imdb ?? 0) >= 7.5 && m.type === "movie",
  },
  "Award-Winning Hits": {
    mediaType: "movie",
    discoverParams: {
      "vote_average.gte": "7.5",
      "vote_count.gte": "200",
      sort_by: "vote_average.desc",
    },
    filterFn: (m) => (m.imdb ?? 0) >= 7.5,
  },
  "Action Packed Missions": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "28",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Action"),
  },
  "Hidden Gems": {
    mediaType: "movie",
    discoverParams: {
      "vote_average.gte": "7.5",
      "vote_count.lte": "1000",
      "vote_count.gte": "100",
      sort_by: "vote_average.desc",
    },
    filterFn: (m) => (m.vote_count ?? 9999) < 1000 && (m.imdb ?? 0) >= 7,
  },
  "Comedy Gold": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "35",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Comedy"),
  },
  "Scary Nights (Horror)": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "27",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Horror"),
  },
  "Mystery & Suspense": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "9648",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) =>
      m.genre.includes("Mystery") || m.genre.includes("Thriller"),
  },
  "Popular Movies": {
    mediaType: "movie",
    discoverParams: {
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.type === "movie",
  },
  "Animation Favorites": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "16",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Animation"),
  },
  "Sci-Fi Spectacles": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "878",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "vote_count.desc",
    },
    filterFn: (m) => m.genre.includes("Sci-Fi"),
  },
  "Documentary Collection": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "99",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Documentary"),
  },
  "Top Rated Movies": {
    mediaType: "movie",
    discoverParams: { sort_by: "vote_average.desc", "vote_count.gte": "1000" },
    filterFn: (m) => m.type === "movie" && (m.imdb ?? 0) >= 7.0,
  },
  "Epic Fantasy Worlds": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "14",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Fantasy"),
  },
  "Feel-Good Romance": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "10749",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Romance"),
  },
  "Crime & Investigation": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "80",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Crime"),
  },
  "Historical Epics": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "36",
      "primary_release_date.gte": "1990-01-01",
      sort_by: "vote_count.desc",
    },
    filterFn: (m) => m.genre.includes("History"),
  },
  "Family Movie Night": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "10751",
      "primary_release_date.gte": "2010-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Family"),
  },
  Movies: {
    mediaType: "movie",
    discoverParams: { sort_by: "popularity.desc" },
    filterFn: (m) => m.type === "movie",
  },
  "TV Shows": {
    mediaType: "tv",
    discoverParams: { sort_by: "popularity.desc" },
    filterFn: (m) => m.type === "tv",
  },
  "War \u0026 Military": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "10752",
      "primary_release_date.gte": "1990-01-01",
      sort_by: "vote_count.desc",
    },
    filterFn: (m) => m.genre.includes("War"),
  },
  "Heart-Pounding Thrillers": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "53",
      "primary_release_date.gte": "2000-01-01",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Thriller"),
  },
  "Musical \u0026 Music": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "10402",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => m.genre.includes("Music"),
  },
  "Western Frontier": {
    mediaType: "movie",
    discoverParams: {
      with_genres: "37",
      sort_by: "vote_count.desc",
    },
    filterFn: (m) => m.genre.includes("Western"),
  },
  "TV Dramas": {
    mediaType: "tv",
    discoverParams: { with_genres: "18", sort_by: "popularity.desc" },
    filterFn: (m) => m.type === "tv" && m.genre.includes("Drama"),
  },
  "Anime Series": {
    mediaType: "tv",
    discoverParams: { with_genres: "16", sort_by: "popularity.desc" },
    filterFn: (m) => m.type === "tv" && m.genre.includes("Animation"),
  },
  "2010s Hits": {
    mediaType: "movie",
    discoverParams: {
      "primary_release_date.gte": "2010-01-01",
      "primary_release_date.lte": "2019-12-31",
      "vote_count.gte": "500",
      sort_by: "popularity.desc",
    },
    filterFn: (m) => {
      const y = m.year || 0;
      return y >= 2010 && y <= 2019 && m.type === "movie";
    },
  },
  "90s Classics": {
    mediaType: "movie",
    discoverParams: {
      "primary_release_date.gte": "1990-01-01",
      "primary_release_date.lte": "1999-12-31",
      "vote_count.gte": "300",
      sort_by: "vote_count.desc",
    },
    filterFn: (m) => {
      const y = m.year || 0;
      return y >= 1990 && y <= 1999 && m.type === "movie";
    },
  },
  "Top in Philippines": {
    mediaType: "all",
    discoverParams: {
      region: "PH",
      watch_region: "PH",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
  },
  Netflix: {
    mediaType: "all",
    discoverParams: {
      with_watch_providers: "8",
      watch_region: "US",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
  },
  "Prime Video": {
    mediaType: "all",
    discoverParams: {
      with_watch_providers: "9",
      watch_region: "US",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
  },
  "Disney+": {
    mediaType: "all",
    discoverParams: {
      with_watch_providers: "337",
      watch_region: "US",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
  },
  "Apple TV+": {
    mediaType: "all",
    discoverParams: {
      with_watch_providers: "350",
      watch_region: "US",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
  },
  Hulu: {
    mediaType: "all",
    discoverParams: {
      with_watch_providers: "15",
      watch_region: "US",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
  },
  Max: {
    mediaType: "all",
    discoverParams: {
      with_watch_providers: "1899|1825",
      watch_region: "US",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
  },
  "Paramount+": {
    mediaType: "all",
    discoverParams: {
      with_watch_providers: "2303|2616|582",
      watch_region: "US",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
  },
  Peacock: {
    mediaType: "all",
    discoverParams: {
      with_watch_providers: "386|387|2553",
      watch_region: "US",
      sort_by: "popularity.desc",
    },
    filterFn: () => true,
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

// ─── Scroll Restoration Helper ──────────────────────────────────────────────
const SCROLL_KEY_PREFIX = "nebula-scroll-";

const getScrollKey = (path: string, category: string | null) => {
  return `${SCROLL_KEY_PREFIX}${path}${category ? `-${category}` : ""}`;
};

function saveScrollPosition(path: string, category: string | null = null) {
  try {
    const mainEl = document.querySelector("main");
    const scrollY = Math.max(window.scrollY, mainEl?.scrollTop || 0);
    const key = getScrollKey(path, category);
    sessionStorage.setItem(key, scrollY.toString());
  } catch {
    /* quota */
  }
}

function restoreScrollPosition(
  path: string,
  category: string | null = null,
): boolean {
  const key = getScrollKey(path, category);
  const saved = sessionStorage.getItem(key);
  if (saved !== null) {
    const y = parseInt(saved, 10);
    if (!isNaN(y) && y > 0) {
      (window as any).__isRestoringScroll = true;
      let attempts = 0;
      const attemptScroll = () => {
        const mainEl = document.querySelector("main");
        const docHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight,
          mainEl?.scrollHeight || 0,
        );
        // If the document/container height is not yet large enough to scroll to y, retry.
        const viewportHeight = window.innerHeight || mainEl?.clientHeight || 0;
        if (docHeight < y + viewportHeight && attempts < 25) {
          attempts++;
          setTimeout(attemptScroll, 50);
        } else {
          window.scrollTo(0, y);
          if (mainEl) {
            mainEl.scrollTop = y;
          }
          // Wait a bit before clearing flag to let other effects run
          setTimeout(() => {
            (window as any).__isRestoringScroll = false;
          }, 150);
        }
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          attemptScroll();
        });
      });
      return true;
    }
  }

  // Reset scroll to top on new pages
  const mainEl = document.querySelector("main");
  if (mainEl) {
    mainEl.scrollTop = 0;
  }
  window.scrollTo(0, 0);
  (window as any).__isRestoringScroll = false;
  return false;
}

// ─── History composite key helper ───────────────────────────────────────────
export function historyId(item: any): string {
  if (typeof item === "object" && item !== null) {
    return `${item.type || "movie"}_${item.id}`;
  }
  return `movie_${item}`;
}

export function historyRawId(item: any): string {
  return typeof item === "object" ? String(item.id) : String(item);
}

export function historyType(item: any): string {
  return typeof item === "object" ? item.type || "movie" : "movie";
}

export function getLastEpisodeDetails(details: any) {
  if (!details) return null;
  if (details.last_episode_to_air) {
    return {
      season_number: details.last_episode_to_air.season_number,
      episode_number: details.last_episode_to_air.episode_number,
    };
  }
  const regularSeasons =
    details.seasons?.filter((s: any) => s.season_number > 0) || [];
  if (regularSeasons.length === 0) return null;
  regularSeasons.sort((a: any, b: any) => b.season_number - a.season_number);
  const lastSeason = regularSeasons[0];
  return {
    season_number: lastSeason.season_number,
    episode_number: lastSeason.episode_count,
  };
}

export function getShowProductionDetails(details: any, id: string) {
  if (id && (id.startsWith("k") || isNaN(parseInt(id)))) {
    return { inProduction: false, status: "Ended" };
  }
  if (!details) return { inProduction: true, status: "Airing" };
  return {
    inProduction: details.in_production ?? false,
    status: details.status ?? "Ended",
  };
}

export function isWatchItAgainItem(
  movie: any,
  progressData: any,
  tvDetailsCache: any,
) {
  const rid = movie.id.toString();
  const isMovie = (movie.type || "movie") === "movie";
  if (isMovie) {
    // For movie: if there is progress data, it must be fully watched (watched = true or >= 90% progress)
    // If there is NO progress data (e.g. legacy history or manually added), show it.
    const progKey = Object.keys(progressData).find((k) => k.startsWith(rid));
    if (progKey) {
      const val = progressData[progKey];
      const isWatched =
        typeof val === "object" &&
        val !== null &&
        (val.watched ||
          (val.duration > 0 && (val.time / val.duration) * 100 >= 90));
      return isWatched;
    }
    return true;
  } else {
    // For TV Show:
    // (1) Must have finished the last available episode (watched = true or >= 90%)
    // (2) The show must be fully released (in_production is false, or status is Ended/Canceled)
    const details = tvDetailsCache[rid];
    if (!details) return false; // details not loaded yet, exclude until we know

    const prod = getShowProductionDetails(details, rid);
    const isFullyReleased =
      prod.status === "Ended" ||
      prod.status === "Canceled" ||
      prod.inProduction === false;
    if (!isFullyReleased) return false;

    const lastEp = getLastEpisodeDetails(details);
    if (!lastEp) return false;

    const lastEpKey = `${rid}-S${lastEp.season_number}E${lastEp.episode_number}`;
    const lastEpProg = progressData[lastEpKey];
    const isLastWatched =
      lastEpProg &&
      (lastEpProg.watched ||
        (lastEpProg.duration > 0 &&
          (lastEpProg.time / lastEpProg.duration) * 100 >= 90));
    return !!isLastWatched;
  }
}

export function seededShuffle<T>(arr: T[], seed?: number): T[] {
  let m = 0x80000000;
  let a = 1103515245;
  let c = 12345;
  const activeSeed =
    seed !== undefined
      ? Math.abs(seed)
      : Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  let state = activeSeed ? activeSeed : 1;

  const nextRand = () => {
    state = (a * state + c) % m;
    return state / m;
  };

  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

export function rotateItems<T>(arr: T[], seed?: number): T[] {
  if (arr.length <= 6) return arr;
  const activeSeed =
    seed !== undefined
      ? Math.abs(seed)
      : Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const shift = activeSeed % arr.length;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

export function useAppState() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const prevRouteRef = useRef({
    pathname: location.pathname,
    viewingCategory: null as string | null,
  });

  const clearCategoryPageCache = () => {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("nebula-fetched-")) {
          sessionStorage.removeItem(key);
          i--; // adjust index since we removed an item
        }
      }
    } catch (e) {}
  };

  const isPageFetched = (category: string, region: string, page: number) => {
    try {
      const key = `nebula-fetched-${category}-${region}-${page}`;
      return sessionStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  };

  const markPageAsFetched = (
    category: string,
    region: string,
    page: number,
  ) => {
    try {
      const key = `nebula-fetched-${category}-${region}-${page}`;
      sessionStorage.setItem(key, "1");
    } catch {}
  };

  const markInitialPagesAsFetched = (rowsToMark: { title: string }[]) => {
    markPageAsFetched("Dramas", "All", 1);
    markPageAsFetched("Dramas", "8", 1);
    rowsToMark.forEach((row) => {
      markPageAsFetched(row.title, "All", 1);
    });
  };

  const [activeTab, setActiveTab] = useState("home");
  const [feedSeed, setFeedSeed] = useState(() =>
    Math.floor(Date.now() / (1000 * 60 * 60 * 24)),
  );
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [viewingCategory, setViewingCategory] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("Recently Added");
  const [activeMood, setActiveMood] = useState("All Moods");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  const [myList, setMyList] = useLocalStorage<any[]>("nebula-my-list", []);
  const [history, setHistory] = useLocalStorage<any[]>("nebula-history", []);
  const [visibleCount, setVisibleCount] = useState(18);
  const [dramaPage, setDramaPage] = useState(1);
  const [tvDetailsCache, setTvDetailsCache] = useState<Record<string, any>>({});

  // Data States
  const [featuredMovies, setFeaturedMovies] = useState<NebulaMovie[]>([]);
  const [topTenMovies, setTopTenMovies] = useState<NebulaMovie[]>([]);
  const [rows, setRows] = useState<
    { title: string; items: NebulaMovie[]; config?: RowConfig }[]
  >([]);
  const [searchResults, setSearchResults] = useState<NebulaMovie[]>([]);
  const [searchPeopleResults, setSearchPeopleResults] = useState<any[]>([]);

  const [allMovies, setAllMovies] = useState<NebulaMovie[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Guard against re-entrant syncUserRows calls and track already-fetched missing IDs
  const syncInProgressRef = useRef(false);
  const fetchedMissingIdsRef = useRef<Set<string>>(new Set());

  // Concurrency queue and global shown tracking refs
  const activeRowFetchesRef = useRef(0);
  const pendingRowFetchQueueRef = useRef<string[]>([]);
  const globalShownRef = useRef<Set<string>>(new Set());

  const feedSeedRef = useRef(feedSeed);
  useEffect(() => {
    feedSeedRef.current = feedSeed;
  }, [feedSeed]);

  // Helper to merge new movies into the global pool uniquely
  const updateGlobalPool = (newMovies: NebulaMovie[]) => {
    setAllMovies((prev) => {
      const existingIds = new Set(prev.map((m) => m.id.toString()));
      const uniqueNew = newMovies.filter(
        (m) => !existingIds.has(m.id.toString()),
      );
      if (uniqueNew.length === 0) return prev; // Referential stability — no change
      return [...prev, ...uniqueNew];
    });
  };

  const syncUserRows = useCallback(async () => {
    if (allMovies.length === 0) return;
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;

    // 1. Continue Watching
    const progressData = JSON.parse(
      localStorage.getItem("nebula-progress") || "{}",
    );
    const progressByTitle: Record<string, { key: string; val: any }> = {};
    for (const [key, val] of Object.entries(progressData)) {
      const baseId = key.toString().split("-")[0];
      const existing = progressByTitle[baseId];
      const ts =
        typeof val === "object" && val !== null
          ? ((val as any).timestamp ?? 0)
          : 0;
      const existingTs = existing
        ? typeof existing.val === "object" && existing.val !== null
          ? ((existing.val as any).timestamp ?? 0)
          : 0
        : -1;
      if (!existing || ts > existingTs) {
        progressByTitle[baseId] = { key, val };
      }
    }

    const continueWatchingItems: any[] = [];
    const sortedProgressEntries = Object.entries(progressByTitle).sort(
      (a, b) => {
        const tsA = a[1].val?.timestamp ?? 0;
        const tsB = b[1].val?.timestamp ?? 0;
        return tsB - tsA;
      },
    );

    const missingMedia: { id: string; type: "movie" | "tv" }[] = [];

    for (const [baseId, { key, val }] of sortedProgressEntries) {
      const type = key.includes("-") ? "tv" : "movie";
      let movie = allMovies.find(
        (m) => m.id.toString() === baseId && (m.type || "movie") === type,
      );
      if (!movie) {
        missingMedia.push({ id: baseId, type });
      } else {
        const isMovie = type === "movie";
        if (isMovie) {
          const isWatched =
            typeof val === "object" && val !== null && val.watched;
          if (isWatched) continue;
        } else {
          const details = tvDetailsCache[baseId];
          if (details) {
            const lastEp = getLastEpisodeDetails(details);
            if (lastEp) {
              const lastEpKey = `${baseId}-S${lastEp.season_number}E${lastEp.episode_number}`;
              const lastEpProg = progressData[lastEpKey];
              const isLastWatched =
                lastEpProg &&
                (lastEpProg.watched ||
                  (lastEpProg.duration > 0 &&
                    (lastEpProg.time / lastEpProg.duration) * 100 >= 90));
              if (isLastWatched) continue;
            }
          }
        }
        continueWatchingItems.push({
          ...movie,
          progressKey: key,
          progress: val,
        });
      }
    }

    // 2. My List
    const myListItems = allMovies
      .filter((m) =>
        myList.some((item) => {
          const id = typeof item === "object" && item !== null ? item.id : item;
          const type =
            typeof item === "object" && item !== null ? item.type : "movie";
          return (
            id.toString() === m.id.toString() && type === (m.type || "movie")
          );
        }),
      )
      .slice(0, 20);

    // 3. Watch It Again (History)
    const watchItAgainItems: any[] = [];
    for (const item of history) {
      const rid = historyRawId(item);
      const rtype = historyType(item);
      let movie = allMovies.find(
        (m) => m.id.toString() === rid && (m.type || "movie") === rtype,
      );
      if (!movie) {
        missingMedia.push({ id: rid, type: rtype as "movie" | "tv" });
      } else {
        if (isWatchItAgainItem(movie, progressData, tvDetailsCache)) {
          const progKey = Object.keys(progressData).find((k) =>
            k.startsWith(rid),
          );
          watchItAgainItems.push({
            ...movie,
            progress: progKey ? progressData[progKey] : null,
          });
        }
      }
    }

    // Fetch missing movies if any — but skip IDs we already tried
    if (missingMedia.length > 0) {
      const uniqueMissing = missingMedia.filter(
        (val, index, self) =>
          self.findIndex((t) => t.id === val.id && t.type === val.type) ===
            index && !fetchedMissingIdsRef.current.has(`${val.type}_${val.id}`),
      );
      // Mark these as attempted so we don't re-fetch on next cycle
      uniqueMissing.forEach((m) =>
        fetchedMissingIdsRef.current.add(`${m.type}_${m.id}`),
      );
      if (uniqueMissing.length > 0) {
        try {
          const fetched = await Promise.all(
            uniqueMissing.map(async (item) => {
              try {
                return await getMediaBasicInfo(item.id, item.type);
              } catch {
                return null;
              }
            }),
          );
          const valid = fetched.filter(Boolean) as any[];
          if (valid.length > 0) {
            updateGlobalPool(valid);
          }
        } catch (err) {
          console.error("Failed to fetch missing items in syncUserRows", err);
        }
      }
    }
    // Build globalShown from featured and static rows in rows state
    const globalShown = new Set<string>();
    featuredMovies.forEach((m) => {
      if (m && m.id) globalShown.add(m.id.toString());
    });
    rows.forEach((r) => {
      const isPersonalized =
        r.title === "Continue Watching" ||
        r.title === "My List" ||
        r.title === "Watch It Again" ||
        r.title.startsWith("Because you watched ") ||
        r.title.startsWith("More Like ") ||
        r.title.startsWith("Because you like ");
      if (!isPersonalized) {
        r.items.forEach((m) => {
          if (m && m.id) globalShown.add(m.id.toString());
        });
      }
    });

    // 4. Recommendation rows (up to 5 history items)
    const recommendationRows: any[] = [];
    const historyItems = [...history].reverse().slice(0, 5);
    const recsPromises = historyItems.map(async (hist, histIdx) => {
      const histRawId = historyRawId(hist);
      const histItemType = historyType(hist);
      let movie = allMovies.find(
        (m) => m.id.toString() === histRawId && m.type === histItemType,
      );
      if (!movie) {
        try {
          movie = (await getMediaBasicInfo(
            histRawId,
            histItemType as "tv" | "movie",
          )) as any;
        } catch {}
      }
      if (movie) {
        try {
          const recs = await getRecommendations(
            histRawId,
            movie.type || "movie",
          ).catch(() => []);
          return { movie, recs, histIdx, histRawId };
        } catch {}
      }
      return null;
    });
    const resolvedRecs = (await Promise.all(recsPromises)).filter(Boolean);

    for (const item of resolvedRecs) {
      if (!item) continue;
      const { movie, recs, histIdx, histRawId } = item;
      const rotatedRecs = rotateItems(recs, feedSeed);
      const filtered = rotatedRecs
        .filter((m) => m && m.id && !globalShown.has(m.id.toString()))
        .slice(0, 20);
      if (filtered.length > 5) {
        filtered.forEach((m) => globalShown.add(m.id.toString()));
        const label =
          histIdx === 0
            ? `Because you watched ${movie.title}`
            : `More Like ${movie.title}`;
        recommendationRows.push({
          title: label,
          items: filtered,
          hasLoaded: true,
          isLoading: false,
          config: {
            mediaType: movie.type || "movie",
            type: "recommendations",
            targetId: histRawId,
            discoverParams: {},
            filterFn: (m: any) => m.type === (movie?.type || "movie"),
          },
        });
      }
    }

    // 5. Genre preference rows
    const genreCounts: Record<string, number> = {};
    [...history, ...myList].forEach((item) => {
      const id = typeof item === "object" ? item.id : item;
      const type = typeof item === "object" ? item.type : "movie";
      const m = allMovies.find(
        (mItem) => mItem.id.toString() === id.toString() && mItem.type === type,
      );
      if (m?.genre) {
        m.genre.split(", ").forEach((g) => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
    });
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0])
      .slice(0, 2);

    const genreRows = topGenres
      .map((g) => {
        const gId = Object.entries(GENRE_MAP).find(
          ([_, name]) => name === g,
        )?.[0];
        const genreItems: any[] = [];
        const rawGenreItems = allMovies.filter((m) => m.genre?.includes(g));
        for (const m of rawGenreItems) {
          if (m && m.id && !globalShown.has(m.id.toString())) {
            genreItems.push(m);
            globalShown.add(m.id.toString());
          }
          if (genreItems.length >= 20) break;
        }
        if (genreItems.length < 10) {
          const extras = rawGenreItems
            .filter((m) => !genreItems.some((u) => u.id === m.id))
            .slice(0, 20 - genreItems.length);
          extras.forEach((m) => {
            if (m && m.id) globalShown.add(m.id.toString());
          });
          genreItems.push(...extras);
        }
        const existingGenreRow = rows.find(
          (r) => r.title === `Because you like ${g}`,
        );
        const hasLoaded = existingGenreRow ? existingGenreRow.hasLoaded : false;
        const isLoading = existingGenreRow ? existingGenreRow.isLoading : false;

        return {
          title: `Because you like ${g}`,
          items: genreItems,
          hasLoaded,
          isLoading,
          config: gId
            ? {
                mediaType: "movie" as const,
                discoverParams: {
                  with_genres: gId,
                  sort_by: "popularity.desc",
                },
                filterFn: (m: any) => m.genre.includes(g),
              }
            : undefined,
        };
      })
      .filter((r) => r.items.length > 0);

    // Save update to nebula-feed-cache timestamp (reset to 0 to trigger fresh load next mount)
    try {
      const cached = localStorage.getItem("nebula-feed-cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.timestamp = 0;
        localStorage.setItem("nebula-feed-cache", JSON.stringify(parsed));
      }
    } catch (e) {}

    syncInProgressRef.current = false;

    setRows((prev) => {
      if (prev.length === 0) return prev;
      const staticRowsMap = new Map<string, any>();
      prev.forEach((r) => {
        const isPersonalized =
          r.title === "Continue Watching" ||
          r.title === "My List" ||
          r.title === "Watch It Again" ||
          r.title.startsWith("Because you watched ") ||
          r.title.startsWith("More Like ") ||
          r.title.startsWith("Because you like ");
        if (!isPersonalized) {
          staticRowsMap.set(r.title, r);
        }
      });

      const rebuiltRows: any[] = [];

      // 1. Continue Watching
      if (continueWatchingItems.length > 0) {
        rebuiltRows.push({
          title: "Continue Watching",
          items: continueWatchingItems,
          hasLoaded: true,
          isLoading: false,
        });
      }

      // 2. Trending Now
      const trendingRow = staticRowsMap.get("Trending Now");
      if (trendingRow) rebuiltRows.push(trendingRow);

      // 3. My List
      if (myListItems.length > 0) {
        rebuiltRows.push({
          title: "My List",
          items: myListItems,
          hasLoaded: true,
          isLoading: false,
        });
      }

      // 4. Recommendation Rows
      rebuiltRows.push(...recommendationRows);

      // 5. Watch It Again
      if (watchItAgainItems.length > 0) {
        rebuiltRows.push({
          title: "Watch It Again",
          items: watchItAgainItems.slice(0, 10),
          hasLoaded: true,
          isLoading: false,
        });
      }

      // 6. Trending TV Shows
      const dramaRow = staticRowsMap.get("Trending TV Shows");
      if (dramaRow) rebuiltRows.push(dramaRow);

      // 7. Because you like [Genre]
      rebuiltRows.push(...genreRows);

      // 8. Other static rows in original order
      prev.forEach((r) => {
        const isPersonalized =
          r.title === "Continue Watching" ||
          r.title === "My List" ||
          r.title === "Watch It Again" ||
          r.title.startsWith("Because you watched ") ||
          r.title.startsWith("More Like ") ||
          r.title.startsWith("Because you like ");
        if (
          !isPersonalized &&
          r.title !== "Trending Now" &&
          r.title !== "Trending TV Shows"
        ) {
          rebuiltRows.push(r);
        }
      });

      // Save updated rebuiltRows back to the cache
      try {
        const cached = localStorage.getItem("nebula-feed-cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.rows = rebuiltRows;
          localStorage.setItem("nebula-feed-cache", JSON.stringify(parsed));
        }
      } catch (e) {}

      return rebuiltRows;
    });
  }, [allMovies, history, myList, tvDetailsCache, featuredMovies, rows]);

  const fetchInitialData = async (overrideSeed?: number) => {
    // 0. Always clear sessionStorage pagination flags on app boot/refresh
    clearCategoryPageCache();

    const activeSeed = overrideSeed !== undefined ? overrideSeed : feedSeed;
    // 1. Hydrate from Cache for instant load
    let currentPool = allMovies;
    const cachedFeed = localStorage.getItem("nebula-feed-cache");
    if (cachedFeed) {
      try {
        const {
          rows: cRows,
          featured: cFeatured,
          topTen: cTopTen,
          all: cAll,
          timestamp,
        } = JSON.parse(cachedFeed);
        const cacheAge = Date.now() - timestamp;
        // If cache is fresh (< 4 hours), use it to skip initial loader
        const hasStaleTitles = cRows?.some(
          (r: any) =>
            r.title === "Trending Missions: Global Feed" ||
            r.title === "Trending in your Sector: Philippines" ||
            r.title === "New Intel: 2025 Releases",
        );
        if (cacheAge < 1000 * 60 * 60 * 4 && !hasStaleTitles) {
          setRows(cRows);
          setFeaturedMovies(cFeatured);
          if (cTopTen) {
            setTopTenMovies(cTopTen);
          } else if (cAll && cAll.length > 0) {
            setTopTenMovies(cAll.slice(0, 10));
          }
          setAllMovies(cAll);
          setIsLoading(false);
          markInitialPagesAsFetched(cRows);

          // Hydrate globalShownRef from cached rows
          globalShownRef.current.clear();
          cFeatured?.forEach(
            (m: any) =>
              m && m.id && globalShownRef.current.add(m.id.toString()),
          );
          cTopTen?.forEach(
            (m: any) =>
              m && m.id && globalShownRef.current.add(m.id.toString()),
          );
          cRows?.forEach((r: any) => {
            if (r.hasLoaded) {
              r.items?.forEach(
                (m: any) =>
                  m && m.id && globalShownRef.current.add(m.id.toString()),
              );
            }
          });

          // Return early if cache is very fresh (< 3 hours) AND topTen is hydrated
          if (cacheAge < 1000 * 60 * 60 * 3 && cTopTen) {
            return;
          }
        } else {
          localStorage.removeItem("nebula-feed-cache");
        }
        currentPool = cAll || [];
      } catch (e) {
        localStorage.removeItem("nebula-feed-cache");
      }
    }

    clearCategoryPageCache();

    if (isLoading) setIsLoading(true);
    try {
      // 1. Fetch critical raw data in parallel
      const [rawTrending, pinoyRes] = await Promise.all([
        getTrending("all").catch(() => []),
        (async () => {
          try {
            const [mRes, tvRes] = await Promise.all([
              discoverMedia("movie", {
                region: "PH",
                watch_region: "PH",
                sort_by: "popularity.desc",
              }).catch(() => []),
              discoverMedia("tv", {
                region: "PH",
                watch_region: "PH",
                sort_by: "popularity.desc",
              }).catch(() => []),
            ]);
            return hardDedupe([...mRes, ...tvRes]);
          } catch {
            return [];
          }
        })(),
      ]);

      const trending = hardDedupe(rawTrending);
      const pinoyDramas = hardDedupe(pinoyRes || []).slice(0, 20);

      // Fetch basic info for user history & watchlist items in parallel
      const historyItems = [...history].reverse().slice(0, 10);
      const myListParsed = myList.slice(0, 20).map((item) => {
        if (typeof item === "object" && item !== null) {
          return { id: item.id.toString(), type: item.type || "movie" };
        }
        const str = String(item);
        if (str.includes("_")) {
          const parts = str.split("_");
          return { id: parts[1], type: parts[0] };
        }
        return { id: str, type: "movie" };
      });

      const [historyBasicInfos, myListBasicInfos] = await Promise.all([
        Promise.all(
          historyItems.map(async (hist) => {
            const hid = historyRawId(hist);
            const htype = historyType(hist);
            try {
              return await getMediaBasicInfo(hid, htype as "movie" | "tv");
            } catch {
              return null;
            }
          }),
        ),
        Promise.all(
          myListParsed.map(async (item) => {
            try {
              return await getMediaBasicInfo(
                item.id,
                item.type as "movie" | "tv",
              );
            } catch {
              return null;
            }
          }),
        ),
      ]);

      const resolvedHistoryBasicInfos = historyBasicInfos.filter(
        Boolean,
      ) as any[];
      const resolvedMyListBasicInfos = myListBasicInfos.filter(
        Boolean,
      ) as any[];

      // Build continue watching and watch it again items
      const progressData = JSON.parse(
        localStorage.getItem("nebula-progress") || "{}",
      );

      const continueWatchingItems: any[] = [];
      const watchItAgainItems: any[] = [];

      // ── Continue Watching (collapse episodes to 1 card per title)
      const progressByTitle: Record<string, { key: string; val: any }> = {};
      for (const [key, val] of Object.entries(progressData)) {
        const baseId = key.toString().split("-")[0];
        const existing = progressByTitle[baseId];
        const ts =
          typeof val === "object" && val !== null
            ? ((val as any).timestamp ?? 0)
            : 0;
        const existingTs = existing
          ? typeof existing.val === "object" && existing.val !== null
            ? ((existing.val as any).timestamp ?? 0)
            : 0
          : -1;
        if (!existing || ts > existingTs) {
          progressByTitle[baseId] = { key, val };
        }
      }

      const sortedProgressEntries = Object.entries(progressByTitle).sort(
        (a, b) => {
          const tsA = a[1].val?.timestamp ?? 0;
          const tsB = b[1].val?.timestamp ?? 0;
          return tsB - tsA;
        },
      );

      for (const [baseId, { key, val }] of sortedProgressEntries) {
        const type = key.includes("-") ? "tv" : "movie";
        const movie =
          resolvedHistoryBasicInfos.find(
            (m) => m.id.toString() === baseId && (m.type || "movie") === type,
          ) ||
          resolvedMyListBasicInfos.find(
            (m) => m.id.toString() === baseId && (m.type || "movie") === type,
          ) ||
          currentPool.find(
            (m) => m.id.toString() === baseId && (m.type || "movie") === type,
          );
        if (movie) {
          const isMovie = type === "movie";
          if (isMovie) {
            const isWatched =
              typeof val === "object" && val !== null && val.watched;
            if (isWatched) continue;
          } else {
            const details = tvDetailsCache[baseId];
            if (details) {
              const lastEp = getLastEpisodeDetails(details);
              if (lastEp) {
                const lastEpKey = `${baseId}-S${lastEp.season_number}E${lastEp.episode_number}`;
                const lastEpProg = progressData[lastEpKey];
                const isLastWatched =
                  lastEpProg &&
                  (lastEpProg.watched ||
                    (lastEpProg.duration > 0 &&
                      (lastEpProg.time / lastEpProg.duration) * 100 >= 90));
                if (isLastWatched) continue;
              }
            }
          }
          continueWatchingItems.push({
            ...movie,
            progressKey: key,
            progress: val,
          });
        }
      }

      // ── Watch It Again (History)
      historyItems.forEach((item) => {
        const rid = historyRawId(item);
        const rtype = historyType(item);
        const movie = resolvedHistoryBasicInfos.find(
          (m) => m.id.toString() === rid && (m.type || "movie") === rtype,
        );
        if (movie && isWatchItAgainItem(movie, progressData, tvDetailsCache)) {
          watchItAgainItems.push(movie);
        }
      });

      // ── My List
      const myListItems = resolvedMyListBasicInfos.slice(0, 36);

      // Initialize globalShownRef
      globalShownRef.current.clear();
      const topTenItems = trending.slice(0, 10);
      topTenItems.forEach((m) =>
        globalShownRef.current.add((m.tmdbId || m.id).toString()),
      );

      const filteredTrending = trending
        .filter(
          (m) => !globalShownRef.current.has((m.tmdbId || m.id).toString()),
        )
        .slice(0, 36);
      filteredTrending.forEach((m) =>
        globalShownRef.current.add((m.tmdbId || m.id).toString()),
      );

      // Add other critical rows items to globalShownRef
      continueWatchingItems.forEach((m) =>
        globalShownRef.current.add(m.id.toString()),
      );
      myListItems.forEach((m) => globalShownRef.current.add(m.id.toString()));
      watchItAgainItems.forEach((m) =>
        globalShownRef.current.add(m.id.toString()),
      );

      // Construct initialRows with pre-populated critical rows and placeholder non-critical rows
      const initialRows: any[] = [];

      // 1. Continue Watching Row
      if (continueWatchingItems.length > 0) {
        initialRows.push({
          title: "Continue Watching",
          items: continueWatchingItems,
          hasLoaded: true,
          isLoading: false,
        });
      }

      // 2. Top in Philippines Row
      if (pinoyDramas.length > 0) {
        initialRows.push({
          title: "Top in Philippines",
          items: pinoyDramas,
          hasLoaded: true,
          isLoading: false,
        });
        pinoyDramas.forEach((m) => globalShownRef.current.add(m.id.toString()));
      }

      // 3. Trending Now Row
      initialRows.push({
        title: "Trending Now",
        items: filteredTrending,
        hasLoaded: true,
        isLoading: false,
      });

      // 4. My List Row
      if (myListItems.length > 0) {
        initialRows.push({
          title: "My List",
          items: myListItems,
          hasLoaded: true,
          isLoading: false,
        });
      }

      // 5. Personalized Recommendation Rows from watch history
      const recommendationRows: any[] = [];
      resolvedHistoryBasicInfos.slice(0, 5).forEach((movie, histIdx) => {
        const label =
          histIdx === 0
            ? `Because you watched ${movie.title}`
            : `More Like ${movie.title}`;
        recommendationRows.push({
          title: label,
          items: [],
          hasLoaded: false,
          isLoading: false,
          config: {
            mediaType: movie.type || "movie",
            type: "recommendations",
            targetId: movie.id.toString(),
            discoverParams: {},
            filterFn: (m: any) => m.type === (movie?.type || "movie"),
          },
        });
      });
      initialRows.push(...recommendationRows);

      // 6. Watch It Again Row
      if (watchItAgainItems.length > 0) {
        initialRows.push({
          title: "Watch It Again",
          items: watchItAgainItems.slice(0, 20),
          hasLoaded: true,
          isLoading: false,
        });
      }

      // 7. Trending TV Shows Row
      initialRows.push({
        title: "Trending TV Shows",
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: {
          mediaType: "tv",
          discoverParams: { sort_by: "popularity.desc" },
          filterFn: (m) => m.type === "tv",
        },
      });

      // 8. User Genre Preference Profile (top 2 genres)
      const genreCounts: Record<string, number> = {};
      [...resolvedHistoryBasicInfos, ...myListItems].forEach((m) => {
        if (m?.genre) {
          m.genre.split(", ").forEach((g: string) => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        }
      });
      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .map((e) => e[0])
        .slice(0, 2);

      topGenres.forEach((g) => {
        const gId = Object.entries(GENRE_MAP).find(
          ([_, name]) => name === g,
        )?.[0];
        initialRows.push({
          title: `Because you like ${g}`,
          items: [],
          hasLoaded: false,
          isLoading: false,
          config: gId
            ? {
                mediaType: "movie",
                discoverParams: {
                  with_genres: gId,
                  sort_by: "popularity.desc",
                },
                filterFn: (m: any) => m.genre.includes(g),
              }
            : undefined,
        });
      });

      // 9. Daily Declassified Discoveries Row
      initialRows.push({
        title: "Daily Declassified Discoveries",
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: {
          mediaType: "movie",
          discoverParams: {
            "vote_average.gte": "7.0",
            sort_by: "popularity.desc",
          },
          filterFn: (m) => (m.imdb ?? 0) >= 7.0,
        },
      });

      // 10. Context Row (Weekend Curation / Weekday Deep-Dive)
      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
      const contextTitle = isWeekend
        ? "Weekend Blockbuster Curation"
        : "Weekday Deep-Dive Series";
      const contextConfig = isWeekend
        ? {
            mediaType: "movie" as const,
            discoverParams: {
              with_genres: "28,878,53", // Action, Sci-Fi, Thriller
              sort_by: "popularity.desc",
            },
            filterFn: (m: any) =>
              m.genre.includes("Action") ||
              m.genre.includes("Sci-Fi") ||
              m.genre.includes("Thriller"),
          }
        : {
            mediaType: "movie" as const,
            discoverParams: {
              with_genres: "99,18", // Documentary, Drama
              sort_by: "popularity.desc",
            },
            filterFn: (m: any) =>
              m.genre.includes("Documentary") ||
              m.genre.includes("Drama") ||
              m.type === "tv",
          };
      initialRows.push({
        title: contextTitle,
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: contextConfig,
      });

      // 11. Under the Radar Row
      initialRows.push({
        title: "Under the Radar Missions",
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: {
          mediaType: "movie",
          discoverParams: {
            "vote_average.gte": "7.5",
            "vote_count.lte": "1000",
            sort_by: "popularity.desc",
          },
          filterFn: (m) => (m.imdb ?? 0) >= 7.5,
        },
      });

      // 12. Popular Near You Row
      initialRows.push({
        title: "Popular Near You",
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: {
          mediaType: "movie",
          discoverParams: {
            sort_by: "popularity.desc",
          },
          filterFn: (m) => m.type === "movie",
        },
      });

      // 13. New Releases Row
      initialRows.push({
        title: "New Releases",
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: {
          mediaType: "movie",
          discoverParams: {
            primary_release_year: new Date().getFullYear().toString(),
            sort_by: "popularity.desc",
          },
          filterFn: (m) =>
            (m.release_date ?? "").startsWith(
              new Date().getFullYear().toString(),
            ),
        },
      });

      // 14. Spotlight Actor Row
      let actorToUse =
        SPOTLIGHT_POOL[
          Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % SPOTLIGHT_POOL.length
        ];
      if (resolvedHistoryBasicInfos.length > 0) {
        try {
          const movie = resolvedHistoryBasicInfos[0];
          const { cast } = await getMediaDetails(
            movie.id,
            movie.type || "movie",
            movie.year,
          );
          if (cast && cast.length > 0) {
            const candidate = cast[0];
            if (candidate && candidate.id) {
              actorToUse = {
                name: candidate.name,
                id: candidate.id.toString(),
              };
            }
          }
        } catch {}
      }
      initialRows.push({
        title: `Spotlight: ${actorToUse.name}`,
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: {
          mediaType: "movie",
          discoverParams: {
            with_cast: actorToUse.id,
            sort_by: "popularity.desc",
          },
          filterFn: () => true,
        },
      });

      // 15. Bingeworthy TV Shows Row
      initialRows.push({
        title: "Bingeworthy TV Shows",
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: {
          mediaType: "tv",
          discoverParams: { sort_by: "popularity.desc" },
          filterFn: (m) => m.type === "tv",
        },
      });

      // 16. Popular Movies Row
      initialRows.push({
        title: "Popular Movies",
        items: [],
        hasLoaded: false,
        isLoading: false,
        config: {
          mediaType: "movie",
          discoverParams: { sort_by: "popularity.desc" },
          filterFn: (m) => m.type === "movie",
        },
      });

      // 17. Dynamic Genre Rows
      const allGenreRows = [
        {
          title: "Critically Acclaimed: Missions",
          genreName: "Critically Acclaimed",
        },
        {
          title: "Cinematic Masterpieces",
          genreName: "Cinematic Masterpieces",
        },
        { title: "Award-Winning Hits", genreName: "Award-Winning Hits" },
        { title: "Action Packed Missions", genreName: "Action" },
        { title: "Hidden Gems", genreName: "Hidden Gems" },
        { title: "Comedy Gold", genreName: "Comedy" },
        { title: "Scary Nights (Horror)", genreName: "Horror" },
        { title: "Mystery & Suspense", genreName: "Mystery" },
        { title: "Animation Favorites", genreName: "Animation" },
        { title: "Sci-Fi Spectacles", genreName: "Sci-Fi" },
        { title: "Documentary Collection", genreName: "Documentary" },
        { title: "Epic Fantasy Worlds", genreName: "Fantasy" },
        { title: "Feel-Good Romance", genreName: "Romance" },
        { title: "Crime & Investigation", genreName: "Crime" },
        { title: "Historical Epics", genreName: "History" },
        { title: "Family Movie Night", genreName: "Family" },
        { title: "War & Military", genreName: "War" },
        { title: "Heart-Pounding Thrillers", genreName: "Thriller" },
        { title: "Musical & Music", genreName: "Music" },
        { title: "Western Frontier", genreName: "Western" },
        { title: "TV Dramas", genreName: "TV Dramas" },
        { title: "Anime Series", genreName: "Anime Series" },
        { title: "2010s Hits", genreName: "2010s Hits" },
        { title: "90s Classics", genreName: "90s Classics" },
      ];

      const favoriteRows = allGenreRows.filter((r) =>
        topGenres.includes(r.genreName),
      );
      const nonFavoriteRows = allGenreRows.filter(
        (r) => !topGenres.includes(r.genreName),
      );

      const selectedNonFavorites = seededShuffle(
        nonFavoriteRows,
        activeSeed,
      ).slice(0, Math.max(4, 6 - favoriteRows.length));

      const selectedGenreRows = [...favoriteRows, ...selectedNonFavorites];
      selectedGenreRows.forEach((genreRow) => {
        const config =
          ROW_FETCH_CONFIG[genreRow.title] ||
          ROW_FETCH_CONFIG[genreRow.genreName];
        initialRows.push({
          title: genreRow.title,
          items: [],
          hasLoaded: false,
          isLoading: false,
          config,
        });
      });

      // 4. Set Initial State
      let initialFeatured = trending.slice(0, 5);
      if (topGenres.length > 0) {
        initialFeatured = [...initialFeatured].sort((a, b) => {
          const matchA = topGenres.some((g) => a.genre?.includes(g)) ? 1 : 0;
          const matchB = topGenres.some((g) => b.genre?.includes(g)) ? 1 : 0;
          return matchB - matchA;
        });
      } else {
        initialFeatured = rotateItems(initialFeatured, activeSeed);
      }

      setFeaturedMovies(initialFeatured);
      setTopTenMovies(topTenItems);
      setRows(initialRows);

      // Flip the loading spinner off! The user can now see the layout instantly
      setIsLoading(false);

      // 5. Enrich Spotlight & Top 10 immediately for logos
      const [enrichedTop, enrichedFeatured] = await Promise.all([
        enrichMoviesWithMetadata(topTenItems),
        enrichMoviesWithMetadata(initialFeatured),
      ]);

      setFeaturedMovies(enrichedFeatured);
      setTopTenMovies(enrichedTop);
      const finalPool = hardDedupe([
        ...enrichedTop,
        ...enrichedFeatured,
        ...trending,
        ...pinoyDramas,
        ...continueWatchingItems,
        ...myListItems,
        ...watchItAgainItems,
      ]);
      setAllMovies(finalPool);
      markInitialPagesAsFetched(initialRows);

      // 7. Save to Cache for next session
      try {
        localStorage.setItem(
          "nebula-feed-cache",
          JSON.stringify({
            rows: initialRows,
            featured: enrichedFeatured,
            topTen: enrichedTop,
            all: finalPool,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        localStorage.removeItem("nebula-feed-cache");
      }
    } catch (err) {
      console.error("Data acquisition failure", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRowData = useCallback(
    async (rowTitle: string) => {
      // Check if the row exists, is already loaded, or is currently loading/queued
      const row = rows.find((r) => r.title === rowTitle);
      if (!row || row.hasLoaded || row.isLoading) return;

      // Check if it's already queued
      if (pendingRowFetchQueueRef.current.includes(rowTitle)) return;

      const currentSeed = feedSeedRef.current;

      // If we have reached the concurrency limit, queue it
      if (activeRowFetchesRef.current >= 2) {
        pendingRowFetchQueueRef.current.push(rowTitle);
        return;
      }

      // Otherwise, execute immediately
      activeRowFetchesRef.current += 1;

      // Helper to start the fetch
      const executeFetch = async (title: string) => {
        // Mark the row as loading in state
        setRows((prev) =>
          prev.map((r) => (r.title === title ? { ...r, isLoading: true } : r)),
        );

        try {
          const targetRow = rows.find((r) => r.title === title);
          let config = targetRow?.config;
          if (!config) {
            config = ROW_FETCH_CONFIG[title];
          }

          const performFetch = async (page: number) => {
            const pageStr = page.toString();
            if (config) {
              if (config.type === "recommendations" && config.targetId) {
                return await getRecommendations(
                  config.targetId,
                  config.mediaType as any,
                  pageStr,
                ).catch(() => []);
              } else if (config.mediaType === "all") {
                return await getTrending("all", pageStr).catch(() => []);
              } else {
                return await discoverMedia(config.mediaType, {
                  ...config.discoverParams,
                  page: pageStr,
                }).catch(() => []);
              }
            } else {
              // Special fallback row builders if config is missing (e.g. custom queries)
              if (title === "Daily Declassified Discoveries") {
                return await discoverMedia("movie", {
                  "vote_average.gte": "7.0",
                  sort_by: "popularity.desc",
                  page: pageStr,
                }).catch(() => []);
              } else if (title === "Weekend Blockbuster Curation") {
                return await discoverMedia("movie", {
                  with_genres: "28,878,53",
                  sort_by: "popularity.desc",
                  page: pageStr,
                }).catch(() => []);
              } else if (title === "Weekday Deep-Dive Series") {
                return await discoverMedia("movie", {
                  with_genres: "99,18",
                  sort_by: "popularity.desc",
                  page: pageStr,
                }).catch(() => []);
              } else if (title === "Under the Radar Missions") {
                return await discoverMedia("movie", {
                  "vote_average.gte": "7.5",
                  "vote_count.lte": "1000",
                  sort_by: "popularity.desc",
                  page: pageStr,
                }).catch(() => []);
              } else if (title === "Popular Near You") {
                return await discoverMedia("movie", {
                  sort_by: "popularity.desc",
                  page: pageStr,
                }).catch(() => []);
              }
            }
            return [];
          };

          let fetchedItems = await performFetch(1);
          if (config && config.type === "recommendations") {
            fetchedItems = rotateItems(fetchedItems, currentSeed);
          }

          // If the seed has changed, discard the results (stale refresh)
          if (currentSeed !== feedSeedRef.current) {
            return;
          }

          let deduped = fetchedItems.filter(
            (m) => m && m.id && !globalShownRef.current.has(m.id.toString()),
          );

          // Self-healing pagination: If we have less than 30 unique items after deduplication (due to overlaps),
          // fetch Page 2 to fill the row with fresh, unique titles instead of repeating duplicates.
          if (
            deduped.length < 30 &&
            fetchedItems.length > 0 &&
            (!config || config.type !== "recommendations")
          ) {
            const page2Items = await performFetch(2);
            if (currentSeed === feedSeedRef.current) {
              const uniquePage2 = page2Items.filter(
                (m) =>
                  m &&
                  m.id &&
                  !globalShownRef.current.has(m.id.toString()) &&
                  !deduped.some((d) => d.id === m.id),
              );
              deduped = [...deduped, ...uniquePage2];
            }
          }

          let finalItems = deduped.slice(0, 36);

          if (config && config.type === "recommendations") {
            // If recommendation items are <= 5, do not show the row (items = [])
            if (finalItems.length <= 5) {
              finalItems = [];
            }
          } else {
            // If other rows are STILL too sparse, fill them back up as a last resort
            if (finalItems.length < 24 && fetchedItems.length > 0) {
              const extras = fetchedItems
                .filter(
                  (m) => m && m.id && !finalItems.some((f) => f.id === m.id),
                )
                .slice(0, 36 - finalItems.length);
              finalItems.push(...extras);
            }
          }

          // Add to globalShownRef
          finalItems.forEach((m) =>
            globalShownRef.current.add(m.id.toString()),
          );

          // Add to global pool
          updateGlobalPool(finalItems);

          // Enrich items in background (non-blocking)
          enrichMoviesWithMetadata(finalItems.slice(0, 10)).then((enriched) => {
            if (currentSeed !== feedSeedRef.current) return;
            setRows((prev) =>
              prev.map((r) =>
                r.title === title
                  ? {
                      ...r,
                      items: [...enriched, ...finalItems.slice(10)],
                    }
                  : r,
              ),
            );
          });

          // Set row state with fetched items
          setRows((prev) =>
            prev.map((r) =>
              r.title === title
                ? {
                    ...r,
                    items: finalItems,
                    isLoading: false,
                    hasLoaded: true,
                  }
                : r,
            ),
          );
        } catch (err) {
          console.error(`Failed to load row ${title}:`, err);
          if (currentSeed !== feedSeedRef.current) return;
          setRows((prev) =>
            prev.map((r) =>
              r.title === title
                ? { ...r, isLoading: false, hasLoaded: true }
                : r,
            ),
          );
        } finally {
          // Complete the fetch and process queue
          activeRowFetchesRef.current -= 1;

          // Dequeue next request if any (only if seed hasn't changed)
          if (
            currentSeed === feedSeedRef.current &&
            pendingRowFetchQueueRef.current.length > 0
          ) {
            const nextRowTitle = pendingRowFetchQueueRef.current.shift();
            if (nextRowTitle) {
              // Run next request
              activeRowFetchesRef.current += 1;
              executeFetch(nextRowTitle);
            }
          }
        }
      };

      executeFetch(rowTitle);
    },
    [rows, discoverMedia, getRecommendations, getTrending, updateGlobalPool],
  );

  useEffect(() => {
    setVisibleCount(18);
    setDramaPage(1); // Reset pagination on category/tab change
    if (viewingCategory !== "Dramas" && selectedRegion !== "All") {
      setSelectedRegion("All");
    }
  }, [viewingCategory, activeTab, selectedRegion]);

  const loadMore = () => {
    setDramaPage((prev) => prev + 1);
    setVisibleCount((prev) => prev + 18);
  };

  const getCategoryMovies = useCallback(() => {
    switch (viewingCategory) {
      case "Movies":
      case "TV Shows":
        // Now handled by ROW_FETCH_CONFIG below for pagination support
        break;
      case "Library": {
        const myListCompositeSet = new Set(
          myList.map((item) => {
            const id =
              typeof item === "object" && item !== null ? item.id : item;
            const type =
              typeof item === "object" && item !== null ? item.type : "movie";
            return `${type || "movie"}_${id}`;
          }),
        );
        const histCompositeSet = new Set(history.map(historyId));
        return allMovies.filter(
          (m) =>
            myListCompositeSet.has(`${m.type || "movie"}_${m.id}`) ||
            histCompositeSet.has(`${m.type || "movie"}_${m.id}`),
        );
      }
      case "My Secure Records": {
        const myListCompositeSet = new Set(
          myList.map((item) => {
            const id =
              typeof item === "object" && item !== null ? item.id : item;
            const type =
              typeof item === "object" && item !== null ? item.type : "movie";
            return `${type || "movie"}_${id}`;
          }),
        );
        return allMovies.filter((m) =>
          myListCompositeSet.has(`${m.type || "movie"}_${m.id}`),
        );
      }
      case "Watch It Again": {
        const progressData = JSON.parse(
          localStorage.getItem("nebula-progress") || "{}",
        );
        return history
          .map((item) => {
            const rid = historyRawId(item);
            const rtype = historyType(item);
            const movie = allMovies.find(
              (m) => m.id.toString() === rid && (m.type || "movie") === rtype,
            );
            if (!movie) return null;
            return isWatchItAgainItem(movie, progressData, tvDetailsCache)
              ? movie
              : null;
          })
          .filter(Boolean);
      }
      case "Watch History": {
        return history
          .map((item) => {
            const rid = historyRawId(item);
            const rtype = historyType(item);
            return allMovies.find(
              (m) => m.id.toString() === rid && (m.type || "movie") === rtype,
            );
          })
          .filter(Boolean);
      }
      case "Dramas":
        return allMovies.filter((m) => (m as any).isDrama);
    }

    // Default strategy for discovery rows
    const row = rows.find((r) => r.title === viewingCategory);
    const config = ROW_FETCH_CONFIG[viewingCategory || ""];

    if (config) {
      if (row) {
        return row.items;
      }
      const PROVIDERS = [
        "Netflix",
        "Prime Video",
        "Disney+",
        "Apple TV+",
        "Hulu",
        "Max",
        "Paramount+",
        "Peacock",
      ];
      if (PROVIDERS.includes(viewingCategory || "")) {
        return [];
      }
      return allMovies.filter(config.filterFn);
    }

    if (row) {
      // Dynamic recommendation fallback
      const genreMatch = row.title.match(/Because you like (.+)/i);
      if (genreMatch) {
        const g = genreMatch[1];
        return allMovies.filter((m) =>
          m.genre.toLowerCase().includes(g.toLowerCase()),
        );
      }
      return row.items;
    }

    return allMovies;
  }, [viewingCategory, myList, history, allMovies, rows]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Sync user-specific rows when history/myList change.
  // NOTE: allMovies.length is intentionally EXCLUDED from deps to prevent
  // the loop: syncUserRows → updateGlobalPool → allMovies change → re-trigger.
  useEffect(() => {
    const timer = setTimeout(() => {
      syncUserRows();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, myList]);

  // ── Optimized Search with AbortController ─────────────────────────────────
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery.trim().length > 1) {
        // Cancel any in-flight search
        searchAbortRef.current?.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;

        setIsLoading(true);
        try {
          const [results, peopleResults] = await Promise.all([
            searchMedia(searchQuery, controller.signal),
            searchPeople(searchQuery, controller.signal),
          ]);
          if (controller.signal.aborted) return;
          // Show results immediately, enrich in background
          setSearchResults(results);
          setSearchPeopleResults(peopleResults);
          updateGlobalPool(results);
          setIsLoading(false);

          // Background enrichment for top results (non-blocking)
          enrichMoviesWithMetadata(results.slice(0, 6)).then((enriched) => {
            if (controller.signal.aborted) return;
            setSearchResults((prev) => {
              const enrichedIds = new Set(enriched.map((e) => e.id.toString()));
              const rest = prev.filter(
                (m) => !enrichedIds.has(m.id.toString()),
              );
              return [...enriched, ...rest];
            });
          });
        } catch (e) {
          if (!controller.signal.aborted) {
            setSearchResults([]);
            setSearchPeopleResults([]);
            setIsLoading(false);
          }
        }
      } else {
        searchAbortRef.current?.abort();
        setSearchResults([]);
        setSearchPeopleResults([]);
        setIsLoading(false);
      }
    }, 250); // Reduced from 400ms for snappier feel
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const toggleMyList = (movieOrId: any, type?: "movie" | "tv") => {
    let id: string;
    let mediaType: "movie" | "tv" = "movie";

    if (typeof movieOrId === "object" && movieOrId !== null) {
      id = movieOrId.id.toString();
      mediaType = movieOrId.type || "movie";
    } else {
      id = movieOrId.toString();
      mediaType = type || "movie";
    }

    setMyList((prev) => {
      const isAlreadyIn = prev.some((item) => {
        const itemId =
          typeof item === "object" && item !== null ? item.id : item;
        const itemType =
          typeof item === "object" && item !== null ? item.type : "movie";
        return itemId.toString() === id && itemType === mediaType;
      });

      if (isAlreadyIn) {
        return prev.filter((item) => {
          const itemId =
            typeof item === "object" && item !== null ? item.id : item;
          const itemType =
            typeof item === "object" && item !== null ? item.type : "movie";
          return !(itemId.toString() === id && itemType === mediaType);
        });
      } else {
        return [...prev, { id, type: mediaType }];
      }
    });
  };

  const removeFromHistory = (id: string | number, type?: string) => {
    setHistory((prev) =>
      prev.filter((h) => {
        const hid = historyRawId(h);
        const htype = historyType(h);
        // If type is provided, match both id+type; otherwise match id only (backward compat)
        if (type) return !(hid === id.toString() && htype === type);
        return hid !== id.toString();
      }),
    );
    // Also remove from progress to keep them in sync
    const p = JSON.parse(localStorage.getItem("nebula-progress") || "{}");
    Object.keys(p).forEach((key) => {
      const baseId = key.split("-")[0];
      if (baseId === id.toString()) {
        delete p[key];
      }
    });
    localStorage.setItem("nebula-progress", JSON.stringify(p));
    syncUserRows();
  };

  const removeFromProgress = (id: string | number) => {
    // 1. Remove from progress
    const p = JSON.parse(localStorage.getItem("nebula-progress") || "{}");
    Object.keys(p).forEach((key) => {
      const baseId = key.split("-")[0];
      if (baseId === id.toString()) {
        delete p[key];
      }
    });
    localStorage.setItem("nebula-progress", JSON.stringify(p));

    // 2. Remove from history to keep them in sync
    setHistory((prev) => prev.filter((h) => historyRawId(h) !== id.toString()));

    syncUserRows();
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("nebula-history");
    localStorage.removeItem("nebula-progress");
    syncUserRows();
  };

  const clearMyList = () => {
    setMyList([]);
    localStorage.removeItem("nebula-my-list");
    // This will naturally trigger syncUserRows via useEffect because myList reference changes
  };

  // Auto-Cleanup Logic (Prune items older than 30 days)
  useEffect(() => {
    const cleanup = () => {
      // Prune History (Keep newest 100 items only for performance)
      if (history.length > 100) {
        const newHistory = history.slice(0, 100);
        setHistory(newHistory);
        localStorage.setItem("nebula-history", JSON.stringify(newHistory));
      }
    };
    cleanup();
  }, []);

  // Fetch basic metadata for any watch history or myList items missing from the cache pool
  useEffect(() => {
    if (allMovies.length === 0) return;

    const fetchMissing = async () => {
      const missingHistory = history
        .map((h) => ({
          id: historyRawId(h),
          type: historyType(h),
        }))
        .filter((item) => {
          return !allMovies.some(
            (m) =>
              m.id.toString() === item.id && (m.type || "movie") === item.type,
          );
        });

      const parseMyListId = (item: any) => {
        if (typeof item === "object" && item !== null) {
          return { id: item.id.toString(), type: item.type || "movie" };
        }
        const str = item.toString();
        if (str.includes("_")) {
          const parts = str.split("_");
          return { id: parts[1], type: parts[0] };
        }
        return { id: str, type: "movie" };
      };

      const missingMyList = myList
        .map((item) => {
          const parsed = parseMyListId(item);
          return { id: parsed.id, type: parsed.type };
        })
        .filter((item) => {
          return !allMovies.some(
            (m) =>
              m.id.toString() === item.id && (m.type || "movie") === item.type,
          );
        });

      const allMissing: { id: string; type: string }[] = [];
      const seen = new Set<string>();

      [...missingHistory, ...missingMyList].forEach((item) => {
        const key = `${item.type}_${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          allMissing.push(item);
        }
      });

      if (allMissing.length === 0) return;

      try {
        const fetched = await Promise.all(
          allMissing.map(async (item) => {
            try {
              return await getMediaBasicInfo(
                item.id,
                item.type as "movie" | "tv",
              );
            } catch {
              return null;
            }
          }),
        );
        const valid = fetched.filter(Boolean) as any[];
        if (valid.length > 0) {
          updateGlobalPool(valid);
        }
      } catch (err) {
        console.error("Failed to fetch missing library items", err);
      }
    };

    fetchMissing();
  }, [history, myList, allMovies.length]);

  useEffect(() => {
    if (allMovies.length === 0) return;

    const fetchHistoryTvDetails = async () => {
      const tvShows = history
        .map((h) => {
          const rid = historyRawId(h);
          const rtype = historyType(h);
          return rtype === "tv" ? rid : null;
        })
        .filter(Boolean) as string[];

      for (const id of tvShows) {
        if (tvDetailsCache[id]) continue;
        try {
          const apiBase = API_BASE_URL.replace(/\/api\/?$/, "").replace(
            /\/$/,
            "",
          );
          const res = await fetch(`${apiBase}/api/tv-details/${id}`);
          if (res.ok) {
            const data = await res.json();
            setTvDetailsCache((prev) => ({ ...prev, [id]: data }));
          }
        } catch (e) {
          console.error("Failed to fetch TV details for history item", id, e);
        }
      }
    };

    fetchHistoryTvDetails();
  }, [history, allMovies.length]);

  // Synchronously flag scroll restoration on popstate (browser back/forward button clicks)
  // before React Router's post-render cycle triggers scroll collapse events
  useEffect(() => {
    const handlePopState = () => {
      (window as any).__isRestoringScroll = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const current = { pathname: location.pathname, viewingCategory };

    // Update the ref to the current route/category
    prevRouteRef.current = current;

    // 2. Restore or reset scroll position for the NEW route/category
    restoreScrollPosition(current.pathname, current.viewingCategory);

    // 3. Then set up the scroll event listener
    let scrollTimeout: any;
    const handleScroll = () => {
      const mainEl = document.querySelector("main");
      const offset = Math.max(window.scrollY, mainEl?.scrollTop || 0);
      setScrolled(offset > 50);

      // Only save if we are not in the process of restoring scroll
      if ((window as any).__isRestoringScroll) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        try {
          const key = getScrollKey(location.pathname, viewingCategory);
          sessionStorage.setItem(key, offset.toString());
        } catch {
          /* quota */
        }
      }, 100);
    };

    window.addEventListener("scroll", handleScroll);
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Call once initially *after* restoration/reset has kicked off
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (mainEl) {
        mainEl.removeEventListener("scroll", handleScroll);
      }
      clearTimeout(scrollTimeout);
    };
  }, [location.pathname, viewingCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "Escape" && isSearchOpen) setIsSearchOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [isSearchOpen]);
  const wrappedSetSelectedMovie = (movie: any) => {
    if (!movie) {
      navigate("/");
    } else {
      // Save scroll position before navigating to detail page
      saveScrollPosition(location.pathname, viewingCategory);
      (window as any).__isRestoringScroll = true;
      navigate(`/${movie.type}/${movie.id}`);
    }
    setSelectedMovie(movie);
  };

  const handleRandomize = () => {
    const pool = viewingCategory ? filteredMovies : allMovies;
    const activeId = selectedMovie?.id?.toString() || params.id;
    const candidates = activeId
      ? pool.filter((m) => m.id.toString() !== activeId)
      : pool;
    const finalPool = candidates.length > 0 ? candidates : pool;
    if (finalPool.length > 0) {
      const random = finalPool[Math.floor(Math.random() * finalPool.length)];
      wrappedSetSelectedMovie(random);
    }
  };

  // Sync state with URL changes
  useEffect(() => {
    const path = location.pathname;
    if (path === "/") {
      setSelectedMovie(null);
      setIsPlaying(false);
    } else if (path.startsWith("/movie/") || path.startsWith("/tv/")) {
      const parts = path.split("/");
      const type = parts[1];
      const rawId = parts[2];
      const id =
        type === "tv" && isNaN(parseInt(rawId)) ? rawId : parseInt(rawId);

      if (!selectedMovie || selectedMovie.id !== id) {
        const found = allMovies.find((m) => m.id === id && m.type === type);
        if (found) setSelectedMovie(found);
        // Note: If not found in pool, the MovieDetails component handles its own fetch
      }
    }
  }, [location.pathname, allMovies]);

  useEffect(() => {
    if (
      isHoveringHero ||
      isPlaying ||
      isSearchOpen ||
      featuredMovies.length === 0
    )
      return;

    // Auto-transition timer
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 10000); // 10s for better readability

    return () => clearInterval(interval);
  }, [
    isHoveringHero,
    isPlaying,
    isSearchOpen,
    featuredMovies.length,
    currentHeroIndex,
  ]); // Reset on index change

  useEffect(() => {
    if (!viewingCategory) return;

    if (viewingCategory === "Dramas") {
      if (isPageFetched("Dramas", selectedRegion, dramaPage)) return;
      const fetchRegionalDramas = async () => {
        setIsLoading(true);
        try {
          const rawApi =
            import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
          const apiBase = rawApi.replace(/\/api\/?$/, "").replace(/\/$/, "");
          const countryParam =
            selectedRegion !== "All" ? `&country=${selectedRegion}` : "";
          const r = await fetch(
            `${apiBase}/api/drama/list?page=${dramaPage}${countryParam}&order=2`,
          );
          const data = await r.json();
          if (data.results) {
            updateGlobalPool(data.results);
          }
          markPageAsFetched("Dramas", selectedRegion, dramaPage);
        } catch (e) {
          console.error("Failed to fetch regional dramas", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchRegionalDramas();
    } else if (
      ![
        "Library",
        "My Secure Records",
        "Watch History",
        "Watch It Again",
      ].includes(viewingCategory)
    ) {
      if (isPageFetched(viewingCategory, selectedRegion, dramaPage)) return;
      const fetchMoreForCategory = async () => {
        let config = ROW_FETCH_CONFIG[viewingCategory];
        if (!config) {
          // Look for dynamic config attached to the row (e.g. Recommendations)
          const dynamicRow = rows.find((r) => r.title === viewingCategory);
          if (dynamicRow?.config) config = dynamicRow.config;
        }

        if (config) {
          // Only show loading state if we don't have any data yet for this category
          const existingData = getCategoryMovies();
          if (existingData.length === 0) setIsLoading(true);

          try {
            let more: NebulaMovie[] = [];
            const PROVIDERS = [
              "Netflix",
              "Prime Video",
              "Disney+",
              "Apple TV+",
              "Hulu",
              "Max",
              "Paramount+",
              "Peacock",
            ];
            if (config.type === "recommendations" && config.targetId) {
              more = await getRecommendations(
                config.targetId,
                config.mediaType as any,
                dramaPage.toString(),
              );
            } else if (PROVIDERS.includes(viewingCategory || "")) {
              // Parallel movie and TV fetch for providers
              const [mRes, tvRes] = await Promise.all([
                discoverMedia("movie", {
                  ...config.discoverParams,
                  page: dramaPage.toString(),
                }).catch(() => []),
                discoverMedia("tv", {
                  ...config.discoverParams,
                  page: dramaPage.toString(),
                }).catch(() => []),
              ]);
              more = hardDedupe([...mRes, ...tvRes]);
            } else if (config.mediaType === "all") {
              more = await getTrending("all", dramaPage.toString());
            } else {
              more = await discoverMedia(config.mediaType, {
                ...config.discoverParams,
                page: dramaPage.toString(),
              });
            }

            if (more.length > 0) {
              updateGlobalPool(more);
              // For dynamic rows, also update the row state so getCategoryMovies/CategoryView sees them
              setRows((prev) => {
                const exists = prev.some((r) => r.title === viewingCategory);
                if (exists) {
                  return prev.map((r) =>
                    r.title === viewingCategory
                      ? { ...r, items: hardDedupe([...r.items, ...more]) }
                      : r,
                  );
                } else {
                  return [
                    ...prev,
                    { title: viewingCategory || "", items: more },
                  ];
                }
              });
            }
            markPageAsFetched(viewingCategory, selectedRegion, dramaPage);
          } catch (e) {
            console.error("Failed to fetch more for category", e);
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
    const filtered = source.filter((m) => {
      const matchesGenre =
        selectedGenre === "All" || m.genre.includes(selectedGenre);
      const matchesMood =
        activeMood === "All Moods" ||
        m.genre.toLowerCase().includes(activeMood.toLowerCase().split(" ")[0]);
      // Regional filter for Dramas
      const mRegion = (m as any).countryId?.toString();
      const matchesRegion =
        selectedRegion === "All" || mRegion === selectedRegion;

      if (activeTab === "my-list") return myList.includes(m.id);
      return matchesGenre && matchesMood && matchesRegion;
    });

    if (sortBy === "IMDB Rating") {
      return [...filtered].sort((a, b) => (b.imdb || 0) - (a.imdb || 0));
    }
    if (sortBy === "Release Date") {
      return [...filtered].sort((a, b) => b.year - a.year);
    }
    return filtered;
  }, [
    selectedGenre,
    activeMood,
    activeTab,
    myList,
    sortBy,
    rows,
    viewingCategory,
    selectedRegion,
    allMovies,
  ]);

  const recommendations = useMemo(() => {
    const itemWeights = new Map<string, number>();
    const itemMap = new Map<string, NebulaMovie>();

    const getRowWeight = (title: string): number => {
      if (title === "Continue Watching") return 100;
      if (
        title.startsWith("Since you watched") ||
        title.startsWith("More like")
      )
        return 90;
      if (title.startsWith("Because you like")) return 80;
      if (title.startsWith("Trending Missions")) return 70;
      if (title === "Watch It Again") return 60;
      return 10;
    };

    rows.forEach((row) => {
      const weight = getRowWeight(row.title);
      row.items.forEach((item) => {
        if (!item || !item.id) return;
        const idStr = item.id.toString();
        itemMap.set(idStr, item);
        const existingWeight = itemWeights.get(idStr) || 0;
        if (weight > existingWeight) {
          itemWeights.set(idStr, weight);
        }
      });
    });

    const uniqueItems = Array.from(itemMap.values());

    const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const getHashModifier = (idStr: string) => {
      let hash = daySeed;
      for (let i = 0; i < idStr.length; i++) {
        hash = (hash << 5) - hash + idStr.charCodeAt(i);
        hash |= 0;
      }
      return (Math.abs(hash) % 100) / 100;
    };

    return uniqueItems
      .map((item) => {
        const baseWeight = itemWeights.get(item.id.toString()) || 0;
        const score = baseWeight + getHashModifier(item.id.toString());
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item)
      .slice(0, 20);
  }, [rows]);

  const markAsWatched = (
    id: string | number,
    type: "movie" | "tv" = "movie",
  ) => {
    invalidateRecommendationCache(id, type);
    setHistory((prev) => {
      const filtered = prev.filter((item) => {
        const itemId = typeof item === "object" ? item.id : item;
        return itemId.toString() !== id.toString();
      });
      return [{ id: id.toString(), type }, ...filtered].slice(0, 100);
    });
  };

  const startPlayback = (
    movie: any,
    s?: number,
    e?: number,
    source?: string,
  ) => {
    // Save scroll position before navigating to player
    saveScrollPosition(location.pathname, viewingCategory);
    (window as any).__isRestoringScroll = true;
    setIsTransitioning(true);
    let target =
      s !== undefined && e !== undefined
        ? `/watch/${movie.type}/${movie.id}?season=${s}&episode=${e}`
        : `/watch/${movie.type}/${movie.id}`;

    if (source) {
      target +=
        (target.includes("?") ? "&" : "?") +
        `source=${encodeURIComponent(source)}`;
    }

    navigate(target);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  const changeActiveTab = (tab: string) => {
    saveScrollPosition(location.pathname, viewingCategory);
    (window as any).__isRestoringScroll = true;
    setActiveTab(tab);
  };

  const changeViewingCategory = (category: string | null) => {
    saveScrollPosition(location.pathname, viewingCategory);
    (window as any).__isRestoringScroll = true;
    setViewingCategory(category);
  };

  const handleNavClick = (id: string) => {
    if (id === "search") setIsSearchOpen(true);
    else {
      changeActiveTab(id);
      if (id === "movies") changeViewingCategory("Movies");
      else if (id === "tv") changeViewingCategory("TV Shows");
      else if (id === "drama") changeViewingCategory("Dramas");
      else if (id === "library") changeViewingCategory("Library");
      else changeViewingCategory(null);
      setSelectedMovie(null);
      if (location.pathname !== "/") {
        navigate("/");
      }
    }
  };

  const handleBack = () => {
    saveScrollPosition(location.pathname, viewingCategory);
    (window as any).__isRestoringScroll = true;
    setIsTransitioning(true);
    navigate(-1);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const refreshFeed = async () => {
    const newSeed = Math.floor(Math.random() * 1000000);
    // Reset client queue and active counter to reject background fetches from old feed layout
    pendingRowFetchQueueRef.current = [];
    activeRowFetchesRef.current = 0;

    setFeedSeed(newSeed);
    localStorage.removeItem("nebula-feed-cache");
    setIsLoading(true);
    await fetchInitialData(newSeed);
  };

  return {
    state: {
      activeTab,
      feedSeed,
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
      searchPeopleResults,
      recommendations,
      allMovies,
      topTenMovies,
      featuredMovies,
      rows,
      isTransitioning,
      selectedRegion,
    },
    actions: {
      setActiveTab: changeActiveTab,
      setCurrentHeroIndex,
      setIsHoveringHero,
      setIsPlaying,
      setSelectedGenre,
      setViewingCategory: changeViewingCategory,
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
      markAsWatched,
      loadMore,
      getCategoryMovies,
      startPlayback,
      handleNavClick,
      handleRandomize,
      setIsTransitioning,
      handleBack,
      refreshFeed,
      fetchRowData,
    },
    refs: {
      searchInputRef,
    },
  };
}
