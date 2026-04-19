import React from 'react';

export const HeroSkeleton = () => (
  <section className="relative h-[85vh] md:h-[95vh] overflow-hidden bg-obsidian">
    <div className="absolute inset-0 shimmer-bg opacity-20" />
    <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/60 to-transparent z-10" />
    <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-transparent to-transparent z-10" />
    
    <div className="absolute inset-0 z-20 flex items-center px-4 sm:px-6 md:px-12 pt-10">
      <div className="max-w-3xl w-full">
        {/* Title Skeleton */}
        <div className="h-20 sm:h-32 md:h-40 w-3/4 bg-white/5 rounded-2xl mb-10 shimmer-bg" />
        
        {/* Meta Skeleton */}
        <div className="flex gap-6 mb-10">
          <div className="h-6 w-20 bg-white/5 rounded shimmer-bg" />
          <div className="h-6 w-20 bg-white/5 rounded shimmer-bg" />
          <div className="h-6 w-20 bg-white/5 rounded shimmer-bg" />
        </div>
        
        {/* Description Skeleton */}
        <div className="space-y-4 mb-12">
          <div className="h-4 w-full bg-white/5 rounded shimmer-bg" />
          <div className="h-4 w-5/6 bg-white/5 rounded shimmer-bg" />
          <div className="h-4 w-4/6 bg-white/5 rounded shimmer-bg" />
        </div>
        
        {/* Buttons Skeleton */}
        <div className="flex gap-6">
          <div className="h-16 w-48 bg-white/5 rounded-xl shimmer-bg" />
          <div className="h-16 w-48 bg-white/5 rounded-xl shimmer-bg" />
        </div>
      </div>
    </div>

    {/* Thumbnail Skeletons */}
    <div className="absolute bottom-20 right-12 flex-col gap-4 hidden md:flex">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-[70px] aspect-[2/3] rounded-lg bg-white/5 border border-white/10 shimmer-bg" />
      ))}
    </div>
  </section>
);
