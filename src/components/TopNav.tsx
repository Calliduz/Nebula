import React from "react";
import { Search, Download, X, Smartphone, Globe } from "lucide-react";
import { NAV_ITEMS } from "../data/constants";
import { usePWAInstall } from "../hooks/usePWAInstall";

export const TopNav = React.memo(
  ({
    activeTab,
    onTabChange,
    scrolled,
    onSearchClick,
    viewingCategory,
    setViewingCategory,
  }: any) => {
    const { showInstallButton, handleInstallClick, showModal, closeModal } =
      usePWAInstall();

    const isItemActive = (itemId: string) => {
      if (itemId === "search") return false;
      if (itemId === "home") return activeTab === "home" && !viewingCategory;
      if (itemId === "movies")
        return (
          (activeTab === "movies" && !viewingCategory) ||
          viewingCategory === "Movies" ||
          viewingCategory === "Popular Movies"
        );
      if (itemId === "tv")
        return (
          (activeTab === "tv" && !viewingCategory) ||
          viewingCategory === "TV Shows" ||
          viewingCategory === "TV Dramas"
        );
      if (itemId === "library")
        return (
          (activeTab === "library" && !viewingCategory) ||
          viewingCategory === "Library" ||
          viewingCategory === "My List"
        );
      return activeTab === itemId;
    };

    return (
      <>
        <header
          className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 flex items-center justify-between px-3.5 sm:px-6 md:px-12 py-2.5 sm:py-3.5 md:py-4.5 ${
            scrolled
              ? "bg-black/90 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.85)]"
              : "bg-gradient-to-b from-black/85 via-black/35 to-transparent"
          }`}
        >
          {/* Smooth Bottom Specular Line - Opacity fade eliminates 1px border flash */}
          <div
            className={`absolute bottom-0 inset-x-0 h-[1px] bg-white/10 transition-opacity duration-500 pointer-events-none ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Brand */}
          <div className="flex items-center gap-4 sm:gap-12">
            <div
              onClick={() => {
                setViewingCategory(null);
                onTabChange("home");
              }}
              className="cursor-pointer group flex items-center gap-2.5"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <img
                  src="/nebula-icon.png"
                  alt="Nebula Logo"
                  className="w-full h-full object-contain transition-all duration-300 drop-shadow-[0_0_8px_rgba(0,229,255,0.3)] group-hover:drop-shadow-[0_0_14px_rgba(0,229,255,0.85)]"
                />
              </div>
              <span className="text-base md:text-xl font-display font-black tracking-tight uppercase bg-gradient-to-r from-white via-white/95 to-nebula-cyan/90 bg-clip-text text-transparent group-hover:drop-shadow-[0_0_12px_rgba(0,229,255,0.7)] transition-all duration-300 hidden sm:block">
                Nebula
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {NAV_ITEMS.filter((n) => n.id !== "search").map((item) => {
                const isActive = isItemActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setViewingCategory(null);
                      onTabChange(item.id);
                    }}
                    className={`relative text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "text-nebula-cyan drop-shadow-[0_0_12px_rgba(0,229,255,0.7)] scale-[1.03]"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] sm:text-[11px] font-semibold transition-all duration-300 active:scale-95 cursor-pointer"
                title="Install Nebula App"
              >
                <Download size={14} className="text-white/60" />
                <span>Install App</span>
              </button>
            )}

            <button
              onClick={onSearchClick}
              className="flex items-center gap-2 text-white/70 hover:text-nebula-cyan transition-all duration-300 group cursor-pointer p-2 sm:px-3 sm:py-1.5 rounded-full bg-white/5 sm:bg-transparent border border-white/10 sm:border-transparent active:scale-95 shadow-sm sm:shadow-none"
              aria-label="Search (Ctrl+K)"
            >
              <Search size={18} strokeWidth={2.5} className="sm:w-5 sm:h-5" />
              <span className="hidden lg:flex items-center gap-1 text-[9px] font-black text-white/25 group-hover:text-nebula-cyan/60 transition-colors duration-300 tracking-widest uppercase">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 group-hover:border-nebula-cyan/20 transition-colors duration-300 backdrop-blur-sm">
                  Ctrl
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 group-hover:border-nebula-cyan/20 transition-colors duration-300 backdrop-blur-sm">
                  K
                </kbd>
              </span>
            </button>
          </div>
        </header>

        {/* PWA Manual Install Guidance Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl overflow-hidden">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Install App
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Add Nebula to your home screen
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-white/70 leading-relaxed mb-5 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-start gap-2">
                  <Globe size={14} className="text-white/60 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">
                      Chrome / Brave / Edge:
                    </span>
                    <p className="text-white/50 text-[11px]">
                      Open menu{" "}
                      <span className="text-white font-semibold">(⋮)</span> and
                      tap{" "}
                      <span className="text-white font-semibold">
                        "Install App"
                      </span>{" "}
                      or{" "}
                      <span className="text-white font-semibold">
                        "Add to Home Screen"
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-1" />

                <div className="flex items-start gap-2">
                  <Smartphone
                    size={14}
                    className="text-white/60 shrink-0 mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-white">
                      iOS Safari:
                    </span>
                    <p className="text-white/50 text-[11px]">
                      Tap{" "}
                      <span className="text-white font-semibold">Share</span>{" "}
                      and tap{" "}
                      <span className="text-white font-semibold">
                        "Add to Home Screen"
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={closeModal}
                className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* Floating Glass Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-2 sm:bottom-3 inset-x-0 z-[100] px-3 sm:px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto relative rounded-3xl bg-black/85 backdrop-blur-2xl border border-white/12 shadow-[0_12px_40px_rgba(0,0,0,0.9),_0_0_20px_rgba(0,229,255,0.08)] px-3 py-2 flex items-center justify-around overflow-hidden">
            {/* Glass Specular Top Highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.id);
              return (
                <button
                  key={`mobile-nav-${item.id}`}
                  onClick={() => {
                    if (item.id === "search") onSearchClick();
                    else {
                      setViewingCategory(null);
                      onTabChange(item.id);
                    }
                  }}
                  className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-300 active:scale-90 cursor-pointer ${
                    isActive
                      ? "bg-nebula-cyan/15 text-nebula-cyan border border-nebula-cyan/30 shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                      : "text-white/45 hover:text-white/80 border border-transparent"
                  }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-all duration-300 ${
                      isActive
                        ? "scale-110 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                        : ""
                    }`}
                  />
                  <span
                    className={`text-[8.5px] font-black uppercase tracking-wider transition-colors ${
                      isActive ? "text-nebula-cyan" : "text-white/45"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </>
    );
  },
);
