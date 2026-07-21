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
              src={movie.fanartBackground || movie.backdrop || movie.image}
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

      {/* ── Mobile portrait poster (active only) ─────────────────────────── */}
      <div className="absolute inset-0 md:hidden flex items-start justify-center pt-14 px-8 pb-28 z-[1]">
        <div className="relative h-full flex flex-col items-center justify-start gap-4 w-full max-w-xs">
          <img
            src={activeHero.image || activeHero.fanartBackground || activeHero.backdrop}
            alt={activeHero.title}
            className="h-[75%] w-auto max-w-full aspect-[2/3] object-cover rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
          {/* Mobile title + rating below poster */}
          <div className="flex flex-col items-center gap-2 w-full px-2">
            <h2 className="text-white font-display font-black text-lg uppercase tracking-tight text-center line-clamp-2 drop-shadow-lg">
              {activeHero.title}
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-bold text-white/50 uppercase tracking-[0.15em]">
              <span className="text-nebula-cyan border border-nebula-cyan/30 px-2 py-0.5 rounded leading-none">
                {activeHero.rating || "8.4"}
              </span>
              <span>{activeHero.year}</span>
              <span>{activeHero.duration || "124M"}</span>
            </div>
          </div>
        </div>
        {/* Mobile Branding */}
        <div className="absolute top-6 left-0 right-0 z-40 flex justify-center md:hidden pointer-events-none">
          <div className="flex items-center gap-2 drop-shadow-lg">
            <img
              src="/nebula-icon.png"
              alt="Nebula Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="font-display font-black tracking-widest text-xl uppercase text-white">
              NEBULA
            </span>
          </div>
        </div>
      </div>

      {/* ── Gradient overlays ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-transparent to-transparent z-10 hidden md:block" />

      {/* ── Content overlay ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 flex items-end md:items-center px-4 sm:px-6 md:px-12 pb-6 md:pb-0 md:pt-10 pointer-events-none">
        <div className="max-w-3xl pointer-events-auto md:mt-20 w-full">
          {/* Animate only opacity — no translateX to avoid layout cost */}
          <motion.div
            key={`hero-content-${activeHero.id || currentHeroIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: "easeOut" }}
            className="flex flex-col items-center md:items-start text-center md:text-left"
          >
            {/* Desktop: clear logo or title */}
            {activeHero.clearLogo && !currentLogoFailed ? (
              <img
                src={activeHero.clearLogo}
                alt={activeHero.title}
                height="176"
                className="hidden md:block w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] h-32 md:h-44 object-contain object-left mb-8 md:mb-10 drop-shadow-2xl"
                onError={() =>
                  setLogoFailedMap((prev) => ({
                    ...prev,
                    [currentHeroIndex]: true,
                  }))
                }
              />
            ) : (
              <h1
                className={`hidden md:block font-display font-black tracking-tighter leading-[0.85] mb-8 md:mb-10 uppercase text-white drop-shadow-2xl ${
                  activeHero.title.length > 20
                    ? "text-4xl sm:text-5xl md:text-7xl"
                    : "text-5xl sm:text-6xl md:text-[140px]"
                }`}
              >
                {activeHero.title.split(":").map((part: string, i: number) => (
                  <span
                    key={`hero-part-${i}`}
                    className={
                      i > 0
                        ? "block text-[0.4em] md:text-[0.4em] text-white/40 tracking-normal mt-2"
                        : "block"
                    }
                  >
                    {part}
                  </span>
                ))}
              </h1>
            )}

            {/* Desktop: meta badges */}
            <div className="hidden md:flex flex-wrap items-center gap-3 sm:gap-6 mb-8 md:mb-10 text-[11px] md:text-[13px] font-bold text-white/50 tracking-[0.2em] uppercase">
              <span className="text-nebula-cyan font-black border-2 border-nebula-cyan/30 px-3 py-1 rounded leading-none">
                {activeHero.rating || "8.4"}
              </span>
              <span>{activeHero.year}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-nebula-red hidden sm:block" />
              <span>{activeHero.duration || "124M"}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 hidden sm:block" />
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-nebula-cyan" /> 4K ULTRA HD
              </span>
            </div>

            {/* Desktop: description */}
            <p className="hidden md:block text-lg md:text-xl text-white/55 font-light leading-relaxed mb-10 md:mb-12 max-w-2xl drop-shadow-md line-clamp-3">
              {activeHero.description}
            </p>
          </motion.div>

          {/* ── CTA Buttons ───────────────────────────────────────────────── */}
          <div className="flex w-full justify-center md:justify-start gap-3 md:gap-4 pb-0 pointer-events-auto">
            {/* Play */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => startPlayback(activeHero)}
              className="bg-white text-obsidian px-6 sm:px-10 py-3 md:py-4 rounded-lg font-black text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3 shadow-[0_8px_30px_rgba(255,255,255,0.12)] hover:shadow-[0_8px_40px_rgba(0,229,255,0.25)] transition-shadow duration-300 flex-1 md:flex-none justify-center"
            >
              <Play size={18} className="md:w-5 md:h-5" fill="currentColor" />{" "}
              Play
            </motion.button>

            {/* My List */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`px-6 sm:px-10 py-3 md:py-4 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 flex-1 md:flex-none border ${
                isInMyList
                  ? "bg-nebula-cyan/15 border-nebula-cyan/60 text-nebula-cyan"
                  : "bg-white/8 border-white/12 text-white hover:bg-white/12 hover:border-white/25"
              }`}
              onClick={() => toggleMyList(activeHero.id)}
            >
              {isInMyList ? (
                <>
                  <XIcon size={18} className="md:w-5 md:h-5" /> Remove
                </>
              ) : (
                <>
                  <Plus size={18} className="md:w-5 md:h-5" /> My List
                </>
              )}
            </motion.button>

            {/* Info (desktop only) */}
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
