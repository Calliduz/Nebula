import React, { useState, useRef, useEffect } from "react";
import { Cast, Tv } from "lucide-react";
import { useCast, type CastMetadata } from "../hooks/useCast";

interface CastButtonProps {
  streamUrl: string;
  metadata: CastMetadata;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
}

export const CastButton: React.FC<CastButtonProps> = ({
  streamUrl,
  metadata,
  videoRef,
  className = "",
}) => {
  const {
    isCastAvailable,
    isAirPlayAvailable,
    isCasting,
    activeDeviceName,
    triggerCast,
    triggerAirPlay,
  } = useCast();

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleCastClick = () => {
    // If only AirPlay is available (e.g. Safari on Mac/iOS)
    if (isAirPlayAvailable && !isCastAvailable) {
      triggerAirPlay(videoRef.current);
      return;
    }
    // If only Chromecast is available
    if (isCastAvailable && !isAirPlayAvailable) {
      triggerCast(streamUrl, metadata);
      return;
    }
    // If both are present, toggle mini picker dropdown
    if (isCastAvailable && isAirPlayAvailable) {
      setShowMenu((prev) => !prev);
      return;
    }
    // Default fallback try Chromecast then AirPlay
    if (
      videoRef.current &&
      (videoRef.current as any).webkitShowPlaybackTargetPicker
    ) {
      triggerAirPlay(videoRef.current);
    } else {
      triggerCast(streamUrl, metadata);
    }
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={handleCastClick}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all border ${
          isCasting
            ? "bg-indigo-600 text-white border-indigo-400 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.6)]"
            : showMenu
              ? "bg-white text-black border-white scale-105 shadow-md"
              : "bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 hover:scale-105"
        } ${className}`}
        title={
          isCasting
            ? `Casting to ${activeDeviceName || "TV"}`
            : "Cast to TV (Chromecast / AirPlay)"
        }
      >
        {isCasting ? (
          <div className="relative flex items-center justify-center">
            <Cast size={18} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          </div>
        ) : (
          <Cast size={18} />
        )}
      </button>

      {/* Selector Dropdown when both Cast and AirPlay are available */}
      {showMenu && (
        <div className="absolute top-12 right-0 bg-black/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-3 shadow-[0_25px_60px_rgba(0,0,0,0.95)] w-56 flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200 z-[250] text-left">
          <div className="px-2 pb-1.5 border-b border-white/5">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Tv size={13} className="text-nebula-cyan" />
              <span>Cast Options</span>
            </h3>
          </div>

          <button
            onClick={() => {
              setShowMenu(false);
              triggerCast(streamUrl, metadata);
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center gap-2.5"
          >
            <Cast size={15} className="text-indigo-400" />
            <span>Google Chromecast</span>
          </button>

          <button
            onClick={() => {
              setShowMenu(false);
              triggerAirPlay(videoRef.current);
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center gap-2.5"
          >
            <Tv size={15} className="text-sky-400" />
            <span>Apple AirPlay</span>
          </button>
        </div>
      )}
    </div>
  );
};
