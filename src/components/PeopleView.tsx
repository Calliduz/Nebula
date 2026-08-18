import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Search,
  User,
  Clapperboard,
  Loader2,
  X,
  Sparkles,
  Flame,
} from "lucide-react";
import {
  getPopularPeople,
  getPopularDirectors,
  searchPeople,
  NebulaPersonSummary,
} from "../services/tmdb";
import { handleImageError } from "../utils/helpers";

interface PeopleViewProps {
  onClose: () => void;
  onSelectActor: (id: string | number) => void;
  onSelectMovie?: (movie: any) => void;
}

const QUICK_CHIPS = [
  { id: "525", name: "Christopher Nolan", type: "Directing" },
  { id: "137427", name: "Denis Villeneuve", type: "Directing" },
  { id: "138", name: "Quentin Tarantino", type: "Directing" },
  { id: "5064", name: "Meryl Streep", type: "Acting" },
  { id: "500", name: "Tom Cruise", type: "Acting" },
  { id: "505710", name: "Zendaya", type: "Acting" },
  { id: "2037", name: "Cillian Murphy", type: "Acting" },
  { id: "1032", name: "Martin Scorsese", type: "Directing" },
  { id: "234352", name: "Margot Robbie", type: "Acting" },
  { id: "608", name: "Hayao Miyazaki", type: "Directing" },
];

export const PeopleView: React.FC<PeopleViewProps> = React.memo(
  ({ onClose, onSelectActor }) => {
    const [departmentFilter, setDepartmentFilter] = useState<
      "all" | "Acting" | "Directing"
    >("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [inputVal, setInputVal] = useState("");
    const [people, setPeople] = useState<NebulaPersonSummary[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Initial load and filter change
    useEffect(() => {
      let isMounted = true;
      setIsLoading(true);
      setPage(1);

      if (searchQuery.trim()) {
        searchPeople(searchQuery.trim())
          .then((results) => {
            if (!isMounted) return;
            const mapped: NebulaPersonSummary[] = results.map((r: any) => ({
              id: r.id,
              name: r.name,
              avatar: r.avatar,
              department: r.role || r.department || "Acting",
              known_for: r.known_for || [],
            }));
            setPeople(mapped);
            setHasMore(false);
          })
          .catch(() => {
            if (isMounted) setPeople([]);
          })
          .finally(() => {
            if (isMounted) setIsLoading(false);
          });
      } else {
        const fetchFn =
          departmentFilter === "Directing"
            ? getPopularDirectors(1)
            : getPopularPeople(departmentFilter, 1);

        fetchFn
          .then((data) => {
            if (!isMounted) return;
            setPeople(data);
            setHasMore(data.length >= 24);
          })
          .catch(() => {
            if (isMounted) setPeople([]);
          })
          .finally(() => {
            if (isMounted) setIsLoading(false);
          });
      }

      return () => {
        isMounted = false;
      };
    }, [departmentFilter, searchQuery]);

    // Handle search query change with 300ms debounce
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputVal(val);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        setSearchQuery(val);
      }, 300);
    };

    const handleClearSearch = () => {
      setInputVal("");
      setSearchQuery("");
    };

    // Quick chip click
    const handleChipClick = (name: string) => {
      setInputVal(name);
      setSearchQuery(name);
    };

    // Load more pagination
    const handleLoadMore = useCallback(async () => {
      if (isLoadingMore || !hasMore || searchQuery.trim()) return;
      setIsLoadingMore(true);
      const nextPage = page + 1;

      try {
        const nextData =
          departmentFilter === "Directing"
            ? await getPopularDirectors(nextPage)
            : await getPopularPeople(departmentFilter, nextPage);

        if (nextData.length === 0) {
          setHasMore(false);
        } else {
          setPeople((prev) => {
            const existingIds = new Set(prev.map((p) => p.id.toString()));
            const uniqueNew = nextData.filter(
              (p) => !existingIds.has(p.id.toString()),
            );
            return [...prev, ...uniqueNew];
          });
          setPage(nextPage);
          if (nextData.length < 24) setHasMore(false);
        }
      } catch (err) {
        console.error("Failed to load more people:", err);
      } finally {
        setIsLoadingMore(false);
      }
    }, [departmentFilter, hasMore, isLoadingMore, page, searchQuery]);

    return (
      <div className="min-h-screen bg-obsidian text-white pt-16 sm:pt-24 md:pt-28 px-3.5 sm:px-6 md:px-12 pb-24 sm:pb-32">
        {/* Header matching CategoryView / Anime page design */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 sm:mb-10">
          <div className="flex flex-col gap-3 sm:gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-nebula-cyan/30 text-nebula-cyan hover:text-white transition-all duration-300 group self-start shadow-md backdrop-blur-sm active:scale-95 cursor-pointer"
              aria-label="Back to home"
            >
              <ArrowLeft
                size={13}
                className="group-hover:-translate-x-0.5 transition-transform duration-300"
              />
              <span className="text-[8.5px] font-black tracking-[0.18em] uppercase">
                Back to Home
              </span>
            </button>

            <div className="flex items-center gap-3 sm:gap-4 h-10 sm:h-12 md:h-16">
              <span className="w-[3px] self-stretch rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shadow-[0_0_8px_rgba(0,229,255,0.7)] shrink-0" />
              <h2 className="text-2.5xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent flex items-center gap-2.5">
                <span>Creators & Talent</span>
                <Sparkles
                  size={20}
                  className="text-nebula-cyan animate-pulse hidden sm:inline"
                />
              </h2>
            </div>
          </div>

          {/* Department Filter Tabs on Right */}
          <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl shadow-lg self-start md:self-end">
            {[
              { id: "all", label: "All Talent", icon: Sparkles },
              { id: "Acting", label: "Actors", icon: User },
              { id: "Directing", label: "Directors", icon: Clapperboard },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = departmentFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDepartmentFilter(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_15px_rgba(0,229,255,0.4)] scale-[1.02]"
                      : "text-white/45 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={12} className={isActive ? "text-obsidian" : ""} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar & Quick Inspiration Chips */}
        <div className="flex flex-col gap-2.5 mb-8 sm:mb-10 max-w-2xl">
          {/* Search Input Bar */}
          <div className="relative w-full">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search directors, actors, creators..."
              value={inputVal}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 focus:border-nebula-cyan/60 focus:bg-white/[0.08] text-xs sm:text-sm text-white placeholder-white/30 outline-none transition-all duration-300 font-sans shadow-inner focus:shadow-[0_0_15px_rgba(0,229,255,0.15)]"
            />
            {inputVal && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Inspiration Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-white/60">
            <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider text-white/30 shrink-0 flex items-center gap-1">
              <Flame size={11} className="text-nebula-cyan" />
              <span>Featured:</span>
            </span>
            {QUICK_CHIPS.map((chip) => {
              const isSelected =
                searchQuery.toLowerCase() === chip.name.toLowerCase();
              return (
                <button
                  key={chip.id}
                  onClick={() => handleChipClick(chip.name)}
                  className={`shrink-0 px-2.5 py-0.5 rounded-lg text-[9px] sm:text-[9.5px] font-bold tracking-wide transition-all duration-300 cursor-pointer border ${
                    isSelected
                      ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan shadow-[0_0_8px_rgba(0,229,255,0.3)]"
                      : "bg-white/[0.03] border-white/10 hover:border-white/25 text-white/60 hover:text-white hover:bg-white/[0.07]"
                  }`}
                >
                  {chip.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section: 24 items in 3 / 4 / 6 / 8 Columns for Zero Dangling Cards */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-8 gap-2.5 sm:gap-3.5">
            {[...Array(24)].map((_, i) => (
              <div
                key={`person-poster-skel-${i}`}
                className="aspect-[2/3] rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/5 p-2 sm:p-3 flex flex-col justify-end gap-1 sm:gap-1.5 animate-pulse overflow-hidden relative"
              >
                <div className="absolute inset-0 shimmer-bg opacity-30" />
                <div className="h-3 sm:h-4 w-3/4 bg-white/10 rounded shimmer-bg relative z-10" />
                <div className="h-2 sm:h-3 w-1/2 bg-white/10 rounded shimmer-bg relative z-10 opacity-60" />
              </div>
            ))}
          </div>
        ) : people.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-white/30 shadow-xl">
              <User size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white mb-1">
              No Creators Found
            </h3>
            <p className="text-white/40 text-xs max-w-sm mb-3">
              We couldn't find any creators matching "{searchQuery}". Try another
              name or clear filters.
            </p>
            <button
              onClick={handleClearSearch}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-8 gap-2.5 sm:gap-3.5">
            {people.map((person) => {
              const isDirector =
                person.department === "Directing" ||
                person.department?.toLowerCase().includes("direct");

              return (
                <button
                  key={`creator-card-${person.id}`}
                  onClick={() => onSelectActor(person.id)}
                  className="group relative aspect-[2/3] rounded-lg sm:rounded-xl overflow-hidden bg-zinc-950 border border-white/10 hover:border-nebula-cyan/60 transition-all duration-400 cursor-pointer shadow-md hover:shadow-[0_10px_30px_rgba(0,229,255,0.2)] hover:-translate-y-1 flex flex-col justify-between p-1.5 sm:p-2.5 text-left"
                >
                  {/* Background Full Headshot */}
                  {person.avatar ? (
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-600 ease-out group-hover:scale-108 filter brightness-95 group-hover:brightness-105"
                      loading="lazy"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950 flex items-center justify-center text-white/20">
                      {isDirector ? (
                        <Clapperboard size={28} />
                      ) : (
                        <User size={28} />
                      )}
                    </div>
                  )}

                  {/* Gradient Scrim Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-85 group-hover:opacity-75 transition-opacity duration-400" />
                  <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-black/50 to-transparent" />

                  {/* Glass Specular Top Highlight */}
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                  {/* Top Badge: Department / Role */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <span
                      className={`inline-flex items-center gap-0.5 text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-wider px-1 sm:px-1.5 py-px rounded-md backdrop-blur-md shadow-sm border ${
                        isDirector
                          ? "bg-purple-600/30 border-purple-400/40 text-purple-200"
                          : "bg-cyan-500/25 border-nebula-cyan/40 text-nebula-cyan"
                      }`}
                    >
                      {isDirector ? (
                        <Clapperboard size={7} className="shrink-0" />
                      ) : (
                        <User size={7} className="shrink-0" />
                      )}
                      <span>{isDirector ? "Director" : "Actor"}</span>
                    </span>
                  </div>

                  {/* Bottom Content: Name & Known For */}
                  <div className="relative z-10 flex flex-col gap-0.5 w-full">
                    {/* Creator Name */}
                    <h3 className="text-[10px] sm:text-xs md:text-sm font-display font-black uppercase tracking-tight text-white group-hover:text-nebula-cyan transition-colors duration-300 leading-tight drop-shadow-md truncate w-full">
                      {person.name}
                    </h3>

                    {/* Top Known For Credits */}
                    {person.known_for && person.known_for.length > 0 && (
                      <p className="text-[7px] sm:text-[8px] md:text-[9px] font-medium text-white/60 truncate w-full leading-tight drop-shadow-sm">
                        {person.known_for.map((k) => k.title).join(" • ")}
                      </p>
                    )}
                  </div>

                  {/* Bottom Accent Glow Line */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-nebula-cyan via-white to-nebula-cyan transition-all duration-400 group-hover:w-4/5 rounded-full shadow-[0_0_10px_rgba(0,229,255,0.9)]" />
                </button>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && hasMore && !searchQuery.trim() && (
          <div className="mt-10 sm:mt-12 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-nebula-cyan/50 text-[11px] font-black uppercase tracking-widest text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-xl hover:shadow-[0_0_20px_rgba(0,229,255,0.2)]"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={14} className="animate-spin text-nebula-cyan" />
                  <span>Loading Creators...</span>
                </>
              ) : (
                <span>Load More Creators</span>
              )}
            </button>
          </div>
        )}
      </div>
    );
  },
);
