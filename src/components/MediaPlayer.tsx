import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MonitorPlay, Pause, Play, RotateCcw, RotateCw, VolumeX, Volume2, Languages, Settings, Maximize, Gauge } from 'lucide-react';
import { handleImageError } from '../utils/helpers';

interface MediaPlayerProps {
  movie: any;
  onClose: () => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ movie, onClose }) => {
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(35); // Placeholder progress
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bitrate, setBitrate] = useState('4K Ultra');
  const [subtitleSize, setSubtitleSize] = useState('Medium');
  
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetUiTimeout = useCallback(() => {
    setIsUiVisible(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
      if (!isPaused && !showSettings) setIsUiVisible(false);
    }, 3000);
  }, [isPaused, showSettings]);

  useEffect(() => {
    resetUiTimeout();
    window.addEventListener('mousemove', resetUiTimeout);
    return () => {
      window.removeEventListener('mousemove', resetUiTimeout);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [resetUiTimeout]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'Space': 
          e.preventDefault();
          setIsPaused(prev => !prev); 
          break;
        case 'KeyM': 
          setIsMuted(prev => !prev); 
          break;
        case 'KeyF': 
          if (!document.fullscreenElement) document.documentElement.requestFullscreen();
          else document.exitFullscreen();
          break;
        case 'KeyL': 
          setProgress(prev => Math.min(100, prev + 5)); 
          break;
        case 'KeyJ': 
          setProgress(prev => Math.max(0, prev - 5)); 
          break;
        case 'Escape':
          if (showSettings) setShowSettings(false);
          else onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showSettings]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden cursor-none group-hover:cursor-auto"
      onMouseMove={resetUiTimeout}
      style={{ cursor: isUiVisible ? 'auto' : 'none' }}
    >
      <div className="absolute inset-0 z-0">
        <img 
          src={movie.image} 
          className={`w-full h-full object-cover transition-all duration-1000 ${isPaused ? 'scale-105 blur-sm brightness-50' : 'scale-100'}`} 
          referrerPolicy="no-referrer" onError={handleImageError} 
        />
        <div className={`absolute inset-0 bg-black transition-opacity duration-1000 ${!isUiVisible ? 'opacity-20' : 'opacity-40'}`} />
      </div>

      <AnimatePresence>
        {isUiVisible && (
          <motion.div 
            key="media-topbar"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative z-50 flex items-center justify-between px-12 py-10 bg-gradient-to-b from-black/80 to-transparent"
          >
            <div className="flex items-center gap-6">
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 flex items-center justify-center transition-all group"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight uppercase">{movie.title}</h2>
                <p className="text-[10px] text-nebula-cyan font-bold tracking-[0.3em] uppercase">NEBULA STREAMING DIRECT • {bitrate}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold">
                  <div className="w-2 h-2 rounded-full bg-[#2ecc71] animate-pulse" />
                  STABLE CONNECTION
               </div>
               <button className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
                  <MonitorPlay size={20} />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
         <AnimatePresence mode="wait">
            {isPaused && (
               <motion.div 
                  key="media-paused"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  className="w-24 h-24 rounded-full bg-nebula-cyan/20 border border-nebula-cyan/50 backdrop-blur-xl flex items-center justify-center shadow-[0_0_50px_rgba(0,229,255,0.3)]"
               >
                  <Pause size={40} className="text-nebula-cyan fill-nebula-cyan" />
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      <AnimatePresence>
        {isUiVisible && (
          <motion.div 
            key="media-bottom-controls"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-50 px-12 pb-12 pt-24 bg-gradient-to-t from-black via-black/60 to-transparent"
          >
            <div className="relative group/progress cursor-pointer mb-8">
               <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-nebula-cyan glow-cyan relative"
                    style={{ width: `${progress}%` }}
                  >
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                  </motion.div>
               </div>
               <div className="flex justify-between mt-3 text-[10px] font-bold text-dim tracking-widest uppercase">
                  <span>1:12:42</span>
                  <span>-41:20</span>
               </div>
            </div>

            <div className="flex items-center justify-between">
               <div className="flex items-center gap-8">
                  <button onClick={() => setIsPaused(!isPaused)} className="text-white hover:text-nebula-cyan transition-colors">
                    {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
                  </button>
                  <button onClick={() => setProgress(p => Math.max(0, p - 5))} className="text-white/60 hover:text-white transition-colors">
                     <RotateCcw size={24} />
                  </button>
                  <button onClick={() => setProgress(p => Math.min(100, p + 5))} className="text-white/60 hover:text-white transition-colors">
                     <RotateCw size={24} />
                  </button>
                  
                  <div className="flex items-center gap-4 ml-4 group/vol">
                     <button onClick={() => setIsMuted(!isMuted)}>
                        {isMuted || volume === 0 ? <VolumeX size={20} className="text-red-500" /> : <Volume2 size={20} />}
                     </button>
                     <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden relative group-hover/vol:h-1.5 transition-all">
                        <div className="h-full bg-white" style={{ width: isMuted ? 0 : `${volume}%` }} />
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-8">
                  <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-white/60 hover:text-white transition-colors">
                     <Languages size={18} />
                     <span>ENGLISH [CC]</span>
                  </button>
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`transition-all duration-500 ${showSettings ? 'text-nebula-cyan rotate-90' : 'text-white/60 hover:text-white'}`}
                  >
                     <Settings size={22} />
                  </button>
                  <button className="text-white/60 hover:text-white transition-colors">
                     <MonitorPlay size={20} />
                  </button>
                  <button className="text-white/60 hover:text-white transition-colors">
                     <Maximize size={20} />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {showSettings && (
            <motion.div 
               key="media-settings"
               initial={{ opacity: 0, scale: 0.9, x: 20 }}
               animate={{ opacity: 1, scale: 1, x: 0 }}
               exit={{ opacity: 0, scale: 0.9, x: 20 }}
               className="absolute right-12 bottom-32 z-[60] w-[320px] glass-rail rounded-2xl p-6 border border-white/10 shadow-2xl"
            >
               <h3 className="text-[10px] font-bold text-dim uppercase tracking-[.2em] mb-6">Playback Intelligence</h3>
               
               <div className="flex flex-col gap-1">
                  <div className="p-3 rounded-xl hover:bg-white/5 group h-auto flex flex-col items-start gap-1 cursor-pointer transition-colors">
                     <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-white/50 group-hover:text-white">Stream Quality</span>
                        <span className="text-[10px] font-bold text-nebula-cyan uppercase">{bitrate}</span>
                     </div>
                     <p className="text-[9px] text-white/30">Auto-bitrate enabled for {bitrate} payload</p>
                  </div>

                  <div className="p-3 rounded-xl hover:bg-white/5 group flex items-center justify-between cursor-pointer transition-colors">
                     <div className="flex items-center gap-3">
                        <Gauge size={14} className="text-white/50" />
                        <span className="text-xs font-semibold text-white/50 group-hover:text-white">Playback Speed</span>
                     </div>
                     <span className="text-[10px] font-bold text-white/70">{playbackSpeed}x</span>
                  </div>

                  <div className="p-3 rounded-xl hover:bg-white/5 group flex items-center justify-between cursor-pointer transition-colors border-t border-white/5 mt-2 pt-4">
                     <div className="flex items-center gap-3">
                        <Languages size={14} className="text-white/50" />
                        <span className="text-xs font-semibold text-white/50 group-hover:text-white">Subtitle Style</span>
                     </div>
                     <ChevronRight size={14} className="text-white/30" />
                  </div>
               </div>

               <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">NEBULA_v0.2.4</span>
                  <button className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase">REPORT FEED</button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {progress > 85 && !isPaused && (
        <motion.div 
          initial={{ x: 50, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          className="absolute right-12 bottom-32 z-40 w-[240px] glass-rail rounded-2xl p-5 border border-nebula-cyan/30 flex gap-4 cursor-pointer hover:border-nebula-cyan transition-colors"
        >
          <div className="w-20 aspect-video rounded bg-black/50 overflow-hidden flex-shrink-0 relative">
             <img src="https://picsum.photos/seed/next/200/112" className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" onError={handleImageError} />
             <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-nebula-cyan">0:24</div>
          </div>
          <div className="flex-1 overflow-hidden">
             <p className="text-[8px] font-extrabold text-nebula-cyan uppercase tracking-[0.2em] mb-1">NEXT UP</p>
             <h4 className="text-[12px] font-bold text-white leading-tight truncate">Project Andromeda: Revelation</h4>
             <p className="text-[10px] text-white/40 mt-1 uppercase">S2 • E5</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
