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
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { handleImageError, triggerPopunder } from "../utils/helpers";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getMediaDetails,
  getMediaBasicInfo,
  enrichMoviesWithMetadata,
  getTVDetails,
  getTVSeasonEpisodes,
} from "../services/tmdb";

interface SourceSelectionModalProps {
  movie: any;
  season?: number;
  episode?: number;
  onClose: () => void;
  onSelect: (sourceUrl?: string) => void;
}

export const SourceSelectionModal: React.FC<SourceSelectionModalProps> = ({
  movie,
  season,
  episode,
  onClose,
  onSelect,
}) => {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [videasySources, setVideasySources] = useState<any[]>([]);
  const [videasyLoading, setVideasyLoading] = useState(true);
  const [videasyError, setVideasyError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setVideasyLoading(true);
    setVideasyError("");

    // 1. VidRock Fetch
    let vidrockUrl = `${API_BASE_URL}/api/vidrock?tmdbId=${movie.id}&type=${movie.type}`;
    if (season !== undefined) vidrockUrl += `&season=${season}`;
    if (episode !== undefined) vidrockUrl += `&episode=${episode}`;

    fetch(vidrockUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to scan VidRock uplink");
        return res.json();
      })
      .then((data) => {
        if (!active) return;

        // Filter out sources that have null url
        const activeSources = Object.entries(data)
          .filter(([_, value]: any) => value && value.url)
          .map(([name, value]: any) => ({
            name,
            url: value.url,
            type: value.type || "hls",
            language: value.language || "English",
            flag: value.flag || "us",
          }));

        setSources(activeSources);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to contact proxy.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // 2. Videasy Fetch
    let videasyUrl = `${API_BASE_URL}/api/videasy?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}&releaseYear=${movie.year || ""}`;
    if (season !== undefined) videasyUrl += `&season=${season}`;
    if (episode !== undefined) videasyUrl += `&episode=${episode}`;

    fetch(videasyUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to scan Videasy uplink");
        return res.json();
      })
      .then((data) => {
        if (!active) return;

        const activeSources = Object.entries(data)
          .filter(([_, value]: any) => value && value.url)
          .map(([name, value]: any) => ({
            name,
            url: value.url,
            type: value.type || "hls",
            audio: value.audio || "Original audio",
            flag: value.flag || "us",
          }));

        setVideasySources(activeSources);
      })
      .catch((err) => {
        if (active)
          setVideasyError(err.message || "Failed to contact Videasy.");
      })
      .finally(() => {
        if (active) setVideasyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [movie.id, movie.type, season, episode, movie.title, movie.year]);

  // Construct the serialized pipelines
  const vidrockUrl = sources
    .map((src) => `${src.url}#${src.name}#${src.type}`)
    .join("|");
  const videasyUrl = videasySources
    .map((src) => `${src.url}#${src.name}#${src.type}#${src.audio || ""}`)
    .join("|");

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-obsidian/95 backdrop-blur-md">
      {/* Background radial glow */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.12)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative z-10 w-full max-w-4xl bg-obsidian/85 border border-white/10 rounded-3xl p-5 sm:p-8 backdrop-blur-2xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Glow border element */}
        <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 transition-all bg-white/5 z-50 animate-fade-in"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-nebula-cyan/20 bg-nebula-cyan/5 text-nebula-cyan text-[10px] font-black uppercase tracking-[0.15em] mb-3 sm:mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-nebula-cyan animate-pulse" />
            Provider Selection
          </div>
          <h3 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tight mb-2">
            Choose Stream Source
          </h3>
          <p className="text-xs text-white/50 max-w-md mx-auto">
            {movie.title}{" "}
            {season !== undefined && `• Season ${season} Episode ${episode}`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[380px] md:max-h-none overflow-y-auto pr-1 sm:pr-0 custom-scrollbar">
          {/* VidRock Card */}
          <motion.div
            whileHover={
              !loading && sources.length > 0
                ? { scale: 1.02, translateY: -2 }
                : {}
            }
            onClick={() => {
              if (!loading && sources.length > 0) {
                onSelect(vidrockUrl);
              }
            }}
            className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all h-full min-h-[170px] ${
              loading
                ? "border-nebula-cyan/20 bg-nebula-cyan/5 opacity-80 cursor-wait animate-pulse"
                : sources.length > 0
                  ? "border-nebula-cyan/35 bg-nebula-cyan/5 hover:bg-nebula-cyan/10 cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.05)] group"
                  : "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-nebula-cyan/30 bg-nebula-cyan/10 text-nebula-cyan text-[8px] font-black uppercase tracking-wider animate-pulse">
                <Loader2 size={8} className="animate-spin" />
                <span>SCANNING</span>
              </div>
            ) : sources.length > 0 ? (
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-nebula-cyan text-obsidian text-[8px] font-black uppercase tracking-wider animate-pulse shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                <Sparkles size={8} />
                <span>RECOMMENDED</span>
              </div>
            ) : null}

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    loading || sources.length > 0
                      ? "bg-nebula-cyan/15 text-nebula-cyan"
                      : "bg-white/5 text-white/20"
                  }`}
                >
                  <Zap
                    size={18}
                    fill={
                      loading || sources.length > 0 ? "currentColor" : "none"
                    }
                    className={loading ? "animate-pulse" : ""}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white uppercase tracking-tight flex items-center gap-1.5">
                    VidRock
                    <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-nebula-cyan/10 border border-nebula-cyan/20 text-nebula-cyan uppercase">
                      DEFAULT
                    </span>
                  </h4>
                  <p className="text-[10px] text-white/60 uppercase font-semibold">
                    High-Speed Uplink
                  </p>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed mb-4">
                Delivers ultra-fast multi-CDN speeds, rich HLS quality, and
                seamless client-side failover between active mirrors.
              </p>
            </div>

            {/* Dynamic Uplinks Footer */}
            <div className="mt-auto pt-3 border-t border-white/5">
              {loading ? (
                <div className="flex items-center gap-2 text-[9px] text-nebula-cyan/70 font-bold uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nebula-cyan opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-nebula-cyan"></span>
                  </span>
                  <span>Scanning Uplinks...</span>
                </div>
              ) : sources.length > 0 ? (
                <div>
                  <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-2">
                    Active Mirrors:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sources.map((src) => {
                      let color =
                        "border-nebula-cyan/20 text-nebula-cyan/80 bg-nebula-cyan/5";
                      if (src.name === "Atlas")
                        color =
                          "border-amber-500/20 text-amber-400/80 bg-amber-500/5";
                      if (src.name === "Orion")
                        color =
                          "border-emerald-500/20 text-emerald-400/80 bg-emerald-500/5";
                      return (
                        <span
                          key={src.name}
                          className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${color}`}
                        >
                          {src.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-400 animate-ping" />
                  {error
                    ? "Uplink currently offline"
                    : "No mirror streams available"}
                </p>
              )}
            </div>
          </motion.div>

          {/* Videasy Card */}
          <motion.div
            whileHover={
              !videasyLoading && videasySources.length > 0
                ? { scale: 1.02, translateY: -2 }
                : {}
            }
            onClick={() => {
              if (!videasyLoading && videasySources.length > 0) {
                onSelect(videasyUrl);
              }
            }}
            className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all h-full min-h-[170px] ${
              videasyLoading
                ? "border-violet-500/20 bg-violet-500/5 opacity-80 cursor-wait animate-pulse"
                : videasySources.length > 0
                  ? "border-violet-500/35 bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.05)] group"
                  : "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
            }`}
          >
            {videasyLoading ? (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-[8px] font-black uppercase tracking-wider animate-pulse">
                <Loader2 size={8} className="animate-spin" />
                <span>SCANNING</span>
              </div>
            ) : videasySources.length > 0 ? (
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500 text-white text-[8px] font-black uppercase tracking-wider animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                <Sparkles size={8} />
                <span>DECRYPTED</span>
              </div>
            ) : null}

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    videasyLoading || videasySources.length > 0
                      ? "bg-violet-500/15 text-violet-400"
                      : "bg-white/5 text-white/20"
                  }`}
                >
                  <Tv
                    size={18}
                    className={videasyLoading ? "animate-pulse" : ""}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight flex items-center gap-1.5">
                    Videasy
                    <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 uppercase">
                      NEW
                    </span>
                  </h4>
                  <p className="text-[10px] text-white/60 uppercase font-semibold">
                    Encrypted CDN Nodes
                  </p>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed mb-4">
                Bypasses player protection layers using WebAssembly decryption
                to unlock multiple global multi-language audio mirrors.
              </p>
            </div>

            {/* Dynamic Uplinks Footer */}
            <div className="mt-auto pt-3 border-t border-white/5">
              {videasyLoading ? (
                <div className="flex items-center gap-2 text-[9px] text-violet-400/70 font-bold uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
                  </span>
                  <span>Decrypting Nodes...</span>
                </div>
              ) : videasySources.length > 0 ? (
                <div>
                  <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-2">
                    Active Mirrors:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {videasySources.map((src) => {
                      const mirrorName = src.name
                        .replace("Videasy (", "")
                        .replace(")", "");
                      return (
                        <span
                          key={src.name}
                          className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-violet-500/20 text-violet-400/80 bg-violet-500/5 uppercase tracking-wider"
                        >
                          {src.flag && (
                            <img
                              src={`https://flagcdn.com/16x12/${src.flag}.png`}
                              alt={src.flag}
                              className="w-3 h-2.5 object-cover rounded-sm"
                            />
                          )}
                          <span>{mirrorName}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-rose-400 animate-ping" />
                  {videasyError
                    ? "Decryption engine offline"
                    : "No mirror streams available"}
                </p>
              )}
            </div>
          </motion.div>

          {/* VidLink Card (Always Active) */}
          <motion.div
            whileHover={{ scale: 1.02, translateY: -2 }}
            onClick={() => onSelect()}
            className="relative flex flex-col justify-between p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 cursor-pointer group min-h-[170px]"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/70 group-hover:text-nebula-cyan transition-colors">
                  <Server size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-nebula-cyan transition-colors uppercase tracking-tight">
                    VidLink
                  </h4>
                  <p className="text-[10px] text-white/60 uppercase font-semibold">
                    Standard Route
                  </p>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-white/60 leading-relaxed mb-4">
                Aggregates comprehensive standard indexes across global hosts to
                ensure robust content availability.
              </p>
            </div>

            {/* Status Footer */}
            <div className="mt-auto pt-3 border-t border-white/5">
              <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-2">
                System Routing:
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-white/15 text-white/70 bg-white/5 uppercase tracking-wider">
                  Auto-Failover
                </span>
                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded border border-white/15 text-white/70 bg-white/5 uppercase tracking-wider">
                  Standard DNS
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

interface MovieDetailsProps {
  movie?: any;
  onClose: () => void;
  onPlay: (season?: number, episode?: number, source?: string) => void;
  onSelectMovie?: (m: any) => void;
  isInList: boolean;
  onToggleList: () => void;
}

export const MovieDetails: React.FC<MovieDetailsProps> = ({
  movie: initialMovie,
  onClose,
  onPlay,
  onSelectMovie,
  isInList,
  onToggleList,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState<any>(initialMovie);
  const [activeTab, setActiveTab] = useState(
    initialMovie?.type === "tv" ? "Episodes" : "Overview",
  );
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
  const [episodes, setEpisodes] = useState<any[]>([]);

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
  }, [movie?.id]);

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
        setDirectLoading(true);
        setDirectError("");
        fetch(
          `${API_BASE_URL}/api/download/direct?tmdbId=${movie.id}&type=${movie.type}`,
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
  };

  const handleSelectSource = (sourceUrl?: string) => {
    setShowSourceModal(false);
    onPlay(selectedEpForModal?.season, selectedEpForModal?.episode, sourceUrl);
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
      getTVSeasonEpisodes(movie.id, activeSeason).then(setEpisodes);
    }
  }, [activeSeason]);

  if (!movie && isLoading)
    return (
      <div className="fixed inset-0 z-[200] bg-obsidian flex flex-col items-center justify-center text-white gap-6">
        {/* Glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.05)_0%,transparent_60%)] pointer-events-none" />

        {/* Back Button */}
        <div className="absolute top-8 left-8 sm:top-10 sm:left-10 z-[210]">
          <button
            onClick={onClose}
            className="flex items-center gap-3 text-dim hover:text-white transition-all group w-fit"
          >
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-nebula-cyan group-hover:bg-white/5 transition-all">
              <ArrowLeft size={20} />
            </div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase">
              Back to Browse
            </span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-nebula-cyan/20 blur-xl rounded-full scale-150 animate-pulse" />
            <Loader2
              className="animate-spin text-nebula-cyan relative z-10"
              size={40}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-white font-display font-black text-xl tracking-tighter uppercase italic animate-pulse">
              Establishing Satellite Link
            </p>
            <div className="h-0.5 w-32 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "linear",
                }}
                className="h-full w-full bg-nebula-cyan"
              />
            </div>
          </div>
        </div>
      </div>
    );
  if (!movie) return null;

  const accentColor = movie.accent || "#00E5FF";
  const TABS =
    movie.type === "tv"
      ? ["Episodes", "Downloads", "Overview", "Trailers & Extras"]
      : ["Overview", "Downloads", "Trailers & Extras"];

  const logoTitle = movie.clearLogo ? (
    <div className="mb-8 lg:mb-12">
      <img
        src={movie.clearLogo}
        alt={movie.title}
        className="h-20 sm:h-28 md:h-40 w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        referrerPolicy="no-referrer"
        onError={handleImageError}
      />
    </div>
  ) : (
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tight mb-8 uppercase leading-[0.9] break-words max-w-2xl drop-shadow-2xl">
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
        <div
          className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] blur-[150px] opacity-30 rounded-full"
          style={{ backgroundColor: accentColor }}
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
            <div className="absolute inset-0 border-[1px] border-white/20 rounded-2xl pointer-events-none" />
          </motion.div>

          <div className="flex-1 w-full overflow-hidden">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {logoTitle}

              <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-8 text-xs sm:text-sm font-bold tracking-widest text-dim uppercase">
                <span className="flex items-center gap-2">
                  <Star
                    size={16}
                    className="text-nebula-cyan fill-nebula-cyan"
                  />{" "}
                  {movie.imdb || movie.rating}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                <span className="flex items-center gap-2">
                  <Clock size={16} /> {movie.duration || "124m"}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                <span className="flex items-center gap-2">
                  <Calendar size={16} /> {movie.year}
                </span>

                {/* Quality Badge */}
                {movie.quality && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                    <div
                      className={`px-2 py-0.5 rounded border ${
                        movie.quality === "CAM"
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                          : movie.quality === "TBA"
                            ? "border-red-500/50 bg-red-500/10 text-red-500"
                            : "border-nebula-cyan/50 bg-nebula-cyan/10 text-nebula-cyan"
                      }`}
                    >
                      {movie.quality}
                    </div>
                  </>
                )}

                {/* Availability Badge */}
                {movie.isVerified ? (
                  <div className="px-1.5 md:px-2 py-0.5 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5 md:gap-2 font-black tracking-tighter text-[10px] md:text-xs">
                    <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="hidden md:inline">VERIFIED COPY</span>
                    <span className="md:hidden">VERIFIED</span>
                  </div>
                ) : movie.isDead ? (
                  <div className="px-1.5 md:px-2 py-0.5 rounded border border-rose-500/50 bg-rose-500/10 text-rose-400 flex items-center gap-1.5 md:gap-2 font-black tracking-tighter text-[10px] md:text-xs">
                    <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                    <span className="hidden md:inline">NO SIGNAL DETECTED</span>
                    <span className="md:hidden">DEAD SIGNAL</span>
                  </div>
                ) : (
                  movie.quality !== "TBA" && (
                    <div className="px-1.5 md:px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/50 font-black tracking-tighter text-[10px] md:text-xs">
                      {movie.quality === "CAM" ? (
                        <>
                          <span className="hidden md:inline">IN THEATERS</span>
                          <span className="md:hidden">THEATER</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden md:inline">
                            SEARCHING MIRRORS
                          </span>
                          <span className="md:hidden">PENDING</span>
                        </>
                      )}
                    </div>
                  )
                )}
              </div>

              <p className="text-lg text-white/70 font-light leading-relaxed mb-10 max-w-2xl">
                {movie.description}
              </p>

              <div className="flex flex-wrap gap-4 sm:gap-6 mb-16">
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

                          const currentSeasonInfo = sortedSeasons.find(
                            (s: any) => s.season_number === latest.season,
                          );
                          if (currentSeasonInfo) {
                            const maxEpisodes = currentSeasonInfo.episode_count;
                            if (latest.episode < maxEpisodes) {
                              resumeData = {
                                season: latest.season,
                                episode: latest.episode + 1,
                                _isNext: true,
                              };
                            } else {
                              // Transition to next season
                              const currentSeasonIdx = sortedSeasons.findIndex(
                                (s: any) => s.season_number === latest.season,
                              );
                              if (
                                currentSeasonIdx !== -1 &&
                                currentSeasonIdx < sortedSeasons.length - 1
                              ) {
                                const nextSeason =
                                  sortedSeasons[currentSeasonIdx + 1];
                                resumeData = {
                                  season: nextSeason.season_number,
                                  episode: 1,
                                  _isNext: true,
                                };
                              } else {
                                // No more seasons or episodes!
                                resumeData = {
                                  season: latest.season,
                                  episode: latest.episode,
                                  _completed: true,
                                };
                              }
                            }
                          } else {
                            // Fallback if current season info not found
                            resumeData = {
                              season: latest.season,
                              episode: latest.episode + 1,
                              _isNext: true,
                            };
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
                    label = "Series Completed";
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

                  const isDisabled = resumeData && resumeData._completed;

                  return (
                    <div className="flex flex-col gap-2 flex-1 sm:flex-none">
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
                        className={`px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all flex-1 sm:flex-none ${
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
                        <span>{label}</span>
                      </motion.button>
                      {!movie.isVerified && !isTBA && (
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider text-center ${movie.isDead ? "text-rose-400 animate-pulse" : "text-dim"}`}
                        >
                          {movie.isDead
                            ? "Known Unreachable • Scrapers returned 404"
                            : "Copy not verified • Search pending"}
                        </p>
                      )}
                    </div>
                  );
                })()}
                <motion.button
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  onClick={onToggleList}
                  className={`px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all border flex-1 sm:flex-none ${
                    isInList
                      ? "bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan"
                      : "bg-white/5 border-white/10 text-white"
                  }`}
                >
                  {isInList ? <X size={20} /> : <Plus size={20} />}{" "}
                  <span>{isInList ? "Remove" : "Add to List"}</span>
                </motion.button>
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
                          className="w-32 sm:w-40 aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer relative shrink-0 snap-start"
                        >
                          <img
                            src={m.image}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
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

            <div className="border-b border-white/10 mb-10 flex gap-6 sm:gap-12 overflow-x-auto custom-scrollbar">
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
                  {tvDetails?.seasons?.length > 0 && (
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                      {tvDetails.seasons
                        .filter((s: any) => s.season_number > 0)
                        .map((s: any) => (
                          <button
                            key={s.season_number}
                            onClick={() => setActiveSeason(s.season_number)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeSeason === s.season_number ? "bg-white text-black" : "bg-white/10 hover:bg-white/20 text-white"}`}
                          >
                            Season {s.season_number}
                          </button>
                        ))}
                    </div>
                  )}
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
                          ? Math.min(100, (epProg.time / epProg.duration) * 100)
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

                            {/* Episode number badge */}
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded font-bold text-[10px] text-white backdrop-blur">
                              E{ep.episode_number}
                            </div>

                            {/* Watched checkmark overlay */}
                            {epWatched && (
                              <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10">
                                <svg
                                  width="10"
                                  height="9"
                                  viewBox="0 0 10 9"
                                  fill="none"
                                >
                                  <path
                                    d="M1.5 4.5L4 7L8.5 1.5"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/70">
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
                            <p className="text-xs text-dim line-clamp-2 mt-auto">
                              {ep.overview || "No description available."}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                                    via VidVault • No torrent client needed
                                  </span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-300">
                                  Direct
                                </span>
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
                                                          via VidVault • No
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
                  <div className="w-full">
                    <h3 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-4 sm:mb-6">
                      Director's Cut Cast
                    </h3>
                    <div className="flex gap-6 sm:gap-10 overflow-x-auto pb-6 no-scrollbar touch-pan-x">
                      {deepDetails.cast.length > 0 ? (
                        deepDetails.cast.map((person: any, i: number) => (
                          <div
                            key={`${person.name}-${person.role}-${i}`}
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
                </motion.div>
              )}

              {activeTab === "Trailers & Extras" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {deepDetails.trailers.length > 0 ? (
                    deepDetails.trailers.map((video: any, i: number) => (
                      <a
                        key={`trailer-${video.id}`}
                        href={`https://www.youtube.com/watch?v=${video.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="space-y-4 group cursor-pointer"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-white/5">
                          <img
                            src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
                            className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                            alt={video.name}
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />

                          {/* Centered Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-nebula-cyan group-hover:text-obsidian transition-all group-hover:scale-110 shadow-xl">
                              <Play
                                size={24}
                                fill="currentColor"
                                className="ml-1"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-nebula-cyan transition-colors truncate">
                            {video.name}
                          </h4>
                          <p className="text-[10px] text-dim font-bold mt-1 uppercase tracking-widest">
                            {video.type} • 4K Stream
                          </p>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-dim text-xs col-span-full py-10 text-center border border-dashed border-white/10 rounded-2xl">
                      No intercepted trailer signals for this mission.
                    </p>
                  )}
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
    </motion.div>
  );
};
