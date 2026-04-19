import React from 'react';

export const MovieSkeleton = () => (
  <div className="min-w-[160px] md:min-w-[220px] aspect-[2/3] rounded-2xl shimmer-bg border border-white/5 snap-start relative">
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
    <div className="absolute bottom-4 left-4 right-4 space-y-2">
      <div className="h-3 w-3/4 shimmer-bg rounded" />
      <div className="h-2 w-1/2 shimmer-bg rounded opacity-50" />
    </div>
  </div>
);
