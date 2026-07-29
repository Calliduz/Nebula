import React, { memo, useState, useCallback } from "react";
import {
  Sword,
  Laugh,
  Rocket,
  Skull,
  Sparkles,
  Drama,
  Eye,
  Heart,
  Film,
  Wand,
  Flame,
  Zap,
} from "lucide-react";
import { API_BASE_URL } from "../config";

type CategoryEntry = {
  name: string;
  key: string;
  icon: React.ElementType;
  adult?: boolean;
};

const BASE_CATEGORIES: CategoryEntry[] = [
  { name: "Action", key: "Action Packed Missions", icon: Sword },
  { name: "Comedy", key: "Comedy Gold", icon: Laugh },
  { name: "Sci-Fi", key: "Sci-Fi Spectacles", icon: Rocket },
  { name: "Horror", key: "Scary Nights (Horror)", icon: Skull },
  { name: "Anime", key: "Anime Series", icon: Sparkles },
  { name: "Drama", key: "TV Dramas", icon: Drama },
  { name: "Thriller", key: "Mystery & Suspense", icon: Eye },
  { name: "Romance", key: "Feel-Good Romance", icon: Heart },
  { name: "Documentary", key: "Documentary Collection", icon: Film },
  { name: "Fantasy", key: "Epic Fantasy Worlds", icon: Wand },
];

const ADULT_CATEGORIES: CategoryEntry[] = [
  { name: "Rated R", key: "Rated R Hits", icon: Flame, adult: true },
  { name: "Steamy Romance", key: "Steamy Romance", icon: Heart, adult: true },
  { name: "Erotic Thrillers", key: "Erotic Thrillers", icon: Zap, adult: true },
  { name: "Adult Anime", key: "Adult Anime", icon: Sparkles, adult: true },
];

const STUDIO_CATEGORIES = [
  {
    name: "Disney",
    key: "Disney",
    color: "from-blue-600/20 to-indigo-900/20",
    glow: "rgba(17, 60, 207, 0.4)",
    logo: "/wdrCwmRnLFJhEoH8GSfymY85KHT.png",
  },
  {
    name: "Marvel",
    key: "Marvel Studios",
    color: "from-red-600/20 to-red-800/20",
    glow: "rgba(229, 9, 20, 0.5)",
    logo: "/hUzeosd33nzE5MCNsZxCGEKTXaQ.png",
  },
  {
    name: "Columbia",
    key: "Columbia Pictures",
    color: "from-amber-500/20 to-blue-900/20",
    glow: "rgba(212, 175, 55, 0.3)",
    logo: "/71BqEFAF4V3qjjMPCpLuyJFB9A.png",
  },
  {
    name: "DreamWorks",
    key: "DreamWorks",
    color: "from-cyan-500/20 to-purple-900/20",
    glow: "rgba(0, 168, 225, 0.35)",
    logo: "/zcKhWbxFJ4CohZ9dLBMxmOArTVn.png",
  },
  {
    name: "20th Century",
    key: "20th Century Studios",
    color: "from-yellow-600/20 to-amber-900/20",
    glow: "rgba(255, 215, 0, 0.3)",
    logo: "/qZCc1lty5FzX30aOCVRBLzaVmcp.png",
  },
  {
    name: "Lionsgate",
    key: "Lionsgate",
    color: "from-neutral-900/20 to-neutral-850/20",
    glow: "rgba(197, 160, 89, 0.3)",
    logo: "/wxrHa3nZ1K4zo65p56991INkGo6.png",
  },
  {
    name: "Warner Bros.",
    key: "Warner Bros.",
    color: "from-sky-700/20 to-blue-900/20",
    glow: "rgba(13, 60, 155, 0.4)",
    logo: "/zhD3hhtKB5qyv7ZeL4uLpNxgMVU.png",
  },
  {
    name: "Universal",
    key: "Universal Pictures",
    color: "from-slate-900/20 to-blue-950/20",
    glow: "rgba(0, 46, 110, 0.4)",
    logo: "/8lvHyhjr8oUKOOy2dKXoALWKdp0.png",
  },
  {
    name: "Paramount",
    key: "Paramount Pictures",
    color: "from-sky-600/20 to-blue-900/20",
    glow: "rgba(0, 100, 255, 0.4)",
    logo: "/jay6WcMgagAklUt7i9Euwj1pzTF.png",
  },
  {
    name: "A24",
    key: "A24",
    color: "from-neutral-900/40 to-neutral-800/40",
    glow: "rgba(255, 255, 255, 0.2)",
    logo: "/1ZXsGaFPgrgS6ZZGS37AqD5uU12.png",
  },
];

interface CategoriesBarProps {
  setViewingCategory: (category: string | null) => void;
  adultMode?: boolean;
}

export const CategoriesBar: React.FC<CategoriesBarProps> = memo(
  ({ setViewingCategory, adultMode = false }) => {
    const [activeSection, setActiveSection] = useState<"genres" | "studios">(
      "studios",
    );
    const [glowing, setGlowing] = useState<string | null>(null);

    const categories = adultMode
      ? [...BASE_CATEGORIES, ...ADULT_CATEGORIES]
      : BASE_CATEGORIES;

    const handleCategoryClick = useCallback(
      (cat: CategoryEntry) => {
        setGlowing(cat.key);
        setTimeout(() => {
          setGlowing(null);
          setViewingCategory(cat.key);
        }, 320);
      },
      [setViewingCategory],
    );

    const handleStudioClick = useCallback(
      (studio: (typeof STUDIO_CATEGORIES)[0]) => {
        setGlowing(studio.key);
        setTimeout(() => {
          setGlowing(null);
          setViewingCategory(studio.key);
        }, 320);
      },
      [setViewingCategory],
    );

    return (
      <section className="mb-10 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
          {/* Title Area */}
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-nebula-cyan via-nebula-cyan/80 to-transparent shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.6)]" />
            <h3 className="text-xl md:text-2.5xl font-display font-black uppercase tracking-tighter text-white/95 leading-none drop-shadow-md">
              Explore Library
            </h3>
            <span className="text-[8px] sm:text-[9px] font-black tracking-[0.2em] text-nebula-cyan uppercase bg-nebula-cyan/10 border border-nebula-cyan/30 rounded-md px-2 py-0.5 leading-none shadow-[0_0_10px_rgba(0,229,255,0.15)]">
              {activeSection === "studios" ? "Studios" : "Genres"}
            </span>
            {adultMode && activeSection === "genres" && (
              <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.1em] text-red-400 uppercase bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-md leading-none">
                18+
              </span>
            )}
          </div>

          {/* Premium Tab Switcher */}
          <div className="flex items-center self-start sm:self-auto gap-1.5 bg-black/40 border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl relative z-25 shadow-xl">
            <button
              onClick={() => setActiveSection("studios")}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeSection === "studios"
                  ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-[1.02]"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              Studios
            </button>
            <button
              onClick={() => setActiveSection("genres")}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeSection === "genres"
                  ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-[1.02]"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              Genres
            </button>
          </div>
        </div>

        {/* Dynamic Display Panel */}
        {activeSection === "studios" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3.5 sm:gap-4 px-4 sm:px-0">
            {STUDIO_CATEGORIES.map((studio) => {
              const isGlowing = glowing === studio.key;
              return (
                <button
                  key={studio.key}
                  onClick={() => handleStudioClick(studio)}
                  className={`group relative flex flex-col items-center justify-between rounded-2xl sm:rounded-3xl h-28 sm:h-32 p-3.5 sm:p-4 bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-black/60 border border-white/10 hover:border-white/35 transition-all duration-500 overflow-hidden cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.8)] hover:-translate-y-1 ${
                    isGlowing ? "click-glow-once ring-2 ring-nebula-cyan" : ""
                  }`}
                >
                  {/* Glass Specular Top Highlight */}
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                  {/* Brand Ambient Radial Glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl scale-150 -z-10 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${studio.glow} 0%, transparent 70%)`,
                    }}
                  />

                  {/* Subtle Internal Brand Gradient Overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${studio.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-3xl`}
                  />

                  {/* Studio Brand Logo */}
                  <div className="h-14 sm:h-16 w-full flex items-center justify-center relative z-10 my-auto transition-transform duration-500 group-hover:scale-110">
                    <img
                      src={`${API_BASE_URL}/api/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w154${studio.logo}`)}`}
                      alt={studio.name}
                      className="max-h-full max-w-[85%] object-contain opacity-70 group-hover:opacity-100 transition-all duration-500 filter invert brightness-200 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                      loading="lazy"
                    />
                  </div>

                  {/* Studio Title Label */}
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-white/40 group-hover:text-white group-hover:text-nebula-cyan transition-all duration-500 relative z-10 truncate w-full text-center drop-shadow-md">
                    {studio.name}
                  </span>

                  {/* Bottom Cyan Accent Line */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-0 bg-gradient-to-r from-nebula-cyan via-white to-nebula-cyan transition-all duration-500 group-hover:w-4/5 rounded-full shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5 sm:gap-3 px-4 sm:px-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isGlowing = glowing === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat)}
                  className={`group relative flex items-center justify-center gap-2 rounded-2xl px-3.5 py-3.5 bg-white/[0.04] border transition-all duration-300 font-sans text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] text-white/60 hover:text-white overflow-hidden hover:-translate-y-0.5 shadow-lg ${
                    cat.adult
                      ? "border-red-500/20 hover:border-red-400/50 hover:bg-red-500/10"
                      : "border-white/10 hover:border-nebula-cyan/40 hover:bg-white/[0.08]"
                  } ${isGlowing ? "click-glow-once ring-2 ring-nebula-cyan" : ""}`}
                >
                  {/* Hover background glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      cat.adult
                        ? "from-red-500/15 to-transparent"
                        : "from-nebula-cyan/10 to-transparent"
                    }`}
                  />

                  {/* Icon */}
                  <Icon
                    size={13}
                    className={`relative z-10 shrink-0 transition-all duration-300 group-hover:scale-110 ${
                      cat.adult
                        ? "text-red-400 group-hover:text-red-300"
                        : "text-white/40 group-hover:text-nebula-cyan"
                    }`}
                  />

                  {/* Label */}
                  <span className="relative z-10 truncate">{cat.name}</span>

                  {/* Bottom underline */}
                  <div
                    className={`absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-300 group-hover:w-full ${
                      cat.adult ? "bg-red-400" : "bg-nebula-cyan"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  },
);
