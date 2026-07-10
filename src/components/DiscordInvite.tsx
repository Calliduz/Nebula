import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";

export const DiscordInvite = () => {
  const [dismissed, setDismissed] = useLocalStorage(
    "nebula-discord-invite-dismissed",
    false,
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!dismissed) {
      // Delay showing the invite card so it doesn't pop in instantly on load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for exit animation to complete before updating localStorage to prevent layout flash
    setTimeout(() => {
      setDismissed(true);
    }, 400);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-24 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[90] w-auto sm:w-96 rounded-2xl bg-obsidian/90 border border-white/10 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(88,101,242,0.15)] flex flex-col gap-4 group hover:border-[#5865F2]/40 transition-colors duration-300"
        >
          {/* Decorative ambient background glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#5865F2]/0 via-[#5865F2]/10 to-[#5865F2]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              {/* Discord Purple SVG Icon Container */}
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-[#5865F2] shrink-0 shadow-[0_0_15px_rgba(88,101,242,0.1)]">
                <svg
                  className="w-5.5 h-5.5 fill-current"
                  viewBox="0 0 127.14 96.36"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.51,2a68.32,68.32,0,0,1-10.5,5,77.91,77.91,0,0,0,6.63,10.85,105.73,105.73,0,0,0,32.58-18.83C129.07,48.45,123.07,25.68,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-[15px] text-white tracking-wide leading-tight">
                  Join our Discord Server
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#5865F2]/80 mt-0.5">
                  Community Uplink
                </span>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-white/40 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            <p className="text-white/60 text-xs font-sans leading-relaxed">
              Connect with fellow members, get the latest streaming updates,
              request features, and get support!
            </p>

            <a
              href="https://discord.gg/EYVm7HkMTM"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold font-display uppercase tracking-wider text-center flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(88,101,242,0.3)] hover:shadow-[0_4px_20px_rgba(88,101,242,0.5)] active:scale-[0.98]"
            >
              Connect to Discord
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
