import React from 'react';
import { handleImageError } from '../utils/helpers';

interface MovieCardProps {
  movie: any;
  snap?: boolean;
  onSelect?: (m: any) => void;
  isInList?: boolean;
  onToggleList?: () => void;
  onRemove?: () => void;
  aspect?: 'portrait' | 'landscape';
  isGrid?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, snap = false, onSelect, aspect = 'portrait', onRemove, isGrid = false }) => {
  const isLandscape = aspect === 'landscape';

  return (
    <div 
      className={`group/card relative ${isGrid ? 'w-full' : (isLandscape ? 'w-[220px] md:w-[280px]' : 'w-[160px] md:w-[280px]')} shrink-0 ${isLandscape ? 'aspect-video' : 'aspect-[2/3]'} transition-all duration-300 ${snap ? 'snap-start' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => onSelect?.(movie)}
      style={{ willChange: 'transform' }}
    >
      <div 
        className="absolute inset-0 rounded-xl md:rounded-2xl overflow-hidden border border-white/5 group-hover/card:border-nebula-cyan/50 cursor-pointer bg-obsidian origin-center transition-all duration-300 hover:scale-[1.02] transform-gpu shadow-2xl"
      >
        <img
          src={movie.image || null}
          alt={movie.title}
          className="w-full h-full object-cover opacity-80 group-hover/card:opacity-70 transition-opacity duration-300"
          referrerPolicy="no-referrer" onError={handleImageError}
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-90" />
        
        {/* Info Overlay (Persistent) */}
        <div className="absolute top-3 left-3 right-3 z-30 flex justify-between items-start">
          {isLandscape && (
            <div className="px-2 py-0.5 rounded-md bg-nebula-cyan/20 border border-nebula-cyan/30 backdrop-blur-md">
              <p className="text-[8px] font-black text-nebula-cyan uppercase tracking-widest italic">Series</p>
            </div>
          )}
          {onRemove && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
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
              <p className="text-[18px] font-bold leading-tight drop-shadow-lg truncate group-hover/card:text-nebula-cyan transition-colors">{movie.title}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-white/30 font-extrabold uppercase tracking-[0.2em]">{movie.genre.split(', ')[0]}</p>
            <div className="w-1 h-1 rounded-full bg-white/10 opacity-0 group-hover/card:opacity-100 transition-opacity" />
            <span className="text-[9px] font-bold text-nebula-cyan/0 group-hover/card:text-nebula-cyan/80 uppercase tracking-widest transition-all duration-300 translate-x-[-4px] group-hover/card:translate-x-0">Open Dossier</span>
          </div>

          {/* Progress Bar for Continue Watching */}
          {movie.progress && (
            <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-nebula-cyan shadow-[0_0_10px_#00f3ff]" 
                style={{ 
                  width: `${typeof movie.progress === 'object' 
                    ? (movie.progress.time / movie.progress.duration) * 100 
                    : 50}%` // Fallback to 50% if duration is missing
                }} 
              />
            </div>
          )}
        </div>

        {/* Subtle Glow Sign */}
        <div className="absolute inset-0 opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 bg-nebula-cyan pointer-events-none" />
      </div>
    </div>
  );
};
