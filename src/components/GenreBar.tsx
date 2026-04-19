import React from 'react';
import { Sparkles } from 'lucide-react';
import { GENRES } from '../data/constants';

interface GenreBarProps {
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
}

export const GenreBar: React.FC<GenreBarProps> = ({ selectedGenre, setSelectedGenre }) => {
  return (
    <section className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
      <Sparkles size={18} className="text-nebula-cyan shrink-0" />
      {GENRES.map(genre => (
        <button
          key={genre}
          onClick={() => setSelectedGenre(genre)}
          className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-all border ${
            selectedGenre === genre 
              ? 'bg-white text-obsidian border-white scale-105' 
              : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white'
          }`}
        >
          {genre}
        </button>
      ))}
    </section>
  );
};
