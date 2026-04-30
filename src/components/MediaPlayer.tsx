import React, { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import { X, Pause, Play, RotateCcw, RotateCw, VolumeX, Volume2, Maximize, Settings, Gauge, Loader2, Subtitles, ChevronRight, List, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

let rawApi = import.meta.env.VITE_API_BASE_URL;
if (!rawApi) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    rawApi = 'http://localhost:4000';
  } else if (window.location.hostname === 'nebula.clev.studio') {
    rawApi = 'https://nebula-server-qbp6.onrender.com';
  } else {
    rawApi = `${window.location.origin}/api`;
  }
}
const API = rawApi.replace(/\/api\/?$/, '').replace(/\/$/, '');

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
  const [isBuffering, setIsBuffering] = useState(false);
  const [showUi, setShowUi]         = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed]           = useState(1);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration]     = useState('0:00');
  const [buffered, setBuffered]     = useState(0);
  const [qualities, setQualities]   = useState<{height: number, levelId: number}[]>([]);
  const [activeQuality, setActiveQuality] = useState<number>(-1); // -1 = Auto
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1); // -1 = Off
  const [subtitleOffset, setSubtitleOffset] = useState<number>(0);
  const [fetchingSubtitles, setFetchingSubtitles] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [tvDetails, setTvDetails] = useState<any>(null);
  const [qualityTag, setQualityTag] = useState<string>(''); // CAM | WEBDL | WEBRIP | BLURAY | etc.
  const [resolution, setResolution] = useState<string>('');
  const [mirrors, setMirrors]     = useState<any[]>([]);
  const [activeMirror, setActiveMirror] = useState<number>(0);
  const [vttBlobUrl, setVttBlobUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showMobileVolume, setShowMobileVolume] = useState(false);
  const hasAutoSelectedSub = useRef(false);
  const navigate = useNavigate();

  const videoRef    = useRef<HTMLVideoElement>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer   = useRef<NodeJS.Timeout | null>(null);

  // ── Auto Fullscreen & Landscape ───────────────────────────────────────────
  useEffect(() => {
    const handleAutoFullscreen = async () => {
      // Only trigger auto-fullscreen/orientation for mobile devices
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      if (!isMobile) return;

      try {
        if (containerRef.current) {
          // Standard Fullscreen API
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
          } else if ((containerRef.current as any).mozRequestFullScreen) {
            await (containerRef.current as any).mozRequestFullScreen();
          } else if ((containerRef.current as any).msRequestFullscreen) {
            await (containerRef.current as any).msRequestFullscreen();
          }
        }

        // Screen Orientation API (Mobile)
        // Note: Orientation lock usually requires being in fullscreen first
        if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
          await (window.screen.orientation as any).lock('landscape').catch((e: any) => {
            console.warn('Orientation lock failed:', e);
          });
        }
      } catch (err) {
        console.warn('Auto-fullscreen/orientation failed:', err);
      }
    };

    // Delay slightly to ensure component is fully mounted and animation is settled
    const timer = setTimeout(handleAutoFullscreen, 300);
    
    return () => {
      clearTimeout(timer);
      // Unlock orientation when player closes
      if (window.screen && window.screen.orientation && (window.screen.orientation as any).unlock) {
        try {
          (window.screen.orientation as any).unlock();
        } catch (e) {}
      }
    };
  }, []);

  // ── Fetch stream ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setStreamUrl(null);
    setMirrors([]);
    setActiveMirror(0);
    setSubtitles([]);
    setActiveSubtitle(-1);
    hasAutoSelectedSub.current = false;
    if (vttBlobUrl) {
      URL.revokeObjectURL(vttBlobUrl);
      setVttBlobUrl(null);
    }

    let url = `${API}/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}`;
    if (movie.origin) url += `&origin=${movie.origin}`;
    if (season !== undefined) url += `&season=${season}`;
    if (episode !== undefined) url += `&episode=${episode}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.mirrors && data.mirrors.length > 0) {
          const proxiedMirrors = data.mirrors.map((m: any) => {
            const proxiedUrl = `${API}/api/proxy/stream?url=${encodeURIComponent(m.url)}`;
            console.log(`[PLAYER] Proxied mirror: ${m.name} -> ${proxiedUrl.substring(0, 100)}...`);
            return { ...m, url: proxiedUrl };
          });
          setMirrors(proxiedMirrors);
          setStreamUrl(proxiedMirrors[0].url);
          setActiveMirror(0);
          
          if (data.qualityTag) setQualityTag(data.qualityTag);
          if (data.resolution) setResolution(data.resolution);
          if (data.subtitles) {
            setSubtitles(processSubtitles(data.subtitles, []));
          }
        } else if (data.streamUrl) {
          setStreamUrl(`${API}/api/proxy/stream?url=${encodeURIComponent(data.streamUrl)}`);
          if (data.qualityTag) setQualityTag(data.qualityTag);
          if (data.resolution) setResolution(data.resolution);
          if (data.subtitles) {
            setSubtitles(processSubtitles(data.subtitles, []));
          }
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

  // ── Auto-fetch external subtitles in the background ─────────────────────
  useEffect(() => {
    if (!streamUrl) return;

    let cancelled = false;
    setFetchingSubtitles(true);

    const fetchSubs = async () => {
      try {
        let url = `${API}/api/subtitles?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || '')}`;
        if (movie.origin) url += `&origin=${movie.origin}`;
        if (season !== undefined) url += `&season=${season}`;
        if (episode !== undefined) url += `&episode=${episode}`;

        const r = await fetch(url);
        const data = await r.json();
        if (cancelled) return;

        if (data.subtitles && data.subtitles.length > 0) {
          setSubtitles(prev => processSubtitles(data.subtitles, prev));
        }
      } catch (e) {
        console.error("Subtitle auto-fetch failed", e);
      } finally {
        if (!cancelled) setFetchingSubtitles(false);
      }
    };

    fetchSubs();

    return () => { cancelled = true; };
  }, [streamUrl, movie.id, movie.type, season, episode]);

    const handleSubtitleChange = (index: number) => {
      setActiveSubtitle(index);
      setSubtitleOffset(0);
      if (index === -1) hasAutoSelectedSub.current = true; // User manually turned off
    };

    const adjustSubtitleDelay = (delta: number) => {
      if (activeSubtitle === -1) return;
      setSubtitleOffset(prev => prev + delta);
    };

    // ── VTT Timestamp Shifter ──
    const shiftVttTimestamps = (vttText: string, offsetMs: number) => {
      if (offsetMs === 0) return vttText;
      // More flexible regex: HH:MM:SS.mmm or MM:SS.mmm, also handles , instead of .
      const timestampRegex = /(\d{1,2}:)?\d{1,2}:\d{1,2}[\.,]\d{1,3}/g;
      
      return vttText.replace(timestampRegex, (match) => {
        const [time, msPart] = match.split(/[\.,]/);
        const timeParts = time.split(':');
        let h = 0, m = 0, s = 0;
        
        if (timeParts.length === 3) {
          h = parseInt(timeParts[0]);
          m = parseInt(timeParts[1]);
          s = parseInt(timeParts[2]);
        } else {
          m = parseInt(timeParts[0]);
          s = parseInt(timeParts[1]);
        }
        
        // Normalize ms to 3 digits (e.g. "5" -> 500, "50" -> 500, "500" -> 500)
        const ms = parseInt(msPart.padEnd(3, '0').substring(0, 3));
        
        let totalMs = h * 3600000 + m * 60000 + s * 1000 + ms + (offsetMs * 1000);
        if (totalMs < 0) totalMs = 0;
        
        const newH = Math.floor(totalMs / 3600000);
        totalMs %= 3600000;
        const newM = Math.floor(totalMs / 60000);
        totalMs %= 60000;
        const newS = Math.floor(totalMs / 1000);
        const newMs = totalMs % 1000;
        
        return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}:${newS.toString().padStart(2, '0')}.${newMs.toString().padStart(3, '0')}`;
      });
    };

    // ── Production-Grade Sync Effect (Blob Based) ──
    useEffect(() => {
      if (activeSubtitle === -1 || !subtitles[activeSubtitle]) {
        if (vttBlobUrl) URL.revokeObjectURL(vttBlobUrl);
        setVttBlobUrl(null);
        return;
      }

      let cancelled = false;
      const sub = subtitles[activeSubtitle];

      const processSub = async () => {
        try {
          const r = await fetch(sub.url);
          const text = await r.text();
          if (cancelled) return;

          const shiftedText = shiftVttTimestamps(text, subtitleOffset);
          const blob = new Blob([shiftedText], { type: 'text/vtt' });
          const newUrl = URL.createObjectURL(blob);
          
          setVttBlobUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return newUrl;
          });
        } catch (e) {
          console.error("VTT processing failed", e);
        }
      };

      processSub();
      return () => { cancelled = true; };
    }, [activeSubtitle, subtitles, subtitleOffset]);

  // ── Auto-select first subtitle ───────────────────────────────────────────
  useEffect(() => {
    if (subtitles.length > 0 && activeSubtitle === -1 && !hasAutoSelectedSub.current) {
      setActiveSubtitle(0);
      hasAutoSelectedSub.current = true;
    }
  }, [subtitles]);

  const getProgressKey = useCallback(() => {
    if (movie.type === 'tv' && season !== undefined && episode !== undefined) {
      return `${movie.id}-S${season}E${episode}`;
    }
    return movie.id;
  }, [movie.id, movie.type, season, episode]);

  const processSubtitles = useCallback((newSubs: any[], existingSubs: any[]) => {
    const combined = [...existingSubs];
    newSubs.forEach(ns => {
      const normalizedUrl = ns.url.startsWith('/') ? `${API}${ns.url}` : ns.url;
      if (!combined.some(ps => ps.url === normalizedUrl)) {
        combined.push({ ...ns, url: normalizedUrl });
      }
    });

    const englishSubs: any[] = [];
    const otherLangSubs: any[] = [];
    
    // Group subtitles by language priority
    combined.forEach(s => {
      const isEnglish = (s.lang || '').startsWith('en') || s.languageName?.toLowerCase().includes('english');
      if (isEnglish) englishSubs.push(s);
      else otherLangSubs.push(s);
    });

    const processGroup = (group: any[]) => {
      const vidlink = group.filter(s => s.source === 'VidLink');
      const external = group.filter(s => s.source !== 'VidLink');
      
      const processed: any[] = [];
      const extCount: Record<string, number> = {};
      const vidCount: Record<string, number> = {};

      vidlink.forEach(s => {
        const lang = s.lang || 'unk';
        vidCount[lang] = (vidCount[lang] || 0) + 1;
        const isEnglish = lang.startsWith('en') || s.languageName?.toLowerCase().includes('english');
        
        let name = s.languageName;
        if (isEnglish) {
          name = `English (Vidlink)${vidCount[lang] > 1 ? ` #${vidCount[lang]}` : ''}`;
        } else {
          name = `${s.languageName} (Vidlink)${vidCount[lang] > 1 ? ` #${vidCount[lang]}` : ''}`;
        }
        processed.push({ ...s, languageName: name });
      });

      external.forEach(s => {
        const lang = s.lang || 'unk';
        const count = extCount[lang] || 0;
        if (count < 3) {
          extCount[lang] = count + 1;
          const sourceSuffix = s.source === 'OpenSubtitles' ? ' (OpenSubtitles)' : '';
          const name = `${s.languageName} #${extCount[lang]} (External)${sourceSuffix}`;
          processed.push({ ...s, languageName: name });
        }
      });

      return processed;
    };

    return [...processGroup(englishSubs), ...processGroup(otherLangSubs)];
  }, [API]);

  // ── Fetch TV Details ──────────────────────────────────────────────────────
  useEffect(() => {
    if (movie.type !== 'tv') return;
    fetch(`${API}/api/tv-details/${movie.id}`)
      .then(r => r.json())
      .then(data => setTvDetails(data))
      .catch(console.error);
  }, [movie.id]);

  // ── HLS setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;
    setIsBuffering(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        backBufferLength: 30,
        fragLoadingMaxRetry: 20,
        manifestLoadingMaxRetry: 20,
        enableWorker: true,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 30,
        maxBufferHole: 2.0,
        maxFragLookUpTolerance: 0.25,
        capLevelToPlayerSize: true,
        enableSoftwareAES: true,
        abrEwmaDefaultEstimate: 5000000,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualities(data.levels.map((l, i) => ({ height: l.height, levelId: i })).reverse());
        video.volume = isMuted ? 0 : volume / 100;
        video.play().catch(() => setIsPaused(true));
      });

      hls.on(Hls.Events.ERROR, (_, d) => {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setError(`Stream failed: ${d.details}`);
        }
      });

      return () => { hls.destroy(); hlsRef.current = null; };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.play().catch(() => setIsPaused(true));
    }
  }, [streamUrl]);

  // ── Video event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      const savedProgress = JSON.parse(localStorage.getItem('nebula-progress') || '{}');
      const key = getProgressKey();
      if (savedProgress[key]) {
        const val = savedProgress[key];
        video.currentTime = typeof val === 'object' ? val.time : val;
      }
    };

    const lastSaveTime = { current: 0 };
    const onTime = () => {
      if (video.duration > 0) {
        const cur = video.currentTime;
        setProgress((cur / video.duration) * 100);
        
        // Throttle progress saving to every 5 seconds
        if (Date.now() - lastSaveTime.current > 5000) {
          const key = getProgressKey();
          if (cur > 10 && video.duration - cur > 10) {
            const p = JSON.parse(localStorage.getItem('nebula-progress') || '{}');
            p[key] = { time: cur, duration: video.duration };
            localStorage.setItem('nebula-progress', JSON.stringify(p));
            lastSaveTime.current = Date.now();
          } else if (video.duration - cur <= 10) {
            const p = JSON.parse(localStorage.getItem('nebula-progress') || '{}');
            delete p[key];
            localStorage.setItem('nebula-progress', JSON.stringify(p));
            lastSaveTime.current = Date.now();
          }
        }
      }
      setCurrentTime(formatTime(video.currentTime));
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };
    const onDuration = () => setDuration(formatTime(video.duration));
    const onPlay     = () => setIsPaused(false);
    const onPause    = () => setIsPaused(true);
    const onWaiting  = () => setIsBuffering(true);
    const onPlaying  = () => setIsBuffering(false);
    const onCanPlay  = () => setIsBuffering(false);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [streamUrl, movie.id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

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

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const handleSliderMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const slider = document.getElementById('progress-slider');
    if (!slider) return;
    const r = slider.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setDragProgress(p);
  }, [isDragging]);

  const handleSliderUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const v = videoRef.current;
    if (v && isFinite(v.duration)) {
      v.currentTime = (dragProgress / 100) * v.duration;
    }
  }, [isDragging, dragProgress]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleSliderMove);
      window.addEventListener('mouseup', handleSliderUp);
      window.addEventListener('touchmove', handleSliderMove);
      window.addEventListener('touchend', handleSliderUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleSliderMove);
      window.removeEventListener('mouseup', handleSliderUp);
      window.removeEventListener('touchmove', handleSliderMove);
      window.removeEventListener('touchend', handleSliderUp);
    };
  }, [isDragging, handleSliderMove, handleSliderUp]);

  const handleSliderDown = (e: React.MouseEvent | React.TouchEvent) => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration)) return;
    setIsDragging(true);
    const r = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setDragProgress(p);
  };

  const handleSliderHover = (e: React.MouseEvent) => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHoverTime(p * v.duration);
    setHoverX(e.clientX - r.left);
  };

  const handleFullscreen = () => {
    const video = videoRef.current as any;
    if (video && video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    } else {
      if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
      else document.exitFullscreen();
    }
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
      const tracks = Array.from(videoRef.current.textTracks) as TextTrack[];
      tracks.forEach((track, idx) => {
        track.mode = idx === index ? 'showing' : 'hidden';
      });
    }
  };

  const handleNextEpisode = () => {
    if (movie.type !== 'tv' || season === undefined || episode === undefined) return;
    navigate(`/watch/tv/${movie.id}?season=${season}&episode=${episode + 1}`);
  };

  const safeClose = () => {
    onClose();
    setTimeout(() => {
      if (window.location.pathname.includes('/watch/')) {
        navigate('/');
      }
    }, 100);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-black overflow-hidden"
      onMouseMove={resetHideTimer}
      style={{ cursor: showUi ? 'default' : 'none' }}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-[100] bg-black">
          {(movie.fanartBackground || movie.backdrop) && (
            <img
              src={movie.fanartBackground || movie.backdrop}
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-3xl scale-110"
              alt=""
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)' }}
          />
          <div className="relative flex flex-col items-center gap-8">
            {movie.clearLogo ? (
              <img
                src={movie.clearLogo}
                alt={movie.title}
                className="h-20 md:h-28 w-auto object-contain drop-shadow-2xl animate-pulse"
                referrerPolicy="no-referrer"
              />
            ) : (
              <h1 className="text-3xl md:text-5xl font-display font-black uppercase tracking-tighter text-white animate-pulse drop-shadow-2xl">
                {movie.title}
              </h1>
            )}
            <div className="flex flex-col items-center gap-3 w-64">
              <div className="w-full h-px bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-nebula-cyan rounded-full"
                  style={{ animation: 'stream-progress 3s ease-in-out infinite' }}
                />
              </div>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold animate-pulse">
                Locating Secure Stream…
              </p>
            </div>
            <button
              onClick={safeClose}
              className="text-white/20 hover:text-white/60 text-xs underline transition-colors tracking-widest uppercase"
            >
              Cancel
            </button>
          </div>
          <style>{`
            @keyframes stream-progress {
              0%   { width: 0%; opacity: 1; }
              70%  { width: 85%; opacity: 1; }
              90%  { width: 90%; opacity: 0.7; }
              100% { width: 90%; opacity: 0.7; }
            }
          `}</style>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 z-[500] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 pointer-events-none">
          {movie.backdrop && (
            <img
              src={movie.backdrop}
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-2xl"
              alt=""
            />
          )}
          <div className="relative z-10 flex flex-col items-center pointer-events-auto">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/50">
               <Info className="text-red-500" size={32} />
            </div>
            <h3 className="text-2xl font-display font-black text-white mb-2 uppercase tracking-tighter">No signal detected</h3>
            <p className="text-white/40 max-w-sm mb-8 font-light text-sm">The requested data stream is unreachable from this sector. Try another mirror or origin point.</p>
            <button 
              onClick={safeClose}
              className="px-8 py-3 bg-white text-obsidian rounded-full text-[10px] uppercase font-black tracking-[0.2em] hover:bg-nebula-cyan transition-colors"
            >
              Abort Mission
            </button>
          </div>
        </div>
      )}

      {isBuffering && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-[150] pointer-events-none bg-black/20 backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col items-center gap-4">
            {movie.clearLogo ? (
              <img
                src={movie.clearLogo}
                alt="Loading..."
                className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl animate-pulse opacity-80"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="relative">
                <Loader2 size={48} className="animate-spin text-nebula-cyan opacity-80" />
              </div>
            )}
            <p className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse">
              Buffering Signal...
            </p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        playsInline
        onClick={resetHideTimer}
      >
        {vttBlobUrl && (
          <track
            key={vttBlobUrl}
            kind="subtitles"
            src={vttBlobUrl}
            srcLang={subtitles[activeSubtitle]?.lang || 'en'}
            label={subtitles[activeSubtitle]?.languageName || 'Active'}
            default
          />
        )}
      </video>

      <div
        className="absolute inset-0 flex flex-col justify-between z-10 pointer-events-none"
        style={{ opacity: showUi ? 1 : 0, transition: 'opacity 0.2s' }}
      >
        <div className="flex items-center gap-3 px-3 sm:px-6 py-3 sm:py-5 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
          <button
            onClick={safeClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-white/5 shrink-0"
            title="Back (Esc)"
          >
            <X size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-semibold truncate leading-tight flex items-center gap-2">
              {movie.title}
              {season !== undefined && episode !== undefined && (
                <span className="text-nebula-cyan font-display italic text-xs sm:text-sm">S{season}E{episode}</span>
              )}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest">{movie.type === 'tv' ? 'TV Link' : 'Movie Link'} — {movie.year}</p>
              {qualityTag && qualityTag !== 'UNKNOWN' && (
                <div className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                    qualityTag === 'CAM' || qualityTag === 'TC'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : qualityTag === 'BLURAY'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-nebula-cyan/10 border-nebula-cyan/30 text-nebula-cyan'
                  }`}>
                    {qualityTag === 'WEBDL' ? 'WEB-DL' : qualityTag === 'WEBRIP' ? 'WEBRip' : qualityTag}
                  </span>
                  {resolution && resolution !== 'UNKNOWN' && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-white/5 border-white/10 text-white/50">
                      {resolution}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-12 sm:pt-16 bg-gradient-to-t from-black/90 to-transparent pointer-events-auto">
          <div
            id="progress-slider"
            className="relative w-full rounded-full mb-3 sm:mb-4 cursor-pointer group flex items-center h-5"
            onMouseDown={handleSliderDown}
            onTouchStart={handleSliderDown}
            onMouseMove={handleSliderHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Hover Tooltip */}
            {hoverTime !== null && !isDragging && (
              <div 
                className="absolute bottom-full mb-3 -translate-x-1/2 px-2.5 py-1.5 bg-black/90 backdrop-blur-md border border-white/20 text-white rounded-lg text-[10px] font-bold pointer-events-none z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                style={{ left: `${(hoverTime / (videoRef.current?.duration || 1)) * 100}%` }}
              >
                {formatTime(hoverTime)}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-black/90" />
              </div>
            )}
            
            {/* Drag Tooltip */}
            {isDragging && (
              <div 
                className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-1 bg-nebula-cyan text-black rounded text-xs font-bold pointer-events-none z-50"
                style={{ left: `${dragProgress}%` }}
              >
                {formatTime((dragProgress / 100) * (videoRef.current?.duration || 0))}
              </div>
            )}

            <div className="absolute inset-x-0 rounded-full bg-white/20" style={{ height: '3px' }}>
              <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${buffered}%` }} />
              <div className="absolute inset-y-0 left-0 bg-white rounded-full transition-all duration-75" style={{ width: `${isDragging ? dragProgress : progress}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full -ml-1.5 shadow-lg group-hover:scale-125 transition-transform"
                style={{ left: `${isDragging ? dragProgress : progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }}
                className="text-white/70 hover:text-white transition-colors p-1"
                title="–10s (J)"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="text-white hover:text-white/80 transition-colors p-1"
                title="Play/Pause (Space)"
              >
                {isPaused ? <Play size={26} fill="currentColor" /> : <Pause size={26} fill="currentColor" />}
              </button>
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10); }}
                className="text-white/70 hover:text-white transition-colors p-1"
                title="+10s (L)"
              >
                <RotateCw size={18} />
              </button>
              {movie.type === 'tv' && (
                <button
                  onClick={handleNextEpisode}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all border border-white/5"
                  title="Next Episode"
                >
                  <span className="hidden sm:inline italic">NEXT</span>
                  <ChevronRight size={16} />
                </button>
              )}
              <div className="flex items-center gap-2 group/vol relative">
                <button 
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setShowMobileVolume(!showMobileVolume);
                    } else {
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div className={`${showMobileVolume ? 'h-32 opacity-100 translate-y-0' : 'h-0 opacity-0 translate-y-4'} transition-all duration-300 overflow-hidden flex flex-col items-center absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-[#111]/90 backdrop-blur-xl p-3 rounded-2xl border border-white/10 z-50 shadow-2xl md:hidden`}>
                  <div className="relative h-24 w-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="absolute bottom-0 inset-x-0 bg-white rounded-full transition-all"
                      style={{ height: `${isMuted ? 0 : volume}%` }}
                    />
                    <input
                      type="range"
                      min={0} max={100}
                      orient="vertical"
                      value={isMuted ? 0 : volume}
                      onChange={e => { setVolume(+e.target.value); setIsMuted(false); }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-slider-vertical"
                    />
                  </div>
                  <span className="text-[10px] text-white/40 mt-2 font-mono">{isMuted ? 0 : volume}%</span>
                </div>

                {/* Desktop Volume Slider */}
                <div className="hidden md:flex w-0 group-hover/vol:w-24 transition-all duration-300 overflow-hidden items-center ml-2">
                  <input
                    type="range"
                    min={0} max={100}
                    value={isMuted ? 0 : volume}
                    onChange={e => { setVolume(+e.target.value); setIsMuted(false); }}
                    className="w-20 accent-white cursor-pointer h-1 rounded-full appearance-none bg-white/20"
                  />
                </div>
              </div>
              <span className="text-white/50 text-[10px] sm:text-xs tabular-nums">
                {currentTime} <span className="text-white/20">/</span> {duration}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 relative">
              {movie.type === 'tv' && (
                <button
                  onClick={() => setShowEpisodeDrawer(true)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full transition-all text-xs font-bold border border-white/10 ${showEpisodeDrawer ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <List size={14} />
                  <span className="hidden sm:inline">EPISODES</span>
                </button>
              )}
              {/* Subtitles Button */}
              <button
                onClick={() => { setShowSubtitles(p => !p); setShowSettings(false); }}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${showSubtitles ? 'bg-white text-black' : 'bg-white/10 text-white/50 hover:text-white'}`}
                title="Subtitles"
              >
                <Subtitles size={16} />
              </button>

              {/* Settings */}
              <button
                onClick={() => { setShowSettings(p => !p); setShowSubtitles(false); }}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${showSettings ? 'bg-white text-black' : 'bg-white/10 text-white/50 hover:text-white'}`}
                title="Settings"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={handleFullscreen}
                className="text-white/50 hover:text-white transition-colors p-1"
                title="Fullscreen (F)"
              >
                <Maximize size={16} />
              </button>

              {/* Subtitles Menu */}
              {showSubtitles && (
                <div className="absolute bottom-12 right-0 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl w-64 max-h-[60vh] overflow-y-auto custom-scrollbar pointer-events-auto flex flex-col gap-1 p-2 animate-in slide-in-from-bottom-2 duration-200">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 flex items-center justify-between">
                    <span>Subtitles</span>
                    {fetchingSubtitles && <Loader2 size={10} className="animate-spin text-nebula-cyan" />}
                  </p>
                  
                  {activeSubtitle !== -1 && !fetchingSubtitles && (
                    <div className="mx-2 mb-2 p-2 bg-white/5 rounded-lg border border-white/5">
                      <p className="text-[9px] text-white/40 uppercase tracking-widest mb-2">Sync Offset</p>
                      <div className="flex items-center justify-between">
                        <button onClick={() => adjustSubtitleDelay(-0.5)} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors">-0.5s</button>
                        <span className="text-[10px] text-nebula-cyan font-mono font-bold">{subtitleOffset > 0 ? '+' : ''}{subtitleOffset.toFixed(1)}s</span>
                        <button onClick={() => adjustSubtitleDelay(0.5)} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors">+0.5s</button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleSubtitleChange(-1)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${activeSubtitle === -1 ? 'text-black bg-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                      Off
                    </button>
                    {subtitles.map((sub, i) => (
                      <button
                        key={i}
                        onClick={() => handleSubtitleChange(i)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center justify-between ${activeSubtitle === i ? 'text-black bg-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      >
                        <span className="truncate pr-2">{sub.languageName}</span>
                        {sub.source && <span className={`text-[8px] px-1 rounded uppercase font-black ${activeSubtitle === i ? 'bg-black/20 text-black/60' : 'bg-white/5 text-white/30'}`}>{sub.source}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showSettings && (
                <div className="absolute bottom-12 right-0 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl w-60 max-h-[60vh] overflow-y-auto custom-scrollbar pointer-events-auto flex flex-col gap-1 p-2 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="mb-2">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1">Speed</p>
                    <div className="grid grid-cols-4 gap-1 px-2">
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
                  {mirrors.length > 1 && (
                    <div className="mb-2">
                      <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 border-t border-white/10">Servers</p>
                      <div className="flex flex-col px-2 gap-0.5">
                        {mirrors.map((m, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setActiveMirror(i);
                              setStreamUrl(m.url);
                            }}
                            className={`w-full text-left px-2 py-2 text-[11px] rounded-md transition-colors flex items-center justify-between ${activeMirror === i ? 'text-white bg-white/10 font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                          >
                            <span className="truncate">{m.source}</span>
                            <span className="text-[9px] opacity-40 shrink-0">{m.quality}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
              className="fixed top-0 right-0 bottom-0 w-full sm:w-80 bg-obsidian border-l border-white/10 z-[300] shadow-2xl flex flex-col pointer-events-auto"
            >
              <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Episode Relay</h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-tighter">Season {season}</p>
                </div>
                <button onClick={() => setShowEpisodeDrawer(false)} className="w-9 h-9 rounded-full bg-white/5 text-white/40 hover:text-white flex items-center justify-center transition-colors">
                  <X size={18} />
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
