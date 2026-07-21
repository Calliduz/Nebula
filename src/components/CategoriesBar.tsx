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
      "genres",
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
      <section className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
          {/* Title Area */}
          <div className="flex items-center gap-3">
            <span className="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shrink-0" />
            <h3 className="text-xl md:text-2.5xl font-display font-black uppercase tracking-tighter text-white/90 leading-none">
              Explore Library
            </h3>
            <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] text-nebula-cyan uppercase border border-nebula-cyan/25 rounded px-1.5 py-0.5 leading-none">
              {activeSection === "genres" ? "Genres" : "Studios"}
            </span>
            {adultMode && activeSection === "genres" && (
              <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.1em] text-red-400 uppercase border border-red-500/30 px-1.5 py-0.5 rounded leading-none">
                18+
              </span>
            )}
          </div>

          {/* Premium Tab Switcher */}
          <div className="flex items-center self-start sm:self-auto gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl backdrop-blur-md relative z-25">
            <button
              onClick={() => setActiveSection("genres")}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeSection === "genres"
                  ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Genres
            </button>
            <button
              onClick={() => setActiveSection("studios")}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeSection === "studios"
                  ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Studios
            </button>
          </div>
        </div>

        {/* Dynamic Display Panel */}
        {activeSection === "genres" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 px-4 sm:px-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isGlowing = glowing === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat)}
                  className={`group relative flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 bg-white/[0.03] border transition-all duration-300 font-sans text-[10px] font-black uppercase tracking-[0.1em] text-white/50 hover:text-white overflow-hidden ${
                    cat.adult
                      ? "border-red-500/20 hover:border-red-400/40"
                      : "border-white/[0.06] hover:border-nebula-cyan/30"
                  } ${isGlowing ? "click-glow-once" : ""}`}
                >
                  {/* Hover background glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      cat.adult
                        ? "from-red-500/8 to-transparent"
                        : "from-nebula-cyan/5 to-transparent"
                    }`}
                  />

                  {/* Icon */}
                  <Icon
                    size={11}
                    className={`relative z-10 shrink-0 transition-colors duration-300 ${
                      cat.adult
                        ? "text-red-400/60 group-hover:text-red-300"
                        : "text-white/30 group-hover:text-nebula-cyan"
                    }`}
                  />

                  {/* Label */}
                  <span className="relative z-10 truncate">{cat.name}</span>

                  {/* Bottom underline */}
                  <div
                    className={`absolute bottom-0 left-0 h-[1.5px] w-0 transition-all duration-300 group-hover:w-full ${
                      cat.adult ? "bg-red-400" : "bg-nebula-cyan"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3 px-4 sm:px-0">
            {STUDIO_CATEGORIES.map((studio) => {
              const isGlowing = glowing === studio.key;
              return (
                <button
                  key={studio.key}
                  onClick={() => handleStudioClick(studio)}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl h-24 p-3 bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] hover:border-white/20 transition-all duration-500 overflow-hidden cursor-pointer ${
                    isGlowing ? "click-glow-once" : ""
                  }`}
                  style={{
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Brand Ambient Glow behind card */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl scale-125 -z-10 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${studio.glow} 0%, transparent 70%)`,
                    }}
                  />

                  {/* Subtle internal gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${studio.color} opacity-0 group-hover:opacity-100 transition-opacity duration-550`}
                  />

                  {/* Logo Image */}
                  <div className="h-10 w-full flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-110">
                    <img
                      src={`${API_BASE_URL}/api/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w154${studio.logo}`)}`}
                      alt={studio.name}
                      className="max-h-full max-w-[85%] object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-500 filter invert brightness-200"
                      loading="lazy"
                    />
                  </div>

                  {/* Title (Hidden by default, slides up slightly on hover) */}
                  <span className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-white/80 transition-all duration-500 transform translate-y-1 group-hover:translate-y-0 relative z-10 truncate w-full text-center">
                    {studio.name}
                  </span>

                  {/* Bottom active line */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-transparent via-nebula-cyan to-transparent transition-all duration-500 group-hover:w-3/4" />
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  },
);
