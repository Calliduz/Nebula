import React from 'react';

interface AdBannerProps {
  label?: string;
  className?: string;
}

/**
 * AdBanner Component
 * Optimized for clean, non-intrusive placement in Nebula.
 * 
 * To integrate a real ad network:
 * 1. Replace the inner content with your provider's <ins> or <iframe> code.
 * 2. Use the 'A-Ads' or 'Monetag' script logic in a useEffect if required.
 */
export const AdBanner: React.FC<AdBannerProps> = ({ label = "Sponsorship Intelligence", className = "" }) => {
  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="relative group overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md p-4 transition-all hover:bg-white/[0.05] hover:border-white/10">
        {/* Decorative background elements to make it look premium */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-nebula-cyan/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-nebula-cyan/10 transition-colors" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 blur-2xl -ml-12 -mb-12 rounded-full" />

        <div className="flex flex-col items-center justify-center min-h-[120px] relative z-10 text-center gap-3">
          <div className="flex items-center gap-2 opacity-30">
            <div className="w-1 h-1 rounded-full bg-nebula-cyan" />
            <span className="text-[9px] uppercase tracking-[0.3em] font-black italic">{label}</span>
            <div className="w-1 h-1 rounded-full bg-nebula-cyan" />
          </div>

          {/* Placeholder for the actual Ad code */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-white/40 text-xs font-display italic">
              Commercial Uplink Placeholder
            </p>
            <p className="text-[10px] text-white/10 max-w-[280px] uppercase tracking-tighter">
              Replace this block with your ad network's code snippet to begin earning revenue.
            </p>
          </div>
          
          <div className="mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">
            Ad Policy: Non-Intrusive
          </div>
        </div>
      </div>
    </div>
  );
};
