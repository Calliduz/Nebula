import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Star, Clock, Calendar, Shield, AudioWaveform as Waveform, Sparkles, Maximize, Play, X, Plus } from 'lucide-react';
import { ALL_MOVIES } from '../data/movies';
import { handleImageError } from '../utils/helpers';

interface MovieDetailsProps {
  movie: any;
  onClose: () => void;
  onPlay: () => void;
  onSelectMovie?: (m: any) => void;
  isInList: boolean;
  onToggleList: () => void;
}

export const MovieDetails: React.FC<MovieDetailsProps> = ({ movie, onClose, onPlay, onSelectMovie, isInList, onToggleList }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isAudioFadingIn, setIsAudioFadingIn] = useState(false);
  const accentColor = movie.accent || '#00E5FF';

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAudioFadingIn(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const TABS = ['Overview', 'Trailers & Extras', 'Related Titles'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[150] bg-obsidian overflow-y-auto overflow-x-hidden custom-scrollbar"
    >
      <div className="absolute inset-x-0 top-0 h-[70vh] z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-obsidian/60 to-obsidian z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/40 to-transparent z-10" />
        <img 
          src={movie.backdrop || movie.poster} 
          className="w-full h-full object-cover blur-[2px] scale-110 opacity-40 origin-center" 
          alt="" 
          referrerPolicy="no-referrer" onError={handleImageError}
        />
        <div 
          className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] blur-[150px] opacity-30 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 lg:px-10 pt-10 pb-20">
        <button 
          onClick={onClose}
          className="flex items-center gap-3 text-dim hover:text-white mb-8 lg:mb-16 transition-all group w-fit"
        >
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-nebula-cyan group-hover:bg-white/5 transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-xs font-bold tracking-[0.2em] uppercase">Back to Browse</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start w-full">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-[300px] sm:max-w-[350px] mx-auto lg:mx-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative group shrink-0"
          >
            <img src={movie.poster} className="w-full h-full object-cover" alt={movie.title} referrerPolicy="no-referrer" onError={handleImageError} />
            <div className="absolute inset-0 border-[1px] border-white/20 rounded-2xl pointer-events-none" />
          </motion.div>

          <div className="flex-1 w-full overflow-hidden">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-accent font-black tracking-tight mb-4 uppercase leading-none break-words">
                {movie.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-8 text-xs sm:text-sm font-bold tracking-widest text-dim uppercase">
                <span className="flex items-center gap-2"><Star size={16} className="text-nebula-cyan fill-nebula-cyan" /> {movie.rating}</span>
                <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                <span className="flex items-center gap-2"><Clock size={16} /> {movie.duration || '2h 12m'}</span>
                <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                <span className="flex items-center gap-2"><Calendar size={16} /> {movie.year || '2025'}</span>
              </div>

              <p className="text-lg text-white/70 font-light leading-relaxed mb-10 max-w-2xl">
                {movie.description || 'Experience the next chapter in the Nebula Cinematic Universe. A stunning visual exploration of what lies beyond the edge of our perception.'}
              </p>

              <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-12 p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl max-w-fit">
                <div className="flex flex-col items-center gap-2">
                   <Shield size={20} className="text-nebula-cyan" />
                   <span className="text-[10px] font-bold text-white/40 tracking-widest leading-none">4K UHD</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <Waveform size={20} className="text-nebula-cyan" />
                   <span className="text-[10px] font-bold text-white/40 tracking-widest leading-none">ATMOS</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <Sparkles size={20} className="text-nebula-cyan" />
                   <span className="text-[10px] font-bold text-white/40 tracking-widest leading-none">HDR10+</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <Maximize size={20} className="text-nebula-cyan" />
                   <span className="text-[10px] font-bold text-white/40 tracking-widest leading-none">2.39:1</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 sm:gap-6 mb-16">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlay}
                  className="bg-white text-obsidian px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm glow-white flex items-center justify-center gap-3 transition-all hover:bg-nebula-cyan flex-1 sm:flex-none"
                >
                  <Play size={20} fill="currentColor" /> <span>Watch Now</span>
                </motion.button>
                <motion.button 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  onClick={onToggleList}
                  className={`px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all border flex-1 sm:flex-none ${
                    isInList ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/5 border-white/10 text-white'
                  }`}
                >
                  {isInList ? <X size={20} /> : <Plus size={20} />} <span>{isInList ? 'Remove' : 'Add to List'}</span>
                </motion.button>
              </div>
            </motion.div>

            <div className="border-b border-white/10 mb-10 flex gap-6 sm:gap-12 overflow-x-auto custom-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] relative transition-colors whitespace-nowrap ${
                    activeTab === tab ? 'text-nebula-cyan' : 'text-dim hover:text-white'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="active-tab" 
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-nebula-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]" 
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-12">
              {activeTab === 'Overview' && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-12"
                 >
                   <div className="w-full">
                     <h3 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-4 sm:mb-6">Director's Cut Cast</h3>
                     <div className="flex gap-4 sm:gap-8 overflow-x-auto pb-4 custom-scrollbar">
                       {(movie.cast || [
                         { name: 'Aris Thorne', role: 'The Lead', avatar: 'https://i.pravatar.cc/150?u=a' },
                         { name: 'Sana Veda', role: 'The Pilot', avatar: 'https://i.pravatar.cc/150?u=b' },
                         { name: 'Marcus Void', role: 'The Villain', avatar: 'https://i.pravatar.cc/150?u=c' },
                         { name: 'Luna Grey', role: 'Oracle', avatar: 'https://i.pravatar.cc/150?u=d' }
                       ]).map((person: any, i: number) => (
                         <div key={`${person.name}-${person.role}-${i}`} className="flex flex-col items-center gap-2 sm:gap-3 group cursor-pointer shrink-0">
                           <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/10 p-1 group-hover:border-nebula-cyan transition-all duration-500 overflow-hidden">
                             <img src={person.avatar} className="w-full h-full rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={person.name} />
                           </div>
                           <div className="text-center max-w-[80px]">
                             <p className="text-[9px] sm:text-[10px] font-bold text-white group-hover:text-nebula-cyan transition-colors truncate">{person.name}</p>
                             <p className="text-[7px] sm:text-[8px] font-bold text-dim uppercase tracking-widest mt-1 truncate">{person.role}</p>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {isAudioFadingIn && (
                     <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       className="flex items-center gap-3 text-[10px] font-bold text-nebula-cyan tracking-widest uppercase border border-nebula-cyan/20 bg-nebula-cyan/5 px-4 py-2 rounded-full w-fit"
                     >
                       <Waveform size={14} className="animate-pulse" />
                       Atmospheric Audio Stream Active
                     </motion.div>
                   )}
                 </motion.div>
              )}

              {activeTab === 'Trailers & Extras' && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                 >
                   {[...Array(3)].map((_, i) => (
                     <div key={`trailer-${movie.id}-${i}`} className="space-y-4 group cursor-pointer">
                       <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-white/5">
                         <img 
                           src={`https://picsum.photos/seed/trailer-${movie.id}-${i}/800/450`} 
                           className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" 
                           alt="" 
                           referrerPolicy="no-referrer" onError={handleImageError}
                         />
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                         <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-nebula-cyan group-hover:text-obsidian transition-all group-hover:scale-110">
                            <Play size={20} fill="currentColor" />
                         </div>
                         <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-[10px] font-bold text-white border border-white/10">
                            2:15
                         </div>
                       </div>
                       <div>
                         <h4 className="text-sm font-bold text-white group-hover:text-nebula-cyan transition-colors">
                            {i === 0 ? 'Official Trailer' : i === 1 ? 'Legacy of the Nebula' : 'Atmospheric Recording'}
                         </h4>
                         <p className="text-[10px] text-dim font-bold mt-1 uppercase tracking-widest">Extra • 4K HDR</p>
                       </div>
                     </div>
                   ))}
                 </motion.div>
              )}

              {activeTab === 'Related Titles' && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                 >
                   {ALL_MOVIES.filter(m => m.id !== movie.id && m.genre === movie.genre).slice(0, 4).map((m, i) => (
                     <div 
                       key={`rel-${movie.id}-${m.id}-${i}`} 
                       onClick={() => onSelectMovie?.(m)}
                       className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer relative"
                     >
                       <img src={m.poster} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500" referrerPolicy="no-referrer" onError={handleImageError} />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <p className="text-[10px] font-bold text-nebula-cyan mb-1 uppercase tracking-widest">{m.genre}</p>
                          <p className="text-xs font-bold text-white leading-tight">{m.title}</p>
                       </div>
                     </div>
                   ))}
                 </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
