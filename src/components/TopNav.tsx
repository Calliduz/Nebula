import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Bell, User, ChevronDown } from 'lucide-react';
import { NAV_ITEMS, MOCK_PROFILES } from '../data/constants';

export const TopNav = ({ activeTab, onTabChange, scrolled, notifications, setNotificationsCount, profile, setProfile, onSearchClick, viewingCategory, setViewingCategory }: any) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);

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

        <div className="relative">
          <button 
            className={`relative transition-colors ${showNotifications ? 'text-nebula-cyan' : 'text-white hover:text-nebula-cyan'}`}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={22} />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-nebula-red rounded-full glow-red border border-obsidian" />
            )}
          </button>
          
          <AnimatePresence>
             {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-[-50px] sm:right-0 mt-4 w-[calc(100vw-32px)] sm:w-72 max-w-[320px] bg-black/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden origin-top-right z-50"
                >
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                     <span className="text-[10px] font-black tracking-widest text-white uppercase">Comms Link</span>
                     {notifications > 0 && (
                       <button 
                         className="text-[9px] text-nebula-cyan hover:text-white uppercase font-bold tracking-wider" 
                         onClick={() => setNotificationsCount?.(0)}
                       >
                         Clear All
                       </button>
                     )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications === 0 ? (
                      <div className="px-4 py-8 text-center text-dim text-[11px]">No active transmissions.</div>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer flex gap-3 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-nebula-cyan mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-white mb-0.5 leading-tight">Incoming Transmission: Outer Fringe</p>
                              <p className="text-[9px] text-dim line-clamp-2">New episodes of Nova Chronicles have been decrypted and are ready for viewing.</p>
                            </div>
                        </div>
                        <div className="px-4 py-3 hover:bg-white/5 cursor-pointer flex gap-3 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-transparent border border-white/30 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-white/70 mb-0.5 leading-tight">Security Update</p>
                              <p className="text-[9px] text-dim line-clamp-2">A new login was detected from Sector 4G. Ensure your credentials are secure.</p>
                            </div>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
             )}
          </AnimatePresence>
        </div>

        <div className="relative group cursor-pointer" onMouseEnter={() => setShowProfiles(true)} onMouseLeave={() => setShowProfiles(false)} onClick={() => setShowProfiles(!showProfiles)}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${profile.color} flex items-center justify-center overflow-hidden shadow-lg border border-white/10 group-hover:border-white transition-all`}>
              <User size={18} className="text-white/40" />
            </div>
            <ChevronDown size={14} className={`text-white/40 group-hover:text-white transition-all transform hidden sm:block ${showProfiles ? 'rotate-180' : ''}`} />
          </div>
          
          <AnimatePresence>
             {showProfiles && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-48 sm:w-56 bg-black/95 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl overflow-hidden origin-top-right z-50 py-2"
              >
                <div className="px-4 py-3 border-b border-white/5">
                   <p className="text-[9px] font-bold text-white/40 tracking-widest uppercase mb-3">Switch Profile</p>
                   <div className="space-y-2">
                     {MOCK_PROFILES.map(p => (
                       <div 
                         key={p.name} 
                         onClick={() => setProfile(p)}
                         className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${profile.name === p.name ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                       >
                         <div className={`w-6 h-6 rounded-md ${p.color} flex-shrink-0`} />
                         <span className={`text-[11px] font-bold ${profile.name === p.name ? 'text-white' : 'text-white/70'}`}>{p.name}</span>
                       </div>
                     ))}
                   </div>
                </div>
                <button className="w-full text-left px-4 py-2 mt-2 text-[10px] font-bold text-dim hover:text-white hover:bg-white/5 transition-all">Account Status</button>
                <button className="w-full text-left px-4 py-2 text-[10px] font-bold text-dim hover:text-white hover:bg-white/5 transition-all">Help Center</button>
                <div className="h-[1px] bg-white/5 my-1" />
                <button className="w-full text-left px-4 py-3 text-[10px] font-black text-center text-white hover:text-nebula-cyan transition-all">
                  SIGN OUT OF NEBULA
                </button>
              </motion.div>
             )}
          </AnimatePresence>
        </div>
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
