import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, X, ArrowRight } from 'lucide-react';
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
  isLoading?: boolean;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSelectMovie,
  searchInputRef,
  isLoading
}) => {
  
  // Auto-focus logic is handled in hook, but let's ensure it's robust
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] bg-obsidian/95 backdrop-blur-3xl flex flex-col items-center pt-[2vh] sm:pt-[10vh] overflow-y-auto custom-scrollbar"
        >
          <div className="w-full max-w-[1200px] px-4 sm:px-8 pb-32">
            {/* Search Input Area */}
            <div className="relative mb-8 sm:mb-16 group flex items-center gap-4">
              <div className="relative flex-1">
                <div className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  {isLoading ? (
                    <Loader2 size={24} className="animate-spin text-nebula-cyan" />
                  ) : (
                    <Search size={24} className="text-nebula-cyan sm:w-[32px] sm:h-[32px]" />
                  )}
                </div>
                
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border-b-2 border-white/10 py-6 sm:py-10 pl-14 sm:pl-24 pr-14 sm:pr-32 text-xl sm:text-5xl font-black placeholder:text-white/20 focus:outline-none focus:border-nebula-cyan transition-all caret-nebula-cyan uppercase tracking-tighter italic"
                />

                <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white transition-colors">
                        <X size={20} className="sm:w-6 sm:h-6" />
                    </button>
                  )}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[10px] font-black text-white/40 tracking-widest uppercase">
                    ESC
                  </div>
                </div>
              </div>

              {/* Mobile Cancel Button */}
              <button 
                onClick={onClose}
                className="sm:hidden text-nebula-cyan font-black text-[10px] uppercase tracking-[0.2em] italic pr-2"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col xl:flex-row gap-12 sm:gap-20">
              {/* Results Grid */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-8 sm:mb-10">
                  <h3 className="text-[11px] sm:text-[13px] font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-3">
                    {searchQuery ? (
                      <>
                        <span className="w-8 h-px bg-white/10" />
                        Search Results <span className="text-nebula-cyan">({searchResults.length})</span>
                      </>
                    ) : (
                      <>
                        <span className="w-8 h-px bg-white/10" />
                        Awaiting Signal
                      </>
                    )}
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {searchQuery && searchResults.length > 0 ? (
                    searchResults.map((movie, i) => (
                      <motion.div 
                        key={`search-res-${movie.id}-${i}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                          onSelectMovie(movie);
                          onClose();
                        }}
                        className="group cursor-pointer"
                      >
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:border-nebula-cyan/50">
                          <img 
                            src={movie.image} 
                            alt={movie.title}
                            className="w-full h-full object-cover transition-all duration-700 group-hover:blur-[2px] group-hover:scale-110" 
                            referrerPolicy="no-referrer" 
                            onError={handleImageError} 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                          
                          {/* Hover Info Overlay */}
                          <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tighter line-clamp-2 mb-2 italic">{movie.title}</h4>
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-bold text-nebula-cyan border border-nebula-cyan/30 px-1.5 py-0.5 rounded uppercase">{movie.type}</span>
                               <span className="text-[9px] font-bold text-white/60">{movie.year}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : searchQuery && !isLoading ? (
                    <div className="col-span-full py-20 flex flex-col items-center">
                       <div className="relative mb-8">
                         <div className="absolute inset-0 bg-nebula-red/20 blur-3xl rounded-full scale-150 animate-pulse" />
                         <Search size={64} className="text-white/10 relative z-10" />
                       </div>
                       <h4 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-2">No Transmission Found</h4>
                       <p className="text-white/40 text-sm font-medium tracking-wide">The Nebula signal could not locate "{searchQuery}"</p>
                    </div>
                  ) : !searchQuery && (
                    <div className="col-span-full py-24 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-6">
                       <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                          <Search size={32} />
                       </div>
                       <div className="text-center">
                         <h4 className="text-lg font-black text-white/30 uppercase tracking-[0.2em] mb-2">Enter Navigation Coordinates</h4>
                         <p className="text-white/10 text-xs uppercase tracking-widest">Search for movies, TV series, or actors</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar: Top Searches */}
              <div className="w-full xl:w-[280px] shrink-0">
                <div className="sticky top-10">
                  <h3 className="text-[11px] sm:text-[13px] font-black text-white/40 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                    <span className="w-8 h-px bg-white/10" />
                    Top Missions
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                    {topSearches.map((term, i) => (
                      <button 
                        key={`top-search-${i}`}
                        onClick={() => setSearchQuery(term)}
                        className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-nebula-cyan/30 hover:bg-white/10 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-display font-black text-white/10 group-hover:text-nebula-cyan/50 transition-colors">0{i + 1}</span>
                          <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors uppercase tracking-tight italic">{term}</span>
                        </div>
                        <ArrowRight size={16} className="text-white/0 group-hover:text-nebula-cyan transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
