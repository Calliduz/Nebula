import React, { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import { X, Pause, Play, RotateCcw, RotateCw, VolumeX, Volume2, Maximize, Settings, Gauge, Loader2, Subtitles, ChevronRight, List, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:4000';

interface MediaPlayerProps {
  movie: any;
  season?: number;
  episode?: number;
  onClose: () => void;
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ movie, season, episode, onClose }) => {
  const [streamUrl, setStreamUrl]   = useState<string | null>(null);
  const [subtitles, setSubtitles]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [isPaused, setIsPaused]     = useState(false);
  const [progress, setProgress]     = useState(0);
  const [volume, setVolume]         = useState(80);
  const [isMuted, setIsMuted]       = useState(false);
  const [showUi, setShowUi]         = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed]           = useState(1);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration]     = useState('0:00');
  const [buffered, setBuffered]     = useState(0);
  const [qualities, setQualities]   = useState<{height: number, levelId: number}[]>([]);
  const [activeQuality, setActiveQuality] = useState<number>(-1); // -1 = Auto
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1); // -1 = Off
  const [fetchingSubtitles, setFetchingSubtitles] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [tvDetails, setTvDetails] = useState<any>(null);
  const navigate = useNavigate();

  const videoRef    = useRef<HTMLVideoElement>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer   = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch stream ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setStreamUrl(null);

    let url = `${API}/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}`;
    if (season !== undefined) url += `&season=${season}`;
    if (episode !== undefined) url += `&episode=${episode}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.streamUrl) {
          // Route through proxy to bypass CDN CORS/Referer lockdown
          setStreamUrl(`${API}/api/proxy/stream?url=${encodeURIComponent(data.streamUrl)}`);
        } else {
          setError(data.error || 'No stream found.');
        }
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      // Tell backend to stop the heartbeat ping loop
      let stopUrl = `${API}/api/stream/stop?tmdbId=${movie.id}`;
      fetch(stopUrl, {
        keepalive: true,
      }).catch(() => {});
    };
  }, [movie.id, season, episode]); 

  // ── Fetch subtitles manually ──────────────────────────────────────────────
  const aggregateSubtitles = async () => {
    if (fetchingSubtitles) return;
    setFetchingSubtitles(true);
    setSubtitles([]);

    try {
      let url = `${API}/api/subtitles?tmdbId=${movie.id}&type=${movie.type}`;
      if (season !== undefined) url += `&season=${season}`;
      if (episode !== undefined) url += `&episode=${episode}`;

      const r = await fetch(url);
      const data = await r.json();
      if (data.subtitles) setSubtitles(data.subtitles);
    } catch (e) {
      console.error("Subtitle aggregation failed", e);
    } finally {
      setFetchingSubtitles(false);
    }
  };

  // ── Fetch TV Details for Drawer ────────────────────────────────────────────
  useEffect(() => {
    if (movie.type !== 'tv') return;
    fetch(`https://api.themoviedb.org/3/tv/${movie.id}?api_key=ca3e506649859f518e38d7c4909a3cf3`)
      .then(r => r.json())
      .then(data => setTvDetails(data))
      .catch(console.error);
  }, [movie.id]);

  // ── HLS setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualities(data.levels.map((l, i) => ({ height: l.height, levelId: i })).reverse()); // descending order
        video.volume = isMuted ? 0 : volume / 100;
        video.play().catch(() => setIsPaused(true));
      });

      hls.on(Hls.Events.ERROR, (_, d) => {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad(); // try recovering
        } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setError(`Stream failed: ${d.details}`);
        }
      });

      return () => { hls.destroy(); hlsRef.current = null; };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = streamUrl;
      video.play().catch(() => setIsPaused(true));
    }
  }, [streamUrl]);

  // ── Video event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      if (video.duration > 0) setProgress((video.currentTime / video.duration) * 100);
      setCurrentTime(formatTime(video.currentTime));
      // buffered %
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };
    const onDuration = () => setDuration(formatTime(video.duration));
    const onPlay     = () => setIsPaused(false);
    const onPause    = () => setIsPaused(true);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [streamUrl]);

  // ── Volume sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // ── UI hide timer ─────────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!isPaused && !showSettings) setShowUi(false);
    }, 3000);
  }, [isPaused, showSettings]);

  useEffect(() => {
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    return () => {
      window.removeEventListener('mousemove', resetHideTimer);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      switch (e.code) {
        case 'Space': e.preventDefault(); v?.paused ? v?.play() : v?.pause(); break;
        case 'KeyM':  setIsMuted(p => !p); break;
        case 'KeyF':
          if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
          else document.exitFullscreen();
          break;
        case 'KeyL': if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10); break;
        case 'KeyJ': if (v) v.currentTime = Math.max(0, v.currentTime - 10); break;
        case 'ArrowRight': if (v) v.currentTime = Math.min(v.duration, v.currentTime + 5); break;
        case 'ArrowLeft':  if (v) v.currentTime = Math.max(0, v.currentTime - 5); break;
        case 'ArrowUp':   e.preventDefault(); setVolume(p => Math.min(100, p + 5)); break;
        case 'ArrowDown': e.preventDefault(); setVolume(p => Math.max(0, p - 5)); break;
        case 'Escape': showSettings ? setShowSettings(false) : onClose(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showSettings]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const setPlaybackSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const setQuality = (levelId: number) => {
    setActiveQuality(levelId);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
  };

  const toggleSubtitles = (index: number) => {
    setActiveSubtitle(index);
    if (videoRef.current) {
      Array.from(videoRef.current.textTracks).forEach((track, idx) => {
        track.mode = idx === index ? 'showing' : 'hidden';
      });
    }
  };

  const handleNextEpisode = () => {
    if (movie.type !== 'tv' || season === undefined || episode === undefined) return;
    // Simple increment logic; UI will handle navigation through route Params
    navigate(`/watch/tv/${movie.id}?season=${season}&episode=${episode + 1}`);
  };

  const safeClose = () => {
    onClose();
    // Fallback if onClose (navigate -1) fails
    setTimeout(() => {
      if (window.location.pathname.includes('/watch/')) {
        navigate('/');
      }
    }, 100);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-black overflow-hidden"
      onMouseMove={resetHideTimer}
      style={{ cursor: showUi ? 'default' : 'none' }}
    >
      {/* ── Loading state ── */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20">
          {movie.backdrop && (
            <img
              src={movie.backdrop}
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-2xl"
              alt=""
            />
          )}
          <Loader2 size={36} className="animate-spin text-white/60" />
          <p className="text-white/50 text-sm tracking-widest uppercase">Finding stream…</p>
          <button
            onClick={onClose}
            className="mt-4 text-white/30 hover:text-white text-xs underline transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Error state ── */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 px-8 text-center">
          {movie.backdrop && (
            <img
              src={movie.backdrop}
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-2xl"
              alt=""
            />
          )}
          <p className="text-white font-semibold">No stream found</p>
          <p className="text-white/50 text-sm max-w-sm">{error}</p>
          <button
            onClick={onClose}
            className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
          >
            Go back
          </button>
        </div>
      )}

      {/* ── Video element ── */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        playsInline
        onClick={togglePlay}
      >
        {subtitles.map((sub, idx) => (
          <track 
            key={idx}
            kind="subtitles"
            src={sub.url}
            srcLang={sub.lang}
            label={sub.languageName}
            default={idx === activeSubtitle}
          />
        ))}
      </video>

      {/* ── Controls overlay ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between z-10 pointer-events-none"
        style={{ opacity: showUi ? 1 : 0, transition: 'opacity 0.2s' }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-5 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
          <button
            onClick={safeClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-white/5"
            title="Back (Esc)"
          >
            <X size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate leading-tight flex items-center gap-2">
              {movie.title}
              {season !== undefined && episode !== undefined && (
                <span className="text-nebula-cyan font-display italic text-sm">S{season}E{episode}</span>
              )}
            </h2>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">{movie.type === 'tv' ? 'Secure TV Link' : 'Secure Movie Link'} — {movie.year}</p>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="px-6 pb-6 pt-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
          {/* Progress bar */}
          <div
            className="relative h-1 w-full bg-white/20 rounded-full mb-4 cursor-pointer group"
            onClick={handleSeek}
            style={{ height: '4px' }}
          >
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
              style={{ width: `${buffered}%` }}
            />
            {/* Played */}
            <div
              className="absolute inset-y-0 left-0 bg-white rounded-full"
              style={{ width: `${progress}%` }}
            />
            {/* Seek thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5"
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Control row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* Rewind */}
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }}
                className="text-white/70 hover:text-white transition-colors"
                title="–10s (J)"
              >
                <RotateCcw size={20} />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white hover:text-white/80 transition-colors"
                title="Play/Pause (Space)"
              >
                {isPaused ? <Play size={28} fill="currentColor" /> : <Pause size={28} fill="currentColor" />}
              </button>

              {/* Forward */}
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10); }}
                className="text-white/70 hover:text-white transition-colors"
                title="+10s (L)"
              >
                <RotateCw size={20} />
              </button>

              {/* Next Episode */}
              {movie.type === 'tv' && (
                <button
                  onClick={handleNextEpisode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all border border-white/5"
                  title="Next Episode"
                >
                  <span className="hidden sm:inline italic">NEXT</span>
                  <ChevronRight size={16} />
                </button>
              )}

              {/* Volume */}
              <div className="flex items-center gap-2 group/vol">
                <button onClick={() => setIsMuted(p => !p)} className="text-white/70 hover:text-white transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0} max={100}
                  value={isMuted ? 0 : volume}
                  onChange={e => { setVolume(+e.target.value); setIsMuted(false); }}
                  className="w-20 accent-white cursor-pointer opacity-0 group-hover/vol:opacity-100 transition-opacity"
                />
              </div>

              {/* Time */}
              <span className="text-white/50 text-xs tabular-nums">
                {currentTime} / {duration}
              </span>
            </div>

            <div className="flex items-center gap-4 relative">
              {/* Episodes Button */}
              {movie.type === 'tv' && (
                <button
                  onClick={() => setShowEpisodeDrawer(true)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-bold border border-white/10 ${showEpisodeDrawer ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <List size={16} />
                  <span>EPISODES</span>
                </button>
              )}

              {/* Subtitles (Standalone) */}
              <button
                onClick={aggregateSubtitles}
                disabled={fetchingSubtitles}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-bold border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 ${fetchingSubtitles ? 'animate-pulse' : ''}`}
              >
                {fetchingSubtitles ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                <span>{subtitles.length > 0 ? 'SUBTITLES' : 'SEARCH SUBS'}</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(p => !p)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showSettings ? 'bg-white text-black' : 'bg-white/10 text-white/50 hover:text-white'}`}
                title="Settings"
              >
                <Settings size={18} />
              </button>

              {/* Fullscreen */}
              <button
                onClick={handleFullscreen}
                className="text-white/50 hover:text-white transition-colors"
                title="Fullscreen (F)"
              >
                <Maximize size={18} />
              </button>

              {/* Settings panel */}
              {showSettings && (
                <div className="absolute bottom-12 right-0 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl w-60 max-h-[60vh] overflow-y-auto custom-scrollbar pointer-events-auto flex flex-col gap-1 p-2">
                  <div className="mb-2">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1">Speed</p>
                    <div className="grid grid-cols-3 gap-1 px-2">
                      {[0.5, 1, 1.5, 2].map(s => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`w-full text-center py-1.5 text-xs rounded-md transition-colors ${speed === s ? 'text-black bg-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        >
                          {s === 1 ? '1x' : `${s}x`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {qualities.length > 0 && (
                    <div className="mb-2">
                      <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 border-t border-white/10">Quality</p>
                      <div className="flex flex-col px-2">
                        <button
                          onClick={() => setQuality(-1)}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${activeQuality === -1 ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                          Auto
                        </button>
                        {qualities.map(q => (
                          <button
                            key={q.levelId}
                            onClick={() => setQuality(q.levelId)}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${activeQuality === q.levelId ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                          >
                            {q.height}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(subtitles.length > 0 || fetchingSubtitles) && (
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 border-t border-white/10 flex items-center gap-2">
                        <Subtitles size={12}/> 
                        Subtitles {fetchingSubtitles && <Loader2 size={10} className="animate-spin text-nebula-cyan" />}
                      </p>
                      <div className="flex flex-col px-2">
                        {!fetchingSubtitles && (
                          <button
                            onClick={() => toggleSubtitles(-1)}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${activeSubtitle === -1 ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                          >
                            Off
                          </button>
                        )}
                        {fetchingSubtitles ? (
                          <div className="px-2 py-3 text-[10px] text-white/40 italic flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" /> Establishing track link...
                          </div>
                        ) : (
                          subtitles.map((sub, i) => (
                            <button
                              key={i}
                              onClick={() => toggleSubtitles(i)}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${activeSubtitle === i ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                              {sub.languageName}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Episode Side Drawer ── */}
      <AnimatePresence>
        {showEpisodeDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEpisodeDrawer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] pointer-events-auto"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-obsidian border-l border-white/10 z-[300] shadow-2xl flex flex-col pointer-events-auto"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Episode Relay</h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-tighter">Season {season}</p>
                </div>
                <button onClick={() => setShowEpisodeDrawer(false)} className="w-8 h-8 rounded-full bg-white/5 text-white/40 hover:text-white flex items-center justify-center transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {/* We map current season episodes if available */}
                {tvDetails?.seasons?.find((s: any) => s.season_number === season)?.episode_count ? (
                  Array.from({ length: tvDetails.seasons.find((s: any) => s.season_number === season).episode_count }).map((_, i) => {
                    const epNum = i + 1;
                    return (
                      <button
                        key={epNum}
                        onClick={() => {
                          navigate(`/watch/tv/${movie.id}?season=${season}&episode=${epNum}`);
                          setShowEpisodeDrawer(false);
                        }}
                        className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 group ${episode === epNum ? 'bg-nebula-cyan/20 border border-nebula-cyan/30' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black italic text-xs transition-colors ${episode === epNum ? 'bg-nebula-cyan text-obsidian' : 'bg-white/10 text-white/40 group-hover:bg-white/20'}`}>
                          {epNum}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${episode === epNum ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>Episode {epNum}</p>
                          <p className="text-[10px] text-white/20 uppercase tracking-widest">Uplink Stable</p>
                        </div>
                        {episode === epNum && <div className="w-1.5 h-1.5 rounded-full bg-nebula-cyan animate-pulse shadow-[0_0_10px_rgba(46,204,113,0.8)]" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <Loader2 size={24} className="animate-spin text-white/10" />
                    <p className="text-xs text-white/20 uppercase tracking-widest">Hydrating episode list...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
