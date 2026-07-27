import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Star,
  Clock,
  Calendar,
  Shield,
  AudioWaveform as Waveform,
  Sparkles,
  Maximize,
  Play,
  X,
  Plus,
  Zap,
  Server,
  Activity,
  Loader2,
  Download,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Smartphone,
  FileDown,
  Globe,
  Tv,
  RotateCw,
  Film,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import {
  handleImageError,
  handleClearLogoError,
  triggerPopunder,
  formatSeasonName,
} from "../utils/helpers";
import { fetchVideasySourcesDirect } from "../services/videasy";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getMediaDetails,
  getMediaBasicInfo,
  enrichMoviesWithMetadata,
  getTVDetails,
  getTVSeasonEpisodes,
  getMediaReviews,
  type TMDBReview,
} from "../services/tmdb";
import { MovieDetailsSkeleton } from "./MovieDetailsSkeleton";

// ─── Source Selection Modal (Reimagined) ─────────────────────────────────────

interface ProviderConfig {
  id: string;
  name: string;
  badge: string;
  // tailwind color token (no opacity suffix) used for dots/badges
  colorClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  buildUrl: (params: {
    tmdbId: string | number;
    type: string;
    title: string;
    year: string | number;
    releaseDate?: string;
    season?: number;
    episode?: number;
    force: boolean;
  }) => string | null;
  serializeExtra?: (src: any) => string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "vaplayer",
    name: "Quantum",
    badge: "GLOBAL MIRRORS",
    colorClass: "cyan",
    borderClass: "border-cyan-500/40",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/vaplayer?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "vidrock",
    name: "Hyperion",
    badge: "DEFAULT",
    colorClass: "nebula-cyan",
    borderClass: "border-nebula-cyan/40",
    bgClass: "bg-nebula-cyan/10",
    textClass: "text-nebula-cyan",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/vidrock?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "hdghartv",
    name: "Aether",
    badge: "MULTI-AUDIO",
    colorClass: "emerald",
    borderClass: "border-emerald-500/40",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
    buildUrl: ({ tmdbId, type, title, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/hdghartv?tmdbId=${tmdbId}&type=${type}&title=${encodeURIComponent(title)}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
    serializeExtra: (src) => src.audio || "",
  },
  {
    id: "netnaija",
    name: "Vesper",
    badge: "DIRECT MP4",
    colorClass: "cyan",
    borderClass: "border-cyan-500/40",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400",
    buildUrl: ({ tmdbId, type, title, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/netnaija?tmdbId=${tmdbId}&type=${type}&title=${encodeURIComponent(title)}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
    serializeExtra: (src) => src.audio || "",
  },
  {
    id: "videasy",
    name: "Pulse",
    badge: "WASM DECRYPT",
    colorClass: "violet",
    borderClass: "border-violet-500/40",
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-400",
    buildUrl: () => null, // handled specially via fetchVideasySourcesDirect
    serializeExtra: (src) => src.audio || "",
  },
  {
    id: "vidlink",
    name: "Spectra",
    badge: "INDEX NODE",
    colorClass: "slate",
    borderClass: "border-white/20",
    bgClass: "bg-white/10",
    textClass: "text-white/70",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/vidlink?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "vidnest",
    name: "Titan",
    badge: "DIRECT",
    colorClass: "emerald",
    borderClass: "border-emerald-500/40",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/vidnest?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "kuro_sub",
    name: "Zenith (Sub)",
    badge: "JPN AUDIO",
    colorClass: "violet",
    borderClass: "border-violet-500/40",
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-400",
    buildUrl: ({ tmdbId, type, title, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/kuro?tmdbId=${tmdbId}&type=${type}&title=${encodeURIComponent(title)}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "kuro_dub",
    name: "Zenith (Dub)",
    badge: "ENG DUB",
    colorClass: "pink",
    borderClass: "border-pink-500/40",
    bgClass: "bg-pink-500/10",
    textClass: "text-pink-400",
    buildUrl: ({ tmdbId, type, title, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/kuro?tmdbId=${tmdbId}&type=${type}&title=${encodeURIComponent(title)}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "vidrift",
    name: "Velocity",
    badge: "HLS STREAM",
    colorClass: "fuchsia",
    borderClass: "border-fuchsia-500/40",
    bgClass: "bg-fuchsia-500/10",
    textClass: "text-fuchsia-400",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/vidrift?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "peachify",
    name: "Aurora",
    badge: "HLS",
    colorClass: "rose",
    borderClass: "border-rose-500/40",
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-400",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/peachify?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
];

type ProviderState = {
  sources: any[];
  loading: boolean;
  error: string;
};

type ScanState = Record<string, ProviderState>;

type ScanAction =
  | { type: "RESET" }
  | { type: "LOADED"; id: string; sources: any[] }
  | { type: "ERROR"; id: string; error: string };

function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case "RESET": {
      const fresh: ScanState = {};
      PROVIDERS.forEach((p) => {
        fresh[p.id] = { sources: [], loading: true, error: "" };
      });
      return fresh;
    }
    case "LOADED":
      return {
        ...state,
        [action.id]: { sources: action.sources, loading: false, error: "" },
      };
    case "ERROR":
      return {
        ...state,
        [action.id]: { sources: [], loading: false, error: action.error },
      };
    default:
      return state;
  }
}

function buildInitialScanState(): ScanState {
  const s: ScanState = {};
  PROVIDERS.forEach((p) => {
    s[p.id] = { sources: [], loading: true, error: "" };
  });
  return s;
}

// Serialize sources into the pipe-delimited URL string the player consumes
function serializeSources(sources: any[], extra?: (s: any) => string): string {
  return sources
    .map((s) => {
      if (s.url.includes("#")) return s.url;
      const ex = extra ? extra(s) : "";
      return `${s.url}#${s.name}#${s.type}${ex ? `#${ex}` : ""}`;
    })
    .join("|");
}

// localStorage key for per-title preferred provider
function prefKey(tmdbId: string | number, type: string): string {
  return `nebula-src-pref:${type}:${tmdbId}`;
}

interface SourceSelectionModalProps {
  movie: any;
  season?: number;
  episode?: number;
  onClose: () => void;
  onSelect: (sourceUrl?: string) => void;
}

const AutoPlayBanner = React.memo<{
  providerName: string;
  countdown: number;
  onCancel: () => void;
}>(({ providerName, countdown, onCancel }) => (
  <div className="mx-3 mt-2.5 flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-nebula-cyan/20 bg-nebula-cyan/5 shrink-0">
    <div className="flex items-center gap-2">
      <Loader2 size={11} className="text-nebula-cyan animate-spin shrink-0" />
      <p className="text-[10px] text-nebula-cyan/90 font-semibold">
        Auto-playing <span className="font-black">{providerName}</span> in{" "}
        {countdown}s
      </p>
    </div>
    <button
      onClick={onCancel}
      className="text-[9px] font-bold text-white/40 hover:text-white uppercase tracking-wide transition-colors"
    >
      Cancel
    </button>
  </div>
));

export const SourceSelectionModal: React.FC<SourceSelectionModalProps> = ({
  movie,
  season,
  episode,
  onClose,
  onSelect,
}) => {
  const [scan, dispatch] = React.useReducer(
    scanReducer,
    undefined,
    buildInitialScanState,
  );
  const [autoPlayId, setAutoPlayId] = React.useState<string | null>(null);
  const [autoPlayCountdown, setAutoPlayCountdown] = React.useState(3);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const isMountedRef = useRef(true);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Persistent ref so cancellation survives scan-state updates that would
  // otherwise re-trigger the autoplay selection effect.
  const autoPlayCancelledRef = useRef(false);
  // Grace-period timer: we wait up to AUTOPLAY_GRACE_MS after the *first*
  // provider resolves so that higher-priority sources (Quantum) have time
  // to come back before we lock in a lower-priority autoplay pick.
  const autoPlayGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayGraceElapsedRef = useRef(false);

  // ── Fetch orchestration ────────────────────────────────────────────────────
  const runScan = React.useCallback(
    async (force = false) => {
      dispatch({ type: "RESET" });

      const params = {
        tmdbId: movie.id,
        type: movie.type,
        title: movie.title || "",
        year: movie.year || "",
        season,
        episode,
        force,
      };

      // Prefetch subtitles in the background
      let subUrl = `${API_BASE_URL}/api/subtitles?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}${force ? "&force=1" : ""}`;
      if (season !== undefined) subUrl += `&season=${season}`;
      if (episode !== undefined) subUrl += `&episode=${episode}`;
      fetch(subUrl).catch(() => {});

      // Collect all per-provider fetch promises
      const tasks = PROVIDERS.map(async (p) => {
        try {
          let rawSources: any[] = [];

          if (p.id === "videasy") {
            const data = await fetchVideasySourcesDirect(
              movie,
              season,
              episode,
              API_BASE_URL,
            );
            rawSources = Object.entries(data)
              .filter(([, v]: any) => v && v.url)
              .map(([name, v]: any) => ({
                name: name.startsWith("Videasy") ? name : `Videasy (${name})`,
                url: v.url,
                type: v.type || "hls",
                audio: v.audio || "",
              }));
          } else {
            const url = p.buildUrl(params);
            if (!url) {
              dispatch({ type: "LOADED", id: p.id, sources: [] });
              return;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error(`${p.name} scan failed`);
            const data = await res.json();
            const all = Object.entries(data)
              .filter(([, v]: any) => v && v.url)
              .map(([name, v]: any) => ({
                name: name.startsWith("Kuro") ? name : (v as any).name || name,
                url: (v as any).url,
                type: (v as any).type || "hls",
                quality: (v as any).quality || "Auto",
                audio: (v as any).audio || "",
              }));

            if (p.id === "kuro_sub") {
              const subSrcs = all.filter(
                (s) =>
                  s.name.toUpperCase().includes("SUB") ||
                  s.audio === "Japanese Sub",
              );
              rawSources = subSrcs.length > 0 ? subSrcs : all;
            } else if (p.id === "kuro_dub") {
              const dubSrcs = all.filter(
                (s) =>
                  s.name.toUpperCase().includes("DUB") ||
                  s.audio === "English Dub",
              );
              rawSources = dubSrcs.length > 0 ? dubSrcs : all;
            } else {
              rawSources = all;
            }
          }

          if (!isMountedRef.current) return;
          dispatch({ type: "LOADED", id: p.id, sources: rawSources });
        } catch (e: any) {
          if (!isMountedRef.current) return;
          dispatch({
            type: "ERROR",
            id: p.id,
            error: e.message || "Scan failed",
          });
        }
      });

      await Promise.allSettled(tasks);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movie.id, movie.type, movie.title, movie.year, season, episode],
  );

  useEffect(() => {
    isMountedRef.current = true;
    // Reset cancelled flag + grace-period state for a fresh scan.
    autoPlayCancelledRef.current = false;
    autoPlayGraceElapsedRef.current = false;
    if (autoPlayGraceTimerRef.current) {
      clearTimeout(autoPlayGraceTimerRef.current);
      autoPlayGraceTimerRef.current = null;
    }
    runScan(false);
    return () => {
      isMountedRef.current = false;
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
      if (autoPlayGraceTimerRef.current) clearTimeout(autoPlayGraceTimerRef.current);
    };
  }, [runScan]);

  // ── Auto-play selection and countdown ──────────────────────────────────────
  // Strictly respects PROVIDERS order (Quantum #1, Hyperion #2, etc.)
  useEffect(() => {
    if (autoPlayCancelledRef.current) return;
    if (autoPlayId !== null) return; // already selected an autoplay provider

    const firstReadyProviderWithData = PROVIDERS.find(
      (p) => (scan[p.id]?.sources.length ?? 0) > 0,
    );

    // #1 provider in PROVIDERS array is Quantum (vaplayer)
    const isQuantumReady = (scan["vaplayer"]?.sources.length ?? 0) > 0;
    const isQuantumLoading = scan["vaplayer"]?.loading ?? true;

    // If Quantum (provider #1) is ready with sources, pick Quantum IMMEDIATELY!
    if (isQuantumReady) {
      if (autoPlayGraceTimerRef.current) {
        clearTimeout(autoPlayGraceTimerRef.current);
        autoPlayGraceTimerRef.current = null;
      }
      setAutoPlayId("vaplayer");
      setAutoPlayCountdown(3);
      return;
    }

    // If Quantum is still loading but another provider resolved with sources,
    // wait up to 3.5s for Quantum to finish scanning.
    if (firstReadyProviderWithData && isQuantumLoading) {
      if (!autoPlayGraceTimerRef.current) {
        autoPlayGraceTimerRef.current = setTimeout(() => {
          autoPlayGraceTimerRef.current = null;
          if (autoPlayCancelledRef.current) return;

          // Grace period expired: pick the highest-priority provider in PROVIDERS order that has sources
          const bestInOrder = PROVIDERS.find(
            (p) => (scan[p.id]?.sources.length ?? 0) > 0,
          );
          if (bestInOrder) {
            setAutoPlayId(bestInOrder.id);
            setAutoPlayCountdown(3);
          }
        }, 3500);
      }
      return;
    }

    // If Quantum finished loading and has 0 sources, pick highest-priority ready provider immediately
    if (!isQuantumLoading && firstReadyProviderWithData) {
      if (autoPlayGraceTimerRef.current) {
        clearTimeout(autoPlayGraceTimerRef.current);
        autoPlayGraceTimerRef.current = null;
      }
      setAutoPlayId(firstReadyProviderWithData.id);
      setAutoPlayCountdown(3);
    }
  }, [scan, autoPlayId]);

  useEffect(() => {
    if (autoPlayId === null) return;
    if (autoPlayCountdown <= 0) {
      // Fire auto-play
      const p = PROVIDERS.find((pp) => pp.id === autoPlayId);
      if (p) {
        const srcs = scan[p.id]?.sources ?? [];
        if (srcs.length > 0) {
          localStorage.setItem(prefKey(movie.id, movie.type), p.id);
          onSelect(serializeSources(srcs, p.serializeExtra));
        }
      }
      return;
    }
    const t = setTimeout(() => setAutoPlayCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [autoPlayId, autoPlayCountdown, scan, movie.id, movie.type, onSelect]);

  // Cancel auto-play when user interacts with any row.
  // Sets a persistent ref so the selection effect won't re-trigger even if
  // the scan state later changes (new providers resolving).
  const cancelAutoPlay = React.useCallback(() => {
    autoPlayCancelledRef.current = true;
    // Also clear any pending grace-period timer.
    if (autoPlayGraceTimerRef.current) {
      clearTimeout(autoPlayGraceTimerRef.current);
      autoPlayGraceTimerRef.current = null;
    }
    setAutoPlayId(null);
    setAutoPlayCountdown(3);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isGloballyLoading = PROVIDERS.some((p) => scan[p.id]?.loading);
  const readyCount = PROVIDERS.filter((p) => !scan[p.id]?.loading).length;

  const handleSelectProvider = (p: ProviderConfig) => {
    const srcs = scan[p.id]?.sources ?? [];
    if (!srcs.length) return;
    cancelAutoPlay();
    localStorage.setItem(prefKey(movie.id, movie.type), p.id);
    setSelectedId(p.id);
    onSelect(serializeSources(srcs, p.serializeExtra));
  };

  const handleSelectMirror = (
    e: React.MouseEvent,
    p: ProviderConfig,
    src: any,
    allSrcs: any[],
  ) => {
    e.stopPropagation();
    cancelAutoPlay();
    localStorage.setItem(prefKey(movie.id, movie.type), p.id);
    setSelectedId(p.id);
    const reordered = [src, ...allSrcs.filter((s) => s.name !== src.name)];
    onSelect(serializeSources(reordered, p.serializeExtra));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm transform-gpu"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg bg-[#0a0a0f] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden transform-gpu"
        style={{ animation: "modalSlideIn 0.18s ease-out" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-nebula-cyan shadow-[0_0_8px_#00e5ff] shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/90 leading-none">
                Source Selection
              </p>
              <p className="text-[10px] text-white/35 font-medium mt-0.5 leading-none">
                {movie.title}
                {season !== undefined && ` · S${season}E${episode}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Progress bar */}
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-nebula-cyan/60 rounded-full transition-all duration-500"
                  style={{ width: `${(readyCount / PROVIDERS.length) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-white/30 font-mono tabular-nums">
                {readyCount}/{PROVIDERS.length}
              </span>
            </div>
            {/* Rescan */}
            <button
              onClick={() => {
                cancelAutoPlay();
                runScan(true);
              }}
              disabled={isGloballyLoading}
              title="Force re-scan all providers"
              className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCw
                size={13}
                className={
                  isGloballyLoading ? "animate-spin text-nebula-cyan" : ""
                }
              />
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Auto-play banner ── */}
        {autoPlayId !== null && (
          <AutoPlayBanner
            providerName={
              PROVIDERS.find((p) => p.id === autoPlayId)?.name || ""
            }
            countdown={autoPlayCountdown}
            onCancel={cancelAutoPlay}
          />
        )}

        {/* ── Provider list ── */}
        <div className="overflow-y-auto custom-scrollbar flex-1 px-3 py-2 space-y-1">
          {PROVIDERS.map((p, i) => {
            const st = scan[p.id] ?? { sources: [], loading: true, error: "" };
            const isActive = selectedId === p.id;
            const isAutoPlay = autoPlayId === p.id;
            const hasData = st.sources.length > 0;
            const isReady = !st.loading;

            return (
              <div
                key={p.id}
                onClick={() =>
                  !st.loading && hasData && handleSelectProvider(p)
                }
                style={{
                  animationDelay: `${i * 30}ms`,
                  animation: "rowFadeIn 0.2s ease-out both",
                }}
                className={[
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 select-none",
                  st.loading
                    ? "border-white/[0.06] bg-white/[0.02] opacity-70 cursor-wait"
                    : isActive
                      ? `${p.borderClass} ${p.bgClass} cursor-default`
                      : hasData
                        ? `border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] cursor-pointer active:scale-[0.99]`
                        : "border-white/[0.04] opacity-30 cursor-not-allowed",
                ].join(" ")}
              >
                {/* Status indicator */}
                <div className="shrink-0 w-1.5">
                  {st.loading ? (
                    <span className="block w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
                  ) : hasData ? (
                    <span
                      className={`block w-1.5 h-1.5 rounded-full ${p.textClass.replace("text-", "bg-")} ${isAutoPlay || isActive ? "shadow-[0_0_6px_currentColor]" : ""}`}
                    />
                  ) : (
                    <span className="block w-1.5 h-1.5 rounded-full bg-red-500/50" />
                  )}
                </div>

                {/* Name + badge */}
                <div className="flex items-center gap-1.5 min-w-[100px]">
                  <span
                    className={`text-xs font-black uppercase tracking-tight ${hasData ? "text-white" : "text-white/30"} group-hover:${p.textClass} transition-colors`}
                  >
                    {p.name}
                  </span>
                  <span
                    className={`text-[7px] font-black px-1 py-px rounded border ${p.borderClass} ${p.bgClass} ${p.textClass} uppercase tracking-wider opacity-70`}
                  >
                    {p.badge}
                  </span>
                </div>

                {/* Mirrors / state */}
                <div className="flex-1 min-w-0">
                  {st.loading ? (
                    <span className="text-[9px] text-white/20 font-medium uppercase tracking-wider animate-pulse">
                      scanning…
                    </span>
                  ) : hasData ? (
                    <div className="flex flex-wrap gap-1">
                      {st.sources.slice(0, 5).map((src) => {
                        let s = (src.name || "").trim();
                        s = s.replace(/^[-_\s]*\d*[-_\s]*/, "");
                        s = s
                          .replace(
                            /^(VidRock|Videasy|VidLink|FilmU|Vidnest|Vaplayer|Vidplay|Vidrift|Peachify|Kuro|HDGharTV|NetNaija|HOLLYMOVIEHD)\s*[-_()]*/i,
                            "",
                          )
                          .trim();
                        const pMatch = s.match(/\(([^)]+)\)/);
                        if (
                          pMatch &&
                          pMatch[1] &&
                          pMatch[1].toUpperCase() !== "AUTO"
                        ) {
                          s = pMatch[1];
                        }
                        s = s
                          .replace(/[()]/g, "")
                          .replace(/^[-_\s]+/, "")
                          .trim();
                        const isSub =
                          /\bSUB\b/i.test(s) || /Japanese Sub/i.test(s);
                        const isDub =
                          /\bDUB\b/i.test(s) || /English Dub/i.test(s);
                        if (isSub) {
                          const num = s.match(/\d+/);
                          s = num ? `SUB ${num[0]}` : "SUB";
                        } else if (isDub) {
                          const num = s.match(/\d+/);
                          s = num ? `DUB ${num[0]}` : "DUB";
                        }
                        if (!s || s.length < 2) {
                          s =
                            src.quality && src.quality !== "Auto"
                              ? src.quality
                              : "HD";
                        }
                        const label = s.toUpperCase();

                        return (
                          <button
                            key={src.name}
                            title={`Play ${p.name} — ${label}`}
                            onClick={(e) =>
                              handleSelectMirror(e, p, src, st.sources)
                            }
                            className={`text-[8px] font-bold px-1.5 py-px rounded border ${p.borderClass} ${p.bgClass} ${p.textClass} uppercase hover:opacity-100 opacity-70 transition-opacity cursor-pointer`}
                          >
                            {label}
                          </button>
                        );
                      })}
                      {st.sources.length > 5 && (
                        <span className="text-[8px] text-white/25 font-bold px-1.5 py-px">
                          +{st.sources.length - 5}
                        </span>
                      )}
                    </div>
                  ) : isReady ? (
                    <span className="text-[9px] text-rose-400/60 font-medium uppercase tracking-wide">
                      {st.error ? "offline" : "no mirrors"}
                    </span>
                  ) : null}
                </div>

                {/* Right: active dot or auto-play ring */}
                <div className="shrink-0 w-5 flex items-center justify-center">
                  {isActive && (
                    <span
                      className={`w-2 h-2 rounded-full ${p.textClass.replace("text-", "bg-")}`}
                    />
                  )}
                  {isAutoPlay && !isActive && (
                    <div className="relative w-4 h-4 flex items-center justify-center">
                      <svg
                        className="absolute inset-0 w-4 h-4 -rotate-90"
                        viewBox="0 0 16 16"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className={p.textClass}
                          strokeOpacity="0.2"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className={p.textClass}
                          strokeDasharray={`${2 * Math.PI * 6}`}
                          strokeDashoffset={`${2 * Math.PI * 6 * (autoPlayCountdown / 3)}`}
                          style={{ transition: "stroke-dashoffset 1s linear" }}
                        />
                      </svg>
                      <span className={`text-[7px] font-black ${p.textClass}`}>
                        {autoPlayCountdown}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer hint ── */}
        <div className="px-4 py-2.5 border-t border-white/[0.07] shrink-0">
          <p className="text-[9px] text-white/20 font-medium text-center">
            Click a provider to play · Click a mirror badge for a specific
            stream
          </p>
        </div>
      </div>
    </div>
  );
};

interface MovieDetailsProps {
  movie?: any;
  onClose: () => void;
  onPlay: (
    season?: number,
    episode?: number,
    source?: string,
    loadedMovie?: any,
  ) => void;
  onSelectMovie?: (m: any) => void;
  onSelectActor?: (actorId: string | number) => void;
  isInList: boolean;
  onToggleList: () => void;
}

export const MovieDetails: React.FC<MovieDetailsProps> = ({
  movie: initialMovie,
  onClose,
  onPlay,
  onSelectMovie,
  onSelectActor,
  isInList,
  onToggleList,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState<any>(initialMovie);
  const [logoFailed, setLogoFailed] = useState(false);
  const [activeTab, setActiveTab] = useState(
    initialMovie?.type === "tv" ? "Episodes" : "Overview",
  );
  const [reviews, setReviews] = useState<TMDBReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<
    Record<string, boolean>
  >({});
  const [showAllTrailers, setShowAllTrailers] = useState(false);

  useEffect(() => {
    if (!movie || !movie.id) return;
    setReviewsLoading(true);
    getMediaReviews(movie.id, movie.type || "movie")
      .then((res) => setReviews(res.results || []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [movie?.id, movie?.type]);
  const [deepDetails, setDeepDetails] = useState<{
    trailers: any[];
    similar: any[];
    cast: any[];
  }>({
    trailers: [],
    similar: [],
    cast: [],
  });

  const [tvDetails, setTvDetails] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const [dropUpSeasonDropdown, setDropUpSeasonDropdown] = useState(false);
  const seasonButtonRef = useRef<HTMLButtonElement>(null);
  const seasonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSeasonDropdown && seasonButtonRef.current) {
      const handle = requestAnimationFrame(() => {
        if (!seasonButtonRef.current) return;
        const rect = seasonButtonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setDropUpSeasonDropdown(spaceBelow < 280);
      });
      return () => cancelAnimationFrame(handle);
    }
  }, [showSeasonDropdown]);

  useEffect(() => {
    if (!showSeasonDropdown) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        seasonContainerRef.current &&
        !seasonContainerRef.current.contains(event.target as Node)
      ) {
        setShowSeasonDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showSeasonDropdown]);

  const [episodes, setEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedEpForModal, setSelectedEpForModal] = useState<{
    season?: number;
    episode?: number;
  } | null>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);

  const [torrentData, setTorrentData] = useState<any>(null);
  const [torrentLoading, setTorrentLoading] = useState(false);
  const [torrentError, setTorrentError] = useState("");

  const [directData, setDirectData] = useState<any>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState("");

  const [activeDownloadSeason, setActiveDownloadSeason] = useState<number>(1);
  const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [backupTorrents, setBackupTorrents] = useState<Record<number, any[]>>(
    {},
  );
  const [backupTorrentsLoading, setBackupTorrentsLoading] = useState<
    Record<number, boolean>
  >({});
  const [backupDirectDownloads, setBackupDirectDownloads] = useState<
    Record<number, any[]>
  >({});
  const [backupDirectLoading, setBackupDirectLoading] = useState<
    Record<number, boolean>
  >({});

  const relatedRowRef = useRef<HTMLDivElement>(null);
  const [showRelatedLeftArrow, setShowRelatedLeftArrow] = useState(false);
  const [showRelatedRightArrow, setShowRelatedRightArrow] = useState(true);
  const [isRelatedHovered, setIsRelatedHovered] = useState(false);

  // Trailer quick-play modal
  const [trailerModalKey, setTrailerModalKey] = useState<string | null>(null);
  // Inline trailer playback in the Trailers & Extras tab
  const [activeTrailerIndex, setActiveTrailerIndex] = useState<number | null>(
    null,
  );

  const updateRelatedArrows = () => {
    if (relatedRowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = relatedRowRef.current;
      setShowRelatedLeftArrow(scrollLeft > 10);
      setShowRelatedRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    updateRelatedArrows();
    window.addEventListener("resize", updateRelatedArrows);
    return () => window.removeEventListener("resize", updateRelatedArrows);
  }, [deepDetails.similar]);

  const scrollRelated = (direction: "left" | "right") => {
    if (relatedRowRef.current) {
      const { clientWidth } = relatedRowRef.current;
      const scrollAmount =
        direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
      relatedRowRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const loadBackupTorrents = (epNum: number) => {
    // 1. Fetch Torrent Backups
    setBackupTorrentsLoading((prev) => ({ ...prev, [epNum]: true }));
    fetch(
      `${API_BASE_URL}/api/download/episode?tmdbId=${movie.id}&season=${activeDownloadSeason}&episode=${epNum}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load torrent backups");
        return res.json();
      })
      .then((data) => {
        setBackupTorrents((prev) => ({
          ...prev,
          [epNum]: data.torrents || [],
        }));
      })
      .catch((err) => {
        console.error("Torrent backup error:", err);
      })
      .finally(() => {
        setBackupTorrentsLoading((prev) => ({ ...prev, [epNum]: false }));
      });

    // 2. Fetch Direct Downloads
    setBackupDirectLoading((prev) => ({ ...prev, [epNum]: true }));
    fetch(
      `${API_BASE_URL}/api/download/episode/direct?tmdbId=${movie.id}&season=${activeDownloadSeason}&episode=${epNum}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load direct backups");
        return res.json();
      })
      .then((data) => {
        setBackupDirectDownloads((prev) => ({
          ...prev,
          [epNum]: data.directDownloads || [],
        }));
      })
      .catch((err) => {
        console.error("Direct backup error:", err);
      })
      .finally(() => {
        setBackupDirectLoading((prev) => ({ ...prev, [epNum]: false }));
      });
  };

  const copyToClipboard = (text: string) => {
    triggerPopunder();
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  useEffect(() => {
    setTorrentData(null);
    setTorrentError("");
    setTorrentLoading(false);
    setDirectData(null);
    setDirectError("");
    setDirectLoading(false);
    setExpandedEpisode(null);
    setBackupTorrents({});
    setBackupTorrentsLoading({});
    setBackupDirectDownloads({});
    setBackupDirectLoading({});
    setLogoFailed(false);
  }, [movie?.id]);

  const handleRefetchDirect = (force = false) => {
    if (!movie?.id || !movie?.type) return;
    setDirectLoading(true);
    setDirectError("");
    const forceParam = force ? "&force=1" : "";
    const titleVal = movie.title || movie.name || "";
    const titleParam = titleVal ? `&title=${encodeURIComponent(titleVal)}` : "";
    fetch(
      `${API_BASE_URL}/api/download/direct?tmdbId=${movie.id}&type=${movie.type}${titleParam}${forceParam}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load direct downloads");
        return res.json();
      })
      .then((data) => {
        setDirectData(data);
      })
      .catch((err) => {
        setDirectError(
          err.message || "Failed to retrieve direct downloads.",
        );
      })
      .finally(() => {
        setDirectLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === "Downloads" && movie?.id) {
      if (!torrentData && !torrentLoading) {
        setTorrentLoading(true);
        setTorrentError("");
        fetch(
          `${API_BASE_URL}/api/download?tmdbId=${movie.id}&type=${movie.type}`,
        )
          .then((res) => {
            if (!res.ok) throw new Error("Failed to load torrent indexes");
            return res.json();
          })
          .then((data) => {
            setTorrentData(data);
          })
          .catch((err) => {
            setTorrentError(err.message || "Failed to retrieve torrents.");
          })
          .finally(() => {
            setTorrentLoading(false);
          });
      }

      if (!directData && !directLoading) {
        handleRefetchDirect(false);
      }
    }
  }, [
    activeTab,
    movie?.id,
    movie?.type,
    torrentData,
    torrentLoading,
    directData,
    directLoading,
  ]);

  // Background progressive batch prefetcher for TV episodes
  useEffect(() => {
    if (activeTab !== "Downloads" || movie?.type !== "tv" || !tvDetails) return;

    const seasonObj = tvDetails.seasons?.find(
      (s: any) => s.season_number === activeDownloadSeason,
    );
    if (!seasonObj) return;

    const episodeCount = seasonObj.episode_count || 0;
    if (episodeCount === 0) return;

    let active = true;

    const prefetchEpisodes = async () => {
      const BATCH_SIZE = 5;
      const DELAY_MS = 100;

      for (let i = 1; i <= episodeCount; i += BATCH_SIZE) {
        if (!active) break;

        const batch: number[] = [];
        for (let j = 0; j < BATCH_SIZE; j++) {
          const epNum = i + j;
          if (epNum > episodeCount) break;

          // Only prefetch if it hasn't started loading yet
          if (
            backupTorrents[epNum] === undefined &&
            !backupTorrentsLoading[epNum] &&
            backupDirectDownloads[epNum] === undefined &&
            !backupDirectLoading[epNum]
          ) {
            batch.push(epNum);
          }
        }

        if (batch.length > 0) {
          batch.forEach((epNum) => {
            // Fetch TV episode backup torrents
            setBackupTorrentsLoading((prev) => ({ ...prev, [epNum]: true }));
            fetch(
              `${API_BASE_URL}/api/download/episode?tmdbId=${movie.id}&season=${activeDownloadSeason}&episode=${epNum}`,
            )
              .then((res) => {
                if (!res.ok) throw new Error("Failed to load torrent backups");
                return res.json();
              })
              .then((data) => {
                if (active) {
                  setBackupTorrents((prev) => ({
                    ...prev,
                    [epNum]: data.torrents || [],
                  }));
                }
              })
              .catch((err) =>
                console.error(`Prefetch torrent error ep ${epNum}:`, err),
              )
              .finally(() => {
                if (active) {
                  setBackupTorrentsLoading((prev) => ({
                    ...prev,
                    [epNum]: false,
                  }));
                }
              });

            // Fetch TV episode direct downloads
            setBackupDirectLoading((prev) => ({ ...prev, [epNum]: true }));
            fetch(
              `${API_BASE_URL}/api/download/episode/direct?tmdbId=${movie.id}&season=${activeDownloadSeason}&episode=${epNum}`,
            )
              .then((res) => {
                if (!res.ok) throw new Error("Failed to load direct downloads");
                return res.json();
              })
              .then((data) => {
                if (active) {
                  setBackupDirectDownloads((prev) => ({
                    ...prev,
                    [epNum]: data.directDownloads || [],
                  }));
                }
              })
              .catch((err) =>
                console.error(`Prefetch direct error ep ${epNum}:`, err),
              )
              .finally(() => {
                if (active) {
                  setBackupDirectLoading((prev) => ({
                    ...prev,
                    [epNum]: false,
                  }));
                }
              });
          });

          // Rest for 100ms before starting the next batch
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    };

    prefetchEpisodes();

    return () => {
      active = false;
    };
  }, [activeTab, movie?.id, movie?.type, activeDownloadSeason, tvDetails]);

  const handlePlayClick = (s?: number, e?: number) => {
    triggerPopunder();
    setSelectedEpForModal({ season: s, episode: e });
    setShowSourceModal(true);

    if (movie?.id) {
      let subPrefetchUrl = `${API_BASE_URL}/api/subtitles?tmdbId=${movie.id}&type=${movie.type || "movie"}&title=${encodeURIComponent(movie.title || "")}`;
      if (s !== undefined) subPrefetchUrl += `&season=${s}`;
      if (e !== undefined) subPrefetchUrl += `&episode=${e}`;
      fetch(subPrefetchUrl).catch(() => {});
    }
  };

  const handleSelectSource = (sourceUrl?: string) => {
    setShowSourceModal(false);
    onPlay(
      selectedEpForModal?.season,
      selectedEpForModal?.episode,
      sourceUrl,
      movie,
    );
  };

  useEffect(() => {
    const fetchEverything = async () => {
      setIsLoading(true);

      let currentMovie = movie;
      const type = location.pathname.includes("/tv/") ? "tv" : "movie";
      const tmdbId = id || movie?.id;

      // If the URL points to a different title than what we have loaded,
      // discard the stale internal movie so the fetch branch below runs fresh.
      if (
        currentMovie &&
        tmdbId &&
        currentMovie.id.toString() !== tmdbId.toString()
      ) {
        currentMovie = null;
        setMovie(null);
        setDeepDetails({ trailers: [], similar: [], cast: [] });
      }

      if (!currentMovie && tmdbId) {
        // Landing directly on the URL
        if (typeof tmdbId === "string" && isNaN(parseInt(tmdbId))) {
          // It's a Drama slug! Set placeholder to trigger fetch
          currentMovie = {
            id: tmdbId,
            type: "tv",
            origin: "dramacool",
            isDrama: true,
          };
          setMovie(currentMovie);
        } else {
          const basic = await getMediaBasicInfo(tmdbId as any, type);
          if (basic) {
            // Enrich with premium assets immediately
            const enriched = await enrichMoviesWithMetadata([basic]);
            currentMovie = enriched[0];
            setMovie(currentMovie);
          }
        }
      }

      if (
        currentMovie &&
        !currentMovie.isDrama &&
        currentMovie.origin !== "dramacool" &&
        currentMovie.origin !== "kisskh"
      ) {
        const enriched = await enrichMoviesWithMetadata([currentMovie]);
        currentMovie = { ...currentMovie, ...enriched[0] };
        setMovie(currentMovie);
      }

      if (currentMovie) {
        if (
          currentMovie.origin === "dramacool" ||
          currentMovie.origin === "kisskh" ||
          currentMovie.isDrama
        ) {
          try {
            const apiBase = API_BASE_URL;
            const r = await fetch(
              `${apiBase}/api/drama/detail/${currentMovie.id}`,
            );
            const data = await r.json();
            if (data) {
              setMovie({
                ...currentMovie,
                description: data.description || currentMovie.description,
              });
              setEpisodes(data.episodes || []);
              setTvDetails({
                number_of_seasons: 1,
                seasons: [
                  {
                    season_number: 1,
                    name: "Season 1",
                    episode_count: data.episodes?.length || 0,
                  },
                ],
              });
            }
          } catch (e) {
            console.error("Failed to fetch KissKH details", e);
          }
        } else {
          const details = await getMediaDetails(
            currentMovie.id,
            currentMovie.type,
          );
          setDeepDetails(details);

          if (currentMovie.type === "tv") {
            const tvInfo = await getTVDetails(currentMovie.id);
            if (tvInfo) {
              setTvDetails(tvInfo);
              const eps = await getTVSeasonEpisodes(currentMovie.id, 1);
              setEpisodes(eps);
            }
          }
        }
      }
      setIsLoading(false);
    };
    fetchEverything();
  }, [id, initialMovie?.id]);

  useEffect(() => {
    if (
      movie?.type === "tv" &&
      movie?.id &&
      movie?.origin !== "kisskh" &&
      movie?.origin !== "dramacool" &&
      !movie?.isDrama
    ) {
      setEpisodesLoading(true);
      getTVSeasonEpisodes(movie.id, activeSeason)
        .then(setEpisodes)
        .finally(() => setEpisodesLoading(false));
    }
  }, [activeSeason]);

  if (!movie && isLoading) {
    return <MovieDetailsSkeleton onClose={onClose} />;
  }
  if (!movie) return null;

  const accentColor = movie.accent || "#00E5FF";
  const TABS =
    movie.type === "tv"
      ? ["Episodes", "Downloads", "Overview"]
      : ["Overview", "Downloads"];

  // Dynamically determine if the series has a new episode (aired in the last 7 days), is followed/in history, and has not been watched yet
  const hasNewEpisode = (() => {
    if (!movie || movie.type !== "tv") return false;

    const lastEp = tvDetails?.last_episode_to_air;
    if (lastEp && lastEp.air_date) {
      const airDate = new Date(lastEp.air_date);
      const now = new Date();
      const diffTime = now.getTime() - airDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      const airedRecently = diffDays >= 0 && diffDays <= 7;

      if (airedRecently) {
        // Read history from localStorage
        const history = JSON.parse(
          localStorage.getItem("nebula-history") || "[]",
        );
        const isInHistory = history.some((item: any) => {
          if (typeof item === "object" && item !== null) {
            return (
              item.id.toString() === movie.id.toString() && item.type === "tv"
            );
          }
          const str = String(item);
          if (str.includes("_")) {
            const parts = str.split("_");
            return parts[1] === movie.id.toString() && parts[0] === "tv";
          }
          return false;
        });

        if (isInList || isInHistory) {
          const epProgressData = JSON.parse(
            localStorage.getItem("nebula-progress") || "{}",
          );
          const epKey = `${movie.id}-S${lastEp.season_number}E${lastEp.episode_number}`;
          const epProg = epProgressData[epKey];
          const epPct =
            epProg && epProg.duration > 0
              ? Math.min(100, (epProg.time / epProg.duration) * 100)
              : 0;
          const hasWatchedLastEp = (epProg && epProg.watched) || epPct >= 90;

          return !hasWatchedLastEp;
        }
      }
    }

    return !!movie.hasNewEpisode;
  })();

  const logoTitle =
    movie.clearLogo && !logoFailed ? (
      <div className="mb-8 lg:mb-12 flex justify-center lg:justify-start">
        <img
          src={movie.clearLogo}
          alt={movie.title}
          height="160"
          className="h-20 sm:h-28 md:h-40 w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] mx-auto lg:mx-0"
          referrerPolicy="no-referrer"
          onError={() => setLogoFailed(true)}
        />
      </div>
    ) : (
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tight mb-8 uppercase leading-[0.9] break-words max-w-2xl drop-shadow-2xl text-center lg:text-left mx-auto lg:mx-0">
        {movie.title}
      </h1>
    );

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[200] bg-obsidian overflow-y-auto overflow-x-hidden custom-scrollbar"
    >
      <div className="absolute inset-x-0 top-0 h-[70vh] z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-obsidian/60 to-obsidian z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/40 to-transparent z-10" />
        <img
          src={movie.fanartBackground || movie.backdrop || movie.image}
          className="w-full h-full object-cover blur-[2px] scale-110 opacity-40 origin-center"
          alt=""
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
        {/* Ambient Drifting Nebula Glows */}
        <div
          className="absolute -top-[30%] -left-[20%] w-[90%] h-[90%] blur-[160px] opacity-[0.22] rounded-full ambient-nebula-glow-1"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="absolute -top-[15%] -left-[5%] w-[75%] h-[75%] blur-[140px] opacity-[0.18] rounded-full ambient-nebula-glow-2"
          style={{ backgroundColor: "#00e5ff" }}
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
          <span className="text-xs font-bold tracking-[0.2em] uppercase">
            Back to Browse
          </span>
        </button>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start w-full">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-[300px] sm:max-w-[350px] mx-auto lg:mx-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative group shrink-0"
          >
            <img
              src={movie.image}
              className="w-full h-full object-cover"
              alt={movie.title}
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
            {hasNewEpisode && (
              <div className="absolute bottom-0 inset-x-0 bg-nebula-cyan text-obsidian font-black uppercase text-[10px] py-1.5 text-center tracking-widest select-none z-30 shadow-[0_-2px_10px_rgba(0,229,255,0.25)] border-t border-nebula-cyan/30">
                New Episode
              </div>
            )}
            <div className="absolute inset-0 border-[1px] border-white/20 rounded-2xl pointer-events-none" />
          </motion.div>

          <div className="flex-1 w-full overflow-hidden">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {logoTitle}

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4 text-[10px] sm:text-[11px] font-bold tracking-wider select-none w-full">
                {/* Rating Badge */}
                <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1 sm:gap-1.5 backdrop-blur-md shrink-0">
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400" />
                  <span>{movie.imdb || movie.rating}</span>
                </div>

                {/* Duration Badge */}
                <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-white/5 border border-white/10 text-white/80 flex items-center gap-1 sm:gap-1.5 backdrop-blur-md shrink-0">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/60" />
                  <span>{movie.duration || "124m"}</span>
                </div>

                {/* Release Year Badge */}
                <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-white/5 border border-white/10 text-white/80 flex items-center gap-1 sm:gap-1.5 backdrop-blur-md shrink-0">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/60" />
                  <span>{movie.year}</span>
                </div>

                {/* Quality Badge */}
                {movie.quality && (
                  <div
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border backdrop-blur-md shrink-0 flex items-center gap-1 ${
                      movie.quality === "CAM"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        : movie.quality === "TBA"
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                          : "border-nebula-cyan/20 bg-nebula-cyan/10 text-nebula-cyan"
                    }`}
                  >
                    <span>{movie.quality}</span>
                  </div>
                )}

                {/* Availability Badge */}
                {movie.isVerified ? (
                  <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 flex items-center gap-1 sm:gap-1.5 backdrop-blur-md shrink-0">
                    <span className="relative flex h-1 w-1 sm:h-1.5 sm:w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1 w-1 sm:h-1.5 sm:w-1.5 bg-emerald-500" />
                    </span>
                    <span>LIVE</span>
                  </div>
                ) : movie.isDead ? (
                  <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-rose-500/25 bg-rose-500/10 text-rose-400 flex items-center gap-1 sm:gap-1.5 backdrop-blur-md shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>DEAD</span>
                  </div>
                ) : (
                  movie.quality !== "CAM" &&
                  movie.quality !== "TBA" && (
                    <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-blue-500/25 bg-blue-500/10 text-blue-400 flex items-center gap-1 sm:gap-1.5 backdrop-blur-md shrink-0">
                      <span className="relative flex h-1 w-1 sm:h-1.5 sm:w-1.5">
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1 w-1 sm:h-1.5 sm:w-1.5 bg-blue-500" />
                      </span>
                      <span>SCAN</span>
                    </div>
                  )
                )}
              </div>

              {/* Genre / Category Badges Row */}
              {movie.genre && (
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-8 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] select-none w-full">
                  {movie.genre.split(", ").map((g: string) => (
                    <div
                      key={g}
                      className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/10 text-white/50 backdrop-blur-md shrink-0 hover:text-white hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300 select-none"
                    >
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-lg text-white/70 font-light leading-relaxed mb-10 max-w-2xl">
                {movie.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-16 w-full max-w-2xl">
                <div className="flex flex-row gap-3 w-full sm:w-auto flex-1">
                  {(() => {
                    const p = JSON.parse(
                      localStorage.getItem("nebula-progress") || "{}",
                    );
                    const key = movie.id.toString();

                    // ── Resume Logic: find the LATEST watched episode by timestamp
                    // For TV: collect all episodes for this show, sort by timestamp DESC
                    // If that episode is >= 85% done (likely credits), advance to next.
                    let resumeData: any = null;

                    if (movie.type === "tv") {
                      // Gather all progress entries belonging to this show
                      const tvEntries = Object.entries(p)
                        .filter(([k]) => k === key || k.startsWith(`${key}-S`))
                        .map(([k, val]: [string, any]) => {
                          const tvMatch = k.match(/-S(\d+)E(\d+)/);
                          return tvMatch
                            ? {
                                season: parseInt(tvMatch[1]),
                                episode: parseInt(tvMatch[2]),
                                ...val,
                                _key: k,
                              }
                            : null;
                        })
                        .filter(Boolean) as any[];

                      if (tvEntries.length > 0) {
                        // Pick the most recently watched
                        tvEntries.sort(
                          (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0),
                        );
                        const latest = tvEntries[0];
                        const pct =
                          latest.duration > 0
                            ? (latest.time / latest.duration) * 100
                            : 0;

                        if (pct >= 90 || latest.watched) {
                          // Episode nearly done — jump to NEXT episode
                          if (tvDetails && tvDetails.seasons) {
                            const sortedSeasons = tvDetails.seasons
                              .filter((s: any) => s.season_number > 0)
                              .sort(
                                (a: any, b: any) =>
                                  a.season_number - b.season_number,
                              );

                            const lastEpS =
                              tvDetails.last_episode_to_air?.season_number;
                            const lastEpE =
                              tvDetails.last_episode_to_air?.episode_number;

                            const checkEpisodeAired = (
                              s: number,
                              e: number,
                            ) => {
                              if (
                                lastEpS === undefined ||
                                lastEpE === undefined
                              )
                                return true; // fallback
                              if (s > lastEpS) return false;
                              if (s === lastEpS && e > lastEpE) return false;
                              return true;
                            };

                            const currentSeasonInfo = sortedSeasons.find(
                              (s: any) => s.season_number === latest.season,
                            );
                            if (currentSeasonInfo) {
                              const maxEpisodes =
                                currentSeasonInfo.episode_count;
                              if (
                                latest.episode < maxEpisodes &&
                                checkEpisodeAired(
                                  latest.season,
                                  latest.episode + 1,
                                )
                              ) {
                                resumeData = {
                                  season: latest.season,
                                  episode: latest.episode + 1,
                                  _isNext: true,
                                };
                              } else if (latest.episode >= maxEpisodes) {
                                // Transition to next season
                                const currentSeasonIdx =
                                  sortedSeasons.findIndex(
                                    (s: any) =>
                                      s.season_number === latest.season,
                                  );
                                if (
                                  currentSeasonIdx !== -1 &&
                                  currentSeasonIdx < sortedSeasons.length - 1
                                ) {
                                  const nextSeason =
                                    sortedSeasons[currentSeasonIdx + 1];
                                  if (
                                    checkEpisodeAired(
                                      nextSeason.season_number,
                                      1,
                                    )
                                  ) {
                                    resumeData = {
                                      season: nextSeason.season_number,
                                      episode: 1,
                                      _isNext: true,
                                    };
                                  } else {
                                    // Next season is not aired yet!
                                    const isOngoing =
                                      tvDetails.in_production ||
                                      (tvDetails.status !== "Ended" &&
                                        tvDetails.status !== "Canceled");
                                    resumeData = {
                                      season: latest.season,
                                      episode: latest.episode,
                                      _completed: !isOngoing,
                                      _caughtUp: isOngoing,
                                    };
                                  }
                                } else {
                                  // No more seasons or episodes!
                                  const isOngoing =
                                    tvDetails.in_production ||
                                    (tvDetails.status !== "Ended" &&
                                      tvDetails.status !== "Canceled");
                                  resumeData = {
                                    season: latest.season,
                                    episode: latest.episode,
                                    _completed: !isOngoing,
                                    _caughtUp: isOngoing,
                                  };
                                }
                              } else {
                                // next episode in current season is not aired yet!
                                const isOngoing =
                                  tvDetails.in_production ||
                                  (tvDetails.status !== "Ended" &&
                                    tvDetails.status !== "Canceled");
                                resumeData = {
                                  season: latest.season,
                                  episode: latest.episode,
                                  _completed: !isOngoing,
                                  _caughtUp: isOngoing,
                                };
                              }
                            } else {
                              // Fallback if current season info not found
                              if (
                                checkEpisodeAired(
                                  latest.season,
                                  latest.episode + 1,
                                )
                              ) {
                                resumeData = {
                                  season: latest.season,
                                  episode: latest.episode + 1,
                                  _isNext: true,
                                };
                              } else {
                                const isOngoing =
                                  tvDetails.in_production ||
                                  (tvDetails.status !== "Ended" &&
                                    tvDetails.status !== "Canceled");
                                resumeData = {
                                  season: latest.season,
                                  episode: latest.episode,
                                  _completed: !isOngoing,
                                  _caughtUp: isOngoing,
                                };
                              }
                            }
                          } else {
                            // tvDetails not loaded yet, fallback to next episode
                            resumeData = {
                              season: latest.season,
                              episode: latest.episode + 1,
                              _isNext: true,
                            };
                          }
                        } else {
                          resumeData = latest;
                        }
                      }
                    } else {
                      // Movie: single progress entry
                      const entry = Object.entries(p).find(
                        ([k]) => k === key || k.startsWith(`${key}-S`),
                      );
                      if (entry) {
                        const [k, val]: [string, any] = entry;
                        const tvMatch = k.match(/-S(\d+)E(\d+)/);
                        resumeData = tvMatch
                          ? {
                              season: parseInt(tvMatch[1]),
                              episode: parseInt(tvMatch[2]),
                              ...val,
                            }
                          : val;
                      }
                    }

                    const isTBA = movie.quality === "TBA";

                    // Label logic:
                    // • No progress at all → "Watch Now" / "Try Playback"
                    // • Movie with progress → "Resume Watching"
                    // • TV: next episode (done) → "Play S1E2"
                    // • TV: mid-episode at S1E1 → "Resume Watching" (don't clutter with S1E1)
                    // • TV: mid-episode at S2E3 etc → "Resume S2E3"
                    let label: string;
                    if (isTBA) {
                      label = resumeData ? "Resume (TBA)" : "Try Playback";
                    } else if (resumeData && resumeData._completed) {
                      label = "Rewatch Series";
                    } else if (resumeData && resumeData._caughtUp) {
                      label = `Play S${resumeData.season}E${resumeData.episode}`;
                    } else if (!resumeData) {
                      label = "Watch Now";
                    } else if (resumeData._isNext) {
                      label = `Play S${resumeData.season}E${resumeData.episode}`;
                    } else if (
                      movie.type === "tv" &&
                      (resumeData.season > 1 || resumeData.episode > 1)
                    ) {
                      label = `Resume S${resumeData.season}E${resumeData.episode}`;
                    } else {
                      label = "Resume Watching";
                    }

                    const isDisabled = false;

                    return (
                      <div className="flex-1 sm:flex-none">
                        <motion.button
                          whileHover={!isDisabled ? { scale: 1.05 } : {}}
                          whileTap={!isDisabled ? { scale: 0.95 } : {}}
                          disabled={isDisabled}
                          onClick={() =>
                            !isDisabled &&
                            handlePlayClick(
                              resumeData?.season !== undefined
                                ? resumeData.season
                                : movie.type === "tv"
                                  ? 1
                                  : undefined,
                              resumeData?.episode !== undefined
                                ? resumeData.episode
                                : movie.type === "tv"
                                  ? 1
                                  : undefined,
                            )
                          }
                          className={`w-full sm:w-auto px-6 sm:px-12 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all ${
                            isDisabled
                              ? "bg-white/5 text-white/30 border border-transparent cursor-not-allowed"
                              : "bg-white text-obsidian glow-white hover:bg-nebula-cyan"
                          }`}
                        >
                          {isTBA ? (
                            <Clock size={20} className="text-obsidian/40" />
                          ) : (
                            <Play
                              size={20}
                              fill="currentColor"
                              className={isDisabled ? "opacity-30" : ""}
                            />
                          )}
                          <span className="truncate">{label}</span>
                        </motion.button>
                      </div>
                    );
                  })()}
                  <motion.button
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                    onClick={onToggleList}
                    className={`flex-1 sm:flex-none w-full sm:w-auto px-6 sm:px-12 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all border ${
                      isInList
                        ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan"
                        : "bg-white/5 border-white/10 text-white"
                    }`}
                  >
                    {isInList ? <X size={20} /> : <Plus size={20} />}{" "}
                    <span className="truncate">
                      {isInList ? "Remove" : "Add to List"}
                    </span>
                  </motion.button>
                </div>

                {/* Watch Trailer quick-action – placed under main buttons on mobile, inline on PC */}
                {deepDetails.trailers.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      setTrailerModalKey(deepDetails.trailers[0].youtubeId)
                    }
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border border-white/20 bg-white/5 text-white hover:border-nebula-cyan/60 hover:text-nebula-cyan hover:bg-nebula-cyan/10 shrink-0"
                  >
                    <Film size={18} />
                    <span>Watch Trailer</span>
                  </motion.button>
                )}
              </div>

              {/* Related Titles inline row */}
              <div
                className="mb-10 w-full"
                onMouseEnter={() => setIsRelatedHovered(true)}
                onMouseLeave={() => setIsRelatedHovered(false)}
              >
                <h3 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-4">
                  Related Titles
                </h3>

                <div className="relative">
                  <AnimatePresence>
                    {isRelatedHovered && showRelatedLeftArrow && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => scrollRelated("left")}
                        className="absolute left-[-16px] top-[-16px] bottom-[-16px] z-50 w-24 bg-gradient-to-r from-obsidian via-obsidian/80 to-transparent flex items-center justify-start pl-6 text-white/50 hover:text-nebula-cyan transition-all hidden md:flex"
                      >
                        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all shadow-2xl cursor-pointer">
                          <ChevronLeft size={32} />
                        </div>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <div
                    ref={relatedRowRef}
                    onScroll={updateRelatedArrows}
                    className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar touch-pan-x snap-x snap-mandatory scroll-smooth"
                  >
                    {deepDetails.similar.length > 0 ? (
                      deepDetails.similar.map((m: any, i: number) => (
                        <div
                          key={`rel-inline-${movie.id}-${m.id}-${i}`}
                          onClick={() => {
                            navigate(`/${m.type}/${m.id}`);
                            onSelectMovie?.(m); // sync App state so the component re-evaluates
                          }}
                          className="w-24 sm:w-32 md:w-36 aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer relative shrink-0 snap-start"
                        >
                          <img
                            src={m.image}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />

                          {/* Type badge — integrated top-left corner tab */}
                          {m.type && (
                            <div className="absolute top-0 left-0 z-20 pointer-events-none bg-black/60 backdrop-blur-md text-white/80 text-[7px] sm:text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-br-md sm:rounded-br-lg border-r border-b border-white/5 leading-none">
                              {m.type === "tv" ? "TV" : "Film"}
                            </div>
                          )}

                          {/* Rating badge — integrated top-right corner tab */}
                          {m.imdb && m.imdb > 0 && (
                            <div className="absolute top-0 right-0 z-20 pointer-events-none bg-black/60 backdrop-blur-md text-nebula-cyan text-[7px] sm:text-[8px] font-black tracking-wider px-2 py-1 rounded-bl-md sm:rounded-bl-lg border-l border-b border-white/5 leading-none">
                              ★ {m.imdb}
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <p className="text-[9px] font-bold text-nebula-cyan mb-0.5 uppercase tracking-widest truncate">
                              {m.genre}
                            </p>
                            <p className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                              {m.title}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-dim text-xs py-2">
                        No related mission vectors identified.
                      </p>
                    )}
                  </div>

                  <AnimatePresence>
                    {isRelatedHovered && showRelatedRightArrow && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => scrollRelated("right")}
                        className="absolute right-[-16px] top-[-16px] bottom-[-16px] z-50 w-24 bg-gradient-to-l from-obsidian via-obsidian/80 to-transparent flex items-center justify-end pr-6 text-white/50 hover:text-nebula-cyan transition-all hidden md:flex"
                      >
                        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all shadow-2xl cursor-pointer">
                          <ChevronRight size={32} />
                        </div>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            <div
              id="nebula-tabs"
              className="border-b border-white/10 mb-10 flex gap-6 sm:gap-12 overflow-x-auto custom-scrollbar"
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] relative transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? "text-nebula-cyan"
                      : "text-dim hover:text-white"
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
              {activeTab === "Episodes" && movie.type === "tv" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {(() => {
                    const nextEp = tvDetails?.next_episode_to_air;
                    if (!nextEp || !nextEp.air_date) return null;

                    const airDate = new Date(nextEp.air_date);
                    const now = new Date();
                    airDate.setHours(0, 0, 0, 0);
                    now.setHours(0, 0, 0, 0);
                    const diffTime = airDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(
                      diffTime / (1000 * 60 * 60 * 24),
                    );

                    const formattedDate = new Date(
                      nextEp.air_date,
                    ).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });

                    let countdownText = "";
                    if (diffDays === 0) {
                      countdownText = `Next Episode (S${nextEp.season_number}E${nextEp.episode_number} - "${nextEp.name || "TBA"}") airs TODAY!`;
                    } else if (diffDays === 1) {
                      countdownText = `Next Episode (S${nextEp.season_number}E${nextEp.episode_number} - "${nextEp.name || "TBA"}") airs TOMORROW! (${formattedDate})`;
                    } else if (diffDays > 1) {
                      countdownText = `Next Episode (S${nextEp.season_number}E${nextEp.episode_number} - "${nextEp.name || "TBA"}") airs in ${diffDays} days on ${formattedDate}.`;
                    } else {
                      countdownText = `Next Episode (S${nextEp.season_number}E${nextEp.episode_number} - "${nextEp.name || "TBA"}") aired on ${formattedDate}.`;
                    }

                    return (
                      <div className="p-4 bg-nebula-cyan/10 border border-nebula-cyan/30 rounded-2xl flex items-start gap-3 shadow-lg">
                        <div className="w-8 h-8 rounded-full bg-nebula-cyan/20 flex items-center justify-center text-nebula-cyan shrink-0 animate-pulse mt-0.5">
                          <Tv size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                            Upcoming Episode
                          </h4>
                          <p className="text-[11px] text-white/80 mt-1 leading-normal font-medium">
                            {countdownText}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 text-[9px] text-nebula-cyan/80 bg-nebula-cyan/5 border border-nebula-cyan/20 px-2 py-1.5 rounded-lg w-max max-w-full">
                            <Info size={10} className="shrink-0" />
                            <span>
                              Note: Release is typically delayed by 6+ hours
                              depending on source availability.
                            </span>
                          </div>
                          {nextEp.overview && (
                            <p className="text-[10px] text-white/50 mt-2.5 leading-relaxed line-clamp-2 italic">
                              "{nextEp.overview}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {tvDetails?.seasons?.length > 0 && (
                    <div className="relative">
                      {tvDetails.seasons.filter((s: any) => s.season_number > 0)
                        .length > 6 ? (
                        <div
                          ref={seasonContainerRef}
                          className="relative inline-block text-left z-20"
                        >
                          <button
                            ref={seasonButtonRef}
                            onClick={() => setShowSeasonDropdown((p) => !p)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-md"
                          >
                            <span>
                              {formatSeasonName(
                                tvDetails.seasons.find(
                                  (s: any) => s.season_number === activeSeason,
                                ),
                                activeSeason,
                              )}
                            </span>
                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 ${showSeasonDropdown ? "rotate-180" : ""}`}
                            />
                          </button>

                          {showSeasonDropdown && (
                            <div
                              className={`absolute left-0 w-48 bg-[#0f0f11]/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.85)] max-h-72 overflow-y-auto custom-scrollbar z-20 animate-in fade-in duration-150 ${dropUpSeasonDropdown ? "bottom-full mb-2" : "top-full mt-2"}`}
                            >
                              {tvDetails.seasons
                                .filter((s: any) => s.season_number > 0)
                                .map((s: any) => (
                                  <button
                                    key={s.season_number}
                                    onClick={() => {
                                      setActiveSeason(s.season_number);
                                      setShowSeasonDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                                      activeSeason === s.season_number
                                        ? "text-white bg-white/10 font-bold"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    <span>{formatSeasonName(s)}</span>
                                    {activeSeason === s.season_number && (
                                      <span className="w-1 h-1 rounded-full bg-nebula-cyan shadow-[0_0_6px_#00e5ff]" />
                                    )}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                          {tvDetails.seasons
                            .filter((s: any) => s.season_number > 0)
                            .map((s: any) => (
                              <button
                                key={s.season_number}
                                onClick={() => setActiveSeason(s.season_number)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeSeason === s.season_number ? "bg-white text-black" : "bg-white/10 hover:bg-white/20 text-white"}`}
                              >
                                {formatSeasonName(s)}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                  {episodesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4 w-full">
                      <Loader2
                        size={32}
                        className="animate-spin text-nebula-cyan"
                      />
                      <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                        Loading episodes...
                      </p>
                    </div>
                  ) : episodes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {episodes.map((ep: any) => {
                        // Read per-episode progress from localStorage
                        const epProgressData = JSON.parse(
                          localStorage.getItem("nebula-progress") || "{}",
                        );
                        const epKey = `${movie.id}-S${activeSeason}E${ep.episode_number}`;
                        const epProg = epProgressData[epKey];
                        const epPct =
                          epProg && epProg.duration > 0
                            ? Math.min(
                                100,
                                (epProg.time / epProg.duration) * 100,
                              )
                            : 0;
                        const epWatched =
                          (epProg && epProg.watched) || epPct >= 90;

                        return (
                          <div
                            key={ep.episode_number}
                            className="group relative bg-white/5 rounded-xl border border-white/10 overflow-hidden flex flex-col cursor-pointer transition-all hover:bg-white/10 hover:border-white/30"
                            onClick={() =>
                              handlePlayClick(activeSeason, ep.episode_number)
                            }
                          >
                            <div className="aspect-video bg-black/50 relative overflow-hidden">
                              {ep.still_path ? (
                                <img
                                  src={ep.still_path}
                                  className={`w-full h-full object-cover transition-opacity duration-500 ${
                                    epWatched
                                      ? "opacity-40 group-hover:opacity-70"
                                      : "opacity-70 group-hover:opacity-100"
                                  } group-hover:scale-105 duration-500`}
                                  alt={ep.name}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20">
                                  <Play size={32} />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-all" />

                              {epWatched && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-nebula-cyan px-1.5 py-0.5 rounded text-[8px] tracking-wide font-black uppercase text-obsidian shadow-lg">
                                  <svg
                                    width="10"
                                    height="10"
                                    viewBox="0 0 10 10"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M1.5 4.5L4 7L8.5 1.5"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-obsidian/80">
                                    Watched
                                  </span>
                                </div>
                              )}

                              {/* Play button hover */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-12 h-12 bg-nebula-cyan/90 text-obsidian rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-110 transition-all">
                                  <Play
                                    size={20}
                                    fill="currentColor"
                                    className="ml-1"
                                  />
                                </div>
                              </div>

                              {/* ── Netflix-style progress bar at bottom of thumbnail ── */}
                              {epPct >= 1 && !epWatched && (
                                <div className="absolute bottom-0 left-0 right-0">
                                  <div className="h-[5px] w-full bg-black/40">
                                    <div
                                      className="h-full"
                                      style={{
                                        width: `${epPct}%`,
                                        background: "#e50914",
                                        boxShadow: "0 0 4px rgba(229,9,20,0.7)",
                                        transition:
                                          "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                              {/* Watched: full 100% red bar (consistent with in-progress style) */}
                              {epWatched && (
                                <div className="absolute bottom-0 left-0 right-0">
                                  <div className="h-[5px] w-full bg-black/40">
                                    <div
                                      className="h-full w-full"
                                      style={{
                                        background: "#e50914",
                                        boxShadow: "0 0 4px rgba(229,9,20,0.7)",
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                              <h4 className="font-bold text-sm text-white group-hover:text-nebula-cyan transition-colors line-clamp-1 mb-1">
                                {ep.episode_number}.{" "}
                                {!ep.name || ep.name.includes("Episode")
                                  ? `Episode ${ep.episode_number}`
                                  : ep.name}
                              </h4>

                              {(ep.vote_average > 0 || ep.air_date) && (
                                <div className="flex items-center gap-2 text-[11px] font-mono mb-1.5 text-white/50 flex-wrap">
                                  {ep.vote_average > 0 && (
                                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                                      <Star
                                        size={11}
                                        className="fill-amber-400 text-amber-400"
                                      />
                                      {ep.vote_average.toFixed(1)}
                                    </span>
                                  )}
                                  {ep.air_date && (
                                    <span className="text-white/40">
                                      {ep.air_date.split("-")[0]}
                                    </span>
                                  )}
                                </div>
                              )}

                              <p className="text-xs text-dim line-clamp-2 mt-auto">
                                {ep.overview || "No description available."}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/2 border border-white/5 rounded-2xl gap-4 w-full">
                      <div className="w-12 h-12 rounded-full bg-nebula-cyan/15 flex items-center justify-center text-nebula-cyan">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider">
                          Season Not Yet Released
                        </h4>
                        <p className="text-xs text-white/40 mt-1 max-w-sm leading-relaxed font-semibold">
                          There are no episodes available for Season{" "}
                          {activeSeason} yet. Please check back later or select
                          another season.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "Downloads" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8 animate-fade-in"
                >
                  {/* Warning Cards & Recommendations */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-4 items-start">
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider mb-1">
                          Security Notice: Use a VPN
                        </h4>
                        <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">
                          Your ISP can monitor torrent downloads. We highly
                          recommend using a secure VPN (like Mullvad, ProtonVPN,
                          or NordVPN) to encrypt your traffic before clicking
                          magnet links.
                        </p>
                      </div>
                    </div>

                    <div className="bg-nebula-cyan/10 border border-nebula-cyan/20 rounded-2xl p-5 flex gap-4 items-start">
                      <div className="p-3 rounded-xl bg-nebula-cyan/10 text-nebula-cyan shrink-0">
                        <Info size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider mb-1">
                          Desktop Clients
                        </h4>
                        <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">
                          Magnet links require a client to download. We
                          recommend downloading{" "}
                          <a
                            href="https://www.qbittorrent.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-nebula-cyan underline font-bold hover:text-white transition-colors"
                          >
                            qBittorrent
                          </a>{" "}
                          (Open Source &amp; Ad-Free) or{" "}
                          <a
                            href="https://transmissionbt.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-nebula-cyan underline font-bold hover:text-white transition-colors"
                          >
                            Transmission
                          </a>
                          .
                        </p>
                      </div>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 flex gap-4 items-start">
                      <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-white uppercase tracking-wider mb-1">
                          Mobile &amp; iOS Torrenting
                        </h4>
                        <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed">
                          Android users can use apps like{" "}
                          <strong className="text-white">Flud</strong> or{" "}
                          <strong className="text-white">LibreTorrent</strong>.
                          iOS users can copy magnet links into free cloud
                          services like{" "}
                          <a
                            href="https://www.seedr.cc/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 underline font-bold hover:text-white transition-colors"
                          >
                            Seedr.cc
                          </a>{" "}
                          or{" "}
                          <a
                            href="https://real-debrid.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 underline font-bold hover:text-white transition-colors"
                          >
                            Real-Debrid
                          </a>{" "}
                          to download via high-speed direct links.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Movie Downloads Layout */}
                  {movie.type === "movie" && (
                    <div className="space-y-6">
                      {/* Direct downloads block */}
                      {directLoading && (
                        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-6 flex flex-col items-center justify-center py-12 gap-3">
                          <Loader2
                            className="animate-spin text-violet-400"
                            size={24}
                          />
                          <p className="text-xs text-violet-400/70 uppercase tracking-widest font-black animate-pulse">
                            Scanning high-speed direct downloads...
                          </p>
                        </div>
                      )}

                      {directError && (
                        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 text-center">
                          <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
                            Direct downloads scanning failed
                          </p>
                          <p className="text-[10px] text-white/40">
                            {directError}
                          </p>
                        </div>
                      )}

                      {!directLoading &&
                        directData?.directDownloads &&
                        directData.directDownloads.length > 0 &&
                        (() => {
                          const sortedDirects = [
                            ...directData.directDownloads,
                          ].sort((a: any, b: any) => {
                            if (a.format === "mkv" && b.format !== "mkv")
                              return -1;
                            if (a.format !== "mkv" && b.format === "mkv")
                              return 1;
                            return 0;
                          });

                          const allSubs: any[] = [];
                          const seenSubUrls = new Set<string>();
                          sortedDirects.forEach((d: any) => {
                            if (d.subtitles) {
                              d.subtitles.forEach((sub: any) => {
                                if (sub.url && !seenSubUrls.has(sub.url)) {
                                  seenSubUrls.add(sub.url);
                                  allSubs.push(sub);
                                }
                              });
                            }
                          });

                          return (
                            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent overflow-hidden p-6 animate-fade-in">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col">
                                  <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                                    <FileDown size={16} />
                                    Direct High-Speed Downloads
                                  </h3>
                                  <span className="text-[11px] text-white/60 uppercase tracking-wider mt-0.5 font-bold">
                                    Direct Stream • No torrent client needed
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleRefetchDirect(true)}
                                    disabled={directLoading}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 transition-all disabled:opacity-50"
                                    title="Refetch direct download links"
                                  >
                                    <RotateCw
                                      size={12}
                                      className={directLoading ? "animate-spin" : ""}
                                    />
                                    <span>{directLoading ? "Refetching..." : "Refetch"}</span>
                                  </button>
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-300">
                                    Direct
                                  </span>
                                </div>
                              </div>

                              <div className="divide-y divide-white/5 bg-black/10 rounded-xl overflow-hidden border border-white/5">
                                {sortedDirects.map((d: any, idx: number) => (
                                  <div
                                    key={`direct-movie-${idx}`}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 ${d.format === "mkv" ? "bg-emerald-500/3" : ""}`}
                                  >
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-bold text-sm text-white">
                                        {d.quality}
                                      </span>
                                      {d.source && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-300 uppercase">
                                          {d.source}
                                        </span>
                                      )}
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 uppercase">
                                        {d.size}
                                      </span>
                                      {d.format === "mkv" ? (
                                        <>
                                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 uppercase">
                                            MKV
                                          </span>
                                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase">
                                            ✓ Embedded Subs
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-300 uppercase">
                                            MP4
                                          </span>
                                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 uppercase">
                                            No Embedded Subs
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <a
                                      href={
                                        d.direct_url.startsWith("http")
                                          ? d.direct_url
                                          : `${API_BASE_URL}${d.direct_url}`
                                      }
                                      onClick={triggerPopunder}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`shrink-0 px-3 py-1.5 text-white rounded-lg font-bold text-[10px] transition-all flex items-center gap-1.5 ${
                                        d.format === "mkv"
                                          ? "bg-emerald-700 hover:bg-emerald-600"
                                          : "bg-sky-600/80 hover:bg-sky-500"
                                      }`}
                                    >
                                      <FileDown size={10} />
                                      Download {d.format.toUpperCase()}
                                    </a>
                                  </div>
                                ))}
                              </div>

                              {allSubs.length > 0 && (
                                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                  <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Globe size={12} />
                                    Download External Subtitles
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {allSubs.map((sub: any, sIdx: number) => (
                                      <a
                                        key={sIdx}
                                        href={
                                          sub.url.startsWith("http")
                                            ? sub.url
                                            : `${API_BASE_URL}${sub.url}`
                                        }
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 hover:text-white text-xs font-bold uppercase tracking-wide transition-all"
                                      >
                                        <Globe size={10} />
                                        {sub.lanName || "Unknown"}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                      {/* Torrents block */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Download size={16} />
                          Available Torrent Links
                        </h3>

                        {torrentLoading && (
                          <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2
                              className="animate-spin text-nebula-cyan"
                              size={24}
                            />
                            <p className="text-xs text-white/50 uppercase tracking-widest font-black animate-pulse">
                              Resolving torrent swarm indexes...
                            </p>
                          </div>
                        )}

                        {torrentError && (
                          <div className="p-4 text-center border border-dashed border-rose-500/20 bg-rose-500/5 rounded-xl">
                            <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
                              Swarm connection failed
                            </p>
                            <p className="text-[10px] text-white/50">
                              {torrentError}
                            </p>
                          </div>
                        )}

                        {!torrentLoading &&
                          torrentData?.torrents &&
                          (torrentData.torrents.length > 0 ? (
                            <div className="divide-y divide-white/5">
                              {torrentData.torrents.map(
                                (t: any, index: number) => (
                                  <div
                                    key={index}
                                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                                  >
                                    <div>
                                      <h4 className="font-bold text-sm text-white flex flex-wrap items-center gap-2">
                                        {t.quality}
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 uppercase">
                                          {t.size}
                                        </span>
                                        {t.source && (
                                          <span
                                            className={`text-[10.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                              t.source.toLowerCase() === "yts"
                                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                                : t.source.toLowerCase() ===
                                                    "eztv"
                                                  ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                                                  : t.source.toLowerCase() ===
                                                      "thepiratebay"
                                                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                                    : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                                            }`}
                                          >
                                            {t.source}
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-[11px] text-white/65 mt-1">
                                        Seeds:{" "}
                                        <span className="text-emerald-400 font-bold">
                                          {t.seeds}
                                        </span>{" "}
                                        • Peers:{" "}
                                        <span className="text-blue-400 font-bold">
                                          {t.peers}
                                        </span>
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <a
                                        href={t.magnet}
                                        onClick={triggerPopunder}
                                        className="flex-grow sm:flex-grow-0 px-4 py-2 bg-nebula-cyan hover:bg-white text-obsidian rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                                      >
                                        <Zap size={14} fill="currentColor" />
                                        Magnet Link
                                      </a>
                                      <button
                                        onClick={() =>
                                          copyToClipboard(t.magnet)
                                        }
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
                                        title="Copy Magnet Link"
                                      >
                                        {copiedLink === t.magnet ? (
                                          <>
                                            <Check
                                              size={14}
                                              className="text-emerald-400"
                                            />
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase">
                                              Copied
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={14} />
                                            <span className="text-[10px] text-white/60 font-bold uppercase">
                                              Copy Magnet
                                            </span>
                                          </>
                                        )}
                                      </button>
                                      {t.torrent_url && (
                                        <a
                                          href={t.torrent_url}
                                          onClick={triggerPopunder}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
                                          title="Download .torrent file"
                                        >
                                          <ExternalLink size={14} />
                                          <span className="text-[10px] text-white/60 font-bold uppercase">
                                            .torrent
                                          </span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <p className="text-dim text-xs py-4 text-center">
                              No YTS index found for this movie.
                            </p>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* TV Downloads Layout */}
                  {movie.type === "tv" &&
                    (() => {
                      const seasonPacks = (torrentData?.torrents || []).filter(
                        (t: any) =>
                          t.episode === 0 ||
                          /complete/i.test(t.title) ||
                          /season\s+\d+/i.test(t.title) ||
                          /s\d{2}\s+complete/i.test(t.title),
                      );

                      const currentSeasonTorrents = (
                        torrentData?.torrents || []
                      ).filter(
                        (t: any) =>
                          t.season === activeDownloadSeason && t.episode > 0,
                      );

                      const episodeGroups: Record<number, any[]> = {};
                      currentSeasonTorrents.forEach((t: any) => {
                        if (!episodeGroups[t.episode]) {
                          episodeGroups[t.episode] = [];
                        }
                        episodeGroups[t.episode].push(t);
                      });

                      // Dynamically determine how many episodes to show in the accordion
                      const seasonObj = tvDetails?.seasons?.find(
                        (s: any) => s.season_number === activeDownloadSeason,
                      );
                      let episodeCount = seasonObj
                        ? seasonObj.episode_count
                        : 0;
                      if (episodeCount === 0) {
                        const maxEpInTorrents = currentSeasonTorrents.reduce(
                          (max: number, t: any) =>
                            Math.max(max, t.episode || 0),
                          0,
                        );
                        episodeCount = Math.max(
                          maxEpInTorrents,
                          activeDownloadSeason === 1 ? episodes.length : 0,
                        );
                      }

                      const episodeNumbers = Array.from(
                        { length: episodeCount },
                        (_, i) => i + 1,
                      );

                      return (
                        <div className="space-y-6">
                          {/* Season Packs / Complete Series Section */}
                          {torrentLoading && (
                            <div className="flex flex-col items-center justify-center py-6 gap-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                              <Loader2
                                className="animate-spin text-amber-400"
                                size={20}
                              />
                              <span className="text-[10px] text-amber-400/70 font-bold uppercase tracking-wider">
                                Scanning Season Packs...
                              </span>
                            </div>
                          )}
                          {!torrentLoading && seasonPacks.length > 0 && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 animate-fade-in">
                              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Download size={16} />
                                Complete Series / Season Packs
                              </h3>
                              <div className="divide-y divide-white/5">
                                {seasonPacks.map((t: any, index: number) => (
                                  <div
                                    key={index}
                                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0"
                                  >
                                    <div className="max-w-xl">
                                      <h4 className="font-bold text-sm text-white break-words">
                                        {t.title}
                                      </h4>
                                      <p className="text-[11px] text-white/65 mt-1 flex flex-wrap items-center gap-2">
                                        <span>
                                          Size:{" "}
                                          <strong className="text-white/90">
                                            {t.size}
                                          </strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          Seeds:{" "}
                                          <strong className="text-emerald-400">
                                            {t.seeds}
                                          </strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          Peers:{" "}
                                          <strong className="text-blue-400">
                                            {t.peers}
                                          </strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          Source:{" "}
                                          <strong
                                            className={`uppercase font-bold ${
                                              t.source?.toLowerCase() === "eztv"
                                                ? "text-sky-400"
                                                : t.source?.toLowerCase() ===
                                                    "thepiratebay"
                                                  ? "text-amber-400"
                                                  : "text-purple-400"
                                            }`}
                                          >
                                            {t.source || "EZTV"}
                                          </strong>
                                        </span>
                                      </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <a
                                        href={t.magnet}
                                        onClick={triggerPopunder}
                                        className="flex-grow md:flex-grow-0 px-4 py-2 bg-amber-500 hover:bg-white text-obsidian rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                                      >
                                        <Zap size={14} fill="currentColor" />
                                        Magnet Link
                                      </a>
                                      <button
                                        onClick={() =>
                                          copyToClipboard(t.magnet)
                                        }
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
                                        title="Copy Magnet"
                                      >
                                        {copiedLink === t.magnet ? (
                                          <>
                                            <Check
                                              size={14}
                                              className="text-emerald-400"
                                            />
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase">
                                              Copied
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={14} />
                                            <span className="text-[10px] text-white/60 font-bold uppercase">
                                              Copy Magnet
                                            </span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Episode List Section */}
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            {/* Season Selector */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Download size={16} />
                                Individual Episode Swarms
                              </h3>
                              {tvDetails?.seasons?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {tvDetails.seasons
                                    .filter((s: any) => s.season_number > 0)
                                    .map((s: any) => (
                                      <button
                                        key={s.season_number}
                                        onClick={() => {
                                          setActiveDownloadSeason(
                                            s.season_number,
                                          );
                                          setExpandedEpisode(null);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeDownloadSeason === s.season_number ? "bg-white text-black font-black" : "bg-white/5 border border-white/10 text-white hover:bg-white/10"}`}
                                      >
                                        Season {s.season_number}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Episode Accordion */}
                            {episodeNumbers.length > 0 ? (
                              <div className="space-y-3">
                                {episodeNumbers.map((epNum) => {
                                  const torrentsForEp =
                                    episodeGroups[epNum] || [];
                                  const isExpanded = expandedEpisode === epNum;

                                  return (
                                    <div
                                      key={epNum}
                                      className="border border-white/5 bg-white/2 rounded-xl overflow-hidden"
                                    >
                                      <button
                                        onClick={() => {
                                          const nextExpanded = isExpanded
                                            ? null
                                            : epNum;
                                          setExpandedEpisode(nextExpanded);
                                          if (
                                            nextExpanded &&
                                            backupTorrents[epNum] ===
                                              undefined &&
                                            !backupTorrentsLoading[epNum]
                                          ) {
                                            loadBackupTorrents(epNum);
                                          }
                                        }}
                                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-all"
                                      >
                                        <div>
                                          <span className="text-xs font-bold text-nebula-cyan uppercase tracking-wider mr-2">
                                            Episode {epNum}
                                          </span>
                                          <span className="text-xs text-white/75 font-semibold">
                                            (
                                            {torrentsForEp.length +
                                              (backupTorrents[epNum]?.length ||
                                                0)}{" "}
                                            torrent streams
                                            {backupDirectDownloads[epNum]
                                              ?.length
                                              ? `, ${backupDirectDownloads[epNum].length} direct downloads`
                                              : ""}{" "}
                                            available)
                                          </span>
                                        </div>
                                        {isExpanded ? (
                                          <ChevronUp size={16} />
                                        ) : (
                                          <ChevronDown size={16} />
                                        )}
                                      </button>

                                      {isExpanded && (
                                        <div className="px-5 pb-4 bg-black/20 space-y-4">
                                          {/* ── Direct Downloads Section ── */}
                                          {backupDirectLoading[epNum] && (
                                            <div className="pt-4 flex justify-center items-center gap-2 text-violet-400/60">
                                              <Loader2
                                                className="animate-spin"
                                                size={14}
                                              />
                                              <span className="text-[10px] uppercase font-bold tracking-wider">
                                                Scanning direct downloads...
                                              </span>
                                            </div>
                                          )}

                                          {!backupDirectLoading[epNum] &&
                                            backupDirectDownloads[epNum] &&
                                            backupDirectDownloads[epNum]
                                              .length > 0 &&
                                            (() => {
                                              const sortedDirects = [
                                                ...backupDirectDownloads[epNum],
                                              ].sort((a, b) => {
                                                if (
                                                  a.format === "mkv" &&
                                                  b.format !== "mkv"
                                                )
                                                  return -1;
                                                if (
                                                  a.format !== "mkv" &&
                                                  b.format === "mkv"
                                                )
                                                  return 1;
                                                return 0;
                                              });

                                              const allSubs: any[] = [];
                                              const seenSubUrls =
                                                new Set<string>();
                                              sortedDirects.forEach(
                                                (d: any) => {
                                                  if (d.subtitles) {
                                                    d.subtitles.forEach(
                                                      (sub: any) => {
                                                        if (
                                                          sub.url &&
                                                          !seenSubUrls.has(
                                                            sub.url,
                                                          )
                                                        ) {
                                                          seenSubUrls.add(
                                                            sub.url,
                                                          );
                                                          allSubs.push(sub);
                                                        }
                                                      },
                                                    );
                                                  }
                                                },
                                              );

                                              return (
                                                <div className="pt-4 animate-fade-in">
                                                  <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 to-transparent overflow-hidden">
                                                    <div className="px-4 py-2 bg-violet-500/10 border-b border-white/5 flex items-center justify-between">
                                                      <div className="flex flex-col">
                                                        <span className="text-xs font-black text-violet-400 uppercase tracking-widest">
                                                          Direct Downloads
                                                        </span>
                                                        <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">
                                                          Direct Stream • No
                                                          torrent client needed
                                                        </span>
                                                      </div>
                                                    </div>

                                                    <div className="divide-y divide-white/5 bg-black/10">
                                                      {sortedDirects.map(
                                                        (
                                                          d: any,
                                                          idx: number,
                                                        ) => (
                                                          <div
                                                            key={`direct-ep-${idx}`}
                                                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 ${d.format === "mkv" ? "bg-emerald-500/3" : ""}`}
                                                          >
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                              <span className="font-bold text-sm text-white">
                                                                {d.quality}
                                                              </span>
                                                              {d.source && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-300 uppercase">
                                                                  {d.source}
                                                                </span>
                                                              )}
                                                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 uppercase">
                                                                {d.size}
                                                              </span>
                                                              {d.format ===
                                                              "mkv" ? (
                                                                <>
                                                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 uppercase">
                                                                    MKV
                                                                  </span>
                                                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase">
                                                                    ✓ Embedded
                                                                    Subs
                                                                  </span>
                                                                </>
                                                              ) : (
                                                                <>
                                                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-300 uppercase">
                                                                    MP4
                                                                  </span>
                                                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 uppercase">
                                                                    No Embedded
                                                                    Subs
                                                                  </span>
                                                                </>
                                                              )}
                                                            </div>
                                                            <a
                                                              href={
                                                                d.direct_url.startsWith(
                                                                  "http",
                                                                )
                                                                  ? d.direct_url
                                                                  : `${API_BASE_URL}${d.direct_url}`
                                                              }
                                                              onClick={
                                                                triggerPopunder
                                                              }
                                                              target="_blank"
                                                              rel="noopener noreferrer"
                                                              className={`shrink-0 px-3 py-1.5 text-white rounded-lg font-bold text-[10px] transition-all flex items-center gap-1.5 ${
                                                                d.format ===
                                                                "mkv"
                                                                  ? "bg-emerald-700 hover:bg-emerald-600"
                                                                  : "bg-sky-600/80 hover:bg-sky-500"
                                                              }`}
                                                            >
                                                              <FileDown
                                                                size={10}
                                                              />
                                                              Download{" "}
                                                              {d.format.toUpperCase()}
                                                            </a>
                                                          </div>
                                                        ),
                                                      )}
                                                    </div>

                                                    {allSubs.length > 0 && (
                                                      <div className="px-4 py-3 border-t border-white/5 bg-black/15">
                                                        <p className="text-[11px] text-white/60 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                          <Globe size={10} />
                                                          Available Subtitles (
                                                          {allSubs.length})
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                          {allSubs.map(
                                                            (
                                                              sub: any,
                                                              sIdx: number,
                                                            ) => (
                                                              <a
                                                                key={sIdx}
                                                                href={
                                                                  sub.url.startsWith(
                                                                    "http",
                                                                  )
                                                                    ? sub.url
                                                                    : `${API_BASE_URL}${sub.url}`
                                                                }
                                                                download
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-extrabold uppercase tracking-wide hover:bg-violet-500/20 hover:text-white transition-all"
                                                                title={`Download ${sub.lanName || "subtitle"}`}
                                                              >
                                                                <Globe
                                                                  size={9}
                                                                />
                                                                {sub.lanName ||
                                                                  "Unknown"}
                                                              </a>
                                                            ),
                                                          )}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })()}

                                          {/* ── Torrent Links Section ── */}
                                          <div className="pt-2">
                                            <span className="text-[11px] font-black text-white/65 uppercase tracking-wider block mb-2">
                                              Torrent Stream Links
                                            </span>

                                            {torrentsForEp.length > 0 ||
                                            (backupTorrents[epNum] || [])
                                              .length > 0 ? (
                                              <div className="divide-y divide-white/5 bg-black/10 rounded-xl overflow-hidden border border-white/5 px-4">
                                                {/* Primary EZTV streams */}
                                                {torrentsForEp.map(
                                                  (t: any, index: number) => (
                                                    <div
                                                      key={`eztv-${index}`}
                                                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-4 last:pb-3"
                                                    >
                                                      <div className="max-w-lg">
                                                        <h5 className="font-bold text-xs text-white break-words">
                                                          {t.title}
                                                        </h5>
                                                        <p className="text-[11px] text-white/65 mt-1 flex flex-wrap items-center gap-2">
                                                          <span>
                                                            Size:{" "}
                                                            <strong className="text-white/90">
                                                              {t.size}
                                                            </strong>
                                                          </span>
                                                          <span>•</span>
                                                          <span>
                                                            Seeds:{" "}
                                                            <strong className="text-emerald-400">
                                                              {t.seeds}
                                                            </strong>
                                                          </span>
                                                          <span>•</span>
                                                          <span>
                                                            Peers:{" "}
                                                            <strong className="text-blue-400">
                                                              {t.peers}
                                                            </strong>
                                                          </span>
                                                          <span>•</span>
                                                          <span>
                                                            Source:{" "}
                                                            <strong className="text-sky-400 uppercase font-bold">
                                                              {t.source ||
                                                                "EZTV"}
                                                            </strong>
                                                          </span>
                                                        </p>
                                                      </div>
                                                      <div className="flex gap-2 shrink-0">
                                                        <a
                                                          href={t.magnet}
                                                          onClick={
                                                            triggerPopunder
                                                          }
                                                          className="px-3 py-1.5 bg-nebula-cyan hover:bg-white text-obsidian rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1"
                                                        >
                                                          <Zap
                                                            size={10}
                                                            fill="currentColor"
                                                          />
                                                          Magnet
                                                        </a>
                                                        <button
                                                          onClick={() =>
                                                            copyToClipboard(
                                                              t.magnet,
                                                            )
                                                          }
                                                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] transition-all flex items-center justify-center"
                                                          title="Copy Magnet Link"
                                                        >
                                                          {copiedLink ===
                                                          t.magnet ? (
                                                            <span className="text-emerald-400 font-bold uppercase">
                                                              Copied
                                                            </span>
                                                          ) : (
                                                            <Copy size={12} />
                                                          )}
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ),
                                                )}

                                                {/* Backup streams loaded */}
                                                {backupTorrents[epNum] !==
                                                  undefined &&
                                                  backupTorrents[epNum].map(
                                                    (t: any, index: number) => (
                                                      <div
                                                        key={`backup-${index}`}
                                                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-3 last:pb-3 border-t border-white/5"
                                                      >
                                                        <div className="max-w-lg">
                                                          <h5 className="font-bold text-xs text-white/80 break-words">
                                                            {t.title}
                                                          </h5>
                                                          <p className="text-[11px] text-white/65 mt-1 flex flex-wrap items-center gap-2">
                                                            <span>
                                                              Size:{" "}
                                                              <strong className="text-white/90">
                                                                {t.size}
                                                              </strong>
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                              Seeds:{" "}
                                                              <strong className="text-emerald-400">
                                                                {t.seeds}
                                                              </strong>
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                              Peers:{" "}
                                                              <strong className="text-blue-400">
                                                                {t.peers}
                                                              </strong>
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                              Source:{" "}
                                                              <strong
                                                                className={`uppercase font-bold ${
                                                                  t.source?.toLowerCase() ===
                                                                  "thepiratebay"
                                                                    ? "text-amber-400"
                                                                    : t.source?.toLowerCase() ===
                                                                        "eztv"
                                                                      ? "text-sky-400"
                                                                      : "text-purple-400"
                                                                }`}
                                                              >
                                                                {t.source ||
                                                                  "Backup"}
                                                              </strong>
                                                            </span>
                                                          </p>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                          <a
                                                            href={t.magnet}
                                                            onClick={
                                                              triggerPopunder
                                                            }
                                                            className="px-3 py-1.5 bg-purple-600 hover:bg-white hover:text-obsidian text-white rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1"
                                                          >
                                                            <Zap
                                                              size={10}
                                                              fill="currentColor"
                                                            />
                                                            Magnet
                                                          </a>
                                                          <button
                                                            onClick={() =>
                                                              copyToClipboard(
                                                                t.magnet,
                                                              )
                                                            }
                                                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] transition-all flex items-center justify-center"
                                                            title="Copy Magnet Link"
                                                          >
                                                            {copiedLink ===
                                                            t.magnet ? (
                                                              <span className="text-emerald-400 font-bold uppercase">
                                                                Copied
                                                              </span>
                                                            ) : (
                                                              <Copy size={12} />
                                                            )}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ),
                                                  )}
                                              </div>
                                            ) : null}

                                            {/* Backup loading status */}
                                            {backupTorrentsLoading[epNum] && (
                                              <div className="flex justify-center items-center py-4 gap-2 text-white/60">
                                                <Loader2
                                                  className="animate-spin text-nebula-cyan"
                                                  size={16}
                                                />
                                                <span className="text-xs uppercase font-bold tracking-wider">
                                                  Scanning Backup Trackers...
                                                </span>
                                              </div>
                                            )}

                                            {/* Search Backup button */}
                                            {!backupTorrentsLoading[epNum] &&
                                              backupTorrents[epNum] ===
                                                undefined && (
                                                <div className="py-3 flex justify-center">
                                                  <button
                                                    onClick={() =>
                                                      loadBackupTorrents(epNum)
                                                    }
                                                    className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/85 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                                                  >
                                                    <ExternalLink size={12} />
                                                    Search Backup Trackers
                                                    (Torrentio, PirateBay,
                                                    Galaxy)
                                                  </button>
                                                </div>
                                              )}

                                            {/* Search complete, no results */}
                                            {!backupTorrentsLoading[epNum] &&
                                              backupTorrents[epNum] !==
                                                undefined &&
                                              backupTorrents[epNum].length ===
                                                0 &&
                                              torrentsForEp.length === 0 && (
                                                <p className="text-[10px] text-white/30 text-center py-3 uppercase tracking-wider font-bold">
                                                  No torrent streams found for
                                                  this episode.
                                                </p>
                                              )}

                                            {/* EZTV empty fallback warning */}
                                            {torrentsForEp.length === 0 &&
                                              backupTorrents[epNum] ===
                                                undefined && (
                                                <p className="text-dim text-[10px] text-center py-3 uppercase tracking-wider font-bold">
                                                  No direct EZTV torrent streams
                                                  found. Use the backup search
                                                  button.
                                                </p>
                                              )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-dim text-xs mb-2">
                                  No episode swarms indexed for Season{" "}
                                  {activeDownloadSeason}.
                                </p>
                                {(movie.isDrama ||
                                  movie.title
                                    ?.toLowerCase()
                                    .includes("drama") ||
                                  movie.id?.toString().startsWith("k")) && (
                                  <p className="text-[10px] text-nebula-cyan uppercase font-bold tracking-wider animate-pulse">
                                    Tip: Korean dramas are primarily streamed
                                    via Dramacool. Use the "Watch Now" player.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </motion.div>
              )}

              {activeTab === "Overview" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-12"
                >
                  {/* Director's Cut Cast */}
                  <div className="w-full">
                    <h3 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-4 sm:mb-6">
                      Director's Cut Cast
                    </h3>
                    <div className="flex gap-6 sm:gap-10 overflow-x-auto pb-6 no-scrollbar touch-pan-x">
                      {deepDetails.cast.length > 0 ? (
                        deepDetails.cast.map((person: any, i: number) => (
                          <div
                            key={`${person.name}-${person.role}-${i}`}
                            onClick={() => onSelectActor?.(person.id)}
                            className="flex flex-col items-center gap-4 group cursor-pointer shrink-0"
                          >
                            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-white/10 p-1.5 group-hover:border-nebula-cyan transition-all duration-500 overflow-hidden relative">
                              <img
                                src={person.avatar}
                                className="w-full h-full rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                alt={person.name}
                              />
                              <div className="absolute inset-0 bg-nebula-cyan/0 group-hover:bg-nebula-cyan/10 transition-colors" />
                            </div>
                            <div className="text-center w-24 sm:w-32">
                              <p className="text-xs sm:text-sm font-bold text-white group-hover:text-nebula-cyan transition-colors line-clamp-1">
                                {person.name}
                              </p>
                              <p className="text-[10px] sm:text-[11px] font-medium text-dim uppercase tracking-wider mt-1 line-clamp-1">
                                {person.role}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-dim text-xs">
                          Cast protocols unavailable for this record.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Trailers & Media Clips */}
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h3 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em]">
                        Trailers & Media Clips
                      </h3>
                      {deepDetails.trailers.length > 3 && (
                        <button
                          onClick={() => setShowAllTrailers((prev) => !prev)}
                          className="text-nebula-cyan hover:underline text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          {showAllTrailers
                            ? "Show Less"
                            : `See All (${deepDetails.trailers.length})`}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {deepDetails.trailers.length > 0 ? (
                        (showAllTrailers
                          ? deepDetails.trailers
                          : deepDetails.trailers.slice(0, 3)
                        ).map((video: any, i: number) => (
                          <div
                            key={`trailer-${video.youtubeId}-${i}`}
                            className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black group cursor-pointer shadow-lg hover:shadow-2xl hover:border-nebula-cyan/30 transition-all duration-300"
                            onClick={() => setTrailerModalKey(video.youtubeId)}
                          >
                            <img
                              src={
                                video.thumbnail ||
                                `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`
                              }
                              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                              alt={video.title}
                              referrerPolicy="no-referrer"
                              onError={handleImageError}
                            />

                            {/* Premium Dark Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent z-10 pointer-events-none" />

                            {/* Floating Info Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex flex-col justify-end pointer-events-none">
                              <span className="text-[9px] bg-nebula-cyan/20 border border-nebula-cyan/30 text-nebula-cyan font-bold px-2 py-0.5 rounded w-max mb-1.5 uppercase tracking-wider">
                                {video.category}
                              </span>
                              <h4 className="text-sm font-bold text-white group-hover:text-nebula-cyan transition-colors truncate">
                                {video.title}
                              </h4>
                              {video.views > 0 && (
                                <p className="text-[9px] text-white/40 font-semibold mt-0.5">
                                  {(video.views / 1_000_000).toFixed(1)}M views
                                </p>
                              )}
                            </div>

                            {/* Centered Play Button overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-nebula-cyan group-hover:text-obsidian transition-all group-hover:scale-110 shadow-xl opacity-0 group-hover:opacity-100 duration-300">
                                <Play
                                  size={20}
                                  fill="currentColor"
                                  className="ml-1"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-dim text-xs col-span-full py-6 text-center border border-dashed border-white/10 rounded-2xl">
                          No intercepted trailer signals for this title.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Audience & TMDB User Reviews */}
                  <div className="w-full">
                    <h3 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-4 sm:mb-6">
                      Audience Reviews
                    </h3>
                    {reviewsLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center gap-3 w-full border border-dashed border-white/10 rounded-2xl">
                        <Loader2
                          size={24}
                          className="animate-spin text-nebula-cyan"
                        />
                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                          Loading User Reviews...
                        </p>
                      </div>
                    ) : reviews.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {reviews.map((rev) => {
                          const isExpanded = expandedReviews[rev.id];
                          const isLong = rev.content.length > 320;
                          const displayContent =
                            isLong && !isExpanded
                              ? rev.content.substring(0, 320) + "..."
                              : rev.content;
                          const rating = rev.author_details?.rating;

                          return (
                            <div
                              key={rev.id}
                              className="bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between gap-4"
                            >
                              <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center text-white/40 shrink-0">
                                      {rev.author_details?.avatar_path ? (
                                        <img
                                          src={rev.author_details.avatar_path}
                                          alt={rev.author}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display =
                                              "none";
                                          }}
                                        />
                                      ) : (
                                        <span className="font-bold text-sm uppercase">
                                          {rev.author.charAt(0)}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-sm text-white leading-tight">
                                        {rev.author}
                                      </h4>
                                      {rev.author_details?.username && (
                                        <p className="text-[10px] text-white/40 font-mono">
                                          @{rev.author_details.username}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {rating !== null && rating !== undefined && (
                                    <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1 shrink-0">
                                      <Star
                                        size={12}
                                        className="fill-amber-400"
                                      />
                                      <span>{rating}/10</span>
                                    </div>
                                  )}
                                </div>

                                <p className="text-xs text-white/70 font-light leading-relaxed whitespace-pre-line">
                                  {displayContent}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-white/40">
                                <span>
                                  {new Date(rev.created_at).toLocaleDateString(
                                    undefined,
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                                {isLong && (
                                  <button
                                    onClick={() =>
                                      setExpandedReviews((prev) => ({
                                        ...prev,
                                        [rev.id]: !prev[rev.id],
                                      }))
                                    }
                                    className="text-nebula-cyan hover:underline font-bold uppercase tracking-wider text-[9.5px]"
                                  >
                                    {isExpanded
                                      ? "Show Less"
                                      : "Read Full Review"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10 px-4 bg-white/2 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">
                          No user reviews available from TMDB for this media
                          title.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Generous bottom padding */}
        <div className="h-40 w-full pointer-events-none" />
      </div>

      <AnimatePresence>
        {showSourceModal && (
          <SourceSelectionModal
            movie={movie}
            season={selectedEpForModal?.season}
            episode={selectedEpForModal?.episode}
            onClose={() => setShowSourceModal(false)}
            onSelect={handleSelectSource}
          />
        )}
      </AnimatePresence>

      {/* ── Trailer Quick-Play Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {trailerModalKey && (
          <motion.div
            key="trailer-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-0 sm:p-8"
            onClick={() => setTrailerModalKey(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

            {/* Panel */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative w-full max-w-4xl sm:rounded-2xl rounded-none overflow-hidden border-y sm:border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.9)] bg-obsidian"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2.5">
                  <Film size={15} className="text-nebula-cyan" />
                  <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
                    Official Trailer
                  </span>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-xs text-white/40 truncate max-w-[180px] sm:max-w-xs">
                    {movie.title}
                  </span>
                </div>
                <button
                  onClick={() => setTrailerModalKey(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* YouTube embed – autoplay, controls disabled, plays inline for mobile */}
              <div className="relative aspect-video bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailerModalKey}?autoplay=1&controls=0&rel=0&modestbranding=1&color=white&playsinline=1&iv_load_policy=3&disablekb=1&fs=0`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  title={`${movie.title} – Trailer`}
                />
              </div>

              {/* Footer: link to all trailers tab */}
              {deepDetails.trailers.length > 1 && (
                <div className="px-5 py-3 bg-white/5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    {deepDetails.trailers.length} trailers available
                  </span>
                  <button
                    onClick={() => {
                      setTrailerModalKey(null);
                      setActiveTab("Trailers & Extras");
                      setTimeout(() => {
                        document
                          .getElementById("nebula-tabs")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                    className="text-[10px] font-bold text-nebula-cyan hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1.5"
                  >
                    View All Trailers
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
