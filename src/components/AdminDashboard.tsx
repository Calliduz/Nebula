import React, { useState, useEffect } from "react";
import {
  X,
  Activity,
  Users,
  Database,
  Cpu,
  RefreshCw,
  Trash2,
  Lock,
  Film,
  Tv,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "../config";

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  timestamp: string;
  onlineViewers: number;
  activeStreams: Array<{
    title: string;
    count: number;
    type: string;
    tmdbId?: string;
  }>;
  serverHealth: {
    ramRssMb: string;
    ramHeapMb: string;
    dbStatus: string;
    redisStatus: string;
    redisProxyCacheKeys: number;
  };
}

interface ToastNotice {
  message: string;
  type: "success" | "info" | "error";
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const [adminKey, setAdminKey] = useState<string>(
    () => localStorage.getItem("nebula_admin_key") || "",
  );
  const [inputKey, setInputKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const showToast = (
    message: string,
    type: "success" | "info" | "error" = "info",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch metrics from protected backend endpoint
  const fetchAnalytics = async (keyToUse = adminKey, isManual = false) => {
    if (!keyToUse || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/analytics?key=${encodeURIComponent(keyToUse)}`,
      );
      if (res.status === 401) {
        throw new Error("Invalid Admin Key");
      }
      if (res.status === 429) {
        throw new Error("Rate limit reached. Please wait a moment.");
      }
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
      // Persist valid key
      localStorage.setItem("nebula_admin_key", keyToUse);
      if (isManual) {
        showToast("⚡ Analytics refreshed", "info");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !adminKey) return;
    fetchAnalytics();
    const interval = setInterval(() => fetchAnalytics(adminKey, false), 8000);
    return () => clearInterval(interval);
  }, [isOpen, adminKey]);

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    setAdminKey(inputKey.trim());
    fetchAnalytics(inputKey.trim(), true);
  };

  const handleLogout = () => {
    localStorage.removeItem("nebula_admin_key");
    setAdminKey("");
    setData(null);
    setError(null);
    showToast("Logged out of Admin Panel", "info");
  };

  const handleFlushCache = async () => {
    if (!adminKey) return;
    if (!window.confirm("Are you sure you want to flush all server caches?"))
      return;
    showToast("Flushing server cache...", "info");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/cache/clear?key=${encodeURIComponent(adminKey)}`,
      );
      const json = await res.json();
      if (res.ok) {
        showToast("✅ Registry & Proxy cache cleared successfully", "success");
        fetchAnalytics(adminKey, false);
      } else {
        showToast(`❌ Flush failed: ${json.error}`, "error");
      }
    } catch {
      showToast("❌ Network error during cache flush", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/85 p-3 sm:p-6 backdrop-blur-xl transition-all">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 sm:top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-xl backdrop-blur-md transition-all ${
            toast.type === "success"
              ? "border-[#00e5ff]/40 bg-black/95 text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]"
              : toast.type === "error"
                ? "border-red-500/40 bg-black/95 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                : "border-white/20 bg-black/95 text-white"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="relative mb-14 sm:mb-0 flex max-h-[85vh] sm:max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080808] text-white shadow-[0_0_50px_rgba(0,229,255,0.08)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-lg font-bold tracking-wide text-white truncate">
                Nebula Admin & Analytics
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-400 truncate">
                Real-time active viewers & server health
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            {adminKey && (
              <button
                disabled={loading}
                onClick={() => fetchAnalytics(adminKey, true)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-[#00e5ff]/30 bg-[#00e5ff]/10 px-2.5 py-1.5 text-[11px] sm:text-xs font-medium text-[#00e5ff] transition hover:bg-[#00e5ff]/20 hover:shadow-[0_0_12px_rgba(0,229,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh stats"
              >
                <RefreshCw
                  className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden xs:inline">Refresh</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {!adminKey ? (
            /* Auth Form */
            <div className="mx-auto my-8 sm:my-12 max-w-md text-center px-2">
              <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[#00e5ff] shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                <Lock className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <h3 className="font-display mb-2 text-lg sm:text-xl font-bold text-white">
                Admin Authentication
              </h3>
              <p className="mb-6 text-xs sm:text-sm text-zinc-400">
                Enter your <code className="text-[#00e5ff]">ADMIN_KEY</code> to
                access real-time metrics.
              </p>

              <form onSubmit={handleKeySubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Enter ADMIN_KEY..."
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-center text-sm text-white placeholder-zinc-500 transition focus:border-[#00e5ff] focus:outline-none focus:ring-1 focus:ring-[#00e5ff]/50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-white"
                    title={showPassword ? "Hide key" : "Show key"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  className="font-display w-full rounded-xl border border-[#00e5ff]/40 bg-[#00e5ff] py-3 text-sm font-bold text-black transition hover:bg-[#00e5ff]/90 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                >
                  Unlock Admin Dashboard
                </button>
              </form>
            </div>
          ) : error ? (
            /* Error View */
            <div className="mx-auto my-8 sm:my-12 max-w-md text-center px-2">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 sm:h-12 sm:w-12 text-red-400" />
              <h3 className="text-base sm:text-lg font-bold text-red-400">
                {error}
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Check your ADMIN_KEY or server status.
              </p>
              <button
                onClick={handleLogout}
                className="mt-6 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-700"
              >
                Re-enter ADMIN_KEY
              </button>
            </div>
          ) : data ? (
            /* Analytics Dashboard */
            <div className="space-y-4 sm:space-y-6">
              {/* Metrics Grid — 2 columns on mobile for clean fit */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Active Viewers */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4 transition hover:border-[#00e5ff]/30">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[11px] sm:text-xs font-medium truncate">
                      Online Viewers
                    </span>
                    <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5 sm:gap-2">
                    <span className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                      {data.onlineViewers}
                    </span>
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                  </div>
                  <p className="mt-1 text-[9px] sm:text-[10px] text-zinc-500 truncate">
                    Pings every 25s while playing
                  </p>
                </div>

                {/* Redis Proxy Cache */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4 transition hover:border-[#00e5ff]/30">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[11px] sm:text-xs font-medium truncate">
                      Redis Manifests
                    </span>
                    <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#00e5ff] shrink-0" />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-2">
                    <span className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                      {data.serverHealth.redisProxyCacheKeys}
                    </span>
                    <span className="text-[10px] sm:text-xs text-zinc-400">
                      keys
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] sm:text-[10px] text-zinc-500 truncate">
                    Status:{" "}
                    <span
                      className={
                        data.serverHealth.redisStatus === "ONLINE"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }
                    >
                      {data.serverHealth.redisStatus}
                    </span>
                  </p>
                </div>

                {/* Server RAM */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4 transition hover:border-[#00e5ff]/30">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[11px] sm:text-xs font-medium truncate">
                      Server Memory
                    </span>
                    <Cpu className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#00e5ff] shrink-0" />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-2">
                    <span className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                      {data.serverHealth.ramRssMb}
                    </span>
                    <span className="text-[10px] sm:text-xs text-zinc-400">
                      MB
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] sm:text-[10px] text-zinc-500 truncate">
                    Heap: {data.serverHealth.ramHeapMb} MB
                  </p>
                </div>

                {/* DB Status */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4 transition hover:border-[#00e5ff]/30">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[11px] sm:text-xs font-medium truncate">
                      MongoDB
                    </span>
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
                    <span className="font-display text-lg sm:text-xl font-bold text-emerald-400 truncate">
                      {data.serverHealth.dbStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] sm:text-[10px] text-zinc-500 truncate">
                    Atlas Connection Pool
                  </p>
                </div>
              </div>

              {/* Active Streams List */}
              <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 sm:p-4">
                <h4 className="font-display mb-2.5 sm:mb-3 text-xs sm:text-sm font-semibold text-white">
                  Currently Being Watched ({data.activeStreams.length})
                </h4>
                {data.activeStreams.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-500">
                    No active video streams right now.
                  </p>
                ) : (
                  <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/5">
                    {data.activeStreams.map((stream, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white/[0.02] px-3 py-2.5 sm:px-4 sm:py-3 text-xs transition hover:bg-white/[0.05]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {stream.type === "tv" ? (
                            <Tv className="h-3.5 w-3.5 text-[#00e5ff] shrink-0" />
                          ) : (
                            <Film className="h-3.5 w-3.5 text-[#00e5ff] shrink-0" />
                          )}
                          <span className="font-medium text-white truncate">
                            {stream.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-400">
                            {stream.count} watcher{stream.count > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions & Utilities — Stacked flex for mobile */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3.5 sm:p-4 gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Maintenance Actions
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Flush proxy cache and metadata cache
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={handleFlushCache}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 sm:py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Flush Cache
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 sm:flex-none flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 sm:py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-zinc-400">
              Loading analytics...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
