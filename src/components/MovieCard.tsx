import React, { useState, useCallback, memo, useEffect, useRef } from "react";
import { handleImageError } from "../utils/helpers";

interface MovieCardProps {
  movie: any;
  snap?: boolean;
  onSelect?: (m: any) => void;
  isInList?: boolean;
  onToggleList?: () => void;
  onRemove?: () => void;
  aspect?: "portrait" | "landscape";
  isGrid?: boolean;
}

export const MovieCard = memo<MovieCardProps>(
  ({
    movie,
    snap = false,
    onSelect,
    aspect = "portrait",
    onRemove,
    isGrid = false,
  }) => {
    const isLandscape = aspect === "landscape";
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      setImgLoaded(false);
      setImgError(false);

      // If image is already cached/complete, mark as loaded
      if (
        imgRef.current &&
        imgRef.current.complete &&
        imgRef.current.naturalWidth > 0
      ) {
        setImgLoaded(true);
      }
    }, [movie.image, movie.id]);

    const onImgLoad = useCallback(() => setImgLoaded(true), []);
    const onImgError = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setImgError(true);
        handleImageError(e);
      },
      [],
    );

    return (
      <div
        className={`group/card relative ${isGrid ? "w-full" : isLandscape ? "w-[220px] md:w-[280px]" : "w-[160px] md:w-[280px]"} shrink-0 ${isLandscape ? "aspect-video" : "aspect-[2/3]"} transition-all duration-300 ${snap ? "snap-start" : ""}`}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => onSelect?.(movie)}
        style={{ willChange: "transform" }}
      >
        <div className="absolute inset-0 rounded-xl md:rounded-2xl overflow-hidden border border-white/5 group-hover/card:border-nebula-cyan/50 cursor-pointer bg-obsidian origin-center transition-all duration-300 hover:scale-[1.02] transform-gpu shadow-2xl">
          {/* Shimmer placeholder while image loads */}
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 bg-white/5 shimmer-bg" />
          )}
          <img
            ref={imgRef}
            key={movie.image || movie.id}
            src={movie.image || undefined}
            alt={movie.title}
            className={`w-full h-full object-cover group-hover/card:opacity-70 transition-opacity duration-500 ${imgLoaded ? "opacity-80" : "opacity-0"}`}
            referrerPolicy="no-referrer"
            onLoad={onImgLoad}
            onError={onImgError}
            loading="lazy"
          />

          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/80 via-black/10 to-transparent opacity-90 pointer-events-none z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-0 sm:opacity-90" />

          {/* Info Overlay (Persistent) */}
          <div className="absolute top-3 left-3 right-3 z-30 flex justify-between items-start">
            <div className="flex flex-col gap-1.5">
              {isLandscape && (
                <div className="px-2 py-0.5 rounded-md bg-nebula-cyan/20 border border-nebula-cyan/30 backdrop-blur-md w-fit">
                  <p className="text-[8px] font-black text-nebula-cyan uppercase tracking-widest italic">
                    Series
                  </p>
                </div>
              )}

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {/* Quality Badge */}
                {movie.quality && (
                  <div
                    className={`px-1 md:px-2 py-0.5 rounded-md border backdrop-blur-md w-fit ${
                      movie.quality === "CAM"
                        ? "bg-slate-950/80 border-amber-500/30"
                        : movie.quality === "TBA"
                          ? "bg-slate-950/80 border-red-500/30"
                          : "bg-slate-950/80 border-nebula-cyan/30"
                    }`}
                  >
                    <p
                      className={`text-[7px] md:text-[10px] font-black uppercase tracking-wider ${
                        movie.quality === "CAM"
                          ? "text-amber-400"
                          : movie.quality === "TBA"
                            ? "text-red-400"
                            : "text-nebula-cyan"
                      }`}
                    >
                      {movie.quality}
                    </p>
                  </div>
                )}

                {/* Availability Badge */}
                {movie.isVerified ? (
                  <div className="p-1 sm:px-1.5 sm:py-0.5 rounded-md bg-slate-950/80 border border-emerald-500/30 backdrop-blur-md w-fit flex items-center justify-center sm:gap-1">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <span className="hidden sm:inline text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                ) : movie.isDead ? (
                  <div className="p-1 sm:px-1.5 sm:py-0.5 rounded-md bg-slate-950/80 border border-rose-500/30 backdrop-blur-md w-fit flex items-center justify-center sm:gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="hidden sm:inline text-[10px] font-black text-rose-400 uppercase tracking-wider">
                      Dead
                    </span>
                  </div>
                ) : (
                  movie.quality !== "CAM" &&
                  movie.quality !== "TBA" && (
                    <div className="p-1 sm:px-1.5 sm:py-0.5 rounded-md bg-slate-950/80 border border-white/20 backdrop-blur-md w-fit flex items-center justify-center sm:gap-1">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white/30 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white/40" />
                      </span>
                      <span className="hidden sm:inline text-[10px] font-black text-white/55 uppercase tracking-wider">
                        Scan
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="w-6 h-6 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/50 hover:border-red-500/50 transition-all ml-auto"
              >
                <span className="text-xs font-black">×</span>
              </button>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-20 transition-all duration-300 group-hover/card:bottom-6">
            <div className="mb-2 hidden md:block">
              {movie.clearLogo ? (
                <img
                  src={movie.clearLogo}
                  alt={movie.title}
                  className="h-10 w-auto object-contain object-left drop-shadow-2xl transition-transform duration-300 group-hover/card:scale-110 origin-left"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p className="text-[18px] font-bold leading-tight drop-shadow-lg truncate group-hover/card:text-nebula-cyan transition-colors">
                  {movie.title}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="hidden sm:block text-[9px] text-white/40 font-extrabold uppercase tracking-[0.2em] px-1.5 py-0.5 rounded bg-white/[0.04] backdrop-blur-sm border border-white/[0.05] w-fit">
                {movie.genre.split(", ")[0]}
              </p>
              <div className="w-1 h-1 rounded-full bg-white/10 opacity-0 group-hover/card:opacity-100 transition-opacity" />
              <span className="text-[9px] font-bold text-nebula-cyan/0 group-hover/card:text-nebula-cyan/80 uppercase tracking-widest transition-all duration-300 translate-x-[-4px] group-hover/card:translate-x-0">
                Open Dossier
              </span>
            </div>

            {/* Progress Bar for Continue Watching — Netflix-style */}
            {(() => {
              if (!movie.progress) return null;
              const pct =
                typeof movie.progress === "object" &&
                movie.progress.duration > 0
                  ? Math.min(
                      100,
                      (movie.progress.time / movie.progress.duration) * 100,
                    )
                  : 0;
              if (pct < 1) return null;
              const isWatched = pct >= 95;
              return (
                <div className="mt-2.5">
                  {/* Watched badge */}
                  {isWatched && (
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                        <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                          <path
                            d="M1 3L2.5 4.5L6 1"
                            stroke="white"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/50">
                        Watched
                      </span>
                    </div>
                  )}
                  {/* Track */}
                  <div className="h-[5px] w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      data-testid="progress-fill"
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: "#e50914",
                        boxShadow: "0 0 6px rgba(229,9,20,0.6)",
                        transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Subtle Glow Sign */}
          <div className="absolute inset-0 opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 bg-nebula-cyan pointer-events-none" />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.onSelect === nextProps.onSelect &&
      prevProps.onRemove === nextProps.onRemove &&
      prevProps.onToggleList === nextProps.onToggleList &&
      prevProps.aspect === nextProps.aspect &&
      prevProps.isGrid === nextProps.isGrid &&
      prevProps.snap === nextProps.snap &&
      prevProps.isInList === nextProps.isInList &&
      prevProps.movie?.id === nextProps.movie?.id &&
      prevProps.movie?.image === nextProps.movie?.image &&
      prevProps.movie?.title === nextProps.movie?.title &&
      prevProps.movie?.quality === nextProps.movie?.quality &&
      prevProps.movie?.isVerified === nextProps.movie?.isVerified &&
      prevProps.movie?.isDead === nextProps.movie?.isDead &&
      prevProps.movie?.clearLogo === nextProps.movie?.clearLogo &&
      prevProps.movie?.genre === nextProps.movie?.genre &&
      JSON.stringify(prevProps.movie?.progress) ===
        JSON.stringify(nextProps.movie?.progress)
    );
  },
);
