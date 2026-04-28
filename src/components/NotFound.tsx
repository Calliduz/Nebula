import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Home, Compass, ShieldAlert } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[100] bg-obsidian flex items-center justify-center overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-nebula-cyan/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-nebula-cyan/5 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <div className="relative z-10 max-w-2xl w-full px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-nebula-cyan/20 blur-2xl rounded-full scale-150" />
              <ShieldAlert size={80} className="text-nebula-cyan relative z-10 animate-bounce" />
            </div>
          </div>
          
          <h1 className="text-[120px] md:text-[180px] font-display font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 mb-4 select-none">
            404
          </h1>
          
          <p className="text-nebula-cyan font-display font-black text-xs uppercase tracking-[0.4em] mb-8">
            Signal Lost in Deep Space
          </p>
          
          <p className="text-dim text-lg md:text-xl font-light mb-12 max-w-md mx-auto leading-relaxed">
            The record you are looking for has been purged or moved to a restricted sector.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-nebula-cyan text-obsidian font-display font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group shadow-[0_0_30px_rgba(0,243,255,0.3)]"
            >
              <Home size={16} />
              Return to Base
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-display font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <Compass size={16} />
              Explore Registry
            </button>
          </div>
        </motion.div>
        
        {/* Decorative Grid */}
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[200%] h-60 bg-[radial-gradient(#00f3ff22_1px,transparent_1px)] [background-size:40px_40px] [mask-image:linear-gradient(to_top,black,transparent)] opacity-20 pointer-events-none" />
      </div>
      
      {/* HUD Elements */}
      <div className="absolute top-10 left-10 hidden md:block">
        <div className="text-nebula-cyan/30 text-[10px] font-mono tracking-widest uppercase mb-1">Sector_7G</div>
        <div className="h-0.5 w-20 bg-nebula-cyan/20 rounded-full" />
      </div>
      
      <div className="absolute bottom-10 right-10 hidden md:block">
        <div className="text-white/20 text-[10px] font-mono tracking-widest uppercase mb-1">Coord: 0.0.0.0</div>
        <div className="h-0.5 w-24 bg-white/10 rounded-full" />
      </div>
    </div>
  );
};
