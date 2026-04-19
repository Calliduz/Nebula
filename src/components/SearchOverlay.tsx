import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search } from 'lucide-react';
import { ALL_MOVIES } from '../data/movies';
import { topSearches } from '../data/constants';
import { handleImageError } from '../utils/helpers';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: any[];
  onSelectMovie: (movie: any) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSelectMovie,
  searchInputRef
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-obsidian/80 backdrop-blur-[40px] flex flex-col items-center pt-[5vh] sm:pt-[10vh] overflow-y-auto custom-scrollbar"
        >
          <div className="w-full max-w-[900px] px-4 sm:px-6 pb-32">
            <div className="relative mb-8 sm:mb-12">
              <Search size={24} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-nebula-cyan sm:w-[28px] sm:h-[28px]" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Search for movies, actors, or genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 sm:py-6 pl-12 sm:pl-20 pr-16 sm:pr-24 text-lg sm:text-2xl font-light placeholder:text-dim focus:outline-none focus:border-nebula-cyan/50 transition-all caret-nebula-cyan shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              />
              <button 
                onClick={onClose}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 px-2 sm:px-3 py-1 bg-white/10 rounded border border-white/10 text-[8px] sm:text-[10px] uppercase font-bold text-dim hover:text-white transition-colors flex items-center justify-center shrink-0"
              >
                ESC
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
              <div className="flex-1">
                <h3 className="text-[12px] font-bold text-dim uppercase tracking-[0.2em] mb-8">
                  {searchQuery ? `Instant Results (${searchResults.length})` : 'Type to start Mission Search'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {searchQuery && searchResults.length > 0 ? (
                    searchResults.map((movie, i) => (
                      <motion.div 
                        key={`search-res-${movie.id}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          onSelectMovie(movie);
                          onClose();
                        }}
                        className="flex gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-all"
                      >
                        <div className="w-20 aspect-[2/3] rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                          <img src={movie.poster} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" onError={handleImageError} />
                        </div>
                        <div className="py-2">
                           <h4 className="font-bold text-white group-hover:text-nebula-cyan transition-colors">{movie.title}</h4>
                           <p className="text-[10px] text-dim uppercase mt-1 tracking-widest">{movie.genre}</p>
                           <div className="flex items-center gap-2 mt-2">
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] border border-white/10 text-white/50">{movie.quality}</span>
                              <span className="text-[10px] text-nebula-cyan font-bold leading-none">{movie.rating}</span>
                           </div>
                        </div>
                      </motion.div>
                    ))
                  ) : searchQuery ? (
                    <div className="col-span-2 py-20 text-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-dim opacity-30">
                         <Search size={32} />
                      </div>
                      <h4 className="text-xl font-bold mb-2">No data streams found</h4>
                      <p className="text-dim font-light">Try searching for generic terms like "Sci-Fi" or "Nova".</p>
                    </div>
                  ) : (
                    <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                      <p className="text-dim italic font-light">The Nebula library is vast... start your query.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-[200px] border-t lg:border-t-0 lg:border-l border-white/5 pt-8 lg:pt-0 lg:pl-12">
                <h3 className="text-[12px] font-bold text-dim uppercase tracking-[0.2em] mb-8">Top Searches</h3>
                <div className="flex flex-row overflow-x-auto lg:flex-col gap-6 hide-scrollbar">
                  {topSearches.map((term, i) => (
                    <div 
                      key={`search-term-${i}-${term}`} 
                      onClick={() => setSearchQuery(term)}
                      className="flex gap-4 items-center group cursor-pointer whitespace-nowrap lg:whitespace-normal"
                    >
                       <span className="text-2xl font-display font-light text-white/10 group-hover:text-nebula-cyan/30 transition-colors">0{i+1}</span>
                       <span className="text-[13px] font-bold text-white/70 group-hover:text-white transition-colors leading-tight">{term}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
