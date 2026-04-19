import React from 'react';

export const MovieSkeleton = () => (
  <div className="min-w-[200px] md:min-w-[280px] aspect-[2/3] rounded-2xl shimmer-bg border border-white/5 snap-start relative">
    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
    <div className="absolute bottom-6 left-6 right-6 space-y-3">
      <div className="h-4 w-3/4 shimmer-bg rounded-lg opacity-20" />
      <div className="h-3 w-1/2 shimmer-bg rounded-lg opacity-10" />
    </div>
  </div>
);
