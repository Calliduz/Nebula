import React, { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import { X, Pause, Play, RotateCcw, RotateCw, VolumeX, Volume2, Maximize, Settings, Gauge, Loader2 } from 'lucide-react';

const API = 'http://localhost:4000';

interface MediaPlayerProps {
  movie: any;
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

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ movie, onClose }) => {
  const [streamUrl, setStreamUrl]   = useState<string | null>(null);
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

    fetch(`${API}/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}`)
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
      fetch(`${API}/api/stream/stop?tmdbId=${movie.id}`, {
        keepalive: true,
      }).catch(() => {});
    };
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

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
    setShowSettings(false);
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
        playsInline
        onClick={togglePlay}
      />

      {/* ── Controls overlay ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between z-10 pointer-events-none"
        style={{ opacity: showUi ? 1 : 0, transition: 'opacity 0.2s' }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-5 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Back (Esc)"
          >
            <X size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate leading-tight">{movie.title}</h2>
            {movie.year && <p className="text-white/40 text-xs">{movie.year}</p>}
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
              {/* Speed */}
              <button
                onClick={() => setShowSettings(p => !p)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${showSettings ? 'text-white' : 'text-white/50 hover:text-white'}`}
                title="Settings"
              >
                <Gauge size={16} />
                {speed !== 1 && <span>{speed}x</span>}
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
                <div className="absolute bottom-10 right-0 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl w-40">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 py-2 border-b border-white/10">Speed</p>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                    <button
                      key={s}
                      onClick={() => setPlaybackSpeed(s)}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${speed === s ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                      {s === 1 ? 'Normal' : `${s}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
