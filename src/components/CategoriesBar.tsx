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

type CategoryEntry = {
  name: string;
  key: string;
  icon: React.ElementType;
  adult?: boolean;
};

const BASE_CATEGORIES: CategoryEntry[] = [
  { name: "Action",      key: "Action Packed Missions",   icon: Sword    },
  { name: "Comedy",      key: "Comedy Gold",               icon: Laugh    },
  { name: "Sci-Fi",      key: "Sci-Fi Spectacles",         icon: Rocket   },
  { name: "Horror",      key: "Scary Nights (Horror)",     icon: Skull    },
  { name: "Anime",       key: "Anime Series",              icon: Sparkles },
  { name: "Drama",       key: "TV Dramas",                 icon: Drama    },
  { name: "Thriller",    key: "Mystery & Suspense",        icon: Eye      },
  { name: "Romance",     key: "Feel-Good Romance",         icon: Heart    },
  { name: "Documentary", key: "Documentary Collection",    icon: Film     },
  { name: "Fantasy",     key: "Epic Fantasy Worlds",       icon: Wand     },
];

const ADULT_CATEGORIES: CategoryEntry[] = [
  { name: "Rated R",        key: "Rated R Hits",    icon: Flame, adult: true },
  { name: "Steamy Romance", key: "Steamy Romance",  icon: Heart, adult: true },
  { name: "Erotic Thrillers", key: "Erotic Thrillers", icon: Zap, adult: true },
  { name: "Adult Anime",    key: "Adult Anime",     icon: Sparkles, adult: true },
];

interface CategoriesBarProps {
  setViewingCategory: (category: string | null) => void;
  adultMode?: boolean;
}

export const CategoriesBar: React.FC<CategoriesBarProps> = memo(
  ({ setViewingCategory, adultMode = false }) => {
    const categories = adultMode
      ? [...BASE_CATEGORIES, ...ADULT_CATEGORIES]
      : BASE_CATEGORIES;

    const [glowing, setGlowing] = useState<string | null>(null);

    const handleClick = useCallback(
      (cat: CategoryEntry) => {
        setGlowing(cat.key);
        // Brief glow then navigate
        setTimeout(() => {
          setGlowing(null);
          setViewingCategory(cat.key);
        }, 320);
      },
      [setViewingCategory],
    );

    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-5 px-4 sm:px-0">
          <div className="flex items-center gap-3">
            <span className="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shrink-0" />
            <h3 className="text-xl md:text-2.5xl font-display font-black uppercase tracking-tighter text-white/90 leading-none">
              Categories
            </h3>
            <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] text-nebula-cyan uppercase border border-nebula-cyan/25 rounded px-1.5 py-0.5 leading-none">
              Explore Genres
            </span>
            {adultMode && (
              <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.1em] text-red-400 uppercase border border-red-500/30 px-1.5 py-0.5 rounded leading-none">
                18+
              </span>
            )}
          </div>
          <div className="h-px flex-1 ml-6 bg-gradient-to-r from-white/10 to-transparent hidden sm:block" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 px-4 sm:px-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isGlowing = glowing === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleClick(cat)}
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
      </section>
    );
  },
);
