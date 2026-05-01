import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2 } from "lucide-react";

// Hooks
import { useAppState } from "./hooks/useAppState";

// Components
import { TopNav } from "./components/TopNav";
import { MediaPlayer } from "./components/MediaPlayer";
import { MovieDetails } from "./components/MovieDetails";
import { Hero } from "./components/Hero";
import { SearchOverlay } from "./components/SearchOverlay";
import { CategoryView } from "./components/CategoryView";
import { HomeFeed } from "./components/HomeFeed";
import { NotFound } from "./components/NotFound";

import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

export default function App() {
  const { state, actions, refs } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const isWatching = location.pathname.includes("/watch/");

  // Force portrait mode globally unless watching a video
  React.useEffect(() => {
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    if (
      isMobile &&
      window.screen &&
      window.screen.orientation &&
      (window.screen.orientation as any).lock
    ) {
      if (!isWatching) {
        (window.screen.orientation as any).lock("portrait").catch((e: any) => {
          // Ignore: Some browsers require fullscreen to lock orientation, or user interaction
          console.warn("Could not lock to portrait:", e);
        });
      }
    }
  }, [isWatching]);

  return (
    <div className="flex min-h-screen bg-obsidian font-sans overflow-x-hidden">
      {!isWatching && (
        <TopNav
          key="layout-nav"
          activeTab={state.activeTab}
          onTabChange={actions.handleNavClick}
          scrolled={state.scrolled}
          onSearchClick={() => actions.setIsSearchOpen(true)}
          viewingCategory={state.viewingCategory}
          setViewingCategory={actions.setViewingCategory}
        />
      )}

      <main
        key="layout-main"
        className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-700 pb-24 lg:pb-0 ${state.isSearchOpen ? "blur-2xl scale-[0.98] opacity-50" : ""}`}
      >
        {/* ── System Banner ── */}
        {!isWatching && (
          <div className="relative z-[60] mt-[64px] md:mt-[76px] bg-nebula-cyan/5 border-b border-nebula-cyan/10 px-4 py-2.5 flex items-center justify-center gap-3 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-nebula-cyan animate-pulse shadow-[0_0_10px_#00f3ff]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
              <span className="text-nebula-cyan/80">Transmission:</span> Secure
              streams require 5-10s for manifest decryption & rewriting.
            </p>
          </div>
        )}

        <div className="relative z-40">
          <Routes>
            <Route
              path="/"
              element={
                !state.viewingCategory ? (
                  <>
                    <Hero
                      currentHeroIndex={state.currentHeroIndex}
                      setCurrentHeroIndex={actions.setCurrentHeroIndex}
                      myList={state.myList}
                      toggleMyList={actions.toggleMyList}
                      startPlayback={actions.startPlayback}
                      setSelectedMovie={actions.setSelectedMovie}
                      featuredMovies={state.featuredMovies}
                    />

                    <HomeFeed
                      sortBy={state.sortBy}
                      setSortBy={actions.setSortBy}
                      activeMood={state.activeMood}
                      setActiveMood={actions.setActiveMood}
                      selectedGenre={state.selectedGenre}
                      setSelectedGenre={actions.setSelectedGenre}
                      setSelectedMovie={actions.setSelectedMovie}
                      isLoading={state.isLoading}
                      filteredMovies={state.filteredMovies}
                      recommendations={state.recommendations}
                      myList={state.myList}
                      toggleMyList={actions.toggleMyList}
                      setViewingCategory={actions.setViewingCategory}
                      onRandomize={actions.handleRandomize}
                      rows={state.rows}
                      allMovies={state.allMovies}
                      removeFromHistory={actions.removeFromHistory}
                      removeFromProgress={actions.removeFromProgress}
                    />
                  </>
                ) : (
                  <CategoryView
                    viewingCategory={state.viewingCategory}
                    setViewingCategory={actions.setViewingCategory}
                    setActiveTab={actions.setActiveTab}
                    onSelectMovie={actions.setSelectedMovie}
                    myList={state.myList}
                    toggleMyList={actions.toggleMyList}
                    history={state.history}
                    startPlayback={actions.startPlayback}
                    getCategoryMovies={actions.getCategoryMovies}
                    visibleCount={state.visibleCount}
                    loadMore={actions.loadMore}
                    allMovies={state.allMovies}
                    data={state.filteredMovies}
                    selectedRegion={state.selectedRegion}
                    setSelectedRegion={actions.setSelectedRegion}
                    removeFromHistory={actions.removeFromHistory}
                    removeFromProgress={actions.removeFromProgress}
                    clearHistory={actions.clearHistory}
                    clearMyList={actions.clearMyList}
                    isLoading={state.isLoading}
                  />
                )
              }
            />

            {/* Other base routes map back to Home for the 'Routed Modal' handle */}
            <Route
              path="/movie/:id"
              element={<HomeStub actions={actions} state={state} refs={refs} />}
            />
            <Route
              path="/tv/:id"
              element={<HomeStub actions={actions} state={state} refs={refs} />}
            />

            {/* Standalone Player Route */}
            <Route
              path="/watch/:type/:id"
              element={<MediaPlayerStub actions={actions} state={state} />}
            />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>

      <SearchOverlay
        isOpen={state.isSearchOpen}
        onClose={() => actions.setIsSearchOpen(false)}
        searchQuery={state.searchQuery}
        setSearchQuery={actions.setSearchQuery}
        searchResults={state.searchResults}
        onSelectMovie={actions.setSelectedMovie}
        searchInputRef={refs.searchInputRef}
        isLoading={state.isLoading}
      />

      {/* The Player and Details now render via Routes, the following are kept for backward-compat and manual transitions if needed */}

      <AnimatePresence>
        {state.selectedMovie && !isWatching && (
          <MovieDetails
            key="movie-details-modal"
            movie={state.selectedMovie}
            onClose={() => actions.setSelectedMovie(null)}
            onPlay={(s, e) => actions.startPlayback(state.selectedMovie, s, e)}
            onSelectMovie={actions.setSelectedMovie}
            isInList={state.myList.includes(state.selectedMovie.id)}
            onToggleList={() => actions.toggleMyList(state.selectedMovie.id)}
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
              <Loader2
                size={48}
                className="animate-spin text-nebula-cyan relative z-10"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-white font-display font-black text-xl tracking-tighter uppercase italic">
                Secure Uplink
              </p>
              <div className="h-0.5 w-32 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                  }}
                  className="h-full w-full bg-nebula-cyan"
                />
              </div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mt-2 animate-pulse">
                Establishing encrypted link...
              </p>
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
        currentHeroIndex={state.currentHeroIndex}
        setCurrentHeroIndex={actions.setCurrentHeroIndex}
        myList={state.myList}
        toggleMyList={actions.toggleMyList}
        startPlayback={actions.startPlayback}
        setSelectedMovie={actions.setSelectedMovie}
        featuredMovies={state.featuredMovies}
      />
      <HomeFeed
        sortBy={state.sortBy}
        setSortBy={actions.setSortBy}
        activeMood={state.activeMood}
        setActiveMood={actions.setActiveMood}
        selectedGenre={state.selectedGenre}
        setSelectedGenre={actions.setSelectedGenre}
        setSelectedMovie={actions.setSelectedMovie}
        isLoading={state.isLoading}
        filteredMovies={state.filteredMovies}
        recommendations={state.recommendations}
        myList={state.myList}
        toggleMyList={actions.toggleMyList}
        setViewingCategory={actions.setViewingCategory}
        onRandomize={actions.handleRandomize}
        rows={state.rows}
        allMovies={state.allMovies}
        removeFromHistory={actions.removeFromHistory}
        removeFromProgress={actions.removeFromProgress}
      />
    </>
  );
}

function MediaPlayerStub({ actions, state }: any) {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const movie =
    state.allMovies.find(
      (m: any) => m.id.toString() === (id || "0").toString(),
    ) || state.selectedMovie;

  const season = searchParams.get("season")
    ? parseInt(searchParams.get("season")!)
    : undefined;
  const episode = searchParams.get("episode")
    ? parseInt(searchParams.get("episode")!)
    : undefined;

  // While the global catalog is still loading, show a themed skeleton
  // permanently render the error state for a movie that simply isn't fetched yet.
  if (!movie && state.isLoading) {
    return (
      <div className="h-screen bg-obsidian flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-white/5 rounded-lg shimmer-bg" />
            <div className="h-4 w-1/2 bg-white/5 rounded-md shimmer-bg opacity-50" />
          </div>
          <div className="aspect-video w-full bg-white/5 rounded-2xl shimmer-bg border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-t-2 border-nebula-cyan/50 rounded-full animate-spin" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-full bg-white/5 rounded shimmer-bg opacity-30" />
            <div className="h-3 w-5/6 bg-white/5 rounded shimmer-bg opacity-20" />
            <div className="h-3 w-4/6 bg-white/5 rounded shimmer-bg opacity-10" />
          </div>
        </div>
      </div>
    );
  }

  // Data has fully loaded but this ID isn't in the catalog (deleted, invalid, etc.)
  if (!movie) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-obsidian text-white gap-6 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
          <span className="text-red-400 text-2xl">!</span>
        </div>
        <div>
          <h2 className="text-lg font-black uppercase tracking-tighter text-white mb-1">
            Stream Not Found
          </h2>
          <p className="text-white/40 text-sm">
            This title couldn't be located in the catalog.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3 bg-nebula-cyan text-obsidian rounded-full text-[10px] uppercase font-black tracking-[0.2em] hover:bg-white transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

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
