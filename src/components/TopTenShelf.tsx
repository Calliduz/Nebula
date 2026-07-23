import React, { useRef, useState, useEffect, memo } from "react";
import { NebulaMovie } from "../services/tmdb";
import { handleImageError } from "../utils/helpers";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const TopTenShelf = memo(
  ({
    data,
    onSelect,
    isLoading,
  }: {
    data: NebulaMovie[];
    onSelect: (m: any) => void;
    isLoading?: boolean;
  }) => {
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
          <div className="flex items-center gap-3">
            <span className="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shrink-0" />
            <h3 className="text-xl md:text-2xl font-display font-black uppercase tracking-tighter leading-none">
              Top Ten Operations
            </h3>
          </div>
          <div className="h-px flex-1 ml-6 bg-gradient-to-r from-white/10 to-transparent hidden sm:block" />
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
            {isLoading
              ? [...Array(10)].map((_, i) => (
                  <div
                    key={`top-shelf-skeleton-${i}`}
                    className="flex-shrink-0 relative snap-start flex items-end pl-[20px] sm:pl-[30px] md:pl-[40px] animate-pulse"
                  >
                    <span
                      className="absolute left-0 bottom-[-5px] sm:bottom-[-10px] md:bottom-[-15px] lg:bottom-[-20px] text-[75px] sm:text-[120px] md:text-[140px] lg:text-[150px] leading-[0.8] font-display font-black z-20 tracking-tighter opacity-10"
                      style={{
                        color: "#0b0f19",
                        WebkitTextStroke: "2px rgba(255,255,255,0.3)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="w-[90px] sm:w-[130px] md:w-[150px] lg:w-[160px] aspect-[2/3] rounded-xl md:rounded-2xl bg-white/5 border border-white/10 shimmer-bg z-10 origin-bottom relative" />
                  </div>
                ))
              : topMovies.map((movie, i) => (
                  <div
                    key={`top-shelf-${movie.id}-${i}`}
                    className="flex-shrink-0 relative group/card cursor-pointer snap-start flex items-end pl-[20px] sm:pl-[30px] md:pl-[40px]"
                    onClick={() => onSelect(movie)}
                  >
                    <span
                      className="absolute left-0 bottom-[-5px] sm:bottom-[-10px] md:bottom-[-15px] lg:bottom-[-20px] text-[75px] sm:text-[120px] md:text-[140px] lg:text-[150px] leading-[0.8] font-display font-black transition-all duration-500 group-hover/card:-translate-x-2 group-hover/card:text-nebula-cyan/20 z-20 tracking-tighter"
                      style={{
                        color: "#0b0f19",
                        WebkitTextStroke: "2px rgba(255,255,255,0.7)",
                        textShadow: "0 10px 30px rgba(0,0,0,0.8)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="w-[90px] sm:w-[130px] md:w-[150px] lg:w-[160px] aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover/card:scale-110 group-hover/card:-translate-y-2 group-hover/card:border-nebula-cyan/60 group-hover/card:shadow-[0_20px_60px_rgba(0,229,255,0.3)] group-hover/card:z-30 z-10 origin-bottom relative">
                      <img
                        src={movie.image}
                        className="w-full h-full object-cover opacity-80 group-hover/card:opacity-60 group-hover/card:scale-110 transition-all duration-500"
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-300 pointer-events-none z-20">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-nebula-cyan/95 text-obsidian flex items-center justify-center shadow-[0_0_25px_rgba(0,229,255,0.75)] transform scale-75 group-hover/card:scale-100 transition-transform duration-300">
                          <Play size={20} className="fill-obsidian ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/80 via-black/10 to-transparent opacity-90 pointer-events-none z-10" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
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
    if (prevProps.isLoading !== nextProps.isLoading) return false;
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
