import React, { memo, useState, useCallback, useEffect } from "react";
import {
  Sword,
  Laugh,
  Rocket,
  Skull,
  Sparkles,
  Drama,
  Eye,
  Heart,
  Film,
  Wand,
  Flame,
  Zap,
  User,
  Clapperboard,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import {
  getPopularPeople,
  getPopularDirectors,
  NebulaPersonSummary,
} from "../services/tmdb";
import { handleImageError } from "../utils/helpers";

type CategoryEntry = {
  name: string;
  key: string;
  icon: React.ElementType;
  adult?: boolean;
};

const BASE_CATEGORIES: CategoryEntry[] = [
  { name: "Action", key: "Action Packed Missions", icon: Sword },
  { name: "Comedy", key: "Comedy Gold", icon: Laugh },
  { name: "Sci-Fi", key: "Sci-Fi Spectacles", icon: Rocket },
  { name: "Horror", key: "Scary Nights (Horror)", icon: Skull },
  { name: "Anime", key: "Anime Series", icon: Sparkles },
  { name: "Drama", key: "TV Dramas", icon: Drama },
  { name: "Thriller", key: "Mystery & Suspense", icon: Eye },
  { name: "Romance", key: "Feel-Good Romance", icon: Heart },
  { name: "Documentary", key: "Documentary Collection", icon: Film },
  { name: "Fantasy", key: "Epic Fantasy Worlds", icon: Wand },
];

const ADULT_CATEGORIES: CategoryEntry[] = [
  { name: "Rated R", key: "Rated R Hits", icon: Flame, adult: true },
  { name: "Steamy Romance", key: "Steamy Romance", icon: Heart, adult: true },
  { name: "Erotic Thrillers", key: "Erotic Thrillers", icon: Zap, adult: true },
  { name: "Adult Anime", key: "Adult Anime", icon: Sparkles, adult: true },
];

const STUDIO_CATEGORIES = [
  {
    name: "Disney",
    key: "Disney",
    color: "from-blue-600/20 to-indigo-900/20",
    glow: "rgba(17, 60, 207, 0.4)",
    logo: "/wdrCwmRnLFJhEoH8GSfymY85KHT.png",
  },
  {
    name: "Marvel",
    key: "Marvel Studios",
    color: "from-red-600/20 to-red-800/20",
    glow: "rgba(229, 9, 20, 0.5)",
    logo: "/hUzeosd33nzE5MCNsZxCGEKTXaQ.png",
  },
  {
    name: "Columbia",
    key: "Columbia Pictures",
    color: "from-amber-500/20 to-blue-900/20",
    glow: "rgba(212, 175, 55, 0.3)",
    logo: "/71BqEFAF4V3qjjMPCpLuyJFB9A.png",
  },
  {
    name: "DreamWorks",
    key: "DreamWorks",
    color: "from-cyan-500/20 to-purple-900/20",
    glow: "rgba(0, 168, 225, 0.35)",
    logo: "/zcKhWbxFJ4CohZ9dLBMxmOArTVn.png",
  },
  {
    name: "20th Century",
    key: "20th Century Studios",
    color: "from-yellow-600/20 to-amber-900/20",
    glow: "rgba(255, 215, 0, 0.3)",
    logo: "/qZCc1lty5FzX30aOCVRBLzaVmcp.png",
  },
  {
    name: "Lionsgate",
    key: "Lionsgate",
    color: "from-neutral-900/20 to-neutral-850/20",
    glow: "rgba(197, 160, 89, 0.3)",
    logo: "/wxrHa3nZ1K4zo65p56991INkGo6.png",
  },
  {
    name: "Warner Bros.",
    key: "Warner Bros.",
    color: "from-sky-700/20 to-blue-900/20",
    glow: "rgba(13, 60, 155, 0.4)",
    logo: "/zhD3hhtKB5qyv7ZeL4uLpNxgMVU.png",
  },
  {
    name: "Universal",
    key: "Universal Pictures",
    color: "from-slate-900/20 to-blue-950/20",
    glow: "rgba(0, 46, 110, 0.4)",
    logo: "/8lvHyhjr8oUKOOy2dKXoALWKdp0.png",
  },
  {
    name: "Paramount",
    key: "Paramount Pictures",
    color: "from-sky-600/20 to-blue-900/20",
    glow: "rgba(0, 100, 255, 0.4)",
    logo: "/jay6WcMgagAklUt7i9Euwj1pzTF.png",
  },
  {
    name: "A24",
    key: "A24",
    color: "from-neutral-900/40 to-neutral-800/40",
    glow: "rgba(255, 255, 255, 0.2)",
    logo: "/1ZXsGaFPgrgS6ZZGS37AqD5uU12.png",
  },
];

interface CategoriesBarProps {
  setViewingCategory: (category: string | null) => void;
  adultMode?: boolean;
  onSelectActor?: (id: string | number) => void;
}

export const CategoriesBar: React.FC<CategoriesBarProps> = memo(
  ({ setViewingCategory, adultMode = false, onSelectActor }) => {
    const [activeSection, setActiveSection] = useState<
      "studios" | "genres" | "people"
    >("studios");
    const [peopleSubTab, setPeopleSubTab] = useState<
      "all" | "Acting" | "Directing"
    >("all");
    const [peopleList, setPeopleList] = useState<NebulaPersonSummary[]>([]);
    const [isPeopleLoading, setIsPeopleLoading] = useState(false);
    const [glowing, setGlowing] = useState<string | null>(null);

    const categories = adultMode
      ? [...BASE_CATEGORIES, ...ADULT_CATEGORIES]
      : BASE_CATEGORIES;

    // Fetch people when people tab is active
    useEffect(() => {
      if (activeSection !== "people") return;
      let isMounted = true;
      setIsPeopleLoading(true);

      const fetchFn =
        peopleSubTab === "Directing"
          ? getPopularDirectors(1)
          : getPopularPeople(peopleSubTab, 1);

      fetchFn
        .then((data) => {
          if (isMounted) {
            setPeopleList(data.slice(0, 10));
          }
        })
        .catch(() => {
          if (isMounted) setPeopleList([]);
        })
        .finally(() => {
          if (isMounted) setIsPeopleLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [activeSection, peopleSubTab]);

    const handleCategoryClick = useCallback(
      (cat: CategoryEntry) => {
        setGlowing(cat.key);
        setTimeout(() => {
          setGlowing(null);
          setViewingCategory(cat.key);
        }, 320);
      },
      [setViewingCategory],
    );

    const handleStudioClick = useCallback(
      (studio: (typeof STUDIO_CATEGORIES)[0]) => {
        setGlowing(studio.key);
        setTimeout(() => {
          setGlowing(null);
          setViewingCategory(studio.key);
        }, 320);
      },
      [setViewingCategory],
    );

    return (
      <section className="mb-10 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
          {/* Title Area */}
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-nebula-cyan via-nebula-cyan/80 to-transparent shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.6)]" />
            <h3 className="text-xl md:text-2.5xl font-display font-black uppercase tracking-tighter text-white/95 leading-none drop-shadow-md">
              Explore Library
            </h3>
            <span className="text-[8px] sm:text-[9px] font-black tracking-[0.2em] text-nebula-cyan uppercase bg-nebula-cyan/10 border border-nebula-cyan/30 rounded-md px-2 py-0.5 leading-none shadow-[0_0_10px_rgba(0,229,255,0.15)]">
              {activeSection === "studios"
                ? "Studios"
                : activeSection === "genres"
                  ? "Genres"
                  : "Creators"}
            </span>
            {adultMode && activeSection === "genres" && (
              <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.1em] text-red-400 uppercase bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-md leading-none">
                18+
              </span>
            )}
          </div>

          {/* Premium Tab Switcher */}
          <div className="flex items-center self-start sm:self-auto gap-1 sm:gap-1.5 bg-black/40 border border-white/10 p-1 sm:p-1.5 rounded-2xl backdrop-blur-xl relative z-25 shadow-xl">
            <button
              onClick={() => setActiveSection("studios")}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeSection === "studios"
                  ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-[1.02]"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              Studios
            </button>
            <button
              onClick={() => setActiveSection("genres")}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeSection === "genres"
                  ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-[1.02]"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              Genres
            </button>
            <button
              onClick={() => setActiveSection("people")}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeSection === "people"
                  ? "bg-gradient-to-r from-nebula-cyan to-nebula-cyan/80 text-obsidian font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-[1.02]"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              People
            </button>
          </div>
        </div>

        {/* Dynamic Display Panel */}
        {activeSection === "studios" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3.5 sm:gap-4 px-4 sm:px-0">
            {STUDIO_CATEGORIES.map((studio) => {
              const isGlowing = glowing === studio.key;
              return (
                <button
                  key={studio.key}
                  onClick={() => handleStudioClick(studio)}
                  className={`group relative flex flex-col items-center justify-between rounded-2xl sm:rounded-3xl h-28 sm:h-32 p-3.5 sm:p-4 bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-black/60 border border-white/10 hover:border-white/35 transition-all duration-500 overflow-hidden cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.8)] hover:-translate-y-1 ${
                    isGlowing ? "click-glow-once ring-2 ring-nebula-cyan" : ""
                  }`}
                >
                  {/* Glass Specular Top Highlight */}
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                  {/* Brand Ambient Radial Glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl scale-150 -z-10 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at center, ${studio.glow} 0%, transparent 70%)`,
                    }}
                  />

                  {/* Subtle Internal Brand Gradient Overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${studio.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-3xl`}
                  />

                  {/* Studio Brand Logo */}
                  <div className="h-14 sm:h-16 w-full flex items-center justify-center relative z-10 my-auto transition-transform duration-500 group-hover:scale-110">
                    <img
                      src={`${API_BASE_URL}/api/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w154${studio.logo}`)}`}
                      alt={studio.name}
                      className="max-h-full max-w-[85%] object-contain opacity-70 group-hover:opacity-100 transition-all duration-500 filter invert brightness-200 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                      loading="lazy"
                    />
                  </div>

                  {/* Studio Title Label */}
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-white/40 group-hover:text-white group-hover:text-nebula-cyan transition-all duration-500 relative z-10 truncate w-full text-center drop-shadow-md">
                    {studio.name}
                  </span>

                  {/* Bottom Cyan Accent Line */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-0 bg-gradient-to-r from-nebula-cyan via-white to-nebula-cyan transition-all duration-500 group-hover:w-4/5 rounded-full shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
                </button>
              );
            })}
          </div>
        ) : activeSection === "genres" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5 sm:gap-3 px-4 sm:px-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isGlowing = glowing === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat)}
                  className={`group relative flex items-center justify-center gap-2 rounded-2xl px-3.5 py-3.5 bg-white/[0.04] border transition-all duration-300 font-sans text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] text-white/60 hover:text-white overflow-hidden hover:-translate-y-0.5 shadow-lg ${
                    cat.adult
                      ? "border-red-500/20 hover:border-red-400/50 hover:bg-red-500/10"
                      : "border-white/10 hover:border-nebula-cyan/40 hover:bg-white/[0.08]"
                  } ${isGlowing ? "click-glow-once ring-2 ring-nebula-cyan" : ""}`}
                >
                  {/* Hover background glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      cat.adult
                        ? "from-red-500/15 to-transparent"
                        : "from-nebula-cyan/10 to-transparent"
                    }`}
                  />

                  {/* Icon */}
                  <Icon
                    size={13}
                    className={`relative z-10 shrink-0 transition-all duration-300 group-hover:scale-110 ${
                      cat.adult
                        ? "text-red-400 group-hover:text-red-300"
                        : "text-white/40 group-hover:text-nebula-cyan"
                    }`}
                  />

                  {/* Label */}
                  <span className="relative z-10 truncate">{cat.name}</span>

                  {/* Bottom underline */}
                  <div
                    className={`absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-300 group-hover:w-full ${
                      cat.adult ? "bg-red-400" : "bg-nebula-cyan"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          /* People / Creators Section */
          <div className="space-y-4 px-4 sm:px-0">
            {/* Sub-Filters & Explore All Action */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 p-1 rounded-xl">
                {(
                  [
                    { id: "all", label: "All Talent" },
                    { id: "Acting", label: "Actors" },
                    { id: "Directing", label: "Directors" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setPeopleSubTab(st.id)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      peopleSubTab === st.id
                        ? "bg-white/15 text-nebula-cyan font-bold border border-nebula-cyan/30 shadow-sm"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setViewingCategory("People")}
                className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-nebula-cyan hover:text-white transition-colors cursor-pointer group"
              >
                <span>Full Directory</span>
                <ArrowRight
                  size={13}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
            </div>

            {/* People Cards Grid */}
            {isPeopleLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={`people-skel-${i}`}
                    className="aspect-[3/4] rounded-2xl bg-white/[0.03] border border-white/5 p-3 flex flex-col justify-end gap-1.5 animate-pulse overflow-hidden relative"
                  >
                    <div className="absolute inset-0 shimmer-bg opacity-30" />
                    <div className="h-3 w-3/4 bg-white/10 rounded shimmer-bg relative z-10" />
                  </div>
                ))}
              </div>
            ) : peopleList.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-xs italic">
                No creators found.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
                {peopleList.map((person) => {
                  const isDirector =
                    person.department === "Directing" ||
                    person.department?.toLowerCase().includes("direct");

                  return (
                    <button
                      key={`cat-person-${person.id}`}
                      onClick={() => onSelectActor && onSelectActor(person.id)}
                      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 hover:border-nebula-cyan/60 transition-all duration-500 cursor-pointer shadow-lg hover:shadow-[0_8px_25px_rgba(0,229,255,0.2)] hover:-translate-y-1 flex flex-col justify-between p-2.5 sm:p-3 text-left"
                    >
                      {/* Full-Bleed Headshot Background */}
                      {person.avatar ? (
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110 filter brightness-95 group-hover:brightness-105"
                          loading="lazy"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950 flex items-center justify-center text-white/20">
                          {isDirector ? (
                            <Clapperboard size={24} />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                      )}

                      {/* Type badge — top-left corner tab */}
                      <div
                        className={`absolute top-0 left-0 z-20 pointer-events-none backdrop-blur-md text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-br-lg border-r border-b leading-none ${
                          isDirector
                            ? "bg-purple-950/90 text-purple-200 border-purple-500/30"
                            : "bg-cyan-950/90 text-nebula-cyan border-nebula-cyan/30"
                        }`}
                      >
                        {isDirector ? "Director" : "Actor"}
                      </div>

                      {/* Scrim Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 group-hover:opacity-95 transition-opacity duration-300 pointer-events-none" />
                      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />

                      {/* Glass Specular Top Highlight */}
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

                      {/* Spacer */}
                      <div className="h-4" />

                      {/* Bottom Info */}
                      <div className="relative z-10 w-full flex flex-col gap-0.5">
                        <span className="text-[10px] sm:text-[11px] font-display font-black uppercase tracking-tight text-white group-hover:text-nebula-cyan transition-colors truncate block w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight">
                          {person.name}
                        </span>
                        {person.known_for && person.known_for.length > 0 && (
                          <span className="text-[7.5px] sm:text-[8.5px] font-medium text-white/70 truncate block w-full drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                            {person.known_for.map((k: any) => k.title).join(" • ")}
                          </span>
                        )}
                      </div>

                      {/* Bottom Accent Glow Line */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-nebula-cyan via-white to-nebula-cyan transition-all duration-300 group-hover:w-4/5 rounded-full shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    );
  },
);
