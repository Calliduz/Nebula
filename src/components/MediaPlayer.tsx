import React, { useState, useRef, useCallback, useEffect } from "react";
import Hls from "hls.js";
import {
  X,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  VolumeX,
  Volume2,
  Maximize,
  Settings,
  Gauge,
  Loader2,
  Subtitles,
  ChevronLeft,
  ChevronRight,
  List,
  Search,
  Info,
  RefreshCw,
  Tv,
  Upload,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useSubtitleManager } from "../hooks/useSubtitleManager";
import { SubtitleOverlay } from "./SubtitleOverlay";

import { API_BASE_URL } from "../config";
const API = API_BASE_URL;

interface MediaPlayerProps {
  movie: any;
  season?: number;
  episode?: number;
  source?: string;
  onMarkAsWatched: (id: string | number, type: "movie" | "tv") => void;
  onClose: () => void;
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const parseMirrorName = (name: string) => {
  // First try parenthesized format: "Vidnest (1080p)"
  const parenMatch = name.match(
    /^(.*?)\s*\((1080p|720p|480p|360p|Auto|Original)\)$/i,
  );
  if (parenMatch) {
    return { base: parenMatch[1].trim(), quality: parenMatch[2].trim() };
  }

  // Next try hyphen format: "VidRock - 1080p"
  const match = name.match(/^(.*?)\s*-\s*(\d+p|Auto|Original)\s*\)?$/i);
  if (match) {
    let base = match[1].trim();
    if (name.includes("(") && !base.endsWith(")")) {
      base = base + ")";
    }
    return { base, quality: match[2].trim() };
  }
  return { base: name, quality: "Original" };
};

export const parseMirrorDetails = (sourceName: string) => {
  // Extract trailing #\d+ if present
  let suffix = "";
  const suffixMatch = sourceName.match(/(.*?)\s*#(\d+)$/);
  let cleanSource = sourceName;
  if (suffixMatch) {
    cleanSource = suffixMatch[1].trim();
    suffix = ` #${suffixMatch[2]}`;
  }

  // Now parse cleanSource exactly as before
  const match = cleanSource.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return {
      category: match[1].trim(),
      name: (match[2].trim() + suffix).toUpperCase(),
    };
  }

  if (cleanSource.startsWith("VidRock")) {
    return {
      category: "VidRock",
      name: (
        (cleanSource.replace("VidRock", "").trim() || "Mirror") + suffix
      ).toUpperCase(),
    };
  }
  if (cleanSource.startsWith("Videasy")) {
    return {
      category: "Videasy",
      name: (
        (cleanSource.replace("Videasy", "").trim() || "Mirror") + suffix
      ).toUpperCase(),
    };
  }
  if (cleanSource.startsWith("Vidnest")) {
    const rest = cleanSource.replace(/^Vidnest[\s-]*/i, "").trim();
    return {
      category: "Vidnest",
      name: ((rest || "Stream") + suffix).toUpperCase(),
    };
  }
  if (cleanSource.startsWith("FilmU")) {
    return {
      category: "FilmU",
      name: (
        (cleanSource.replace(/^FilmU[\s-]*/i, "").trim() || "Mirror") + suffix
      ).toUpperCase(),
    };
  }

  return { category: "VidLink", name: (cleanSource + suffix).toUpperCase() };
};

export const serverSortOrder = [
  "neon",
  "yoru",
  "cypher",
  "sage",
  "breach",
  "vyse",
  "killjoy",
  "fade",
  "omen",
  "raze",
  "nova",
  "atlas",
  "orion",
];

export const getMirrorPriority = (sourceName: string) => {
  const { category, name } = parseMirrorDetails(sourceName);
  const cleanName = name.toLowerCase();
  const cleanCategory = category.toLowerCase();

  for (let i = 0; i < serverSortOrder.length; i++) {
    const term = serverSortOrder[i];
    if (cleanName.includes(term) || cleanCategory.includes(term)) {
      return i;
    }
  }
  return 999;
};

export const sortMirrorsList = (list: any[]) => {
  return [...list].sort((a, b) => {
    const prioA = getMirrorPriority(a.source);
    const prioB = getMirrorPriority(b.source);
    return prioA - prioB;
  });
};

const groupMirrors = (mirrorsList: any[]) => {
  const groups: Record<string, any> = {};

  mirrorsList.forEach((m) => {
    if (m.type !== "mp4") {
      const groupKey = `${m.source}_${m.audio || ""}`;
      groups[groupKey] = { ...m };
      return;
    }

    const { base, quality } = parseMirrorName(m.source);
    const groupKey = `${base}_${m.audio || ""}`;
    const height = parseInt(quality.replace(/\D/g, ""), 10) || 480;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        source: base,
        url: m.url,
        type: "mp4_grouped",
        audio: m.audio,
        flag: m.flag,
        qualities: [{ height, url: m.url, originalSource: m.source }],
      };
    } else {
      groups[groupKey].qualities.push({
        height,
        url: m.url,
        originalSource: m.source,
      });
    }
  });

  const groupedList = Object.values(groups).map((group: any) => {
    if (group.type === "mp4_grouped") {
      group.qualities.sort((a: any, b: any) => b.height - a.height);
      group.url = group.qualities[0].url;
    }
    return group;
  });

  return sortMirrorsList(groupedList);
};

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  movie,
  season: propSeason,
  episode: propEpisode,
  source,
  onMarkAsWatched,
  onClose,
}) => {
  const season =
    propSeason !== undefined ? propSeason : movie.type === "tv" ? 1 : undefined;
  const episode =
    propEpisode !== undefined
      ? propEpisode
      : movie.type === "tv"
        ? 1
        : undefined;
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const {
    prefs,
    updatePreference,
    selectPreset,
    activeCues,
    updateActiveCues,
    cleanupSubtitleState,
    preferredLanguageISO,
    setPreferredLanguageISO,
  } = useSubtitleManager(streamUrl);

  const [showStyleCustomizer, setShowStyleCustomizer] = useState(false);
  const [isEmbed, setIsEmbed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const errorRef = useRef("");
  useEffect(() => {
    errorRef.current = error;
  }, [error]);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showServerTip, setShowServerTip] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [streamReloadKey, setStreamReloadKey] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [buffered, setBuffered] = useState(0);
  const [qualities, setQualities] = useState<
    { height: number; levelId: number }[]
  >([]);
  const [activeQuality, setActiveQuality] = useState<number>(-1); // -1 = Auto
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1); // -1 = Off
  const [subtitleOffset, setSubtitleOffset] = useState<number>(0);
  const [fetchingSubtitles, setFetchingSubtitles] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [tvDetails, setTvDetails] = useState<any>(null);
  // Source selection triggered from Next/episode drawer
  const [sourceSelect, setSourceSelect] = useState<{
    season: number;
    episode: number;
  } | null>(null);
  const [forceRefetchTrigger, setForceRefetchTrigger] = useState(0);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [qualityTag, setQualityTag] = useState<string>(""); // CAM | WEBDL | WEBRIP | BLURAY | etc.
  const [resolution, setResolution] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "info";
  } | null>(null);
  const [failedMirrors, setFailedMirrors] = useState<Record<number, string>>(
    {},
  );

  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    visible: boolean;
    type: "rewind" | "forward";
    x: number;
    y: number;
    key: number;
  } | null>(null);

  useEffect(() => {
    if (doubleTapFeedback && doubleTapFeedback.visible) {
      const timer = setTimeout(() => {
        setDoubleTapFeedback((p) => (p ? { ...p, visible: false } : null));
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [doubleTapFeedback?.key]);

  const showToast = useCallback(
    (message: string, type: "error" | "info" = "info") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );
  const [mirrors, setMirrors] = useState<any[]>([]);
  const [activeMirror, setActiveMirror] = useState<number>(0);
  const selectMirror = useCallback((index: number, mirrorsList: any[]) => {
    const m = mirrorsList[index];
    if (!m) return;
    setActiveMirror(index);
    activeMirrorRef.current = index;
    setFailedMirrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setStreamUrl(m.url);
    setIsEmbed(m.type === "embed");

    if (m.type === "mp4_grouped" && m.qualities) {
      setQualities(
        m.qualities.map((q: any, qIdx: number) => ({
          height: q.height,
          levelId: qIdx,
          url: q.url,
        })),
      );
      setActiveQuality(-1);
      setCurrentHeight(m.qualities[0].height);
    } else {
      setQualities([]);
      setActiveQuality(-1);
    }
  }, []);
  const [vttBlobUrl, setVttBlobUrl] = useState<string | null>(null);
  const vttBlobUrlRef = useRef<string | null>(null);
  useEffect(() => {
    vttBlobUrlRef.current = vttBlobUrl;
  }, [vttBlobUrl]);

  useEffect(() => {
    return () => {
      if (vttBlobUrlRef.current) {
        URL.revokeObjectURL(vttBlobUrlRef.current);
      }
    };
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showMobileVolume, setShowMobileVolume] = useState(false);
  const hasAutoSelectedSub = useRef(false);
  const hasLoggedHistory = useRef(false);
  const subTextCache = useRef<Record<string, string>>({}); // Cache for raw VTT text
  const uploadSubtitleInputRef = useRef<HTMLInputElement>(null);
  // Track custom-uploaded subtitle blob URLs so we can revoke them on unmount
  const customSubBlobUrls = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      customSubBlobUrls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);
  const navigate = useNavigate();

  const hasPrefetchedNextEpisode = useRef(false);
  const nextEpisodeDetailsRef = useRef<any>(null);
  useEffect(() => {
    nextEpisodeDetailsRef.current = getNextEpisodeDetails();
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  // Refs to track latest mirror state for use inside HLS error closures
  const mirrorsRef = useRef<any[]>([]);
  const activeMirrorRef = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef(false);

  const hasReportedSuccess = useRef(false);
  const frag0LoadRetries = useRef(0);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverTipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeFragLoads = useRef(0);
  const lastFragLoadedTime = useRef(0);

  const showBufferingWithDelay = useCallback((delay = 600) => {
    if (bufferingTimeoutRef.current) return;
    bufferingTimeoutRef.current = setTimeout(() => {
      setIsBuffering(true);
      bufferingTimeoutRef.current = null;

      if (serverTipTimeoutRef.current)
        clearTimeout(serverTipTimeoutRef.current);
      serverTipTimeoutRef.current = setTimeout(() => {
        setShowServerTip(true);
      }, 10000);
    }, delay);
  }, []);

  const clearBuffering = useCallback(() => {
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }
    if (serverTipTimeoutRef.current) {
      clearTimeout(serverTipTimeoutRef.current);
      serverTipTimeoutRef.current = null;
    }
    setIsBuffering(false);
    setShowServerTip(false);
  }, []);

  useEffect(() => {
    return () => {
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
      if (serverTipTimeoutRef.current) {
        clearTimeout(serverTipTimeoutRef.current);
      }
    };
  }, []);

  const lastTouchRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    hasReportedSuccess.current = false;
  }, [movie.id, season, episode]);

  useEffect(() => {
    frag0LoadRetries.current = 0;
  }, [streamUrl]);

  // ── Auto Fullscreen & Landscape ───────────────────────────────────────────
  useEffect(() => {
    const handleAutoFullscreen = async () => {
      // Only trigger auto-fullscreen/orientation for mobile devices
      const isMobile =
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
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
        if (
          window.screen &&
          window.screen.orientation &&
          (window.screen.orientation as any).lock
        ) {
          await (window.screen.orientation as any)
            .lock("landscape")
            .catch((e: any) => {
              console.warn("Orientation lock failed:", e);
            });
        }
      } catch (err) {
        console.warn("Auto-fullscreen/orientation failed:", err);
      }
    };

    // Delay slightly to ensure component is fully mounted and animation is settled
    const timer = setTimeout(handleAutoFullscreen, 300);

    return () => {
      clearTimeout(timer);
      // Unlock orientation when player closes
      if (
        window.screen &&
        window.screen.orientation &&
        (window.screen.orientation as any).unlock
      ) {
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
    setError("");
    setStreamUrl(null);
    setIsEmbed(false);
    setMirrors([]);
    setActiveMirror(0);
    mirrorsRef.current = [];
    activeMirrorRef.current = 0;
    setFailedMirrors({});
    setSubtitles([]);
    setActiveSubtitle(-1);
    hasAutoSelectedSub.current = false;
    subTextCache.current = {}; // Clear subtitle text cache on stream change
    if (vttBlobUrl) {
      URL.revokeObjectURL(vttBlobUrl);
      setVttBlobUrl(null);
    }

    if (source) {
      const candidateUrls = source.split("|");
      const processedMirrors = candidateUrls
        .map((urlWithHash, idx) => {
          const parts = urlWithHash.split("#");
          const rawUrl = parts[0]?.trim();
          const hashName = parts[1]?.trim();
          const hashType = parts[2]?.trim();
          const hashAudio = parts[3]?.trim();

          if (!rawUrl) {
            return null;
          }

          const isEmb =
            rawUrl.includes("embed") ||
            rawUrl.includes("iframe") ||
            hashType === "embed";
          const isMp4 = hashType === "mp4" || rawUrl.includes(".mp4");
          const name =
            hashName ||
            (isEmb
              ? `Embed Mirror ${idx + 1}`
              : isMp4
                ? `MP4 Mirror ${idx + 1}`
                : `HLS Mirror ${idx + 1}`);
          const proxiedUrl = isEmb
            ? rawUrl
            : isMp4
              ? `${API}/api/proxy/segment?url=${encodeURIComponent(rawUrl)}`
              : `${API}/api/proxy/stream?url=${encodeURIComponent(rawUrl)}`;
          return {
            source: name,
            url: proxiedUrl,
            type: isEmb ? "embed" : isMp4 ? "mp4" : "hls",
            audio: hashAudio || "",
          };
        })
        .filter(
          (
            mirror,
          ): mirror is {
            source: string;
            url: string;
            type: "embed" | "hls" | "mp4";
            audio?: string;
          } => mirror !== null,
        );

      if (processedMirrors.length > 0) {
        const grouped = groupMirrors(processedMirrors);
        setMirrors(grouped);
        mirrorsRef.current = grouped;
        selectMirror(0, grouped);
        setLoading(false);

        // Fetch updated mirrors in the background progressively at 10s, 20s, and 45s to capture slow parallel scrapes
        const runSync = () => {
          const isVideasy = processedMirrors.some((m) =>
            m.source.toLowerCase().startsWith("videasy"),
          );
          const isVidrock = processedMirrors.some((m) =>
            m.source.toLowerCase().startsWith("vidrock"),
          );
          const isFilmu = processedMirrors.some((m) =>
            m.source.toLowerCase().startsWith("filmu"),
          );
          const isVidnest = processedMirrors.some((m) =>
            m.source.toLowerCase().startsWith("vidnest"),
          );

          let fetchUrl = "";
          if (isVideasy) {
            fetchUrl = `${API}/api/videasy?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}`;
            if (season !== undefined) fetchUrl += `&season=${season}`;
            if (episode !== undefined) fetchUrl += `&episode=${episode}`;
          } else if (isVidrock) {
            fetchUrl = `${API}/api/vidrock?tmdbId=${movie.id}&type=${movie.type}`;
            if (season !== undefined) fetchUrl += `&season=${season}`;
            if (episode !== undefined) fetchUrl += `&episode=${episode}`;
          } else if (isFilmu) {
            fetchUrl = `${API}/api/filmu?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}`;
            if (season !== undefined) fetchUrl += `&season=${season}`;
            if (episode !== undefined) fetchUrl += `&episode=${episode}`;
          } else if (isVidnest) {
            fetchUrl = `${API}/api/vidnest?tmdbId=${movie.id}&type=${movie.type}`;
            if (season !== undefined) fetchUrl += `&season=${season}`;
            if (episode !== undefined) fetchUrl += `&episode=${episode}`;
          }

          if (fetchUrl && !cancelled) {
            fetch(fetchUrl)
              .then((r) => r.json())
              .then((data) => {
                if (cancelled) return;

                // Format the updated sources
                let updatedMirrors: any[] = [];
                if (isVideasy) {
                  updatedMirrors = Object.entries(data)
                    .filter(([_, v]: any) => v && v.url)
                    .map(([name, v]: any) => ({
                      source: name.toLowerCase().startsWith("videasy")
                        ? name
                        : `Videasy (${name})`,
                      url: v.url,
                      type: v.type || "hls",
                      audio: v.audio || "",
                      flag: v.flag || "us",
                    }));
                } else if (isVidrock) {
                  updatedMirrors = Object.entries(data)
                    .filter(([_, v]: any) => v && v.url)
                    .map(([name, v]: any) => ({
                      source: name.toLowerCase().startsWith("vidrock")
                        ? name
                        : `VidRock (${name})`,
                      url: v.url,
                      type: v.type || "hls",
                      audio: v.audio || "",
                      flag: v.flag || "us",
                    }));
                } else if (isFilmu) {
                  updatedMirrors = Object.entries(data)
                    .filter(([_, v]: any) => v && v.url)
                    .map(([name, v]: any) => ({
                      source: name.toLowerCase().startsWith("filmu")
                        ? name
                        : `FilmU-${name}`,
                      url: v.url,
                      type: v.type || "hls",
                      quality: (v as any).quality || "Auto",
                    }));
                } else if (isVidnest) {
                  updatedMirrors = Object.entries(data)
                    .filter(([_, v]: any) => v && v.url)
                    .map(([name, v]: any) => ({
                      source: name.toLowerCase().startsWith("vidnest")
                        ? name
                        : `Vidnest (${name})`,
                      url: v.url,
                      type: v.type || "mp4",
                      quality: (v as any).quality || "Auto",
                    }));
                }

                if (updatedMirrors.length > 0) {
                  const processed = updatedMirrors.map((m: any) => {
                    if (m.type === "embed") return m;
                    const isMp4 = m.type === "mp4" || m.url.includes(".mp4");
                    const proxyEndpoint = isMp4
                      ? "/api/proxy/segment"
                      : "/api/proxy/stream";
                    const proxiedUrl = `${API}${proxyEndpoint}?url=${encodeURIComponent(m.url)}`;
                    return { ...m, url: proxiedUrl };
                  });

                  const newGrouped = groupMirrors(processed);

                  // Merge preserving active index mapping
                  const currentActive =
                    mirrorsRef.current[activeMirrorRef.current];
                  if (errorRef.current && newGrouped.length > 0) {
                    console.log(
                      "[PLAYER] Recovering from error: clearing error and selecting first discovered mirror.",
                    );
                    setError("");
                    setMirrors(newGrouped);
                    mirrorsRef.current = newGrouped;
                    setStreamUrl(null);
                    setTimeout(() => {
                      selectMirror(0, newGrouped);
                    }, 50);
                  } else if (currentActive) {
                    const newIdx = newGrouped.findIndex(
                      (m: any) => m.source === currentActive.source,
                    );
                    setMirrors(newGrouped);
                    mirrorsRef.current = newGrouped;
                    if (newIdx !== -1) {
                      setActiveMirror(newIdx);
                      activeMirrorRef.current = newIdx;
                    }
                  } else {
                    setMirrors(newGrouped);
                    mirrorsRef.current = newGrouped;
                  }
                }
              })
              .catch((err) =>
                console.warn("[PLAYER] Background mirrors update failed:", err),
              );
          }
        };

        const syncIntervals = [10000, 20000, 45000];
        const timers = syncIntervals.map((delay) => setTimeout(runSync, delay));

        return () => {
          timers.forEach(clearTimeout);
        };
      }
    }

    let url = `${API}/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}&releaseDate=${movie.release_date || ""}`;
    if (movie.origin) url += `&origin=${movie.origin}`;
    if (season !== undefined) url += `&season=${season}`;
    if (episode !== undefined) url += `&episode=${episode}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.mirrors && data.mirrors.length > 0) {
          const processedMirrors = data.mirrors.map((m: any) => {
            if (m.type === "embed") return m;
            const isMp4 = m.type === "mp4" || m.url.includes(".mp4");
            const proxyEndpoint = isMp4
              ? "/api/proxy/segment"
              : "/api/proxy/stream";
            const proxiedUrl = `${API}${proxyEndpoint}?url=${encodeURIComponent(m.url)}`;
            return { ...m, url: proxiedUrl };
          });
          const grouped = groupMirrors(processedMirrors);
          setMirrors(grouped);
          mirrorsRef.current = grouped;
          selectMirror(0, grouped);

          if (data.qualityTag) setQualityTag(data.qualityTag);
          if (data.resolution) setResolution(data.resolution);
          if (data.subtitles) {
            setSubtitles(processSubtitles(data.subtitles, []));
          }
        } else if (data.streamUrl) {
          const isEmb = data.type === "embed";
          const isMp4 = data.type === "mp4" || data.streamUrl.includes(".mp4");
          const proxyEndpoint = isMp4
            ? "/api/proxy/segment"
            : "/api/proxy/stream";
          setStreamUrl(
            isEmb
              ? data.streamUrl
              : `${API}${proxyEndpoint}?url=${encodeURIComponent(data.streamUrl)}`,
          );
          setIsEmbed(isEmb);
          if (data.qualityTag) setQualityTag(data.qualityTag);
          if (data.resolution) setResolution(data.resolution);
          if (data.subtitles) {
            setSubtitles(processSubtitles(data.subtitles, []));
          }
        } else {
          setError(data.error || "No stream found.");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          showToast(`Stream Error: ${e.message}`, "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      // Tell backend to stop the heartbeat ping loop
      let stopUrl = `${API}/api/stream/stop?tmdbId=${movie.id}`;
      fetch(stopUrl, {
        keepalive: true,
      }).catch(() => {});
    };
  }, [movie.id, season, episode, source, streamReloadKey]);

  // ── Subtitle fetch (auto + manual refetch) ───────────────────────────────
  const refetchSubtitles = useCallback(
    async (force = false) => {
      setFetchingSubtitles(true);
      try {
        let url = `${API}/api/subtitles?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}`;
        if (movie.origin) url += `&origin=${movie.origin}`;
        if (season !== undefined) url += `&season=${season}`;
        if (episode !== undefined) url += `&episode=${episode}`;
        if (force) url += `&force=1`;

        const r = await fetch(url);
        const data = await r.json();

        const vrSubUrl =
          movie.type === "tv"
            ? `https://cache.vdrk.site/v2/tv/${movie.id}/${season}/${episode}/English.vtt`
            : `https://cache.vdrk.site/v2/movie/${movie.id}/English.vtt`;

        const fetchedSubs = Array.isArray(data.subtitles)
          ? [...data.subtitles]
          : [];

        try {
          const vrSubResponse = await fetch(vrSubUrl, { method: "HEAD" });
          if (vrSubResponse.ok) {
            fetchedSubs.push({
              url: vrSubUrl,
              lang: "en",
              languageName: "English (VidRock Cache)",
              source: "VidRock",
            });
          }
        } catch (e) {
          console.warn("VidRock cache subtitle probe failed:", e);
        }

        if (fetchedSubs.length === 0 && !force) {
          showToast("No external subtitles found", "info");
        } else if (force) {
          showToast(
            fetchedSubs.length > 0
              ? `Refetched ${fetchedSubs.length} subtitle track${fetchedSubs.length > 1 ? "s" : ""}`
              : "No subtitles found from any source",
            fetchedSubs.length > 0 ? "success" : "info",
          );
        }

        // Preserve custom-uploaded subs when refetching
        setSubtitles((prev) => {
          const customSubs = prev.filter((s) => s.source === "Custom");
          return processSubtitles(fetchedSubs, customSubs);
        });
      } catch (e) {
        console.error("Subtitle fetch error:", e);
        showToast("Subtitle search failed", "error");
      } finally {
        setFetchingSubtitles(false);
      }
    },
    [API, movie.id, movie.type, movie.origin, movie.title, season, episode],
  );

  // Centralized subtitle cleanup on stream URL change
  useEffect(() => {
    cleanupSubtitleState(videoRef.current);
    if (vttBlobUrl) {
      URL.revokeObjectURL(vttBlobUrl);
    }
    setVttBlobUrl(null);
    setActiveSubtitle(-1);
    hasAutoSelectedSub.current = false;
  }, [streamUrl, cleanupSubtitleState]);

  // Auto-fetch on stream load
  useEffect(() => {
    if (!streamUrl) return;
    refetchSubtitles(false);
  }, [streamUrl, movie.id, movie.type, season, episode]);

  const handleSubtitleChange = (index: number) => {
    setActiveSubtitle(index);
    setSubtitleOffset(0);
    if (index === -1) {
      hasAutoSelectedSub.current = true; // User manually turned off
      setPreferredLanguageISO(null);
    } else {
      const sub = subtitles[index];
      if (sub && sub.lang) {
        setPreferredLanguageISO(sub.lang);
      }
    }
  };

  const adjustSubtitleDelay = (delta: number) => {
    if (activeSubtitle === -1) return;
    setSubtitleOffset((prev) => prev + delta);
  };

  // ── VTT Timestamp Shifter & SRT Converter ──
  const shiftVttTimestamps = (text: string, offsetMs: number) => {
    let content = text.trim();

    // 1. Convert SRT to VTT structure if needed
    if (!content.startsWith("WEBVTT")) {
      // Replace SRT comma timestamps with VTT dot timestamps
      content = content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
      // Remove SRT cue index numbers (standalone digit lines before timestamps)
      content = content.replace(/^\d+\n(?=\d{2}:\d{2}:\d{2})/gm, "");
      content = "WEBVTT\n\n" + content;
    }

    if (offsetMs === 0) return content;

    // More flexible regex: HH:MM:SS.mmm or MM:SS.mmm
    const timestampRegex = /(\d{1,2}:)?\d{1,2}:\d{1,2}[\.,]\d{1,3}/g;

    return content.replace(timestampRegex, (match) => {
      const [time, msPart] = match.split(/[\.,]/);
      const timeParts = time.split(":");
      let h = 0,
        m = 0,
        s = 0;

      if (timeParts.length === 3) {
        h = parseInt(timeParts[0]);
        m = parseInt(timeParts[1]);
        s = parseInt(timeParts[2]);
      } else {
        m = parseInt(timeParts[0]);
        s = parseInt(timeParts[1]);
      }

      // Normalize ms to 3 digits
      const ms = parseInt(msPart.padEnd(3, "0").substring(0, 3));

      let totalMs = h * 3600000 + m * 60000 + s * 1000 + ms + offsetMs * 1000;
      if (totalMs < 0) totalMs = 0;

      const newH = Math.floor(totalMs / 3600000);
      totalMs %= 3600000;
      const newM = Math.floor(totalMs / 60000);
      totalMs %= 60000;
      const newS = Math.floor(totalMs / 1000);
      const newMs = totalMs % 1000;

      return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}:${newS.toString().padStart(2, "0")}.${newMs.toString().padStart(3, "0")}`;
    });
  };

  const activeSubUrl = subtitles[activeSubtitle]?.url;

  // ── Production-Grade Sync Effect (Blob Based) ──
  useEffect(() => {
    if (activeSubtitle === -1 || !activeSubUrl) {
      if (vttBlobUrl) URL.revokeObjectURL(vttBlobUrl);
      setVttBlobUrl(null);
      return;
    }

    let cancelled = false;

    const processSub = async () => {
      try {
        let text = subTextCache.current[activeSubUrl];

        if (!text) {
          const r = await fetch(activeSubUrl);
          if (!r.ok) {
            showToast(`Failed to load subtitle: HTTP ${r.status}`, "error");
            setSubtitles((prev) =>
              prev.map((s, idx) =>
                idx === activeSubtitle ? { ...s, failed: true } : s,
              ),
            );
            return;
          }
          text = await r.text();
          if (cancelled) return;

          // Check if response contains proxy error messages
          if (
            text.includes("domain not allowed") ||
            text.includes("Subtitle proxy failed") ||
            text.includes("Domain not allowed")
          ) {
            showToast(
              "Failed to load subtitle: source blocked or not allowed",
              "error",
            );
            setSubtitles((prev) =>
              prev.map((s, idx) =>
                idx === activeSubtitle ? { ...s, failed: true } : s,
              ),
            );
            return;
          }

          // Store in cache for next time
          subTextCache.current[activeSubUrl] = text;
        }

        setSubtitles((prev) =>
          prev.map((s, idx) =>
            idx === activeSubtitle && s.failed ? { ...s, failed: false } : s,
          ),
        );

        const shiftedText = shiftVttTimestamps(text, subtitleOffset);
        const blob = new Blob([shiftedText], { type: "text/vtt" });
        const newUrl = URL.createObjectURL(blob);

        setVttBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return newUrl;
        });
      } catch (e) {
        console.error("VTT processing failed", e);
        showToast("Failed to load subtitle track", "error");
        setSubtitles((prev) =>
          prev.map((s, idx) =>
            idx === activeSubtitle ? { ...s, failed: true } : s,
          ),
        );
      }
    };

    processSub();
    return () => {
      cancelled = true;
    };
  }, [activeSubtitle, activeSubUrl, subtitleOffset]);

  // ── Auto-select first subtitle or restore preferred language ──────────────
  useEffect(() => {
    if (subtitles.length > 0) {
      // If we already have a valid manual or automatic selection, don't override it
      if (activeSubtitle !== -1 && subtitles[activeSubtitle]) {
        return;
      }

      if (preferredLanguageISO) {
        const matchIdx = subtitles.findIndex(
          (s) => s.lang === preferredLanguageISO,
        );
        if (matchIdx !== -1) {
          setActiveSubtitle(matchIdx);
          return;
        }
      }
      if (activeSubtitle === -1 && !hasAutoSelectedSub.current) {
        setActiveSubtitle(0);
        hasAutoSelectedSub.current = true;
      }
    }
  }, [subtitles, preferredLanguageISO, activeSubtitle]);

  const getProgressKey = useCallback(() => {
    if (movie.type === "tv" && season !== undefined && episode !== undefined) {
      return `${movie.id}-S${season}E${episode}`;
    }
    return movie.id;
  }, [movie.id, movie.type, season, episode]);

  const processSubtitles = useCallback(
    (newSubs: any[], existingSubs: any[]) => {
      const combined = [...existingSubs];
      newSubs.forEach((ns) => {
        const normalizedUrl = ns.url.startsWith("/")
          ? `${API}${ns.url}`
          : ns.url.includes("/api/proxy/subtitle")
            ? ns.url
            : `${API}/api/proxy/subtitle?url=${encodeURIComponent(ns.url)}`;
        if (!combined.some((ps) => ps.url === normalizedUrl)) {
          combined.push({ ...ns, url: normalizedUrl });
        }
      });

      const englishSubs: any[] = [];
      const otherLangSubs: any[] = [];

      // Group subtitles by language priority
      combined.forEach((s) => {
        const isEnglish =
          (s.lang || "").startsWith("en") ||
          s.languageName?.toLowerCase().includes("english");
        if (isEnglish) englishSubs.push(s);
        else otherLangSubs.push(s);
      });

      const processGroup = (group: any[]) => {
        // Priority sources get labeled cleanly; others get a count + source badge
        const prioritySources = [
          "VidVault",
          "VidLink",
          "Videasy",
          "VidRock",
          "Custom",
        ];
        const priority = group.filter((s) =>
          prioritySources.includes(s.source),
        );
        const external = group.filter(
          (s) => !prioritySources.includes(s.source),
        );

        const processed: any[] = [];
        const srcCount: Record<string, Record<string, number>> = {};
        const extCount: Record<string, number> = {};

        priority.forEach((s) => {
          const lang = s.lang || "unk";
          const src = s.source || "Unknown";
          if (!srcCount[src]) srcCount[src] = {};
          srcCount[src][lang] = (srcCount[src][lang] || 0) + 1;
          const n = srcCount[src][lang];
          const suffix = n > 1 ? ` #${n}` : "";

          let name: string;
          if (s.source === "Custom") {
            name = s.languageName || "Custom (Uploaded)";
          } else {
            const srcLabel =
              s.source === "VidLink"
                ? "VidLink"
                : s.source === "VidVault"
                  ? "VidVault"
                  : s.source === "Videasy"
                    ? "Videasy"
                    : s.source === "VidRock"
                      ? "VidRock Cache"
                      : s.source;
            const base =
              lang.startsWith("en") ||
              s.languageName?.toLowerCase().includes("english")
                ? "English"
                : s.languageName || lang.toUpperCase();
            name = `${base} (${srcLabel})${suffix}`;
          }
          processed.push({ ...s, languageName: name });
        });

        external.forEach((s) => {
          const lang = s.lang || "unk";
          const count = extCount[lang] || 0;
          if (count < 3) {
            extCount[lang] = count + 1;
            const sourceSuffix =
              s.source === "OpenSubtitles" ? " (OpenSubtitles)" : "";
            const name = `${s.languageName} #${extCount[lang]} (External)${sourceSuffix}`;
            processed.push({ ...s, languageName: name });
          }
        });

        return processed;
      };

      return [...processGroup(englishSubs), ...processGroup(otherLangSubs)];
    },
    [API],
  );

  // ── Fetch TV Details ──────────────────────────────────────────────────────
  useEffect(() => {
    if (movie.type !== "tv") return;
    const controller = new AbortController();
    fetch(`${API}/api/tv-details/${movie.id}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setTvDetails(data))
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });
    return () => controller.abort();
  }, [movie.id]);

  // ── HLS setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!streamUrl || !videoRef.current || isEmbed) return;

    const video = videoRef.current;
    setIsBuffering(true);

    const currentMirrorType = mirrorsRef.current[activeMirrorRef.current]?.type;

    if (currentMirrorType === "mp4" || currentMirrorType === "mp4_grouped") {
      video.src = streamUrl;
      video.play().catch((err) => {
        console.warn("[PLAYER] play() failed or was interrupted:", err);
        setIsPaused(true);
        showToast("Playback failed to start.", "error");
      });
      return () => {
        video.src = "";
      };
    }

    setCurrentHeight(null);
    setQualities([]);

    if (Hls.isSupported()) {
      const hls = new Hls({
        // ── Buffer ──────────────────────────────────────────────────────────
        // Netflix-style: large forward buffer so paused sessions don't rebuffer.
        // maxBufferLength: how much hls.js tries to keep ahead during play.
        // maxMaxBufferLength: absolute ceiling — allows filling up to 5 min
        //   ahead when the player is paused (CDN permitting).
        maxBufferLength: 60,
        maxMaxBufferLength: 300,
        backBufferLength: 30, // Keep 30s behind for seek-back

        // ── Fragment loading ─────────────────────────────────────────────
        fragLoadingMaxRetry: 6, // 6 retries (was 20 — bloated retry storm)
        fragLoadingRetryDelay: 1000, // 1s base delay before each retry
        fragLoadingMaxRetryTimeout: 16000,
        manifestLoadingMaxRetry: 5,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 5,
        levelLoadingRetryDelay: 1000,

        // ── ABR (Adaptive Bitrate) ───────────────────────────────────────
        // Fix 3: Start at 5 Mbps instead of 8 — lets ABR auto-detect the
        // actual CDN throughput and avoid immediately locking to 1080p on
        // a slow CDN edge, which causes the first-segment buffering stall.
        // abrBandWidthFactor: use only 80% of measured bandwidth for ABR
        // decisions — conservative margin prevents over-shooting quality.
        abrEwmaDefaultEstimate: 5_000_000,
        abrBandWidthFactor: 0.8,
        abrBandWidthUpFactor: 0.7,
        capLevelToPlayerSize: true, // Never load quality higher than display size

        // ── Sync / Stall recovery ────────────────────────────────────────
        maxBufferHole: 0.3,
        maxFragLookUpTolerance: 0.2,
        nudgeOffset: 0.3,
        nudgeMaxRetry: 8,
        highBufferWatchdogPeriod: 2,

        // ── Performance ─────────────────────────────────────────────────
        enableWorker: true,
        // Fix 2: lowLatencyMode is designed for LIVE streams — it reduces
        // buffer targets and changes ABR to optimise for latency over quality.
        // For VOD movies this is actively harmful; disable it.
        lowLatencyMode: false,
        startFragPrefetch: true,
        enableSoftwareAES: true,

        // ── XHR setup: route ALL HLS fragment requests through our proxy ─
        // This ensures every .ts segment request uses our keepAlive agent
        // with proper CDN headers. Without this, hls.js can fall back to
        // direct CDN requests that get rate-limited or geo-blocked.
        xhrSetup: (xhr, url) => {
          // Already proxied (manifest rewriter added /api/proxy/segment)
          if (
            url.includes("/api/proxy/segment") ||
            url.includes("/api/proxy/stream")
          )
            return;

          const shouldProxy =
            /\.ts(\?|$)/i.test(url) ||
            /\.m4s(\?|$)/i.test(url) ||
            /\.m4a(\?|$)/i.test(url) ||
            /\.mp3(\?|$)/i.test(url) ||
            /\.mp4(\?|$)/i.test(url) ||
            /\.aac(\?|$)/i.test(url) ||
            /(\/seg-|\/segments?\/|\/fragments?\/|index-)/i.test(url) ||
            (!url.startsWith(API) &&
              !url.startsWith("/") &&
              !url.includes("localhost") &&
              !url.includes("127.0.0.1"));

          if (shouldProxy) {
            xhr.open(
              "GET",
              `${API}/api/proxy/segment?url=${encodeURIComponent(url)}`,
              true,
            );
          }
        },
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.FRAG_LOADING, () => {
        activeFragLoads.current++;
      });

      hls.on(Hls.Events.MANIFEST_LOADED, (_, data) => {
        if (!data.levels || data.levels.length === 0) {
          console.warn(
            "[HLS] Loaded manifest has 0 levels. Empty or invalid HLS manifest.",
          );
          const nextIdx = activeMirrorRef.current + 1;
          if (nextIdx < mirrorsRef.current.length) {
            console.log(
              `[HLS] Switching to next mirror index ${nextIdx} due to empty manifest.`,
            );
            selectMirror(nextIdx, mirrorsRef.current);
          } else {
            setError("Empty manifest. All mirrors exhausted.");
          }
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualities(
          data.levels
            .map((l, i) => ({ height: l.height, levelId: i }))
            .reverse(),
        );
        video.volume = isMuted ? 0 : volume / 100;
        video.play().catch((err) => {
          console.warn("[PLAYER] play() failed or was interrupted:", err);
          setIsPaused(true);
          showToast("Playback failed to start.", "error");
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) {
          console.log(
            `[HLS] Quality switched to ${level.height}p (level ${data.level})`,
          );
          setCurrentHeight(level.height);
        }
      });

      // Reset retry counters on successful fragment load
      let networkRetries = 0;
      const MAX_NETWORK_RETRIES = 4;
      let mediaRecoveryAttempt = 0;
      let fragErrorTimeout: NodeJS.Timeout | null = null;
      let lastFragErrorStatus: string | null = null;

      hls.on(Hls.Events.ERROR, (_, d) => {
        const statusCode =
          (d.response as any)?.code ||
          (d.response as any)?.status ||
          (d.context as any)?.xhr?.status ||
          (d.networkDetails as any)?.status ||
          (d.event as any)?.target?.status;

        console.warn("[HLS ERROR EVENT]", {
          type: d.type,
          details: d.details,
          fatal: d.fatal,
          statusCode,
          url: (d.context as any)?.url || d.frag?.url || "",
        });

        // If it's a network error with a hard status code >= 400 (e.g. 403, 404, 405, 500, 502, 503, 504),
        // fallback to the next mirror immediately instead of letting Hls.js retry/stall.
        if (
          d.type === Hls.ErrorTypes.NETWORK_ERROR &&
          statusCode &&
          statusCode >= 400
        ) {
          console.warn(
            `[HLS] Hard network error ${statusCode} on ${d.details}. Switching mirror immediately...`,
          );
          const nextIdx = activeMirrorRef.current + 1;
          if (nextIdx < mirrorsRef.current.length) {
            const failingIdx = activeMirrorRef.current;
            setFailedMirrors((prev) => ({
              ...prev,
              [failingIdx]: String(statusCode),
            }));
            console.log(
              `[HLS] Switching to mirror ${nextIdx}: ${mirrorsRef.current[nextIdx].source}`,
            );
            selectMirror(nextIdx, mirrorsRef.current);
          } else {
            setError(`Stream failed (${statusCode}). All mirrors exhausted.`);
          }
          return;
        }

        // Switch immediately on fatal manifest load error or fatal level load error to avoid slow retry storms
        if (
          d.type === Hls.ErrorTypes.NETWORK_ERROR &&
          (d.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
            d.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR)
        ) {
          console.warn(
            `[HLS] Fatal load error: ${d.details}. Switching mirror immediately...`,
          );
          const nextIdx = activeMirrorRef.current + 1;
          if (nextIdx < mirrorsRef.current.length) {
            const failingIdx = activeMirrorRef.current;
            setFailedMirrors((prev) => ({
              ...prev,
              [failingIdx]: statusCode ? String(statusCode) : "LOAD_ERR",
            }));
            selectMirror(nextIdx, mirrorsRef.current);
          } else {
            setError("Stream loading failed. All mirrors exhausted.");
          }
          return;
        }

        // Track continuous fragment load errors to trigger fallback
        if (d.details === "fragLoadError") {
          activeFragLoads.current = Math.max(0, activeFragLoads.current - 1);
          if (statusCode) {
            lastFragErrorStatus = String(statusCode);
          }
          if (!fragErrorTimeout) {
            console.warn(
              "[HLS] Fragment load error detected. Starting 5s mirror fallback timer...",
            );
            fragErrorTimeout = setTimeout(() => {
              console.error(
                "[HLS] Continuous fragment load errors for 5 seconds. Switching to next mirror...",
              );
              const nextIdx = activeMirrorRef.current + 1;
              if (nextIdx < mirrorsRef.current.length) {
                const failingIdx = activeMirrorRef.current;
                setFailedMirrors((prev) => ({
                  ...prev,
                  [failingIdx]: lastFragErrorStatus || "502/404",
                }));
                selectMirror(nextIdx, mirrorsRef.current);
              } else {
                setError(
                  "Continuous segment loading failures. All mirrors exhausted.",
                );
              }
              fragErrorTimeout = null;
            }, 5000);
          }
        }

        // Frag 0 loading failure retry & fallback
        if (
          d.details === "fragLoadError" &&
          (video.duration === 0 || isNaN(video.duration))
        ) {
          console.warn(
            `[HLS] Fragment 0 load error. Retry count: ${frag0LoadRetries.current}`,
          );
          if (frag0LoadRetries.current < 3) {
            frag0LoadRetries.current++;
            hls.startLoad();
          } else {
            console.error(
              "[HLS] Fragment 0 load failed 3 times. Escalating to fatal mirror switch.",
            );
            const nextIdx = activeMirrorRef.current + 1;
            if (nextIdx < mirrorsRef.current.length) {
              const failingIdx = activeMirrorRef.current;
              setFailedMirrors((prev) => ({
                ...prev,
                [failingIdx]: "TIMEOUT",
              }));
              selectMirror(nextIdx, mirrorsRef.current);
            } else {
              setError("Initial playback failed. All mirrors exhausted.");
            }
          }
          return;
        }

        // Handle non-fatal fragment errors: nudge past stuck fragments
        if (!d.fatal && d.details === "fragLoadError") {
          console.warn(
            `[HLS] Non-fatal frag load error on frag ${d.frag?.sn}. Nudging forward...`,
          );
          if (video.duration > 0 && video.currentTime < video.duration - 1) {
            video.currentTime = video.currentTime + 0.5;
          }
          return;
        }
        if (!d.fatal) return;

        console.error(`[HLS] Fatal error: type=${d.type} details=${d.details}`);

        if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
          networkRetries++;
          if (networkRetries <= MAX_NETWORK_RETRIES) {
            const delay = Math.min(
              1000 * Math.pow(2, networkRetries - 1),
              8000,
            );
            console.warn(
              `[HLS] Network retry ${networkRetries}/${MAX_NETWORK_RETRIES} in ${delay}ms...`,
            );
            setTimeout(() => {
              if (hlsRef.current === hls) hls.startLoad();
            }, delay);
          } else {
            // Exhausted retries — try next mirror if available (use refs for latest state)
            console.error(
              `[HLS] Network retries exhausted. Attempting mirror fallback...`,
            );
            const nextIdx = activeMirrorRef.current + 1;
            if (nextIdx < mirrorsRef.current.length) {
              const failingIdx = activeMirrorRef.current;
              setFailedMirrors((prev) => ({
                ...prev,
                [failingIdx]: "502/504",
              }));
              console.log(
                `[HLS] Switching to mirror ${nextIdx}: ${mirrorsRef.current[nextIdx].source}`,
              );
              selectMirror(nextIdx, mirrorsRef.current);
            } else {
              setError("Stream connection lost. All mirrors exhausted.");
            }
          }
        } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
          mediaRecoveryAttempt++;
          if (mediaRecoveryAttempt === 1) {
            console.warn(
              "[HLS] Media error — attempting recoverMediaError()...",
            );
            hls.recoverMediaError();
          } else if (mediaRecoveryAttempt === 2) {
            console.warn(
              "[HLS] Media error persists — attempting swapAudioCodec() + recover...",
            );
            hls.swapAudioCodec();
            hls.recoverMediaError();
          } else {
            // Last resort — try next mirror (use refs for latest state)
            const nextIdx = activeMirrorRef.current + 1;
            if (nextIdx < mirrorsRef.current.length) {
              const failingIdx = activeMirrorRef.current;
              setFailedMirrors((prev) => ({ ...prev, [failingIdx]: "DECODE" }));
              console.log(
                `[HLS] Media recovery failed. Switching to mirror ${nextIdx}...`,
              );
              selectMirror(nextIdx, mirrorsRef.current);
            } else {
              setError(`Stream decode failed: ${d.details}`);
            }
          }
        } else {
          setError(`Stream failed: ${d.details}`);
        }
      });

      // Reset retry counters on successful fragment load
      hls.on(Hls.Events.FRAG_LOADED, () => {
        activeFragLoads.current = Math.max(0, activeFragLoads.current - 1);
        lastFragLoadedTime.current = Date.now();
        frag0LoadRetries.current = 0;
        if (networkRetries > 0) {
          console.log(
            `[HLS] Fragment loaded successfully. Resetting retry counter (was ${networkRetries}).`,
          );
          networkRetries = 0;
        }
        mediaRecoveryAttempt = 0;
        if (fragErrorTimeout) {
          console.log(
            "[HLS] Fragment loaded successfully. Clearing error fallback timer.",
          );
          clearTimeout(fragErrorTimeout);
          fragErrorTimeout = null;
        }
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
        if (fragErrorTimeout) {
          clearTimeout(fragErrorTimeout);
          fragErrorTimeout = null;
        }
        // Note: HLS.js does NOT use the Cache Storage API — it relies on
        // the browser's standard HTTP cache, governed by the
        // Cache-Control: private, max-age=3600 headers set on /api/proxy/segment.
        // No programmatic cache clearing is needed or correct here.
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.play().catch((err) => {
        console.warn("[PLAYER] play() failed or was interrupted:", err);
        setIsPaused(true);
        showToast("Playback failed to start.", "error");
      });
    }
  }, [streamUrl, isEmbed]);

  // ─── Reset playback UI state on episode/season change ────────────────────
  // Prevents stale progress bar, seek thumb, and time display carrying over
  // from the previous episode when the user clicks Next Episode.
  useEffect(() => {
    setProgress(0);
    setCurrentTime("0:00");
    setDuration("0:00");
    setBuffered(0);
    setIsDragging(false);
    setDragProgress(0);
    setHoverTime(null);
    hasPrefetchedNextEpisode.current = false;
  }, [season, episode]);

  // ── Video event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isEmbed) return;

    const onLoadedMetadata = () => {
      const savedProgress = JSON.parse(
        localStorage.getItem("nebula-progress") || "{}",
      );
      const key = getProgressKey();
      if (savedProgress[key]) {
        const val = savedProgress[key];
        const isWatched = typeof val === "object" ? val.watched : false;
        if (!isWatched) {
          video.currentTime = typeof val === "object" ? val.time : val;
        }
      }
    };

    const lastSaveTime = { current: 0 };
    const onTime = () => {
      if (video.duration > 0) {
        const cur = video.currentTime;
        setProgress((cur / video.duration) * 100);

        // Prefetch next episode in background if progress > 50%
        if (
          movie.type === "tv" &&
          !hasPrefetchedNextEpisode.current &&
          cur / video.duration > 0.5
        ) {
          const nextEp = nextEpisodeDetailsRef.current;
          if (nextEp) {
            hasPrefetchedNextEpisode.current = true;
            console.log(
              `[PLAYER] Prefetching/scanning all sources for next episode: S${nextEp.season}E${nextEp.episode}`,
            );

            // 1. VidLink prefetch
            let vidlinkPrefetchUrl = `${API}/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}&releaseDate=${movie.release_date || ""}`;
            if (movie.origin) vidlinkPrefetchUrl += `&origin=${movie.origin}`;
            vidlinkPrefetchUrl += `&season=${nextEp.season}&episode=${nextEp.episode}`;

            fetch(vidlinkPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode from VidLink (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch VidLink failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                ),
              );

            // 2. VidRock prefetch
            let vidrockPrefetchUrl = `${API}/api/vidrock?tmdbId=${movie.id}&type=${movie.type}&season=${nextEp.season}&episode=${nextEp.episode}`;
            fetch(vidrockPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode from VidRock (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch VidRock failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                ),
              );

            // 3. Videasy prefetch
            let videasyPrefetchUrl = `${API}/api/videasy?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}&season=${nextEp.season}&episode=${nextEp.episode}`;
            fetch(videasyPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode from Videasy (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch Videasy failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                ),
              );

            // 4. FilmU prefetch
            let filmuPrefetchUrl = `${API}/api/filmu?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}&season=${nextEp.season}&episode=${nextEp.episode}`;
            fetch(filmuPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode from FilmU (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch FilmU failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                ),
              );

            // 5. Vidnest prefetch
            let vidnestPrefetchUrl = `${API}/api/vidnest?tmdbId=${movie.id}&type=${movie.type}&season=${nextEp.season}&episode=${nextEp.episode}`;
            fetch(vidnestPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode from Vidnest (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch Vidnest failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                ),
              );
          }
        }

        // Throttle progress saving to every 5 seconds
        if (Date.now() - lastSaveTime.current > 5000) {
          const key = getProgressKey();

          // Mark as watched in history after 5 seconds of successful playback
          if (cur > 5 && !hasLoggedHistory.current) {
            onMarkAsWatched(movie.id, movie.type || "movie");
            hasLoggedHistory.current = true;
          }

          const isNearEnd =
            video.duration - cur < 60 || cur / video.duration > 0.9;

          if (cur > 5 && !isNearEnd) {
            const p = JSON.parse(
              localStorage.getItem("nebula-progress") || "{}",
            );
            p[key] = {
              time: cur,
              duration: video.duration,
              timestamp: Date.now(),
            };
            localStorage.setItem("nebula-progress", JSON.stringify(p));
            lastSaveTime.current = Date.now();
          } else if (isNearEnd && video.duration > 30) {
            // Only mark as fully finished if we are near the end AND the video is actually long enough
            const p = JSON.parse(
              localStorage.getItem("nebula-progress") || "{}",
            );
            p[key] = {
              time: cur,
              duration: video.duration,
              timestamp: Date.now(),
              watched: true,
            };
            localStorage.setItem("nebula-progress", JSON.stringify(p));
            lastSaveTime.current = Date.now();
          }
        }
      }
      setCurrentTime(formatTime(video.currentTime));
      // Find the active subtitle track (can be showing or hidden)
      const activeTrack = Array.from(video.textTracks).find(
        (t: any) => t.mode === "hidden" || t.mode === "showing",
      ) as any;

      if (activeTrack) {
        if (!prefs.useNativeSubtitles) {
          // If custom subtitles are preferred, ensure the mode is "hidden" so the native player doesn't draw them
          if (activeTrack.mode !== "hidden") {
            activeTrack.mode = "hidden";
          }
          updateActiveCues(activeTrack.activeCues);
        } else {
          // If native subtitles are preferred, ensure the mode is "showing"
          if (activeTrack.mode !== "showing") {
            activeTrack.mode = "showing";
          }
          updateActiveCues(null);
        }
      } else if (activeSubtitle === -1) {
        updateActiveCues(null);
      }
      if (video.buffered.length > 0) {
        setBuffered(
          (video.buffered.end(video.buffered.length - 1) / video.duration) *
            100,
        );
      }
    };
    const onDuration = () => setDuration(formatTime(video.duration));
    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    const onWaiting = () => showBufferingWithDelay(600);
    const onPlaying = () => {
      clearBuffering();
      if (!hasReportedSuccess.current) {
        hasReportedSuccess.current = true;
        fetch(`${API}/api/stream/playback-success`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: movie.id.toString(),
            type: movie.type,
            season: season,
            episode: episode,
          }),
        }).catch((err) => {
          console.warn("[PLAYER] Failed to report playback success:", err);
        });
      }
    };
    const onCanPlay = () => clearBuffering();
    const onCanPlayThrough = () => clearBuffering();

    // ── Stall recovery: detect frozen playback and nudge forward ──
    const onStalled = () => {
      console.warn("[PLAYER] Stalled event — data delivery halted.");
      showBufferingWithDelay(600);
      // If HLS is active, prod it to resume loading
      if (hlsRef.current) hlsRef.current.startLoad();
    };

    // Suspend fires when the browser stops consuming video data (including on pause).
    // Fix 1: Netflix-style — keep downloading when paused so the buffer stays full.
    // We removed the !video.paused gate: hls.js should always load up to
    // maxMaxBufferLength (300s) regardless of play/pause state.
    // Debounce to 500ms to avoid spamming startLoad() on rapid pause/play.
    let suspendTimer: NodeJS.Timeout | null = null;
    const onSuspend = () => {
      if (suspendTimer) return;
      suspendTimer = setTimeout(() => {
        suspendTimer = null;
        // Always resume loading — whether paused or playing.
        // hls.js will self-throttle once maxMaxBufferLength is reached.
        if (hlsRef.current) {
          hlsRef.current.startLoad();
        }
      }, 500);
    };

    const onVideoError = () => {
      const err = video.error;
      console.error(
        `[PLAYER] Video element error: code=${err?.code} msg=${err?.message}`,
      );
      if (err) {
        if (hlsRef.current) {
          // MEDIA_ERR_NETWORK (2) or MEDIA_ERR_DECODE (3): try HLS recovery
          if (err.code === 2 || err.code === 3) {
            console.warn(
              "[PLAYER] Attempting HLS media error recovery from video element error...",
            );
            hlsRef.current.recoverMediaError();
          }
        } else {
          // Native MP4 error recovery: try next mirror
          console.warn(
            "[PLAYER] Native video error. Attempting mirror fallback...",
          );
          const nextIdx = activeMirrorRef.current + 1;
          if (nextIdx < mirrorsRef.current.length) {
            const failingIdx = activeMirrorRef.current;
            setFailedMirrors((prev) => ({
              ...prev,
              [failingIdx]: `CODE:${err.code}`,
            }));
            selectMirror(nextIdx, mirrorsRef.current);
          } else {
            setError(`Playback failed: ${err.message || "Media source error"}`);
          }
        }
      }
    };

    // ── A/V Sync watchdog: detect frozen playback and recover without seek ──
    // Strategy:
    //   1–5s frozen: just call startLoad() — lightweight, no stall
    //   6–10s frozen: recoverMediaError() — re-initializes the codec
    //   >10s frozen: try next mirror
    // We never force video.currentTime = x+N because that causes the
    // exact A/V desync the user is experiencing (player clock advances
    // while decoder is reset, audio tracks drift apart).
    let lastWatchdogTime = video.currentTime;
    let stallCount = 0;
    let recoveryCount = 0;
    const watchdog = setInterval(() => {
      if (video.paused || video.ended || video.seeking) {
        lastWatchdogTime = video.currentTime;
        stallCount = 0;
        return;
      }
      if (Math.abs(video.currentTime - lastWatchdogTime) < 0.05) {
        stallCount++;
        if (stallCount === 5) {
          // 5 seconds frozen — light recovery
          console.warn("[WATCHDOG] 5s freeze detected. Calling startLoad()...");
          setIsBuffering(true);
          if (hlsRef.current) hlsRef.current.startLoad();
          recoveryCount++;
        } else if (stallCount === 10) {
          // 10 seconds frozen — escalate to media error recovery
          console.warn(
            "[WATCHDOG] 10s freeze — escalating to recoverMediaError()...",
          );
          if (hlsRef.current) {
            hlsRef.current.recoverMediaError();
            hlsRef.current.startLoad();
          }
          recoveryCount++;
        } else if (stallCount === 15 && recoveryCount >= 2) {
          // 15 seconds frozen and recovery already tried twice — switch mirror unless slow CDN is active
          const isSlowCdn =
            activeFragLoads.current > 0 ||
            Date.now() - lastFragLoadedTime.current < 20000;
          if (isSlowCdn) {
            console.log(
              `[WATCHDOG] Playback frozen for ${stallCount}s, but CDN is active (loading/loaded). Keeping current mirror and continuing buffer...`,
            );
            setIsBuffering(true);
            if (hlsRef.current) hlsRef.current.startLoad();
          } else {
            console.error(
              "[WATCHDOG] Permanent freeze — switching to next mirror...",
            );
            const nextIdx = activeMirrorRef.current + 1;
            if (nextIdx < mirrorsRef.current.length) {
              const failingIdx = activeMirrorRef.current;
              setFailedMirrors((prev) => ({ ...prev, [failingIdx]: "STUCK" }));
              selectMirror(nextIdx, mirrorsRef.current);
            }
            stallCount = 0;
            recoveryCount = 0;
          }
        }
      } else {
        if (stallCount > 0) {
          console.log(
            `[WATCHDOG] Playback resumed after ${stallCount}s stall.`,
          );
          stallCount = 0;
          recoveryCount = 0;
          setIsBuffering(false);
        }
      }
      lastWatchdogTime = video.currentTime;
    }, 1000);

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("canplaythrough", onCanPlayThrough);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("suspend", onSuspend);
    video.addEventListener("error", onVideoError);

    // ── Visibility Change: Handle mobile resume from background ──
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[PLAYER] Tab focused. Checking media state...");
        const v = videoRef.current;
        if (hlsRef.current && v) {
          // If stuck at a buffered boundary or readiness is low
          if (!v.paused && !v.ended && v.readyState < 2) {
            console.warn("[PLAYER] Detected stall on resume. Recovering...");
            hlsRef.current.recoverMediaError();
            hlsRef.current.startLoad();
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(watchdog);
      if (suspendTimer) clearTimeout(suspendTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlayThrough);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("suspend", onSuspend);
      video.removeEventListener("error", onVideoError);
    };
  }, [streamUrl, movie.id, getProgressKey, selectMirror]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  const resetHideTimer = useCallback(() => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!isPaused && !showSettings && !showSubtitles && !showEpisodeDrawer)
        setShowUi(false);
    }, 3000);
  }, [isPaused, showSettings, showSubtitles, showEpisodeDrawer]);

  // Tap on the video/empty area:
  //  - If a menu is open → close it
  //  - If controls are hidden → show them and start the auto-hide timer
  //  - If controls are visible → hide them immediately
  const handleTap = useCallback(() => {
    // If a long-press just fired, suppress the tap
    if (isLongPressing.current) {
      isLongPressing.current = false;
      return;
    }
    if (showSettings || showSubtitles || showEpisodeDrawer) {
      // Close whichever menu is open
      setShowSettings(false);
      setShowSubtitles(false);
      setShowEpisodeDrawer(false);
      resetHideTimer();
    } else if (!showUi) {
      resetHideTimer();
    } else {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowUi(false);
      setShowMobileVolume(false);
    }
  }, [showUi, showSettings, showSubtitles, showEpisodeDrawer, resetHideTimer]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault(); // Unconditionally suppress synthesized click events

      if (e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const width = rect.width;

      const now = Date.now();
      const lastTouch = lastTouchRef.current;

      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = null;
      }

      if (
        lastTouch &&
        now - lastTouch.time < 300 &&
        Math.abs(x - lastTouch.x) < 100
      ) {
        lastTouchRef.current = null;

        const v = videoRef.current;
        if (v) {
          const isLeft = x < width / 2;
          if (isLeft) {
            v.currentTime = Math.max(0, v.currentTime - 10);
            setDoubleTapFeedback({
              visible: true,
              type: "rewind",
              x,
              y,
              key: Date.now(),
            });
          } else {
            const maxTime =
              isNaN(v.duration) || v.duration === 0
                ? v.currentTime
                : v.duration;
            v.currentTime = Math.min(maxTime, v.currentTime + 10);
            setDoubleTapFeedback({
              visible: true,
              type: "forward",
              x,
              y,
              key: Date.now(),
            });
          }
        }
      } else {
        lastTouchRef.current = { time: now, x, y };

        touchTimeoutRef.current = setTimeout(() => {
          handleTap();
          lastTouchRef.current = null;
        }, 300);
      }
    },
    [handleTap],
  );

  const handleDesktopClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      handleTap();
    },
    [handleTap],
  );

  useEffect(() => {
    resetHideTimer();
    // Only reset the hide timer for real mouse/pen movement.
    // Touch (mobile) generates fake mousemove events that would re-show the UI
    // immediately after handleTap() hides it, breaking tap-to-dismiss.
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch") resetHideTimer();
    };
    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (v) {
            if (v.paused) {
              v.play().catch((err) => {
                console.warn("[PLAYER] play() failed or was interrupted:", err);
                setIsPaused(true);
                showToast("Playback failed to start.", "error");
              });
            } else {
              v.pause();
            }
          }
          break;
        case "KeyM":
          setIsMuted((p) => !p);
          break;
        case "KeyF":
          if (!document.fullscreenElement)
            containerRef.current?.requestFullscreen();
          else document.exitFullscreen();
          break;
        case "KeyL":
          if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10);
          break;
        case "KeyJ":
          if (v) v.currentTime = Math.max(0, v.currentTime - 10);
          break;
        case "ArrowRight":
          if (v) v.currentTime = Math.min(v.duration, v.currentTime + 5);
          break;
        case "ArrowLeft":
          if (v) v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((p) => Math.min(100, p + 5));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((p) => Math.max(0, p - 5));
          break;
        case "Escape":
          showSettings ? setShowSettings(false) : onClose();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, showSettings]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch((err) => {
        console.warn("[PLAYER] play() failed or was interrupted:", err);
        setIsPaused(true);
        showToast("Playback failed to start.", "error");
      });
    } else {
      v.pause();
    }
  };

  const handleSliderMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const slider = document.getElementById("progress-slider");
      if (!slider) return;
      const r = slider.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const p = Math.max(
        0,
        Math.min(100, ((clientX - r.left) / r.width) * 100),
      );
      setDragProgress(p);
    },
    [isDragging],
  );

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
      window.addEventListener("mousemove", handleSliderMove);
      window.addEventListener("mouseup", handleSliderUp);
      window.addEventListener("touchmove", handleSliderMove);
      window.addEventListener("touchend", handleSliderUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleSliderMove);
      window.removeEventListener("mouseup", handleSliderUp);
      window.removeEventListener("touchmove", handleSliderMove);
      window.removeEventListener("touchend", handleSliderUp);
    };
  }, [isDragging, handleSliderMove, handleSliderUp]);

  const handleSliderDown = (e: React.MouseEvent | React.TouchEvent) => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration)) return;
    setIsDragging(true);
    const r = e.currentTarget.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
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
      if (!document.fullscreenElement)
        containerRef.current?.requestFullscreen();
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
    } else {
      const video = videoRef.current;
      const m = mirrors[activeMirror];
      if (video && m?.type === "mp4_grouped") {
        const key = getProgressKey();
        const saved = JSON.parse(
          localStorage.getItem("nebula-progress") || "{}",
        );
        saved[key] = {
          time: video.currentTime,
          duration: video.duration,
          timestamp: Date.now(),
        };
        localStorage.setItem("nebula-progress", JSON.stringify(saved));
        const targetId = levelId === -1 ? 0 : levelId;
        setActiveQuality(levelId);
        setCurrentHeight(m.qualities[targetId].height);
        setStreamUrl(m.qualities[targetId].url);
      }
    }
  };

  const toggleSubtitles = (index: number) => {
    setActiveSubtitle(index);
    if (videoRef.current) {
      const tracks = Array.from(videoRef.current.textTracks) as TextTrack[];
      tracks.forEach((track, idx) => {
        track.mode = idx === index ? "showing" : "hidden";
      });
    }
  };

  const getPreviousEpisodeFor = useCallback(
    (s: number, e: number) => {
      if (!tvDetails || !tvDetails.seasons) {
        return null;
      }
      const sortedSeasons = tvDetails.seasons
        .filter((sInfo: any) => sInfo.season_number > 0)
        .sort((a: any, b: any) => a.season_number - b.season_number);

      if (e > 1) {
        return { season: s, episode: e - 1 };
      }

      const currentSeasonIdx = sortedSeasons.findIndex(
        (sInfo: any) => sInfo.season_number === s,
      );
      if (currentSeasonIdx > 0) {
        const prevSeason = sortedSeasons[currentSeasonIdx - 1];
        return {
          season: prevSeason.season_number,
          episode: prevSeason.episode_count,
        };
      }

      return null;
    },
    [tvDetails],
  );

  const getNextEpisodeFor = useCallback(
    (s: number, e: number) => {
      if (!tvDetails || !tvDetails.seasons) {
        return null;
      }
      const sortedSeasons = tvDetails.seasons
        .filter((sInfo: any) => sInfo.season_number > 0)
        .sort((a: any, b: any) => a.season_number - b.season_number);

      const currentSeasonInfo = sortedSeasons.find(
        (sInfo: any) => sInfo.season_number === s,
      );
      if (!currentSeasonInfo) return null;

      const maxEpisodes = currentSeasonInfo.episode_count;
      if (e < maxEpisodes) {
        return { season: s, episode: e + 1 };
      }

      // Check if there is a next season
      const currentSeasonIdx = sortedSeasons.findIndex(
        (sInfo: any) => sInfo.season_number === s,
      );
      if (
        currentSeasonIdx !== -1 &&
        currentSeasonIdx < sortedSeasons.length - 1
      ) {
        const nextSeason = sortedSeasons[currentSeasonIdx + 1];
        return { season: nextSeason.season_number, episode: 1 };
      }

      return null;
    },
    [tvDetails],
  );

  const getNextEpisodeDetails = useCallback(() => {
    if (movie.type !== "tv" || season === undefined || episode === undefined) {
      return null;
    }
    return getNextEpisodeFor(season, episode);
  }, [movie.type, season, episode, getNextEpisodeFor]);

  const hasNext = !tvDetails || getNextEpisodeDetails() !== null;

  const handleNextEpisode = () => {
    const nextEp = getNextEpisodeDetails();
    if (nextEp) {
      setSourceSelect(nextEp);
    }
  };

  const safeClose = () => {
    onClose();
    setTimeout(() => {
      if (window.location.pathname.includes("/watch/")) {
        navigate("/");
      }
    }, 100);
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[200] bg-black overflow-hidden nebula-player ${
        !prefs.useNativeSubtitles && activeSubtitle !== -1
          ? "custom-subs-active"
          : ""
      }`}
      onPointerMove={(e) => {
        if (e.pointerType !== "touch") resetHideTimer();
      }}
      style={
        {
          cursor: showUi ? "default" : "none",
          containerType: "inline-size",
        } as React.CSSProperties
      }
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="absolute top-12 left-1/2 z-[600] pointer-events-none"
          >
            <div
              className={`px-6 py-3 rounded-full backdrop-blur-xl border ${
                toast.type === "error"
                  ? "bg-red-500/20 border-red-500/50"
                  : "bg-nebula-cyan/20 border-nebula-cyan/50"
              } flex items-center gap-3 shadow-2xl shadow-black`}
            >
              <div
                className={`w-2 h-2 rounded-full ${toast.type === "error" ? "bg-red-500" : "bg-nebula-cyan"} animate-pulse`}
              />
              <span className="text-white font-bold text-[10px] uppercase tracking-widest">
                {toast.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)",
            }}
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
                  style={{
                    animation: "stream-progress 3s ease-in-out infinite",
                  }}
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
            @media (max-height: 480px) {
              .error-overlay {
                padding: 1rem !important;
              }
              .error-box {
                max-width: 440px !important;
              }
              .error-icon-box {
                width: 2.75rem !important;
                height: 2.75rem !important;
                margin-bottom: 0.5rem !important;
              }
              .error-icon-box svg {
                width: 1.25rem !important;
                height: 1.25rem !important;
              }
              .error-title {
                font-size: 1.1rem !important;
                margin-bottom: 0.25rem !important;
              }
              .error-msg-tag {
                margin-bottom: 0.5rem !important;
                font-size: 8px !important;
                padding: 0.25rem 0.5rem !important;
              }
              .error-desc {
                margin-bottom: 0.75rem !important;
                font-size: 11px !important;
                line-height: 1rem !important;
                max-width: 24rem !important;
              }
              .error-buttons-grid {
                margin-top: 0.25rem !important;
                gap: 0.5rem !important;
                max-width: 400px !important;
              }
              .error-buttons-grid button {
                padding: 0.5rem 0.75rem !important;
                font-size: 8px !important;
                min-height: 32px !important;
              }
            }
          `}</style>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 z-[500] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 pointer-events-none error-overlay">
          {movie.backdrop && (
            <img
              src={movie.backdrop}
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-2xl"
              alt=""
            />
          )}
          <div className="relative z-10 flex flex-col items-center pointer-events-auto error-box">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/50 error-icon-box">
              <Info className="text-red-500" size={32} />
            </div>
            <h3 className="text-2xl font-display font-black text-white mb-2 uppercase tracking-tighter error-title">
              No signal detected
            </h3>
            {error && (
              <p className="text-red-400/90 max-w-sm mb-3 font-mono text-[10px] uppercase tracking-wider bg-red-950/30 border border-red-500/20 px-3 py-1.5 rounded-md error-msg-tag">
                {error}
              </p>
            )}
            <p className="text-white/40 max-w-sm mb-6 font-light text-sm error-desc">
              All mirrors for this source have failed. Try switching stream
              sources/providers (e.g. from VidRock to Videasy) below.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md sm:max-w-2xl justify-center mt-2 pointer-events-auto error-buttons-grid">
              <button
                onClick={() =>
                  setSourceSelect({
                    season: season ?? 1,
                    episode: episode ?? 1,
                  })
                }
                className="col-span-1 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-full transition-all uppercase text-[10px] tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-violet-500/20 text-center flex items-center justify-center min-h-[44px] sm:min-h-0"
              >
                Switch Source
              </button>
              <button
                onClick={() => {
                  setError("");
                  setLoading(true);
                  setFailedMirrors({});
                  // Re-trigger the stream fetch by bumping streamUrl state
                  setStreamUrl(null);
                  let url = `${API}/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title)}&releaseYear=${movie.year}`;
                  if (movie.origin) url += `&origin=${movie.origin}`;
                  if (season !== undefined) url += `&season=${season}`;
                  if (episode !== undefined) url += `&episode=${episode}`;
                  fetch(url)
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.mirrors && data.mirrors.length > 0) {
                        const processedMirrors = data.mirrors.map((m: any) => {
                          if (m.type === "embed") return m;
                          const isMp4 =
                            m.type === "mp4" || m.url.includes(".mp4");
                          const proxyEndpoint = isMp4
                            ? "/api/proxy/segment"
                            : "/api/proxy/stream";
                          const proxiedUrl = `${API}${proxyEndpoint}?url=${encodeURIComponent(m.url)}`;
                          return { ...m, url: proxiedUrl };
                        });
                        const grouped = groupMirrors(processedMirrors);
                        setMirrors(grouped);
                        mirrorsRef.current = grouped;
                        selectMirror(0, grouped);
                        if (data.qualityTag) setQualityTag(data.qualityTag);
                        if (data.resolution) setResolution(data.resolution);
                      } else if (data.streamUrl) {
                        const isEmb = data.type === "embed";
                        const isMp4 =
                          data.type === "mp4" ||
                          data.streamUrl.includes(".mp4");
                        const proxyEndpoint = isMp4
                          ? "/api/proxy/segment"
                          : "/api/proxy/stream";
                        setStreamUrl(
                          isEmb
                            ? data.streamUrl
                            : `${API}${proxyEndpoint}?url=${encodeURIComponent(data.streamUrl)}`,
                        );
                        setIsEmbed(isEmb);
                        if (data.qualityTag) setQualityTag(data.qualityTag);
                        if (data.resolution) setResolution(data.resolution);
                      } else {
                        setError(data.error || "No stream found on retry.");
                      }
                    })
                    .catch((e) => setError(e.message))
                    .finally(() => setLoading(false));
                }}
                className="col-span-1 px-4 py-3 bg-nebula-cyan text-obsidian rounded-full text-[10px] uppercase font-black tracking-[0.2em] hover:bg-white transition-colors text-center flex items-center justify-center min-h-[44px] sm:min-h-0"
              >
                Retry Stream
              </button>
              <button
                onClick={safeClose}
                className="col-span-2 sm:col-span-1 px-4 py-3 bg-white text-obsidian rounded-full text-[10px] uppercase font-black tracking-[0.2em] hover:bg-nebula-cyan transition-colors text-center flex items-center justify-center min-h-[44px] sm:min-h-0"
              >
                Abort Mission
              </button>
            </div>
          </div>
        </div>
      )}

      {isBuffering && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-[18] pointer-events-none bg-black/20 backdrop-blur-sm transition-all duration-300">
          <div className="flex flex-col items-center gap-4 pointer-events-none">
            {movie.clearLogo ? (
              <img
                src={movie.clearLogo}
                alt="Loading..."
                className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl animate-pulse opacity-80 pointer-events-none"
                referrerPolicy="no-referrer"
              />
            ) : (
              <h1 className="text-xl md:text-3xl font-display font-black uppercase tracking-tighter text-white animate-pulse drop-shadow-2xl select-none">
                {movie.title}
              </h1>
            )}
            <p className="text-white/50 text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse pointer-events-none">
              Buffering Signal...
            </p>
            <AnimatePresence>
              {showServerTip && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-nebula-cyan/80 text-[10px] uppercase tracking-[0.15em] font-medium pointer-events-none mt-2 px-4 text-center max-w-md select-none"
                >
                  Slow connection? Tap the Gear icon (⚙️) to switch servers.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {isEmbed ? (
        <iframe
          src={streamUrl!}
          className="w-full h-full border-0 bg-black absolute inset-0 z-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          title="Nebula Secure Mirror"
          onLoad={() => {
            setLoading(false);
            setIsBuffering(false);
          }}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            crossOrigin="anonymous"
          >
            {vttBlobUrl && (
              <track
                key={vttBlobUrl}
                kind="subtitles"
                src={vttBlobUrl}
                srcLang={subtitles[activeSubtitle]?.lang || "en"}
                label={subtitles[activeSubtitle]?.languageName || "Active"}
                default
                onLoad={(e) => {
                  const track = e.currentTarget.track;
                  if (track) {
                    if (!prefs.useNativeSubtitles) {
                      track.mode = "hidden";
                    } else {
                      track.mode = "showing";
                    }
                    updateActiveCues(track.activeCues);
                    track.oncuechange = () => {
                      updateActiveCues(track.activeCues);
                    };
                  }
                }}
              />
            )}
          </video>
          <SubtitleOverlay
            activeCues={activeCues}
            prefs={prefs}
            showUi={showUi}
          />
        </>
      )}

      {/* ── Transparent tap layer — covers the screen behind the UI chrome ─────
           On mobile: tap hides/shows controls without triggering play/pause.
           Sits above the video (z-10) but below the controls UI (z-20).
           pointer-events always on so taps are captured even when UI is hidden. */}
      {!isEmbed && (
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: showUi ? "default" : "none" }}
          onClick={handleDesktopClick}
          onTouchEnd={handleTouchEnd}
          onPointerDown={(e) => {
            // Only trigger long-press on primary pointer (finger / left click)
            if (e.button !== undefined && e.button !== 0) return;
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
            longPressTimer.current = setTimeout(() => {
              isLongPressing.current = true;
              const v = videoRef.current;
              if (v) v.playbackRate = 2;
              showToast("2× Speed", "info");
              setSpeed(2);
            }, 400);
          }}
          onPointerUp={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            if (isLongPressing.current) {
              const v = videoRef.current;
              if (v) v.playbackRate = 1;
              setSpeed(1);
              showToast("1× Speed", "info");
            }
          }}
          onPointerCancel={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            if (isLongPressing.current) {
              const v = videoRef.current;
              if (v) v.playbackRate = 1;
              setSpeed(1);
            }
          }}
        />
      )}

      {doubleTapFeedback && doubleTapFeedback.visible && (
        <div
          key={doubleTapFeedback.key}
          className={`absolute inset-y-0 w-1/2 pointer-events-none z-[19] flex items-center justify-center overflow-hidden ${
            doubleTapFeedback.type === "rewind" ? "left-0" : "right-0"
          }`}
        >
          {/* Background Ripple/Crescent */}
          <motion.div
            initial={{
              opacity: 0,
              scaleX: 0.5,
              borderRadius:
                doubleTapFeedback.type === "rewind"
                  ? "0 100% 100% 0"
                  : "100% 0 0 100%",
            }}
            animate={{
              opacity: [0, 0.4, 0.4, 0],
              scaleX: [0.8, 1, 1.05, 1],
            }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className={`absolute inset-0 bg-white/10 ${
              doubleTapFeedback.type === "rewind"
                ? "origin-left bg-gradient-to-r from-black/40 to-transparent"
                : "origin-right bg-gradient-to-l from-black/40 to-transparent"
            }`}
          />

          {/* Icon and Text Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.9, 1.1, 1, 0.9],
            }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="relative flex flex-col items-center gap-2 z-10"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
              {doubleTapFeedback.type === "rewind" ? (
                <div className="flex items-center justify-center gap-0.5">
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                    className="text-white text-lg font-black"
                  >
                    &lsaquo;
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                    className="text-white text-lg font-black"
                  >
                    &lsaquo;
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="text-white text-lg font-black"
                  >
                    &lsaquo;
                  </motion.span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-0.5">
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="text-white text-lg font-black"
                  >
                    &rsaquo;
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                    className="text-white text-lg font-black"
                  >
                    &rsaquo;
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                    className="text-white text-lg font-black"
                  >
                    &rsaquo;
                  </motion.span>
                </div>
              )}
            </div>
            <span className="text-white text-xs font-black tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded border border-white/5 font-mono">
              {doubleTapFeedback.type === "rewind" ? "-10s" : "+10s"}
            </span>
          </motion.div>
        </div>
      )}

      <div
        className="absolute inset-0 flex flex-col justify-between z-20"
        style={{
          opacity: showUi ? 1 : 0,
          transition: "opacity 0.25s",
          pointerEvents: showUi ? "auto" : "none",
        }}
        // Tap on empty space (not the bars) → toggle UI visibility
        onClick={handleDesktopClick}
        onTouchEnd={handleTouchEnd}
        onPointerDown={(e) => {
          if (e.button !== undefined && e.button !== 0) return;
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          longPressTimer.current = setTimeout(() => {
            isLongPressing.current = true;
            const v = videoRef.current;
            if (v) v.playbackRate = 2;
            showToast("2× Speed", "info");
            setSpeed(2);
          }, 400);
        }}
        onPointerUp={() => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
          if (isLongPressing.current) {
            const v = videoRef.current;
            if (v) v.playbackRate = 1;
            setSpeed(1);
            showToast("1× Speed", "info");
          }
        }}
        onPointerCancel={() => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
          if (isLongPressing.current) {
            const v = videoRef.current;
            if (v) v.playbackRate = 1;
            setSpeed(1);
          }
        }}
      >
        <div
          className={`flex items-center gap-3 px-3 sm:px-6 py-3 sm:py-5 ${!isEmbed ? "bg-gradient-to-b from-black/80 to-transparent" : ""}`}
          // Stop taps on the top bar from bubbling to the tap layer
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <button
            onClick={safeClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-white/5 shrink-0"
            title="Back (Esc)"
          >
            <X size={18} />
          </button>
          {!isEmbed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold truncate leading-tight flex items-center gap-2">
                {movie.title}
                {season !== undefined && episode !== undefined && (
                  <span className="text-nebula-cyan font-display italic text-xs sm:text-sm">
                    S{season}E{episode}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest">
                  {movie.type === "tv" ? "TV Link" : "Movie Link"} —{" "}
                  {movie.year}
                </p>
                {qualityTag && qualityTag !== "UNKNOWN" && (
                  <div className="flex items-center gap-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                        qualityTag === "CAM" || qualityTag === "TC"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : qualityTag === "BLURAY"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                            : "bg-nebula-cyan/10 border-nebula-cyan/30 text-nebula-cyan"
                      }`}
                    >
                      {qualityTag === "WEBDL"
                        ? "WEB-DL"
                        : qualityTag === "WEBRIP"
                          ? "WEBRip"
                          : qualityTag}
                    </span>
                    {resolution && resolution !== "UNKNOWN" && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-white/5 border-white/10 text-white/50">
                        {resolution}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className={`px-3 sm:px-6 pb-4 sm:pb-6 pt-12 sm:pt-16 ${!isEmbed ? "bg-gradient-to-t from-black/90 to-transparent" : ""}`}
          // Stop taps on the bottom bar from bubbling to the tap layer
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {!isEmbed && (
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
                  style={{
                    left: `${(hoverTime / (videoRef.current?.duration || 1)) * 100}%`,
                  }}
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
                  {formatTime(
                    (dragProgress / 100) * (videoRef.current?.duration || 0),
                  )}
                </div>
              )}

              <div
                className="absolute inset-x-0 rounded-full bg-white/20"
                style={{ height: "3px" }}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                  style={{ width: `${buffered}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-white rounded-full transition-all duration-75"
                  style={{ width: `${isDragging ? dragProgress : progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full -ml-1.5 shadow-lg group-hover:scale-125 transition-transform"
                  style={{ left: `${isDragging ? dragProgress : progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-5">
              {!isEmbed && (
                <>
                  <button
                    onClick={() => {
                      if (videoRef.current)
                        videoRef.current.currentTime = Math.max(
                          0,
                          videoRef.current.currentTime - 10,
                        );
                    }}
                    className="hidden sm:block text-white/70 hover:text-white transition-colors p-1"
                    title="–10s (J)"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-white/80 transition-colors p-1"
                    title="Play/Pause (Space)"
                  >
                    {isPaused ? (
                      <Play size={26} fill="currentColor" />
                    ) : (
                      <Pause size={26} fill="currentColor" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current)
                        videoRef.current.currentTime = Math.min(
                          videoRef.current.duration,
                          videoRef.current.currentTime + 10,
                        );
                    }}
                    className="hidden sm:block text-white/70 hover:text-white transition-colors p-1"
                    title="+10s (L)"
                  >
                    <RotateCw size={18} />
                  </button>
                </>
              )}
              {movie.type === "tv" && (
                <button
                  onClick={handleNextEpisode}
                  disabled={!hasNext}
                  className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold transition-all border ${
                    hasNext
                      ? "bg-white/10 hover:bg-white/20 text-white border-white/5 active:scale-95"
                      : "bg-white/5 text-white/30 border-transparent opacity-40 cursor-not-allowed"
                  }`}
                  title={hasNext ? "Next Episode" : "No More Episodes"}
                >
                  <span className="hidden sm:inline italic">NEXT</span>
                  <ChevronRight size={16} />
                </button>
              )}
              {!isEmbed && (
                <>
                  <div className="hidden sm:flex items-center gap-2 group/vol relative">
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
                      {isMuted || volume === 0 ? (
                        <VolumeX size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
                    <div
                      className={`${showMobileVolume ? "h-32 opacity-100 translate-y-0" : "h-0 opacity-0 translate-y-4"} transition-all duration-300 overflow-hidden flex flex-col items-center absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-[#111]/90 backdrop-blur-xl p-3 rounded-2xl border border-white/10 z-50 shadow-2xl md:hidden`}
                    >
                      <div className="relative h-24 w-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="absolute bottom-0 inset-x-0 bg-white rounded-full transition-all"
                          style={{ height: `${isMuted ? 0 : volume}%` }}
                        />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          orient="vertical"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            setVolume(+e.target.value);
                            setIsMuted(false);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-slider-vertical"
                        />
                      </div>
                      <span className="text-[10px] text-white/40 mt-2 font-mono">
                        {isMuted ? 0 : volume}%
                      </span>
                    </div>

                    {/* Desktop Volume Slider */}
                    <div className="hidden md:flex w-0 group-hover/vol:w-24 transition-all duration-300 overflow-hidden items-center ml-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(+e.target.value);
                          setIsMuted(false);
                        }}
                        className="w-20 accent-white cursor-pointer h-1 rounded-full appearance-none bg-white/20"
                      />
                    </div>
                  </div>
                  <span className="text-white/50 text-[10px] sm:text-xs tabular-nums">
                    {currentTime} <span className="text-white/20">/</span>{" "}
                    {duration}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 relative">
              <button
                onClick={() =>
                  setSourceSelect({
                    season: season ?? 1,
                    episode: episode ?? 1,
                  })
                }
                className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all text-xs font-bold border border-white/10 ${sourceSelect ? "bg-white text-black" : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"}`}
              >
                <Tv size={14} />
                <span className="hidden sm:inline">SOURCES</span>
              </button>
              {movie.type === "tv" && (
                <button
                  onClick={() => setShowEpisodeDrawer(true)}
                  className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all text-xs font-bold border border-white/10 ${showEpisodeDrawer ? "bg-white text-black" : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"}`}
                >
                  <List size={14} />
                  <span className="hidden sm:inline">EPISODES</span>
                </button>
              )}
              {!isEmbed && (
                <>
                  {/* Subtitles Button */}
                  <button
                    onClick={() => {
                      setShowSubtitles((p) => !p);
                      setShowSettings(false);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${showSubtitles ? "bg-white text-black" : "bg-white/10 text-white/50 hover:text-white"}`}
                    title="Subtitles"
                  >
                    <Subtitles size={16} />
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setShowSettings((p) => !p);
                      setShowSubtitles(false);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${showSettings ? "bg-white text-black" : "bg-white/10 text-white/50 hover:text-white"}`}
                    title="Settings"
                  >
                    <Settings size={16} />
                  </button>
                </>
              )}
              <button
                onClick={handleFullscreen}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-all"
                title="Fullscreen (F)"
              >
                <Maximize size={16} />
              </button>

              {/* Subtitles Menu */}
              {showSubtitles && (
                <div className="absolute bottom-12 right-0 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl w-64 max-h-[60vh] overflow-y-auto custom-scrollbar pointer-events-auto flex flex-col gap-1 p-2 animate-in slide-in-from-bottom-2 duration-200">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 flex items-center justify-between">
                    <span>Subtitles</span>
                    <span className="flex items-center gap-1.5">
                      {fetchingSubtitles ? (
                        <Loader2
                          size={10}
                          className="animate-spin text-nebula-cyan"
                        />
                      ) : (
                        <button
                          onClick={() => refetchSubtitles(true)}
                          title="Refetch from all sources"
                          className="text-white/30 hover:text-nebula-cyan transition-colors"
                        >
                          <RefreshCw size={10} />
                        </button>
                      )}
                    </span>
                  </p>

                  {activeSubtitle !== -1 && !fetchingSubtitles && (
                    <div className="mx-2 mb-3 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">
                          Sync Offset
                        </p>
                        {subtitleOffset !== 0 && (
                          <button
                            onClick={() => setSubtitleOffset(0)}
                            className="text-[9px] text-nebula-cyan hover:text-nebula-cyan/80 transition-colors uppercase tracking-widest font-bold"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => adjustSubtitleDelay(-0.5)}
                          className="w-12 py-1.5 flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 rounded-lg border border-white/5 transition-all"
                        >
                          -0.5s
                        </button>

                        <span
                          className={`text-xs font-mono font-bold ${subtitleOffset === 0 ? "text-white/60" : "text-nebula-cyan font-black"}`}
                        >
                          {subtitleOffset > 0 ? "+" : ""}
                          {subtitleOffset.toFixed(1)}s
                        </span>

                        <button
                          onClick={() => adjustSubtitleDelay(0.5)}
                          className="w-12 py-1.5 flex items-center justify-center text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 rounded-lg border border-white/5 transition-all"
                        >
                          +0.5s
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleSubtitleChange(-1)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${activeSubtitle === -1 ? "text-black bg-white font-bold" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                    >
                      Off
                    </button>
                    {subtitles.map((sub, i) => (
                      <button
                        key={i}
                        onClick={() => handleSubtitleChange(i)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors flex items-center justify-between ${
                          sub.failed
                            ? "text-red-500/50 hover:bg-white/5 line-through decoration-red-500/50"
                            : activeSubtitle === i
                              ? "text-black bg-white font-bold"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className="truncate pr-2">
                          {sub.languageName} {sub.failed && "(Failed to load)"}
                        </span>
                        {sub.source && (
                          <span
                            className={`text-[8px] px-1 rounded uppercase font-black ${
                              sub.failed
                                ? "bg-red-500/10 text-red-500/60"
                                : activeSubtitle === i
                                  ? "bg-black/20 text-black/60"
                                  : "bg-white/5 text-white/30"
                            }`}
                          >
                            {sub.source}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Upload custom subtitle */}
                  <div className="mx-2 mt-1 mb-2">
                    <input
                      ref={uploadSubtitleInputRef}
                      type="file"
                      accept=".vtt,.srt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const ext = file.name.split(".").pop()?.toLowerCase();
                        if (ext !== "vtt" && ext !== "srt") {
                          showToast(
                            "Only .vtt or .srt files are supported",
                            "error",
                          );
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          let content = (ev.target?.result as string) || "";
                          // Strip BOM
                          content = content.replace(/^\uFEFF/, "");
                          // Normalize line endings
                          content = content
                            .replace(/\r\n/g, "\n")
                            .replace(/\r/g, "\n");
                          if (ext === "srt") {
                            // SRT → VTT conversion
                            content = content.replace(
                              /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
                              "$1.$2",
                            );
                            content = content.replace(
                              /^\d+\n(?=\d{2}:\d{2}:\d{2})/gm,
                              "",
                            );
                            content = "WEBVTT\n\n" + content.trim() + "\n";
                          }
                          const blob = new Blob([content], {
                            type: "text/vtt",
                          });
                          const blobUrl = URL.createObjectURL(blob);
                          customSubBlobUrls.current.push(blobUrl);
                          const label = file.name.replace(/\.(srt|vtt)$/i, "");
                          setSubtitles((prev) => [
                            {
                              url: blobUrl,
                              lang: "custom",
                              languageName: `Custom: ${label}`,
                              source: "Custom",
                            },
                            ...prev,
                          ]);
                          setActiveSubtitle(0);
                          showToast(`Loaded: ${file.name}`, "success");
                        };
                        reader.readAsText(file);
                        // Reset so the same file can be re-uploaded
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => uploadSubtitleInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 rounded-md border border-dashed border-white/10 hover:border-white/20 transition-all"
                    >
                      <Upload size={10} />
                      <span>Upload .srt or .vtt</span>
                    </button>
                  </div>
                </div>
              )}

              {showSettings && (
                <div className="absolute bottom-12 right-0 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl w-60 max-h-[60vh] overflow-y-auto custom-scrollbar pointer-events-auto flex flex-col gap-1 p-2 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="mb-2">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1">
                      Speed
                    </p>
                    <div className="grid grid-cols-4 gap-1 px-2">
                      {[0.5, 1, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`w-full text-center py-1.5 text-xs rounded-md transition-colors ${speed === s ? "text-black bg-white font-bold" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                        >
                          {s === 1 ? "1x" : `${s}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mirrors.length > 0 &&
                    (() => {
                      const groupedByCategory: Record<
                        string,
                        { mirror: any; originalIndex: number }[]
                      > = {};
                      mirrors.forEach((m, i) => {
                        const { category, name } = parseMirrorDetails(m.source);
                        if (!groupedByCategory[category]) {
                          groupedByCategory[category] = [];
                        }
                        groupedByCategory[category].push({
                          mirror: { ...m, cleanName: name },
                          originalIndex: i,
                        });
                      });

                      return Object.entries(groupedByCategory).map(
                        ([category, items], catIdx) => {
                          items.sort((a, b) => {
                            return (
                              getMirrorPriority(a.mirror.source) -
                              getMirrorPriority(b.mirror.source)
                            );
                          });

                          return (
                            <div key={category} className="mb-2">
                              <p
                                className={`text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 ${catIdx > 0 ? "border-t border-white/10" : "border-t border-white/10"}`}
                              >
                                {category}
                              </p>
                              <div className="flex flex-col px-2 gap-0.5">
                                {items.map(
                                  ({ mirror: m, originalIndex: idx }) => {
                                    const flagCode = m.flag
                                      ? m.flag.toLowerCase()
                                      : "us";
                                    const countryCode =
                                      flagCode === "en" ? "us" : flagCode;
                                    const isSelected = activeMirror === idx;
                                    const failedReason = failedMirrors[idx];
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          selectMirror(idx, mirrors);
                                        }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors flex items-center justify-between ${isSelected ? "text-white bg-white/10 font-bold" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <img
                                            src={`https://flagcdn.com/w20/${countryCode}.png`}
                                            alt={flagCode}
                                            className="w-4 h-3 object-cover rounded-[1px] shrink-0 border border-white/10"
                                            onError={(e) => {
                                              e.currentTarget.src =
                                                "https://flagcdn.com/w20/us.png";
                                            }}
                                          />
                                          <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="truncate text-[11.5px] font-semibold leading-tight text-white font-display">
                                                {m.cleanName}
                                              </span>
                                              {failedReason && (
                                                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-rose-500/30 text-rose-400 bg-rose-500/10 uppercase tracking-wider shrink-0">
                                                  {failedReason}
                                                </span>
                                              )}
                                            </div>
                                            {m.audio && (
                                              <span className="text-[9.5px] text-white/40 font-normal leading-tight mt-0.5">
                                                {m.audio}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {isSelected && (
                                          <span className="text-nebula-cyan text-[10px] font-bold shrink-0 ml-2">
                                            ✓
                                          </span>
                                        )}
                                      </button>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          );
                        },
                      );
                    })()}
                  {qualities.length > 0 && (
                    <div className="mb-2">
                      <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 border-t border-white/10">
                        Quality
                      </p>
                      <div className="flex flex-col px-2">
                        <button
                          onClick={() => setQuality(-1)}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between ${activeQuality === -1 ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                        >
                          <span>Auto</span>
                          {activeQuality === -1 && currentHeight && (
                            <span className="text-[9px] opacity-40">
                              {currentHeight}p
                            </span>
                          )}
                        </button>
                        {qualities.map((q) => (
                          <button
                            key={q.levelId}
                            onClick={() => setQuality(q.levelId)}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${activeQuality === q.levelId ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                          >
                            {q.height}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Collapsible Style Customizer */}
                  <div className="border-t border-white/10 mt-1 pt-2 px-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStyleCustomizer(!showStyleCustomizer);
                      }}
                      className="w-full flex items-center justify-between px-2 py-2 text-[11px] text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-colors font-bold uppercase tracking-wider"
                    >
                      <span>Subtitle Styles</span>
                      <span className="text-[9px]">
                        {showStyleCustomizer ? "▲" : "▼"}
                      </span>
                    </button>

                    {showStyleCustomizer && (
                      <div className="flex flex-col gap-3 mt-2 pb-2">
                        {/* Preset Selection */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold px-1">
                            Preset
                          </span>
                          <div className="grid grid-cols-4 gap-1 px-1">
                            {(
                              ["vlc", "netflix", "anime", "minimal"] as const
                            ).map((preset) => (
                              <button
                                key={preset}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectPreset(preset);
                                }}
                                className={`text-center py-1 text-[9px] rounded transition-colors font-bold capitalize ${
                                  prefs.preset === preset
                                    ? "text-black bg-white"
                                    : "text-white/60 hover:text-white hover:bg-white/10"
                                }`}
                              >
                                {preset === "vlc" ? "VLC" : preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font Size Selection */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold px-1">
                            Font Size
                          </span>
                          <div className="grid grid-cols-5 gap-1 px-1">
                            {[
                              { label: "75%", value: 0.75 },
                              { label: "100%", value: 1.0 },
                              { label: "125%", value: 1.25 },
                              { label: "150%", value: 1.5 },
                              { label: "200%", value: 2.0 },
                            ].map((sz) => (
                              <button
                                key={sz.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePreference("size", sz.value);
                                }}
                                className={`text-center py-1 text-[9px] rounded transition-colors font-bold ${
                                  prefs.size === sz.value
                                    ? "text-black bg-white"
                                    : "text-white/60 hover:text-white hover:bg-white/10"
                                }`}
                              >
                                {sz.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font Color Selection */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold px-1">
                            Font Color
                          </span>
                          <div className="flex items-center gap-2 px-2">
                            {[
                              { name: "White", value: "#ffffff" },
                              { name: "Yellow", value: "#ffff00" },
                              { name: "Green", value: "#00ff00" },
                              { name: "Cyan", value: "#00e5ff" },
                              { name: "Red", value: "#e50914" },
                            ].map((color) => (
                              <button
                                key={color.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePreference("color", color.value);
                                }}
                                className={`w-5 h-5 rounded-full border transition-all ${
                                  prefs.color === color.value
                                    ? "ring-2 ring-nebula-cyan border-black scale-110"
                                    : "border-white/20 hover:scale-105"
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Background & Opacity */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">
                              Background Color
                            </span>
                            <div className="flex items-center gap-1.5">
                              {[
                                { name: "Black", value: "#000000" },
                                { name: "Dark Gray", value: "#1a1a1a" },
                                { name: "Blue", value: "#0000ff" },
                              ].map((color) => (
                                <button
                                  key={color.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePreference("bgColor", color.value);
                                  }}
                                  className={`w-3.5 h-3.5 rounded-sm border transition-all ${
                                    prefs.bgColor === color.value
                                      ? "border-nebula-cyan scale-110"
                                      : "border-white/20 hover:scale-105"
                                  }`}
                                  style={{ backgroundColor: color.value }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold px-1">
                              Background Opacity
                            </span>
                            <div className="grid grid-cols-5 gap-1 px-1">
                              {[0.0, 0.25, 0.5, 0.75, 1.0].map((op) => (
                                <button
                                  key={op}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePreference("bgOpacity", op);
                                  }}
                                  className={`text-center py-1 text-[9px] rounded transition-colors font-bold ${
                                    prefs.bgOpacity === op
                                      ? "text-black bg-white"
                                      : "text-white/60 hover:text-white hover:bg-white/10"
                                  }`}
                                >
                                  {op * 100}%
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Outline Width */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold px-1">
                            Outline Width
                          </span>
                          <div className="grid grid-cols-4 gap-1 px-1">
                            {["0px", "1px", "2px", "3px"].map((width) => (
                              <button
                                key={width}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePreference("outlineWidth", width);
                                }}
                                className={`text-center py-1 text-[9px] rounded transition-colors font-bold ${
                                  prefs.outlineWidth === width
                                    ? "text-black bg-white"
                                    : "text-white/60 hover:text-white hover:bg-white/10"
                                }`}
                              >
                                {width}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Accessibility Toggle */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-2 px-1">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">
                            Use Native Subtitles
                          </span>
                          <input
                            type="checkbox"
                            checked={prefs.useNativeSubtitles}
                            onChange={(e) => {
                              e.stopPropagation();
                              updatePreference(
                                "useNativeSubtitles",
                                e.target.checked,
                              );
                            }}
                            className="cursor-pointer accent-nebula-cyan w-3.5 h-3.5 rounded border-white/20 bg-white/5"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Switch Source */}
                  <div className="mt-1 border-t border-white/10 pt-2 px-2">
                    <button
                      onClick={() => {
                        setShowSettings(false);
                        setSourceSelect({
                          season: season ?? 1,
                          episode: episode ?? 1,
                        });
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-[11px] text-nebula-cyan/80 hover:text-nebula-cyan hover:bg-nebula-cyan/10 rounded-md transition-colors"
                    >
                      <Tv size={13} />
                      <span>Switch Source</span>
                    </button>
                  </div>
                  {/* Reload Stream — recovers from stuck seek/fast-forward */}
                  <div className="mt-1 border-t border-white/10 pt-2 px-2">
                    <button
                      id="reload-stream-btn"
                      onClick={() => {
                        // Save current position so it can be restored after reload
                        const v = videoRef.current;
                        if (v && v.currentTime > 5 && v.duration > 0) {
                          const progressKey =
                            movie.type === "tv" &&
                            season !== undefined &&
                            episode !== undefined
                              ? `${movie.id}-S${season}E${episode}`
                              : String(movie.id);
                          const all = JSON.parse(
                            localStorage.getItem("nebula-progress") || "{}",
                          );
                          all[progressKey] = {
                            time: v.currentTime,
                            duration: v.duration,
                            timestamp: Date.now(),
                          };
                          localStorage.setItem(
                            "nebula-progress",
                            JSON.stringify(all),
                          );
                        }
                        setShowSettings(false);
                        showToast("Reloading stream…", "info");
                        setStreamReloadKey((k) => k + 1);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-[11px] text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 rounded-md transition-colors"
                    >
                      <RefreshCw size={13} />
                      <span>Reload Stream</span>
                    </button>
                  </div>
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
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-80 bg-obsidian border-l border-white/10 z-[300] shadow-2xl flex flex-col pointer-events-auto"
            >
              <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white italic">
                    Episode Relay
                  </h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-tighter">
                    Season {season}
                  </p>
                </div>
                <button
                  onClick={() => setShowEpisodeDrawer(false)}
                  className="w-9 h-9 rounded-full bg-white/5 text-white/40 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {/* We map current season episodes if available */}
                {tvDetails?.seasons?.find(
                  (s: any) => s.season_number === season,
                )?.episode_count ? (
                  Array.from({
                    length: tvDetails.seasons.find(
                      (s: any) => s.season_number === season,
                    ).episode_count,
                  }).map((_, i) => {
                    const epNum = i + 1;
                    return (
                      <button
                        key={epNum}
                        onClick={() => {
                          setSourceSelect({ season: season!, episode: epNum });
                          setShowEpisodeDrawer(false);
                        }}
                        className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 group ${episode === epNum ? "bg-nebula-cyan/20 border border-nebula-cyan/30" : "hover:bg-white/5 border border-transparent"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black italic text-xs transition-colors ${episode === epNum ? "bg-nebula-cyan text-obsidian" : "bg-white/10 text-white/40 group-hover:bg-white/20"}`}
                        >
                          {epNum}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-bold ${episode === epNum ? "text-white" : "text-white/60 group-hover:text-white"}`}
                          >
                            Episode {epNum}
                          </p>
                          <p className="text-[10px] text-white/20 uppercase tracking-widest">
                            Uplink Stable
                          </p>
                        </div>
                        {episode === epNum && (
                          <div className="w-1.5 h-1.5 rounded-full bg-nebula-cyan animate-pulse shadow-[0_0_10px_rgba(46,204,113,0.8)]" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <Loader2 size={24} className="animate-spin text-white/10" />
                    <p className="text-xs text-white/20 uppercase tracking-widest">
                      Hydrating episode list...
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* ── In-Player Source Picker ── */}
      <AnimatePresence>
        {sourceSelect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3"
            onClick={() => setSourceSelect(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div>
                  <p className="text-[10px] text-nebula-cyan uppercase tracking-widest font-black">
                    Stream Source
                  </p>
                  <p className="text-sm font-bold text-white">
                    {movie.title}
                    {movie.type === "tv" &&
                      ` · S${sourceSelect.season}E${sourceSelect.episode}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Previous Episode Button */}
                  {movie.type === "tv" &&
                    (() => {
                      const prevEp = getPreviousEpisodeFor(
                        sourceSelect.season,
                        sourceSelect.episode,
                      );
                      return (
                        <button
                          onClick={() => {
                            if (prevEp) {
                              setSourceSelect(prevEp);
                              setForceRefetchTrigger(0);
                            }
                          }}
                          disabled={!prevEp}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                            prevEp
                              ? "bg-white/5 hover:bg-white/10 text-white border-white/5"
                              : "bg-white/5 text-white/20 border-transparent opacity-40 cursor-not-allowed"
                          }`}
                          title={
                            prevEp
                              ? `Previous Episode (S${prevEp.season}E${prevEp.episode})`
                              : "No Previous Episode"
                          }
                        >
                          <ChevronLeft size={16} />
                        </button>
                      );
                    })()}

                  {/* Refetch Button */}
                  <button
                    onClick={() => setForceRefetchTrigger((t) => t + 1)}
                    disabled={sourcesLoading}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95 border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Force refetch all sources"
                  >
                    <RefreshCw
                      size={14}
                      className={
                        sourcesLoading ? "animate-spin text-nebula-cyan" : ""
                      }
                    />
                  </button>

                  {/* Next Episode Button */}
                  {movie.type === "tv" &&
                    (() => {
                      const nextEp = getNextEpisodeFor(
                        sourceSelect.season,
                        sourceSelect.episode,
                      );
                      return (
                        <button
                          onClick={() => {
                            if (nextEp) {
                              setSourceSelect(nextEp);
                              setForceRefetchTrigger(0);
                            }
                          }}
                          disabled={!nextEp}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                            nextEp
                              ? "bg-white/5 hover:bg-white/10 text-white border-white/5"
                              : "bg-white/5 text-white/20 border-transparent opacity-40 cursor-not-allowed"
                          }`}
                          title={
                            nextEp
                              ? `Next Episode (S${nextEp.season}E${nextEp.episode})`
                              : "No More Episodes"
                          }
                        >
                          <ChevronRight size={16} />
                        </button>
                      );
                    })()}

                  <button
                    onClick={() => setSourceSelect(null)}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Cards — horizontal on landscape, stacked on portrait */}
              <InPlayerSourcePicker
                movie={movie}
                season={sourceSelect.season}
                episode={sourceSelect.episode}
                forceRefetchTrigger={forceRefetchTrigger}
                onLoadingChange={setSourcesLoading}
                activeSource={
                  mirrors[activeMirror]
                    ? parseMirrorDetails(mirrors[activeMirror].source).category
                    : ""
                }
                onSelect={(src) => {
                  setSourceSelect(null);
                  const queryParams = new URLSearchParams();
                  if (movie.type === "tv") {
                    queryParams.set("season", String(sourceSelect.season));
                    queryParams.set("episode", String(sourceSelect.episode));
                  }
                  if (src) {
                    queryParams.set("source", src);
                  }
                  const queryString = queryParams.toString();
                  navigate(
                    `/watch/${movie.type || "movie"}/${movie.id}${queryString ? `?${queryString}` : ""}`,
                  );
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Compact source picker used inside the media player ────────────────────────
export function InPlayerSourcePicker({
  movie,
  season,
  episode,
  forceRefetchTrigger,
  onLoadingChange,
  activeSource,
  onSelect,
}: {
  movie: any;
  season?: number;
  episode?: number;
  forceRefetchTrigger: number;
  onLoadingChange: (loading: boolean) => void;
  activeSource?: string;
  onSelect: (src?: string) => void;
}) {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [videasySources, setVideasySources] = useState<any[]>([]);
  const [videasyLoading, setVideasyLoading] = useState(true);
  const [videasyError, setVideasyError] = useState("");

  const [filmuSources, setFilmuSources] = useState<any[]>([]);
  const [filmuLoading, setFilmuLoading] = useState(true);
  const [filmuError, setFilmuError] = useState("");

  const [vidnestSources, setVidnestSources] = useState<any[]>([]);
  const [vidnestLoading, setVidnestLoading] = useState(true);
  const [vidnestError, setVidnestError] = useState("");

  // Keep latest onLoadingChange ref to avoid triggering effect loops
  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);

  useEffect(() => {
    onLoadingChangeRef.current?.(
      loading || videasyLoading || filmuLoading || vidnestLoading,
    );
  }, [loading, videasyLoading, filmuLoading, vidnestLoading]);

  const fetchSources = useCallback(
    (force = false, isBackground = false) => {
      if (!isBackground) {
        setLoading(true);
        setError("");
        setVideasyLoading(true);
        setVideasyError("");
        setFilmuLoading(true);
        setFilmuError("");
        setVidnestLoading(true);
        setVidnestError("");
      }

      const forceParam = force ? "&force=1" : "";

      // 1. VidRock Fetch
      let vidrockUrl = `${API}/api/vidrock?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) vidrockUrl += `&season=${season}`;
      if (episode !== undefined) vidrockUrl += `&episode=${episode}`;

      const pVidrock = fetch(vidrockUrl)
        .then((r) => {
          if (!r.ok) throw new Error("Uplink scan failed");
          return r.json();
        })
        .then((data) => {
          const list = Object.entries(data)
            .filter(([, v]: any) => v && v.url)
            .map(([name, v]: any) => ({
              name: name.startsWith("VidRock") ? name : `VidRock (${name})`,
              url: v.url,
              type: v.type || "hls",
            }));
          setSources(list);
          if (!isBackground) setError("");
        })
        .catch((e) => {
          if (!isBackground) setError(e.message);
        })
        .finally(() => {
          if (!isBackground) setLoading(false);
        });

      // 2. Videasy Fetch
      let videasyUrl = `${API}/api/videasy?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}&releaseYear=${movie.year || ""}${forceParam}`;
      if (season !== undefined) videasyUrl += `&season=${season}`;
      if (episode !== undefined) videasyUrl += `&episode=${episode}`;

      const pVideasy = fetch(videasyUrl)
        .then((r) => {
          if (!r.ok) throw new Error("Videasy scan failed");
          return r.json();
        })
        .then((data) => {
          const list = Object.entries(data)
            .filter(([, v]: any) => v && v.url)
            .map(([name, v]: any) => ({
              name: name.startsWith("Videasy") ? name : `Videasy (${name})`,
              url: v.url,
              type: v.type || "hls",
              audio: v.audio || "",
            }));
          setVideasySources(list);
          if (!isBackground) setVideasyError("");
        })
        .catch((e) => {
          if (!isBackground) setVideasyError(e.message);
        })
        .finally(() => {
          if (!isBackground) setVideasyLoading(false);
        });

      // 3. FilmU Fetch
      let filmuUrl = `${API}/api/filmu?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}&releaseYear=${movie.year || ""}${forceParam}`;
      if (season !== undefined) filmuUrl += `&season=${season}`;
      if (episode !== undefined) filmuUrl += `&episode=${episode}`;

      const pFilmu = fetch(filmuUrl)
        .then((r) => {
          if (!r.ok) throw new Error("FilmU scan failed");
          return r.json();
        })
        .then((data) => {
          const list = Object.entries(data)
            .filter(([, v]: any) => v && v.url)
            .map(([name, v]: any) => ({
              name,
              url: v.url,
              type: v.type || "hls",
              quality: (v as any).quality || "Auto",
            }));
          setFilmuSources(list);
          if (!isBackground) setFilmuError("");
        })
        .catch((e) => {
          if (!isBackground) setFilmuError(e.message);
        })
        .finally(() => {
          if (!isBackground) setFilmuLoading(false);
        });

      // 4. Vidnest Fetch
      let vidnestUrl = `${API}/api/vidnest?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) vidnestUrl += `&season=${season}`;
      if (episode !== undefined) vidnestUrl += `&episode=${episode}`;

      const pVidnest = fetch(vidnestUrl)
        .then((r) => {
          if (!r.ok) throw new Error("Vidnest scan failed");
          return r.json();
        })
        .then((data) => {
          const list = Object.entries(data)
            .filter(([, v]: any) => v && v.url)
            .map(([name, v]: any) => ({
              name,
              url: v.url,
              type: v.type || "mp4",
              quality: (v as any).quality || "Auto",
            }));
          setVidnestSources(list);
          if (!isBackground) setVidnestError("");
        })
        .catch((e) => {
          if (!isBackground) setVidnestError(e.message);
        })
        .finally(() => {
          if (!isBackground) setVidnestLoading(false);
        });

      return Promise.all([pVidrock, pVideasy, pFilmu, pVidnest]);
    },
    [movie.id, movie.type, season, episode, movie.title, movie.year],
  );

  useEffect(() => {
    let cancelled = false;

    const force = forceRefetchTrigger > 0;

    const runFetch = async (isForce: boolean, isBg: boolean) => {
      if (cancelled) return;
      await fetchSources(isForce, isBg);
    };

    runFetch(force, false);

    // Progressive background sync at 10s, 20s, and 45s
    const syncIntervals = [10000, 20000, 45000];
    const timers = syncIntervals.map((delay) =>
      setTimeout(() => {
        runFetch(false, true);
      }, delay),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [fetchSources, forceRefetchTrigger, season, episode]);

  const vidrockUrl = sources
    .map((s) => (s.url.includes("#") ? s.url : `${s.url}#${s.name}#${s.type}`))
    .join("|");
  const videasyUrl = videasySources
    .map((s) =>
      s.url.includes("#")
        ? s.url
        : `${s.url}#${s.name}#${s.type}#${s.audio || ""}`,
    )
    .join("|");
  const filmuUrl = filmuSources
    .map((s) =>
      s.url.includes("#")
        ? s.url
        : `${s.url}#${s.name}#${s.type}#${s.quality || "Auto"}`,
    )
    .join("|");
  const vidnestUrl = vidnestSources
    .map((s) =>
      s.url.includes("#")
        ? s.url
        : `${s.url}#${s.name}#${s.type}#${s.quality || "Auto"}`,
    )
    .join("|");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 overflow-y-auto max-h-[70vh]">
      {/* VidRock */}
      <button
        onClick={() => sources.length > 0 && onSelect(vidrockUrl)}
        disabled={loading || sources.length === 0 || activeSource === "VidRock"}
        className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all ${
          activeSource === "VidRock"
            ? "border-nebula-cyan bg-nebula-cyan/10 shadow-[0_0_15px_rgba(0,229,255,0.12)] ring-1 ring-nebula-cyan/35 scale-[1.01] cursor-default"
            : loading
              ? "border-white/5 bg-white/2 opacity-60 cursor-wait"
              : sources.length > 0
                ? "border-nebula-cyan/30 bg-nebula-cyan/5 hover:bg-nebula-cyan/10 active:scale-95 cursor-pointer"
                : "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-nebula-cyan/15 flex items-center justify-center text-nebula-cyan">
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Info size={14} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-white uppercase tracking-tight">
                VidRock
              </p>
              {activeSource === "VidRock" && (
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-nebula-cyan text-obsidian uppercase tracking-wider font-sans">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[8px] text-white/40 uppercase">
              {loading ? "Scanning..." : "High-Speed"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {loading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse">
              Running uplink check...
            </span>
          ) : sources.length > 0 ? (
            sources.map((s) => (
              <span
                key={s.name}
                className="text-[7px] font-bold px-1 py-0.5 rounded border border-nebula-cyan/20 text-nebula-cyan/80 bg-nebula-cyan/5 uppercase"
              >
                {s.name
                  .replace(/^VidRock\s*\((.*?)\)$/i, "$1")
                  .replace(/^VidRock/i, "")
                  .trim()
                  .toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-rose-400 uppercase">
              {error || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* Videasy */}
      <button
        onClick={() => videasySources.length > 0 && onSelect(videasyUrl)}
        disabled={videasyLoading || videasySources.length === 0 || activeSource === "Videasy"}
        className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all ${
          activeSource === "Videasy"
            ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.12)] ring-1 ring-indigo-500/35 scale-[1.01] cursor-default"
            : videasyLoading
              ? "border-white/5 bg-white/2 opacity-60 cursor-wait"
              : videasySources.length > 0
                ? "border-indigo-500/35 bg-indigo-500/5 hover:bg-indigo-500/10 active:scale-95 cursor-pointer"
                : "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
            {videasyLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Tv size={14} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-white uppercase tracking-tight">
                Videasy
              </p>
              {activeSource === "Videasy" && (
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-indigo-500 text-white uppercase tracking-wider font-sans">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[8px] text-white/40 uppercase">
              {videasyLoading ? "Decrypting..." : "Decrypted"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {videasyLoading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse">
              Running decrypt scan...
            </span>
          ) : videasySources.length > 0 ? (
            <>
              {videasySources.slice(0, 3).map((s) => (
                <span
                  key={s.name}
                  className="text-[7px] font-bold px-1 py-0.5 rounded border border-indigo-500/20 text-indigo-400/80 bg-indigo-500/5 uppercase"
                >
                  {s.name
                    .replace(/^Videasy\s*\((.*?)\)$/i, "$1")
                    .replace(/^Videasy/i, "")
                    .trim()
                    .toUpperCase()}
                </span>
              ))}
              {videasySources.length > 3 && (
                <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-white/10 text-white/40 bg-white/5 uppercase">
                  +{videasySources.length - 3}
                </span>
              )}
            </>
          ) : (
            <span className="text-[8px] text-rose-400 uppercase">
              {videasyError || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* FilmU */}
      <button
        onClick={() => filmuSources.length > 0 && onSelect(filmuUrl)}
        disabled={filmuLoading || filmuSources.length === 0 || activeSource === "FilmU"}
        className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all ${
          activeSource === "FilmU"
            ? "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.12)] ring-1 ring-amber-500/35 scale-[1.01] cursor-default"
            : filmuLoading
              ? "border-white/5 bg-white/2 opacity-60 cursor-wait"
              : filmuSources.length > 0
                ? "border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10 active:scale-95 cursor-pointer"
                : "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
            {filmuLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Info size={14} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-white uppercase tracking-tight">
                FilmU
              </p>
              {activeSource === "FilmU" && (
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-obsidian uppercase tracking-wider font-sans">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[8px] text-white/40 uppercase">
              {filmuLoading ? "Scanning..." : "Active"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {filmuLoading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse">
              Running uplink check...
            </span>
          ) : filmuSources.length > 0 ? (
            filmuSources.map((s) => (
              <span
                key={s.name}
                className="text-[7px] font-bold px-1 py-0.5 rounded border border-amber-500/20 text-amber-400/80 bg-amber-500/5 uppercase"
              >
                {s.name
                  .replace(/^FilmU[\s-]*/i, "")
                  .trim()
                  .toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-rose-400 uppercase">
              {filmuError || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* Vidnest */}
      <button
        onClick={() => vidnestSources.length > 0 && onSelect(vidnestUrl)}
        disabled={vidnestLoading || vidnestSources.length === 0 || activeSource === "Vidnest"}
        className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all ${
          activeSource === "Vidnest"
            ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/35 scale-[1.01] cursor-default"
            : vidnestLoading
              ? "border-white/5 bg-white/2 opacity-60 cursor-wait"
              : vidnestSources.length > 0
                ? "border-emerald-500/35 bg-emerald-500/5 hover:bg-emerald-500/10 active:scale-95 cursor-pointer"
                : "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            {vidnestLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-white uppercase tracking-tight">
                Vidnest
              </p>
              {activeSource === "Vidnest" && (
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-obsidian uppercase tracking-wider font-sans">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[8px] text-white/40 uppercase">
              {vidnestLoading ? "Scanning..." : "Active"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {vidnestLoading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse">
              Running uplink check...
            </span>
          ) : vidnestSources.length > 0 ? (
            vidnestSources.map((s) => (
              <span
                key={s.name}
                className="text-[7px] font-bold px-1 py-0.5 rounded border border-emerald-500/20 text-emerald-400/80 bg-emerald-500/5 uppercase"
              >
                {s.name
                  .replace(/^Vidnest[\s-]*/i, "")
                  .trim()
                  .toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-rose-400 uppercase">
              {vidnestError || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* VidLink */}
      <button
        onClick={() => onSelect()}
        disabled={activeSource === "VidLink"}
        className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all ${
          activeSource === "VidLink"
            ? "border-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.12)] ring-1 ring-white/35 scale-[1.01] cursor-default"
            : "border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/60">
            <Search size={14} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-white uppercase tracking-tight">
                VidLink
              </p>
              {activeSource === "VidLink" && (
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white text-obsidian uppercase tracking-wider font-sans">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[8px] text-white/40 uppercase">Standard</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border border-white/15 text-white/50 bg-white/5 uppercase">
            Auto-Failover
          </span>
        </div>
      </button>
    </div>
  );
}
