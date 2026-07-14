import React, { memo } from "react";

const BASE_CATEGORIES = [
  { name: "Action", key: "Action Packed Missions" },
  { name: "Comedy", key: "Comedy Gold" },
  { name: "Sci-Fi", key: "Sci-Fi Spectacles" },
  { name: "Horror", key: "Scary Nights (Horror)" },
  { name: "Anime", key: "Anime Series" },
  { name: "Drama", key: "TV Dramas" },
  { name: "Thriller", key: "Mystery & Suspense" },
  { name: "Romance", key: "Feel-Good Romance" },
  { name: "Documentary", key: "Documentary Collection" },
  { name: "Fantasy", key: "Epic Fantasy Worlds" },
];

const ADULT_CATEGORIES = [
  { name: "Rated R", key: "Rated R Hits", adult: true },
  { name: "Steamy Romance", key: "Steamy Romance", adult: true },
  { name: "Erotic Thrillers", key: "Erotic Thrillers", adult: true },
  { name: "Adult Anime", key: "Adult Anime", adult: true },
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

    return (
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-6 px-4 sm:px-0">
          <h3 className="text-xl md:text-2xl font-display font-black uppercase tracking-tighter text-white/90">
            Categories
          </h3>
          <span className="text-[9px] font-bold tracking-[0.2em] text-nebula-cyan uppercase">
            Explore Genres
          </span>
          {adultMode && (
            <span className="text-[9px] font-bold tracking-[0.1em] text-red-400 uppercase border border-red-500/30 px-1.5 py-0.5 rounded">
              18+
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5 px-4 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setViewingCategory(cat.key)}
              className={`group relative flex items-center justify-center rounded-lg px-4 py-3 bg-white/[0.03] border transition-all duration-300 font-sans text-[10px] font-black uppercase tracking-[0.1em] text-white/50 hover:text-white overflow-hidden ${
                (cat as any).adult
                  ? "border-red-500/20 hover:border-red-400/40"
                  : "border-white/5 hover:border-nebula-cyan/30"
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${
                  (cat as any).adult
                    ? "from-red-500/10 to-transparent"
                    : "from-white/5 to-transparent"
                }`}
              />
              <span className="relative z-10">{cat.name}</span>
              <div
                className={`absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full ${
                  (cat as any).adult ? "bg-red-400" : "bg-nebula-cyan"
                }`}
              />
            </button>
          ))}
        </div>
      </section>
    );
  },
);
