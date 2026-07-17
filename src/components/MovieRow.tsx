import React, { useRef, useState, useEffect, useCallback } from "react";
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
  const [scrollPct, setScrollPct] = useState(0);

  // Drag-to-scroll state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const updateArrows = useCallback(() => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
      const maxScroll = scrollWidth - clientWidth;
      setScrollPct(maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0);
    }
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [children, updateArrows]);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount =
        direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // ── Drag-to-scroll handlers ──────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!rowRef.current) return;
    isDragging.current = true;
    dragStartX.current = e.pageX - rowRef.current.offsetLeft;
    dragScrollLeft.current = rowRef.current.scrollLeft;
    rowRef.current.style.cursor = "grabbing";
    rowRef.current.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !rowRef.current) return;
    e.preventDefault();
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;
    rowRef.current.scrollLeft = dragScrollLeft.current - walk;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!rowRef.current) return;
    isDragging.current = false;
    rowRef.current.style.cursor = "";
    rowRef.current.style.userSelect = "";
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!rowRef.current) return;
    isDragging.current = false;
    rowRef.current.style.cursor = "";
    rowRef.current.style.userSelect = "";
  }, []);

  // Determine fade mask based on scroll position
  const getMaskClass = () => {
    if (showLeftArrow && showRightArrow) return "scroll-fade-both";
    if (showLeftArrow) return "[mask-image:linear-gradient(to_right,transparent_0%,black_8%)]";
    if (showRightArrow) return "[mask-image:linear-gradient(to_left,transparent_0%,black_8%)]";
    return "";
  };

  return (
    <section
      className="mb-6 sm:mb-8 md:mb-12 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Row title */}
      <div
        className={`flex items-center gap-3 mb-4 sm:mb-6 ${onTitleClick ? "cursor-pointer group/title" : ""}`}
        onClick={onTitleClick}
      >
        <span className="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shrink-0" />
        <h2 className={`text-base sm:text-xl md:text-2xl font-display font-black tracking-tighter uppercase text-white/90 group-hover/title:text-nebula-cyan transition-colors leading-none ${onTitleClick ? "animated-underline" : ""}`}>
          {title}
        </h2>
        {onTitleClick && (
          <ChevronRight
            size={20}
            className="text-dim group-hover/title:text-nebula-cyan group-hover/title:translate-x-1 transition-all shrink-0"
          />
        )}
      </div>

      {/* Scroll container */}
      <div className="relative">
        {/* Left arrow */}
        <AnimatePresence>
          {isHovered && showLeftArrow && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll("left")}
              className="absolute left-[-16px] top-[-16px] bottom-[-16px] z-50 w-20 bg-gradient-to-r from-obsidian via-obsidian/80 to-transparent flex items-center justify-start pl-4 text-white/50 hover:text-nebula-cyan transition-all hidden md:flex"
            >
              <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all shadow-2xl">
                <ChevronLeft size={28} />
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scrollable row with fade masks */}
        <div
          ref={rowRef}
          onScroll={updateArrows}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          className={`flex gap-2.5 sm:gap-5 overflow-x-auto overflow-y-hidden py-4 -my-4 pr-4 sm:px-0 custom-scrollbar snap-x snap-proximity scroll-smooth select-none ${getMaskClass()}`}
        >
          {children}
        </div>

        {/* Right arrow */}
        <AnimatePresence>
          {isHovered && showRightArrow && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => scroll("right")}
              className="absolute right-[-16px] top-[-16px] bottom-[-16px] z-50 w-20 bg-gradient-to-l from-obsidian via-obsidian/80 to-transparent flex items-center justify-end pr-4 text-white/50 hover:text-nebula-cyan transition-all hidden md:flex"
            >
              <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all shadow-2xl">
                <ChevronRight size={28} />
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll position indicator */}
      <div className={`scroll-indicator-track ${isHovered || scrollPct > 0 ? "opacity-100" : ""}`}>
        <div
          className="scroll-indicator-fill"
          style={{ width: `${Math.max(4, scrollPct)}%` }}
        />
      </div>
    </section>
  );
};
