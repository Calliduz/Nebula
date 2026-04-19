import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, X, Plus } from 'lucide-react';
import { handleImageError } from '../utils/helpers';

interface MovieCardProps {
  movie: any;
  snap?: boolean;
  onSelect?: (m: any) => void;
  isInList?: boolean;
  onToggleList?: () => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, snap = false, onSelect, isInList, onToggleList }) => {
  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div 
      className={`relative min-w-[200px] md:min-w-[280px] aspect-[2/3] transition-all duration-300 ${isHovered ? 'z-50' : 'z-10'} ${snap ? 'snap-start' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect?.(movie)}
    >
      <motion.div 
        animate={{ 
          scale: isHovered ? 1.05 : 1,
          y: isHovered ? -5 : 0,
          boxShadow: isHovered ? "0 20px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 229, 255, 0.2)" : "0 10px 30px rgba(0,0,0,0.5)"
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute inset-0 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 group cursor-pointer bg-obsidian origin-center"
      >
        <img
          src={movie.image}
          alt={movie.title}
          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
          referrerPolicy="no-referrer" onError={handleImageError}
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-90" />
        
        <motion.div 
          initial={false}
          animate={{ y: isHovered ? "0%" : "100%" }}
          transition={{ duration: 0.3, ease: "circOut" }}
          className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur-xl border-t border-white/10 p-4 z-30 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#2ecc71] tracking-tighter">98% MATCH</span>
              <span className="px-1 py-0.5 rounded bg-white/10 text-[8px] border border-white/10 text-white/60">{movie.year}</span>
              <span className="text-[10px] font-bold text-white/60">★ {movie.imdb || '8.2'}</span>
            </div>
            <div className="flex gap-2">
               <button 
                  className="w-7 h-7 rounded-full bg-white text-obsidian flex items-center justify-center hover:bg-nebula-cyan transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.(movie);
                  }}
               >
                  <Play size={12} fill="currentColor" />
               </button>
               <button 
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                    isInList ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/10 border-white/10 hover:bg-white/20'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleList?.();
                  }}
               >
                  {isInList ? <X size={14} /> : <Plus size={14} />}
               </button>
            </div>
          </div>

          <p className="text-[14px] font-display font-black tracking-tight text-white leading-tight truncate group-hover:text-nebula-cyan transition-colors">
            {movie.title}
          </p>

          <div className="flex gap-2 flex-wrap">
             {movie.genre.split(', ').slice(0, 3).map((tag: string, i: number) => (
                <span key={`tag-${movie.id}-${tag}-${i}`} className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/40">{tag}</span>
             ))}
          </div>
        </motion.div>

        {!isHovered && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <p className="text-[10px] text-dim font-extrabold uppercase tracking-widest mb-1">{movie.genre.split(', ')[0]}</p>
            {movie.clearLogo ? (
              <img src={movie.clearLogo} alt={movie.title} className="h-8 object-contain drop-shadow-xl" />
            ) : (
              <p className="text-[18px] font-bold leading-tight drop-shadow-lg truncate">{movie.title}</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
