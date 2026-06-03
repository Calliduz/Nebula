import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp } from "lucide-react";

interface ScrollToTopProps {
  /** Scroll offset in px before the button appears. Defaults to 400. */
  threshold?: number;
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({
  threshold = 400,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Sync immediately in case page is already scrolled on mount
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-to-top-btn"
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 z-[200] w-11 h-11 rounded-full
                     bg-nebula-cyan/10 border border-nebula-cyan/35 backdrop-blur-md
                     flex items-center justify-center text-nebula-cyan
                     hover:bg-nebula-cyan hover:text-obsidian
                     transition-colors duration-200
                     shadow-[0_0_18px_rgba(0,243,255,0.12)]
                     hover:shadow-[0_0_24px_rgba(0,243,255,0.35)]"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
