import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Bell, User, ChevronDown } from 'lucide-react';
import { NAV_ITEMS, MOCK_PROFILES } from '../data/constants';

export const TopNav = ({ activeTab, onTabChange, scrolled, onSearchClick, viewingCategory, setViewingCategory }: any) => {


  return (
    <>
    <header className={`fixed top-0 inset-x-0 z-[100] transition-all duration-500 flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 md:py-4 ${scrolled ? 'bg-obsidian shadow-2xl' : 'glass-header'}`}>
      <div className="flex items-center gap-4 sm:gap-12">
        <div 
          onClick={() => onTabChange('home')}
          className="cursor-pointer group flex items-center gap-2"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 logo-gradient rounded-lg rotate-45 shadow-lg flex items-center justify-center overflow-hidden">
            <div className="w-3 h-3 bg-obsidian/30 rounded-sm" />
          </div>
          <span className="text-[14px] md:text-xl font-black tracking-tighter uppercase text-white group-hover:text-nebula-cyan transition-colors hidden sm:block">Nebula</span>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV_ITEMS.filter(n => n.id !== 'search').map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'my-list') setViewingCategory('My Secure Records');
                else {
                  onTabChange(item.id);
                }
              }}
              className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:text-nebula-cyan ${activeTab === item.id && !viewingCategory ? 'text-white' : 'text-white/40'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <button 
          onClick={onSearchClick}
          className="text-white hover:text-nebula-cyan transition-colors"
        >
          <Search size={22} />
        </button>

      </div>
    </header>
    
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-obsidian border-t border-white/10 px-6 py-4 pb-6 flex items-center justify-between z-[100] shadow-[0_-20px_40px_rgba(0,0,0,0.8)] shrink-0">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const isActive = item.id === 'search' ? false : activeTab === item.id;
        return (
          <button
            key={`mobile-nav-${item.id}`}
            onClick={() => {
              if (item.id === 'search') onSearchClick();
              else if (item.id === 'my-list') setViewingCategory('My Secure Records');
              else onTabChange(item.id);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-nebula-cyan' : 'text-white/40 hover:text-white/80'}`}
          >
            <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        )
      })}
    </nav>
    </>
  );
};
