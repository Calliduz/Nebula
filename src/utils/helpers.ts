import React from "react";

export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
) => {
  e.currentTarget.src =
    "https://images.unsplash.com/photo-1618365908648-e71bd5716cba?auto=format&fit=crop&w=400&q=80"; // Generic space/fallback image
};

export const triggerPopunder = () => {
  const lastAdTime = localStorage.getItem("nebula-last-ad-time");
  const now = Date.now();
  const cooldown = 15 * 60 * 1000; // 15-minute cooldown between popunders
  
  if (!lastAdTime || now - parseInt(lastAdTime) > cooldown) {
    localStorage.setItem("nebula-last-ad-time", now.toString());
    const adUrl = (import.meta.env as any).VITE_AD_URL || "https://www.profitablecpmrate.com/d5u456f7q?key=f074d283897b20ff80a22a33a5cfc02b";
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
