import React, {
  useState,
  useCallback,
  memo,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { handleImageError, getOptimizedPosterUrl } from "../utils/helpers";
import { useSharedIntersectionObserver } from "../hooks/useSharedIntersectionObserver";
import { Info, Star, X } from "lucide-react";

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
  ({ movie, snap = false, onSelect, onRemove, aspect = "portrait", isGrid = false }) => {
    const isLandscape = aspect === "landscape";
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [shouldLoadImg, setShouldLoadImg] = useState(
      () =>
        (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
        (typeof import.meta !== "undefined" &&
          (import.meta as any).env?.MODE === "test"),
    );
    const cardRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Compute dynamic TMDB poster URL based on card aspect/width
    const optimizedImageSrc = useMemo(() => {
      const estimatedWidth = isGrid ? 200 : isLandscape ? 240 : 180;
      return getOptimizedPosterUrl(movie.image, estimatedWidth);
    }, [movie.image, isLandscape, isGrid]);

    // Use shared IntersectionObserver pool to lazy load card images cleanly
    useSharedIntersectionObserver(
      cardRef,
      (entry) => {
        if (entry.isIntersecting) {
          setShouldLoadImg(true);
        }
      },
      { rootMargin: "600px 0px 600px 0px" },
      !shouldLoadImg,
    );

    // Calculate progress percentage and active progress state
    const pct =
      movie.progress &&
      typeof movie.progress === "object" &&
      movie.progress.duration > 0
        ? Math.min(100, (movie.progress.time / movie.progress.duration) * 100)
        : 0;
    const hasProgress = pct >= 1;

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
    }, [movie.image, movie.id, shouldLoadImg]);

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
        ref={cardRef}
        className={`group/card relative ${isGrid ? "w-full" : isLandscape ? "w-[170px] sm:w-[220px] md:w-[240px] lg:w-[260px]" : "w-[115px] sm:w-[155px] md:w-[200px] lg:w-[220px]"} shrink-0 ${isLandscape ? "aspect-video" : "aspect-[2/3]"} h-fit self-start transition-transform duration-300 ${snap ? "snap-start" : ""}`}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => onSelect?.(movie)}
      >
        <div className="absolute inset-0 rounded-xl md:rounded-2xl overflow-hidden border border-white/10 group-hover/card:border-nebula-cyan/70 cursor-pointer bg-obsidian origin-center transition-all duration-300 group-hover/card:scale-[1.08] group-hover/card:-translate-y-2 group-hover/card:z-30 group-hover/card:shadow-[0_16px_40px_rgba(0,229,255,0.25),_0_10px_25px_rgba(0,0,0,0.9)] transform-gpu will-change-transform shadow-2xl">
          {/* Shimmer placeholder while image loads */}
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 bg-white/5 shimmer-bg" />
          )}
          {shouldLoadImg && (
            <img
              ref={imgRef}
              key={optimizedImageSrc || movie.id}
              src={optimizedImageSrc || undefined}
              alt={movie.title}
              className={`w-full h-full object-cover group-hover/card:scale-105 group-hover/card:opacity-75 transition-all duration-500 ease-out ${imgLoaded ? "opacity-80" : "opacity-0"}`}
              referrerPolicy="no-referrer"
              onLoad={onImgLoad}
              onError={onImgError}
              loading="lazy"
              decoding="async"
            />
          )}

          {/* Type badge — top-left corner tab */}
          {movie.type && (
            <div className="absolute top-0 left-0 z-20 pointer-events-none bg-black/70 backdrop-blur-md text-white/90 group-hover/card:text-white group-hover/card:bg-black/90 group-hover/card:border-nebula-cyan/40 text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-br-lg border-r border-b border-white/10 leading-none transition-colors">
              {movie.type === "tv" ? "TV" : "Film"}
            </div>
          )}

          {/* Rating badge — top-right corner tab */}
          {movie.imdb && movie.imdb > 0 && (
            <div
              className={`absolute top-0 right-0 z-20 pointer-events-none bg-black/70 backdrop-blur-md text-nebula-cyan group-hover/card:bg-black/90 group-hover/card:border-nebula-cyan/40 text-[8px] sm:text-[9px] font-black tracking-wider px-2.5 py-1 rounded-bl-lg border-l border-b border-white/10 leading-none transition-all duration-200 ${
                onRemove ? "group-hover/card:opacity-0" : ""
              }`}
            >
              ★ {movie.imdb}
            </div>
          )}

          {/* Quick Remove button — inside top-right corner */}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-1.5 right-1.5 z-40 w-6.5 h-6.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white/80 hover:text-red-400 hover:border-red-400/50 hover:bg-black flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 shadow-xl cursor-pointer"
              title="Remove"
            >
              <X size={13} />
            </button>
          )}

          {/* Progress Bar for Continue Watching */}
          {hasProgress && (
            <div className="absolute inset-x-0 bottom-0 z-40 w-full flex flex-col pointer-events-none transition-all duration-300">
              {/* Watched badge */}
              {pct >= 95 && (
                <div className="flex items-center gap-1.5 mb-2 mx-auto sm:mx-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 w-fit self-center sm:self-start">
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
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/70">
                    Watched
                  </span>
                </div>
              )}
              {/* Track */}
              <div className="h-[4px] w-full bg-white/25 overflow-hidden">
                <div
                  data-testid="progress-fill"
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    background: "#e50914",
                    boxShadow: "0 0 4px rgba(229,9,20,0.8)",
                    transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
              </div>
            </div>
          )}

          {/* New Episode Tag */}
          {movie.hasNewEpisode && (
            <div className="absolute bottom-0 inset-x-0 bg-nebula-cyan text-obsidian font-black uppercase text-[8px] sm:text-[9px] py-1 text-center tracking-widest select-none z-30 shadow-[0_-2px_10px_rgba(0,229,255,0.25)] border-t border-nebula-cyan/30">
              New Episode
            </div>
          )}

          {/* Year — bottom-left, subtle (mobile fallback) */}
          {movie.year && !hasProgress && !movie.hasNewEpisode && (
            <div className="absolute bottom-2 left-2 z-20 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 hide-on-hover-capable">
              <span className="text-[9px] font-bold text-white/70 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                {movie.year}
              </span>
            </div>
          )}

          {/* Rich Cinematic Hover Drawer */}
          <div className="card-hover-drawer">
            <span className="text-xs sm:text-sm font-display font-black tracking-tight text-white uppercase truncate mb-1 leading-snug drop-shadow-md">
              {movie.title}
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 mb-1 leading-none">
              {movie.imdb && movie.imdb > 0 && (
                <span className="text-nebula-cyan font-black flex items-center gap-1">
                  <Star
                    size={12}
                    className="fill-nebula-cyan text-nebula-cyan"
                  />{" "}
                  {movie.imdb}
                </span>
              )}
              {movie.year && <span>• {movie.year}</span>}
              <span className="capitalize text-white/60">
                • {movie.type === "tv" ? "TV Series" : "Movie"}
              </span>
            </div>
            {movie.genre && (
              <span className="text-[11px] text-white/60 truncate leading-normal font-medium">
                {Array.isArray(movie.genre)
                  ? movie.genre.join(" • ")
                  : movie.genre}
              </span>
            )}
          </div>

          {/* Subtle Glow Sign */}
          <div className="absolute inset-0 opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 bg-nebula-cyan pointer-events-none" />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      Boolean(prevProps.onSelect) === Boolean(nextProps.onSelect) &&
      Boolean(prevProps.onRemove) === Boolean(nextProps.onRemove) &&
      Boolean(prevProps.onToggleList) === Boolean(nextProps.onToggleList) &&
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
      prevProps.movie?.hasNewEpisode === nextProps.movie?.hasNewEpisode &&
      prevProps.movie?.clearLogo === nextProps.movie?.clearLogo &&
      prevProps.movie?.genre === nextProps.movie?.genre &&
      prevProps.movie?.imdb === nextProps.movie?.imdb &&
      prevProps.movie?.progress?.time === nextProps.movie?.progress?.time &&
      prevProps.movie?.progress?.duration ===
        nextProps.movie?.progress?.duration &&
      prevProps.movie?.progress?.watched === nextProps.movie?.progress?.watched
    );
  },
);
