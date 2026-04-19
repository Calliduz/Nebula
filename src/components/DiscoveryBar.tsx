import React from 'react';
import { History, ChevronDown, Dices } from 'lucide-react';
import { MOODS, SORTS } from '../data/constants';

export const DiscoveryBar = ({ sortBy, setSortBy, activeMood, setActiveMood, onRandomize }: any) => {
  return (
    <section className="mb-4 sm:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {MOODS.map(mood => (
          <button
            key={mood}
            onClick={() => setActiveMood(mood)}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeMood === mood 
              ? 'bg-nebula-cyan text-obsidian' 
              : 'bg-white/5 text-dim hover:text-white hover:bg-white/10'
            }`}
          >
            {mood}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 w-full md:w-auto">
        <div className="relative group flex-1 md:flex-none">
          <button className="w-full flex items-center justify-between sm:justify-start gap-3 px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-dim group-hover:text-white transition-all">
            <div className="flex items-center gap-2">
              <History size={14} className="text-nebula-cyan shrink-0" />
              <span className="truncate">Sort: {sortBy}</span>
            </div>
            <ChevronDown size={14} className="shrink-0" />
          </button>
          
          <div className="absolute top-full right-0 mt-2 w-full sm:w-48 bg-obsidian border border-white/10 rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
            {SORTS.map(sort => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className="w-full px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors text-dim hover:text-nebula-cyan"
              >
                {sort}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={onRandomize}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-nebula-cyan/10 border border-nebula-cyan/30 text-nebula-cyan text-[8px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-nebula-cyan hover:text-obsidian transition-all flex-1 md:flex-none"
        >
          <Dices size={14} className="shrink-0" />
          <span className="truncate">Randomizer</span>
        </button>
      </div>
    </section>
  );
};
