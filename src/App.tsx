import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

// Hooks
import { useAppState } from './hooks/useAppState';

// Components
import { TopNav } from './components/TopNav';
import { MediaPlayer } from './components/MediaPlayer';
import { MovieDetails } from './components/MovieDetails';
import { Hero } from './components/Hero';
import { SearchOverlay } from './components/SearchOverlay';
import { CategoryView } from './components/CategoryView';
import { HomeFeed } from './components/HomeFeed';

import { Routes, Route, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

export default function App() {
  const { state, actions, refs } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const isWatching = location.pathname.includes('/watch/');

  return (
    <div className="flex min-h-screen bg-obsidian font-sans overflow-x-hidden">
        {!isWatching && (
          <TopNav 
            key="layout-nav"
            activeTab={state.activeTab} onTabChange={actions.handleNavClick} scrolled={state.scrolled}
            onSearchClick={() => actions.setIsSearchOpen(true)} viewingCategory={state.viewingCategory} setViewingCategory={actions.setViewingCategory}
          />
        )}

        <main key="layout-main" className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-700 pb-24 lg:pb-0 ${state.isSearchOpen ? 'blur-2xl scale-[0.98] opacity-50' : ''}`}>
          <div className="relative z-40">
            <Routes>
              <Route path="/" element={
                 !state.viewingCategory ? (
                  <>
                    <Hero 
                      currentHeroIndex={state.currentHeroIndex} setCurrentHeroIndex={actions.setCurrentHeroIndex}
                      myList={state.myList} toggleMyList={actions.toggleMyList} startPlayback={actions.startPlayback} setSelectedMovie={actions.setSelectedMovie}
                      featuredMovies={state.featuredMovies}
                    />
                    
                    <HomeFeed 
                      sortBy={state.sortBy} setSortBy={actions.setSortBy} 
                      activeMood={state.activeMood} setActiveMood={actions.setActiveMood} 
                      selectedGenre={state.selectedGenre} setSelectedGenre={actions.setSelectedGenre}
                      setSelectedMovie={actions.setSelectedMovie} isLoading={state.isLoading}
                      filteredMovies={state.filteredMovies} recommendations={state.recommendations}
                      myList={state.myList} toggleMyList={actions.toggleMyList}
                      setViewingCategory={actions.setViewingCategory}
                      onRandomize={actions.handleRandomize}
                      rows={state.rows}
                      allMovies={state.allMovies}
                    />
                  </>
                ) : (
                  <CategoryView 
                    viewingCategory={state.viewingCategory} setViewingCategory={actions.setViewingCategory} setActiveTab={actions.setActiveTab}
                    onSelectMovie={actions.setSelectedMovie} myList={state.myList} toggleMyList={actions.toggleMyList} history={state.history}
                    startPlayback={actions.startPlayback} getCategoryMovies={actions.getCategoryMovies} visibleCount={state.visibleCount} loadMore={actions.loadMore}
                    allMovies={state.allMovies} data={state.filteredMovies} selectedRegion={state.selectedRegion} setSelectedRegion={actions.setSelectedRegion}
                  />
                )
              } />
              
              {/* Other base routes map back to Home for the 'Routed Modal' handle */}
              <Route path="/movie/:id" element={<HomeStub actions={actions} state={state} refs={refs} />} />
              <Route path="/tv/:id" element={<HomeStub actions={actions} state={state} refs={refs} />} />
              
              {/* Standalone Player Route */}
              <Route path="/watch/:type/:id" element={<MediaPlayerStub actions={actions} state={state} />} />
            </Routes>
          </div>
        </main>

      <SearchOverlay 
        isOpen={state.isSearchOpen} onClose={() => actions.setIsSearchOpen(false)} searchQuery={state.searchQuery} setSearchQuery={actions.setSearchQuery}
        searchResults={state.searchResults} onSelectMovie={actions.setSelectedMovie} searchInputRef={refs.searchInputRef}
      />

      {/* The Player and Details now render via Routes, the following are kept for backward-compat and manual transitions if needed */}

      <AnimatePresence>
        {state.selectedMovie && !isWatching && (
          <MovieDetails 
            key="movie-details-modal" movie={state.selectedMovie} onClose={() => actions.setSelectedMovie(null)} 
            onPlay={(s, e) => actions.startPlayback(state.selectedMovie, s, e)} onSelectMovie={actions.setSelectedMovie}
            isInList={state.myList.includes(state.selectedMovie.id)} onToggleList={() => actions.toggleMyList(state.selectedMovie.id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.isTransitioning && (
          <motion.div
            key="transition-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-obsidian flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-nebula-cyan/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <Loader2 size={48} className="animate-spin text-nebula-cyan relative z-10" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-white font-display font-black text-xl tracking-tighter uppercase italic">Secure Uplink</p>
              <div className="h-0.5 w-32 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="h-full w-full bg-nebula-cyan"
                />
              </div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mt-2 animate-pulse">Establishing encrypted link...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper components to bridge state and routing
function HomeStub({ actions, state, refs }: any) {
  return (
    <>
      <Hero 
        currentHeroIndex={state.currentHeroIndex} setCurrentHeroIndex={actions.setCurrentHeroIndex}
        myList={state.myList} toggleMyList={actions.toggleMyList} startPlayback={actions.startPlayback} setSelectedMovie={actions.setSelectedMovie}
        featuredMovies={state.featuredMovies}
      />
      <HomeFeed 
        sortBy={state.sortBy} setSortBy={actions.setSortBy} 
        activeMood={state.activeMood} setActiveMood={actions.setActiveMood} 
        selectedGenre={state.selectedGenre} setSelectedGenre={actions.setSelectedGenre}
        setSelectedMovie={actions.setSelectedMovie} isLoading={state.isLoading}
        filteredMovies={state.filteredMovies} recommendations={state.recommendations}
        myList={state.myList} toggleMyList={actions.toggleMyList}
        setViewingCategory={actions.setViewingCategory}
        onRandomize={actions.handleRandomize}
        rows={state.rows}
        allMovies={state.allMovies}
      />
    </>
  );
}

function MediaPlayerStub({ actions, state }: any) {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const movie = state.allMovies.find((m: any) => m.id.toString() === (id || '0').toString()) || state.selectedMovie;
  
  const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : undefined;
  const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : undefined;

  if (!movie) return <div className="h-screen flex items-center justify-center bg-obsidian text-white">Initializing Secure Stream...</div>;

  return (
    <div className="fixed inset-0 z-[1000] bg-black">
      <MediaPlayer 
        key={`player-${id}-s${season ?? 0}-e${episode ?? 0}`}
        movie={movie} 
        season={season}
        episode={episode}
        onClose={() => navigate(-1)} 
      />
    </div>
  );
}
