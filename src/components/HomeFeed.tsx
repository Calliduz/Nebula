import React from 'react';
import { DiscoveryBar } from './DiscoveryBar';
import { GenreBar } from './GenreBar';
import { TopTenShelf } from './TopTenShelf';
import { MovieRow } from './MovieRow';
import { MovieCard } from './MovieCard';
import { MovieSkeleton } from './MovieSkeleton';

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
  rows: {title: string, items: any[]}[];
  allMovies: any[];
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  sortBy, setSortBy, activeMood, setActiveMood, selectedGenre, setSelectedGenre,
  setSelectedMovie, isLoading, filteredMovies, recommendations, myList,
  toggleMyList, setViewingCategory, onRandomize, rows, allMovies
}) => {
  return (
    <div className="px-4 sm:px-6 md:px-12 mt-6 md:-mt-10 pb-20 relative z-30 flex flex-col gap-8">
      <DiscoveryBar 
        sortBy={sortBy} setSortBy={setSortBy} 
        activeMood={activeMood} setActiveMood={setActiveMood} 
        onRandomize={onRandomize} 
      />

      <GenreBar selectedGenre={selectedGenre} setSelectedGenre={setSelectedGenre} />

      <TopTenShelf data={allMovies} onSelect={setSelectedMovie} />

      {rows.map((row, rowIndex) => (
        <MovieRow 
          key={`row-v3-${row.title}-${rowIndex}`} 
          title={row.title}
          onTitleClick={() => setViewingCategory(row.title)}
        >
          {isLoading ? (
            [...Array(6)].map((_, i) => <MovieSkeleton key={`sk-${rowIndex}-${i}`} />)
          ) : (
            row.items.map((m, i) => (
              <MovieCard 
                key={`card-${rowIndex}-${m.id}-${i}`} 
                movie={m} 
                snap 
                onSelect={setSelectedMovie} 
                isInList={myList.includes(m.id)} 
                onToggleList={() => toggleMyList(m.id)} 
              />
            ))
          )}
        </MovieRow>
      ))}

      {/* Fallback Recommendation Row if not already in rows */}
      {!rows.some(r => r.title === 'Based on Mission History') && (
        <MovieRow title="Based on Mission History">
          {isLoading ? (
            [...Array(6)].map((_, i) => <MovieSkeleton key={`sk-rec-${i}`} />)
          ) : (
            recommendations.map((m, i) => (
              <MovieCard 
                key={`m-rec-${m.id}-${i}`} movie={m} snap onSelect={setSelectedMovie} 
                isInList={myList.includes(m.id)} onToggleList={() => toggleMyList(m.id)} 
              />
            ))
          )}
        </MovieRow>
      )}
    </div>
  );
};
