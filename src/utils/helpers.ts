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
};
