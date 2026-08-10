/**
 * Nebula — Unified Provider Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for streaming provider definitions,
 * display order, and playback priority.
 *
 * ── How ordering works ───────────────────────────────────────────────────────
 *  • The position of each entry in PROVIDERS determines:
 *      1. Display order in the Source Selection modal (MovieDetails)
 *      2. Display order in the compact in-player source picker (MediaPlayer)
 *      3. Autoplay priority — preferred source first if selected, otherwise sequential fallback (Aether -> Vesper -> Quantum -> Hyperion...)
 *      4. In-player mirror sort priority (via CATEGORY_PRIORITY below)
 *
 *  • PRIORITY_PROVIDER_ID always equals PROVIDERS[0].id — no manual update needed.
 *
 * ── To change source order ────────────────────────────────────────────────────
 *  Move entries up/down in the PROVIDERS array. That is it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { API_BASE_URL } from "../config";

export interface ProviderConfig {
  id: string;
  name: string;
  badge: string;
  /** Tailwind color token (no opacity suffix) used for dots/badges */
  colorClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  /**
   * Optional explicit dot background class.
   * MovieDetails uses this directly; MediaPlayer derives it from textClass.
   */
  dotBgClass?: string;
  /**
   * The API-side category name this provider's streams are tagged with.
   * Matches the keys used in SOURCE_ALIASES in MediaPlayer.
   * Used to derive SOURCE_PRIORITY order automatically from PROVIDERS.
   */
  apiCategory?: string;
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

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "hdghartv",
    name: "Aether",
    badge: "MULTI-AUDIO",
    colorClass: "emerald",
    borderClass: "border-emerald-500/40",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-400",
    dotBgClass: "bg-emerald-400",
    apiCategory: "HDGharTV",
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
    dotBgClass: "bg-cyan-400",
    apiCategory: "NetNaija",
    buildUrl: ({ tmdbId, type, title, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/netnaija?tmdbId=${tmdbId}&type=${type}&title=${encodeURIComponent(title)}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
    serializeExtra: (src) => src.audio || "",
  },
  {
    id: "vaplayer",
    name: "Quantum",
    badge: "GLOBAL MIRRORS",
    colorClass: "cyan",
    borderClass: "border-cyan-500/40",
    bgClass: "bg-cyan-500/10",
    textClass: "text-cyan-400",
    dotBgClass: "bg-cyan-400",
    apiCategory: "Vaplayer",
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
    dotBgClass: "bg-nebula-cyan",
    apiCategory: "VidRock",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/vidrock?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
    serializeExtra: (src) => src.audio || src.language || "",
  },
  {
    id: "videasy",
    name: "Pulse",
    badge: "WASM DECRYPT",
    colorClass: "violet",
    borderClass: "border-violet-500/40",
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-400",
    dotBgClass: "bg-violet-400",
    apiCategory: "Videasy",
    buildUrl: () => null,
    serializeExtra: (src) => src.audio || "",
  },
  {
    id: "kuro_sub",
    name: "Zenith (Sub)",
    badge: "JPN AUDIO",
    colorClass: "violet",
    borderClass: "border-violet-500/40",
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-400",
    dotBgClass: "bg-violet-400",
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
    dotBgClass: "bg-pink-400",
    buildUrl: ({ tmdbId, type, title, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/kuro?tmdbId=${tmdbId}&type=${type}&title=${encodeURIComponent(title)}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "vidlink",
    name: "Spectra",
    badge: "INDEX NODE",
    colorClass: "slate",
    borderClass: "border-white/20",
    bgClass: "bg-white/10",
    textClass: "text-white/70",
    dotBgClass: "bg-white/70",
    apiCategory: "VidLink",
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
    dotBgClass: "bg-emerald-400",
    apiCategory: "Vidnest",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/vidnest?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
  },
  {
    id: "cinesrc",
    name: "Starlight",
    badge: "FAST HLS",
    colorClass: "indigo",
    borderClass: "border-indigo-500/40",
    bgClass: "bg-indigo-500/10",
    textClass: "text-indigo-400",
    dotBgClass: "bg-indigo-400",
    apiCategory: "Starlight",
    buildUrl: ({ tmdbId, type, season, episode, force }) => {
      let u = `${API_BASE_URL}/api/cinesrc?tmdbId=${tmdbId}&type=${type}${force ? "&force=1" : ""}`;
      if (season !== undefined) u += `&season=${season}`;
      if (episode !== undefined) u += `&episode=${episode}`;
      return u;
    },
    serializeExtra: (src) => {
      if (!src) return "";
      const raw = typeof src === "string" ? src : src.source || src.name || "";
      const clean = raw
        .replace(/^cinesrc-?/i, "")
        .replace(/^starlight-?/i, "")
        .trim();
      return clean.toUpperCase() || "";
    },
  },
];

/**
 * The ID of the highest-priority provider.
 * Autoplay logic checks providers sequentially in PROVIDERS order. Always equals PROVIDERS[0].id.
 */
export const PRIORITY_PROVIDER_ID = PROVIDERS[0].id;

/**
 * Ordered list of category display names used for in-player stream mirror sorting.
 * Controls which provider category appears first in the player mirror list.
 *
 * NOTE: Includes legacy API-side names (e.g. "Vaplayer", "VidRock", "HDGharTV") alongside
 * display names ("Aether", "Vesper", "Quantum", "Hyperion") because stream names from the API may
 * use either form. Keep both when a provider has an alias.
 */
export const CATEGORY_PRIORITY: string[] = [
  "Aether",
  "HDGharTV",
  "GharTV",
  "Vesper",
  "NetNaija",
  "Quantum",
  "Vaplayer",
  "Hyperion",
  "VidRock",
  "Pulse",
  "Videasy",
  "Zenith (Sub)",
  "Kuro (Sub)",
  "Zenith (Dub)",
  "Kuro (Dub)",
  "Zenith",
  "Kuro",
  "Spectra",
  "VidLink",
  "Titan",
  "Vidnest",
  "Orbital",
  "FilmU",
  "Starlight",
  "Cinesrc",
  "Chronos",
  "VidVault",
];
