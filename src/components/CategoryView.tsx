import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Search, Plus } from 'lucide-react';
import { MovieCard } from './MovieCard';

interface CategoryViewProps {
  viewingCategory: string;
  setViewingCategory: (category: string | null) => void;
  setActiveTab: (tab: string) => void;
  onSelectMovie: (movie: any) => void;
  myList: number[];
  toggleMyList: (id: number) => void;
  history: number[];
  startPlayback: (movie: any) => void;
  getCategoryMovies: () => any[];
  visibleCount: number;
  loadMore: () => void;
  allMovies: any[];
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  viewingCategory,
  setViewingCategory,
  setActiveTab,
  onSelectMovie,
  myList,
  toggleMyList,
  history,
  startPlayback,
  getCategoryMovies,
  visibleCount,
  loadMore,
  allMovies
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen pt-32 px-4 sm:px-6 md:px-12 pb-32"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <button 
            onClick={() => { setActiveTab('home'); setViewingCategory(null); }}
            className="flex items-center gap-2 text-nebula-cyan hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black tracking-widest uppercase">Back to Command Center</span>
          </button>
          <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter uppercase">{viewingCategory}</h2>
        </div>
        
        {viewingCategory === 'Trending Operations' && (
          <div className="px-4 py-2 rounded-full bg-nebula-cyan/10 border border-nebula-cyan/30 text-nebula-cyan text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
            Live Signal Feed
          </div>
        )}
      </div>
      
      {viewingCategory === 'Library' ? (
        <div className="space-y-16">
          <section>
             <h3 className="text-2xl font-display font-medium tracking-tight text-white mb-8">My Secure Records</h3>
             {myList.length > 0 ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
                 {allMovies.filter(m => myList.includes(m.id)).map((movie, i) => (
                     <MovieCard key={`lib-my-${movie.id}-${i}`} movie={movie} onSelect={onSelectMovie} isInList={true} onToggleList={() => toggleMyList(movie.id)} />
                 ))}
               </div>
             ) : (
               <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                 <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                    <Plus className="text-dim" size={32} />
                 </div>
                 <h3 className="text-2xl font-bold mb-4">Your registry is empty</h3>
                 <p className="text-dim max-w-md mx-auto font-light">Add missions to your list for quick access during deep-space operation.</p>
               </div>
             )}
          </section>
          
          <section>
             <h3 className="text-2xl font-display font-medium tracking-tight text-white mb-8">Operational History</h3>
             {history.length > 0 ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
                 {history.slice().reverse().map(id => allMovies.find(m => m.id === id)).filter(Boolean).map((movie: any, i) => (
                   <div key={`lib-hist-${movie.id}-${i}`} className="relative group">
                     <MovieCard movie={movie} onSelect={onSelectMovie} isInList={myList.includes(movie.id)} onToggleList={() => toggleMyList(movie.id)} />
                     <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => startPlayback(movie)} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center pointer-events-auto border border-white/50 hover:bg-white hover:text-black transition-colors pl-1">
                         <Play size={20} fill="currentColor" />
                       </button>
                     </div>
                     <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-40 rounded-b-2xl overflow-hidden pointer-events-none">
                       <div className="h-full bg-nebula-cyan w-3/4" />
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                 <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                    <Search className="text-dim" size={32} />
                 </div>
                 <h3 className="text-2xl font-bold mb-4">No operations history</h3>
                 <p className="text-dim max-w-md mx-auto font-light">Missions you play will be recorded here.</p>
               </div>
             )}
          </section>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 md:gap-x-6 gap-y-12">
            {getCategoryMovies().slice(0, visibleCount).map((movie, i) => (
              <MovieCard key={`cat-grid-${viewingCategory}-${movie.id}-${i}`} movie={movie} onSelect={onSelectMovie} isInList={myList.includes(movie.id)} onToggleList={() => toggleMyList(movie.id)} />
            ))}
          </div>
          {getCategoryMovies().length > visibleCount && (
            <div className="mt-16 flex justify-center">
              <button 
                onClick={loadMore}
                className="px-8 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] uppercase font-bold tracking-[0.2em] transition-all group"
              >
                <span className="group-hover:text-nebula-cyan transition-colors">Decrypt More Records</span>
              </button>
            </div>
          )}
        </>
      )}

      {viewingCategory === 'Trending Operations' && visibleCount >= getCategoryMovies().length && (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-nebula-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dim text-sm font-light">Decrypting more data streams from the fringe...</p>
        </div>
      )}
    </motion.div>
  );
};
