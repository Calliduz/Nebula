import React, { memo } from "react";

const CATEGORIES = [
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

interface CategoriesBarProps {
  setViewingCategory: (category: string | null) => void;
}

export const CategoriesBar: React.FC<CategoriesBarProps> = memo(
  ({ setViewingCategory }) => {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-6 px-4 sm:px-0">
          <h3 className="text-xl md:text-2xl font-display font-black uppercase tracking-tighter text-white/90">
            Categories
          </h3>
          <span className="text-[9px] font-bold tracking-[0.2em] text-nebula-cyan uppercase">
            Explore Genres
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5 px-4 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setViewingCategory(cat.key)}
              className="group relative flex items-center justify-center rounded-lg px-4 py-3 bg-white/[0.03] border border-white/5 hover:border-nebula-cyan/30 transition-all duration-300 font-sans text-[10px] font-black uppercase tracking-[0.1em] text-white/50 hover:text-white overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">{cat.name}</span>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-nebula-cyan transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
        </div>
      </section>
    );
  },
);
