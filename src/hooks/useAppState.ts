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
  "Trending Missions: Global Feed": {
    mediaType: "all",
    discoverParams: {},
    filterFn: () => true,
  },
  "Bingeworthy TV Shows": {
    mediaType: "tv",
    discoverParams: { sort_by: "popularity.desc" },
    filterFn: (m) => m.type === "tv",
  },
  "Critically Acclaimed: Missions": {
    mediaType: "movie",
    discoverParams: {
      "vote_average.gte": "7.5",
      "vote_count.gte": "300",
      sort_by: "vote_average.desc",
    },
    filterFn: (m) => (m.imdb ?? 0) >= 7.5,
  },
  "New Intel: 2025 Releases": {
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

  const markInitialPagesAsFetched = () => {
    markPageAsFetched("Dramas", "All", 1);
    markPageAsFetched("Dramas", "8", 1);
    Object.keys(ROW_FETCH_CONFIG).forEach((title) => {
      markPageAsFetched(title, "All", 1);
    });
  };

  const [activeTab, setActiveTab] = useState("home");
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
  const [visibleCount, setVisibleCount] = useState(12);
  const [dramaPage, setDramaPage] = useState(1);
  const [tvDetailsCache, setTvDetailsCache] = useState<Record<string, any>>({});

  // Data States
  const [featuredMovies, setFeaturedMovies] = useState<NebulaMovie[]>([]);
  const [rows, setRows] = useState<
    { title: string; items: NebulaMovie[]; config?: RowConfig }[]
  >([]);
  const [searchResults, setSearchResults] = useState<NebulaMovie[]>([]);

  const [allMovies, setAllMovies] = useState<NebulaMovie[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Guard against re-entrant syncUserRows calls and track already-fetched missing IDs
  const syncInProgressRef = useRef(false);
  const fetchedMissingIdsRef = useRef<Set<string>>(new Set());

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
      .filter((m) => myList.includes(m.id.toString()))
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
    syncInProgressRef.current = false;

    setRows((prev) => {
      if (prev.length === 0) return prev;
      let updated = [...prev];

      // Update Continue Watching Row
      const cwIndex = updated.findIndex((r) => r.title === "Continue Watching");
      if (continueWatchingItems.length > 0) {
        const newRow = {
          title: "Continue Watching",
          items: continueWatchingItems,
        };
        if (cwIndex !== -1) {
          updated[cwIndex] = newRow;
        } else {
          updated = [newRow, ...updated];
        }
      } else if (cwIndex !== -1) {
        updated.splice(cwIndex, 1);
      }

      // Update My Secure Records Row
      const mlIndex = updated.findIndex((r) => r.title === "My Secure Records");
      if (myListItems.length > 0) {
        const newRow = { title: "My Secure Records", items: myListItems };
        if (mlIndex !== -1) {
          updated[mlIndex] = newRow;
        } else {
          const cwIdx = updated.findIndex(
            (r) => r.title === "Continue Watching",
          );
          const trendIdx = updated.findIndex(
            (r) => r.title === "Trending Missions: Global Feed",
          );
          const insertIdx =
            trendIdx !== -1 ? trendIdx + 1 : cwIdx !== -1 ? cwIdx + 1 : 0;
          updated.splice(insertIdx, 0, newRow);
        }
      } else if (mlIndex !== -1) {
        updated.splice(mlIndex, 1);
      }

      // Update Watch It Again Row
      const wiaIndex = updated.findIndex((r) => r.title === "Watch It Again");
      if (wiaIndex !== -1) {
        updated[wiaIndex] = {
          ...updated[wiaIndex],
          items: watchItAgainItems.slice(0, 10),
        };
      } else if (watchItAgainItems.length > 0) {
        const mlIdx = updated.findIndex((r) => r.title === "My Secure Records");
        const trendIdx = updated.findIndex(
          (r) => r.title === "Trending Missions: Global Feed",
        );
        const insertIdx =
          mlIdx !== -1 ? mlIdx + 1 : trendIdx !== -1 ? trendIdx + 1 : 0;
        updated.splice(insertIdx, 0, {
          title: "Watch It Again",
          items: watchItAgainItems.slice(0, 10),
        });
      }

      return updated;
    });
  }, [allMovies, history, myList, tvDetailsCache]);

  const fetchInitialData = async () => {
    // 0. Hydrate from Cache for instant load
    let currentPool = allMovies;
    const cachedFeed = localStorage.getItem("nebula-feed-cache");
    if (cachedFeed) {
      try {
        const {
          rows: cRows,
          featured: cFeatured,
          all: cAll,
          timestamp,
        } = JSON.parse(cachedFeed);
        const cacheAge = Date.now() - timestamp;
        // If cache is fresh (< 4 hours), use it to skip initial loader
        if (cacheAge < 1000 * 60 * 60 * 4) {
          setRows(cRows);
          setFeaturedMovies(cFeatured);
          setAllMovies(cAll);
          setIsLoading(false);
          markInitialPagesAsFetched();
          // Return early if cache is very fresh (< 3 hours)
          if (cacheAge < 1000 * 60 * 60 * 3) {
            return;
          }
        }
        currentPool = cAll || [];
      } catch (e) {
        localStorage.removeItem("nebula-feed-cache");
      }
    }

    // Clear fetched category cache since we are doing a full/stale refresh
    clearCategoryPageCache();

    if (isLoading) setIsLoading(true);
    try {
      // 1. Fetch all raw data in parallel
      const apiBase = API_BASE_URL;
      const [
        rawTrending,
        rawPop,
        rawTop,
        rawTV,
        dramaRes,
        pinoyRes,
        sciFiRaw,
        acclaimedRaw,
        actionRaw,
        comedyRaw,
        horrorRaw,
        mysteryRaw,
        docRaw,
        animationRaw,
        awardRaw,
        newRaw,
        gemsRaw,
        fantasyRaw,
        romanceRaw,
        crimeRaw,
        historyRaw,
        familyRaw,
        warRaw,
        thrillerRaw,
        musicRaw,
        westernRaw,
        tvDramasRaw,
        animeRaw,
        hits2010sRaw,
        classics90sRaw,
        leoRaw,
      ] = await Promise.all([
        getTrending("all").catch(() => []),
        getPopularMovies().catch(() => []),
        getTopRatedMovies().catch(() => []),
        getPopularTV().catch(() => []),
        Promise.resolve({ results: [] }),
        Promise.resolve({ results: [] }),
        discoverMedia("movie", {
          with_genres: "878",
          sort_by: "vote_count.desc",
        }).catch(() => []),
        discoverMedia("movie", {
          "vote_average.gte": "8.0",
          "vote_count.gte": "1000",
        }).catch(() => []),
        discoverMedia("movie", { with_genres: "28" }).catch(() => []),
        discoverMedia("movie", { with_genres: "35" }).catch(() => []),
        discoverMedia("movie", { with_genres: "27" }).catch(() => []),
        discoverMedia("movie", { with_genres: "9648" }).catch(() => []),
        discoverMedia("movie", { with_genres: "99" }).catch(() => []),
        discoverMedia("movie", { with_genres: "16" }).catch(() => []),
        discoverMedia("movie", {
          "vote_average.gte": "8.5",
          "vote_count.gte": "500",
        }).catch(() => []),
        discoverMedia("movie", {
          primary_release_year: new Date().getFullYear().toString(),
        }).catch(() => []),
        discoverMedia("movie", {
          "vote_average.gte": "7.5",
          "vote_count.lte": "1000",
          "vote_count.gte": "100",
        }).catch(() => []),
        discoverMedia("movie", { with_genres: "14" }).catch(() => []),
        discoverMedia("movie", { with_genres: "10749" }).catch(() => []),
        discoverMedia("movie", { with_genres: "80" }).catch(() => []),
        discoverMedia("movie", {
          with_genres: "36",
          sort_by: "vote_count.desc",
        }).catch(() => []),
        discoverMedia("movie", { with_genres: "10751" }).catch(() => []),
        discoverMedia("movie", {
          with_genres: "10752",
          "primary_release_date.gte": "1990-01-01",
          sort_by: "vote_count.desc",
        }).catch(() => []),
        discoverMedia("movie", {
          with_genres: "53",
          "primary_release_date.gte": "2000-01-01",
          sort_by: "popularity.desc",
        }).catch(() => []),
        discoverMedia("movie", {
          with_genres: "10402",
          sort_by: "popularity.desc",
        }).catch(() => []),
        discoverMedia("movie", {
          with_genres: "37",
          sort_by: "vote_count.desc",
        }).catch(() => []),
        discoverMedia("tv", {
          with_genres: "18",
          sort_by: "popularity.desc",
        }).catch(() => []),
        discoverMedia("tv", {
          with_genres: "16",
          sort_by: "popularity.desc",
        }).catch(() => []),
        discoverMedia("movie", {
          "primary_release_date.gte": "2010-01-01",
          "primary_release_date.lte": "2019-12-31",
          "vote_count.gte": "500",
          sort_by: "popularity.desc",
        }).catch(() => []),
        discoverMedia("movie", {
          "primary_release_date.gte": "1990-01-01",
          "primary_release_date.lte": "1999-12-31",
          "vote_count.gte": "300",
          sort_by: "vote_count.desc",
        }).catch(() => []),
        (async () => {
          let actorToUse =
            SPOTLIGHT_POOL[
              Math.floor(Date.now() / (1000 * 60 * 60 * 24)) %
                SPOTLIGHT_POOL.length
            ];

          // Try to find a personal connection: Get an actor from history
          if (history.length > 0) {
            try {
              // Take a recent item and get its cast
              const recentItem = history[history.length - 1];
              const recentId = historyRawId(recentItem);
              const recentType = historyType(recentItem);
              const movie =
                currentPool.find((m) => m.id.toString() === recentId) ||
                ((await getMediaBasicInfo(
                  recentId,
                  recentType as "movie" | "tv",
                )) as any);
              if (movie) {
                const { cast } = await getMediaDetails(
                  movie.id,
                  movie.type || "movie",
                  movie.year,
                );
                if (cast && cast.length > 0) {
                  // Pick a top-billed actor that isn't already the default for the day
                  const candidate = cast[0];
                  if (candidate && candidate.id) {
                    actorToUse = {
                      name: candidate.name,
                      id: candidate.id.toString(),
                    };
                  }
                }
              }
            } catch (e) {
              /* Fallback to day-based default */
            }
          }

          return discoverMedia("movie", { with_cast: actorToUse.id }).then(
            (res) => ({
              actor: actorToUse.name,
              actorId: actorToUse.id,
              results: res,
            }),
          );
        })().catch(() => ({
          actor: "Leonardo DiCaprio",
          actorId: "6193",
          results: [],
        })),
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
      const fantasyMovies = hardDedupe(fantasyRaw);
      const romanceMovies = hardDedupe(romanceRaw);
      const crimeMovies = hardDedupe(crimeRaw);
      const historyMovies = hardDedupe(historyRaw);
      const familyMovies = hardDedupe(familyRaw);
      const spotlightData = leoRaw as any;
      const spotlightMovies = hardDedupe(spotlightData.results || []);
      const spotlightActor = spotlightData.actor || "Leonardo DiCaprio";
      const spotlightActorId = spotlightData.actorId || "6193";
      const topDramas = dramaRes.results || [];
      const pinoyDramas = (pinoyRes.results || []).filter(
        (p: any) => !topDramas.some((t: any) => t.id === p.id),
      );

      const warMovies = hardDedupe(warRaw);
      const thrillerMovies = hardDedupe(thrillerRaw);
      const musicMovies = hardDedupe(musicRaw);
      const westernMovies = hardDedupe(westernRaw);
      const tvDramaMovies = hardDedupe(tvDramasRaw);
      const animeMovies = hardDedupe(animeRaw);
      const hits2010sMovies = hardDedupe(hits2010sRaw);
      const classics90sMovies = hardDedupe(classics90sRaw);

      // Create local movie pool from all fetched rows for lookup during row generation
      const localPool = hardDedupe([
        ...currentPool,
        ...trending,
        ...popMovies,
        ...tvShows,
        ...topRated,
        ...topDramas,
        ...pinoyDramas,
        ...sciFiMovies,
        ...acclaimedMovies,
        ...spotlightMovies,
        ...actionMovies,
        ...comedyMovies,
        ...horrorMovies,
        ...mysteryMovies,
        ...documentaryMovies,
        ...animationMovies,
        ...awardMovies,
        ...newMovies,
        ...gemMovies,
        ...fantasyMovies,
        ...romanceMovies,
        ...crimeMovies,
        ...historyMovies,
        ...familyMovies,
        ...warMovies,
        ...thrillerMovies,
        ...musicMovies,
        ...westernMovies,
        ...tvDramaMovies,
        ...animeMovies,
        ...hits2010sMovies,
        ...classics90sMovies,
      ]);

      // 2. Global Deduplication logic (Exclusive rows)
      const globalShown = new Set<string>();
      const topTenItems = trending.slice(0, 10);
      topTenItems.forEach((m) =>
        globalShown.add((m.tmdbId || m.id).toString()),
      );

      const filteredTrending = trending
        .filter((m) => !globalShown.has((m.tmdbId || m.id).toString()))
        .slice(0, 20);
      filteredTrending.forEach((m) =>
        globalShown.add((m.tmdbId || m.id).toString()),
      );

      // 3. Personalized recommendation rows from watch history
      const recommendationRows: any[] = [];
      const historyItems = [...history].reverse().slice(0, 3);
      for (const hist of historyItems) {
        const histRawId = historyRawId(hist);
        const histItemType = historyType(hist);

        let movie = localPool.find(
          (m) => m.id.toString() === histRawId && m.type === histItemType,
        );
        if (!movie)
          movie = (await getMediaBasicInfo(
            histRawId,
            histItemType as "tv" | "movie",
          )) as any;
        if (movie) {
          const recs = await getRecommendations(
            histRawId,
            movie.type || "movie",
          ).catch(() => []);
          const filtered = recs
            .filter((m) => !globalShown.has(m.id.toString()))
            .slice(0, 20);
          if (filtered.length > 5) {
            filtered.forEach((m) => globalShown.add(m.id.toString()));
            const histIdx = historyItems.indexOf(hist);
            const label =
              histIdx === 0
                ? `Since you watched ${movie.title}`
                : `More like ${movie.title}`;
            recommendationRows.push({
              title: label,
              items: filtered,
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
          const extras = items
            .filter((m) => !uniqueItems.some((u) => u.id === m.id))
            .slice(0, 20 - uniqueItems.length);
          extras.forEach((m) => globalShown.add(m.id.toString()));
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
      const fantasyFiltered = filterRow(fantasyMovies);
      const romanceFiltered = filterRow(romanceMovies);
      const crimeFiltered = filterRow(crimeMovies);
      const historyFiltered = filterRow(historyMovies);
      const familyFiltered = filterRow(familyMovies);
      const spotlightFiltered = filterRow(spotlightMovies);

      const warFiltered = filterRow(warMovies);
      const thrillerFiltered = filterRow(thrillerMovies);
      const musicFiltered = filterRow(musicMovies);
      const westernFiltered = filterRow(westernMovies);
      const tvDramaFiltered = filterRow(tvDramaMovies);
      const animeFiltered = filterRow(animeMovies);
      const hits2010sFiltered = filterRow(hits2010sMovies);
      const classics90sFiltered = filterRow(classics90sMovies);

      const filteredPop = filterRow(popMovies);
      const filteredTV = filterRow(tvShows);
      const filteredTop = filterRow(topRated);

      // 3b. Continue Watching Row — collapse episodes to 1 card per title
      const progressData = JSON.parse(
        localStorage.getItem("nebula-progress") || "{}",
      );
      // Group all progress keys by base ID (strip -S1E1 suffixes)
      const progressByTitle: Record<string, { key: string; val: any }> = {};
      for (const [key, val] of Object.entries(progressData)) {
        const baseId = key.toString().split("-")[0];
        // Keep the entry with the highest timestamp (most recently watched episode)
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
      for (const [baseId, { key, val }] of sortedProgressEntries) {
        const type = key.includes("-") ? "tv" : "movie";
        let movie = localPool.find(
          (m) => m.id.toString() === baseId && (m.type || "movie") === type,
        );
        if (!movie) movie = (await getMediaBasicInfo(baseId, type)) as any;
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

      // 3c. My List Row
      const myListItems = localPool
        .filter((m) => myList.includes(m.id.toString()))
        .slice(0, 20);

      // 3d. User Genre Preference Profile
      const genreCounts: Record<string, number> = {};
      [...history, ...myList].forEach((item) => {
        const id = typeof item === "object" ? item.id : item;
        const type = typeof item === "object" ? item.type : "movie";
        const m = localPool.find(
          (item) => item.id.toString() === id.toString() && item.type === type,
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

      const dynamicGenreRows = [
        { title: "Critically Acclaimed: Missions", items: acclaimedFiltered },
        { title: "Cinematic Masterpieces", items: filteredTop.slice(0, 15) },
        { title: "Award-Winning Hits", items: awardFiltered },
        { title: "Action Packed Missions", items: actionFiltered },
        { title: "Hidden Gems", items: gemFiltered },
        { title: "Comedy Gold", items: comedyFiltered },
        { title: "Scary Nights (Horror)", items: horrorFiltered },
        { title: "Mystery & Suspense", items: mysteryFiltered },
        { title: "Animation Favorites", items: animationFiltered },
        { title: "Sci-Fi Spectacles", items: sciFiFiltered },
        { title: "Documentary Collection", items: docFiltered },
        { title: "Epic Fantasy Worlds", items: fantasyFiltered },
        { title: "Feel-Good Romance", items: romanceFiltered },
        { title: "Crime & Investigation", items: crimeFiltered },
        { title: "Historical Epics", items: historyFiltered },
        { title: "Family Movie Night", items: familyFiltered },
        { title: "Top Rated Movies", items: filteredTop.slice(15) },
        { title: "War & Military", items: warFiltered },
        { title: "Heart-Pounding Thrillers", items: thrillerFiltered },
        { title: "Musical & Music", items: musicFiltered },
        { title: "Western Frontier", items: westernFiltered },
        { title: "TV Dramas", items: tvDramaFiltered },
        { title: "Anime Series", items: animeFiltered },
        { title: "2010s Hits", items: hits2010sFiltered },
        { title: "90s Classics", items: classics90sFiltered },
      ]
        .filter((r) => r.items.length > 0)
        .sort(() => Math.random() - 0.5);

      const initialRows = [
        ...(continueWatchingItems.length > 0
          ? [{ title: "Continue Watching", items: continueWatchingItems }]
          : []),
        { title: "Trending Missions: Global Feed", items: filteredTrending },
        ...(myListItems.length > 0
          ? [{ title: "My Secure Records", items: myListItems }]
          : []),
        ...recommendationRows,
        {
          title: "Watch It Again",
          items: history
            .map((item) => {
              const rid = historyRawId(item);
              const rtype = historyType(item);
              const movie = localPool.find(
                (m) => m.id.toString() === rid && (m.type || "movie") === rtype,
              );
              if (!movie) return null;
              return isWatchItAgainItem(movie, progressData, tvDetailsCache)
                ? movie
                : null;
            })
            .filter(Boolean)
            .slice(0, 10),
        },
        { title: "Popular Asian Dramas", items: topDramas, isDramaRow: true },
        ...topGenres.map((g) => {
          const gId = Object.entries(GENRE_MAP).find(
            ([_, name]) => name === g,
          )?.[0];
          const genreItems = filterRow(
            localPool.filter((m) => m.genre.includes(g)),
          );
          return {
            title: `Because you like ${g}`,
            items: genreItems,
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
          };
        }),
        (() => {
          const pinoy1 = pinoyDramas
            .filter((m) => !globalShown.has(m.id.toString()))
            .slice(0, 10);
          pinoy1.forEach((m) => globalShown.add(m.id.toString()));
          return {
            title: "Trending in your Sector: Philippines",
            items: pinoy1,
            isDramaRow: true,
          };
        })(),
        { title: "New Intel: 2025 Releases", items: newFiltered },
        {
          title: `Actor Spotlight: ${spotlightActor}`,
          items: spotlightFiltered,
          config: {
            mediaType: "movie",
            discoverParams: {
              with_cast: spotlightActorId,
              sort_by: "popularity.desc",
            },
            filterFn: () => true,
          },
        },
        { title: "Bingeworthy TV Shows", items: filteredTV },
        { title: "Popular Movies", items: filteredPop },
        ...dynamicGenreRows,
        (() => {
          const pinoy2 = pinoyDramas
            .filter((m) => !globalShown.has(m.id.toString()))
            .slice(0, 20);
          pinoy2.forEach((m) => globalShown.add(m.id.toString()));
          return {
            title: "Pinoy Movies & TV",
            items: pinoy2,
            isDramaRow: true,
          };
        })(),
      ].filter((r) => r.items?.length > 0);

      // 4. Set Initial State
      const initialFeatured = trending.slice(0, 5);
      setFeaturedMovies(initialFeatured);
      setRows(initialRows);

      // 5. Enrich Spotlight & Top 10 immediately for logos
      const [enrichedTop, enrichedFeatured] = await Promise.all([
        enrichMoviesWithMetadata(topTenItems),
        enrichMoviesWithMetadata(initialFeatured),
      ]);

      setFeaturedMovies(enrichedFeatured);
      const finalPool = hardDedupe([
        ...enrichedTop,
        ...enrichedFeatured,
        ...trending,
        ...popMovies,
        ...tvShows,
        ...topRated,
        ...topDramas,
        ...pinoyDramas,
        ...sciFiMovies,
        ...acclaimedMovies,
        ...spotlightMovies,
        ...actionMovies,
        ...comedyMovies,
        ...horrorMovies,
        ...mysteryMovies,
        ...documentaryMovies,
        ...animationMovies,
        ...awardMovies,
        ...newMovies,
        ...gemMovies,
        ...fantasyMovies,
        ...romanceMovies,
        ...crimeMovies,
        ...historyMovies,
        ...familyMovies,
        ...warMovies,
        ...thrillerMovies,
        ...musicMovies,
        ...westernMovies,
        ...tvDramaMovies,
        ...animeMovies,
        ...hits2010sMovies,
        ...classics90sMovies,
      ]);
      setAllMovies(finalPool);
      markInitialPagesAsFetched();

      // 6. Background enrichment for all rows (Skip Dramas as requested)
      initialRows.forEach(async (row) => {
        if (row.items.length === 0 || row.isDramaRow) return;
        const enriched = await enrichMoviesWithMetadata(row.items.slice(0, 10));
        setRows((prev) => {
          const updated = [...prev];
          const targetIndex = updated.findIndex((r) => r.title === row.title);
          if (targetIndex !== -1) {
            updated[targetIndex] = {
              ...updated[targetIndex],
              items: [...enriched, ...row.items.slice(10)],
            };
          }
          return updated;
        });
      });

      // 7. Save to Cache for next session
      try {
        localStorage.setItem(
          "nebula-feed-cache",
          JSON.stringify({
            rows: initialRows,
            featured: initialFeatured,
            all: finalPool,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        // If quota exceeded, clear and skip
        localStorage.removeItem("nebula-feed-cache");
      }
    } catch (err) {
      console.error("Data acquisition failure", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setVisibleCount(12);
    setDramaPage(1); // Reset pagination on category/tab change
  }, [viewingCategory, activeTab, selectedRegion]);

  const loadMore = () => {
    setDramaPage((prev) => prev + 1);
    setVisibleCount((prev) => prev + 12);
  };

  const getCategoryMovies = useCallback(() => {
    switch (viewingCategory) {
      case "Movies":
      case "TV Shows":
        // Now handled by ROW_FETCH_CONFIG below for pagination support
        break;
      case "Library": {
        const myListIdSet = new Set(myList.map((id) => id.toString()));
        const histCompositeSet = new Set(history.map(historyId));
        return allMovies.filter(
          (m) =>
            myListIdSet.has(m.id.toString()) ||
            histCompositeSet.has(`${m.type || "movie"}_${m.id}`),
        );
      }
      case "My Secure Records": {
        const myListIds = new Set(myList.map((id) => id.toString()));
        return allMovies.filter((m) => myListIds.has(m.id.toString()));
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
      const matches = allMovies.filter(config.filterFn);
      if (row) {
        // Netflix Style: Ensure items from the row stay at the top of the grid
        return hardDedupe([...row.items, ...matches]);
      }
      return matches;
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
          const results = await searchMedia(searchQuery);
          if (controller.signal.aborted) return;
          // Show results immediately, enrich in background
          setSearchResults(results);
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
            setIsLoading(false);
          }
        }
      } else {
        searchAbortRef.current?.abort();
        setSearchResults([]);
        setIsLoading(false);
      }
    }, 250); // Reduced from 400ms for snappier feel
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const toggleMyList = (movieId: any) => {
    const mid = movieId.toString();
    setMyList((prev) => {
      const isAlreadyIn = prev.some((id) => id.toString() === mid);
      if (isAlreadyIn) {
        return prev.filter((id) => id.toString() !== mid);
      } else {
        return [...prev, mid];
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

      const parseMyListId = (item: string) => {
        if (item.includes("_")) {
          const parts = item.split("_");
          return { id: parts[1], type: parts[0] };
        }
        return { id: item, type: "movie" };
      };

      const missingMyList = myList
        .map((item) => {
          const parsed = parseMyListId(item.toString());
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
            if (config.type === "recommendations" && config.targetId) {
              more = await getRecommendations(
                config.targetId,
                config.mediaType as any,
                dramaPage.toString(),
              );
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
              setRows((prev) =>
                prev.map((r) =>
                  r.title === viewingCategory
                    ? { ...r, items: hardDedupe([...r.items, ...more]) }
                    : r,
                ),
              );
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
    return source
      .filter((m) => {
        const matchesGenre =
          selectedGenre === "All" || m.genre.includes(selectedGenre);
        const matchesMood =
          activeMood === "All Moods" ||
          m.genre
            .toLowerCase()
            .includes(activeMood.toLowerCase().split(" ")[0]);
        // Regional filter for Dramas
        const mRegion = (m as any).countryId?.toString();
        const matchesRegion =
          selectedRegion === "All" || mRegion === selectedRegion;

        if (activeTab === "my-list") return myList.includes(m.id);
        return matchesGenre && matchesMood && matchesRegion;
      })
      .sort((a, b) => {
        if (sortBy === "IMDB Rating") return (b.imdb || 0) - (a.imdb || 0);
        return sortBy === "Release Date" ? b.year - a.year : 0;
      });
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
    const flat = rows.flatMap((r) => r.items);

    // Deduplicate items in flat to make sure recommendations has unique movies
    const seen = new Set();
    const uniqueFlat = [];
    for (const m of flat) {
      const idStr = m?.id?.toString();
      if (idStr && !seen.has(idStr)) {
        seen.add(idStr);
        uniqueFlat.push(m);
      }
    }

    // Stable sort by a hash of the movie ID so it is stable but looks shuffled
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    };

    return [...uniqueFlat]
      .sort((a, b) => {
        const hashA = hashCode(a.id?.toString() || "");
        const hashB = hashCode(b.id?.toString() || "");
        return hashA - hashB;
      })
      .slice(0, 20);
  }, [rows]);

  const markAsWatched = (
    id: string | number,
    type: "movie" | "tv" = "movie",
  ) => {
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
    },
    refs: {
      searchInputRef,
    },
  };
}
