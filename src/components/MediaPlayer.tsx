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
  SkipForward,
  Cloud,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useSubtitleManager } from "../hooks/useSubtitleManager";
import { SubtitleOverlay } from "./SubtitleOverlay";

import { API_BASE_URL } from "../config";
import { handleClearLogoError } from "../utils/helpers";
import { fetchVideasySourcesDirect } from "../services/videasy";
import {
  type SkipSegment,
  parseIntroDBResponse,
  getActiveSkipSegment,
  getSkipLabel,
  getSkipDismissKey,
} from "../lib/skipSegments";
const API = API_BASE_URL;
const SKIP_BUTTON_DURATION = 8;

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
  if (cleanSource.startsWith("Vaplayer")) {
    const rest = cleanSource.replace(/^Vaplayer[\s-]*/i, "").trim();
    return {
      category: "Vaplayer",
      name: ((rest || "Mirror") + suffix).toUpperCase(),
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
  if (cleanSource.startsWith("Peachify")) {
    return {
      category: "Peachify",
      name: (
        (cleanSource.replace(/^Peachify[\s-]*/i, "").trim() || "Mirror") + suffix
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

export const CATEGORY_PRIORITY = [
  "VidRock",
  "Peachify",
  "Vaplayer",
  "Videasy",
  "Vidrift",
  "Vidnest",
  "FilmU",
  "VidLink",
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
    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // Tie-breaker: sort by provider category priority (e.g. direct VidRock first)
    const { category: catA } = parseMirrorDetails(a.source);
    const { category: catB } = parseMirrorDetails(b.source);
    const cleanCatA = catA.toLowerCase();
    const cleanCatB = catB.toLowerCase();

    const catIdxA = CATEGORY_PRIORITY.findIndex((c) =>
      cleanCatA.startsWith(c.toLowerCase()),
    );
    const catIdxB = CATEGORY_PRIORITY.findIndex((c) =>
      cleanCatB.startsWith(c.toLowerCase()),
    );

    const catPrioA = catIdxA !== -1 ? catIdxA : 999;
    const catPrioB = catIdxB !== -1 ? catIdxB : 999;

    return catPrioA - catPrioB;
  });
};

const groupMirrors = (mirrorsList: any[]) => {
  const groups: Record<string, any> = {};

  mirrorsList.forEach((m) => {
    if (m.type !== "mp4" && m.type !== "hls") {
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
        type: m.type === "hls" ? "hls_grouped" : "mp4_grouped",
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
    if (group.type === "mp4_grouped" || group.type === "hls_grouped") {
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
  const [logoFailed, setLogoFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
    hasAutoRetriedRef.current = false;
    failedSourcesRef.current.clear();
    setFailedSourcesList([]);
  }, [movie?.id, season, episode]);
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
  const handleNextEpisodeRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showServerTip, setShowServerTip] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showServersModal, setShowServersModal] = useState(false);
  const [showSubStyles, setShowSubStyles] = useState(false);
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
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartDistRef = useRef<number | null>(null);
  const isPinchActiveRef = useRef(false);
  // Source selection triggered from Next/episode drawer
  const [sourceSelect, setSourceSelect] = useState<{
    season: number;
    episode: number;
  } | null>(null);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownVal, setCountdownVal] = useState(10);
  const [isAutoplayCancelled, setIsAutoplayCancelled] = useState(false);

  const countdownActiveRef = useRef(false);
  useEffect(() => {
    countdownActiveRef.current = countdownActive;
  }, [countdownActive]);

  const isAutoplayCancelledRef = useRef(false);
  useEffect(() => {
    isAutoplayCancelledRef.current = isAutoplayCancelled;
  }, [isAutoplayCancelled]);

  const [forceRefetchTrigger, setForceRefetchTrigger] = useState(0);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [qualityTag, setQualityTag] = useState<string>(""); // CAM | WEBDL | WEBRIP | BLURAY | etc.
  const [resolution, setResolution] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "info";
  } | null>(null);
  const [failedMirrors, setFailedMirrors] = useState<Record<string, string>>(
    {},
  );
  const failedSourcesRef = useRef<Set<string>>(new Set());
  const [failedSourcesList, setFailedSourcesList] = useState<string[]>([]);

  // ── TheIntroDB skip segments ─────────────────────────────────────────────
  const [skipSegments, setSkipSegments] = useState<SkipSegment[]>([]);
  const [activeSkip, setActiveSkip] = useState<SkipSegment | null>(null);
  const [dismissedSkips, setDismissedSkips] = useState<Set<string>>(new Set());
  const skipSegmentsRef = useRef<SkipSegment[]>([]);
  const dismissedSkipsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    skipSegmentsRef.current = skipSegments;
  }, [skipSegments]);
  useEffect(() => {
    dismissedSkipsRef.current = dismissedSkips;
  }, [dismissedSkips]);

  // ── Skip countdown timer (Netflix style) ──────────────────────────────────
  const [skipTimer, setSkipTimer] = useState(SKIP_BUTTON_DURATION);
  const [isSkipHovered, setIsSkipHovered] = useState(false);

  useEffect(() => {
    if (!activeSkip) {
      setIsSkipHovered(false);
      return;
    }

    if (isSkipHovered) {
      return; // Pause the countdown when hovered
    }

    const timer = setInterval(() => {
      setSkipTimer((t) => {
        if (t <= 0.1) {
          // Timer finished -> auto-dismiss the skip button
          setDismissedSkips((prev) => {
            const next = new Set(prev);
            next.add(getSkipDismissKey(activeSkip));
            return next;
          });
          setActiveSkip(null);
          return SKIP_BUTTON_DURATION;
        }
        return t - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [activeSkip, isSkipHovered]);

  useEffect(() => {
    if (activeSkip) {
      setSkipTimer(SKIP_BUTTON_DURATION);
    }
  }, [activeSkip?.type, activeSkip?.startSec]);

  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{
    visible: boolean;
    type: "rewind" | "forward";
    x: number;
    y: number;
    key: number;
    seconds: number;
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

  const reportDeadMirror = useCallback(
    (url: string) => {
      fetch(`${API}/api/stream/report-dead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: movie.id.toString(),
          type: movie.type,
          season: season || 1,
          episode: episode || 1,
          url,
        }),
      }).catch((err) => {
        console.warn("[PLAYER] Failed to report dead mirror:", err);
      });
    },
    [movie.id, movie.type, season, episode],
  );

  const [mirrors, setMirrors] = useState<any[]>([]);
  const [activeMirror, setActiveMirror] = useState<number>(0);
  const selectMirror = useCallback((index: number, mirrorsList: any[]) => {
    const m = mirrorsList[index];
    if (!m) return;
    setActiveMirror(index);
    activeMirrorRef.current = index;
    if (m.source) {
      try {
        localStorage.setItem("nebula-preferred-source", m.source);
      } catch (e) {}
    }
    setFailedMirrors((prev) => {
      const next = { ...prev };
      delete next[m.source];
      return next;
    });
    setStreamUrl(m.url);
    setIsEmbed(m.type === "embed");
    lastFragLoadedTime.current = Date.now();

    if ((m.type === "mp4_grouped" || m.type === "hls_grouped") && m.qualities) {
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

  const getNextFallbackMirrorIndex = useCallback(
    (
      currentIdx: number,
      mirrorsList: any[],
      failedMap: Record<string, string>,
      newlyFailedSource?: string,
    ): number => {
      if (mirrorsList.length <= 1) return -1;
      for (let i = 1; i < mirrorsList.length; i++) {
        const candidateIdx = (currentIdx + i) % mirrorsList.length;
        const candidate = mirrorsList[candidateIdx];
        if (candidate) {
          const isFailed =
            failedMap[candidate.source] !== undefined ||
            candidate.source === newlyFailedSource;
          if (!isFailed) {
            return candidateIdx;
          }
        }
      }
      return -1;
    },
    [],
  );
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
  const [isSeeking, setIsSeeking] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const dragProgressRef = useRef(0);
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
  const isLocalSeekingRef = useRef(false);
  const localCurrentTimeRef = useRef(0);
  const seekFlagTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hasReportedSuccess = useRef(false);
  const frag0LoadRetries = useRef(0);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serverTipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeFragLoads = useRef(0);
  const lastFragLoadedTime = useRef(0);
  const hasAutoRetriedRef = useRef(false);

  const getSourceCategory = useCallback((mirrorsList: any[]): string => {
    if (!mirrorsList || mirrorsList.length === 0) return "VidLink";
    const first = mirrorsList[0];
    const name = (first.source || first.name || "").toLowerCase();
    if (name.startsWith("vidrock")) return "VidRock";
    if (name.startsWith("peachify")) return "Peachify";
    if (name.startsWith("videasy")) return "Videasy";
    if (name.startsWith("filmu")) return "FilmU";
    if (name.startsWith("vidnest")) return "Vidnest";
    if (name.startsWith("vaplayer")) return "Vaplayer";
    if (name.startsWith("vidrift")) return "Vidrift";
    if (name.startsWith("vidlink")) return "VidLink";
    return "VidLink";
  }, []);

  const fetchSourceMirrors = useCallback(
    async (category: string, force: boolean) => {
      console.log(
        `[PLAYER] Fetching mirrors for category: ${category} (force=${force})...`,
      );
      const forceParam = force ? "&force=1" : "";
      let data: any = null;

      if (category === "Videasy") {
        data = await fetchVideasySourcesDirect(movie, season, episode, API);
      } else {
        let fetchUrl = "";
        if (category === "VidRock") {
          fetchUrl = `${API}/api/vidrock?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
          if (season !== undefined) fetchUrl += `&season=${season}`;
          if (episode !== undefined) fetchUrl += `&episode=${episode}`;
        } else if (category === "FilmU") {
          fetchUrl = `${API}/api/filmu?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}&releaseYear=${movie.year || ""}${forceParam}`;
          if (season !== undefined) fetchUrl += `&season=${season}`;
          if (episode !== undefined) fetchUrl += `&episode=${episode}`;
        } else if (category === "Vidnest") {
          fetchUrl = `${API}/api/vidnest?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
          if (season !== undefined) fetchUrl += `&season=${season}`;
          if (episode !== undefined) fetchUrl += `&episode=${episode}`;
        } else if (category === "Vaplayer") {
          fetchUrl = `${API}/api/vaplayer?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
          if (season !== undefined) fetchUrl += `&season=${season}`;
          if (episode !== undefined) fetchUrl += `&episode=${episode}`;
        } else if (category === "Vidrift") {
          fetchUrl = `${API}/api/vidrift?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
          if (season !== undefined) fetchUrl += `&season=${season}`;
          if (episode !== undefined) fetchUrl += `&episode=${episode}`;
        } else if (category === "Peachify") {
          fetchUrl = `${API}/api/peachify?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
          if (season !== undefined) fetchUrl += `&season=${season}`;
          if (episode !== undefined) fetchUrl += `&episode=${episode}`;
        } else {
          // VidLink
          fetchUrl = `${API}/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}&releaseYear=${movie.year || ""}&releaseDate=${movie.release_date || ""}${forceParam}`;
          if (season !== undefined) fetchUrl += `&season=${season}`;
          if (episode !== undefined) fetchUrl += `&episode=${episode}`;
        }

        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} from backend`);
        data = await res.json();
      }

      let updatedMirrors: any[] = [];
      if (category === "Videasy") {
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
      } else if (category === "VidRock") {
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
      } else if (category === "FilmU") {
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
      } else if (category === "Vidnest") {
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
      } else if (category === "Vaplayer") {
        updatedMirrors = Object.entries(data)
          .filter(([_, v]: any) => v && v.url)
          .map(([name, v]: any) => ({
            source: name.toLowerCase().startsWith("vaplayer")
              ? name
              : `Vaplayer (${name})`,
            url: v.url,
            type: v.type || "hls",
            quality: (v as any).quality || "Auto",
          }));
      } else if (category === "Vidrift") {
        updatedMirrors = Object.entries(data)
          .filter(([_, v]: any) => v && v.url)
          .map(([name, v]: any) => ({
            source: name.toLowerCase().startsWith("vidrift")
              ? name
              : `Vidrift (${name})`,
            url: v.url,
            type: v.type || "hls",
            quality: (v as any).quality || "Auto",
          }));
      } else if (category === "Peachify") {
        updatedMirrors = Object.entries(data)
          .filter(([_, v]: any) => v && v.url)
          .map(([name, v]: any) => ({
            source: name.toLowerCase().startsWith("peachify")
              ? name
              : `Peachify (${name})`,
            url: v.url,
            type: v.type || "hls",
            quality: (v as any).quality || "Auto",
          }));
      } else {
        // VidLink
        const results = Array.isArray(data) ? data : data.results || [];
        updatedMirrors = results.map((m: any) => ({
          source: m.source || "VidLink",
          url: m.url,
          type: m.type || "hls",
          quality: m.quality || "Auto",
        }));
      }

      return updatedMirrors;
    },
    [
      movie.id,
      movie.type,
      movie.title,
      movie.year,
      movie.release_date,
      season,
      episode,
    ],
  );

  const SOURCE_PRIORITY = [
    "VidRock",
    "Peachify",
    "Vaplayer",
    "Videasy",
    "Vidrift",
    "Vidnest",
    "FilmU",
    "VidLink",
  ];

  const switchToNextSource = useCallback(async () => {
    const currentCategory = getSourceCategory(mirrorsRef.current);
    console.warn(
      `[PLAYER] Source ${currentCategory} exhausted. Attempting automatic fallback...`,
    );

    failedSourcesRef.current.add(currentCategory);
    setFailedSourcesList(Array.from(failedSourcesRef.current));

    const nextSource = SOURCE_PRIORITY.find(
      (src) => !failedSourcesRef.current.has(src),
    );
    if (nextSource) {
      console.log(
        `[PLAYER] Automatically switching to next available source: ${nextSource}`,
      );
      showToast(`Current source failed. Switching to ${nextSource}...`, "info");

      try {
        setLoading(true);
        setError("");

        // Fetch mirrors for the new source, with up to 2 retries (waiting 2.5s each) to allow slow backend background scrapers to populate cache
        let updatedMirrors = await fetchSourceMirrors(nextSource, false);
        if (!updatedMirrors || updatedMirrors.length === 0) {
          console.log(`[PLAYER] Source ${nextSource} returned no mirrors. Retrying to allow background scrape to cache...`);
          for (let attempt = 1; attempt <= 2; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            updatedMirrors = await fetchSourceMirrors(nextSource, false);
            if (updatedMirrors && updatedMirrors.length > 0) {
              console.log(`[PLAYER] Source ${nextSource} mirrors recovered on retry attempt ${attempt}!`);
              break;
            }
          }
        }

        if (updatedMirrors && updatedMirrors.length > 0) {
          // Sync URL params
          const queryParams = new URLSearchParams(window.location.search);
          const activeSrcString = updatedMirrors
            .map((s: any) => {
              const cleanUrl = s.url
                .replace(`${API}/api/proxy/stream?url=`, "")
                .replace(`${API}/api/proxy/segment?url=`, "");
              return `${cleanUrl}#${s.source}#${s.type}`;
            })
            .join("|");
          queryParams.set("source", activeSrcString);
          navigate(`${window.location.pathname}?${queryParams.toString()}`, {
            replace: true,
          });
        } else {
          // If the new source also has no mirrors after retries, recursively try the next one!
          failedSourcesRef.current.add(nextSource);
          setFailedSourcesList(Array.from(failedSourcesRef.current));
          await switchToNextSource();
        }
      } catch (err: any) {
        console.error(
          `[PLAYER] Failed to switch to source ${nextSource}:`,
          err,
        );
        failedSourcesRef.current.add(nextSource);
        setFailedSourcesList(Array.from(failedSourcesRef.current));
        await switchToNextSource();
      }
    } else {
      console.error("[PLAYER] All sources exhausted.");
      setError("All available sources failed. Please try again later.");
      setLoading(false);
    }
  }, [
    fetchSourceMirrors,
    getSourceCategory,
    selectMirror,
    navigate,
    showToast,
  ]);

  const reScrapeStream = useCallback(
    async (isAuto = false) => {
      if (isRefreshing) return;
      setIsRefreshing(true);
      setError("");

      const currentCategory = getSourceCategory(mirrorsRef.current);
      console.log(
        `[PLAYER] Re-scraping stream mirrors for ${currentCategory} (auto=${isAuto})...`,
      );

      try {
        setLoading(true);
        const updatedMirrors = await fetchSourceMirrors(currentCategory, true);

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
          setMirrors(newGrouped);
          mirrorsRef.current = newGrouped;
          setFailedMirrors({});
          setStreamUrl(null);
          setError("");
          setTimeout(() => {
            selectMirror(0, newGrouped);
            setLoading(false);
          }, 100);
        } else {
          throw new Error("No mirrors returned from fresh scrape");
        }
      } catch (err: any) {
        console.error("[PLAYER] Re-scrape failed:", err);
        if (isAuto) {
          await switchToNextSource();
        } else {
          setError("Failed to force refresh stream sources.");
          setLoading(false);
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [
      isRefreshing,
      getSourceCategory,
      fetchSourceMirrors,
      selectMirror,
      switchToNextSource,
    ],
  );

  const handleMirrorExhaustion = useCallback(
    async (errorMessage: string) => {
      if (!hasAutoRetriedRef.current) {
        hasAutoRetriedRef.current = true;
        await reScrapeStream(true);
      } else {
        await switchToNextSource();
      }
    },
    [reScrapeStream, switchToNextSource],
  );

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

  const seekBy = useCallback(
    (amount: number, customX?: number, customY?: number) => {
      const video = videoRef.current;
      if (!video) return;

      const isForward = amount > 0;
      const dir = isForward ? "forward" : "rewind";

      const duration = isFinite(video.duration) ? video.duration : 0;
      const newTime = Math.max(
        0,
        Math.min(
          duration || video.currentTime + amount,
          video.currentTime + amount,
        ),
      );

      // Set local seeking flag to prevent timeupdate from overriding UI
      isLocalSeekingRef.current = true;
      localCurrentTimeRef.current = newTime;

      // Update UI immediately (prevent rubberbanding)
      setCurrentTime(formatTime(newTime));
      setProgress((newTime / (duration || 1)) * 100);

      video.currentTime = newTime;

      // Reset seeking flag release timer
      if (seekFlagTimerRef.current) clearTimeout(seekFlagTimerRef.current);
      seekFlagTimerRef.current = setTimeout(() => {
        isLocalSeekingRef.current = false;
      }, 800);

      // Double Tap / Click / Key Feedback with Stacking
      const container = containerRef.current;
      const width = container ? container.clientWidth : window.innerWidth;
      const height = container ? container.clientHeight : window.innerHeight;

      const x =
        customX !== undefined
          ? customX
          : isForward
            ? (width * 3) / 4
            : width / 4;
      const y = customY !== undefined ? customY : height / 2;

      const now = Date.now();

      setDoubleTapFeedback((prev) => {
        const isStacking =
          prev && prev.visible && prev.type === dir && now - prev.key < 650;

        const newSeconds = isStacking
          ? prev.seconds + Math.abs(amount)
          : Math.abs(amount);

        return {
          visible: true,
          type: dir,
          x,
          y,
          key: now,
          seconds: newSeconds,
        };
      });
    },
    [],
  );

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
    setIsZoomed(false);
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
    setCountdownActive(false);
    setCountdownVal(10);
    setIsAutoplayCancelled(false);
    // Reset seek refs so the drift guard doesn't suppress the new stream's initial timeupdate
    isLocalSeekingRef.current = false;
    localCurrentTimeRef.current = 0;
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
        let startIndex = 0;
        try {
          const preferred = localStorage.getItem("nebula-preferred-source");
          if (preferred) {
            let matchIdx = grouped.findIndex((m) => m.source === preferred);
            if (matchIdx === -1) {
              const { name: prefServerName } = parseMirrorDetails(preferred);
              const cleanPrefServer = prefServerName.toLowerCase();
              if (
                cleanPrefServer &&
                cleanPrefServer !== "original" &&
                cleanPrefServer !== "mirror"
              ) {
                matchIdx = grouped.findIndex((m) => {
                  const { name: mServerName } = parseMirrorDetails(m.source);
                  const cleanMServer = mServerName.toLowerCase();
                  return (
                    cleanMServer.includes(cleanPrefServer) ||
                    cleanPrefServer.includes(cleanMServer)
                  );
                });
              }
            }
            if (matchIdx !== -1) {
              startIndex = matchIdx;
            }
          }
        } catch (e) {}
        selectMirror(startIndex, grouped);
        setLoading(false);

        // Fetch updated mirrors in the background progressively at 10s, 20s, and 45s to capture slow parallel scrapes
        const runSync = async () => {
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
          const isVaplayer = processedMirrors.some((m) =>
            m.source.toLowerCase().startsWith("vaplayer"),
          );
          const isVidrift = processedMirrors.some((m) =>
            m.source.toLowerCase().startsWith("vidrift"),
          );
          const isPeachify = processedMirrors.some((m) =>
            m.source.toLowerCase().startsWith("peachify"),
          );

          let dataPromise: Promise<any>;
          if (isVideasy) {
            dataPromise = fetchVideasySourcesDirect(
              movie,
              season,
              episode,
              API,
            );
          } else {
            let fetchUrl = "";
            if (isVidrock) {
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
            } else if (isVaplayer) {
              fetchUrl = `${API}/api/vaplayer?tmdbId=${movie.id}&type=${movie.type}`;
              if (season !== undefined) fetchUrl += `&season=${season}`;
              if (episode !== undefined) fetchUrl += `&episode=${episode}`;
            } else if (isVidrift) {
              fetchUrl = `${API}/api/vidrift?tmdbId=${movie.id}&type=${movie.type}`;
              if (season !== undefined) fetchUrl += `&season=${season}`;
              if (episode !== undefined) fetchUrl += `&episode=${episode}`;
            } else if (isPeachify) {
              fetchUrl = `${API}/api/peachify?tmdbId=${movie.id}&type=${movie.type}`;
              if (season !== undefined) fetchUrl += `&season=${season}`;
              if (episode !== undefined) fetchUrl += `&episode=${episode}`;
            }

            dataPromise = fetchUrl
              ? fetch(fetchUrl).then((r) => r.json())
              : Promise.reject(new Error("No URL"));
          }

          if (!cancelled) {
            dataPromise
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
                } else if (isVaplayer) {
                  updatedMirrors = Object.entries(data)
                    .filter(([_, v]: any) => v && v.url)
                    .map(([name, v]: any) => ({
                      source: name.toLowerCase().startsWith("vaplayer")
                        ? name
                        : `Vaplayer (${name})`,
                      url: v.url,
                      type: v.type || "hls",
                      quality: (v as any).quality || "Auto",
                    }));
                } else if (isVidrift) {
                  updatedMirrors = Object.entries(data)
                    .filter(([_, v]: any) => v && v.url)
                    .map(([name, v]: any) => ({
                      source: name.toLowerCase().startsWith("vidrift")
                        ? name
                        : `Vidrift (${name})`,
                      url: v.url,
                      type: v.type || "hls",
                      quality: (v as any).quality || "Auto",
                    }));
                } else if (isPeachify) {
                  updatedMirrors = Object.entries(data)
                    .filter(([_, v]: any) => v && v.url)
                    .map(([name, v]: any) => ({
                      source: name.toLowerCase().startsWith("peachify")
                        ? name
                        : `Peachify (${name})`,
                      url: v.url,
                      type: v.type || "hls",
                      quality: (v as any).quality || "Auto",
                      subtitles: v.subtitles || [],
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
          
          let startIndex = 0;
          try {
            const preferred = localStorage.getItem("nebula-preferred-source");
            if (preferred) {
              let matchIdx = grouped.findIndex((m) => m.source === preferred);
              if (matchIdx === -1) {
                const { name: prefServerName } = parseMirrorDetails(preferred);
                const cleanPrefServer = prefServerName.toLowerCase();
                if (
                  cleanPrefServer &&
                  cleanPrefServer !== "original" &&
                  cleanPrefServer !== "mirror"
                ) {
                  matchIdx = grouped.findIndex((m) => {
                    const { name: mServerName } = parseMirrorDetails(m.source);
                    const cleanMServer = mServerName.toLowerCase();
                    return (
                      cleanMServer.includes(cleanPrefServer) ||
                      cleanPrefServer.includes(cleanMServer)
                    );
                  });
                }
              }
              if (matchIdx !== -1) {
                startIndex = matchIdx;
              }
            }
          } catch (e) {}
          selectMirror(startIndex, grouped);

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

  // ── TheIntroDB skip-segment fetch with server-side caching ───────────────
  useEffect(() => {
    // Reset segments whenever the media changes
    setSkipSegments([]);
    setActiveSkip(null);
    setDismissedSkips(new Set());
    skipSegmentsRef.current = [];
    dismissedSkipsRef.current = new Set();

    let cancelled = false;

    // 1. Build cache request URL
    let cacheUrl = `${API}/api/introdb?tmdbId=${movie.id}&type=${movie.type}`;
    if (movie.type === "tv" && season !== undefined && episode !== undefined) {
      cacheUrl += `&season=${season}&episode=${episode}`;
    }

    // 2. Try fetching from the server cache first
    fetch(cacheUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Cache miss or server error");
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        const parsed = parseIntroDBResponse(data);
        setSkipSegments(parsed);
        skipSegmentsRef.current = parsed;
        console.log(
          `[PLAYER] Server Cache: loaded ${parsed.length} skip segment(s)`,
        );
        if (parsed.length === 0) {
          showToast("No skip segments available in IntroDB", "info");
        }
      })
      .catch(() => {
        if (cancelled) return;

        // 3. Fallback: Fetch directly from TheIntroDB API (client-side only to stay compliant)
        let externalUrl = `https://api.theintrodb.org/v3/media?tmdb_id=${movie.id}`;
        if (
          movie.type === "tv" &&
          season !== undefined &&
          episode !== undefined
        ) {
          externalUrl += `&season=${season}&episode=${episode}`;
        }

        fetch(externalUrl)
          .then((r) => {
            if (!r.ok) {
              showToast("No skip segments available in IntroDB", "info");
              return;
            }
            return r.json();
          })
          .then((data) => {
            if (cancelled || !data) return;
            const parsed = parseIntroDBResponse(data);
            setSkipSegments(parsed);
            skipSegmentsRef.current = parsed;
            if (parsed.length > 0) {
              console.log(
                `[PLAYER] IntroDB: loaded ${parsed.length} skip segment(s)`,
              );

              // 4. Save to our database in the background to build the cache
              fetch(`${API}/api/introdb`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tmdbId: movie.id.toString(),
                  type: movie.type,
                  season: season,
                  episode: episode,
                  intro: data.intro || [],
                  recap: data.recap || [],
                  credits: data.credits || [],
                  preview: data.preview || [],
                }),
              }).catch((err) => {
                console.warn(
                  "[PLAYER] Failed to write to server skip segment cache:",
                  err,
                );
              });
            } else {
              showToast("No skip segments available in IntroDB", "info");
            }
          })
          .catch((err) => {
            console.debug("[PLAYER] IntroDB fetch failed (non-critical):", err);
            showToast("No skip segments available in IntroDB", "info");
          });
      });

    return () => {
      cancelled = true;
    };
  }, [movie.id, movie.type, season, episode, showToast]);

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
      updateActiveCues(null);
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
      updateActiveCues(null);
      return;
    }

    let cancelled = false;

    const markFailedAndFallback = () => {
      setSubtitles((prev) => {
        const updated = prev.map((s, idx) =>
          idx === activeSubtitle ? { ...s, failed: true } : s,
        );
        // Auto-select the next non-failed subtitle track
        const nextIdx = updated.findIndex(
          (s, idx) => idx > activeSubtitle && !s.failed,
        );
        if (nextIdx !== -1) {
          console.log(
            `[SUBTITLES] Track ${activeSubtitle} failed, auto-falling back to track ${nextIdx}`,
          );
          // Defer state update to avoid React batching conflicts
          setTimeout(() => setActiveSubtitle(nextIdx), 0);
        } else {
          console.warn("[SUBTITLES] All subtitle tracks failed or exhausted.");
        }
        return updated;
      });
    };

    const processSub = async () => {
      try {
        let text = subTextCache.current[activeSubUrl];

        if (!text) {
          const r = await fetch(activeSubUrl);
          if (!r.ok) {
            showToast(`Failed to load subtitle: HTTP ${r.status}`, "error");
            markFailedAndFallback();
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
            markFailedAndFallback();
            return;
          }

          // Store in cache for next time
          subTextCache.current[activeSubUrl] = text;
        }

        // Check if subtitle is empty/contains no cues
        if (!text || !text.includes("-->")) {
          showToast("Failed to load subtitle: track contains no cues", "error");
          markFailedAndFallback();
          return;
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
        markFailedAndFallback();
      }
    };

    processSub();
    return () => {
      cancelled = true;
    };
  }, [activeSubtitle, activeSubUrl, subtitleOffset, updateActiveCues]);

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
          "Peachify",
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
                      : s.source === "Peachify"
                        ? "Peachify"
                        : s.source;
            const base =
              lang.startsWith("en") ||
              s.languageName?.toLowerCase().includes("english")
                ? "English"
                : s.languageName || lang.toUpperCase();
            name = `${base}${suffix}`;
          }
          processed.push({ ...s, languageName: name });
        });

        external.forEach((s) => {
          const lang = s.lang || "unk";
          const count = extCount[lang] || 0;
          if (count < 3) {
            extCount[lang] = count + 1;
            const name = `${s.languageName} #${extCount[lang]}`;
            processed.push({ ...s, languageName: name });
          }
        });

        return processed;
      };

      return [...processGroup(englishSubs), ...processGroup(otherLangSubs)];
    },
    [API],
  );

  useEffect(() => {
    const activeM = mirrors[activeMirror];
    if (activeM && activeM.subtitles && activeM.subtitles.length > 0) {
      setSubtitles((prev) => processSubtitles(activeM.subtitles, prev));
    }
  }, [activeMirror, mirrors, processSubtitles]);

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

      // ── Short-clip guard (mp4) ───────────────────────────────────────────
      // A restricted/fake video (e.g. Cloudflare ToS page) typically reports
      // a duration of 2s or less.  Skip it automatically.
      const onMp4Meta = () => {
        if (
          isFinite(video.duration) &&
          video.duration > 0 &&
          video.duration <= 3
        ) {
          console.warn(
            `[PLAYER] mp4 mirror has duration ${video.duration.toFixed(1)}s (≤3s) — skipping.`,
          );
          const failingIdx = activeMirrorRef.current;
          const failingMirror = mirrorsRef.current[failingIdx];
          if (failingMirror?.url) {
            reportDeadMirror(failingMirror.url);
          }
          const nextIdx = getNextFallbackMirrorIndex(
            activeMirrorRef.current,
            mirrorsRef.current,
            failedMirrors,
            failingMirror?.source,
          );
          if (nextIdx !== -1) {
            if (failingMirror) {
              setFailedMirrors((prev) => ({
                ...prev,
                [failingMirror.source]: "SHORT",
              }));
            }
            selectMirror(nextIdx, mirrorsRef.current);
          } else {
            setError("Short/restricted video on all mirrors.");
          }
        }
      };
      video.addEventListener("loadedmetadata", onMp4Meta, { once: true });

      video.play().catch((err) => {
        console.warn("[PLAYER] play() failed or was interrupted:", err);
        setIsPaused(true);
        showToast("Playback failed to start.", "error");
      });
      return () => {
        video.removeEventListener("loadedmetadata", onMp4Meta);
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

        // ── Short-clip guard (HLS) ─────────────────────────────────────────
        // A restricted/fake HLS stream (e.g. Cloudflare ToS blob) has a
        // reported duration of ≤3 seconds.  Detect and skip immediately.
        const onHlsMeta = () => {
          if (
            isFinite(video.duration) &&
            video.duration > 0 &&
            video.duration <= 3
          ) {
            console.warn(
              `[PLAYER] HLS mirror has duration ${video.duration.toFixed(1)}s (≤3s) — skipping.`,
            );
            const failingIdx = activeMirrorRef.current;
            const failingMirror = mirrorsRef.current[failingIdx];
            if (failingMirror?.url) {
              reportDeadMirror(failingMirror.url);
            }
            const nextIdx = getNextFallbackMirrorIndex(
              activeMirrorRef.current,
              mirrorsRef.current,
              failedMirrors,
              failingMirror?.source,
            );
            if (nextIdx !== -1) {
              if (failingMirror) {
                setFailedMirrors((prev) => ({
                  ...prev,
                  [failingMirror.source]: "SHORT",
                }));
              }
              hls.destroy();
              selectMirror(nextIdx, mirrorsRef.current);
            } else {
              setError("Short/restricted video on all mirrors.");
            }
          }
        };
        video.addEventListener("loadedmetadata", onHlsMeta, { once: true });

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
        // Skip immediate mirror switch for fragment load errors so Hls.js can retry/recover,
        // or trigger the 5s continuous error fallback.
        if (
          d.type === Hls.ErrorTypes.NETWORK_ERROR &&
          statusCode &&
          (statusCode >= 400 ||
            [401, 403, 404, 410, 429].includes(statusCode)) &&
          d.details !== "fragLoadError" &&
          d.details !== "fragLoadTimeOut"
        ) {
          console.warn(
            `[HLS] Hard network error ${statusCode} on ${d.details}. Switching mirror immediately...`,
          );
          const failingIdx = activeMirrorRef.current;
          const failingMirror = mirrorsRef.current[failingIdx];
          if (failingMirror?.url) {
            reportDeadMirror(failingMirror.url);
          }
          const nextIdx = getNextFallbackMirrorIndex(
            activeMirrorRef.current,
            mirrorsRef.current,
            failedMirrors,
            failingMirror?.source,
          );
          if (nextIdx !== -1) {
            if (failingMirror) {
              setFailedMirrors((prev) => ({
                ...prev,
                [failingMirror.source]: String(statusCode),
              }));
            }
            console.log(
              `[HLS] Switching to mirror ${nextIdx}: ${mirrorsRef.current[nextIdx].source}`,
            );
            selectMirror(nextIdx, mirrorsRef.current);
          } else {
            handleMirrorExhaustion(
              `Stream failed (${statusCode}). All mirrors exhausted.`,
            );
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
          const failingIdx = activeMirrorRef.current;
          const failingMirror = mirrorsRef.current[failingIdx];
          if (failingMirror?.url) {
            reportDeadMirror(failingMirror.url);
          }
          const nextIdx = getNextFallbackMirrorIndex(
            activeMirrorRef.current,
            mirrorsRef.current,
            failedMirrors,
            failingMirror?.source,
          );
          if (nextIdx !== -1) {
            if (failingMirror) {
              setFailedMirrors((prev) => ({
                ...prev,
                [failingMirror.source]: statusCode
                  ? String(statusCode)
                  : "LOAD_ERR",
              }));
            }
            selectMirror(nextIdx, mirrorsRef.current);
          } else {
            handleMirrorExhaustion(
              "Stream loading failed. All mirrors exhausted.",
            );
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
              const failingIdx = activeMirrorRef.current;
              const failingMirror = mirrorsRef.current[failingIdx];
              if (failingMirror?.url) {
                reportDeadMirror(failingMirror.url);
              }
              const nextIdx = getNextFallbackMirrorIndex(
                activeMirrorRef.current,
                mirrorsRef.current,
                failedMirrors,
                failingMirror?.source,
              );
              if (nextIdx !== -1) {
                if (failingMirror) {
                  setFailedMirrors((prev) => ({
                    ...prev,
                    [failingMirror.source]: lastFragErrorStatus || "502/404",
                  }));
                }
                selectMirror(nextIdx, mirrorsRef.current);
              } else {
                handleMirrorExhaustion(
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
            const failingIdx = activeMirrorRef.current;
            const failingMirror = mirrorsRef.current[failingIdx];
            if (failingMirror?.url) {
              reportDeadMirror(failingMirror.url);
            }
            const nextIdx = getNextFallbackMirrorIndex(
              activeMirrorRef.current,
              mirrorsRef.current,
              failedMirrors,
              failingMirror?.source,
            );
            if (nextIdx !== -1) {
              if (failingMirror) {
                setFailedMirrors((prev) => ({
                  ...prev,
                  [failingMirror.source]: "TIMEOUT",
                }));
              }
              selectMirror(nextIdx, mirrorsRef.current);
            } else {
              handleMirrorExhaustion(
                "Initial playback failed. All mirrors exhausted.",
              );
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
            const failingIdx = activeMirrorRef.current;
            const failingMirror = mirrorsRef.current[failingIdx];
            const nextIdx = getNextFallbackMirrorIndex(
              activeMirrorRef.current,
              mirrorsRef.current,
              failedMirrors,
              failingMirror?.source,
            );
            if (nextIdx !== -1) {
              if (failingMirror) {
                setFailedMirrors((prev) => ({
                  ...prev,
                  [failingMirror.source]: "502/504",
                }));
              }
              console.log(
                `[HLS] Switching to mirror ${nextIdx}: ${mirrorsRef.current[nextIdx].source}`,
              );
              selectMirror(nextIdx, mirrorsRef.current);
            } else {
              handleMirrorExhaustion(
                "Stream connection lost. All mirrors exhausted.",
              );
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
            const failingIdx = activeMirrorRef.current;
            const failingMirror = mirrorsRef.current[failingIdx];
            const nextIdx = getNextFallbackMirrorIndex(
              activeMirrorRef.current,
              mirrorsRef.current,
              failedMirrors,
              failingMirror?.source,
            );
            if (nextIdx !== -1) {
              if (failingMirror) {
                setFailedMirrors((prev) => ({
                  ...prev,
                  [failingMirror.source]: "DECODE",
                }));
              }
              console.log(
                `[HLS] Media recovery failed. Switching to mirror ${nextIdx}...`,
              );
              selectMirror(nextIdx, mirrorsRef.current);
            } else {
              handleMirrorExhaustion(`Stream decode failed: ${d.details}`);
            }
          }
        } else {
          handleMirrorExhaustion(`Stream failed: ${d.details}`);
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
  }, [streamUrl, isEmbed, reportDeadMirror]);

  // ─── Reset playback UI state on episode/season change ────────────────────
  // Prevents stale progress bar, seek thumb, and time display carrying over
  // from the previous episode when the user clicks Next Episode.
  useEffect(() => {
    setProgress(0);
    setCurrentTime("0:00");
    setDuration("0:00");
    setBuffered(0);
    setIsDragging(false);
    setIsSeeking(false);
    setDragProgress(0);
    setHoverTime(null);
    hasPrefetchedNextEpisode.current = false;
  }, [season, episode]);

  // ── Video event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isEmbed) return;

    const onEnded = () => {
      console.log("[PLAYER] Video ended. Requesting next episode modal...");
      if (movie.type === "tv") {
        handleNextEpisodeRef.current();
      }
    };

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
      // Guard against rubberbanding: suppress timeupdate when we've set a
      // local seek target that hasn't been confirmed by the browser yet.
      // HLS.js fires `seeked` before video.currentTime reaches the target,
      // so we also gate on the secondary drift check here.
      if (isLocalSeekingRef.current) {
        return;
      }
      if (localCurrentTimeRef.current > 0) {
        if (Math.abs(video.currentTime - localCurrentTimeRef.current) > 2) {
          // video.currentTime hasn't caught up to the seek target yet – suppress
          return;
        }
        // video.currentTime is now close to our target → lift the drift guard
        localCurrentTimeRef.current = 0;
      }
      if (video.duration > 0) {
        const cur = video.currentTime;
        setProgress((cur / video.duration) * 100);

        // Autoplay next episode trigger
        if (
          movie.type === "tv" &&
          hasNextRef.current &&
          !isAutoplayCancelledRef.current &&
          !countdownActiveRef.current
        ) {
          const creditsSegment = skipSegmentsRef.current.find(
            (s) => s.type === "credits",
          );
          const triggerTime = creditsSegment
            ? creditsSegment.startSec
            : video.duration - 20;

          if (cur >= triggerTime && cur < video.duration - 1) {
            setCountdownActive(true);
            setCountdownVal(10);
          }
        }

        // If countdown is active but they seeked backward before triggerTime, hide the popup!
        if (countdownActiveRef.current) {
          const creditsSegment = skipSegmentsRef.current.find(
            (s) => s.type === "credits",
          );
          const triggerTime = creditsSegment
            ? creditsSegment.startSec
            : video.duration - 20;
          if (cur < triggerTime) {
            setCountdownActive(false);
            setCountdownVal(10);
          }
        }

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
            (async () => {
              try {
                await fetchVideasySourcesDirect(
                  movie,
                  nextEp.season,
                  nextEp.episode,
                  API,
                );
                console.log(
                  `[PLAYER] Prefetched next episode from Videasy (S${nextEp.season}E${nextEp.episode})`,
                );
              } catch (err: any) {
                console.warn(
                  `[PLAYER] Prefetch Videasy failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                );
              }
            })();

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

            // 6. Vaplayer prefetch
            let vaplayerPrefetchUrl = `${API}/api/vaplayer?tmdbId=${movie.id}&type=${movie.type}&season=${nextEp.season}&episode=${nextEp.episode}`;
            fetch(vaplayerPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode from Vaplayer (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch Vaplayer failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                ),
              );

            // 7. Vidrift prefetch
            let vidriftPrefetchUrl = `${API}/api/vidrift?tmdbId=${movie.id}&type=${movie.type}&season=${nextEp.season}&episode=${nextEp.episode}`;
            fetch(vidriftPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode from Vidrift (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch Vidrift failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                ),
              );

            // 8. Peachify prefetch
            let peachifyPrefetchUrl = `${API}/api/peachify?tmdbId=${movie.id}&type=${movie.type}&season=${nextEp.season}&episode=${nextEp.episode}`;
            fetch(peachifyPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode from Peachify (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch Peachify failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
                ),
              );

            // 9. Subtitles prefetch
            let subPrefetchUrl = `${API}/api/subtitles?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}&season=${nextEp.season}&episode=${nextEp.episode}`;
            fetch(subPrefetchUrl)
              .then((r) => r.json())
              .then(() =>
                console.log(
                  `[PLAYER] Prefetched next episode subtitles (S${nextEp.season}E${nextEp.episode})`,
                ),
              )
              .catch((err) =>
                console.warn(
                  `[PLAYER] Prefetch subtitles failed for S${nextEp.season}E${nextEp.episode}: ${err.message || err}`,
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

      // ── Reset dismissed segments if user seeks out of their range ─────
      const curTime = video.currentTime;
      setDismissedSkips((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const seg of skipSegmentsRef.current) {
          const key = getSkipDismissKey(seg);
          if (next.has(key)) {
            const isOutside =
              curTime < seg.startSec - 1 ||
              (seg.endSec !== null && curTime > seg.endSec + 1);
            if (isOutside) {
              next.delete(key);
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });

      // ── Skip segment detection ──────────────────────────────────────────
      const activeSeg = getActiveSkipSegment(
        skipSegmentsRef.current,
        video.currentTime,
        dismissedSkipsRef.current,
      );
      setActiveSkip(activeSeg);
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
        let hlsRecovered = false;
        if (hlsRef.current && (err.code === 2 || err.code === 3)) {
          console.warn(
            "[PLAYER] Attempting HLS media error recovery from video element error...",
          );
          hlsRef.current.recoverMediaError();
          hlsRecovered = true;
        }

        if (!hlsRecovered) {
          // Native MP4 error recovery or failed HLS: try next mirror
          console.warn(
            `[PLAYER] Video error (code=${err.code}). Attempting mirror fallback...`,
          );
          const failingIdx = activeMirrorRef.current;
          const failingMirror = mirrorsRef.current[failingIdx];
          const nextIdx = getNextFallbackMirrorIndex(
            activeMirrorRef.current,
            mirrorsRef.current,
            failedMirrors,
            failingMirror?.source,
          );
          if (nextIdx !== -1) {
            if (failingMirror) {
              setFailedMirrors((prev) => ({
                ...prev,
                [failingMirror.source]: `CODE:${err.code}`,
              }));
            }
            selectMirror(nextIdx, mirrorsRef.current);
          } else {
            handleMirrorExhaustion(
              `Playback failed: ${err.message || "Media source error"}`,
            );
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
            const failingIdx = activeMirrorRef.current;
            const failingMirror = mirrorsRef.current[failingIdx];
            const nextIdx = getNextFallbackMirrorIndex(
              activeMirrorRef.current,
              mirrorsRef.current,
              failedMirrors,
              failingMirror?.source,
            );
            if (nextIdx !== -1) {
              if (failingMirror) {
                setFailedMirrors((prev) => ({
                  ...prev,
                  [failingMirror.source]: "STUCK",
                }));
              }
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

    const onSeeked = () => {
      isLocalSeekingRef.current = false;
      // NOTE: Do NOT clear localCurrentTimeRef here.
      // HLS.js fires `seeked` before video.currentTime actually moves to the
      // target — reading video.currentTime now would give 0 or the old position
      // and cause the visible rubber-band back to 0:00.
      // Instead we display our known-correct seek target, and let onTime clear
      // localCurrentTimeRef once video.currentTime confirms proximity.
      setIsSeeking(false);
      const displayTime =
        localCurrentTimeRef.current > 0
          ? localCurrentTimeRef.current
          : video.currentTime;
      setCurrentTime(formatTime(displayTime));
      if (video.duration > 0) {
        setProgress((displayTime / video.duration) * 100);
      }
    };
    const onSeeking = () => setIsSeeking(true);

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
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ended", onEnded);

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
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ended", onEnded);
    };
  }, [streamUrl, movie.id, getProgressKey, selectMirror]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!countdownActive) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.paused) {
        return; // Pause countdown if video is paused
      }

      setCountdownVal((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCountdownActive(false);
          if (handleNextEpisodeRef.current) {
            handleNextEpisodeRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownActive]);

  const resetHideTimer = useCallback(() => {
    setShowUi(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (
        !isPaused &&
        !showSettings &&
        !showSubtitles &&
        !showEpisodeDrawer &&
        !showServersModal &&
        !sourceSelect &&
        !isDragging
      )
        setShowUi(false);
    }, 3000);
  }, [
    isPaused,
    showSettings,
    showSubtitles,
    showEpisodeDrawer,
    showServersModal,
    sourceSelect,
    isDragging,
  ]);

  // Prevent auto-hiding controls when any menu/drawer is open
  useEffect(() => {
    const isMenuOpen =
      showSettings ||
      showSubtitles ||
      showEpisodeDrawer ||
      showServersModal ||
      Boolean(sourceSelect);

    if (isMenuOpen) {
      setShowUi(true);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    }
  }, [
    showSettings,
    showSubtitles,
    showEpisodeDrawer,
    showServersModal,
    sourceSelect,
  ]);

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
    if (
      showSettings ||
      showSubtitles ||
      showEpisodeDrawer ||
      showServersModal ||
      sourceSelect
    ) {
      // Close whichever menu is open
      setShowSettings(false);
      setShowSubtitles(false);
      setShowEpisodeDrawer(false);
      setShowServersModal(false);
      setSourceSelect(null);
      resetHideTimer();
    } else if (!showUi) {
      resetHideTimer();
    } else {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowUi(false);
      setShowMobileVolume(false);
    }
  }, [
    showUi,
    showSettings,
    showSubtitles,
    showEpisodeDrawer,
    showServersModal,
    sourceSelect,
    resetHideTimer,
  ]);

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

        const isLeft = x < width / 2;
        if (isLeft) {
          seekBy(-10, x, y);
        } else {
          seekBy(10, x, y);
        }
      } else {
        lastTouchRef.current = { time: now, x, y };

        touchTimeoutRef.current = setTimeout(() => {
          handleTap();
          lastTouchRef.current = null;
        }, 300);
      }
    },
    [handleTap, seekBy],
  );

  const handleDesktopClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      handleTap();
    },
    [handleTap],
  );

  const handlePlayerTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistRef.current = Math.hypot(dx, dy);
        isPinchActiveRef.current = true;
      }
    },
    [],
  );

  const handlePlayerTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2 && touchStartDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const diff = dist - touchStartDistRef.current;

        if (Math.abs(diff) > 40) {
          if (diff > 0) {
            setIsZoomed((z) => {
              if (!z) {
                showToast("Zoomed to Fill", "info");
                return true;
              }
              return z;
            });
          } else {
            setIsZoomed((z) => {
              if (z) {
                showToast("Fit to Screen", "info");
                return false;
              }
              return z;
            });
          }
          touchStartDistRef.current = dist;
        }
      }
    },
    [showToast],
  );

  const handlePlayerTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      touchStartDistRef.current = null;
      if (isPinchActiveRef.current) {
        if (e.touches.length === 0) {
          isPinchActiveRef.current = false;
        }
        return;
      }
      handleTouchEnd(e);
    },
    [handleTouchEnd],
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
          if (v) seekBy(10);
          break;
        case "KeyJ":
          if (v) seekBy(-10);
          break;
        case "ArrowRight":
          if (v) seekBy(5);
          break;
        case "ArrowLeft":
          if (v) seekBy(-5);
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
  }, [onClose, showSettings, seekBy]);

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
      if ("touches" in e && e.cancelable) {
        e.preventDefault();
      }
      const slider = document.getElementById("progress-slider");
      if (!slider) return;
      const r = slider.getBoundingClientRect();
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const p = Math.max(
        0,
        Math.min(100, ((clientX - r.left) / r.width) * 100),
      );
      dragProgressRef.current = p;
      setDragProgress(p);
    },
    [isDragging],
  );

  const handleSliderUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const v = videoRef.current;
    if (v && isFinite(v.duration)) {
      const targetTime = (dragProgressRef.current / 100) * v.duration;
      setIsSeeking(true);
      isLocalSeekingRef.current = true;
      localCurrentTimeRef.current = targetTime;
      setCurrentTime(formatTime(targetTime));
      setProgress(dragProgressRef.current);
      v.currentTime = targetTime;

      if (seekFlagTimerRef.current) clearTimeout(seekFlagTimerRef.current);
      seekFlagTimerRef.current = setTimeout(() => {
        isLocalSeekingRef.current = false;
      }, 800);
    }
    resetHideTimer();
  }, [isDragging, resetHideTimer]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleSliderMove);
      window.addEventListener("mouseup", handleSliderUp);
      window.addEventListener("touchmove", handleSliderMove, {
        capture: true,
        passive: false,
      });
      window.addEventListener("touchend", handleSliderUp, { capture: true });
      window.addEventListener("touchcancel", handleSliderUp, { capture: true });
    }
    return () => {
      window.removeEventListener("mousemove", handleSliderMove);
      window.removeEventListener("mouseup", handleSliderUp);
      window.removeEventListener("touchmove", handleSliderMove, {
        capture: true,
      });
      window.removeEventListener("touchend", handleSliderUp, { capture: true });
      window.removeEventListener("touchcancel", handleSliderUp, {
        capture: true,
      });
    };
  }, [isDragging, handleSliderMove, handleSliderUp]);

  const handleSliderDown = (e: React.MouseEvent | React.TouchEvent) => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration)) return;
    setIsDragging(true);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const p = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    dragProgressRef.current = p;
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
    const m = mirrors[activeMirror];
    const video = videoRef.current;

    if (video && (m?.type === "mp4_grouped" || m?.type === "hls_grouped")) {
      const key = getProgressKey();
      const saved = JSON.parse(localStorage.getItem("nebula-progress") || "{}");
      saved[key] = {
        time: video.currentTime,
        duration: video.duration,
        timestamp: Date.now(),
      };
      localStorage.setItem("nebula-progress", JSON.stringify(saved));
      const targetId = levelId === -1 ? 0 : levelId;
      setCurrentHeight(m.qualities[targetId].height);
      setStreamUrl(m.qualities[targetId].url);
    } else if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
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

      const lastEpS = tvDetails.last_episode_to_air?.season_number;
      const lastEpE = tvDetails.last_episode_to_air?.episode_number;

      const checkEpisodeAired = (targetS: number, targetE: number) => {
        if (lastEpS === undefined || lastEpE === undefined) return true; // fallback
        if (targetS > lastEpS) return false;
        if (targetS === lastEpS && targetE > lastEpE) return false;
        return true;
      };

      const sortedSeasons = tvDetails.seasons
        .filter((sInfo: any) => sInfo.season_number > 0)
        .sort((a: any, b: any) => a.season_number - b.season_number);

      const currentSeasonInfo = sortedSeasons.find(
        (sInfo: any) => sInfo.season_number === s,
      );
      if (!currentSeasonInfo) return null;

      const maxEpisodes = currentSeasonInfo.episode_count;
      if (e < maxEpisodes) {
        return checkEpisodeAired(s, e + 1)
          ? { season: s, episode: e + 1 }
          : null;
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
        return checkEpisodeAired(nextSeason.season_number, 1)
          ? { season: nextSeason.season_number, episode: 1 }
          : null;
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

  const hasNextRef = useRef(false);
  useEffect(() => {
    hasNextRef.current = hasNext;
  }, [hasNext]);

  const handleNextEpisode = () => {
    const nextEp = getNextEpisodeDetails();
    if (nextEp) {
      setCountdownActive(false);
      setCountdownVal(10);
      setIsAutoplayCancelled(false);

      const queryParams = new URLSearchParams(window.location.search);
      queryParams.set("season", String(nextEp.season));
      queryParams.set("episode", String(nextEp.episode));
      queryParams.delete("source"); // Remove current stream URL source parameter
      const queryString = queryParams.toString();
      navigate(
        `/watch/${movie.type || "movie"}/${movie.id}${queryString ? `?${queryString}` : ""}`,
      );
    }
  };

  useEffect(() => {
    handleNextEpisodeRef.current = handleNextEpisode;
  }, [handleNextEpisode]);

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
            initial={{ opacity: 0, y: -10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -10, x: "-50%" }}
            className="absolute top-6 left-1/2 z-[600] pointer-events-none"
          >
            <div className="px-4 py-2 rounded-full bg-black/85 backdrop-blur-xl border border-white/10 flex items-center gap-2.5 shadow-2xl shadow-black/85">
              {toast.type === "error" ? (
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              ) : toast.type === "success" ? (
                <div className="w-1.5 h-1.5 rounded-full bg-nebula-cyan shrink-0 animate-pulse" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
              )}
              <span className="text-white font-bold text-[10px] uppercase tracking-widest font-sans leading-none">
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
            {movie.clearLogo && !logoFailed ? (
              <img
                src={movie.clearLogo}
                alt={movie.title}
                height="112"
                className="h-20 md:h-28 w-auto object-contain drop-shadow-2xl animate-pulse"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
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
                  reScrapeStream(false);
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
            {movie.clearLogo && !logoFailed ? (
              <img
                src={movie.clearLogo}
                alt="Loading..."
                height="96"
                className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl animate-pulse opacity-80 pointer-events-none"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
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
            className={`w-full h-full ${isZoomed ? "object-cover" : "object-contain"} transition-[object-fit] duration-300`}
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
          onTouchStart={handlePlayerTouchStart}
          onTouchMove={handlePlayerTouchMove}
          onTouchEnd={handlePlayerTouchEnd}
          onPointerDown={(e) => {
            // Only trigger long-press on primary pointer (finger / left click)
            if (e.button !== undefined && e.button !== 0) return;
            if (isPinchActiveRef.current) {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
              return;
            }
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
            longPressTimer.current = setTimeout(() => {
              if (isPinchActiveRef.current) return;
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
              {doubleTapFeedback.type === "rewind"
                ? `-${doubleTapFeedback.seconds}s`
                : `+${doubleTapFeedback.seconds}s`}
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
          onPointerDown={(e) => e.stopPropagation()}
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

          {!isEmbed && (
            <div className="flex items-center gap-2 shrink-0">
              {/* Sources Button & Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (sourceSelect) {
                      setSourceSelect(null);
                    } else {
                      setSourceSelect({
                        season: season ?? 1,
                        episode: episode ?? 1,
                      });
                      setShowServersModal(false);
                      setShowSettings(false);
                      setShowSubtitles(false);
                      setShowEpisodeDrawer(false);
                    }
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all border border-white/5 ${
                    sourceSelect
                      ? "bg-white text-black scale-105"
                      : "bg-white/10 text-white/50 hover:text-white hover:bg-white/20 hover:scale-105"
                  }`}
                  title="Sources"
                >
                  <Tv size={18} />
                </button>

                {sourceSelect && (
                  <div className="absolute top-12 right-0 bg-[#0f0f11]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] w-80 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200 z-[250] text-left">
                    {/* Header */}
                    <div className="px-2.5 pb-2 mb-2 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                          <Tv size={13} className="text-nebula-cyan" />
                          <span>Stream Source</span>
                        </h3>
                        <p className="text-[9px] text-white/40 mt-1 leading-normal font-medium">
                          {movie.title}
                          {movie.type === "tv" &&
                            ` · S${sourceSelect.season}E${sourceSelect.episode}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Previous Episode */}
                        {movie.type === "tv" &&
                          (() => {
                            const prevEp = getPreviousEpisodeFor(
                              sourceSelect.season,
                              sourceSelect.episode,
                            );
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (prevEp) {
                                    setSourceSelect(prevEp);
                                    setForceRefetchTrigger(0);
                                  }
                                }}
                                disabled={!prevEp}
                                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                                  prevEp
                                    ? "bg-white/5 hover:bg-white/10 text-white/80 border-white/5"
                                    : "bg-white/5 text-white/20 border-transparent opacity-40 cursor-not-allowed"
                                }`}
                              >
                                <ChevronLeft size={12} />
                              </button>
                            );
                          })()}
                        {/* Refetch */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setForceRefetchTrigger((t) => t + 1);
                          }}
                          disabled={sourcesLoading}
                          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/5 disabled:opacity-40"
                        >
                          <RefreshCw
                            size={10}
                            className={
                              sourcesLoading
                                ? "animate-spin text-nebula-cyan"
                                : ""
                            }
                          />
                        </button>
                        {/* Next Episode */}
                        {movie.type === "tv" &&
                          (() => {
                            const nextEp = getNextEpisodeFor(
                              sourceSelect.season,
                              sourceSelect.episode,
                            );
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (nextEp) {
                                    setSourceSelect(nextEp);
                                    setForceRefetchTrigger(0);
                                  }
                                }}
                                disabled={!nextEp}
                                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                                  nextEp
                                    ? "bg-white/5 hover:bg-white/10 text-white/80 border-white/5"
                                    : "bg-white/5 text-white/20 border-transparent opacity-40 cursor-not-allowed"
                                }`}
                              >
                                <ChevronRight size={12} />
                              </button>
                            );
                          })()}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto custom-scrollbar">
                      <InPlayerSourcePicker
                        movie={movie}
                        season={sourceSelect.season}
                        episode={sourceSelect.episode}
                        forceRefetchTrigger={forceRefetchTrigger}
                        onLoadingChange={setSourcesLoading}
                        activeSource={
                          (movie.type !== "tv" ||
                            (sourceSelect.season === season &&
                              sourceSelect.episode === episode)) &&
                          mirrors[activeMirror]
                            ? parseMirrorDetails(mirrors[activeMirror].source)
                                .category
                            : ""
                        }
                        failedSources={failedSourcesList}
                        onSelect={(src) => {
                          setSourceSelect(null);
                          failedSourcesRef.current.clear();
                          setFailedSourcesList([]);
                          const queryParams = new URLSearchParams();
                          if (movie.type === "tv") {
                            queryParams.set(
                              "season",
                              String(sourceSelect.season),
                            );
                            queryParams.set(
                              "episode",
                              String(sourceSelect.episode),
                            );
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
                    </div>
                  </div>
                )}
              </div>

              {/* Servers & Mirrors Button & Dropdown */}
              {mirrors.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowServersModal((p) => !p);
                      setSourceSelect(null);
                      setShowSettings(false);
                      setShowSubtitles(false);
                      setShowEpisodeDrawer(false);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all border border-white/5 ${
                      showServersModal
                        ? "bg-white text-black scale-105"
                        : "bg-white/10 text-white/50 hover:text-white hover:bg-white/20 hover:scale-105"
                    }`}
                    title="Servers & Mirrors"
                  >
                    <Cloud size={18} />
                  </button>

                  {showServersModal && (
                    <div className="absolute top-12 right-0 bg-[#0f0f11]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] w-72 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200 z-[250] text-left">
                      <div className="px-2.5 pb-2 mb-2 border-b border-white/5">
                        <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                          <Cloud size={13} className="text-nebula-cyan" />
                          <span>Servers & Mirrors</span>
                        </h3>
                        <p className="text-[9px] text-white/40 mt-1 leading-normal font-medium">
                          Select a source provider below if playback is slow or
                          failing.
                        </p>
                      </div>

                      {(() => {
                        const activeM = mirrors[activeMirror];
                        const activeCategory = activeM
                          ? parseMirrorDetails(activeM.source).category
                          : "";

                        const groupedByCategory: Record<
                          string,
                          { mirror: any; originalIndex: number }[]
                        > = {};
                        mirrors.forEach((m, i) => {
                          const { category, name } = parseMirrorDetails(
                            m.source,
                          );
                          if (activeCategory && category !== activeCategory) {
                            return; // Only show mirrors of the active source category
                          }
                          if (!groupedByCategory[category]) {
                            groupedByCategory[category] = [];
                          }
                          groupedByCategory[category].push({
                            mirror: { ...m, cleanName: name },
                            originalIndex: i,
                          });
                        });

                        return Object.entries(groupedByCategory).map(
                          ([category, items]) => (
                            <div key={category} className="mb-2 last:mb-0">
                              <div className="flex items-center gap-1.5 px-2 mb-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-nebula-cyan/85" />
                                <span className="text-white/40 text-[8.5px] font-black uppercase tracking-wider">
                                  {category}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 px-1">
                                {items.map(
                                  ({ mirror: m, originalIndex: idx }) => {
                                    const flagCode = m.flag
                                      ? m.flag.toLowerCase()
                                      : "us";
                                    const countryCode =
                                      flagCode === "en" ? "us" : flagCode;
                                    const isSelected = activeMirror === idx;
                                    const failedReason =
                                      failedMirrors[m.source];
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          selectMirror(idx, mirrors);
                                          setShowServersModal(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                                          isSelected
                                            ? "text-white bg-white/10 border-white/15 font-bold shadow-lg shadow-black/35"
                                            : "text-white/60 bg-transparent border-transparent hover:text-white hover:bg-white/5 hover:border-white/5"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <img
                                            src={`https://flagcdn.com/w20/${countryCode}.png`}
                                            alt={flagCode}
                                            className="w-4.5 h-3.5 object-cover rounded-[2px] shrink-0 border border-white/10 shadow-sm"
                                            onError={(e) => {
                                              e.currentTarget.src =
                                                "https://flagcdn.com/w20/us.png";
                                            }}
                                          />
                                          <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="truncate text-xs font-semibold leading-tight font-display text-white">
                                                {m.cleanName}
                                              </span>
                                              {failedReason && (
                                                <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-rose-500/30 text-rose-400 bg-rose-500/10 uppercase tracking-wider shrink-0">
                                                  {failedReason}
                                                </span>
                                              )}
                                            </div>
                                            {m.audio && (
                                              <span className="text-[9px] text-white/40 font-normal leading-tight mt-0.5">
                                                {m.audio}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                          {isSelected ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-nebula-cyan shadow-[0_0_8px_#00e5ff]" />
                                          ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors" />
                                          )}
                                        </div>
                                      </button>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          ),
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`px-3 sm:px-6 pb-4 sm:pb-6 pt-12 sm:pt-16 ${!isEmbed ? "bg-gradient-to-t from-black/90 to-transparent" : ""}`}
          // Stop taps on the bottom bar from bubbling to the tap layer
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!isEmbed && (
            <>
              {/* ── Progress Slider ──────────────────────────────────────── */}
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
                    style={{
                      width: `${isDragging ? dragProgress : progress}%`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full -ml-1.5 shadow-lg group-hover:scale-125 transition-transform"
                    style={{
                      left: `${isDragging ? dragProgress : progress}%`,
                    }}
                  />

                  {/* ── Segment markers ───────────────────────────────── */}
                  {skipSegments.map((seg, i) => {
                    const dur = videoRef.current?.duration;
                    if (!dur || dur <= 0) return null;
                    const leftPct = (seg.startSec / dur) * 100;
                    const endSec = seg.endSec !== null ? seg.endSec : dur;
                    const widthPct = Math.max(
                      0.3,
                      ((endSec - seg.startSec) / dur) * 100,
                    );
                    const isWarm = seg.type === "intro" || seg.type === "recap";
                    return (
                      <div
                        key={`marker-${seg.type}-${i}`}
                        className="absolute inset-y-0 rounded-full pointer-events-none"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          background: isWarm
                            ? "rgba(251,191,36,0.45)"
                            : "rgba(255,255,255,0.3)",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-5">
              {!isEmbed && (
                <>
                  <button
                    onClick={() => seekBy(-10)}
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
                    onClick={() => seekBy(10)}
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
              {movie.type === "tv" && (
                <button
                  onClick={() => {
                    setShowEpisodeDrawer(true);
                    setShowSettings(false);
                    setShowSubtitles(false);
                    setShowServersModal(false);
                  }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${showEpisodeDrawer ? "bg-white text-black" : "bg-white/10 text-white/50 hover:text-white"}`}
                  title="Episodes"
                >
                  <List size={16} />
                </button>
              )}
              {!isEmbed && (
                <>
                  {/* Subtitles Button */}
                  <button
                    onClick={() => {
                      setShowSubtitles((p) => !p);
                      setShowSettings(false);
                      setShowServersModal(false);
                      setShowEpisodeDrawer(false);
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
                      setShowServersModal(false);
                      setShowEpisodeDrawer(false);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${showSettings ? "bg-white text-black" : "bg-white/10 text-white/50 hover:text-white"}`}
                    title="Settings"
                  >
                    <Settings size={16} />
                  </button>

                  {/* Zoom Fit */}
                  <button
                    onClick={() => {
                      setIsZoomed((z) => {
                        const next = !z;
                        showToast(
                          next ? "Zoomed to Fill" : "Fit to Screen",
                          "info",
                        );
                        return next;
                      });
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      isZoomed
                        ? "bg-nebula-cyan text-obsidian font-black shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                        : "bg-white/10 text-white/50 hover:text-white hover:bg-white/20"
                    }`}
                    title={isZoomed ? "Fit to Screen" : "Zoom to Fill"}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {isZoomed ? (
                        <>
                          <rect
                            x="2"
                            y="4"
                            width="20"
                            height="16"
                            rx="2"
                            strokeDasharray="3 3"
                            opacity="0.6"
                          />
                          <path d="M12 7v10" />
                          <path d="M9 10l3 3 3-3" />
                          <path d="M9 14l3-3 3 3" />
                        </>
                      ) : (
                        <>
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="M12 7v10" />
                          <path d="M9 10l3-3 3 3" />
                          <path d="M9 14l3 3 3-3" />
                        </>
                      )}
                    </svg>
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
                  <div className="text-white/30 text-[10px] uppercase tracking-widest px-3 pt-2.5 pb-1.5 flex items-center justify-between border-b border-white/5 mb-1">
                    <span className="font-bold text-white/60">Subtitles</span>
                    <span className="flex items-center gap-1.5 pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSubStyles((p) => !p);
                        }}
                        title="Subtitle Styling & Presets"
                        className={`flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border transition-all ${
                          showSubStyles
                            ? "bg-nebula-cyan/15 border-nebula-cyan/30 text-nebula-cyan"
                            : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <Settings size={9} />
                        <span>Style</span>
                      </button>
                      {fetchingSubtitles ? (
                        <div className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-white/5 border-white/10 text-nebula-cyan animate-pulse">
                          <Loader2 size={9} className="animate-spin" />
                          <span>Loading</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => refetchSubtitles(true)}
                          title="Refetch from all sources"
                          className="flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <RefreshCw size={9} />
                          <span>Reload</span>
                        </button>
                      )}
                    </span>
                  </div>

                  {showSubStyles && (
                    <div className="mx-1 mb-2 p-2 bg-white/5 rounded-lg border border-white/10 flex flex-col gap-3 text-left">
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

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold px-1">
                          Font Weight
                        </span>
                        <div className="grid grid-cols-4 gap-1 px-1">
                          {[
                            { label: "Light", value: "300" },
                            { label: "Normal", value: "normal" },
                            { label: "Bold", value: "bold" },
                            { label: "X-Bold", value: "800" },
                          ].map((fw) => (
                            <button
                              key={fw.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePreference("fontWeight", fw.value);
                              }}
                              className={`text-center py-1 text-[9px] rounded transition-colors font-bold ${
                                prefs.fontWeight === fw.value
                                  ? "text-black bg-white"
                                  : "text-white/60 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {fw.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold px-1">
                          Font Style
                        </span>
                        <div className="grid grid-cols-2 gap-1 px-1">
                          {[
                            { label: "Normal", value: "normal" },
                            { label: "Italic", value: "italic" },
                          ].map((fs) => (
                            <button
                              key={fs.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePreference("fontStyle", fs.value);
                              }}
                              className={`text-center py-1 text-[9px] rounded transition-colors font-bold ${
                                prefs.fontStyle === fs.value
                                  ? "text-black bg-white"
                                  : "text-white/60 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {fs.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold px-1">
                          Font Family
                        </span>
                        <div className="px-1">
                          <select
                            value={prefs.fontFamily}
                            onChange={(e) => {
                              e.stopPropagation();
                              updatePreference("fontFamily", e.target.value);
                            }}
                            className="w-full bg-[#222]/80 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-white/30 cursor-pointer"
                          >
                            <option value="Arial, Helvetica, sans-serif">
                              Arial
                            </option>
                            <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">
                              Helvetica Neue
                            </option>
                            <option value="'Trebuchet MS', 'Segoe UI', Verdana, sans-serif">
                              Trebuchet MS
                            </option>
                            <option value="'Inter', 'Segoe UI', system-ui, sans-serif">
                              Inter
                            </option>
                            <option value="Georgia, 'Times New Roman', serif">
                              Georgia (Serif)
                            </option>
                            <option value="'Courier New', Courier, monospace">
                              Courier (Monospace)
                            </option>
                          </select>
                        </div>
                      </div>

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

                  <div className="flex flex-col gap-1 px-1">
                    <button
                      onClick={() => handleSubtitleChange(-1)}
                      className={`w-full text-left px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-between group text-xs ${
                        activeSubtitle === -1
                          ? "text-white bg-white/10 border-white/15 font-bold shadow-lg shadow-black/35"
                          : "text-white/60 bg-transparent border-transparent hover:text-white hover:bg-white/5 hover:border-white/5"
                      }`}
                    >
                      <span>Off</span>
                      {activeSubtitle === -1 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-nebula-cyan shadow-[0_0_8px_#00e5ff]" />
                      )}
                    </button>
                    {subtitles.map((sub, i) => {
                      const cleanLangName = sub.languageName
                        .replace(/\s*\(External\).*/i, "")
                        .trim();
                      const cleanSource = (() => {
                        if (!sub.source) return "";
                        const s = sub.source.toLowerCase();
                        if (s === "opensubtitles") return "OpenSubtitles";
                        if (s === "vidrock") return "VidRock";
                        if (s === "vidnest") return "VidNest";
                        if (s === "vaplayer") return "VAPlayer";
                        if (s === "vidrift") return "Vidrift";
                        if (s === "filmu") return "FilmU";
                        if (s === "vidlink") return "VidLink";
                        if (s === "videasy") return "Videasy";
                        if (s === "custom") return "Custom";
                        return sub.source;
                      })();
                      return (
                        <button
                          key={i}
                          onClick={() => handleSubtitleChange(i)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between group text-xs ${
                            sub.failed
                              ? "text-red-500/40 bg-red-500/5 border-red-500/10 line-through decoration-red-500/50 cursor-not-allowed"
                              : activeSubtitle === i
                                ? "text-white bg-white/10 border-white/15 font-bold shadow-lg shadow-black/35"
                                : "text-white/60 bg-transparent border-transparent hover:text-white hover:bg-white/5 hover:border-white/5"
                          }`}
                        >
                          <span className="truncate pr-2">
                            {cleanLangName} {sub.failed && "(Failed to load)"}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {sub.source && (
                              <span
                                className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase border ${
                                  sub.failed
                                    ? "bg-red-500/10 text-red-500/40 border-red-500/10"
                                    : activeSubtitle === i
                                      ? "bg-white/10 text-white/70 border-white/10"
                                      : sub.source.toLowerCase() ===
                                          "opensubtitles"
                                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                        : "bg-nebula-cyan/10 text-nebula-cyan border-nebula-cyan/20"
                                }`}
                              >
                                {cleanSource}
                              </span>
                            )}
                            {activeSubtitle === i && !sub.failed && (
                              <span className="w-1.5 h-1.5 rounded-full bg-nebula-cyan shadow-[0_0_8px_#00e5ff]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
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
                <div className="absolute bottom-12 right-0 bg-[#0f0f11]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] w-60 max-h-[60vh] overflow-y-auto custom-scrollbar pointer-events-auto flex flex-col gap-1.5 p-3.5 animate-in slide-in-from-bottom-2 duration-200 text-left">
                  <div className="px-2 pb-2 mb-2 border-b border-white/5">
                    <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <Settings size={13} className="text-nebula-cyan" />
                      <span>Settings</span>
                    </h3>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 px-2 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-nebula-cyan/85" />
                      <span className="text-white/40 text-[8.5px] font-black uppercase tracking-wider">
                        Playback Speed
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 px-1">
                      {[0.5, 1, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`text-center py-1.5 text-xs rounded-lg transition-all font-bold border ${
                            speed === s
                              ? "text-white bg-white/10 border-white/15 shadow-sm shadow-black/20"
                              : "text-white/60 bg-transparent border-transparent hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {s === 1 ? "1x" : `${s}x`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {qualities.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 px-2 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-nebula-cyan/85" />
                        <span className="text-white/40 text-[8.5px] font-black uppercase tracking-wider">
                          Video Quality
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 px-1">
                        <button
                          onClick={() => setQuality(-1)}
                          className={`w-full text-left px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                            activeQuality === -1
                              ? "text-white bg-white/10 border-white/15 font-bold shadow-lg shadow-black/35"
                              : "text-white/60 bg-transparent border-transparent hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <span className="text-xs font-semibold leading-tight">
                            Auto
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {activeQuality === -1 && currentHeight && (
                              <span className="text-[9px] text-white/40 font-normal">
                                {currentHeight}p
                              </span>
                            )}
                            {activeQuality === -1 ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-nebula-cyan shadow-[0_0_8px_#00e5ff]" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-white/30" />
                            )}
                          </div>
                        </button>
                        {qualities.map((q) => {
                          const isSelected = activeQuality === q.levelId;
                          return (
                            <button
                              key={q.levelId}
                              onClick={() => setQuality(q.levelId)}
                              className={`w-full text-left px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                                isSelected
                                  ? "text-white bg-white/10 border-white/15 font-bold shadow-lg shadow-black/35"
                                  : "text-white/60 bg-transparent border-transparent hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <span className="text-xs font-semibold leading-tight">
                                {q.height}p
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {isSelected ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-nebula-cyan shadow-[0_0_8px_#00e5ff]" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-white/30" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reload Stream — recovers from stuck seek/fast-forward */}
                  <div className="border-t border-white/5 pt-3 mt-1 px-1">
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

      {/* ── Floating Skip Button Overlay (Always Visible & Interactive) ── */}
      <AnimatePresence>
        {activeSkip && (
          <motion.div
            key={`skip-${activeSkip.type}-${activeSkip.startSec}`}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onMouseEnter={() => setIsSkipHovered(true)}
            onMouseLeave={() => setIsSkipHovered(false)}
            className={`fixed right-4 sm:right-8 z-[250] pointer-events-auto transition-all duration-300 select-none ${
              showUi ? "bottom-24 sm:bottom-28" : "bottom-6 sm:bottom-8"
            }`}
          >
            <button
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                v.currentTime =
                  activeSkip.endSec !== null ? activeSkip.endSec : v.duration;
                setDismissedSkips((prev) => {
                  const next = new Set(prev);
                  next.add(getSkipDismissKey(activeSkip));
                  return next;
                });
                setActiveSkip(null);
              }}
              className="relative flex items-center gap-2.5 px-6 py-3.5 bg-black/85 hover:bg-white text-white hover:text-black border border-white/20 hover:border-white rounded-md text-[10px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.85)] active:scale-95"
            >
              <SkipForward size={12} fill="currentColor" />
              <span>{getSkipLabel(activeSkip.type)}</span>
              {/* Countdown Progress Bar (Filling up) */}
              <div
                className="absolute bottom-0 left-0 h-[2.5px] bg-nebula-cyan transition-all duration-100 ease-linear"
                style={{
                  width: `${((SKIP_BUTTON_DURATION - skipTimer) / SKIP_BUTTON_DURATION) * 100}%`,
                }}
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Next Episode Autoplay Countdown Overlay ── */}
      <AnimatePresence>
        {countdownActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed right-4 sm:right-8 z-[280] pointer-events-auto transition-all duration-300 select-none bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.9)] w-[280px] sm:w-[320px] flex flex-col gap-4 ${
              showUi ? "bottom-24 sm:bottom-28" : "bottom-6 sm:bottom-8"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black tracking-widest text-nebula-cyan uppercase italic">
                  Next Episode starts in
                </p>
                {(() => {
                  const nextEp = getNextEpisodeDetails();
                  if (nextEp) {
                    return (
                      <h4 className="text-xs font-black text-white truncate mt-1">
                        S{nextEp.season} E{nextEp.episode}
                      </h4>
                    );
                  }
                  return (
                    <h4 className="text-xs font-black text-white truncate mt-1">
                      Loading details...
                    </h4>
                  );
                })()}
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="18"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="18"
                    stroke="#00E5FF"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={2 * Math.PI * 18 * (1 - countdownVal / 10)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute text-xs font-black text-white">
                  {countdownVal}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCountdownActive(false);
                  handleNextEpisode();
                }}
                className="flex-1 py-2 rounded-lg bg-white text-black font-black uppercase text-[10px] tracking-wider transition-all hover:bg-white/90 active:scale-[0.98] cursor-pointer"
              >
                Play Now
              </button>
              <button
                onClick={() => {
                  setCountdownActive(false);
                  setIsAutoplayCancelled(true);
                }}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/5 font-black uppercase text-[10px] tracking-wider transition-all active:scale-[0.98] cursor-pointer"
              >
                Watch Credits
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
  failedSources = [],
  onSelect,
}: {
  movie: any;
  season?: number;
  episode?: number;
  forceRefetchTrigger: number;
  onLoadingChange: (loading: boolean) => void;
  activeSource?: string;
  failedSources?: string[];
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

  const [vaplayerSources, setVaplayerSources] = useState<any[]>([]);
  const [vaplayerLoading, setVaplayerLoading] = useState(true);
  const [vaplayerError, setVaplayerError] = useState("");

  const [vidriftSources, setVidriftSources] = useState<any[]>([]);
  const [vidriftLoading, setVidriftLoading] = useState(true);
  const [vidriftError, setVidriftError] = useState("");

  // Keep latest onLoadingChange ref to avoid triggering effect loops
  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);

  useEffect(() => {
    onLoadingChangeRef.current?.(
      loading ||
        videasyLoading ||
        filmuLoading ||
        vidnestLoading ||
        vaplayerLoading ||
        vidriftLoading,
    );
  }, [
    loading,
    videasyLoading,
    filmuLoading,
    vidnestLoading,
    vaplayerLoading,
    vidriftLoading,
  ]);

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
        setVaplayerLoading(true);
        setVaplayerError("");
        setVidriftLoading(true);
        setVidriftError("");
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
      const pVideasy = (async () => {
        const data = await fetchVideasySourcesDirect(
          movie,
          season,
          episode,
          API,
        );

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
      })()
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

      // 5. Vaplayer Fetch
      let vaplayerUrl = `${API}/api/vaplayer?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) vaplayerUrl += `&season=${season}`;
      if (episode !== undefined) vaplayerUrl += `&episode=${episode}`;

      const pVaplayer = fetch(vaplayerUrl)
        .then((r) => {
          if (!r.ok) throw new Error("Vaplayer scan failed");
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
          setVaplayerSources(list);
          if (!isBackground) setVaplayerError("");
        })
        .catch((e) => {
          if (!isBackground) setVaplayerError(e.message);
        })
        .finally(() => {
          if (!isBackground) setVaplayerLoading(false);
        });

      // 6. Vidrift Fetch
      let vidriftUrl = `${API}/api/vidrift?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) vidriftUrl += `&season=${season}`;
      if (episode !== undefined) vidriftUrl += `&episode=${episode}`;

      const pVidrift = fetch(vidriftUrl)
        .then((r) => {
          if (!r.ok) throw new Error("Vidrift scan failed");
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
          setVidriftSources(list);
          if (!isBackground) setVidriftError("");
        })
        .catch((e) => {
          if (!isBackground) setVidriftError(e.message);
        })
        .finally(() => {
          if (!isBackground) setVidriftLoading(false);
        });

      return Promise.all([
        pVidrock,
        pVideasy,
        pFilmu,
        pVidnest,
        pVaplayer,
        pVidrift,
      ]);
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
  const vaplayerUrl = vaplayerSources
    .map((s) =>
      s.url.includes("#")
        ? s.url
        : `${s.url}#${s.name}#${s.type}#${s.quality || "Auto"}`,
    )
    .join("|");
  const vidriftUrl = vidriftSources
    .map((s) =>
      s.url.includes("#")
        ? s.url
        : `${s.url}#${s.name}#${s.type}#${s.quality || "Auto"}`,
    )
    .join("|");

  const getButtonClass = (
    srcName: string,
    activeName: string,
    loadingFlag: boolean,
    hasDataFlag: boolean,
  ) => {
    const isFailed = failedSources.includes(srcName);
    const isActive = activeName === srcName;

    if (isActive) {
      if (srcName === "VidRock")
        return "border-nebula-cyan bg-nebula-cyan/10 shadow-[0_0_15px_rgba(0,229,255,0.12)] ring-1 ring-nebula-cyan/35 scale-[1.01] cursor-default";
      if (srcName === "Vidnest")
        return "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/35 scale-[1.01] cursor-default";
      if (srcName === "Vaplayer")
        return "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.12)] ring-1 ring-cyan-500/35 scale-[1.01] cursor-default";
      if (srcName === "Vidrift")
        return "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(217,70,239,0.12)] ring-1 ring-fuchsia-500/35 scale-[1.01] cursor-default";
      if (srcName === "FilmU")
        return "border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.12)] ring-1 ring-amber-500/35 scale-[1.01] cursor-default";
      if (srcName === "VidLink")
        return "border-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.12)] ring-1 ring-white/35 scale-[1.01] cursor-default";
      if (srcName === "Videasy")
        return "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.12)] ring-1 ring-indigo-500/35 scale-[1.01] cursor-default";
    }

    if (isFailed) {
      return "border-red-500/40 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.08)] cursor-pointer active:scale-95";
    }

    if (loadingFlag) {
      return "border-white/5 bg-white/2 opacity-60 cursor-wait";
    }

    if (hasDataFlag) {
      if (srcName === "VidRock")
        return "border-nebula-cyan/30 bg-nebula-cyan/5 hover:bg-nebula-cyan/10 active:scale-95 cursor-pointer";
      if (srcName === "Vidnest")
        return "border-emerald-500/35 bg-emerald-500/5 hover:bg-emerald-500/10 active:scale-95 cursor-pointer";
      if (srcName === "Vaplayer")
        return "border-cyan-500/35 bg-cyan-500/5 hover:bg-cyan-500/10 active:scale-95 cursor-pointer";
      if (srcName === "Vidrift")
        return "border-fuchsia-500/35 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 active:scale-95 cursor-pointer";
      if (srcName === "FilmU")
        return "border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10 active:scale-95 cursor-pointer";
      if (srcName === "VidLink")
        return "border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 cursor-pointer";
      if (srcName === "Videasy")
        return "border-indigo-500/35 bg-indigo-500/5 hover:bg-indigo-500/10 active:scale-95 cursor-pointer";
    }

    return "border-white/5 bg-white/2 opacity-40 cursor-not-allowed";
  };

  return (
    <div className="flex flex-col gap-2 p-1 overflow-y-auto max-h-[45vh] custom-scrollbar">
      {/* VidRock */}
      <button
        onClick={() =>
          (sources.length > 0 || failedSources.includes("VidRock")) &&
          onSelect(vidrockUrl)
        }
        disabled={
          activeSource === "VidRock" ||
          (loading && !failedSources.includes("VidRock"))
        }
        className={`w-full flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${getButtonClass(
          "VidRock",
          activeSource || "",
          loading,
          sources.length > 0,
        )}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-nebula-cyan/15 flex items-center justify-center text-nebula-cyan shrink-0">
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Info size={13} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-white uppercase tracking-tight">
                  VidRock
                </p>
                {failedSources.includes("VidRock") && sources.length === 0 && (
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-wider shrink-0">
                    FAILED
                  </span>
                )}
              </div>
              <p className="text-[8px] text-white/40 uppercase font-semibold mt-0.5">
                {loading ? "Scanning..." : "High-Speed"}
              </p>
            </div>
          </div>
          {activeSource === "VidRock" && (
            <span className="w-1.5 h-1.5 rounded-full bg-nebula-cyan shadow-[0_0_8px_#00e5ff] shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {loading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse font-medium">
              Running uplink check...
            </span>
          ) : sources.length > 0 ? (
            sources.map((s) => (
              <span
                key={s.name}
                className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-nebula-cyan/20 text-nebula-cyan/80 bg-nebula-cyan/5 uppercase tracking-wide"
              >
                {s.name
                  .replace(/^VidRock\s*\((.*?)\)$/i, "$1")
                  .replace(/^VidRock/i, "")
                  .trim()
                  .toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-rose-400 uppercase font-medium">
              {error || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* Vaplayer */}
      <button
        onClick={() =>
          (vaplayerSources.length > 0 || failedSources.includes("Vaplayer")) &&
          onSelect(vaplayerUrl)
        }
        disabled={
          activeSource === "Vaplayer" ||
          (vaplayerLoading && !failedSources.includes("Vaplayer"))
        }
        className={`w-full flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${getButtonClass(
          "Vaplayer",
          activeSource || "",
          vaplayerLoading,
          vaplayerSources.length > 0,
        )}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
              {vaplayerLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Tv size={13} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-white uppercase tracking-tight">
                  Vaplayer
                </p>
                {failedSources.includes("Vaplayer") && vaplayerSources.length === 0 && (
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-wider shrink-0">
                    FAILED
                  </span>
                )}
              </div>
              <p className="text-[8px] text-white/40 uppercase font-semibold mt-0.5">
                {vaplayerLoading ? "Scanning..." : "Active"}
              </p>
            </div>
          </div>
          {activeSource === "Vaplayer" && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {vaplayerLoading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse font-medium">
              Running direct scan...
            </span>
          ) : vaplayerSources.length > 0 ? (
            vaplayerSources.map((s) => (
              <span
                key={s.name}
                className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/20 text-cyan-400/80 bg-cyan-500/5 uppercase tracking-wide"
              >
                {s.name
                  .replace(/^Vaplayer[\s-]*/i, "")
                  .trim()
                  .toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-rose-400 uppercase font-medium">
              {vaplayerError || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* Videasy */}
      <button
        onClick={() =>
          (videasySources.length > 0 || failedSources.includes("Videasy")) &&
          onSelect(videasyUrl)
        }
        disabled={
          activeSource === "Videasy" ||
          (videasyLoading && !failedSources.includes("Videasy"))
        }
        className={`w-full flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${getButtonClass(
          "Videasy",
          activeSource || "",
          videasyLoading,
          videasySources.length > 0,
        )}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
              {videasyLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Tv size={13} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-white uppercase tracking-tight">
                  Videasy
                </p>
                {failedSources.includes("Videasy") && videasySources.length === 0 && (
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-wider shrink-0">
                    FAILED
                  </span>
                )}
              </div>
              <p className="text-[8px] text-white/40 uppercase font-semibold mt-0.5">
                {videasyLoading ? "Decrypting..." : "Decrypted"}
              </p>
            </div>
          </div>
          {activeSource === "Videasy" && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {videasyLoading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse font-medium">
              Running decrypt scan...
            </span>
          ) : videasySources.length > 0 ? (
            <>
              {videasySources.slice(0, 3).map((s) => (
                <span
                  key={s.name}
                  className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/20 text-indigo-400/80 bg-indigo-500/5 uppercase tracking-wide"
                >
                  {s.name
                    .replace(/^Videasy\s*\((.*?)\)$/i, "$1")
                    .replace(/^Videasy/i, "")
                    .trim()
                    .toUpperCase()}
                </span>
              ))}
              {videasySources.length > 3 && (
                <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-white/10 text-white/40 bg-white/5 uppercase tracking-wide">
                  +{videasySources.length - 3}
                </span>
              )}
            </>
          ) : (
            <span className="text-[8px] text-rose-400 uppercase font-medium">
              {videasyError || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* Vidrift */}
      <button
        onClick={() =>
          (vidriftSources.length > 0 || failedSources.includes("Vidrift")) &&
          onSelect(vidriftUrl)
        }
        disabled={
          activeSource === "Vidrift" ||
          (vidriftLoading && !failedSources.includes("Vidrift"))
        }
        className={`w-full flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${getButtonClass(
          "Vidrift",
          activeSource || "",
          vidriftLoading,
          vidriftSources.length > 0,
        )}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-fuchsia-500/15 flex items-center justify-center text-fuchsia-400 shrink-0">
              {vidriftLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Tv size={13} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-white uppercase tracking-tight">
                  Vidrift
                </p>
                {failedSources.includes("Vidrift") && vidriftSources.length === 0 && (
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-wider shrink-0">
                    FAILED
                  </span>
                )}
              </div>
              <p className="text-[8px] text-white/40 uppercase font-semibold mt-0.5">
                {vidriftLoading ? "Scanning..." : "Active"}
              </p>
            </div>
          </div>
          {activeSource === "Vidrift" && (
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)] shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {vidriftLoading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse font-medium">
              Running direct scan...
            </span>
          ) : vidriftSources.length > 0 ? (
            vidriftSources.map((s) => (
              <span
                key={s.name}
                className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-fuchsia-500/20 text-fuchsia-400/80 bg-fuchsia-500/5 uppercase tracking-wide"
              >
                {s.name
                  .replace(/^Vidrift[\s-]*/i, "")
                  .trim()
                  .toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-rose-400 uppercase font-medium">
              {vidriftError || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* Vidnest */}
      <button
        onClick={() =>
          (vidnestSources.length > 0 || failedSources.includes("Vidnest")) &&
          onSelect(vidnestUrl)
        }
        disabled={
          activeSource === "Vidnest" ||
          (vidnestLoading && !failedSources.includes("Vidnest"))
        }
        className={`w-full flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${getButtonClass(
          "Vidnest",
          activeSource || "",
          vidnestLoading,
          vidnestSources.length > 0,
        )}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
              {vidnestLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Zap size={13} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-white uppercase tracking-tight">
                  Vidnest
                </p>
                {failedSources.includes("Vidnest") && vidnestSources.length === 0 && (
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-wider shrink-0">
                    FAILED
                  </span>
                )}
              </div>
              <p className="text-[8px] text-white/40 uppercase font-semibold mt-0.5">
                {vidnestLoading ? "Scanning..." : "Active"}
              </p>
            </div>
          </div>
          {activeSource === "Vidnest" && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {vidnestLoading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse font-medium">
              Running uplink check...
            </span>
          ) : vidnestSources.length > 0 ? (
            vidnestSources.map((s) => (
              <span
                key={s.name}
                className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 text-emerald-400/80 bg-emerald-500/5 uppercase tracking-wide"
              >
                {s.name
                  .replace(/^Vidnest\s*-\s*/i, "")
                  .replace(/^Vidnest\s*\(([^)]+)\)$/i, "$1")
                  .replace(/^Vidnest\s*/i, "")
                  .replace(/^\(([^)]+)\)$/, "$1")
                  .trim()
                  .toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-rose-400 uppercase font-medium">
              {vidnestError || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* FilmU */}
      <button
        onClick={() =>
          (filmuSources.length > 0 || failedSources.includes("FilmU")) &&
          onSelect(filmuUrl)
        }
        disabled={
          activeSource === "FilmU" ||
          (filmuLoading && !failedSources.includes("FilmU"))
        }
        className={`w-full flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${getButtonClass(
          "FilmU",
          activeSource || "",
          filmuLoading,
          filmuSources.length > 0,
        )}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
              {filmuLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Info size={13} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-white uppercase tracking-tight">
                  FilmU
                </p>
                {failedSources.includes("FilmU") && filmuSources.length === 0 && (
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-wider shrink-0">
                    FAILED
                  </span>
                )}
              </div>
              <p className="text-[8px] text-white/40 uppercase font-semibold mt-0.5">
                {filmuLoading ? "Scanning..." : "Active"}
              </p>
            </div>
          </div>
          {activeSource === "FilmU" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {filmuLoading ? (
            <span className="text-[8px] text-white/20 uppercase tracking-widest animate-pulse font-medium">
              Running uplink check...
            </span>
          ) : filmuSources.length > 0 ? (
            filmuSources.map((s) => (
              <span
                key={s.name}
                className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 text-amber-400/80 bg-amber-500/5 uppercase tracking-wide"
              >
                {s.name
                  .replace(/^FilmU[\s-]*/i, "")
                  .trim()
                  .toUpperCase()}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-rose-400 uppercase font-medium">
              {filmuError || "No mirrors"}
            </span>
          )}
        </div>
      </button>

      {/* VidLink */}
      <button
        onClick={() => onSelect()}
        disabled={activeSource === "VidLink"}
        className={`w-full flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all ${getButtonClass(
          "VidLink",
          activeSource || "",
          false,
          true,
        )}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-white/10 flex items-center justify-center text-white/60 shrink-0">
              <Search size={13} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-white uppercase tracking-tight">
                  VidLink
                </p>
                {failedSources.includes("VidLink") && (
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-wider shrink-0">
                    FAILED
                  </span>
                )}
              </div>
              <p className="text-[8px] text-white/40 uppercase font-semibold mt-0.5">
                Standard
              </p>
            </div>
          </div>
          {activeSource === "VidLink" && (
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] shrink-0" />
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded border border-white/15 text-white/50 bg-white/5 uppercase tracking-wide">
            Auto-Failover
          </span>
        </div>
      </button>
    </div>
  );
}
