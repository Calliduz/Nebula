import React from "react";

/**
 * For poster/card/thumbnail images — shows a branded "No Image Available" placeholder.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
) => {
  const target = "/no-image.svg";
  // Guard against infinite error loop if the fallback itself fails
  if (e.currentTarget.src.endsWith(target)) return;
  e.currentTarget.src = target;
};

/**
 * Global memory cache for validated clearLogo URLs across component mounts & episode switches.
 */
export const validLogoCache = new Set<string>();

export const isLogoValidated = (url?: string | null): boolean => {
  if (!url) return false;
  return validLogoCache.has(url);
};

export const markLogoValid = (url?: string | null) => {
  if (!url) return;
  validLogoCache.add(url);
};

/**
 * For clearlogo transparent PNGs — hides the element so the text-title fallback
 * (already conditionally rendered alongside clearLogo in Hero, MovieDetails, etc.) shows instead.
 */
export const handleClearLogoError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
) => {
  e.currentTarget.style.display = "none";
};

/**
 * For full-bleed backdrop/background images — hides them silently.
 * A "no image" block tiling across a hero background would look broken.
 */
export const handleBackdropError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
) => {
  e.currentTarget.style.display = "none";
};

export const triggerPopunder = () => {
  /* DISABLED ADS FOR NOW!
  const lastAdTime = localStorage.getItem("nebula-last-ad-time");
  const now = Date.now();
  const cooldown = 15 * 60 * 1000; // 15-minute cooldown between popunders

  if (!lastAdTime || now - parseInt(lastAdTime) > cooldown) {
    localStorage.setItem("nebula-last-ad-time", now.toString());
    const adUrl =
      (import.meta.env as any).VITE_AD_URL ||
      "https://www.profitablecpmrate.com/d5u456f7q?key=f074d283897b20ff80a22a33a5cfc02b";
    try {
      const adWindow = window.open(adUrl, "_blank", "noopener,noreferrer");
      if (adWindow) {
        window.focus();
      }
    } catch (e) {
      console.warn("Popunder blocked by browser settings:", e);
    }
  }
  */
  return;
};

/**
 * Format season name for display:
 * - Specific/custom name if present (e.g. "Thousand-Year Blood War"), otherwise "Season X"
 * - Appends episode count in parens if present and > 0 (e.g. "Bleach (366)" or "Season 1 (24)")
 */
export const formatSeasonName = (
  season: any,
  fallbackSeasonNumber?: number,
): string => {
  if (!season && fallbackSeasonNumber !== undefined) {
    return `Season ${fallbackSeasonNumber}`;
  }
  if (!season) return "";

  const sNumber = season.season_number ?? fallbackSeasonNumber ?? 1;
  const rawName = (season.name || "").trim();
  const isGeneric = !rawName || /^season\s+\d+$/i.test(rawName);
  const baseName = isGeneric ? `Season ${sNumber}` : rawName;

  const epCount = season.episode_count;
  if (epCount !== undefined && epCount !== null && epCount > 0) {
    return `${baseName} (${epCount})`;
  }
  return baseName;
};

/**
 * Dynamically selects optimized TMDB poster resolution (w185, w342, w500, w780)
 * based on card layout width and device pixel ratio (DPR).
 */
export const getOptimizedPosterUrl = (
  url?: string | null,
  cardWidthPx: number = 220,
): string => {
  if (!url) return "";

  // Only optimize TMDB image URLs
  if (!url.includes("image.tmdb.org/t/p/")) {
    return url;
  }

  const dpr =
    typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio || 1, 2)
      : 1;
  const targetPx = cardWidthPx * dpr;

  let targetSize = "w500";
  if (targetPx <= 200) {
    targetSize = "w185";
  } else if (targetPx <= 380) {
    targetSize = "w342";
  } else if (targetPx <= 550) {
    targetSize = "w500";
  } else {
    targetSize = "w780";
  }

  // Replace /t/p/w500/ or /t/p/original/ or /t/p/w342/ with calculated size
  return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${targetSize}/`);
};

/**
 * Format movie/show runtime duration into a clean human-readable string.
 * Converts "124M", "124", 124, "124min" -> "2h 4m"
 * Keeps existing descriptive strings ("1 Season", "24 eps", etc.) untouched.
 */
export const formatDuration = (val?: string | number): string => {
  if (!val) return "";
  const str = String(val).trim();
  if (!str) return "";

  // If it's already a season or episode count, return as is
  if (/season|episodes|eps/i.test(str)) {
    return str;
  }

  // Extract pure number of minutes (e.g. "124M", "124m", "124 min", "124")
  const match = str.match(/^(\d+)/);
  if (match) {
    const totalMinutes = parseInt(match[1], 10);
    if (isNaN(totalMinutes) || totalMinutes <= 0) return str;

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${totalMinutes}m`;
  }

  return str;
};
