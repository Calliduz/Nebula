import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  label?: string;
  className?: string;
}

/**
 * AdBanner Component - Optimized for Adsterra Native Banners
 */
export const AdBanner: React.FC<AdBannerProps> = ({ label = "Sponsorship Intelligence", className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    // Only inject once per component mount
    if (adInjected.current || !containerRef.current) return;
    
    try {
      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://pl29378466.profitablecpmratenetwork.com/871bc81b5a654bd07becd29b01ff006d/invoke.js';
      
      containerRef.current.appendChild(script);
      adInjected.current = true;
    } catch (e) {
      console.error("Adsterra Injection Failed", e);
    }
  }, []);

  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="relative group overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md p-4 transition-all hover:bg-white/[0.05] hover:border-white/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-nebula-cyan/5 blur-3xl -mr-16 -mt-16 rounded-full" />
        
        <div className="flex flex-col items-center justify-center min-h-[120px] relative z-10 text-center gap-3">
          <div className="flex items-center gap-2 opacity-30">
            <div className="w-1 h-1 rounded-full bg-nebula-cyan" />
            <span className="text-[9px] uppercase tracking-[0.3em] font-black italic">{label}</span>
            <div className="w-1 h-1 rounded-full bg-nebula-cyan" />
          </div>

          {/* Adsterra Native Banner Container */}
          <div 
            ref={containerRef}
            id="container-871bc81b5a654bd07becd29b01ff006d" 
            className="w-full flex justify-center overflow-hidden min-h-[90px]"
          />
          
          <div className="mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">
            Ad Policy: Non-Intrusive
          </div>
        </div>
      </div>
    </div>
  );
};
