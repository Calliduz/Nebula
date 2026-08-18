import React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Loader2,
  X,
  Calendar,
  MapPin,
  User,
  Film,
  Clapperboard,
} from "lucide-react";

// Hooks
import { useAppState } from "./hooks/useAppState";
import { triggerPopunder } from "./utils/helpers";

// Components
import { TopNav } from "./components/TopNav";
import { Hero } from "./components/Hero";
import { HomeFeed } from "./components/HomeFeed";
import { ScrollToTop } from "./components/ScrollToTop";
import { Footer } from "./components/Footer";
import { MovieDetailsSkeleton } from "./components/MovieDetailsSkeleton";
import { MovieSkeleton } from "./components/MovieSkeleton";
import { DiscordInvite } from "./components/DiscordInvite";
import { AdminDashboard } from "./components/AdminDashboard";

// Auto-retrying lazy loader to handle new production deployments gracefully when chunk hashes change
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  React.lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem("nebula-lazy-refreshed") || "false",
    );

    try {
      const component = await componentImport();
      window.sessionStorage.removeItem("nebula-lazy-refreshed");
      return component;
    } catch (error: any) {
      if (!pageHasBeenRefreshed) {
        window.sessionStorage.setItem("nebula-lazy-refreshed", "true");
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

const MediaPlayer = lazyWithRetry(() =>
  import("./components/MediaPlayer").then((module) => ({
    default: module.MediaPlayer,
  })),
);
const MovieDetails = lazyWithRetry(() =>
  import("./components/MovieDetails").then((module) => ({
    default: module.MovieDetails,
  })),
);
const SourceSelectionModal = lazyWithRetry(() =>
  import("./components/MovieDetails").then((module) => ({
    default: module.SourceSelectionModal,
  })),
);
const SearchOverlay = lazyWithRetry(() =>
  import("./components/SearchOverlay").then((module) => ({
    default: module.SearchOverlay,
  })),
);
const CategoryView = lazyWithRetry(() =>
  import("./components/CategoryView").then((module) => ({
    default: module.CategoryView,
  })),
);
const PeopleView = lazyWithRetry(() =>
  import("./components/PeopleView").then((module) => ({
    default: module.PeopleView,
  })),
);
const NotFound = lazyWithRetry(() =>
  import("./components/NotFound").then((module) => ({
    default: module.NotFound,
  })),
);

import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  getMediaBasicInfo,
  getPersonDetails,
  enrichMoviesWithMetadata,
} from "./services/tmdb";
import { handleImageError } from "./utils/helpers";

export default function App() {
  const { state, actions, refs } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const isWatching = location.pathname.includes("/watch/");
  const isDetailPage = /^\/(movie|tv)\/\d+/.test(location.pathname);

  const [selectedMovieForSource, setSelectedMovieForSource] = React.useState<
    any | null
  >(null);
  const [selectedEpForSource, setSelectedEpForSource] = React.useState<{
    season?: number;
    episode?: number;
  } | null>(null);
  const [selectedActorId, setSelectedActorId] = React.useState<
    string | number | null
  >(null);
  const [isAdminOpen, setIsAdminOpen] = React.useState(false);

  // Detect /admin URL route
  React.useEffect(() => {
    if (location.pathname === "/admin") {
      setIsAdminOpen(true);
    }
  }, [location.pathname]);

  // Global Ctrl + Shift + A shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "A" || e.key === "a")
      ) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenSearch = React.useCallback(() => {
    actions.setIsSearchOpen(true);
  }, [actions]);

  const handleHeroPlay = React.useCallback((movie: any) => {
    triggerPopunder();
    const p = JSON.parse(localStorage.getItem("nebula-progress") || "{}");
    const key = movie.id.toString();

    let season: number | undefined = undefined;
    let episode: number | undefined = undefined;

    if (movie.type === "tv") {
      // Collect all episode progress entries for this show, pick latest by timestamp
      const tvEntries = Object.entries(p)
        .filter(([k]) => k === key || k.startsWith(`${key}-S`))
        .map(([k, val]: [string, any]) => {
          const tvMatch = k.match(/-S(\d+)E(\d+)/);
          return tvMatch
            ? {
                season: parseInt(tvMatch[1]),
                episode: parseInt(tvMatch[2]),
                ...val,
              }
            : null;
        })
        .filter(Boolean) as any[];

      if (tvEntries.length > 0) {
        tvEntries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
        const latest = tvEntries[0];
        const pct =
          latest.duration > 0 ? (latest.time / latest.duration) * 100 : 0;
        if (latest.watched || pct >= 90) {
          // Nearly done — jump to next episode
          season = latest.season;
          episode = latest.episode + 1;
        } else {
          season = latest.season;
          episode = latest.episode;
        }
      } else {
        // Never watched — start from S1E1
        season = 1;
        episode = 1;
      }
    }
    setSelectedMovieForSource(movie);
    setSelectedEpForSource({ season, episode });
  }, []);

  // Force portrait mode globally unless watching a video
  // Debounced to avoid racing with MediaPlayer's cleanup orientation calls,
  // re-runs on every navigation so the lock is re-acquired after page transitions.
  React.useEffect(() => {
    if (isWatching) return;

    const isMobile =
      ("ontouchstart" in window || navigator.maxTouchPoints > 0) &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (
      !isMobile ||
      !window.screen?.orientation ||
      !(window.screen.orientation as any).lock
    )
      return;

    // Debounce: let MediaPlayer's cleanup finish first
    const timer = setTimeout(() => {
      // Don't fight with fullscreen landscape lock
      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      )
        return;

      (window.screen.orientation as any).lock("portrait").catch((e: any) => {
        // Ignore: Some browsers require fullscreen to lock orientation, or user interaction
        console.warn("Could not lock to portrait:", e);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [isWatching, location.pathname]);

  return (
    <div className="flex min-h-screen bg-obsidian font-sans overflow-x-hidden">
      {!isWatching && !isDetailPage && (
        <TopNav
          key="layout-nav"
          activeTab={state.activeTab}
          onTabChange={actions.handleNavClick}
          scrolled={state.scrolled}
          onSearchClick={handleOpenSearch}
          viewingCategory={state.viewingCategory}
          setViewingCategory={actions.setViewingCategory}
        />
      )}

      <main
        key="layout-main"
        id="main-scroller"
        className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-500 pb-24 lg:pb-0 ${state.isSearchOpen ? "opacity-30 scale-[0.99] pointer-events-none transform-gpu" : ""}`}
      >
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
                      startPlayback={handleHeroPlay}
                      setSelectedMovie={actions.setSelectedMovie}
                      featuredMovies={state.featuredMovies}
                    />

                    <HomeFeed
                      sortBy={state.sortBy}
                      setSortBy={actions.setSortBy}
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
                      onRefreshFeed={actions.refreshFeed}
                      rows={state.rows}
                      allMovies={state.allMovies}
                      topTenMovies={state.topTenMovies}
                      removeFromHistory={actions.removeFromHistory}
                      removeFromProgress={actions.removeFromProgress}
                      fetchRowData={actions.fetchRowData}
                      adultMode={state.adultMode}
                      setAdultMode={actions.setAdultMode}
                      onSelectActor={setSelectedActorId}
                    />
                  </>
                ) : state.viewingCategory === "People" ? (
                  <React.Suspense
                    fallback={
                      <div className="min-h-screen bg-obsidian pt-16 sm:pt-24 md:pt-28 px-3.5 sm:px-6 md:px-12 pb-24 sm:pb-32">
                        <div className="h-8 w-40 bg-white/5 rounded-lg mb-6 shimmer-bg" />
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-8 gap-2.5 sm:gap-3.5">
                          {[...Array(24)].map((_, i) => (
                            <div
                              key={`person-skel-main-${i}`}
                              className="aspect-[2/3] rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/5 p-2 sm:p-3 flex flex-col justify-end gap-1 sm:gap-1.5 animate-pulse overflow-hidden relative"
                            >
                              <div className="absolute inset-0 shimmer-bg opacity-30" />
                              <div className="h-3 sm:h-4 w-3/4 bg-white/10 rounded shimmer-bg relative z-10" />
                              <div className="h-2 sm:h-3 w-1/2 bg-white/10 rounded shimmer-bg relative z-10 opacity-60" />
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                  >
                    <PeopleView
                      onClose={() => actions.setViewingCategory(null)}
                      onSelectActor={setSelectedActorId}
                      onSelectMovie={actions.setSelectedMovie}
                    />
                  </React.Suspense>
                ) : (
                  <React.Suspense
                    fallback={
                      <div className="min-h-screen bg-obsidian pt-24 sm:pt-28 md:pt-32 px-4 sm:px-6 md:px-12 pb-32">
                        <div className="h-10 w-48 bg-white/5 rounded-lg mb-12 shimmer-bg" />
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-x-2.5 sm:gap-x-6 gap-y-6 sm:gap-y-12">
                          {[...Array(18)].map((_, i) => (
                            <MovieSkeleton
                              key={`cat-fallback-sk-${i}`}
                              isGrid={true}
                            />
                          ))}
                        </div>
                      </div>
                    }
                  >
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
                  </React.Suspense>
                )
              }
            />

            {/* /people standalone route */}
            <Route
              path="/people"
              element={
                <PeoplePageStub
                  actions={actions}
                  onSelectActor={setSelectedActorId}
                />
              }
            />

            {/* /movie/:id and /tv/:id render MovieDetails as a first-class page
                so that direct URL navigation (paste/refresh) works. */}
            <Route
              path="/movie/:id"
              element={
                <MovieDetailPageStub
                  actions={actions}
                  state={state}
                  onSelectActor={setSelectedActorId}
                />
              }
            />
            <Route
              path="/tv/:id"
              element={
                <MovieDetailPageStub
                  actions={actions}
                  state={state}
                  onSelectActor={setSelectedActorId}
                />
              }
            />

            {/* Standalone Player Route */}
            <Route
              path="/watch/:type/:id"
              element={<MediaPlayerStub actions={actions} state={state} />}
            />

            {/* Direct Admin Dashboard Route */}
            <Route path="/admin" element={null} />

            {/* Catch-all 404 */}
            <Route
              path="*"
              element={
                <React.Suspense fallback={null}>
                  <NotFound />
                </React.Suspense>
              }
            />
          </Routes>
        </div>

        {/* Footer — hidden on the watch page and detail pages */}
        {!isWatching && !isDetailPage && <Footer />}
      </main>

      {/* Scroll-to-top button for homepage and category view */}
      {!state.isSearchOpen && <ScrollToTop />}

      {/* Discord Server Invite floating card */}
      {!isWatching && <DiscordInvite />}

      {/* Admin Analytics & System Health Modal */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          if (location.pathname === "/admin") {
            navigate("/");
          }
        }}
      />

      <React.Suspense fallback={null}>
        <SearchOverlay
          isOpen={state.isSearchOpen}
          onClose={() => actions.setIsSearchOpen(false)}
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          searchResults={state.searchResults}
          searchPeopleResults={state.searchPeopleResults}
          onSelectMovie={actions.setSelectedMovie}
          onSelectActor={setSelectedActorId}
          searchInputRef={refs.searchInputRef}
          isLoading={state.isLoading}
        />
      </React.Suspense>

      {/* The Player and Details now render via Routes, the following are kept for backward-compat and manual transitions if needed */}

      {/* Modal variant: shown when a card is clicked anywhere in the app */}
      {state.selectedMovie && !isWatching && (
        <React.Suspense
          fallback={
            <MovieDetailsSkeleton
              onClose={() => actions.setSelectedMovie(null)}
            />
          }
        >
          <MovieDetails
            key={`movie-details-${state.selectedMovie.id}`}
            movie={state.selectedMovie}
            onClose={() => actions.setSelectedMovie(null)}
            onPlay={(s, e, src, loadedMovie) =>
              actions.startPlayback(
                loadedMovie || state.selectedMovie,
                s,
                e,
                src,
              )
            }
            onSelectMovie={actions.setSelectedMovie}
            onSelectActor={setSelectedActorId}
            isInList={state.myList.some((item: any) => {
              const id =
                typeof item === "object" && item !== null ? item.id : item;
              const type =
                typeof item === "object" && item !== null ? item.type : "movie";
              return (
                id.toString() === state.selectedMovie.id.toString() &&
                type === (state.selectedMovie.type || "movie")
              );
            })}
            onToggleList={() => actions.toggleMyList(state.selectedMovie)}
          />
        </React.Suspense>
      )}

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

      <AnimatePresence>
        {selectedMovieForSource && (
          <React.Suspense
            fallback={
              <div className="fixed inset-0 z-[1500] bg-obsidian/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-obsidian border border-white/10 rounded-2xl p-5 sm:p-10 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-1/3 bg-white/10 rounded-lg shimmer-bg" />
                    <div className="h-8 w-8 bg-white/10 rounded-full shimmer-bg" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-12 w-full bg-white/5 rounded-xl shimmer-bg border border-white/5" />
                    <div className="h-12 w-full bg-white/5 rounded-xl shimmer-bg border border-white/5" />
                    <div className="h-12 w-full bg-white/5 rounded-xl shimmer-bg border border-white/5" />
                  </div>
                </div>
              </div>
            }
          >
            <SourceSelectionModal
              movie={selectedMovieForSource}
              season={selectedEpForSource?.season}
              episode={selectedEpForSource?.episode}
              onClose={() => {
                setSelectedMovieForSource(null);
                setSelectedEpForSource(null);
              }}
              onSelect={(sourceUrl) => {
                const movie = selectedMovieForSource;
                const season = selectedEpForSource?.season;
                const episode = selectedEpForSource?.episode;
                setSelectedMovieForSource(null);
                setSelectedEpForSource(null);
                actions.startPlayback(movie, season, episode, sourceUrl);
              }}
            />
          </React.Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedActorId && (
          <CastExplorerModal
            actorId={selectedActorId}
            onClose={() => setSelectedActorId(null)}
            onSelectMovie={actions.setSelectedMovie}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Renders MovieDetails as a full page when navigating directly to /movie/:id or /tv/:id
function MovieDetailPageStub({ actions, state, onSelectActor }: any) {
  const { id, type } = useParams();
  const navigate = useNavigate();

  // Try to find the movie in the already-loaded catalog
  const catalogMovie = id
    ? state.allMovies.find(
        (m: any) => m.id.toString() === id && (type ? m.type === type : true),
      )
    : null;

  return (
    <div className="min-h-screen bg-obsidian">
      <React.Suspense
        fallback={
          <MovieDetailsSkeleton
            onClose={() => {
              const params = new URLSearchParams(window.location.search);
              navigate(`/?${params.toString()}`);
            }}
          />
        }
      >
        <MovieDetails
          key={`page-details-${id}`}
          movie={catalogMovie || null}
          onClose={() => actions.setSelectedMovie(null)}
          onPlay={(s: number, e: number, src?: string, loadedMovie?: any) => {
            const playMovie = catalogMovie || loadedMovie;
            if (playMovie) actions.startPlayback(playMovie, s, e, src);
          }}
          onSelectMovie={actions.setSelectedMovie}
          onSelectActor={onSelectActor}
          isInList={
            catalogMovie
              ? state.myList.some((item: any) => {
                  const id =
                    typeof item === "object" && item !== null ? item.id : item;
                  const type =
                    typeof item === "object" && item !== null
                      ? item.type
                      : "movie";
                  return (
                    id.toString() === catalogMovie.id.toString() &&
                    type === (catalogMovie.type || "movie")
                  );
                })
              : false
          }
          onToggleList={() => {
            if (catalogMovie) actions.toggleMyList(catalogMovie);
          }}
        />
      </React.Suspense>
    </div>
  );
}

function MediaPlayerStub({ actions, state }: any) {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [localMovie, setLocalMovie] = React.useState<any>(null);
  const [localLoading, setLocalLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState(false);

  const catalogMovie = id
    ? state.allMovies.find(
        (m: any) =>
          m.id.toString() === id.toString() &&
          (m.type === type || (!m.type && type === "movie")),
      ) ||
      (state.selectedMovie &&
      state.selectedMovie.id?.toString() === id.toString() &&
      (state.selectedMovie.type === type ||
        (!state.selectedMovie.type && type === "movie"))
        ? state.selectedMovie
        : null)
    : null;

  const movie = catalogMovie || localMovie;

  const season = searchParams.get("season")
    ? parseInt(searchParams.get("season")!)
    : undefined;
  const episode = searchParams.get("episode")
    ? parseInt(searchParams.get("episode")!)
    : undefined;
  const source = searchParams.get("source") || undefined;

  React.useEffect(() => {
    if (!catalogMovie && id && type) {
      setLocalLoading(true);
      setLocalError(false);
      getMediaBasicInfo(id, type as "movie" | "tv")
        .then((data) => {
          if (data) {
            setLocalMovie(data);
          } else {
            setLocalError(true);
          }
        })
        .catch((err) => {
          console.error("Failed to load movie for player:", err);
          setLocalError(true);
        })
        .finally(() => {
          setLocalLoading(false);
        });
    }
  }, [catalogMovie, id, type]);

  // Enrich movie with logo metadata if clearLogo is missing
  React.useEffect(() => {
    if (movie && !movie.clearLogo) {
      enrichMoviesWithMetadata([movie]).then((enriched) => {
        if (enriched?.[0]?.clearLogo) {
          movie.clearLogo = enriched[0].clearLogo;
          setLocalMovie((prev: any) => ({
            ...(prev || movie),
            clearLogo: enriched[0].clearLogo,
          }));
        }
      });
    }
  }, [movie?.id, movie?.clearLogo]);

  // While the global catalog is still loading OR local fetch is running, show themed skeleton
  if (!movie && (state.isLoading || localLoading)) {
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
    <div className="fixed inset-0 z-[1000] bg-black transform-gpu">
      <React.Suspense
        fallback={
          <div className="h-screen bg-black flex flex-col justify-between p-8 relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <div className="h-10 w-10 bg-white/10 rounded-xl shimmer-bg" />
              <div className="h-6 w-1/3 bg-white/10 rounded-lg shimmer-bg" />
              <div className="h-10 w-10 bg-white/10 rounded-xl shimmer-bg" />
            </div>
            <div className="absolute inset-0 bg-nebula-cyan/[0.02] blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="w-full space-y-4 z-10">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden shimmer-bg" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 bg-white/10 rounded-full shimmer-bg" />
                  <div className="h-8 w-8 bg-white/10 rounded-full shimmer-bg" />
                </div>
                <div className="h-8 w-24 bg-white/10 rounded-lg shimmer-bg" />
              </div>
            </div>
          </div>
        }
      >
        <MediaPlayer
          key={`player-${id}-s${season ?? 0}-e${episode ?? 0}`}
          movie={movie}
          season={season}
          episode={episode}
          source={source}
          onMarkAsWatched={actions.markAsWatched}
          onClose={() => navigate(`/${type}/${id}`, { replace: true })}
        />
      </React.Suspense>
    </div>
  );
}

interface CastExplorerModalProps {
  actorId: string | number;
  onClose: () => void;
  onSelectMovie: (movie: any) => void;
}

export const CastExplorerModal: React.FC<CastExplorerModalProps> = ({
  actorId,
  onClose,
  onSelectMovie,
}) => {
  const [details, setDetails] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [bioExpanded, setBioExpanded] = React.useState(false);
  const filmRowRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  React.useEffect(() => {
    if (!actorId) return;
    setLoading(true);
    getPersonDetails(actorId)
      .then((data) => {
        setDetails(data);
      })
      .catch((err) => {
        console.error("[PLAYER] Failed to load person details:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [actorId]);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Track scroll state for navigation arrows with precision
  const updateScrollState = React.useCallback(() => {
    const el = filmRowRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }, []);

  React.useEffect(() => {
    const el = filmRowRef.current;
    if (!el) return;
    // Initial check after render
    const timer = setTimeout(updateScrollState, 100);
    el.addEventListener("scroll", updateScrollState, { passive: true });

    // ResizeObserver ensures changes in width or loaded cards update arrows instantly
    const ro = new ResizeObserver(() => {
      updateScrollState();
    });
    ro.observe(el);

    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [details, updateScrollState]);

  const scrollRow = (direction: "left" | "right") => {
    const el = filmRowRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1600] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: "spring", duration: 0.45, bounce: 0.1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[88vh] bg-obsidian border border-white/15 rounded-2xl sm:rounded-3xl overflow-y-auto custom-scrollbar flex flex-col p-4 sm:p-7 md:p-8 text-white shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 sm:right-5 sm:top-5 p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 hover:border-nebula-cyan/40 text-white/50 hover:text-white transition-all cursor-pointer z-50 active:scale-95"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {loading ? (
          <div className="flex-1 py-28 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-nebula-cyan" size={36} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 animate-pulse">
              Syncing Creator Records...
            </p>
          </div>
        ) : !details ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              !
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">
                Creator Profile Offline
              </h3>
              <p className="text-white/40 text-xs mt-1">
                The database could not locate this creator's profile.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold rounded-full transition-all cursor-pointer"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 sm:gap-7">
            {/* Top Profile Header */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start text-center sm:text-left">
              {/* Portrait Photo */}
              <div className="relative w-28 h-36 sm:w-36 sm:h-48 md:w-40 md:h-52 rounded-2xl overflow-hidden border border-white/15 shrink-0 bg-white/5 shadow-2xl group">
                {details.profile_path ? (
                  <img
                    src={details.profile_path}
                    alt={details.name}
                    className="w-full h-full object-cover object-top filter brightness-95 group-hover:brightness-105 transition-all duration-300"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <User size={40} />
                  </div>
                )}
                {/* Subtle Inner Border Glow */}
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 pointer-events-none" />
              </div>

              {/* Creator Metadata & Biography */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  {/* Role Badge & Name */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                    <div
                      className={`px-3 py-1 rounded-lg border backdrop-blur-md text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                        details.known_for_department === "Directing"
                          ? "bg-purple-500/15 border-purple-400/40 text-purple-200"
                          : "bg-cyan-500/15 border-nebula-cyan/40 text-nebula-cyan"
                      }`}
                    >
                      {details.known_for_department === "Directing" ? (
                        <Clapperboard size={12} className="shrink-0" />
                      ) : (
                        <User size={12} className="shrink-0" />
                      )}
                      <span>{details.known_for_department || "Creator"}</span>
                    </div>

                    {details.combined_credits &&
                      details.combined_credits.length > 0 && (
                        <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <Film size={12} className="text-white/40" />
                          <span>{details.combined_credits.length} Credits</span>
                        </div>
                      )}
                  </div>

                  <h2 className="text-xl sm:text-2.5xl md:text-3xl font-display font-black tracking-tight uppercase text-white drop-shadow-md">
                    {details.name}
                  </h2>

                  {/* Metadata: Birthday & Birthplace */}
                  <div className="flex flex-wrap gap-2 sm:gap-3 mt-2.5 justify-center sm:justify-start text-xs text-white/70 font-medium">
                    {details.birthday && (
                      <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        <Calendar
                          size={13}
                          className="text-nebula-cyan shrink-0"
                        />
                        <span>{details.birthday}</span>
                      </div>
                    )}
                    {details.place_of_birth && (
                      <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                        <MapPin
                          size={13}
                          className="text-nebula-cyan shrink-0"
                        />
                        <span className="truncate max-w-[200px] sm:max-w-[280px]">
                          {details.place_of_birth}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Biography */}
                {(() => {
                  const BIO_LIMIT = 240;
                  const bio = details.biography || "";
                  const isLong = bio.length > BIO_LIMIT;
                  const displayBio =
                    isLong && !bioExpanded
                      ? bio.slice(0, BIO_LIMIT).trimEnd() + "…"
                      : bio;
                  return (
                    <div className="mt-3.5 sm:mt-4 text-xs sm:text-[13px] text-white/85 leading-relaxed font-sans border-l-2 border-nebula-cyan/50 pl-3.5 text-left bg-white/[0.02] py-1.5 pr-2 rounded-r-lg">
                      {bio ? (
                        <>
                          <span>{displayBio}</span>
                          {isLong && (
                            <button
                              onClick={() => setBioExpanded(!bioExpanded)}
                              className="ml-1.5 text-nebula-cyan hover:underline text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer inline-block"
                            >
                              {bioExpanded ? "Show less" : "Read more"}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="italic text-white/30 text-[11px]">
                          No biography transmission recorded for this creator.
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Section: Combined Filmography Row */}
            <div className="w-full pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] sm:text-xs font-black text-white/50 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <Film size={13} className="text-nebula-cyan" />
                  <span>
                    Featured Filmography (
                    {details.combined_credits?.length || 0})
                  </span>
                </h3>
              </div>

              <div className="relative group/filmrow">
                {/* Left Arrow (Desktop only - appears on hover) */}
                {canScrollLeft && (
                  <button
                    onClick={() => scrollRow("left")}
                    className="hidden md:flex absolute left-0 top-0 bottom-3 z-30 w-8 sm:w-10 items-center justify-center bg-gradient-to-r from-obsidian via-obsidian/90 to-transparent opacity-0 group-hover/filmrow:opacity-100 transition-opacity duration-300 cursor-pointer"
                    aria-label="Scroll left"
                  >
                    <div className="w-7 h-7 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 hover:border-nebula-cyan/60 transition-all text-white shadow-lg">
                      ‹
                    </div>
                  </button>
                )}

                {/* Right Arrow (Desktop only - appears on hover) */}
                {canScrollRight && (
                  <button
                    onClick={() => scrollRow("right")}
                    className="hidden md:flex absolute right-0 top-0 bottom-3 z-30 w-8 sm:w-10 items-center justify-center bg-gradient-to-l from-obsidian via-obsidian/90 to-transparent opacity-0 group-hover/filmrow:opacity-100 transition-opacity duration-300 cursor-pointer"
                    aria-label="Scroll right"
                  >
                    <div className="w-7 h-7 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 hover:border-nebula-cyan/60 transition-all text-white shadow-lg">
                      ›
                    </div>
                  </button>
                )}

                <div
                  ref={filmRowRef}
                  className="flex gap-2.5 sm:gap-3.5 overflow-x-auto pb-3 custom-scrollbar snap-x snap-mandatory scroll-smooth"
                >
                  {details.combined_credits &&
                  details.combined_credits.length > 0 ? (
                    details.combined_credits.map((m: any, i: number) => (
                      <button
                        key={`actor-film-${m.id}-${i}`}
                        onClick={() => {
                          onSelectMovie(m);
                          onClose();
                        }}
                        className="group/film relative w-24 sm:w-28 md:w-32 aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-nebula-cyan/60 transition-all duration-300 cursor-pointer shrink-0 snap-start shadow-md hover:shadow-[0_8px_20px_rgba(0,229,255,0.2)] hover:-translate-y-1 text-left"
                      >
                        {m.image ? (
                          <img
                            src={m.image}
                            alt={m.title}
                            className="w-full h-full object-cover filter brightness-95 group-hover/film:brightness-105 group-hover/film:scale-105 transition-all duration-500"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/20">
                            <Film size={24} />
                          </div>
                        )}

                        {/* Type badge — top-left corner tab */}
                        {m.type && (
                          <div className="absolute top-0 left-0 z-20 pointer-events-none bg-black/85 backdrop-blur-md text-white/90 text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-br-lg border-r border-b border-white/10 leading-none">
                            {m.type === "tv" ? "TV" : "Film"}
                          </div>
                        )}

                        {/* Year badge — top-right corner tab */}
                        {m.year > 0 && (
                          <div className="absolute top-0 right-0 z-20 pointer-events-none bg-black/85 backdrop-blur-md text-white/80 text-[7.5px] sm:text-[8.5px] font-bold px-2 py-0.5 rounded-bl-lg border-l border-b border-white/10 leading-none">
                            {m.year}
                          </div>
                        )}

                        {/* Bottom Scrim & Title */}
                        <div className="absolute inset-x-0 bottom-0 h-16 sm:h-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col justify-end p-2 sm:p-2.5">
                          <p className="text-[9px] sm:text-[10.5px] font-display font-black uppercase tracking-tight text-white leading-tight line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover/film:text-nebula-cyan transition-colors">
                            {m.title}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-white/30 text-xs italic py-4">
                      No active operations found in catalog for this creator.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

function PeoplePageStub({ actions, onSelectActor }: any) {
  const navigate = useNavigate();
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-obsidian pt-16 sm:pt-24 md:pt-28 px-3.5 sm:px-6 md:px-12 pb-24 sm:pb-32">
          <div className="h-8 w-40 bg-white/5 rounded-lg mb-6 shimmer-bg" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-8 gap-2.5 sm:gap-3.5">
            {[...Array(24)].map((_, i) => (
              <div
                key={`person-page-skel-${i}`}
                className="aspect-[2/3] rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/5 p-2 sm:p-3 flex flex-col justify-end gap-1 sm:gap-1.5 animate-pulse overflow-hidden relative"
              >
                <div className="absolute inset-0 shimmer-bg opacity-30" />
                <div className="h-3 sm:h-4 w-3/4 bg-white/10 rounded shimmer-bg relative z-10" />
                <div className="h-2 sm:h-3 w-1/2 bg-white/10 rounded shimmer-bg relative z-10 opacity-60" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <PeopleView
        onClose={() => {
          actions.setViewingCategory(null);
          actions.setActiveTab("home");
          navigate("/");
        }}
        onSelectActor={onSelectActor}
        onSelectMovie={actions.setSelectedMovie}
      />
    </React.Suspense>
  );
}
