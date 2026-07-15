import React from "react";
import { DiscoveryBar } from "./DiscoveryBar";
import { TopTenShelf } from "./TopTenShelf";
import { MovieRow } from "./MovieRow";
import { MovieCard } from "./MovieCard";
import { MovieSkeleton } from "./MovieSkeleton";
import { ProvidersShelf } from "./ProvidersShelf";
import { CategoriesBar } from "./CategoriesBar";
import { LazyViewport } from "./LazyViewport";

const SectionDivider = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-6 my-2 md:my-6 px-4 sm:px-0">
    <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-transparent" />
    {label && (
      <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20 shrink-0">
        {label}
      </span>
    )}
    <div className="h-px flex-1 bg-gradient-to-l from-white/[0.06] via-white/[0.03] to-transparent" />
  </div>
);

interface HomeFeedProps {
  sortBy: string;
  setSortBy: (val: string) => void;
  activeMood: string;
  setActiveMood: (val: string) => void;
  selectedGenre: string;
  setSelectedGenre: (val: string) => void;
  setSelectedMovie: (movie: any) => void;
  isLoading: boolean;
  filteredMovies: any[];
  recommendations: any[];
  myList: number[];
  toggleMyList: (id: number) => void;
  setViewingCategory: (category: string | null) => void;
  onRandomize: () => void;
  onRefreshFeed: () => void;
  rows: any[];
  allMovies: any[];
  topTenMovies: any[];
  removeFromHistory: (id: string | number, type?: string) => void;
  removeFromProgress: (id: string) => void;
  fetchRowData: (rowTitle: string) => void;
  adultMode?: boolean;
  setAdultMode?: (val: boolean) => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  sortBy,
  setSortBy,
  activeMood,
  setActiveMood,
  selectedGenre,
  setSelectedGenre,
  setSelectedMovie,
  isLoading,
  filteredMovies,
  recommendations,
  myList,
  toggleMyList,
  setViewingCategory,
  onRandomize,
  onRefreshFeed,
  rows,
  allMovies,
  topTenMovies,
  removeFromHistory,
  removeFromProgress,
  fetchRowData,
  adultMode = false,
  setAdultMode,
}) => {
  const ADULT_ROW_TITLES = [
    "Rated R Hits",
    "Steamy Romance",
    "Erotic Thrillers",
    "Adult Anime",
  ];

  const priorityTitles = [
    "Continue Watching",
    "Top in Philippines",
    "Trending Now",
  ];

  // Explicitly order priority rows based on priorityTitles sequence
  const priorityRows = priorityTitles
    .map((title) => rows.find((r) => r.title === title))
    .filter(Boolean);

  const isPersonalized = (title: string) => {
    return (
      title.startsWith("Because you watched") ||
      title.startsWith("More Like") ||
      title.startsWith("Because you like") ||
      title === "Watch It Again" ||
      title === "Under the Radar Missions"
    );
  };

  const isAdultRow = (title: string) => ADULT_ROW_TITLES.includes(title);

  const catalogRows = rows.filter(
    (r) =>
      !priorityTitles.includes(r.title) &&
      !isPersonalized(r.title) &&
      !isAdultRow(r.title),
  );

  const personalizedRows = rows.filter((r) => isPersonalized(r.title));

  const adultRows = rows.filter((r) => isAdultRow(r.title));

  const renderRow = (row: any, rowIndex: number) => {
    if (row.hasLoaded) {
      return (
        <React.Fragment key={`row-group-${row.title}-${rowIndex}`}>
          {row.items.length > 0 && (
            <MovieRow
              title={row.title}
              onTitleClick={() => setViewingCategory(row.title)}
            >
              {row.items.map((m: any, i: number) => (
                <MovieCard
                  key={`card-${row.title}-${rowIndex}-${m.id}-${i}`}
                  movie={m}
                  snap
                  aspect="portrait"
                  onSelect={setSelectedMovie}
                  isInList={myList.some((item: any) => {
                    const id =
                      typeof item === "object" && item !== null
                        ? item.id
                        : item;
                    const type =
                      typeof item === "object" && item !== null
                        ? item.type
                        : "movie";
                    return (
                      id.toString() === m.id.toString() &&
                      type === (m.type || "movie")
                    );
                  })}
                  onToggleList={() => toggleMyList(m)}
                  onRemove={
                    row.title === "Continue Watching"
                      ? () => removeFromProgress(m.id.toString())
                      : row.title === "My List"
                        ? () => toggleMyList(m)
                        : undefined
                  }
                />
              ))}
            </MovieRow>
          )}
        </React.Fragment>
      );
    }

    const skeletonPlaceholder = (
      <MovieRow
        title={row.title}
        onTitleClick={() => setViewingCategory(row.title)}
      >
        {[...Array(8)].map((_, i) => (
          <MovieSkeleton key={`sk-${row.title}-${rowIndex}-${i}`} />
        ))}
      </MovieRow>
    );

    return (
      <React.Fragment key={`row-group-${row.title}-${rowIndex}`}>
        <LazyViewport
          placeholder={skeletonPlaceholder}
          onVisible={() => fetchRowData(row.title)}
          minHeight="350px"
        >
          {row.items.length > 0 ? (
            <MovieRow
              title={row.title}
              onTitleClick={() => setViewingCategory(row.title)}
            >
              {row.items.map((m: any, i: number) => (
                <MovieCard
                  key={`card-${row.title}-${rowIndex}-${m.id}-${i}`}
                  movie={m}
                  snap
                  aspect="portrait"
                  onSelect={setSelectedMovie}
                  isInList={myList.some((item: any) => {
                    const id =
                      typeof item === "object" && item !== null
                        ? item.id
                        : item;
                    const type =
                      typeof item === "object" && item !== null
                        ? item.type
                        : "movie";
                    return (
                      id.toString() === m.id.toString() &&
                      type === (m.type || "movie")
                    );
                  })}
                  onToggleList={() => toggleMyList(m)}
                  onRemove={
                    row.title === "Continue Watching"
                      ? () => removeFromProgress(m.id.toString())
                      : row.title === "My List"
                        ? () => toggleMyList(m)
                        : undefined
                  }
                />
              ))}
            </MovieRow>
          ) : (
            skeletonPlaceholder
          )}
        </LazyViewport>
      </React.Fragment>
    );
  };

  return (
    <div className="pl-2 pr-4 sm:px-6 md:px-12 mt-6 md:mt-0 pb-20 relative z-30 flex flex-col gap-4 sm:gap-6 md:gap-8">
      {/* Cinematic transition zone — hero fades into feed */}
      <div className="h-8 md:h-16 -mt-8 md:-mt-16 bg-gradient-to-b from-transparent to-obsidian pointer-events-none" />

      <DiscoveryBar
        sortBy={sortBy}
        setSortBy={setSortBy}
        activeMood={activeMood}
        setActiveMood={setActiveMood}
        onRandomize={onRandomize}
        onRefreshFeed={onRefreshFeed}
        adultMode={adultMode}
        setAdultMode={setAdultMode}
      />

      {/* 1. Priority Rows (Continue Watching, Top in PH, Trending) */}
      {priorityRows.map((row, idx) => renderRow(row, idx))}

      {/* 2. Top Ten Shelf */}
      <TopTenShelf
        data={topTenMovies}
        onSelect={setSelectedMovie}
        isLoading={isLoading}
      />

      <SectionDivider />

      {/* 3. Providers Shelf & Categories Bar */}
      <ProvidersShelf setViewingCategory={setViewingCategory} />
      <CategoriesBar
        setViewingCategory={setViewingCategory}
        adultMode={adultMode}
      />

      <SectionDivider label="Catalog" />

      {/* 4. Catalog Rows (My List, New Releases, Genre rows) */}
      {catalogRows.map((row, idx) => renderRow(row, idx))}

      <SectionDivider label="Recommended For You" />

      {/* 5. Personalized Recommendation Rows */}
      {personalizedRows.map((row, idx) => renderRow(row, idx))}

      {/* 6. Adult Content Rows (only shown when 18+ mode is enabled) */}
      {adultMode && adultRows.length > 0 && (
        <>
          <SectionDivider label="🔞 Mature Content" />
          {adultRows.map((row, idx) => renderRow(row, idx))}
        </>
      )}

      {/* Fallback Recommendation Row if not already in rows */}
      {!rows.some((r) => r.title === "Based on Watch History") && (
        <MovieRow title="Based on Watch History">
          {isLoading
            ? [...Array(8)].map((_, i) => <MovieSkeleton key={`sk-rec-${i}`} />)
            : recommendations.map((m, i) => (
                <MovieCard
                  key={`m-rec-${m.id}-${i}`}
                  movie={m}
                  snap
                  onSelect={setSelectedMovie}
                  isInList={myList.some((item: any) => {
                    const id =
                      typeof item === "object" && item !== null
                        ? item.id
                        : item;
                    const type =
                      typeof item === "object" && item !== null
                        ? item.type
                        : "movie";
                    return (
                      id.toString() === m.id.toString() &&
                      type === (m.type || "movie")
                    );
                  })}
                  onToggleList={() => toggleMyList(m)}
                />
              ))}
        </MovieRow>
      )}
    </div>
  );
};
