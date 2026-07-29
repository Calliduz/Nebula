import React from "react";
import { Search } from "lucide-react";
import { NAV_ITEMS } from "../data/constants";

export const TopNav = ({
  activeTab,
  onTabChange,
  scrolled,
  onSearchClick,
  viewingCategory,
  setViewingCategory,
}: any) => {
  return (
    <>
      <header
        className={`nav-glow-border fixed top-0 inset-x-0 z-[100] transition-[background-color,box-shadow] duration-500 flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 md:py-4 ${
          scrolled
            ? "bg-obsidian shadow-[0_4px_30px_rgba(0,0,0,0.8)] nav-scrolled"
            : "glass-header"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-4 sm:gap-12">
          <div
            onClick={() => onTabChange("home")}
            className="cursor-pointer group flex items-center gap-2.5"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <img
                src="/nebula-icon.png"
                alt="Nebula Logo"
                className="w-full h-full object-contain transition-[filter] duration-300 group-hover:[filter:drop-shadow(0_0_8px_rgba(0,229,255,0.6))]"
              />
            </div>
            <span className="text-[14px] md:text-lg font-black tracking-tighter uppercase text-white group-hover:text-nebula-cyan transition-colors duration-300 hidden sm:block">
              Nebula
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_ITEMS.filter((n) => n.id !== "search").map((item) => {
              const isActive = activeTab === item.id && !viewingCategory;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "my-list") setViewingCategory("My List");
                    else onTabChange(item.id);
                  }}
                  className={`animated-underline relative text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 hover:text-nebula-cyan ${
                    isActive ? "text-white" : "text-white/50"
                  }`}
                >
                  {item.label}
                  {/* Active dot */}
                  {isActive && (
                    <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-nebula-cyan shadow-[0_0_6px_rgba(0,229,255,0.9)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={onSearchClick}
            className="flex items-center gap-2.5 text-white/70 hover:text-nebula-cyan transition-colors duration-300 group"
            aria-label="Search (Ctrl+K)"
          >
            <Search size={20} strokeWidth={2.5} />
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

      {/* Floating Glass Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-2 sm:bottom-3 inset-x-0 z-[100] px-3 sm:px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto relative rounded-3xl bg-black/85 backdrop-blur-2xl border border-white/12 shadow-[0_12px_40px_rgba(0,0,0,0.9),_0_0_20px_rgba(0,229,255,0.08)] px-3 py-2 flex items-center justify-around overflow-hidden">
          {/* Glass Specular Top Highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.id === "search" ? false : activeTab === item.id;
            return (
              <button
                key={`mobile-nav-${item.id}`}
                onClick={() => {
                  if (item.id === "search") onSearchClick();
                  else if (item.id === "my-list") setViewingCategory("My List");
                  else onTabChange(item.id);
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
                    isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" : ""
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
};
