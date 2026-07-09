import React, { useState, useEffect, useRef } from "react";

interface LazyViewportProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  onVisible?: () => void;
  rootMargin?: string;
  minHeight?: string | number;
}

export const LazyViewport: React.FC<LazyViewportProps> = ({
  children,
  placeholder = null,
  onVisible,
  rootMargin = "600px",
  minHeight = "350px",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (onVisible) {
            onVisible();
          }
        }
      },
      { rootMargin },
    );

    const currentEl = containerRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [isVisible, onVisible, rootMargin]);

  return (
    <div
      ref={containerRef}
      style={{ minHeight: isVisible ? undefined : minHeight }}
    >
      {isVisible ? children : placeholder}
    </div>
  );
};
