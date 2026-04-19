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

export default function App() {
  const { state, actions, refs } = useAppState();

  return (
    <div className="flex min-h-screen bg-obsidian font-sans overflow-x-hidden">
      <AnimatePresence>
        <TopNav 
          activeTab={state.activeTab} onTabChange={actions.handleNavClick} scrolled={state.scrolled}
          onSearchClick={() => actions.setIsSearchOpen(true)} viewingCategory={state.viewingCategory} setViewingCategory={actions.setViewingCategory}
        />

        <main className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-700 pb-24 lg:pb-0 ${state.isSearchOpen ? 'blur-2xl scale-[0.98] opacity-50' : ''}`}>
          <div className="relative z-40">
            {!state.viewingCategory ? (
              <>
                <Hero 
                  currentHeroIndex={state.currentHeroIndex} setCurrentHeroIndex={actions.setCurrentHeroIndex} heroParallax={state.heroParallax}
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
                />
              </>
            ) : (
              <CategoryView 
                viewingCategory={state.viewingCategory} setViewingCategory={actions.setViewingCategory} setActiveTab={actions.setActiveTab}
                onSelectMovie={actions.setSelectedMovie} myList={state.myList} toggleMyList={actions.toggleMyList} history={state.history}
                startPlayback={actions.startPlayback} getCategoryMovies={actions.getCategoryMovies} visibleCount={state.visibleCount} loadMore={actions.loadMore}
              />
            )}
          </div>
        </main>
      </AnimatePresence>

      <SearchOverlay 
        isOpen={state.isSearchOpen} onClose={() => actions.setIsSearchOpen(false)} searchQuery={state.searchQuery} setSearchQuery={actions.setSearchQuery}
        searchResults={state.searchResults} onSelectMovie={actions.setSelectedMovie} searchInputRef={refs.searchInputRef}
      />

      <AnimatePresence>
        {state.isPlaying && (
          <MediaPlayer 
            key="media-player" movie={state.selectedMovie || state.featuredMovies[state.currentHeroIndex]} 
            onClose={() => actions.setIsPlaying(false)} 
          />
        )}
      </AnimatePresence>

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
