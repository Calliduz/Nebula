import React, { useRef, useState, useEffect, memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { API_BASE_URL } from "../config";

export interface StreamingProvider {
  id: string;
  name: string;
  tmdbId: string;
  color: string;
  logoPath: string;
}

export const STREAMING_PROVIDERS: StreamingProvider[] = [
  {
    id: "netflix",
    name: "Netflix",
    tmdbId: "8",
    color: "#E50914",
    logoPath: "/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg",
  },
  {
    id: "prime",
    name: "Prime Video",
    tmdbId: "9",
    color: "#00A8E1",
    logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
  },
  {
    id: "disney",
    name: "Disney+",
    tmdbId: "337",
    color: "#113CCF",
    logoPath: "/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
  },
  {
    id: "appletv",
    name: "Apple TV+",
    tmdbId: "350",
    color: "#A2AAAD",
    logoPath: "/6uhKBfmtzFqOcLousHwZuzcrScK.jpg",
  },
  {
    id: "hulu",
    name: "Hulu",
    tmdbId: "15",
    color: "#1CE783",
    logoPath: "/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg",
  },
  {
    id: "max",
    name: "Max",
    tmdbId: "1899|1825",
    color: "#002BE7",
    logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
  },
  {
    id: "paramount",
    name: "Paramount+",
    tmdbId: "2303|2616|582",
    color: "#0064FF",
    logoPath: "/h5DcR0J2EESLitnhR8xLG1QymTE.jpg",
  },
  {
    id: "peacock",
    name: "Peacock",
    tmdbId: "386|387|2553",
    color: "#F4B400",
    logoPath: "/2aGrp1xw3qhwCYvNGAJZPdjfeeX.jpg",
  },
];

interface ProvidersShelfProps {
  setViewingCategory: (category: string | null) => void;
}

export const ProvidersShelf: React.FC<ProvidersShelfProps> = memo(
  ({ setViewingCategory }) => {
    return (
      <section className="mb-12 relative">
        <div className="flex items-center justify-between mb-8 px-4 sm:px-0">
          <div className="flex items-center gap-3">
            <span className="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-nebula-cyan to-nebula-cyan/20 shrink-0" />
            <h3 className="text-xl md:text-2.5xl font-display font-black uppercase tracking-tighter text-white/90 leading-none">
              Providers
            </h3>
            <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] text-nebula-cyan uppercase border border-nebula-cyan/25 rounded px-1.5 py-0.5 leading-none">
              Official Feeds
            </span>
          </div>
          <div className="h-px flex-1 ml-6 bg-gradient-to-r from-white/10 to-transparent hidden sm:block" />
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-4 md:gap-6 lg:gap-8 xl:gap-10 w-full justify-items-center">
          {STREAMING_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              onClick={() => setViewingCategory(provider.name)}
              className="flex flex-col items-center gap-3 cursor-pointer group/card relative py-2 w-full select-none"
            >
              {/* Glow & Card Container */}
              <div className="relative">
                {/* Soft Brand Glow Ambient Lighting */}
                <div
                  className="absolute inset-0 rounded-[22px] opacity-0 group-hover/card:opacity-100 transition-all duration-500 blur-2xl -z-10 scale-125 pointer-events-none"
                  style={{
                    backgroundColor: provider.color,
                  }}
                />

                {/* App Icon Card */}
                <div
                  className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] lg:w-[88px] lg:h-[88px] rounded-[22px] overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-md transition-all duration-500 group-hover/card:scale-110 group-hover/card:-translate-y-2 origin-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-hover/card:shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-center relative after:absolute after:inset-0 after:rounded-[22px] after:border after:border-white/0 group-hover/card:after:border-white/20 after:transition-all after:duration-500"
                  style={{
                    boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`,
                  }}
                >
                  <img
                    src={`${API_BASE_URL}/api/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w154${provider.logoPath}`)}`}
                    alt={provider.name}
                    width="88"
                    height="88"
                    className="w-full h-full object-cover transition-all duration-500 opacity-75 group-hover/card:opacity-100 group-hover/card:scale-105"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Title Label */}
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 transition-all duration-500 group-hover/card:text-white/90 group-hover/card:scale-105 group-hover/card:-translate-y-0.5 text-center truncate w-full">
                {provider.name}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  },
);
