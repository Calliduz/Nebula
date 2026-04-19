import React from 'react';
import { ALL_MOVIES } from '../data/movies';
import { handleImageError } from '../utils/helpers';

export const TopTenShelf = ({ onSelect }: { onSelect: (m: any) => void }) => {
  const topMovies = ALL_MOVIES.slice(0, 5);
  return (
    <section className="mb-20">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-3xl font-display font-black uppercase tracking-tighter">Top 5 Records</h3>
        <div className="h-px flex-1 mx-8 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="flex gap-12 sm:gap-16 overflow-x-auto py-10 -my-10 custom-scrollbar pb-2 px-2 sm:px-4 snap-x snap-mandatory">
        {topMovies.map((movie, i) => (
          <div 
            key={`top-shelf-${movie.id}-${i}`} 
            className="flex-shrink-0 flex items-center group cursor-pointer snap-start relative"
            onClick={() => onSelect(movie)}
          >
            <span className="text-[140px] sm:text-[200px] leading-[0.8] font-display font-black text-transparent stroke-white/20 transition-all duration-500 group-hover:stroke-nebula-cyan group-hover:-translate-x-4 mix-blend-difference z-20" style={{ WebkitTextStroke: '2px currentColor', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              {i + 1}
            </span>
            <div className="w-[120px] sm:w-[180px] aspect-[2/3] -ml-[60px] sm:-ml-[90px] rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:scale-110 group-hover:border-nebula-cyan/50 group-hover:shadow-[0_20px_60px_rgba(0,229,255,0.2)] group-hover:z-30 z-10 origin-left relative">
              <img src={movie.poster} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={movie.title} referrerPolicy="no-referrer" onError={handleImageError} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
