import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Loader2,
  X,
  ArrowRight,
  ArrowUp,
  Clock,
  TrendingUp,
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

// ── Typewriter placeholder hook ────────────────────────────────────────────────
function useTypewriterPlaceholder(terms: string[], active: boolean) {
  const [placeholder, setPlaceholder] = useState("Search...");
  const termIdx = useRef(0);
  const charIdx = useRef(0);
  const isDeleting = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setPlaceholder("Search...");
      return;
    }

    const tick = () => {
      const term = `Search ${terms[termIdx.current]}...`;
      if (!isDeleting.current) {
        charIdx.current = Math.min(charIdx.current + 1, term.length);
        setPlaceholder(term.slice(0, charIdx.current));
        if (charIdx.current === term.length) {
          timerRef.current = setTimeout(() => {
            isDeleting.current = true;
            tick();
          }, 2000);
          return;
        }
      } else {
        charIdx.current = Math.max(charIdx.current - 1, 0);
        setPlaceholder(term.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          isDeleting.current = false;
          termIdx.current = (termIdx.current + 1) % terms.length;
        }
      }
      const speed = isDeleting.current ? 35 : 65;
      timerRef.current = setTimeout(tick, speed);
    };

    timerRef.current = setTimeout(tick, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, terms]);

  return placeholder;
}

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

  const placeholder = useTypewriterPlaceholder(
    topSearches,
    isOpen && !searchQuery,
  );

  // Reset search tab when query changes
  useEffect(() => {
    setActiveSearchTab("all");
  }, [searchQuery]);

  // Load recent searches when overlay opens
  useEffect(() => {
    if (isOpen) setRecentSearches(getRecentSearches());
  }, [isOpen]);

  // Save to recent when user selects a result or presses Enter
  const handleSelectMovie = useCallback(
    (movie: any) => {
      if (searchQuery.trim()) {
        saveRecentSearch(searchQuery.trim());
      }
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
      // Re-focus input after setting query
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

  // Track scroll within the overlay container
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onScroll = () => setScrolledDown(el.scrollTop > 400);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isOpen]);

  // Reset scroll indicator when overlay closes
  useEffect(() => {
    if (!isOpen) {
      setScrolledDown(false);
      setIsFocused(false);
    }
  }, [isOpen]);

  // Fix for Brave iOS: use requestAnimationFrame inside a short delay, plus fallback
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        const timer = setTimeout(() => {
          try {
            searchInputRef.current?.focus({ preventScroll: true });
          } catch {
            searchInputRef.current?.focus();
          }
        }, 120);
        return () => clearTimeout(timer);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, searchInputRef]);

  // Keyboard: Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const hasQuery = searchQuery.trim().length > 0;
  const showRecent = !hasQuery && recentSearches.length > 0;
  const hasNoResultsForTab =
    hasQuery &&
    !isLoading &&
    ((activeSearchTab === "all" &&
      searchResults.length === 0 &&
      searchPeopleResults.length === 0) ||
      (activeSearchTab === "media" && searchResults.length === 0) ||
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[500] bg-obsidian/95 backdrop-blur-3xl flex flex-col items-center pt-[3vh] sm:pt-[10vh] overflow-y-auto custom-scrollbar"
          >
            <div className="w-full max-w-[1200px] px-4 sm:px-8 pb-32 pb-safe">
              {/* ── Search Input Area ───────────────────────────────────────── */}
              <div
                className={`relative mb-6 sm:mb-14 flex items-center gap-3 sm:gap-4 search-glow-underline ${isFocused ? "glow-active" : ""}`}
              >
                <div className="relative flex-1">
                  {/* Icon */}
                  <div className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 flex items-center gap-4 z-10 pointer-events-none">
                    {isLoading ? (
                      <Loader2
                        size={20}
                        className="animate-spin text-nebula-cyan sm:w-7 sm:h-7"
                      />
                    ) : (
                      <Search
                        size={20}
                        className="text-nebula-cyan sm:w-7 sm:h-7"
                      />
                    )}
                  </div>

                  {/* Input */}
                  <input
                    ref={searchInputRef}
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        saveRecentSearch(searchQuery.trim());
                        setRecentSearches(getRecentSearches());
                      }
                    }}
                    className="w-full bg-white/[0.03] border-b-2 border-white/10 py-4 sm:py-10 pl-10 sm:pl-24 pr-12 sm:pr-32 text-2xl sm:text-5xl font-black placeholder:text-white/20 focus:outline-none focus:border-nebula-cyan/60 transition-colors duration-300 caret-nebula-cyan uppercase tracking-tighter italic"
                  />

                  {/* Clear / ESC buttons */}
                  <div className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    {hasQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-[9px] font-black text-white/30 tracking-widest uppercase">
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

              <div className="flex flex-col xl:flex-row gap-10 sm:gap-20">
                {/* ── Main Results Area ─────────────────────────────────────── */}
                <div className="flex-1 min-w-0">
                  {/* Results header & tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-white/[0.04]">
                    <h3 className="text-[11px] sm:text-[13px] font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-3">
                      <span className="w-6 h-px bg-white/10" />
                      {hasQuery ? (
                        <>
                          Results{" "}
                          <span className="text-nebula-cyan">
                            (
                            {
                              (activeSearchTab === "people"
                                ? searchPeopleResults
                                : activeSearchTab === "media"
                                  ? searchResults
                                  : [...searchResults, ...searchPeopleResults]
                              ).length
                            }
                            )
                          </span>
                        </>
                      ) : (
                        "Awaiting Signal"
                      )}
                    </h3>

                    {hasQuery && (
                      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl backdrop-blur-md">
                        <button
                          onClick={() => setActiveSearchTab("all")}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                            activeSearchTab === "all"
                              ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                              : "text-white/40 hover:text-white"
                          }`}
                        >
                          All (
                          {searchResults.length + searchPeopleResults.length})
                        </button>
                        <button
                          onClick={() => setActiveSearchTab("media")}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                            activeSearchTab === "media"
                              ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                              : "text-white/40 hover:text-white"
                          }`}
                        >
                          Movies & TV ({searchResults.length})
                        </button>
                        <button
                          onClick={() => setActiveSearchTab("people")}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                            activeSearchTab === "people"
                              ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                              : "text-white/40 hover:text-white"
                          }`}
                        >
                          Cast ({searchPeopleResults.length})
                        </button>
                      </div>
                    )}
                  </div>

                  {/* People results */}
                  {hasQuery &&
                    activeSearchTab !== "media" &&
                    searchPeopleResults &&
                    searchPeopleResults.length > 0 && (
                      <div className="mb-10">
                        <h4 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-5 flex items-center gap-3">
                          <span className="w-4 h-px bg-white/15" />
                          Actors & Creators
                        </h4>
                        <div className="flex gap-5 sm:gap-8 overflow-x-auto pb-3 no-scrollbar touch-pan-x">
                          {searchPeopleResults.map(
                            (actor: any, idx: number) => (
                              <div
                                key={`search-actor-${actor.id}-${idx}`}
                                onClick={() => handleSelectActor(actor.id)}
                                className="flex flex-col items-center gap-2.5 group cursor-pointer shrink-0"
                              >
                                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border border-white/10 p-0.5 group-hover:border-nebula-cyan transition-all duration-400 overflow-hidden relative">
                                  <img
                                    src={actor.avatar}
                                    className="w-full h-full rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                    alt={actor.name}
                                    onError={handleImageError}
                                  />
                                  <div className="absolute inset-0 bg-nebula-cyan/0 group-hover:bg-nebula-cyan/5 transition-colors rounded-full" />
                                </div>
                                <div className="text-center w-16 sm:w-22">
                                  <p className="text-[10px] sm:text-xs font-bold text-white group-hover:text-nebula-cyan transition-colors line-clamp-1">
                                    {actor.name}
                                  </p>
                                  <p className="text-[9px] font-medium text-dim uppercase tracking-wider mt-0.5 line-clamp-1">
                                    {actor.role}
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                        {activeSearchTab === "all" && (
                          <div className="h-px bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-transparent my-8" />
                        )}
                      </div>
                    )}

                  {/* Movie/TV Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-4 gap-2 sm:gap-5">
                    {hasQuery &&
                    activeSearchTab !== "people" &&
                    searchResults.length > 0 ? (
                      <>
                        <div className="col-span-full mb-1">
                          <h4 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="w-4 h-px bg-white/15" />
                            Movies & TV Shows
                          </h4>
                        </div>
                        {searchResults.map((movie, i) => (
                          <motion.div
                            key={`search-res-${movie.id}-${i}`}
                            initial={{ opacity: 0, y: 16, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              delay: Math.min(i * 0.04, 0.5),
                              duration: 0.3,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            onClick={() => handleSelectMovie(movie)}
                            className="group cursor-pointer"
                          >
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-400 group-hover:scale-[1.03] group-hover:border-nebula-cyan/50 group-hover:shadow-[0_8px_32px_rgba(0,229,255,0.15)]">
                              <img
                                src={movie.image}
                                alt={movie.title}
                                className="w-full h-full object-cover transition-all duration-500 group-hover:blur-[1px] group-hover:scale-105"
                                referrerPolicy="no-referrer"
                                onError={handleImageError}
                              />

                              {/* Type badge — integrated top-left corner tab */}
                              {movie.type && (
                                <div className="absolute top-0 left-0 z-20 pointer-events-none bg-black/60 backdrop-blur-md text-white/80 text-[7px] sm:text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-br-md sm:rounded-br-lg border-r border-b border-white/5 leading-none">
                                  {movie.type === "tv" ? "TV" : "Film"}
                                </div>
                              )}

                              {/* Rating badge — integrated top-right corner tab */}
                              {movie.imdb && movie.imdb > 0 && (
                                <div className="absolute top-0 right-0 z-20 pointer-events-none bg-black/60 backdrop-blur-md text-nebula-cyan text-[7px] sm:text-[8px] font-black tracking-wider px-2 py-1 rounded-bl-md sm:rounded-bl-lg border-l border-b border-white/5 leading-none">
                                  ★ {movie.imdb}
                                </div>
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />

                              {/* Hover Info */}
                              <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                <h4 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-tight line-clamp-2 mb-1 italic">
                                  {movie.title}
                                </h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-bold text-nebula-cyan border border-nebula-cyan/30 px-1 py-0.5 rounded uppercase">
                                    {movie.type}
                                  </span>
                                  <span className="text-[8px] font-bold text-white/50">
                                    {movie.year}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </>
                    ) : hasNoResultsForTab ? (
                      /* No results state */
                      <div className="col-span-full py-20 flex flex-col items-center">
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
                        <p className="text-white/40 text-sm font-medium tracking-wide text-center max-w-xs animate-pulse">
                          The Nebula signal could not locate "{searchQuery}"
                          under this category.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-2 justify-center">
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
                      /* Empty / idle state */
                      !hasQuery && (
                        <div className="col-span-full">
                          {/* Recent Searches */}
                          {showRecent && (
                            <div className="mb-10">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2">
                                  <Clock size={12} className="text-white/30" />
                                  Recent
                                </h4>
                                <button
                                  onClick={handleClearAllRecent}
                                  className="text-[9px] font-bold text-white/20 hover:text-nebula-cyan transition-colors uppercase tracking-widest"
                                >
                                  Clear All
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {recentSearches.map((term) => (
                                  <div
                                    key={term}
                                    className="group/recent flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 hover:border-nebula-cyan/30 hover:bg-white/8 transition-all cursor-pointer"
                                    onClick={() => handleSuggestionClick(term)}
                                  >
                                    <span className="text-[11px] font-bold text-white/60 group-hover/recent:text-white transition-colors uppercase tracking-tight">
                                      {term}
                                    </span>
                                    <button
                                      onClick={(e) =>
                                        handleRemoveRecent(term, e)
                                      }
                                      className="text-white/20 hover:text-nebula-red transition-colors ml-0.5"
                                      aria-label={`Remove ${term}`}
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="h-px bg-white/[0.05] mt-8" />
                            </div>
                          )}

                          {/* Suggestion pills */}
                          <div className="py-10 flex flex-col items-center gap-8">
                            <div className="text-center">
                              <h4 className="text-base sm:text-lg font-black text-white/20 uppercase tracking-[0.2em] mb-2">
                                What are you looking for?
                              </h4>
                              <p className="text-white/10 text-[11px] uppercase tracking-widest">
                                Search movies, TV series, or actors
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2.5 justify-center max-w-lg">
                              {topSearches.map((term, i) => (
                                <motion.button
                                  key={term}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{
                                    delay: i * 0.05,
                                    duration: 0.25,
                                  }}
                                  onClick={() => handleSuggestionClick(term)}
                                  className="px-4 py-2 rounded-full bg-white/[0.04] border border-white/8 text-[11px] font-bold text-white/40 hover:text-nebula-cyan hover:border-nebula-cyan/30 hover:bg-white/[0.07] transition-all uppercase tracking-wider"
                                >
                                  {term}
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* ── Sidebar: Top Searches ──────────────────────────────────── */}
                <div className="w-full xl:w-[260px] shrink-0">
                  <div className="xl:sticky xl:top-10">
                    <h3 className="text-[11px] sm:text-[13px] font-black text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                      <TrendingUp size={14} className="text-nebula-cyan" />
                      Trending
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
                      {topSearches.map((term, i) => (
                        <button
                          key={`top-search-${i}`}
                          onClick={() => handleSuggestionClick(term)}
                          className="group flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-nebula-cyan/30 hover:bg-white/8 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-display font-black text-white/8 group-hover:text-nebula-cyan/40 transition-colors tabular-nums">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-[11px] sm:text-xs font-bold text-white/60 group-hover:text-white transition-colors uppercase tracking-tight italic">
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
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() =>
              overlayRef.current?.scrollTo({ top: 0, behavior: "smooth" })
            }
            aria-label="Scroll to top"
            className="fixed bottom-8 right-8 z-[510] w-11 h-11 rounded-full
                       bg-nebula-cyan/10 border border-nebula-cyan/35 backdrop-blur-md
                       flex items-center justify-center text-nebula-cyan
                       hover:bg-nebula-cyan hover:text-obsidian
                       transition-colors duration-200
                       shadow-[0_0_18px_rgba(0,243,255,0.12)]
                       hover:shadow-[0_0_24px_rgba(0,243,255,0.35)]"
          >
            <ArrowRight size={18} strokeWidth={2.5} className="-rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
