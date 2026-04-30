import React, { useRef, useState, useEffect } from "react";
import { NebulaMovie } from "../services/tmdb";
import { handleImageError } from "../utils/helpers";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const TopTenShelf = ({
  data,
  onSelect,
}: {
  data: NebulaMovie[];
  onSelect: (m: any) => void;
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
      const scrollAmount = direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
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
};
