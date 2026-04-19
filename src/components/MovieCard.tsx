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
  const [showVideo, setShowVideo] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimerRef.current = setTimeout(() => {
      setShowVideo(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowVideo(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  return (
    <div 
      className={`relative min-w-[140px] md:min-w-[180px] aspect-[2/3] transition-all duration-300 ${isHovered ? 'z-50' : 'z-10'} ${snap ? 'snap-start' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect?.(movie)}
    >
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        animate={{ 
          scale: isHovered ? 1.05 : 1,
          y: isHovered ? -5 : 0,
          boxShadow: isHovered ? "0 20px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 229, 255, 0.2)" : "0 10px 30px rgba(0,0,0,0.5)"
        }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute inset-0 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 group cursor-pointer bg-obsidian origin-center"
      >
        <AnimatePresence mode="wait">
          {!showVideo ? (
            <motion.img
              key="poster"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-700"
              referrerPolicy="no-referrer" onError={handleImageError}
              loading="lazy"
            />
          ) : (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black"
            >
              <img 
                src={`${movie.poster}?blur=2`} 
                className="w-full h-full object-cover scale-110" 
                referrerPolicy="no-referrer" onError={handleImageError} 
              />
              <div className="absolute inset-0 bg-nebula-cyan/5 flex items-center justify-center">
                 <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    <div className="flex gap-1">
                       <span className="w-1 h-3 bg-nebula-cyan animate-pulse" />
                       <span className="w-1 h-3 bg-nebula-cyan animate-pulse delay-75" />
                       <span className="w-1 h-3 bg-nebula-cyan animate-pulse delay-150" />
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-bold text-nebula-cyan tracking-widest uppercase z-20">
          {movie.quality}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-90" />
        
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: isHovered ? "0%" : "100%" }}
          transition={{ duration: 0.4, ease: "circOut" }}
          className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur-xl border-t border-white/10 p-4 z-30 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#2ecc71] tracking-tighter">98% MATCH</span>
              <span className="px-1 py-0.5 rounded bg-white/10 text-[8px] border border-white/10 text-white/60">HD</span>
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

          <div className="flex gap-2 flex-wrap">
             {['Sci-Fi', 'Action', 'Dark'].map((tag, i) => (
                <span key={`${movie.id}-tag-${tag}-${i}`} className="text-[8px] uppercase tracking-widest font-bold text-white/40">{tag}</span>
             ))}
          </div>

          <p className="text-[12px] font-bold tracking-tight text-white leading-tight truncate">{movie.title}</p>
        </motion.div>

        {!isHovered && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <p className="text-[9px] text-dim font-extrabold uppercase tracking-widest mb-1">{movie.genre}</p>
            <p className="text-[15px] font-bold leading-tight drop-shadow-lg truncate">{movie.title}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
