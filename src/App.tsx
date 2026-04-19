import React from 'react';
import { AnimatePresence } from 'motion/react';

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

import { Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';

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
        {state.selectedMovie && (
          <MovieDetails 
            key="movie-details-modal" movie={state.selectedMovie} onClose={() => actions.setSelectedMovie(null)} 
            onPlay={() => actions.startPlayback(state.selectedMovie)} onSelectMovie={actions.setSelectedMovie}
            isInList={state.myList.includes(state.selectedMovie.id)} onToggleList={() => actions.toggleMyList(state.selectedMovie.id)}
          />
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
  const navigate = useNavigate();
  const movie = state.allMovies.find((m: any) => m.id === parseInt(id || '0')) || state.selectedMovie;

  if (!movie) return <div className="h-screen flex items-center justify-center bg-obsidian text-white">Initializing Secure Stream...</div>;

  return (
    <div className="fixed inset-0 z-[1000] bg-black">
      <MediaPlayer 
        movie={movie} 
        onClose={() => navigate(-1)} 
      />
    </div>
  );
}
