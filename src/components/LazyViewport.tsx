import React, { useState, useEffect, useRef } from "react";

interface LazyViewportProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  onVisible?: () => void;
  onPrefetch?: () => void;
  prefetchMargin?: string;
  renderMargin?: string;
  minHeight?: string | number;
  recycleOffscreen?: boolean;
}

export const LazyViewport: React.FC<LazyViewportProps> = ({
  children,
  placeholder = null,
  onVisible,
  onPrefetch,
  prefetchMargin = "2500px 0px 2500px 0px",
  renderMargin = "1200px 0px 1200px 0px",
  minHeight = "350px",
  recycleOffscreen = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const hasPrefetchedRef = useRef(false);
  const hasBeenVisibleRef = useRef(false);
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
  //    Once rendered, we NEVER unmount (hasBeenVisibleRef stays true).
  //    Instead, we use CSS content-visibility:auto to let the browser
  //    skip layout/paint for offscreen rows without destroying the DOM
  //    or evicting decoded images from cache.
  useEffect(() => {
    const currentEl = containerRef.current;
    if (!currentEl) return;

    const renderObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          hasBeenVisibleRef.current = true;
          // If onVisible wasn't called during prefetch, call it now
          if (!hasPrefetchedRef.current && onVisible) {
            hasPrefetchedRef.current = true;
            onVisible();
          }
          if (!recycleOffscreen) {
            renderObserver.unobserve(currentEl);
          }
        } else if (recycleOffscreen) {
          setIsVisible(false);
        }
      },
      { rootMargin: renderMargin },
    );

    renderObserver.observe(currentEl);
    return () => {
      renderObserver.disconnect();
    };
  }, [onVisible, renderMargin, recycleOffscreen]);

  // Once rendered, always keep in DOM — use content-visibility for perf
  const hasRendered = hasBeenVisibleRef.current || isVisible;

  return (
    <div
      ref={containerRef}
      style={
        hasRendered
          ? isVisible
            ? undefined
            : {
                contentVisibility: "auto" as any,
                containIntrinsicSize: `auto ${minHeight}`,
              }
          : { minHeight }
      }
    >
      {hasRendered ? children : placeholder}
    </div>
  );
};
