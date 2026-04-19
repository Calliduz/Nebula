import React from 'react';
import { handleImageError } from '../utils/helpers';

interface MovieCardProps {
  movie: any;
  snap?: boolean;
  onSelect?: (m: any) => void;
  isInList?: boolean;
  onToggleList?: () => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, snap = false, onSelect }) => {
  return (
    <div 
      className={`group/card relative min-w-[200px] md:min-w-[280px] aspect-[2/3] transition-all duration-300 ${snap ? 'snap-start' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => onSelect?.(movie)}
      style={{ willChange: 'transform' }}
    >
      <div 
        className="absolute inset-0 rounded-2xl overflow-hidden border border-white/5 group-hover/card:border-nebula-cyan/50 cursor-pointer bg-obsidian origin-center transition-all duration-300 hover:scale-[1.02] transform-gpu shadow-2xl"
      >
        <img
          src={movie.image}
          alt={movie.title}
          className="w-full h-full object-cover opacity-80 group-hover/card:opacity-70 transition-opacity duration-300"
          referrerPolicy="no-referrer" onError={handleImageError}
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-90" />
        
        {/* Info Overlay (Persistent) */}
        <div className="absolute bottom-4 left-4 right-4 z-20 transition-all duration-300 group-hover/card:bottom-6">
          <div className="mb-2">
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
        </div>

        {/* Subtle Glow Sign */}
        <div className="absolute inset-0 opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 bg-nebula-cyan pointer-events-none" />
      </div>
    </div>
  );
};
