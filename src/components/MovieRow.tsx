import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MovieRowProps {
  title: string;
  children: React.ReactNode;
  onTitleClick?: () => void;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  children,
  onTitleClick,
}) => {
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
  }, [children]);

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
      <div
        className={`flex items-center gap-4 mb-6 ${onTitleClick ? "cursor-pointer group/title" : ""}`}
        onClick={onTitleClick}
      >
        <h2 className="text-xl md:text-3xl font-display font-medium tracking-tight text-white/90 group-hover/title:text-nebula-cyan transition-colors">
          {title}
        </h2>
        {onTitleClick && (
          <ChevronRight
            size={24}
            className="text-dim group-hover/title:text-nebula-cyan group-hover/title:translate-x-1 transition-all"
          />
        )}
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
          className="flex gap-1 sm:gap-6 overflow-x-auto py-4 -my-4 px-4 -mx-4 custom-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {children}
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
