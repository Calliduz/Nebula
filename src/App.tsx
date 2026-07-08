import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X, Calendar, MapPin, User, Film } from "lucide-react";

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

const MediaPlayer = React.lazy(() =>
  import("./components/MediaPlayer").then((module) => ({
    default: module.MediaPlayer,
  })),
);
const MovieDetails = React.lazy(() =>
  import("./components/MovieDetails").then((module) => ({
    default: module.MovieDetails,
  })),
);
const SourceSelectionModal = React.lazy(() =>
  import("./components/MovieDetails").then((module) => ({
    default: module.SourceSelectionModal,
  })),
);
const SearchOverlay = React.lazy(() =>
  import("./components/SearchOverlay").then((module) => ({
    default: module.SearchOverlay,
  })),
);
const CategoryView = React.lazy(() =>
  import("./components/CategoryView").then((module) => ({
    default: module.CategoryView,
  })),
);
const NotFound = React.lazy(() =>
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

import { getMediaBasicInfo, getPersonDetails } from "./services/tmdb";
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

  const handleHeroPlay = (movie: any) => {
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
  };

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
      {!isWatching && !isDetailPage && (
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
        id="main-scroller"
        className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-700 pb-24 lg:pb-0 ${state.isSearchOpen ? "blur-2xl scale-[0.98] opacity-50" : ""}`}
      >
        {/* ── System Banner ── */}
        {!isWatching && !isDetailPage && (
          <div className="relative z-[60] mt-[64px] md:mt-[76px] bg-nebula-cyan/5 border-b border-nebula-cyan/10 px-4 py-2.5 flex items-center justify-center gap-3 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-nebula-cyan animate-pulse shadow-[0_0_10px_#00f3ff]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
              <span className="text-nebula-cyan/80">Announcement:</span> Cast
              Explorer is now available, tap an actor picture in the overview
              tab to test it out! --- Videasy source is down use
              Vidnest-(Videasy) as an alternative
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
                      startPlayback={handleHeroPlay}
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
                      onRefreshFeed={actions.refreshFeed}
                      rows={state.rows}
                      allMovies={state.allMovies}
                      topTenMovies={state.topTenMovies}
                      removeFromHistory={actions.removeFromHistory}
                      removeFromProgress={actions.removeFromProgress}
                      fetchRowData={actions.fetchRowData}
                    />
                  </>
                ) : (
                  <React.Suspense
                    fallback={
                      <div className="min-h-screen bg-obsidian pt-12 px-4 sm:px-6 md:px-12 pb-32">
                        <div className="h-10 w-48 bg-white/5 rounded-lg mb-12 shimmer-bg" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 sm:gap-x-6 gap-y-6 sm:gap-y-12">
                          {[...Array(12)].map((_, i) => (
                            <MovieSkeleton key={`cat-fallback-sk-${i}`} />
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
            isInList={state.myList.includes(state.selectedMovie.id.toString())}
            onToggleList={() => actions.toggleMyList(state.selectedMovie.id)}
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
        fallback={<MovieDetailsSkeleton onClose={() => navigate("/")} />}
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
              ? state.myList.includes(catalogMovie.id.toString())
              : false
          }
          onToggleList={() => {
            if (catalogMovie) actions.toggleMyList(catalogMovie.id);
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
      ) || state.selectedMovie
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
    <div className="fixed inset-0 z-[1000] bg-black">
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
          onClose={() => navigate(-1)}
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

  // Track scroll state for navigation arrows
  const updateScrollState = React.useCallback(() => {
    const el = filmRowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  React.useEffect(() => {
    const el = filmRowRef.current;
    if (!el) return;
    // Initial check after render
    const timer = setTimeout(updateScrollState, 100);
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", updateScrollState);
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
      className="fixed inset-0 z-[1600] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] bg-obsidian/95 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar flex flex-col p-5 sm:p-10 text-white shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-6 sm:top-6 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-nebula-cyan/30 text-white/50 hover:text-white transition-all cursor-pointer z-55"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div className="flex-1 py-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-nebula-cyan" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 animate-pulse">
              Syncing Actor Records...
            </p>
          </div>
        ) : !details ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              !
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter italic">
                Actor Profile Offline
              </h3>
              <p className="text-white/40 text-xs mt-1">
                The database could not locate this creator's profile.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-full transition-all"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-10">
            {/* Top Section: Photo & Bio Info */}
            <div className="flex flex-col md:flex-row gap-5 sm:gap-10">
              {/* Profile Photo */}
              <div className="w-28 h-28 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border border-white/10 shrink-0 self-center md:self-start bg-white/5">
                {details.profile_path ? (
                  <img
                    src={details.profile_path}
                    alt={details.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <User size={48} />
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h2 className="text-xl sm:text-4xl font-display font-black tracking-tight uppercase italic text-center md:text-left">
                  {details.name}
                </h2>
                <p className="text-[10px] sm:text-xs font-semibold text-nebula-cyan uppercase tracking-[0.25em] mt-1.5 text-center md:text-left">
                  {details.known_for_department}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap gap-3 sm:gap-6 mt-3 sm:mt-4 justify-center md:justify-start text-[10px] sm:text-xs text-white/50 font-medium">
                  {details.birthday && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-white/30" />
                      <span>{details.birthday}</span>
                    </div>
                  )}
                  {details.place_of_birth && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-white/30" />
                      <span className="truncate max-w-[180px] sm:max-w-[200px]">
                        {details.place_of_birth}
                      </span>
                    </div>
                  )}
                </div>

                {/* Biography */}
                {(() => {
                  const BIO_LIMIT = 280;
                  const bio = details.biography || "";
                  const isLong = bio.length > BIO_LIMIT;
                  const displayBio =
                    isLong && !bioExpanded
                      ? bio.slice(0, BIO_LIMIT).trimEnd() + "…"
                      : bio;
                  return (
                    <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-white/70 leading-relaxed font-sans pr-2 border-l border-white/10 pl-3 sm:pl-4 text-justify">
                      {bio ? (
                        <>
                          {displayBio}
                          {isLong && (
                            <button
                              onClick={() => setBioExpanded(!bioExpanded)}
                              className="ml-1 text-nebula-cyan/80 hover:text-nebula-cyan text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              {bioExpanded ? "Show less" : "Read more"}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="italic text-white/30">
                          No biography transmission recorded for this actor.
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Section: Combined Filmography Row with Nav Arrows */}
            <div className="w-full">
              <h3 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-3 sm:mb-6 flex items-center gap-3">
                <Film size={14} className="text-white/30" />
                Featured Missions ({details.combined_credits?.length || 0})
              </h3>

              <div className="relative group/filmrow">
                {/* Left Arrow */}
                {canScrollLeft && (
                  <button
                    onClick={() => scrollRow("left")}
                    className="absolute left-0 top-0 bottom-4 z-10 w-10 sm:w-12 flex items-center justify-center bg-gradient-to-r from-obsidian via-obsidian/80 to-transparent opacity-0 group-hover/filmrow:opacity-100 transition-opacity duration-300 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 hover:border-nebula-cyan/40 transition-all">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                      >
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </div>
                  </button>
                )}

                {/* Right Arrow */}
                {canScrollRight && (
                  <button
                    onClick={() => scrollRow("right")}
                    className="absolute right-0 top-0 bottom-4 z-10 w-10 sm:w-12 flex items-center justify-center bg-gradient-to-l from-obsidian via-obsidian/80 to-transparent opacity-0 group-hover/filmrow:opacity-100 transition-opacity duration-300 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 hover:border-nebula-cyan/40 transition-all">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </button>
                )}

                <div
                  ref={filmRowRef}
                  className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 custom-scrollbar touch-pan-x snap-x snap-mandatory scroll-smooth"
                >
                  {details.combined_credits &&
                  details.combined_credits.length > 0 ? (
                    details.combined_credits.map((m: any, i: number) => (
                      <div
                        key={`actor-film-${m.id}-${i}`}
                        onClick={() => {
                          onSelectMovie(m);
                          onClose();
                        }}
                        className="w-24 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer relative shrink-0 snap-start"
                      >
                        <img
                          src={m.image}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-500"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                        {/* Always-visible type badge — hidden on mobile */}
                        <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 hidden sm:block">
                          <span
                            className={`text-[7px] sm:text-[9px] font-black uppercase tracking-wide px-1.5 sm:px-2 py-[2px] sm:py-[3px] rounded-md backdrop-blur-md shadow-sm ${m.type === "tv" ? "bg-white/15 text-white border border-white/20" : "bg-nebula-cyan/90 text-obsidian"}`}
                          >
                            {m.type === "tv" ? "TV" : "Movie"}
                          </span>
                        </div>
                        {/* Year badge */}
                        {m.year > 0 && (
                          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 hidden sm:block">
                            <span className="text-[7px] sm:text-[8px] font-bold text-white/80 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded">
                              {m.year}
                            </span>
                          </div>
                        )}
                        {/* Hover overlay with title */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 sm:p-3">
                          <p className="text-[9px] sm:text-[10px] font-bold text-white leading-tight line-clamp-2">
                            {m.title}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/30 text-xs italic">
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
