import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const indicatorFillRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Drag-to-scroll state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const checkScrollPosition = useCallback(() => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    const newShowLeft = scrollLeft > 2;
    const newShowRight = scrollLeft + clientWidth < scrollWidth - 5;

    setShowLeftArrow((prev) => (prev !== newShowLeft ? newShowLeft : prev));
    setShowRightArrow((prev) => (prev !== newShowRight ? newShowRight : prev));

    const maxScroll = scrollWidth - clientWidth;
    const pct = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
    if (indicatorFillRef.current) {
      indicatorFillRef.current.style.width = `${Math.max(4, pct)}%`;
    }
  }, []);

  const updateArrows = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      checkScrollPosition();
    });
  }, [checkScrollPosition]);

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener("resize", updateArrows, { passive: true });
    return () => {
      window.removeEventListener("resize", updateArrows);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [children, checkScrollPosition, updateArrows]);

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

  return (
    <section
      className="mb-6 sm:mb-8 md:mb-12 relative group/row"
      onMouseEnter={checkScrollPosition}
    >
      {/* Row title */}
      <div
        className={`flex items-center gap-3 mb-4 sm:mb-6 ${onTitleClick ? "cursor-pointer group/title" : ""}`}
        onClick={onTitleClick}
      >
        <span className="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shrink-0" />
        <h2
          className={`text-base sm:text-xl md:text-2xl font-display font-black tracking-tighter uppercase text-white/90 group-hover/title:text-nebula-cyan transition-colors leading-none ${onTitleClick ? "animated-underline" : ""}`}
        >
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
        {/* Left arrow button (Instant CSS group-hover overlay) */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll Left"
          className={`absolute left-[-12px] md:left-[-24px] top-[-16px] bottom-[-16px] z-50 w-16 sm:w-20 bg-gradient-to-r from-obsidian via-obsidian/90 to-transparent flex items-center justify-start pl-3 sm:pl-4 text-white/60 hover:text-nebula-cyan transition-all duration-200 hidden md:flex ${
            showLeftArrow
              ? "opacity-0 group-hover/row:opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/15 hover:scale-110 transition-all shadow-2xl">
            <ChevronLeft size={28} />
          </div>
        </button>

        {/* Scrollable row */}
        <div
          ref={rowRef}
          onScroll={updateArrows}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          className="flex gap-2.5 sm:gap-5 overflow-x-auto overflow-y-hidden py-4 -my-4 pr-4 sm:px-0 custom-scrollbar snap-x snap-proximity scroll-smooth select-none"
        >
          {children}
        </div>

        {/* Right arrow button (Instant CSS group-hover overlay) */}
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll Right"
          className={`absolute right-[-12px] md:right-[-24px] top-[-16px] bottom-[-16px] z-50 w-16 sm:w-20 bg-gradient-to-l from-obsidian via-obsidian/90 to-transparent flex items-center justify-end pr-3 sm:pr-4 text-white/60 hover:text-nebula-cyan transition-all duration-200 hidden md:flex ${
            showRightArrow
              ? "opacity-0 group-hover/row:opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/15 hover:scale-110 transition-all shadow-2xl">
            <ChevronRight size={28} />
          </div>
        </button>
      </div>

      {/* High-performance scroll position indicator */}
      <div className="scroll-indicator-track opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
        <div
          ref={indicatorFillRef}
          className="scroll-indicator-fill"
          style={{ width: "4%" }}
        />
      </div>
    </section>
  );
};
