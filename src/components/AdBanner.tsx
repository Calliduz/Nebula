import React, { useEffect, useRef, useMemo } from 'react';

interface AdBannerProps {
  label?: string;
  className?: string;
}

/**
 * AdBanner Component - Optimized for Adsterra Native Banners
 * Supports multiple instances by generating unique IDs
 */
export const AdBanner: React.FC<AdBannerProps> = ({ label = "Sponsorship Intelligence", className = "" }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Use the specific container ID from the provided snippet
  const containerId = "container-871bc81b5a654bd07becd29b01ff006d";

  useEffect(() => {
    if (!iframeRef.current) return;

    const srcDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; background: transparent; display: flex; justify-content: center; }
            #${containerId} { width: 100%; min-height: 220px; display: flex; justify-content: center; }
          </style>
        </head>
        <body>
          <div id="${containerId}"></div>
          <script async="async" data-cfasync="false" src="https://pl29378466.profitablecpmratenetwork.com/871bc81b5a654bd07becd29b01ff006d/invoke.js"></script>
        </body>
      </html>
    `;

    iframeRef.current.srcdoc = srcDoc;
  }, []);

  return (
    <div className={`w-full py-6 ${className}`}>
      <div className="relative group overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md p-6 transition-all hover:bg-white/[0.05] hover:border-white/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-nebula-cyan/5 blur-3xl -mr-16 -mt-16 rounded-full" />
        
        <div className="flex flex-col items-center justify-center min-h-[240px] relative z-10 text-center gap-4">
          <div className="flex items-center gap-2 opacity-30">
            <div className="w-1 h-1 rounded-full bg-nebula-cyan" />
            <span className="text-[9px] uppercase tracking-[0.3em] font-black italic">{label}</span>
            <div className="w-1 h-1 rounded-full bg-nebula-cyan" />
          </div>

          <div className="w-full flex justify-center overflow-hidden min-h-[200px]">
            <iframe
              ref={iframeRef}
              title="Sponsorship Feed"
              className="w-full border-0 overflow-hidden"
              style={{ height: '220px' }}
              scrolling="no"
              frameBorder="0"
            />
          </div>
          
          <div className="mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">
            Ad Policy: Non-Intrusive
          </div>
        </div>
      </div>
    </div>
  );
};
