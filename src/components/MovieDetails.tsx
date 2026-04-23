import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Star, Clock, Calendar, Shield, AudioWaveform as Waveform, Sparkles, Maximize, Play, X, Plus } from 'lucide-react';
import { handleImageError } from '../utils/helpers';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getMediaDetails, getMediaBasicInfo, enrichMoviesWithMetadata, getTVDetails, getTVSeasonEpisodes } from '../services/tmdb';

interface MovieDetailsProps {
  movie?: any;
  onClose: () => void;
  onPlay: (season?: number, episode?: number) => void;
  onSelectMovie?: (m: any) => void;
  isInList: boolean;
  onToggleList: () => void;
}

export const MovieDetails: React.FC<MovieDetailsProps> = ({ movie: initialMovie, onClose, onPlay, onSelectMovie, isInList, onToggleList }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState<any>(initialMovie);
  const [activeTab, setActiveTab] = useState(initialMovie?.type === 'tv' ? 'Episodes' : 'Overview');
  const [deepDetails, setDeepDetails] = useState<{trailers: any[], similar: any[], cast: any[]}>({
    trailers: [],
    similar: [],
    cast: []
  });
  
  const [tvDetails, setTvDetails] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEverything = async () => {
      setIsLoading(true);
      
      let currentMovie = movie;
      const type = location.pathname.includes('/tv/') ? 'tv' : 'movie';
      const tmdbId = id || movie?.id;

      if (!currentMovie && tmdbId) {
        // Landing directly on the URL
        if (typeof tmdbId === 'string' && tmdbId.startsWith('k')) {
           // It's a KissKH drama! Set placeholder to trigger KissKH fetch
           currentMovie = { id: tmdbId, type: 'tv', origin: 'kisskh' };
           setMovie(currentMovie);
        } else {
          const basic = await getMediaBasicInfo(tmdbId, type);
          if (basic) {
            // Enrich with premium assets immediately
            const enriched = await enrichMoviesWithMetadata([basic]);
            currentMovie = enriched[0];
            setMovie(currentMovie);
          }
        }
      }

      if (currentMovie) {
        if (currentMovie.origin === 'kisskh') {
          try {
            const rawApi = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
            const apiBase = rawApi.replace(/\/api\/?$/, '').replace(/\/$/, '');
            const r = await fetch(`${apiBase}/api/drama/detail/${currentMovie.id}`);
            const data = await r.json();
            if (data) {
              setMovie({ ...currentMovie, description: data.description || currentMovie.description });
              setEpisodes(data.episodes || []);
              setTvDetails({
                number_of_seasons: 1,
                seasons: [{ season_number: 1, name: "Season 1", episode_count: data.episodes?.length || 0 }]
              });
            }
          } catch (e) {
            console.error('Failed to fetch KissKH details', e);
          }
        } else {
          const details = await getMediaDetails(currentMovie.id, currentMovie.type);
          setDeepDetails(details);
          
          if (currentMovie.type === 'tv') {
            const tvInfo = await getTVDetails(currentMovie.id);
            if (tvInfo) {
              setTvDetails(tvInfo);
              const eps = await getTVSeasonEpisodes(currentMovie.id, 1);
              setEpisodes(eps);
            }
          }
        }
      }
      setIsLoading(false);
    };
    fetchEverything();
  }, [id, initialMovie?.id]);

  useEffect(() => {
    if (movie?.type === 'tv' && movie?.id && movie?.origin !== 'kisskh') {
      getTVSeasonEpisodes(movie.id, activeSeason).then(setEpisodes);
    }
  }, [activeSeason]);

  if (!movie && isLoading) return <div className="fixed inset-0 z-[200] bg-obsidian flex items-center justify-center text-white">Establishing Satellite Link...</div>;
  if (!movie) return null;

  const accentColor = movie.accent || '#00E5FF';
  const TABS = movie.type === 'tv' ? ['Episodes', 'Overview', 'Trailers & Extras', 'Related Titles'] : ['Overview', 'Trailers & Extras', 'Related Titles'];

  const logoTitle = movie.clearLogo ? (
    <div className="mb-8 lg:mb-12">
      <img 
        src={movie.clearLogo} 
        alt={movie.title} 
        className="h-20 sm:h-28 md:h-40 w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
        referrerPolicy="no-referrer"
        onError={handleImageError}
      />
    </div>
  ) : (
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tight mb-8 uppercase leading-[0.9] break-words max-w-2xl drop-shadow-2xl">
      {movie.title}
    </h1>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[150] bg-obsidian overflow-y-auto overflow-x-hidden custom-scrollbar"
    >
      <div className="absolute inset-x-0 top-0 h-[70vh] z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-obsidian/60 to-obsidian z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/40 to-transparent z-10" />
        <img 
          src={movie.fanartBackground || movie.backdrop || movie.image} 
          className="w-full h-full object-cover blur-[2px] scale-110 opacity-40 origin-center" 
          alt="" 
          referrerPolicy="no-referrer" onError={handleImageError}
        />
        <div 
          className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] blur-[150px] opacity-30 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 lg:px-10 pt-10 pb-20">
        <button 
          onClick={onClose}
          className="flex items-center gap-3 text-dim hover:text-white mb-8 lg:mb-16 transition-all group w-fit"
        >
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-nebula-cyan group-hover:bg-white/5 transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-xs font-bold tracking-[0.2em] uppercase">Back to Browse</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start w-full">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-[300px] sm:max-w-[350px] mx-auto lg:mx-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative group shrink-0"
          >
            <img src={movie.image} className="w-full h-full object-cover" alt={movie.title} referrerPolicy="no-referrer" onError={handleImageError} />
            <div className="absolute inset-0 border-[1px] border-white/20 rounded-2xl pointer-events-none" />
          </motion.div>

          <div className="flex-1 w-full overflow-hidden">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {logoTitle}
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-8 text-xs sm:text-sm font-bold tracking-widest text-dim uppercase">
                <span className="flex items-center gap-2"><Star size={16} className="text-nebula-cyan fill-nebula-cyan" /> {movie.imdb || movie.rating}</span>
                <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                <span className="flex items-center gap-2"><Clock size={16} /> {movie.duration || '124m'}</span>
                <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                <span className="flex items-center gap-2"><Calendar size={16} /> {movie.year}</span>
              </div>

              <p className="text-lg text-white/70 font-light leading-relaxed mb-10 max-w-2xl">
                {movie.description}
              </p>

              <div className="flex flex-wrap gap-4 sm:gap-6 mb-16">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPlay(movie.type === 'tv' ? 1 : undefined, movie.type === 'tv' ? 1 : undefined)}
                  className="bg-white text-obsidian px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm glow-white flex items-center justify-center gap-3 transition-all hover:bg-nebula-cyan flex-1 sm:flex-none"
                >
                  <Play size={20} fill="currentColor" /> <span>Watch Now</span>
                </motion.button>
                <motion.button 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  onClick={onToggleList}
                  className={`px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all border flex-1 sm:flex-none ${
                    isInList ? 'bg-nebula-cyan/20 border-nebula-cyan text-nebula-cyan' : 'bg-white/5 border-white/10 text-white'
                  }`}
                >
                  {isInList ? <X size={20} /> : <Plus size={20} />} <span>{isInList ? 'Remove' : 'Add to List'}</span>
                </motion.button>
              </div>
            </motion.div>

            <div className="border-b border-white/10 mb-10 flex gap-6 sm:gap-12 overflow-x-auto custom-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] relative transition-colors whitespace-nowrap ${
                    activeTab === tab ? 'text-nebula-cyan' : 'text-dim hover:text-white'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="active-tab" 
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-nebula-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]" 
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-12">
              {activeTab === 'Episodes' && movie.type === 'tv' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {tvDetails?.seasons?.length > 0 && (
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {tvDetails.seasons.filter((s: any) => s.season_number > 0).map((s: any) => (
                          <button
                            key={s.season_number}
                            onClick={() => setActiveSeason(s.season_number)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeSeason === s.season_number ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                          >
                            Season {s.season_number}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {episodes.map((ep: any) => (
                        <div key={ep.episode_number} className="group relative bg-white/5 rounded-xl border border-white/10 overflow-hidden flex flex-col cursor-pointer transition-all hover:bg-white/10 hover:border-white/30" onClick={() => onPlay(activeSeason, ep.episode_number)}>
                           <div className="aspect-video bg-black/50 relative overflow-hidden">
                             {ep.still_path ? (
                               <img src={ep.still_path} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500" alt={ep.name} />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-white/20"><Play size={32} /></div>
                             )}
                             <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-all" />
                             <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded font-bold text-[10px] text-white backdrop-blur">E{ep.episode_number}</div>
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-12 h-12 bg-nebula-cyan/90 text-obsidian rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-110 transition-all">
                                  <Play size={20} fill="currentColor" className="ml-1" />
                                </div>
                             </div>
                           </div>
                           <div className="p-4 flex flex-col flex-1">
                              <h4 className="font-bold text-sm text-white group-hover:text-nebula-cyan transition-colors line-clamp-1 mb-1">{ep.episode_number}. {!ep.name || ep.name.includes("Episode") ? `Episode ${ep.episode_number}` : ep.name}</h4>
                              <p className="text-xs text-dim line-clamp-2 mt-auto">{ep.overview || "No description available."}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                </motion.div>
              )}

              {activeTab === 'Overview' && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-12"
                 >
                   <div className="w-full">
                     <h3 className="text-[10px] sm:text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-4 sm:mb-6">Director's Cut Cast</h3>
                      <div className="flex gap-6 sm:gap-10 overflow-x-auto pb-6 no-scrollbar touch-pan-x">
                        {deepDetails.cast.length > 0 ? deepDetails.cast.map((person: any, i: number) => (
                          <div key={`${person.name}-${person.role}-${i}`} className="flex flex-col items-center gap-4 group cursor-pointer shrink-0">
                            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-white/10 p-1.5 group-hover:border-nebula-cyan transition-all duration-500 overflow-hidden relative">
                              <img src={person.avatar} className="w-full h-full rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={person.name} />
                              <div className="absolute inset-0 bg-nebula-cyan/0 group-hover:bg-nebula-cyan/10 transition-colors" />
                            </div>
                            <div className="text-center w-24 sm:w-32">
                              <p className="text-xs sm:text-sm font-bold text-white group-hover:text-nebula-cyan transition-colors line-clamp-1">{person.name}</p>
                              <p className="text-[10px] sm:text-[11px] font-medium text-dim uppercase tracking-wider mt-1 line-clamp-1">{person.role}</p>
                            </div>
                          </div>
                        )) : <p className="text-dim text-xs">Cast protocols unavailable for this record.</p>}
                      </div>
                   </div>
                 </motion.div>
              )}

              {activeTab === 'Trailers & Extras' && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                 >
                   {deepDetails.trailers.length > 0 ? deepDetails.trailers.map((video: any, i: number) => (
                     <a 
                       key={`trailer-${video.id}`} 
                       href={`https://www.youtube.com/watch?v=${video.key}`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="space-y-4 group cursor-pointer"
                     >
                       <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-white/5">
                         <img 
                           src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`} 
                           className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" 
                           alt={video.name} 
                           referrerPolicy="no-referrer" onError={handleImageError}
                         />
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                         
                         {/* Centered Play Button Overlay */}
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-nebula-cyan group-hover:text-obsidian transition-all group-hover:scale-110 shadow-xl">
                              <Play size={24} fill="currentColor" className="ml-1" />
                           </div>
                         </div>
                       </div>
                       <div>
                         <h4 className="text-sm font-bold text-white group-hover:text-nebula-cyan transition-colors truncate">
                            {video.name}
                         </h4>
                         <p className="text-[10px] text-dim font-bold mt-1 uppercase tracking-widest">{video.type} • 4K Stream</p>
                       </div>
                     </a>
                   )) : <p className="text-dim text-xs col-span-full py-10 text-center border border-dashed border-white/10 rounded-2xl">No intercepted trailer signals for this mission.</p>}
                 </motion.div>
              )}

              {activeTab === 'Related Titles' && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                 >
                   {deepDetails.similar.length > 0 ? deepDetails.similar.map((m: any, i: number) => (
                     <div 
                       key={`rel-${movie.id}-${m.id}-${i}`} 
                       onClick={() => onSelectMovie?.(m)}
                       className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer relative"
                     >
                       <img src={m.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500" referrerPolicy="no-referrer" onError={handleImageError} />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <p className="text-[10px] font-bold text-nebula-cyan mb-1 uppercase tracking-widest truncate">{m.genre}</p>
                          <p className="text-xs font-bold text-white leading-tight line-clamp-2">{m.title}</p>
                       </div>
                     </div>
                   )) : <p className="text-dim text-xs col-span-full py-10 text-center border border-dashed border-white/10 rounded-2xl">No related mission vectors identified.</p>}
                 </motion.div>
              )}
            </div>
          </div>
        </div>
        
        {/* Generous bottom padding to fix scrollbar desync bug */}
        <div className="h-40 w-full pointer-events-none" />
      </div>
    </motion.div>
  );
};
