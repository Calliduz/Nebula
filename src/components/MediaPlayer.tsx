import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MonitorPlay, Pause, Play, RotateCcw, RotateCw, VolumeX, Volume2, Languages, Settings, Maximize, Gauge, Loader2 } from 'lucide-react';
import Hls from 'hls.js';
import { handleImageError } from '../utils/helpers';

interface MediaPlayerProps {
  movie: any;
  onClose: () => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ movie, onClose }) => {
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bitrate, setBitrate] = useState('AUTO');

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Stream Handoff
  useEffect(() => {
    const fetchStream = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}`);
        const data = await res.json();
        if (res.ok && data.streamUrl) {
          setStreamUrl(data.streamUrl);
        } else {
          throw new Error(data.error || 'Failed to locate stream.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStream();
  }, [movie]);

  // HLS attachment
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('Autoplay blocked', e));
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError('Stream error: ' + data.details);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log('Autoplay blocked', e));
      });
    }
    
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [streamUrl]);

  // Video Time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    const handlePlay = () => setIsPaused(false);
    const handlePause = () => setIsPaused(true);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [streamUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const currentFormattedTime = videoRef.current ? formatTime(videoRef.current.currentTime) : '00:00';
  const remainingFormattedTime = videoRef.current && videoRef.current.duration ? '-' + formatTime(videoRef.current.duration - videoRef.current.currentTime) : '00:00';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, streamUrl]);

  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

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
          togglePlay();
          break;
        case 'KeyM': 
          setIsMuted(prev => !prev); 
          break;
        case 'KeyF': 
          if (!document.fullscreenElement && containerRef.current) containerRef.current.requestFullscreen();
          else if (document.fullscreenElement) document.exitFullscreen();
          break;
        case 'KeyL': 
          if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          break;
        case 'KeyJ': 
           if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden cursor-none group-hover:cursor-auto"
      onMouseMove={resetUiTimeout}
      style={{ cursor: isUiVisible ? 'auto' : 'none' }}
    >
      <div className="absolute inset-0 z-0 bg-black">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 w-full h-full">
            <img src={movie.backdrop || movie.image} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl scale-110" alt="loader bg" />
            
            {movie.clearLogo ? (
              <img src={movie.clearLogo} alt={movie.title} className="w-[300px] object-contain mb-8 animate-pulse drop-shadow-2xl" />
            ) : (
              <p className="text-[14px] font-black tracking-[0.4em] uppercase text-white animate-pulse mb-8">{movie.title}</p>
            )}

            <Loader2 size={32} className="animate-spin text-nebula-cyan mb-4 drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]" />
            <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-white/50">ESTABLISHING SECURE UPLINK</p>
          </div>
        )}

        {error && (
           <div className="absolute inset-0 flex flex-col items-center justify-center z-10 w-full h-full">
            <img src={movie.backdrop || movie.image} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl scale-110" alt="loader bg" />
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl backdrop-blur-md max-w-lg text-center">
               <p className="text-red-400 font-bold mb-2">Uplink Failed</p>
               <p className="text-white/70 text-sm">{error}</p>
               <button onClick={onClose} className="mt-6 px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors">Abort Mission</button>
            </div>
          </div>
        )}

        {streamUrl && (
          <video 
            ref={videoRef}
            className={`w-full h-full object-contain transition-all duration-1000 ${isPaused ? 'scale-[1.02] blur-[1px]' : 'scale-100'}`}
            playsInline
            onClick={togglePlay}
          />
        )}
        
        <div className={`absolute inset-0 bg-black transition-opacity duration-1000 pointer-events-none ${!isUiVisible ? 'opacity-0' : 'opacity-40'}`} />
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
                <h2 className="text-xl font-bold tracking-tight uppercase line-clamp-1 max-w-md">{movie.title}</h2>
                <p className="text-[10px] text-nebula-cyan font-bold tracking-[0.3em] uppercase">NEBULA STREAMING DIRECT • {bitrate}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               {streamUrl && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold">
                    <div className={`w-2 h-2 rounded-full bg-[#2ecc71] ${!isPaused ? 'animate-pulse' : ''}`} />
                    STABLE CONNECTION
                  </div>
               )}
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
            className="absolute bottom-0 left-0 right-0 z-50 px-12 pb-12 pt-24 bg-gradient-to-t from-black via-black/80 flex flex-col to-transparent"
          >
            <div className="relative group/progress cursor-pointer mb-8 py-2" onClick={handleSeek}>
               <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden transition-all group-hover/progress:h-2">
                  <motion.div 
                    className="h-full bg-nebula-cyan glow-cyan relative bg-opacity-100"
                    style={{ width: `${progress}%` }}
                  >
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                  </motion.div>
               </div>
               <div className="flex justify-between mt-3 text-[10px] font-bold text-white/50 tracking-widest uppercase">
                  <span>{currentFormattedTime}</span>
                  <span>{remainingFormattedTime}</span>
               </div>
            </div>

            <div className="flex items-center justify-between">
               <div className="flex items-center gap-8">
                  <button onClick={togglePlay} className="text-white hover:text-nebula-cyan transition-colors drop-shadow-2xl">
                    {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
                  </button>
                  <button onClick={() => { if(videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10) }} className="text-white/60 hover:text-white transition-colors">
                     <RotateCcw size={24} />
                  </button>
                  <button onClick={() => { if(videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10) }} className="text-white/60 hover:text-white transition-colors">
                     <RotateCw size={24} />
                  </button>
                  
                  <div className="flex items-center gap-4 ml-4 group/vol">
                     <button onClick={() => setIsMuted(!isMuted)}>
                        {isMuted || volume === 0 ? <VolumeX size={20} className="text-red-500" /> : <Volume2 size={20} />}
                     </button>
                     <div className="w-24 h-1 bg-white/30 rounded-full overflow-hidden relative group-hover/vol:h-1.5 transition-all">
                        <div className="h-full bg-white transition-all" style={{ width: isMuted ? 0 : `${volume}%` }} />
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
                    className={`transition-all duration-500 ${showSettings ? 'text-nebula-cyan rotate-90 scale-110' : 'text-white/60 hover:text-white'}`}
                  >
                     <Settings size={22} />
                  </button>
                  <button 
                    onClick={() => {
                      if (!document.fullscreenElement && containerRef.current) containerRef.current.requestFullscreen();
                      else if (document.fullscreenElement) document.exitFullscreen();
                    }}
                    className="text-white/60 hover:text-white transition-colors"
                   >
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
               className="absolute right-12 bottom-32 z-[60] w-[320px] bg-black/60 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-2xl"
            >
               <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-[.2em] mb-6">Playback Intelligence</h3>
               
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
               </div>

               <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">NEBULA_v0.9.4</span>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </motion.div>
  );
};
