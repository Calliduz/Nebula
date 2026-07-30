import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Play, Search, Plus, Shield, Trash2, X } from "lucide-react";
import { MovieCard } from "./MovieCard";
import { MovieSkeleton } from "./MovieSkeleton";
import { ROW_FETCH_CONFIG } from "../hooks/useAppState";
import { STREAMING_PROVIDERS } from "./ProvidersShelf";

interface CategoryViewProps {
  viewingCategory: string;
  setViewingCategory: (category: string | null) => void;
  setActiveTab: (tab: string) => void;
  onSelectMovie: (movie: any) => void;
  myList: any[];
  toggleMyList: (id: any) => void;
  history: any[];
  startPlayback: (movie: any) => void;
  visibleCount: number;
  loadMore: () => void;
  allMovies: any[];
  data: any[];
  selectedRegion?: string;
  setSelectedRegion?: (region: string) => void;
  removeFromHistory: (id: string | number, type?: string) => void;
  removeFromProgress: (id: string) => void;
  clearHistory: () => void;
  clearMyList: () => void;
  isLoading: boolean;
}

const REGIONS = [
  { id: "All", name: "All Regions" },
  { id: "1", name: "South Korea" },
  { id: "2", name: "China" },
  { id: "4", name: "Japan" },
  { id: "7", name: "Thailand" },
  { id: "8", name: "Philippines" },
  { id: "5", name: "Taiwan" },
  { id: "6", name: "Hong Kong" },
  { id: "3", name: "Vietnam" },
];

export const CategoryView = React.memo<CategoryViewProps>(
  ({
    viewingCategory,
    setViewingCategory,
    setActiveTab,
    onSelectMovie,
    myList,
    toggleMyList,
    history,
    startPlayback,
    data,
    visibleCount,
    loadMore,
    allMovies,
    selectedRegion,
    setSelectedRegion,
    removeFromHistory,
    removeFromProgress,
    clearHistory,
    clearMyList,
    isLoading,
  }) => {
    const [windowWidth, setWindowWidth] = React.useState(
      typeof window !== "undefined" ? window.innerWidth : 1200,
    );
    const [libraryTab, setLibraryTab] = React.useState<
      "all" | "mylist" | "history"
    >("all");

    React.useEffect(() => {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    const columns = React.useMemo(() => {
      if (windowWidth >= 1536) return 9; // 2xl
      if (windowWidth >= 1280) return 8; // xl
      if (windowWidth >= 1024) return 6; // lg
      if (windowWidth >= 768) return 5; // md
      if (windowWidth >= 640) return 4; // sm
      return 3; // mobile
    }, [windowWidth]);

    React.useEffect(() => {
      if ((window as any).__isRestoringScroll) return;
      window.scrollTo({ top: 0, behavior: "instant" });
    }, [viewingCategory]);

    const isDrama = viewingCategory === "Dramas";

    const myListFilteredMovies = React.useMemo(() => {
      if (!allMovies || !myList) return [];
      return allMovies.filter((m) =>
        myList.some((item: any) => {
          const id = typeof item === "object" && item !== null ? item.id : item;
          const type =
            typeof item === "object" && item !== null ? item.type : "movie";
          return (
            id.toString() === m.id.toString() && type === (m.type || "movie")
          );
        }),
      );
    }, [allMovies, myList]);

    const historyFilteredMovies = React.useMemo(() => {
      if (!allMovies || !history || history.length === 0) return [];
      let progressMap: Record<string, any> = {};
      try {
        progressMap = JSON.parse(
          localStorage.getItem("nebula-progress") || "{}",
        );
      } catch {
        /* ignore */
      }

      return history
        .map((item) => {
          let rawId = "";
          let type = "movie";
          if (item && typeof item === "object") {
            rawId = String(item.id);
            type = item.type || "movie";
          } else if (typeof item === "string") {
            if (item.includes("_")) {
              const parts = item.split("_");
              type = parts[0];
              rawId = parts[1];
            } else {
              rawId = item;
            }
          } else {
            rawId = String(item);
          }

          const m = (allMovies || []).find((movie) => {
            const mId = movie.id.toString();
            const mType = movie.type || "movie";
            return mId === rawId && mType === type;
          });
          if (!m) return null;

          const progKey = Object.keys(progressMap).find((k) =>
            k.startsWith(rawId),
          );
          return { ...m, progress: progKey ? progressMap[progKey] : null };
        })
        .filter(Boolean);
    }, [allMovies, history]);

    // Helper to render grid with ads every 20 items
    const renderGridWithAds = () => {
      const rawItems = data.slice(0, visibleCount);

      // We only slice to a multiple of columns if we have more items to load in total.
      // That means if we are not at the end of the collection (we can either load more or fetch more).
      const hasMoreData =
        data.length > visibleCount ||
        [
          "Dramas",
          "Trending Operations",
          "Movies",
          "TV Shows",
          "Trending Now",
        ].includes(viewingCategory || "") ||
        (viewingCategory ? !!ROW_FETCH_CONFIG[viewingCategory] : false);

      const displayCount =
        hasMoreData && rawItems.length >= columns
          ? Math.floor(rawItems.length / columns) * columns
          : rawItems.length;

      const items = rawItems.slice(0, displayCount);
      return items.map((item, i) => (
        <MovieCard
          key={`cat-grid-${viewingCategory}-${item.id}-${i}`}
          movie={item}
          aspect="portrait"
          isGrid={true}
          onSelect={onSelectMovie}
          isInList={myList.some((i: any) => {
            const id = typeof i === "object" && i !== null ? i.id : i;
            const type = typeof i === "object" && i !== null ? i.type : "movie";
            return (
              id.toString() === item.id.toString() &&
              type === (item.type || "movie")
            );
          })}
          onToggleList={() => toggleMyList(item)}
        />
      ));
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="min-h-screen pt-16 sm:pt-24 md:pt-28 px-3.5 sm:px-6 md:px-12 pb-24 sm:pb-32"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 sm:mb-12">
          <div className="flex flex-col gap-3 sm:gap-4">
            <button
              onClick={() => {
                setActiveTab("home");
                setViewingCategory(null);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-nebula-cyan/30 text-nebula-cyan hover:text-white transition-all duration-300 group self-start shadow-md backdrop-blur-sm"
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
              <h2 className="text-2.5xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
                {STREAMING_PROVIDERS.some((p) => p.name === viewingCategory)
                  ? `Popular on ${viewingCategory}`
                  : viewingCategory}
              </h2>
            </div>
            {(() => {
              const provider = STREAMING_PROVIDERS.find(
                (p) => p.name === viewingCategory,
              );
              if (!provider) return null;
              return (
                <div
                  className="h-[2px] mt-1 rounded-full shadow-[0_0_8px_currentColor]"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${provider.color}, transparent)`,
                    width: "120px",
                    color: provider.color,
                  }}
                />
              );
            })()}
          </div>

          {viewingCategory === "Trending Operations" && (
            <div className="px-4 py-2 rounded-full bg-nebula-cyan/10 border border-nebula-cyan/30 text-nebula-cyan text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
              Live Signal Feed
            </div>
          )}
        </div>

        {isDrama && setSelectedRegion && (
          <div className="flex flex-wrap gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
            {REGIONS.map((region) => {
              const isSelected = selectedRegion === region.id;
              return (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  className={`px-5 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                    isSelected
                      ? "bg-nebula-cyan border-nebula-cyan text-obsidian shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                      : "bg-white/5 border-white/10 text-white/55 hover:text-white hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  {region.name}
                </button>
              );
            })}
          </div>
        )}

        {viewingCategory === "Library" ? (
          <div className="space-y-8 sm:space-y-10">
            {/* Sub-Tab Navigation Bar & Action Header */}
            <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 bg-white/[0.03] border border-white/[0.08] p-2 sm:p-4 rounded-2xl sm:rounded-3xl backdrop-blur-xl">
              {/* Sub-Tabs */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 shrink">
                <button
                  onClick={() => setLibraryTab("all")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shrink-0 whitespace-nowrap ${
                    libraryTab === "all"
                      ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] scale-[1.02]"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>All Saved</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[8.5px] sm:text-[9px] font-black ${
                      libraryTab === "all"
                        ? "bg-obsidian/30 text-obsidian"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {myListFilteredMovies.length + historyFilteredMovies.length}
                  </span>
                </button>

                <button
                  onClick={() => setLibraryTab("mylist")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shrink-0 whitespace-nowrap ${
                    libraryTab === "mylist"
                      ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] scale-[1.02]"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>My List</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[8.5px] sm:text-[9px] font-black ${
                      libraryTab === "mylist"
                        ? "bg-obsidian/30 text-obsidian"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {myListFilteredMovies.length}
                  </span>
                </button>

                <button
                  onClick={() => setLibraryTab("history")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shrink-0 whitespace-nowrap ${
                    libraryTab === "history"
                      ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] scale-[1.02]"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>Watch History</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[8.5px] sm:text-[9px] font-black ${
                      libraryTab === "history"
                        ? "bg-obsidian/30 text-obsidian"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {historyFilteredMovies.length}
                  </span>
                </button>
              </div>

              {/* Clear Button */}
              {((libraryTab === "mylist" && myList.length > 0) ||
                (libraryTab === "history" && history.length > 0) ||
                (libraryTab === "all" &&
                  (myList.length > 0 || history.length > 0))) && (
                <button
                  onClick={() => {
                    if (libraryTab === "mylist") clearMyList();
                    else if (libraryTab === "history") clearHistory();
                    else {
                      clearMyList();
                      clearHistory();
                    }
                  }}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-red-500/20 hover:border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer shadow-sm active:scale-95"
                  title={`Clear ${libraryTab === "all" ? "Library" : libraryTab === "mylist" ? "My List" : "Watch History"}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {/* 1. MY LIST SECTION */}
            {(libraryTab === "all" || libraryTab === "mylist") && (
              <section className="mb-10 sm:mb-12">
                <div className="flex justify-between items-center mb-5 sm:mb-6">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span className="w-1.5 h-5 sm:h-6 rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shrink-0 shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
                    <h3 className="text-lg sm:text-xl md:text-2xl font-display font-black uppercase tracking-tighter text-white/95 leading-none">
                      My List
                    </h3>
                    <span className="text-[9px] sm:text-[10px] font-black text-nebula-cyan bg-nebula-cyan/10 border border-nebula-cyan/30 px-2 py-0.5 rounded-md">
                      {myListFilteredMovies.length}
                    </span>
                  </div>
                </div>

                {isLoading && myList.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-x-2.5 sm:gap-x-6 gap-y-4 sm:gap-y-8">
                    {[...Array(Math.min(myList.length, 18))].map((_, i) => (
                      <MovieSkeleton key={`sk-lib-my-${i}`} isGrid={true} />
                    ))}
                  </div>
                ) : myListFilteredMovies.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-x-2.5 sm:gap-x-6 gap-y-4 sm:gap-y-8">
                    {myListFilteredMovies.map((movie, i) => (
                      <div
                        key={`lib-my-${movie.id}-${i}`}
                        className="relative group/libitem w-full h-full"
                      >
                        <MovieCard
                          movie={movie}
                          isGrid={true}
                          onSelect={onSelectMovie}
                          isInList={true}
                          onToggleList={() => toggleMyList(movie)}
                        />
                        {/* Quick Remove Button Overlay */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMyList(movie);
                          }}
                          className="absolute top-2 right-2 z-50 w-7 h-7 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white/80 hover:text-red-400 hover:border-red-400/50 hover:bg-black flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover/libitem:opacity-100 transition-all duration-200 shadow-xl cursor-pointer"
                          title="Remove from My List"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 sm:py-20 text-center border border-dashed border-white/10 rounded-3xl bg-gradient-to-b from-white/[0.02] to-transparent px-4">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-nebula-cyan/10 border border-nebula-cyan/30 flex items-center justify-center mx-auto mb-5 sm:mb-6 text-nebula-cyan shadow-[0_0_25px_rgba(0,229,255,0.15)]">
                      <Plus size={26} />
                    </div>
                    <h4 className="text-lg sm:text-2xl font-display font-black uppercase tracking-tight text-white mb-2">
                      Your List is Empty
                    </h4>
                    <p className="text-white/40 text-xs sm:text-sm max-w-md mx-auto mb-6 font-medium">
                      Bookmark movies and TV series to quickly access them
                      anytime.
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab("home");
                        setViewingCategory(null);
                      }}
                      className="px-6 py-2.5 rounded-full bg-nebula-cyan text-obsidian font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] cursor-pointer"
                    >
                      Explore Movies & TV
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* 2. WATCH HISTORY SECTION */}
            {(libraryTab === "all" || libraryTab === "history") && (
              <section className="mb-8">
                <div className="flex justify-between items-center mb-5 sm:mb-6">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span className="w-1.5 h-5 sm:h-6 rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shrink-0 shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
                    <h3 className="text-lg sm:text-xl md:text-2xl font-display font-black uppercase tracking-tighter text-white/95 leading-none">
                      Watch History
                    </h3>
                    <span className="text-[9px] sm:text-[10px] font-black text-nebula-cyan bg-nebula-cyan/10 border border-nebula-cyan/30 px-2 py-0.5 rounded-md">
                      {historyFilteredMovies.length}
                    </span>
                  </div>
                </div>

                {isLoading && history.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-x-2.5 sm:gap-x-6 gap-y-4 sm:gap-y-8">
                    {[...Array(Math.min(history.length, 18))].map((_, i) => (
                      <MovieSkeleton key={`sk-lib-hist-${i}`} isGrid={true} />
                    ))}
                  </div>
                ) : historyFilteredMovies.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-x-2.5 sm:gap-x-6 gap-y-4 sm:gap-y-8">
                    {historyFilteredMovies.map((movie: any, i: number) => (
                      <div
                        key={`lib-hist-${movie.id}-${i}`}
                        className="relative group/histitem w-full h-full"
                      >
                        <MovieCard
                          movie={movie}
                          isGrid={true}
                          onSelect={onSelectMovie}
                          isInList={myList.some((item: any) => {
                            const id =
                              typeof item === "object" && item !== null
                                ? item.id
                                : item;
                            const type =
                              typeof item === "object" && item !== null
                                ? item.type
                                : "movie";
                            return (
                              id.toString() === movie.id.toString() &&
                              type === (movie.type || "movie")
                            );
                          })}
                          onToggleList={() => toggleMyList(movie)}
                        />

                        {/* Quick Remove from History Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(movie.id, movie.type);
                          }}
                          className="absolute top-2 right-2 z-50 w-7 h-7 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white/80 hover:text-red-400 hover:border-red-400/50 hover:bg-black flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover/histitem:opacity-100 transition-all duration-200 shadow-xl cursor-pointer"
                          title="Remove from History"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 sm:py-20 text-center border border-dashed border-white/10 rounded-3xl bg-gradient-to-b from-white/[0.02] to-transparent px-4">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-nebula-cyan/10 border border-nebula-cyan/30 flex items-center justify-center mx-auto mb-5 sm:mb-6 text-nebula-cyan shadow-[0_0_25px_rgba(0,229,255,0.15)]">
                      <Search size={26} />
                    </div>
                    <h4 className="text-lg sm:text-2xl font-display font-black uppercase tracking-tight text-white mb-2">
                      No Watch History
                    </h4>
                    <p className="text-white/40 text-xs sm:text-sm max-w-md mx-auto mb-6 font-medium">
                      Titles you play will automatically be tracked here.
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab("home");
                        setViewingCategory(null);
                      }}
                      className="px-6 py-2.5 rounded-full bg-nebula-cyan text-obsidian font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] cursor-pointer"
                    >
                      Discover Trending Titles
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-x-2.5 sm:gap-x-6 gap-y-6 sm:gap-y-12">
              {isLoading && data.length === 0
                ? [...Array(columns * 3)].map((_, i) => (
                    <MovieSkeleton key={`sk-cat-${i}`} isGrid={true} />
                  ))
                : renderGridWithAds()}
            </div>
            {!isLoading &&
              data.length > 0 &&
              (data.length > visibleCount ||
                [
                  "Dramas",
                  "Trending Operations",
                  "Movies",
                  "TV Shows",
                  "Trending Now",
                ].includes(viewingCategory || "") ||
                ROW_FETCH_CONFIG[viewingCategory || ""]) &&
              viewingCategory !== "Library" && (
                <div className="mt-16 flex justify-center">
                  <button
                    onClick={loadMore}
                    className="px-8 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] uppercase font-bold tracking-[0.2em] transition-all group"
                  >
                    <span className="group-hover:text-nebula-cyan transition-colors">
                      Load More
                    </span>
                  </button>
                </div>
              )}
          </>
        )}

        {viewingCategory &&
          (ROW_FETCH_CONFIG[viewingCategory] || viewingCategory === "Dramas") &&
          visibleCount >= data.length &&
          data.length > 0 &&
          isLoading && (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-2 border-nebula-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dim text-sm font-light">
                Decrypting more data streams from the fringe...
              </p>
            </div>
          )}
      </motion.div>
    );
  },
);
