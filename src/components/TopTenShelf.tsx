import React, { useRef, useState, useEffect, memo } from "react";
import { NebulaMovie } from "../services/tmdb";
import { handleImageError } from "../utils/helpers";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const TopTenShelf = memo(
  ({ data, onSelect }: { data: NebulaMovie[]; onSelect: (m: any) => void }) => {
    const topMovies = data.slice(0, 10);
    const rowRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const updateArrows = () => {
      if (rowRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
        setShowLeftArrow(scrollLeft > 10);
        setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
      }
    };

    useEffect(() => {
      updateArrows();
      window.addEventListener("resize", updateArrows);
      return () => window.removeEventListener("resize", updateArrows);
    }, [data]);

    const scroll = (direction: "left" | "right") => {
      if (rowRef.current) {
        const { clientWidth } = rowRef.current;
        const scrollAmount =
          direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
        rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    };

    return (
      <section
        className="mb-12 relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
          <h3 className="text-xl md:text-3xl font-display font-black uppercase tracking-tighter">
            Top Ten Operations
          </h3>
          <div className="h-px flex-1 mx-8 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="relative">
          <AnimatePresence>
            {isHovered && showLeftArrow && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scroll("left")}
                className="absolute left-[-16px] top-[-16px] bottom-[-16px] z-50 w-24 bg-gradient-to-r from-obsidian via-obsidian/80 to-transparent flex items-center justify-start pl-6 text-white/50 hover:text-nebula-cyan transition-all hidden md:flex"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all shadow-2xl">
                  <ChevronLeft size={32} />
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          <div
            ref={rowRef}
            onScroll={updateArrows}
            className="flex gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden py-8 -my-8 px-4 sm:px-0 custom-scrollbar snap-x snap-mandatory scroll-smooth"
          >
            {topMovies.map((movie, i) => (
              <div
                key={`top-shelf-${movie.id}-${i}`}
                className="flex-shrink-0 relative group/card cursor-pointer snap-start flex items-end pl-[24px] sm:pl-[40px]"
                onClick={() => onSelect(movie)}
              >
                <span
                  className="absolute left-0 bottom-[-10px] sm:bottom-[-20px] text-[100px] sm:text-[160px] leading-[0.8] font-display font-black transition-all duration-500 group-hover/card:-translate-x-2 z-20 tracking-tighter"
                  style={{
                    color: "#0b0f19",
                    WebkitTextStroke: "2px rgba(255,255,255,0.7)",
                    textShadow: "0 10px 30px rgba(0,0,0,0.8)",
                  }}
                >
                  {i + 1}
                </span>
                <div className="w-[120px] sm:w-[180px] aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover/card:scale-110 group-hover/card:-translate-y-2 group-hover/card:border-nebula-cyan/50 group-hover/card:shadow-[0_20px_60px_rgba(0,229,255,0.2)] group-hover/card:z-30 z-10 origin-bottom relative">
                  <img
                    src={movie.image}
                    className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity"
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                  {/* Status Badges Overlay */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-40 pointer-events-none">
                    {/* Quality Badge */}
                    {movie.quality && (
                      <div
                        className={`px-1.5 py-0.5 rounded-md backdrop-blur-xl border border-white/20 shadow-2xl ${
                          movie.quality === "CAM"
                            ? "bg-amber-500/30"
                            : movie.quality === "TBA"
                              ? "bg-red-500/30"
                              : "bg-nebula-cyan/30"
                        }`}
                      >
                        <p
                          className={`text-[8px] font-black uppercase tracking-wider ${
                            movie.quality === "CAM"
                              ? "text-amber-400"
                              : movie.quality === "TBA"
                                ? "text-red-400"
                                : "text-nebula-cyan"
                          }`}
                        >
                          {movie.quality}
                        </p>
                      </div>
                    )}

                    {/* Status Indicator */}
                    {movie.isVerified ? (
                      <div className="px-1.5 py-0.5 rounded-md bg-emerald-500/30 border border-emerald-500/50 backdrop-blur-xl shadow-2xl">
                        <p className="text-[8px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="hidden sm:inline">Verified</span>
                          <span className="sm:hidden">Live</span>
                        </p>
                      </div>
                    ) : movie.isDead ? (
                      <div className="px-1.5 py-0.5 rounded-md bg-rose-600/40 border border-rose-500/60 backdrop-blur-xl shadow-2xl">
                        <p className="text-[8px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-rose-500" />
                          <span className="hidden sm:inline">No Signal</span>
                          <span className="sm:hidden">Dead</span>
                        </p>
                      </div>
                    ) : (
                      movie.quality !== "TBA" && (
                        <div className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl">
                          <p className="text-[8px] font-black text-white/80 uppercase tracking-wider">
                            {movie.quality === "CAM" ? "Theater" : "Pending"}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {isHovered && showRightArrow && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scroll("right")}
                className="absolute right-[-16px] top-[-16px] bottom-[-16px] z-50 w-24 bg-gradient-to-l from-obsidian via-obsidian/80 to-transparent flex items-center justify-end pr-6 text-white/50 hover:text-nebula-cyan transition-all hidden md:flex"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all shadow-2xl">
                  <ChevronRight size={32} />
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </section>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.data.length !== nextProps.data.length) return false;
    const prevSlice = prevProps.data.slice(0, 10);
    const nextSlice = nextProps.data.slice(0, 10);
    if (prevSlice.length !== nextSlice.length) return false;
    return prevSlice.every((movie, index) => {
      const nextMovie = nextSlice[index];
      return (
        movie?.id === nextMovie?.id &&
        movie?.image === nextMovie?.image &&
        movie?.title === nextMovie?.title
      );
    });
  },
);
