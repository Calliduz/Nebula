import React from "react";

interface MovieSkeletonProps {
  isGrid?: boolean;
}

export const MovieSkeleton: React.FC<MovieSkeletonProps> = ({ isGrid = false }) => (
  <div className={`relative ${isGrid ? "w-full" : "w-[115px] sm:w-[155px] md:w-[200px] lg:w-[220px]"} shrink-0 aspect-[2/3] rounded-xl md:rounded-2xl shimmer-bg border border-white/5 snap-start`}>
    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
    <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 space-y-2 md:space-y-3">
      <div className="h-3 md:h-4 w-3/4 shimmer-bg rounded-lg opacity-20" />
      <div className="h-2.5 md:h-3 w-1/2 shimmer-bg rounded-lg opacity-10" />
    </div>
  </div>
);
