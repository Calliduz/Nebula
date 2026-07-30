import React from "react";
import { Search } from "lucide-react";
import { NAV_ITEMS } from "../data/constants";

export const TopNav = React.memo(
  ({
    activeTab,
    onTabChange,
    scrolled,
    onSearchClick,
    viewingCategory,
    setViewingCategory,
  }: any) => {
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
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={onSearchClick}
              className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all duration-300 cursor-pointer hover:scale-105 hover:border-nebula-cyan/50"
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[100] bg-black/95 backdrop-blur-2xl border-t border-white/10 px-3 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.map((item) => {
              const isActive = isItemActive(item.id);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "search") {
                      onSearchClick();
                    } else {
                      setViewingCategory(null);
                      onTabChange(item.id);
                    }
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "text-nebula-cyan bg-nebula-cyan/10 border border-nebula-cyan/30"
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
