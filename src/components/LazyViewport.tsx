import React, { useState, useEffect, useRef } from "react";

interface LazyViewportProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  onVisible?: () => void;
  onPrefetch?: () => void;
  prefetchMargin?: string;
  renderMargin?: string;
  minHeight?: string | number;
}

export const LazyViewport: React.FC<LazyViewportProps> = ({
  children,
  placeholder = null,
  onVisible,
  onPrefetch,
  prefetchMargin = "2500px 0px 2500px 0px",
  renderMargin = "1200px 0px 1200px 0px",
  minHeight = "350px",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const hasPrefetchedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Stage 1: Prefetch observer — triggers background data fetch early
  useEffect(() => {
    if (hasPrefetchedRef.current) return;

    const currentEl = containerRef.current;
    if (!currentEl) return;

    const prefetchObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasPrefetchedRef.current = true;
          if (onPrefetch) {
            onPrefetch();
          } else if (onVisible) {
            onVisible();
          }
          prefetchObserver.unobserve(currentEl);
        }
      },
      { rootMargin: prefetchMargin },
    );

    prefetchObserver.observe(currentEl);
    return () => {
      prefetchObserver.disconnect();
    };
  }, [onPrefetch, onVisible, prefetchMargin]);

  // 2. Stage 2: Render observer — renders actual component DOM when close to viewport
  useEffect(() => {
    if (isVisible) return;

    const currentEl = containerRef.current;
    if (!currentEl) return;

    const renderObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // If onVisible wasn't called during prefetch, call it now
          if (!hasPrefetchedRef.current && onVisible) {
            hasPrefetchedRef.current = true;
            onVisible();
          }
          renderObserver.unobserve(currentEl);
        }
      },
      { rootMargin: renderMargin },
    );

    renderObserver.observe(currentEl);
    return () => {
      renderObserver.disconnect();
    };
  }, [isVisible, onVisible, renderMargin]);

  return (
    <div
      ref={containerRef}
      style={{ minHeight: isVisible ? undefined : minHeight }}
    >
      {isVisible ? children : placeholder}
    </div>
  );
};
