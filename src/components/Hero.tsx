import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Plus, Info, Sparkles } from 'lucide-react';
import { handleImageError } from '../utils/helpers';

interface HeroProps {
  currentHeroIndex: number;
  setCurrentHeroIndex: (index: number) => void;
  heroParallax: any;
  myList: number[];
  toggleMyList: (id: number) => void;
  startPlayback: (movie: any) => void;
  setSelectedMovie: (movie: any) => void;
  featuredMovies: any[];
}

export const Hero: React.FC<HeroProps> = ({
  currentHeroIndex,
  setCurrentHeroIndex,
  heroParallax,
  myList,
  toggleMyList,
  startPlayback,
  setSelectedMovie,
  featuredMovies
}) => {
  if (!featuredMovies || featuredMovies.length === 0) return null;
  const activeHero = featuredMovies[currentHeroIndex];

  return (
    <section className="relative h-[85vh] md:h-[95vh] overflow-hidden">
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentHeroIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <motion.div 
            className="absolute inset-0 z-0"
            style={{ y: heroParallax }}
          >
            <img 
              src={activeHero.fanartBackground || activeHero.backdrop || activeHero.image} 
              alt={activeHero.title}
              className="w-full h-full object-cover md:scale-105"
              referrerPolicy="no-referrer" 
              onError={handleImageError}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-transparent to-transparent z-10" />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 z-20 flex items-center px-4 sm:px-6 md:px-12 pt-10 pointer-events-none">
        <div className="max-w-3xl pointer-events-auto mt-20">
          <motion.div
            key={`hero-content-${activeHero.id || currentHeroIndex}`}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            
            {activeHero.clearLogo ? (
              <img src={activeHero.clearLogo} alt={activeHero.title} className="w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] object-contain mb-8 md:mb-10 drop-shadow-2xl" />
            ) : (
              <h1 className="text-5xl sm:text-6xl md:text-[140px] font-display font-black tracking-tighter leading-[0.85] mb-8 md:mb-10 uppercase text-white drop-shadow-2xl">
                {activeHero.title.split(':').map((part: string, i: number) => (
                   <span key={`hero-part-${i}`} className={i > 0 ? "block text-[0.4em] md:text-[0.4em] text-white/40 tracking-normal mt-2" : "block"}>{part}</span>
                ))}
              </h1>
            )}
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-8 md:mb-10 text-[11px] md:text-[13px] font-bold text-white/50 tracking-[0.2em] uppercase">
              <span className="text-nebula-cyan font-black border-2 border-nebula-cyan/30 px-3 py-1 rounded leading-none">{activeHero.rating}</span>
              <span>{activeHero.year}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-nebula-red animate-pulse hidden sm:block" />
              <span>{activeHero.duration}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 hidden sm:block" />
              <span className="flex items-center gap-2"><Sparkles size={16} className="text-nebula-cyan" /> 4K ULTRA HD</span>
            </div>

            <p className="text-lg md:text-2xl text-white/60 font-light leading-relaxed mb-10 md:mb-12 max-w-2xl drop-shadow-md line-clamp-3">
              {activeHero.description}
            </p>

            <div className="flex flex-wrap gap-4 md:gap-6 text-obsidian pb-10 md:pb-0">
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: '#FFFFFF' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startPlayback(activeHero)}
                className="bg-white text-obsidian px-6 sm:px-12 py-4 sm:py-5 rounded-lg font-black text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-4 shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all flex-1 sm:flex-none justify-center"
              >
                <Play size={24} fill="currentColor" /> Play Mission
              </motion.button>
              <motion.button 
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' }}
                className={`border backdrop-blur-3xl px-6 sm:px-12 py-4 sm:py-5 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-4 transition-all flex-1 sm:flex-none ${myList.includes(activeHero.id) ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/5 border-white/10 text-white'}`}
                onClick={() => toggleMyList(activeHero.id)}
              >
                {myList.includes(activeHero.id) ? (
                  <><X size={24} /> Remove</>
                ) : (
                  <><Plus size={24} /> Registry</>
                )}
              </motion.button>
              <motion.button 
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' }}
                className="bg-white/5 border border-white/10 backdrop-blur-3xl px-4 sm:px-6 py-4 sm:py-5 rounded-lg text-white transition-all shrink-0 hidden md:flex"
                onClick={() => setSelectedMovie(activeHero)}
              >
                <Info size={24} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Improved mobile spacing for thumbs */}
      <div className="absolute bottom-20 md:bottom-20 left-4 right-4 md:left-auto md:right-12 flex flex-row md:flex-col justify-center gap-3 md:gap-4 z-30">
        {featuredMovies.map((movie, i) => (
          <button 
            key={`hero-thumb-${movie.id || i}`} 
            onClick={() => setCurrentHeroIndex(i)}
            className="group relative flex items-center justify-center md:justify-end"
          >
              <motion.div 
                initial={false}
                className={`aspect-[2/3] rounded-lg overflow-hidden border border-white/20 group-hover:border-white transition-all duration-300 ${
                  currentHeroIndex === i ? 'w-[60px] md:w-[100px] opacity-100' : 'w-[40px] md:w-[70px] opacity-40'
                }`}
              >
               <img src={movie.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
               {currentHeroIndex === i && (
                 <motion.div 
                   layoutId="active-hero-border" 
                   className="absolute inset-0 border-2 border-nebula-cyan rounded-lg z-10" 
                 />
               )}
            </motion.div>
          </button>
        ))}
      </div>
    </section>
  );
};

const X = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
