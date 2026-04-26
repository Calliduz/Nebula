import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Plus, Info, Sparkles } from 'lucide-react';
import { handleImageError } from '../utils/helpers';

interface HeroProps {
  currentHeroIndex: number;
  setCurrentHeroIndex: (index: number) => void;
  myList: number[];
  toggleMyList: (id: number) => void;
  startPlayback: (movie: any) => void;
  setSelectedMovie: (movie: any) => void;
  featuredMovies: any[];
}

import { HeroSkeleton } from './HeroSkeleton';

export const Hero: React.FC<HeroProps> = ({
  currentHeroIndex,
  setCurrentHeroIndex,
  myList,
  toggleMyList,
  startPlayback,
  setSelectedMovie,
  featuredMovies
}) => {
  const [isFocusing, setIsFocusing] = React.useState<number | null>(null);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);

  if (!featuredMovies || featuredMovies.length === 0) return <HeroSkeleton />;
  
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50) setCurrentHeroIndex((currentHeroIndex + 1) % featuredMovies.length);
    else if (diff < -50) setCurrentHeroIndex(currentHeroIndex === 0 ? featuredMovies.length - 1 : currentHeroIndex - 1);
    setTouchStart(null);
  };
  
  const handleThumbClick = (index: number) => {
    if (index === currentHeroIndex) return;
    setIsFocusing(index);
    // Intentional delay to "focus" before swapping background
    setTimeout(() => {
      setCurrentHeroIndex(index);
      setIsFocusing(null);
    }, 400);
  };

  const activeHero = featuredMovies[currentHeroIndex];

  return (
    <section 
      className="relative h-[85vh] md:h-[95vh] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentHeroIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-0"
        >
          {/* PC Landscape Image */}
          <img 
            src={activeHero.fanartBackground || activeHero.backdrop || activeHero.image} 
            alt={activeHero.title}
            className="hidden md:block w-full h-full object-cover"
            referrerPolicy="no-referrer" 
            onError={handleImageError}
          />
          {/* Mobile Blurred Background */}
          <img 
            src={activeHero.image || activeHero.fanartBackground || activeHero.backdrop} 
            alt={activeHero.title}
            className="block md:hidden absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110"
            referrerPolicy="no-referrer" 
            onError={handleImageError}
          />
          {/* Mobile Portrait Poster Image */}
          <div className="absolute inset-0 md:hidden flex items-start justify-center pt-20 px-12 pb-[14rem] z-0">
            <img 
              src={activeHero.image || activeHero.fanartBackground || activeHero.backdrop} 
              alt={activeHero.title}
              className="w-full h-full object-cover rounded-xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer" 
              onError={handleImageError}
            />
            {/* Mobile Branding Text */}
            <div className="absolute top-6 left-0 right-0 z-40 flex justify-center md:hidden pointer-events-none">
              <div className="flex items-center gap-2 drop-shadow-lg">
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-nebula-cyan to-nebula-cyan/50 rotate-45" />
                <span className="font-display font-black tracking-widest text-xl uppercase text-white">NEBULA</span>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-transparent to-transparent z-10 hidden md:block" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 z-20 flex items-end md:items-center px-4 sm:px-6 md:px-12 pb-24 md:pb-0 md:pt-10 pointer-events-none">
        <div className="max-w-3xl pointer-events-auto md:mt-20 w-full">
          <motion.div
            key={`hero-content-${activeHero.id || currentHeroIndex}`}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center md:items-start text-center md:text-left"
          >
            
            {activeHero.clearLogo ? (
              <img src={activeHero.clearLogo} alt={activeHero.title} className="hidden md:block w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] h-32 md:h-44 object-contain object-left mb-8 md:mb-10 drop-shadow-2xl" />
            ) : (
              <h1 className={`hidden md:block font-display font-black tracking-tighter leading-[0.85] mb-8 md:mb-10 uppercase text-white drop-shadow-2xl ${
                activeHero.title.length > 20 
                  ? "text-4xl sm:text-5xl md:text-7xl" 
                  : "text-5xl sm:text-6xl md:text-[140px]"
              }`}>
                {activeHero.title.split(':').map((part: string, i: number) => (
                   <span key={`hero-part-${i}`} className={i > 0 ? "block text-[0.4em] md:text-[0.4em] text-white/40 tracking-normal mt-2" : "block"}>{part}</span>
                ))}
              </h1>
            )}
            
            <div className="hidden md:flex flex-wrap items-center gap-3 sm:gap-6 mb-8 md:mb-10 text-[11px] md:text-[13px] font-bold text-white/50 tracking-[0.2em] uppercase">
              <span className="text-nebula-cyan font-black border-2 border-nebula-cyan/30 px-3 py-1 rounded leading-none">{activeHero.rating || '8.4'}</span>
              <span>{activeHero.year}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-nebula-red animate-pulse hidden sm:block" />
              <span>{activeHero.duration || '124M'}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 hidden sm:block" />
              <span className="flex items-center gap-2"><Sparkles size={16} className="text-nebula-cyan" /> 4K ULTRA HD</span>
            </div>

            <p className="hidden md:block text-lg md:text-2xl text-white/60 font-light leading-relaxed mb-10 md:mb-12 max-w-2xl drop-shadow-md line-clamp-3">
              {activeHero.description}
            </p>
          </motion.div>

          <div className="flex w-full justify-center md:justify-start gap-4 md:gap-6 text-obsidian pb-0 pointer-events-auto">
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: '#FFFFFF' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => startPlayback(activeHero)}
              className="bg-white text-obsidian px-6 sm:px-12 py-3 md:py-5 rounded-lg font-black text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-4 shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all flex-1 md:flex-none justify-center"
            >
              <Play size={20} className="md:w-6 md:h-6" fill="currentColor" /> Play
            </motion.button>
            <motion.button 
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' }}
              className={`border backdrop-blur-3xl px-6 sm:px-12 py-3 md:py-5 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-4 transition-all flex-1 md:flex-none ${myList.includes(activeHero.id) ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/5 border-white/10 text-white'}`}
              onClick={() => toggleMyList(activeHero.id)}
            >
              {myList.includes(activeHero.id) ? (
                 <><X size={20} className="md:w-6 md:h-6" /> Remove</>
              ) : (
                <><Plus size={20} className="md:w-6 md:h-6" /> My List</>
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
        </div>
      </div>

      <div className="hidden absolute bottom-20 right-12 md:flex flex-col justify-center gap-4 z-30">
        {featuredMovies.map((movie, i) => (
          <button 
            key={`hero-thumb-${movie.id || i}`} 
            onClick={() => handleThumbClick(i)}
            className="group relative flex items-center justify-center md:justify-end"
          >
              <motion.div 
                initial={false}
                animate={{ 
                  scale: isFocusing === i ? 1.2 : 1,
                  borderColor: isFocusing === i ? '#00E5FF' : (currentHeroIndex === i ? '#00E5FF' : 'rgba(255,255,255,0.2)')
                }}
                className={`aspect-[2/3] rounded-lg overflow-hidden border transition-all duration-300 ${
                  currentHeroIndex === i ? 'w-[60px] md:w-[100px] opacity-100' : 'w-[40px] md:w-[70px] opacity-40'
                }`}
              >
               <img src={movie.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
               {isFocusing === i && (
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.5] }}
                    className="absolute inset-0 bg-nebula-cyan/20 animate-pulse"
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
