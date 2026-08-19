import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Loader2,
  X,
  ArrowRight,
  ArrowUp,
  Clock,
  TrendingUp,
  Mic,
  MicOff,
  Sparkles,
  SlidersHorizontal,
  Flame,
  Star,
  Calendar,
  History,
  ArrowUpDown,
  ChevronDown,
  Check,
  Film,
  Tv,
  RotateCcw,
  Compass,
  Users,
  Clapperboard,
} from "lucide-react";
import { topSearches } from "../data/constants";
import { handleImageError } from "../utils/helpers";
import {
  isAnimeMedia,
  filterAndSortSearchResults,
  discoverMediaWithFilters,
  NebulaMovie,
  DiscoverFilters,
} from "../services/tmdb";

const RECENT_KEY = "nebula-recent-searches";
const MAX_RECENT = 8;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  const existing = getRecentSearches().filter(
    (t) => t.toLowerCase() !== term.toLowerCase(),
  );
  const updated = [term, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function removeRecentSearch(term: string) {
  const updated = getRecentSearches().filter(
    (t) => t.toLowerCase() !== term.toLowerCase(),
  );
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function clearAllRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

// ── Filter Constants ────────────────────────────────────────────────────────
export const SORT_OPTIONS: {
  id: DiscoverFilters["sortBy"];
  label: string;
  shortLabel: string;
  icon: any;
}[] = [
  {
    id: "relevance",
    label: "Most Relevant",
    shortLabel: "Relevant",
    icon: Sparkles,
  },
  {
    id: "most_watched",
    label: "Most Watched / Popular",
    shortLabel: "Most Watched",
    icon: Flame,
  },
  {
    id: "rating",
    label: "Highest Rated",
    shortLabel: "Top Rated",
    icon: Star,
  },
  {
    id: "newest",
    label: "Newest Releases",
    shortLabel: "Newest",
    icon: Calendar,
  },
  {
    id: "oldest",
    label: "Oldest / Classics",
    shortLabel: "Oldest",
    icon: History,
  },
  {
    id: "title",
    label: "Alphabetical (A–Z)",
    shortLabel: "A–Z",
    icon: ArrowUpDown,
  },
];

export const YEAR_OPTIONS = [
  { id: "all", label: "All Years" },
  { id: "2026", label: "2026" },
  { id: "2025", label: "2025" },
  { id: "2024", label: "2024" },
  { id: "2023", label: "2023" },
  { id: "2020-2022", label: "2020–2022" },
  { id: "2010s", label: "2010s" },
  { id: "2000s", label: "2000s" },
  { id: "90s", label: "90s" },
  { id: "classic", label: "Classic (<1990)" },
];

export const RATING_OPTIONS = [
  { id: 0, label: "Any Rating" },
  { id: 8.5, label: "★ 8.5+ (Masterpiece)" },
  { id: 8.0, label: "★ 8.0+ (Acclaimed)" },
  { id: 7.5, label: "★ 7.5+ (Great)" },
  { id: 7.0, label: "★ 7.0+ (Good)" },
  { id: 6.0, label: "★ 6.0+" },
];

export const GENRE_OPTIONS = [
  "All",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "War",
  "Western",
  "Anime",
];

// ── Isolated Typewriter Input Component ──────────────────────────────────────
const TypewriterInput = React.memo(
  React.forwardRef<
    HTMLInputElement,
    {
      value: string;
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
      onFocus: () => void;
      onBlur: () => void;
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
      isFocused: boolean;
      isOpen: boolean;
    }
  >(
    (
      { value, onChange, onFocus, onBlur, onKeyDown, isFocused, isOpen },
      ref,
    ) => {
      const [placeholder, setPlaceholder] = useState("Search...");
      const termIdx = useRef(0);
      const charIdx = useRef(0);
      const isDeleting = useRef(false);
      const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

      useEffect(() => {
        // Pause typewriter animation when focused or non-empty
        if (!isOpen || value.trim().length > 0 || isFocused) {
          setPlaceholder("Search movies, TV series, or actors...");
          if (timerRef.current) clearTimeout(timerRef.current);
          return;
        }

        const tick = () => {
          const term = `Search ${topSearches[termIdx.current]}...`;
          if (!isDeleting.current) {
            charIdx.current = Math.min(charIdx.current + 1, term.length);
            setPlaceholder(term.slice(0, charIdx.current));
            if (charIdx.current === term.length) {
              timerRef.current = setTimeout(() => {
                isDeleting.current = true;
                tick();
              }, 2200);
              return;
            }
          } else {
            charIdx.current = Math.max(charIdx.current - 1, 0);
            setPlaceholder(term.slice(0, charIdx.current));
            if (charIdx.current === 0) {
              isDeleting.current = false;
              termIdx.current = (termIdx.current + 1) % topSearches.length;
            }
          }
          const speed = isDeleting.current ? 35 : 65;
          timerRef.current = setTimeout(tick, speed);
        };

        timerRef.current = setTimeout(tick, 800);
        return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
        };
      }, [isOpen, value, isFocused]);

      return (
        <input
          ref={ref}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="w-full bg-white/[0.03] border-b-2 border-white/10 py-3.5 sm:py-7 pl-9 sm:pl-20 pr-20 sm:pr-36 text-lg sm:text-3xl font-black placeholder:text-white/20 focus:outline-none focus:border-nebula-cyan/70 transition-colors duration-300 caret-nebula-cyan uppercase tracking-tighter italic"
        />
      );
    },
  ),
);

TypewriterInput.displayName = "TypewriterInput";

// ── Memoized Movie / TV Card Component ────────────────────────────────────────
const SearchResultCard = React.memo<{
  movie: any;
  index: number;
  isSelected: boolean;
  onSelectMovie: (movie: any) => void;
}>(({ movie, index, isSelected, onSelectMovie }) => {
  const isAnime = isAnimeMedia(movie);
  const isDoc =
    movie.isDocumentary ||
    (movie.genre && movie.genre.toLowerCase().includes("documentary"));

  // Badge label and styling
  const badgeLabel = isAnime
    ? "Anime"
    : isDoc
      ? "Doc"
      : movie.type === "tv"
        ? "TV"
        : "Film";

  const badgeBg = isAnime
    ? "bg-purple-900/80 border-purple-500/40 text-purple-200"
    : isDoc
      ? "bg-amber-950/80 border-amber-500/40 text-amber-200"
      : movie.type === "tv"
        ? "bg-blue-950/80 border-blue-500/40 text-blue-200"
        : "bg-black/70 border-white/10 text-white/90";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(index * 0.025, 0.25),
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onSelectMovie(movie)}
      className={`group cursor-pointer rounded-xl transition-all duration-300 relative ${
        isSelected
          ? "ring-2 ring-nebula-cyan scale-[1.03] shadow-[0_0_30px_rgba(0,229,255,0.35)] z-20"
          : "hover:scale-[1.02]"
      }`}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 group-hover:border-nebula-cyan/50 bg-white/[0.02]">
        <img
          src={movie.image}
          alt={movie.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:blur-[1px] group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          loading="lazy"
        />

        {/* Type badge in top-left */}
        <div
          className={`absolute top-0 left-0 z-20 pointer-events-none backdrop-blur-md text-[7px] sm:text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-br-md sm:rounded-br-lg border-r border-b leading-none ${badgeBg}`}
        >
          {badgeLabel}
        </div>

        {/* Rating badge in top-right */}
        {movie.imdb && movie.imdb > 0 && (
          <div className="absolute top-0 right-0 z-20 pointer-events-none bg-black/70 backdrop-blur-md text-nebula-cyan text-[7px] sm:text-[8px] font-black tracking-wider px-2 py-1 rounded-bl-md sm:rounded-bl-lg border-l border-b border-white/10 leading-none">
            ★ {Number(movie.imdb).toFixed(1)}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />

        {/* Hover Info */}
        <div className="absolute inset-0 flex flex-col justify-end p-2.5 sm:p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <h4 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-tight line-clamp-2 mb-1 italic">
            {movie.title}
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] font-bold text-nebula-cyan border border-nebula-cyan/30 px-1 py-0.5 rounded uppercase">
              {badgeLabel}
            </span>
            {movie.year && (
              <span className="text-[8px] font-bold text-white/60">
                {movie.year}
              </span>
            )}
            {movie.genre && (
              <span className="text-[8px] text-white/40 font-medium truncate max-w-[80px]">
                {movie.genre.split(",")[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

SearchResultCard.displayName = "SearchResultCard";

// ── Memoized Actor Card Component ──────────────────────────────────────────────
const ActorCard = React.memo<{
  actor: any;
  isSelected: boolean;
  onSelectActor: (id: string | number) => void;
}>(({ actor, isSelected, onSelectActor }) => {
  return (
    <div
      onClick={() => onSelectActor(actor.id)}
      className={`flex flex-col items-center gap-2 group cursor-pointer shrink-0 p-1.5 rounded-2xl transition-all duration-300 ${
        isSelected
          ? "ring-2 ring-nebula-cyan bg-nebula-cyan/10 scale-105 shadow-[0_0_20px_rgba(0,229,255,0.25)]"
          : ""
      }`}
    >
      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border border-white/10 p-0.5 group-hover:border-nebula-cyan transition-all duration-300 overflow-hidden relative">
        <img
          src={actor.avatar}
          className="w-full h-full rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          alt={actor.name}
          onError={handleImageError}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-nebula-cyan/0 group-hover:bg-nebula-cyan/5 transition-colors rounded-full" />
      </div>
      <div className="text-center w-16 sm:w-22">
        <p className="text-[10px] sm:text-xs font-bold text-white group-hover:text-nebula-cyan transition-colors line-clamp-1">
          {actor.name}
        </p>
        <p className="text-[9px] font-medium text-dim uppercase tracking-wider mt-0.5 line-clamp-1">
          {actor.role || "Actor"}
        </p>
      </div>
    </div>
  );
});

ActorCard.displayName = "ActorCard";

// ── Skeleton Loader Grid Component ─────────────────────────────────────────────
const SkeletonGrid = React.memo(() => (
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-4 gap-2 sm:gap-4 animate-pulse">
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={`skel-${i}`}
        className="aspect-[2/3] rounded-xl bg-white/[0.04] border border-white/5 flex flex-col justify-end p-3 relative overflow-hidden"
      >
        <div className="w-3/4 h-3 bg-white/10 rounded mb-2" />
        <div className="w-1/2 h-2 bg-white/5 rounded" />
      </div>
    ))}
  </div>
));

SkeletonGrid.displayName = "SkeletonGrid";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  searchPeopleResults: any[];
  onSelectMovie: (movie: any) => void;
  onSelectActor: (actorId: string | number) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  isLoading?: boolean;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  searchResults,
  searchPeopleResults,
  onSelectMovie,
  onSelectActor,
  searchInputRef,
  isLoading,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // ── Engine Filter States ──────────────────────────────────────────────────
  const [mediaTypeFilter, setMediaTypeFilter] = useState<
    "all" | "movie" | "tv" | "anime" | "people"
  >("all");
  const [selectedSort, setSelectedSort] =
    useState<DiscoverFilters["sortBy"]>("relevance");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [selectedRating, setSelectedRating] = useState<number>(0);

  // Dropdown / Drawer states
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isRatingDropdownOpen, setIsRatingDropdownOpen] = useState(false);

  // Discovery mode results (when filters are active without text query)
  const [discoverResults, setDiscoverResults] = useState<NebulaMovie[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isListening, setIsListening] = useState(false);

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Load recent searches when open
  useEffect(() => {
    if (isOpen) setRecentSearches(getRecentSearches());
  }, [isOpen]);

  // Check if any non-default filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      mediaTypeFilter !== "all" ||
      selectedSort !== "relevance" ||
      selectedYear !== "all" ||
      selectedGenre !== "All" ||
      selectedRating > 0
    );
  }, [
    mediaTypeFilter,
    selectedSort,
    selectedYear,
    selectedGenre,
    selectedRating,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (mediaTypeFilter !== "all") count++;
    if (selectedSort !== "relevance") count++;
    if (selectedYear !== "all") count++;
    if (selectedGenre !== "All") count++;
    if (selectedRating > 0) count++;
    return count;
  }, [
    mediaTypeFilter,
    selectedSort,
    selectedYear,
    selectedGenre,
    selectedRating,
  ]);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setMediaTypeFilter("all");
    setSelectedSort("relevance");
    setSelectedYear("all");
    setSelectedGenre("All");
    setSelectedRating(0);
    setIsSortDropdownOpen(false);
    setIsYearDropdownOpen(false);
    setIsRatingDropdownOpen(false);
  }, []);

  // Reset focus index when query or filters change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [
    searchQuery,
    mediaTypeFilter,
    selectedSort,
    selectedYear,
    selectedGenre,
    selectedRating,
  ]);

  // Voice Search integration (Web Speech API)
  const handleVoiceSearch = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search is not supported in your browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchQuery(transcript);
          searchInputRef.current?.focus();
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [setSearchQuery, searchInputRef]);

  // ── Discovery Mode Fetcher (when searching via filters without query) ────────
  useEffect(() => {
    if (!isOpen) return;

    // If there is a text query, parent useAppState performs searchMedia
    if (searchQuery.trim().length > 0) {
      setDiscoverResults([]);
      setIsDiscovering(false);
      return;
    }

    // When no query is typed, but user has active filters -> trigger discover
    if (hasActiveFilters && mediaTypeFilter !== "people") {
      const controller = new AbortController();
      setIsDiscovering(true);

      discoverMediaWithFilters(
        {
          type: mediaTypeFilter,
          sortBy: selectedSort === "relevance" ? "popularity" : selectedSort,
          year: selectedYear,
          genre: selectedGenre,
          minRating: selectedRating,
          includeAdult: false,
        },
        controller.signal,
      )
        .then((items) => {
          if (!controller.signal.aborted) {
            setDiscoverResults(items);
            setIsDiscovering(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setDiscoverResults([]);
            setIsDiscovering(false);
          }
        });

      return () => controller.abort();
    } else {
      setDiscoverResults([]);
      setIsDiscovering(false);
    }
  }, [
    isOpen,
    searchQuery,
    hasActiveFilters,
    mediaTypeFilter,
    selectedSort,
    selectedYear,
    selectedGenre,
    selectedRating,
  ]);

  // ── Compute Filtered & Sorted Media Results ────────────────────────────────
  const hasQuery = searchQuery.trim().length > 0;

  const filteredMediaResults = useMemo(() => {
    if (hasQuery) {
      return filterAndSortSearchResults(searchResults, {
        type: mediaTypeFilter,
        sortBy: selectedSort,
        year: selectedYear,
        genre: selectedGenre,
        minRating: selectedRating,
        includeAdult: false,
      });
    }

    if (hasActiveFilters && mediaTypeFilter !== "people") {
      return discoverResults;
    }

    return [];
  }, [
    hasQuery,
    hasActiveFilters,
    searchResults,
    discoverResults,
    mediaTypeFilter,
    selectedSort,
    selectedYear,
    selectedGenre,
    selectedRating,
  ]);

  // Flatten active result items for keyboard navigation
  const navigableItems = useMemo(() => {
    if (!hasQuery && !hasActiveFilters) {
      return topSearches.map((term) => ({ type: "suggestion", value: term }));
    }
    const items: any[] = [];
    if (
      (mediaTypeFilter === "all" || mediaTypeFilter === "people") &&
      searchPeopleResults.length > 0 &&
      hasQuery
    ) {
      searchPeopleResults.forEach((actor) =>
        items.push({ type: "actor", value: actor }),
      );
    }
    if (mediaTypeFilter !== "people" && filteredMediaResults.length > 0) {
      filteredMediaResults.forEach((movie) =>
        items.push({ type: "movie", value: movie }),
      );
    }
    return items;
  }, [
    hasQuery,
    hasActiveFilters,
    mediaTypeFilter,
    searchPeopleResults,
    filteredMediaResults,
  ]);

  // Selection handlers
  const handleSelectMovie = useCallback(
    (movie: any) => {
      if (searchQuery.trim()) saveRecentSearch(searchQuery.trim());
      onSelectMovie(movie);
      onClose();
    },
    [searchQuery, onSelectMovie, onClose],
  );

  const handleSelectActor = useCallback(
    (id: string | number) => {
      if (searchQuery.trim()) saveRecentSearch(searchQuery.trim());
      onSelectActor(id);
      onClose();
    },
    [searchQuery, onSelectActor, onClose],
  );

  const handleSuggestionClick = useCallback(
    (term: string) => {
      setSearchQuery(term);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    },
    [setSearchQuery, searchInputRef],
  );

  const handleRemoveRecent = useCallback(
    (term: string, e: React.MouseEvent) => {
      e.stopPropagation();
      removeRecentSearch(term);
      setRecentSearches(getRecentSearches());
    },
    [],
  );

  const handleClearAllRecent = useCallback(() => {
    clearAllRecentSearches();
    setRecentSearches([]);
  }, []);

  // Keyboard navigation & hotkeys
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (
          isSortDropdownOpen ||
          isYearDropdownOpen ||
          isRatingDropdownOpen ||
          isFilterDrawerOpen
        ) {
          setIsSortDropdownOpen(false);
          setIsYearDropdownOpen(false);
          setIsRatingDropdownOpen(false);
          setIsFilterDrawerOpen(false);
          return;
        }
        onClose();
        return;
      }

      if (navigableItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < navigableItems.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : navigableItems.length - 1,
        );
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        const item = navigableItems[focusedIndex];
        if (!item) return;
        if (item.type === "movie") handleSelectMovie(item.value);
        else if (item.type === "actor") handleSelectActor(item.value.id);
        else if (item.type === "suggestion") handleSuggestionClick(item.value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isOpen,
    focusedIndex,
    navigableItems,
    isSortDropdownOpen,
    isYearDropdownOpen,
    isRatingDropdownOpen,
    isFilterDrawerOpen,
    handleSelectMovie,
    handleSelectActor,
    handleSuggestionClick,
    onClose,
  ]);

  // Track scroll
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onScroll = () => setScrolledDown(el.scrollTop > 300);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const raf = requestAnimationFrame(() => {
        timer = setTimeout(() => {
          try {
            searchInputRef.current?.focus({ preventScroll: true });
          } catch {
            searchInputRef.current?.focus();
          }
        }, 100);
      });
      return () => {
        cancelAnimationFrame(raf);
        if (timer) clearTimeout(timer);
      };
    } else {
      setScrolledDown(false);
      setIsFocused(false);
      setFocusedIndex(-1);
      setIsFilterDrawerOpen(false);
      setIsSortDropdownOpen(false);
      setIsYearDropdownOpen(false);
      setIsRatingDropdownOpen(false);
    }
  }, [isOpen, searchInputRef]);

  const isCurrentLoading = isLoading || isDiscovering;
  const showRecent = !hasQuery && !hasActiveFilters && recentSearches.length > 0;
  const showDiscoveryGrid = hasQuery || hasActiveFilters;

  const hasNoResults =
    showDiscoveryGrid &&
    !isCurrentLoading &&
    filteredMediaResults.length === 0 &&
    (mediaTypeFilter === "people" || searchPeopleResults.length === 0);

  // Close dropdowns when clicking outside
  const closeAllDropdowns = () => {
    setIsSortDropdownOpen(false);
    setIsYearDropdownOpen(false);
    setIsRatingDropdownOpen(false);
  };

  const currentSortObj =
    SORT_OPTIONS.find((s) => s.id === selectedSort) || SORT_OPTIONS[0];
  const currentYearObj =
    YEAR_OPTIONS.find((y) => y.id === selectedYear) || YEAR_OPTIONS[0];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="search-overlay"
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={closeAllDropdowns}
            className="fixed inset-0 z-[500] bg-obsidian/98 backdrop-blur-md flex flex-col items-center pt-[1.5vh] sm:pt-[5vh] overflow-y-auto custom-scrollbar transform-gpu"
            style={{ willChange: "opacity" }}
          >
            <div
              className="w-full max-w-[1300px] px-3 sm:px-8 pb-32 pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Search Input Bar ────────────────────────────────────────── */}
              <div
                className={`relative mb-3 sm:mb-5 flex items-center gap-2 sm:gap-3 search-glow-underline ${
                  isFocused ? "glow-active" : ""
                }`}
              >
                <div className="relative flex-1">
                  {/* Left Search Icon / Loading Spinner */}
                  <div className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 flex items-center gap-4 z-10 pointer-events-none">
                    {isCurrentLoading ? (
                      <Loader2
                        size={20}
                        className="animate-spin text-nebula-cyan sm:w-6 sm:h-6"
                      />
                    ) : (
                      <Search
                        size={20}
                        className="text-nebula-cyan sm:w-6 sm:h-6"
                      />
                    )}
                  </div>

                  {/* Isolated Typewriter Input */}
                  <TypewriterInput
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        searchQuery.trim() &&
                        focusedIndex < 0
                      ) {
                        saveRecentSearch(searchQuery.trim());
                        setRecentSearches(getRecentSearches());
                      }
                    }}
                    isFocused={isFocused}
                    isOpen={isOpen}
                  />

                  {/* Right Action Icons (Voice Mic, Clear, ESC Badge) */}
                  <div className="absolute right-2.5 sm:right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2">
                    {/* Voice Mic Button */}
                    <button
                      onClick={handleVoiceSearch}
                      type="button"
                      className={`p-1.5 sm:p-2 rounded-full border transition-all duration-300 ${
                        isListening
                          ? "bg-nebula-red/20 border-nebula-red text-nebula-red animate-pulse shadow-[0_0_15px_rgba(255,42,109,0.5)]"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-nebula-cyan hover:border-nebula-cyan/30"
                      }`}
                      aria-label="Voice Search"
                      title="Voice Search"
                    >
                      {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>

                    {/* Clear Query Button */}
                    {hasQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}

                    {/* ESC key badge */}
                    <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-md border border-white/10 text-[9px] font-black text-white/40 tracking-widest uppercase">
                      ESC
                    </div>
                  </div>
                </div>

                {/* Mobile Cancel */}
                <button
                  onClick={onClose}
                  className="sm:hidden text-nebula-cyan font-black text-xs uppercase tracking-widest px-2 py-2 min-w-[52px] text-center cursor-pointer shrink-0"
                >
                  Cancel
                </button>
              </div>

              {/* ── Content + Sidebar Layout ────────────────────────────────── */}
              <div className="flex flex-col xl:flex-row gap-6 xl:gap-10">
                {/* ── Left Column: Filter Controls + Results ─────────────────── */}
                <div className="flex-1 min-w-0">
                  {/* ── Filter Controls Bar ──────────────────────────────────── */}
                  <div className="mb-3 sm:mb-4">
                    {/* ── Single Unified Control Bar ──────────────────────────── */}
                    <div className="flex items-center gap-2">
                      {/* Segmented Media Type Capsule — scrolls internally on mobile, shrinks to fit */}
                      <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-inner min-w-0 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setMediaTypeFilter("all")}
                      className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-250 cursor-pointer whitespace-nowrap ${
                        mediaTypeFilter === "all"
                          ? "bg-nebula-cyan text-obsidian font-black shadow-[0_0_14px_rgba(0,229,255,0.4)]"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setMediaTypeFilter("movie")}
                      className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-250 cursor-pointer whitespace-nowrap ${
                        mediaTypeFilter === "movie"
                          ? "bg-nebula-cyan text-obsidian font-black shadow-[0_0_14px_rgba(0,229,255,0.4)]"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Film size={11} className="sm:w-3 sm:h-3" />
                      Movies
                    </button>
                    <button
                      onClick={() => setMediaTypeFilter("tv")}
                      className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-250 cursor-pointer whitespace-nowrap ${
                        mediaTypeFilter === "tv"
                          ? "bg-nebula-cyan text-obsidian font-black shadow-[0_0_14px_rgba(0,229,255,0.4)]"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Tv size={11} className="sm:w-3 sm:h-3" />
                      Series
                    </button>
                    <button
                      onClick={() => setMediaTypeFilter("anime")}
                      className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-250 cursor-pointer whitespace-nowrap ${
                        mediaTypeFilter === "anime"
                          ? "bg-nebula-cyan text-obsidian font-black shadow-[0_0_14px_rgba(0,229,255,0.4)]"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Clapperboard size={11} className="sm:w-3 sm:h-3" />
                      Anime
                    </button>
                    {hasQuery && (
                      <button
                        onClick={() => setMediaTypeFilter("people")}
                        className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-250 cursor-pointer whitespace-nowrap ${
                          mediaTypeFilter === "people"
                            ? "bg-nebula-cyan text-obsidian font-black shadow-[0_0_14px_rgba(0,229,255,0.4)]"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Users size={11} className="sm:w-3 sm:h-3" />
                        Cast ({searchPeopleResults.length})
                      </button>
                    )}
                  </div>

                  {/* Divider dot — visual separator between media tabs and filter controls */}
                  <div className="w-px h-5 bg-white/10 shrink-0 hidden lg:block" />

                  {/* ── Desktop Inline Filter Pills (hidden on mobile, shown on lg+) ── */}
                  <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                    {/* Sort Dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSortDropdownOpen((prev) => !prev);
                          setIsYearDropdownOpen(false);
                          setIsRatingDropdownOpen(false);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-md ${
                          selectedSort !== "relevance"
                            ? "bg-nebula-cyan/15 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                            : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        {React.createElement(currentSortObj.icon, {
                          size: 12,
                          className:
                            selectedSort !== "relevance"
                              ? "text-nebula-cyan"
                              : "text-white/60",
                        })}
                        <span>{currentSortObj.shortLabel}</span>
                        <ChevronDown size={11} className="opacity-60" />
                      </button>
                      {isSortDropdownOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-2 w-52 bg-[#0c0d12]/98 border border-cyan-500/20 rounded-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-[550] space-y-0.5 animate-in fade-in zoom-in-95 duration-150 origin-top-left"
                        >
                          <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/35">
                            Sort Signals By
                          </div>
                          {SORT_OPTIONS.map((opt) => {
                            const isSelected = selectedSort === opt.id;
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  setSelectedSort(opt.id);
                                  setIsSortDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all text-left cursor-pointer ${
                                  isSelected
                                    ? "bg-nebula-cyan/20 text-nebula-cyan font-black"
                                    : "text-white/70 hover:text-white hover:bg-white/5"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Icon
                                    size={12}
                                    className={
                                      isSelected
                                        ? "text-nebula-cyan"
                                        : "text-white/50"
                                    }
                                  />
                                  {opt.label}
                                </span>
                                {isSelected && (
                                  <Check
                                    size={12}
                                    className="text-nebula-cyan"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Year Dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsYearDropdownOpen((prev) => !prev);
                          setIsSortDropdownOpen(false);
                          setIsRatingDropdownOpen(false);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-md ${
                          selectedYear !== "all"
                            ? "bg-nebula-cyan/15 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                            : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <Calendar
                          size={12}
                          className={
                            selectedYear !== "all"
                              ? "text-nebula-cyan"
                              : "text-white/60"
                          }
                        />
                        <span>
                          {selectedYear === "all"
                            ? "Year"
                            : currentYearObj.label}
                        </span>
                        <ChevronDown size={11} className="opacity-60" />
                      </button>
                      {isYearDropdownOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 max-h-64 overflow-y-auto custom-scrollbar bg-[#0c0d12]/98 border border-cyan-500/20 rounded-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-[550] space-y-0.5 animate-in fade-in zoom-in-95 duration-150 origin-top"
                        >
                          <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/35">
                            Release Year / Era
                          </div>
                          {YEAR_OPTIONS.map((yr) => {
                            const isSelected = selectedYear === yr.id;
                            return (
                              <button
                                key={yr.id}
                                onClick={() => {
                                  setSelectedYear(yr.id);
                                  setIsYearDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all text-left cursor-pointer ${
                                  isSelected
                                    ? "bg-nebula-cyan/20 text-nebula-cyan font-black"
                                    : "text-white/70 hover:text-white hover:bg-white/5"
                                }`}
                              >
                                <span>{yr.label}</span>
                                {isSelected && (
                                  <Check
                                    size={12}
                                    className="text-nebula-cyan"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Rating Dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRatingDropdownOpen((prev) => !prev);
                          setIsSortDropdownOpen(false);
                          setIsYearDropdownOpen(false);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-md ${
                          selectedRating > 0
                            ? "bg-nebula-cyan/15 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                            : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <Star
                          size={12}
                          className={
                            selectedRating > 0
                              ? "text-nebula-cyan fill-nebula-cyan"
                              : "text-white/60"
                          }
                        />
                        <span>
                          {selectedRating === 0
                            ? "Rating"
                            : `★ ${selectedRating}+`}
                        </span>
                        <ChevronDown size={11} className="opacity-60" />
                      </button>
                      {isRatingDropdownOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-2 w-52 bg-[#0c0d12]/98 border border-cyan-500/20 rounded-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-[550] space-y-0.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                        >
                          <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/35">
                            Minimum Rating
                          </div>
                          {RATING_OPTIONS.map((rate) => {
                            const isSelected = selectedRating === rate.id;
                            return (
                              <button
                                key={`rate-${rate.id}`}
                                onClick={() => {
                                  setSelectedRating(rate.id);
                                  setIsRatingDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all text-left cursor-pointer ${
                                  isSelected
                                    ? "bg-nebula-cyan/20 text-nebula-cyan font-black"
                                    : "text-white/70 hover:text-white hover:bg-white/5"
                                }`}
                              >
                                <span>{rate.label}</span>
                                {isSelected && (
                                  <Check
                                    size={12}
                                    className="text-nebula-cyan"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Genre Dropdown (Desktop) */}
                    <div className="relative">
                      <button
                        onClick={() => setIsFilterDrawerOpen((prev) => !prev)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-md ${
                          selectedGenre !== "All"
                            ? "bg-nebula-cyan/15 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                            : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <Compass size={12} className={selectedGenre !== "All" ? "text-nebula-cyan" : "text-white/60"} />
                        <span>{selectedGenre === "All" ? "Genre" : selectedGenre}</span>
                        <ChevronDown size={11} className="opacity-60" />
                      </button>
                    </div>

                    {/* Presets Toggle */}
                    <button
                      onClick={() => setIsFilterDrawerOpen((prev) => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold tracking-wider uppercase transition-all duration-250 cursor-pointer backdrop-blur-md ${
                        isFilterDrawerOpen
                          ? "bg-nebula-cyan/15 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                          : "bg-white/[0.04] border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <Sparkles size={12} />
                      <span>Presets</span>
                    </button>
                  </div>

                  {/* Spacer to push mobile filter button to right */}
                  <div className="flex-1 lg:hidden" />

                  {/* ── Mobile Unified Filter Toggle (visible on <lg, hidden on lg+) ── */}
                  <button
                    onClick={() => {
                      setIsFilterDrawerOpen((prev) => !prev);
                      closeAllDropdowns();
                    }}
                    className={`lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-md shrink-0 ${
                      isFilterDrawerOpen || hasActiveFilters
                        ? "bg-nebula-cyan/15 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                        : "bg-white/[0.04] border-white/10 text-white/70"
                    }`}
                  >
                    <SlidersHorizontal size={12} />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-nebula-cyan text-obsidian text-[8px] font-black flex items-center justify-center -ml-0.5">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Reset button — shown inline when filters are active */}
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-1 text-[9px] font-bold text-white/40 hover:text-nebula-red uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                      title="Reset all filters"
                    >
                      <RotateCcw size={10} />
                    </button>
                  )}
                </div>

                {/* ── Expandable Filter Drawer (all breakpoints) ─────────────── */}
                <AnimatePresence>
                  {isFilterDrawerOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 sm:p-4 rounded-2xl bg-[#0c0d12]/90 border border-white/10 backdrop-blur-2xl space-y-3 sm:space-y-4 mt-2.5 shadow-2xl">
                        {/* ── Mobile-only: Sort / Year / Rating controls ────── */}
                        <div className="lg:hidden space-y-3">
                          {/* Sort */}
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-1.5">
                              <ArrowUpDown size={10} className="text-nebula-cyan/70" />
                              Sort By
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {SORT_OPTIONS.map((opt) => {
                                const isSelected = selectedSort === opt.id;
                                const Icon = opt.icon;
                                return (
                                  <button
                                    key={`mob-sort-${opt.id}`}
                                    onClick={() => setSelectedSort(opt.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan font-black"
                                        : "bg-white/5 border-white/8 text-white/60 hover:text-white hover:bg-white/10"
                                    }`}
                                  >
                                    <Icon size={10} />
                                    {opt.shortLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Year */}
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-1.5">
                              <Calendar size={10} className="text-nebula-cyan/70" />
                              Release Year / Era
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {YEAR_OPTIONS.map((yr) => (
                                <button
                                  key={`mob-yr-${yr.id}`}
                                  onClick={() => setSelectedYear(yr.id)}
                                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                    selectedYear === yr.id
                                      ? "bg-nebula-cyan text-obsidian border-nebula-cyan font-black shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                                      : "bg-white/5 border-white/8 text-white/60 hover:text-white hover:bg-white/10"
                                  }`}
                                >
                                  {yr.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Rating */}
                          <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-1.5">
                              <Star size={10} className="text-nebula-cyan/70" />
                              Minimum Rating
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {RATING_OPTIONS.map((rate) => (
                                <button
                                  key={`mob-rate-${rate.id}`}
                                  onClick={() => setSelectedRating(rate.id)}
                                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                    selectedRating === rate.id
                                      ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan font-black"
                                      : "bg-white/5 border-white/8 text-white/60 hover:text-white hover:bg-white/10"
                                  }`}
                                >
                                  {rate.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── Divider between mobile controls and shared sections ── */}
                        <div className="lg:hidden h-px bg-white/[0.06]" />

                        {/* ── Genre Chips (all breakpoints — inside drawer) ──── */}
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-1.5">
                            <Compass size={10} className="text-nebula-cyan/70" />
                            Genre
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {GENRE_OPTIONS.map((genre) => {
                              const isSelected = selectedGenre === genre;
                              return (
                                <button
                                  key={`drawer-genre-${genre}`}
                                  onClick={() => setSelectedGenre(genre)}
                                  className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                                    isSelected
                                      ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan shadow-[0_0_10px_rgba(0,229,255,0.25)] font-black"
                                      : "bg-white/[0.03] border-white/8 text-white/50 hover:text-white hover:bg-white/[0.07] hover:border-white/20"
                                  }`}
                                >
                                  {genre}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── Quick Discovery Presets ────────────────────────── */}
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center gap-1.5">
                            <Sparkles size={10} className="text-nebula-cyan" />
                            Quick Presets
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSort("most_watched");
                                setMediaTypeFilter("all");
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                selectedSort === "most_watched"
                                  ? "bg-nebula-red/20 border-nebula-red text-nebula-red shadow-[0_0_12px_rgba(255,42,109,0.3)]"
                                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              <Flame size={11} />
                              Most Watched
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRating(8.0);
                                setSelectedSort("rating");
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                selectedRating >= 8.0
                                  ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              <Star size={11} />
                              Acclaimed ★ 8.0+
                            </button>
                            <button
                              onClick={() => {
                                setSelectedYear("2025");
                                setSelectedSort("newest");
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                selectedYear === "2025"
                                  ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              <Calendar size={11} />
                              2025 Premieres
                            </button>
                            <button
                              onClick={() => {
                                setMediaTypeFilter("anime");
                                setSelectedSort("popularity");
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                mediaTypeFilter === "anime"
                                  ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              🎌 Trending Anime
                            </button>
                            <button
                              onClick={() => {
                                setSelectedYear("classic");
                                setSelectedSort("rating");
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                selectedYear === "classic"
                                  ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              <History size={11} />
                              Classics (Pre-1990)
                            </button>
                          </div>
                        </div>

                        {/* ── Drawer footer: Reset + Close ──────────────────── */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                          {hasActiveFilters ? (
                            <button
                              onClick={handleResetFilters}
                              className="flex items-center gap-1.5 text-[9px] font-bold text-white/40 hover:text-nebula-red uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              <RotateCcw size={10} />
                              Reset All Filters
                            </button>
                          ) : (
                            <span className="text-[9px] text-white/25 uppercase tracking-wider">
                              No active filters
                            </span>
                          )}
                          <button
                            onClick={() => setIsFilterDrawerOpen(false)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-white/60 hover:text-nebula-cyan hover:border-nebula-cyan/30 uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                    </AnimatePresence>
                  </div>
                  {/* Results Count / Context Bar */}
                  {showDiscoveryGrid && !isCurrentLoading && (
                    <div className="mb-4 flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <span>
                        {hasQuery
                          ? `Results for "${searchQuery}" (${filteredMediaResults.length} titles)`
                          : `Filter Discovery: ${filteredMediaResults.length} matches found`}
                      </span>
                      {hasActiveFilters && (
                        <span className="text-nebula-cyan/80">
                          {currentSortObj.label} • {currentYearObj.label}
                        </span>
                      )}
                    </div>
                  )}

                  {/* People Results */}
                  {hasQuery &&
                    (mediaTypeFilter === "all" ||
                      mediaTypeFilter === "people") &&
                    searchPeopleResults &&
                    searchPeopleResults.length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-4 flex items-center gap-2.5">
                          <span className="w-4 h-px bg-white/15" />
                          Cast & Crew ({searchPeopleResults.length})
                        </h4>
                        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 no-scrollbar">
                          {searchPeopleResults.map((actor: any) => {
                            const navIdx = navigableItems.findIndex(
                              (i) =>
                                i.type === "actor" && i.value.id === actor.id,
                            );
                            return (
                              <ActorCard
                                key={`actor-${actor.id}`}
                                actor={actor}
                                isSelected={
                                  navIdx >= 0 && navIdx === focusedIndex
                                }
                                onSelectActor={handleSelectActor}
                              />
                            );
                          })}
                        </div>
                        {mediaTypeFilter === "all" && (
                          <div className="h-px bg-gradient-to-r from-white/20 via-white/10 to-transparent my-6" />
                        )}
                      </div>
                    )}

                  {/* Loading Skeleton vs Results Grid */}
                  {isCurrentLoading && showDiscoveryGrid ? (
                    <SkeletonGrid />
                  ) : showDiscoveryGrid &&
                    mediaTypeFilter !== "people" &&
                    filteredMediaResults.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-4 gap-2 sm:gap-4">
                      {filteredMediaResults.map((movie, i) => {
                        const navIdx = navigableItems.findIndex(
                          (item) =>
                            item.type === "movie" && item.value.id === movie.id,
                        );
                        return (
                          <SearchResultCard
                            key={`movie-${movie.id}-${i}`}
                            movie={movie}
                            index={i}
                            isSelected={navIdx >= 0 && navIdx === focusedIndex}
                            onSelectMovie={handleSelectMovie}
                          />
                        );
                      })}
                    </div>
                  ) : hasNoResults ? (
                    /* No Results Empty State */
                    <div className="py-16 flex flex-col items-center">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-nebula-red/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <Search
                          size={56}
                          className="text-white/10 relative z-10"
                        />
                      </div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">
                        No Transmission Found
                      </h4>
                      <p className="text-white/40 text-sm font-medium tracking-wide text-center max-w-sm mb-6">
                        {hasQuery
                          ? `The Nebula signal could not locate "${searchQuery}" with the current filters.`
                          : "No titles match the selected filter combination. Try loosening your criteria."}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          onClick={handleResetFilters}
                          className="px-4 py-2 rounded-full bg-nebula-cyan/20 border border-nebula-cyan/50 text-[10px] font-black text-nebula-cyan hover:bg-nebula-cyan hover:text-obsidian transition-all uppercase tracking-wide cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                        {topSearches.slice(0, 4).map((term) => (
                          <button
                            key={term}
                            onClick={() => handleSuggestionClick(term)}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 hover:text-nebula-cyan hover:border-nebula-cyan/30 transition-all uppercase tracking-wide cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Idle State: Recent Searches & Suggestion Pills */
                    !showDiscoveryGrid && (
                      <div className="py-4">
                        {showRecent && (
                          <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2">
                                <Clock size={12} className="text-white/30" />
                                Recent Searches
                              </h4>
                              <button
                                onClick={handleClearAllRecent}
                                className="text-[9px] font-bold text-white/30 hover:text-nebula-cyan transition-colors uppercase tracking-widest cursor-pointer"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {recentSearches.map((term) => (
                                <div
                                  key={term}
                                  className="group/recent flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/8 hover:border-nebula-cyan/40 hover:bg-white/10 transition-all cursor-pointer"
                                  onClick={() => handleSuggestionClick(term)}
                                >
                                  <span className="text-[11px] font-bold text-white/60 group-hover/recent:text-white transition-colors uppercase tracking-tight">
                                    {term}
                                  </span>
                                  <button
                                    onClick={(e) => handleRemoveRecent(term, e)}
                                    className="text-white/20 hover:text-nebula-red transition-colors ml-0.5"
                                    aria-label={`Remove ${term}`}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="h-px bg-white/[0.05] mt-6" />
                          </div>
                        )}

                        {/* Suggestion pills & Quick discovery */}
                        <div className="py-6 flex flex-col items-center gap-6">
                          <div className="text-center">
                            <h4 className="text-base sm:text-lg font-black text-white/30 uppercase tracking-[0.2em] mb-1 flex items-center justify-center gap-2">
                              <Compass size={18} className="text-nebula-cyan" />
                              Discover Popular Signals
                            </h4>
                            <p className="text-white/20 text-[11px] uppercase tracking-widest">
                              Search or use the filters above to explore by
                              year, popularity, or rating
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2.5 justify-center max-w-lg">
                            {topSearches.map((term) => {
                              const navIdx = navigableItems.findIndex(
                                (item) =>
                                  item.type === "suggestion" &&
                                  item.value === term,
                              );
                              const isSelected =
                                navIdx >= 0 && navIdx === focusedIndex;
                              return (
                                <button
                                  key={term}
                                  onClick={() => handleSuggestionClick(term)}
                                  className={`px-4 py-2 rounded-full border text-[11px] font-bold transition-all uppercase tracking-wider cursor-pointer ${
                                    isSelected
                                      ? "bg-nebula-cyan border-nebula-cyan text-obsidian shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-105"
                                      : "bg-white/[0.04] border-white/8 text-white/50 hover:text-nebula-cyan hover:border-nebula-cyan/30 hover:bg-white/[0.08]"
                                  }`}
                                >
                                  {term}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* ── Sidebar: Trending Searches ─────────────────────────────── */}
                <div className="w-full xl:w-[240px] shrink-0">
                  <div className="xl:sticky xl:top-8">
                    <h3 className="text-[11px] sm:text-[13px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <TrendingUp size={14} className="text-nebula-cyan" />
                      Trending Signals
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                      {topSearches.map((term, i) => (
                        <button
                          key={`top-search-${i}`}
                          onClick={() => handleSuggestionClick(term)}
                          className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-nebula-cyan/30 hover:bg-white/8 transition-all text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base font-display font-black text-white/15 group-hover:text-nebula-cyan/60 transition-colors tabular-nums">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-[11px] sm:text-xs font-bold text-white/70 group-hover:text-white transition-colors uppercase tracking-tight italic">
                              {term}
                            </span>
                          </div>
                          <ArrowRight
                            size={14}
                            className="text-white/0 group-hover:text-nebula-cyan transition-all -translate-x-2 group-hover:translate-x-0 shrink-0"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Keyboard Shortcuts Footer Bar ────────────────────────────── */}
              <div className="mt-10 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-bold text-white/30 uppercase tracking-wider">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-white/60">
                      ↑↓
                    </kbd>{" "}
                    Navigate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-white/60">
                      ↵
                    </kbd>{" "}
                    Select
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-white/60">
                      ESC
                    </kbd>{" "}
                    Close
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-nebula-cyan/60">
                  <Sparkles size={12} />
                  <span>Raycast Search & Filter Engine</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll-to-top inside search overlay */}
      <AnimatePresence>
        {isOpen && scrolledDown && (
          <motion.button
            key="search-scroll-top"
            initial={{ opacity: 0, scale: 0.7, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() =>
              overlayRef.current?.scrollTo({ top: 0, behavior: "smooth" })
            }
            aria-label="Scroll to top"
            className="fixed bottom-8 right-8 z-[510] w-11 h-11 rounded-full
                       bg-nebula-cyan/10 border border-nebula-cyan/35 backdrop-blur-md
                       flex items-center justify-center text-nebula-cyan
                       hover:bg-nebula-cyan hover:text-obsidian
                       transition-colors duration-200
                       shadow-[0_0_18px_rgba(0,243,255,0.15)]
                       hover:shadow-[0_0_24px_rgba(0,243,255,0.4)] cursor-pointer"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
