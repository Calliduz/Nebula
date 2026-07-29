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
  Filter,
} from "lucide-react";
import { topSearches } from "../data/constants";
import { handleImageError } from "../utils/helpers";

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

// ── Isolated Typewriter Input Component ──────────────────────────────────────
// Isolating state updates for the placeholder ticker prevents SearchOverlay root re-renders.
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
          className="w-full bg-white/[0.03] border-b-2 border-white/10 py-4 sm:py-9 pl-10 sm:pl-24 pr-24 sm:pr-40 text-xl sm:text-4xl font-black placeholder:text-white/20 focus:outline-none focus:border-nebula-cyan/70 transition-colors duration-300 caret-nebula-cyan uppercase tracking-tighter italic"
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(index * 0.03, 0.25),
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
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 group-hover:border-nebula-cyan/50">
        <img
          src={movie.image}
          alt={movie.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:blur-[1px] group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          loading="lazy"
        />

        {/* Type badge */}
        {movie.type && (
          <div className="absolute top-0 left-0 z-20 pointer-events-none bg-black/70 backdrop-blur-md text-white/90 text-[7px] sm:text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-br-md sm:rounded-br-lg border-r border-b border-white/10 leading-none">
            {movie.type === "tv" ? "TV" : "Film"}
          </div>
        )}

        {/* Rating badge */}
        {movie.imdb && movie.imdb > 0 && (
          <div className="absolute top-0 right-0 z-20 pointer-events-none bg-black/70 backdrop-blur-md text-nebula-cyan text-[7px] sm:text-[8px] font-black tracking-wider px-2 py-1 rounded-bl-md sm:rounded-bl-lg border-l border-b border-white/10 leading-none">
            ★ {movie.imdb}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-60 group-hover:opacity-85 transition-opacity" />

        {/* Hover Info */}
        <div className="absolute inset-0 flex flex-col justify-end p-2.5 sm:p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <h4 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-tight line-clamp-2 mb-1 italic">
            {movie.title}
          </h4>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold text-nebula-cyan border border-nebula-cyan/30 px-1 py-0.5 rounded uppercase">
              {movie.type || "Movie"}
            </span>
            {movie.year && (
              <span className="text-[8px] font-bold text-white/60">
                {movie.year}
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
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-4 gap-2 sm:gap-5 animate-pulse">
    {Array.from({ length: 10 }).map((_, i) => (
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

const GENRE_FILTERS = [
  "All",
  "Action",
  "Sci-Fi",
  "Drama",
  "Comedy",
  "Animation",
  "Horror",
  "★ 8.0+",
];

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
  const [activeSearchTab, setActiveSearchTab] = useState<
    "all" | "media" | "people"
  >("all");
  const [selectedGenreFilter, setSelectedGenreFilter] = useState("All");
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

  // Reset focus index when query or tab changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery, activeSearchTab, selectedGenreFilter]);

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

  // Filtered media results based on Genre & Rating
  const filteredMediaResults = useMemo(() => {
    if (selectedGenreFilter === "All") return searchResults;
    if (selectedGenreFilter === "★ 8.0+") {
      return searchResults.filter((m) => m.imdb && m.imdb >= 8.0);
    }
    return searchResults.filter((m) => {
      const gStr = Array.isArray(m.genres) ? m.genres.join(" ") : m.genre || "";
      return gStr.toLowerCase().includes(selectedGenreFilter.toLowerCase());
    });
  }, [searchResults, selectedGenreFilter]);

  // Flatten active result items for keyboard navigation
  const navigableItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return topSearches.map((term) => ({ type: "suggestion", value: term }));
    }
    const items: any[] = [];
    if (activeSearchTab !== "media" && searchPeopleResults.length > 0) {
      searchPeopleResults.forEach((actor) =>
        items.push({ type: "actor", value: actor }),
      );
    }
    if (activeSearchTab !== "people" && filteredMediaResults.length > 0) {
      filteredMediaResults.forEach((movie) =>
        items.push({ type: "movie", value: movie }),
      );
    }
    return items;
  }, [searchQuery, activeSearchTab, searchPeopleResults, filteredMediaResults]);

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
      const raf = requestAnimationFrame(() => {
        const timer = setTimeout(() => {
          try {
            searchInputRef.current?.focus({ preventScroll: true });
          } catch {
            searchInputRef.current?.focus();
          }
        }, 100);
        return () => clearTimeout(timer);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setScrolledDown(false);
      setIsFocused(false);
      setFocusedIndex(-1);
    }
  }, [isOpen, searchInputRef]);

  const hasQuery = searchQuery.trim().length > 0;
  const showRecent = !hasQuery && recentSearches.length > 0;
  const hasNoResultsForTab =
    hasQuery &&
    !isLoading &&
    ((activeSearchTab === "all" &&
      filteredMediaResults.length === 0 &&
      searchPeopleResults.length === 0) ||
      (activeSearchTab === "media" && filteredMediaResults.length === 0) ||
      (activeSearchTab === "people" && searchPeopleResults.length === 0));

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
            className="fixed inset-0 z-[500] bg-obsidian/98 backdrop-blur-md flex flex-col items-center pt-[3vh] sm:pt-[8vh] overflow-y-auto custom-scrollbar transform-gpu"
            style={{ willChange: "opacity" }}
          >
            <div className="w-full max-w-[1250px] px-4 sm:px-8 pb-32 pb-safe">
              {/* ── Search Input Bar ────────────────────────────────────────── */}
              <div
                className={`relative mb-4 sm:mb-8 flex items-center gap-3 search-glow-underline ${
                  isFocused ? "glow-active" : ""
                }`}
              >
                <div className="relative flex-1">
                  {/* Left Search Icon / Loading Spinner */}
                  <div className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 flex items-center gap-4 z-10 pointer-events-none">
                    {isLoading ? (
                      <Loader2
                        size={22}
                        className="animate-spin text-nebula-cyan sm:w-7 sm:h-7"
                      />
                    ) : (
                      <Search
                        size={22}
                        className="text-nebula-cyan sm:w-7 sm:h-7"
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
                  <div className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 flex items-center gap-2.5">
                    {/* Voice Mic Button */}
                    <button
                      onClick={handleVoiceSearch}
                      type="button"
                      className={`p-2 rounded-full border transition-all duration-300 ${
                        isListening
                          ? "bg-nebula-red/20 border-nebula-red text-nebula-red animate-pulse shadow-[0_0_15px_rgba(255,42,109,0.5)]"
                          : "bg-white/5 border-white/10 text-white/50 hover:text-nebula-cyan hover:border-nebula-cyan/30"
                      }`}
                      aria-label="Voice Search"
                      title="Voice Search"
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    {/* Clear Button */}
                    {hasQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
                        aria-label="Clear search"
                      >
                        <X size={13} />
                      </button>
                    )}

                    {/* ESC key badge */}
                    <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-[9px] font-black text-white/40 tracking-widest uppercase">
                      ESC
                    </div>
                  </div>
                </div>

                {/* Mobile Cancel */}
                <button
                  onClick={onClose}
                  className="sm:hidden text-nebula-cyan font-black text-xs uppercase tracking-widest px-2 py-2 min-w-[56px] text-center"
                >
                  Cancel
                </button>
              </div>

              {/* ── Filters & Category Tabs ──────────────────────────────────── */}
              {hasQuery && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-white/[0.06]">
                  {/* Category Tabs */}
                  <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl backdrop-blur-md">
                    <button
                      onClick={() => setActiveSearchTab("all")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        activeSearchTab === "all"
                          ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      All (
                      {filteredMediaResults.length + searchPeopleResults.length}
                      )
                    </button>
                    <button
                      onClick={() => setActiveSearchTab("media")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        activeSearchTab === "media"
                          ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      Movies & TV ({filteredMediaResults.length})
                    </button>
                    <button
                      onClick={() => setActiveSearchTab("people")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        activeSearchTab === "people"
                          ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      Cast ({searchPeopleResults.length})
                    </button>
                  </div>

                  {/* Genre Quick Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
                    <Filter
                      size={12}
                      className="text-white/30 shrink-0 mr-1 hidden sm:block"
                    />
                    {GENRE_FILTERS.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setSelectedGenreFilter(genre)}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 border ${
                          selectedGenreFilter === genre
                            ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan"
                            : "bg-white/5 border-white/8 text-white/40 hover:text-white"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col xl:flex-row gap-8 sm:gap-14">
                {/* ── Main Results Content ──────────────────────────────────── */}
                <div className="flex-1 min-w-0">
                  {/* People Results */}
                  {hasQuery &&
                    activeSearchTab !== "media" &&
                    searchPeopleResults &&
                    searchPeopleResults.length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-4 flex items-center gap-2.5">
                          <span className="w-4 h-px bg-white/15" />
                          Cast & Crew
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
                        {activeSearchTab === "all" && (
                          <div className="h-px bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-transparent my-6" />
                        )}
                      </div>
                    )}

                  {/* Loading Skeleton vs Results Grid */}
                  {isLoading && hasQuery ? (
                    <SkeletonGrid />
                  ) : hasQuery &&
                    activeSearchTab !== "people" &&
                    filteredMediaResults.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-4 gap-2 sm:gap-4">
                      {filteredMediaResults.map((movie, i) => {
                        const navIdx = navigableItems.findIndex(
                          (item) =>
                            item.type === "movie" && item.value.id === movie.id,
                        );
                        return (
                          <SearchResultCard
                            key={`movie-${movie.id}`}
                            movie={movie}
                            index={i}
                            isSelected={navIdx >= 0 && navIdx === focusedIndex}
                            onSelectMovie={handleSelectMovie}
                          />
                        );
                      })}
                    </div>
                  ) : hasNoResultsForTab ? (
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
                      <p className="text-white/40 text-sm font-medium tracking-wide text-center max-w-xs mb-6">
                        The Nebula signal could not locate "{searchQuery}" under
                        this category.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {topSearches.slice(0, 5).map((term) => (
                          <button
                            key={term}
                            onClick={() => handleSuggestionClick(term)}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 hover:text-nebula-cyan hover:border-nebula-cyan/30 transition-all uppercase tracking-wide"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Idle State: Recent Searches & Suggestion Pills */
                    !hasQuery && (
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
                                className="text-[9px] font-bold text-white/30 hover:text-nebula-cyan transition-colors uppercase tracking-widest"
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

                        {/* Suggestion pills */}
                        <div className="py-6 flex flex-col items-center gap-6">
                          <div className="text-center">
                            <h4 className="text-base sm:text-lg font-black text-white/30 uppercase tracking-[0.2em] mb-1">
                              Discover Popular Signal
                            </h4>
                            <p className="text-white/20 text-[11px] uppercase tracking-widest">
                              Search movies, TV series, actors, or genres
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
                                  className={`px-4 py-2 rounded-full border text-[11px] font-bold transition-all uppercase tracking-wider ${
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
                <div className="w-full xl:w-[260px] shrink-0">
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
                          className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-nebula-cyan/30 hover:bg-white/8 transition-all text-left"
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
                  <span>Raycast-Speed Engine</span>
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
                       hover:shadow-[0_0_24px_rgba(0,243,255,0.4)]"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
