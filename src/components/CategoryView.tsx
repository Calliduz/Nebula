import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Play, Search, Plus, Shield } from "lucide-react";
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

export const CategoryView: React.FC<CategoryViewProps> = ({
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
      className="min-h-screen pt-12 pl-2 pr-4 sm:px-6 md:px-12 pb-32"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <button
            onClick={() => {
              setActiveTab("home");
              setViewingCategory(null);
            }}
            className="flex items-center gap-2 text-nebula-cyan hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="text-[10px] font-black tracking-widest uppercase">
              Back to Command Center
            </span>
          </button>
          <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter uppercase">
            {STREAMING_PROVIDERS.some((p) => p.name === viewingCategory)
              ? `Popular on ${viewingCategory}`
              : viewingCategory}
          </h2>
          {(() => {
            const provider = STREAMING_PROVIDERS.find(
              (p) => p.name === viewingCategory,
            );
            if (!provider) return null;
            return (
              <div
                className="h-0.5 mt-3 rounded"
                style={{
                  backgroundImage: `linear-gradient(to right, ${provider.color}, transparent)`,
                  width: "120px",
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
          {REGIONS.map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`px-5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                selectedRegion === region.id
                  ? "bg-nebula-cyan border-nebula-cyan text-obsidian"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>
      )}

      {viewingCategory === "Library" ? (
        <div className="space-y-16">
          <section>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-display font-medium tracking-tight text-white">
                My List
              </h3>
              {myList.length > 0 && (
                <button
                  onClick={clearMyList}
                  className="text-xs font-bold uppercase tracking-widest text-nebula-cyan/70 hover:text-nebula-cyan transition-colors px-4 py-1.5 rounded-full border border-nebula-cyan/30 hover:bg-nebula-cyan/10"
                >
                  Clear All
                </button>
              )}
            </div>
            {(allMovies || []).length > 0 && myList.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-x-2.5 sm:gap-x-6 gap-y-6 sm:gap-y-12">
                {(allMovies || [])
                  .filter((m) =>
                    myList.some((item: any) => {
                      const id =
                        typeof item === "object" && item !== null
                          ? item.id
                          : item;
                      const type =
                        typeof item === "object" && item !== null
                          ? item.type
                          : "movie";
                      return (
                        id.toString() === m.id.toString() &&
                        type === (m.type || "movie")
                      );
                    }),
                  )
                  .map((movie, i) => (
                    <MovieCard
                      key={`lib-my-${movie.id}-${i}`}
                      movie={movie}
                      isGrid={true}
                      onSelect={onSelectMovie}
                      isInList={true}
                      onToggleList={() => toggleMyList(movie)}
                      onRemove={() => toggleMyList(movie)}
                    />
                  ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                  <Plus className="text-dim" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  Your registry is empty
                </h3>
                <p className="text-dim max-w-md mx-auto font-light">
                  Add missions to your list for quick access during deep-space
                  operation.
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-display font-medium tracking-tight text-white">
                Watch History
              </h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs font-bold uppercase tracking-widest text-nebula-cyan/70 hover:text-nebula-cyan transition-colors px-4 py-1.5 rounded-full border border-nebula-cyan/30 hover:bg-nebula-cyan/10"
                >
                  Clear All
                </button>
              )}
            </div>
            {(allMovies || []).length > 0 && history.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-x-2.5 sm:gap-x-6 gap-y-6 sm:gap-y-12">
                {history
                  .slice()
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

                    const m = (allMovies || []).find((m) => {
                      const mId = m.id.toString();
                      const mType = m.type || "movie";
                      return mId === rawId && mType === type;
                    });
                    if (!m) return null;

                    const p = JSON.parse(
                      localStorage.getItem("nebula-progress") || "{}",
                    );
                    const progKey = Object.keys(p).find((k) =>
                      k.startsWith(rawId),
                    );
                    return { ...m, progress: progKey ? p[progKey] : null };
                  })
                  .filter(Boolean)
                  .map((movie: any, i) => (
                    <div
                      key={`lib-hist-${movie.id}-${i}`}
                      className="relative group w-full h-full"
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
                        onRemove={() => removeFromHistory(movie.id, movie.type)}
                      />
                      <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startPlayback(movie)}
                          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center pointer-events-auto border border-white/50 hover:bg-white hover:text-black transition-colors pl-1"
                        >
                          <Play size={20} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                  <Search className="text-dim" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  No operations history
                </h3>
                <p className="text-dim max-w-md mx-auto font-light">
                  Missions you play will be recorded here.
                </p>
              </div>
            )}
          </section>
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
};
