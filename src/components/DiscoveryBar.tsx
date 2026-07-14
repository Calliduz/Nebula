import React, { useState } from "react";
import { History, ChevronDown, Dices, RefreshCw, ShieldAlert, X } from "lucide-react";
import { SORTS } from "../data/constants";

// ─── Age Gate Confirmation Dialog ─────────────────────────────────────────────
const AgeGateDialog: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      onClick={onCancel}
    />
    {/* Dialog */}
    <div className="relative z-10 w-full max-w-sm bg-[#0a0a0a] border border-red-500/30 rounded-2xl p-6 shadow-[0_0_60px_rgba(229,9,20,0.2)]">
      {/* Close */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>

      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
        <ShieldAlert size={26} className="text-red-400" />
      </div>

      <h3 className="text-center text-lg font-display font-black tracking-tight text-white mb-2">
        Age Restricted Content
      </h3>
      <p className="text-center text-[11px] text-white/50 leading-relaxed mb-6 font-sans">
        By enabling this, you confirm that you are{" "}
        <span className="text-white/80 font-bold">18 years of age or older</span>
        . Adult-rated content will be unlocked across all categories and rows.
        This preference is saved to this device only.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/50 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all"
        >
          I'm 18+, Enable
        </button>
      </div>
    </div>
  </div>
);

// ─── DiscoveryBar ─────────────────────────────────────────────────────────────
export const DiscoveryBar = ({
  sortBy,
  setSortBy,
  onRandomize,
  onRefreshFeed,
  adultMode,
  setAdultMode,
}: any) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);

  const handleAdultToggle = () => {
    if (adultMode) {
      // Turning off — no confirmation needed
      setAdultMode(false);
    } else {
      // Turning on — check if already confirmed before
      const alreadyConfirmed =
        localStorage.getItem("nebula-adult-confirmed") === "true";
      if (alreadyConfirmed) {
        setAdultMode(true);
      } else {
        setShowAgeGate(true);
      }
    }
  };

  const handleAgeConfirm = () => {
    localStorage.setItem("nebula-adult-confirmed", "true");
    setAdultMode(true);
    setShowAgeGate(false);
  };

  const handleAgeCancel = () => {
    setShowAgeGate(false);
  };

  return (
    <>
      {showAgeGate && (
        <AgeGateDialog onConfirm={handleAgeConfirm} onCancel={handleAgeCancel} />
      )}

      <section className="mb-4 sm:mb-8 flex items-center justify-between md:justify-end gap-3 sm:gap-4">
        {" "}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="w-full flex items-center justify-between sm:justify-start gap-3 px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-dim hover:text-white transition-all"
            >
              <div className="flex items-center gap-2">
                <History size={14} className="text-nebula-cyan shrink-0" />
                <span className="truncate">Sort: {sortBy}</span>
              </div>
              <ChevronDown size={14} className="shrink-0" />
            </button>

            {isSortOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSortOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-full sm:w-48 bg-obsidian border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                  {SORTS.map((sort) => (
                    <button
                      key={sort}
                      onClick={() => {
                        setSortBy(sort);
                        setIsSortOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors text-dim hover:text-nebula-cyan"
                    >
                      {sort}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onRefreshFeed}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-nebula-cyan/10 border border-nebula-cyan/30 text-nebula-cyan text-[8px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-nebula-cyan hover:text-obsidian transition-all flex-1 md:flex-none"
          >
            <RefreshCw size={14} className="shrink-0" />
            <span className="truncate">Refresh Feed</span>
          </button>

          <button
            onClick={onRandomize}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-nebula-cyan/10 border border-nebula-cyan/30 text-nebula-cyan text-[8px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-nebula-cyan hover:text-obsidian transition-all flex-1 md:flex-none"
          >
            <Dices size={14} className="shrink-0" />
            <span className="truncate">Randomizer</span>
          </button>

          {/* 18+ Toggle */}
          <button
            id="adult-mode-toggle"
            onClick={handleAdultToggle}
            title={adultMode ? "Disable 18+ content" : "Enable 18+ content"}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none ${
              adultMode
                ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                : "bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/8"
            }`}
          >
            <ShieldAlert size={14} className="shrink-0" />
            <span className="truncate">
              18+{adultMode ? " On" : " Off"}
            </span>
          </button>
        </div>
      </section>
    </>
  );
};
