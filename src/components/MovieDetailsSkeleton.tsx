import React from "react";
import { ArrowLeft } from "lucide-react";
import { MovieSkeleton } from "./MovieSkeleton";

interface MovieDetailsSkeletonProps {
  onClose: () => void;
}

export const MovieDetailsSkeleton: React.FC<MovieDetailsSkeletonProps> = ({
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[200] bg-obsidian overflow-y-auto overflow-x-hidden custom-scrollbar">
      {/* Shimmering Backdrop Gradient */}
      <div className="absolute inset-x-0 top-0 h-[70vh] z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-obsidian/60 to-obsidian z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/40 to-transparent z-10" />
        <div className="w-full h-full bg-white/5 shimmer-bg opacity-20" />
      </div>

      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 lg:px-10 pt-10 pb-20">
        {/* Back Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-3 text-dim hover:text-white mb-8 lg:mb-16 transition-all group w-fit"
        >
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-nebula-cyan group-hover:bg-white/5 transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-xs font-bold tracking-[0.2em] uppercase">
            Back to Browse
          </span>
        </button>

        {/* Layout Container */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start w-full">
          {/* Shimmering Poster */}
          <div className="w-full max-w-[300px] sm:max-w-[350px] mx-auto lg:mx-0 aspect-[2/3] rounded-2xl bg-white/5 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative shimmer-bg shrink-0" />

          {/* Shimmering Info */}
          <div className="flex-1 w-full overflow-hidden space-y-8">
            {/* Title / Logo Skeleton */}
            <div className="h-16 sm:h-24 md:h-32 w-3/4 max-w-xl bg-white/5 rounded-2xl shimmer-bg" />

            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold tracking-widest text-dim uppercase">
              <div className="h-6 w-16 bg-white/5 rounded shimmer-bg" />
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <div className="h-6 w-20 bg-white/5 rounded shimmer-bg" />
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <div className="h-6 w-16 bg-white/5 rounded shimmer-bg" />
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <div className="h-6 w-16 bg-white/5 rounded shimmer-bg" />
            </div>

            {/* Description lines */}
            <div className="space-y-4 max-w-2xl">
              <div className="h-4 w-full bg-white/5 rounded shimmer-bg" />
              <div className="h-4 w-5/6 bg-white/5 rounded shimmer-bg" />
              <div className="h-4 w-4/6 bg-white/5 rounded shimmer-bg" />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <div className="h-12 sm:h-14 w-36 sm:w-44 bg-white/5 rounded-xl shimmer-bg" />
              <div className="h-12 sm:h-14 w-36 sm:w-44 bg-white/5 rounded-xl shimmer-bg" />
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-white/10 pb-4">
              <div className="flex gap-8">
                <div className="h-6 w-20 bg-white/5 rounded shimmer-bg" />
                <div className="h-6 w-20 bg-white/5 rounded shimmer-bg" />
                <div className="h-6 w-20 bg-white/5 rounded shimmer-bg" />
              </div>
            </div>
          </div>
        </div>

        {/* Similar Titles Row */}
        <div className="mt-16 sm:mt-24 space-y-6">
          <div className="h-8 w-48 bg-white/5 rounded-lg shimmer-bg" />
          <div className="flex gap-4 overflow-x-hidden pb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <MovieSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
