import React from "react";
import { motion } from "motion/react";
import { Play, Plus, Info, Sparkles } from "lucide-react";
import {
  handleImageError,
  handleBackdropError,
  handleClearLogoError,
} from "../utils/helpers";

interface HeroProps {
  currentHeroIndex: number;
  setCurrentHeroIndex: (index: number) => void;
  myList: any[];
  toggleMyList: (id: any) => void;
  startPlayback: (movie: any) => void;
  setSelectedMovie: (movie: any) => void;
  featuredMovies: any[];
}

import { HeroSkeleton } from "./HeroSkeleton";

export const Hero: React.FC<HeroProps> = ({
  currentHeroIndex,
  setCurrentHeroIndex,
  myList,
  toggleMyList,
  startPlayback,
  setSelectedMovie,
  featuredMovies,
}) => {
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [logoFailed, setLogoFailed] = React.useState(false);
  // Track which logos have individually failed (per index)
  const [logoFailedMap, setLogoFailedMap] = React.useState<
    Record<number, boolean>
  >({});

  React.useEffect(() => {
    setLogoFailed(false);
  }, [currentHeroIndex]);

  if (!featuredMovies || featuredMovies.length === 0) return <HeroSkeleton />;

  const handleTouchStart = (e: React.TouchEvent) =>
    setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50)
      setCurrentHeroIndex((currentHeroIndex + 1) % featuredMovies.length);
    else if (diff < -50)
      setCurrentHeroIndex(
        currentHeroIndex === 0
          ? featuredMovies.length - 1
          : currentHeroIndex - 1,
      );
    setTouchStart(null);
  };

  const activeHero = featuredMovies[currentHeroIndex];
  const isInMyList = myList.some(
    (id) => id.toString() === activeHero.id.toString(),
  );
  const currentLogoFailed = logoFailedMap[currentHeroIndex] ?? false;

  return (
    <section
      className="relative h-[65vh] sm:h-[70vh] md:h-[95vh] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Stacked backdrops: all rendered, active one shown via opacity ─── */}
      {featuredMovies.map((movie, i) => {
        const isActive = i === currentHeroIndex;
        return (
          <div
            key={`backdrop-${movie.id || i}`}
            className={`hero-backdrop absolute inset-0 z-0 ${isActive ? "opacity-100" : "opacity-0"}`}
          >
            {/* Desktop landscape */}
            <img
              src={movie.fanartBackground || movie.backdrop}
              alt={movie.title}
              className="hidden md:block w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading={isActive ? "eager" : "lazy"}
              decoding={isActive ? "sync" : "async"}
              onError={handleBackdropError}
            />
            {/* Mobile blurred bg — reduced blur, no scale for perf */}
            <img
              src={movie.image || movie.fanartBackground || movie.backdrop}
              alt={movie.title}
              className="block md:hidden absolute inset-0 w-full h-full object-cover opacity-20 blur-xl"
              referrerPolicy="no-referrer"
              loading={isActive ? "eager" : "lazy"}
              decoding="async"
              onError={handleBackdropError}
            />
          </div>
        );
      })}

      {/* ── Gradient overlays ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-transparent to-transparent z-10 hidden md:block" />

      {/* ── Content overlay (Unified layout to prevent overlapping) ────────── */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end px-4 pb-14 pt-16 md:pb-0 md:pt-10 md:justify-center sm:px-6 md:px-12 pointer-events-none">
        <div className="max-w-3xl pointer-events-auto md:mt-20 w-full flex flex-col items-center md:items-start gap-4 md:gap-6">
          {/* Mobile-only portrait poster card */}
          <div className="md:hidden w-40 sm:w-48 aspect-[2/3] rounded-xl overflow-hidden shadow-[0_12px_45px_rgba(0,0,0,0.75)] border border-white/10 shrink-0">
            <img
              src={
                activeHero.image ||
                activeHero.fanartBackground ||
                activeHero.backdrop
              }
              alt={activeHero.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          </div>

          <motion.div
            key={`hero-content-${activeHero.id || currentHeroIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: "easeOut" }}
            className="flex flex-col items-center md:items-start text-center md:text-left w-full"
          >
            {/* Desktop: Clear Logo, Mobile: Text Title */}
            {activeHero.clearLogo && !currentLogoFailed ? (
              <>
                <img
                  src={activeHero.clearLogo}
                  alt={activeHero.title}
                  height="176"
                  className="hidden md:block w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] h-32 md:h-44 object-contain object-left mb-6 drop-shadow-2xl"
                  onError={() =>
                    setLogoFailedMap((prev) => ({
                      ...prev,
                      [currentHeroIndex]: true,
                    }))
                  }
                />
                <h1 className="md:hidden font-display font-black tracking-tight leading-none uppercase text-white drop-shadow-lg text-xl sm:text-2xl mb-2 line-clamp-2">
                  {activeHero.title}
                </h1>
              </>
            ) : (
              <h1
                className={`font-display font-black tracking-tighter uppercase text-white drop-shadow-2xl leading-[0.85] mb-4 md:mb-6 w-full ${
                  activeHero.title.length > 20
                    ? "text-xl sm:text-2xl md:text-5xl lg:text-7xl"
                    : "text-2xl sm:text-3xl md:text-6xl lg:text-[110px]"
                }`}
              >
                {/* Desktop layout */}
                <span className="hidden md:block">
                  {activeHero.title
                    .split(":")
                    .map((part: string, i: number) => (
                      <span
                        key={`hero-part-${i}`}
                        className={
                          i > 0
                            ? "block text-[0.4em] text-white/40 tracking-normal mt-2"
                            : "block"
                        }
                      >
                        {part}
                      </span>
                    ))}
                </span>
                {/* Mobile layout */}
                <span className="md:hidden block leading-none line-clamp-2">
                  {activeHero.title}
                </span>
              </h1>
            )}

            {/* Meta Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-6 text-[10px] md:text-[13px] font-bold text-white/50 tracking-[0.15em] md:tracking-[0.2em] uppercase mb-4 md:mb-6">
              <span className="text-nebula-cyan font-black border border-nebula-cyan/30 md:border-2 px-2 py-0.5 md:px-3 md:py-1 rounded leading-none">
                {activeHero.rating || "8.4"}
              </span>
              <span>{activeHero.year}</span>
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-nebula-red" />
              <span>{activeHero.duration || "124M"}</span>
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/20 hidden sm:block" />
              <span className="hidden sm:flex items-center gap-2">
                <Sparkles size={14} className="text-nebula-cyan" /> 4K ULTRA HD
              </span>
            </div>

            {/* Desktop Description */}
            <p className="hidden md:block text-lg md:text-xl text-white/55 font-light leading-relaxed mb-8 max-w-2xl drop-shadow-md line-clamp-3">
              {activeHero.description}
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <div className="flex w-full max-w-[280px] md:max-w-none justify-center md:justify-start gap-3 md:gap-4 pb-0">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => startPlayback(activeHero)}
              className="bg-white text-obsidian px-4 md:px-10 py-2.5 md:py-4 rounded-lg font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.2em] flex items-center gap-2 md:gap-3 shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:shadow-[0_8px_40px_rgba(0,229,255,0.25)] transition-shadow duration-300 flex-1 md:flex-none justify-center"
            >
              <Play size={16} className="md:w-5 md:h-5" fill="currentColor" />{" "}
              Play
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`px-4 md:px-10 py-2.5 md:py-4 rounded-lg font-bold text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 flex-1 md:flex-none border ${
                isInMyList
                  ? "bg-nebula-cyan/15 border-nebula-cyan/60 text-nebula-cyan"
                  : "bg-white/8 border-white/12 text-white hover:bg-white/12 hover:border-white/25"
              }`}
              onClick={() => toggleMyList(activeHero.id)}
            >
              {isInMyList ? (
                <>
                  <XIcon size={16} className="md:w-5 md:h-5" /> Remove
                </>
              ) : (
                <>
                  <Plus size={16} className="md:w-5 md:h-5" /> My List
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="bg-white/8 border border-white/12 hover:bg-white/14 hover:border-white/28 px-4 sm:px-5 py-3 md:py-4 rounded-lg text-white transition-all duration-300 shrink-0 hidden md:flex items-center"
              onClick={() => setSelectedMovie(activeHero)}
            >
              <Info size={20} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Story-style progress indicators (bottom) ──────────────────────── */}
      {featuredMovies.length > 1 && (
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30 pointer-events-auto">
          {featuredMovies.map((_, i) => {
            const isActive = i === currentHeroIndex;
            return (
              <button
                key={`progress-${i}`}
                onClick={() => setCurrentHeroIndex(i)}
                className={`relative overflow-hidden rounded-full transition-all duration-300 ${
                  isActive
                    ? "w-10 md:w-14 h-1 bg-white/20"
                    : "w-4 md:w-6 h-1 bg-white/20 hover:bg-white/35"
                }`}
                aria-label={`Hero ${i + 1}`}
              >
                {isActive && (
                  <span
                    key={`fill-${currentHeroIndex}`}
                    className="hero-progress-fill absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #00e5ff, rgba(0,229,255,0.6))",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

const XIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
