import React from "react";

export function formatTime(s: number): string {
  if (!s || isNaN(s) || s <= 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export const parseMirrorName = (name: string) => {
  // Clean bracketed audio tags (e.g. "[Filipino]") and numeric index suffixes (e.g. "(2)")
  const clean = name
    .replace(/\s*\[.*?\]/g, "")
    .replace(/\s*\(\d+\)$/g, "")
    .trim();

  // First try parenthesized format: "Vidnest (1080p)"
  const parenMatch = clean.match(
    /^(.*?)\s*\((1080p|720p|480p|360p|Auto|Original)\)$/i,
  );
  if (parenMatch) {
    return { base: parenMatch[1].trim(), quality: parenMatch[2].trim() };
  }

  // Next try hyphen format: "VidRock - 1080p"
  const match = clean.match(/^(.*?)\s*-\s*(\d+p|Auto|Original)\s*\)?$/i);
  if (match) {
    let base = match[1].trim();
    if (clean.includes("(") && !base.endsWith(")")) {
      base = base + ")";
    }
    return { base, quality: match[2].trim() };
  }
  return { base: clean, quality: "Original" };
};

export const SOURCE_ALIASES: Record<string, string> = {
  Vaplayer: "Quantum",
  VidRock: "Hyperion",
  Vidrift: "Velocity",
  Videasy: "Pulse",
  VidLink: "Spectra",
  Vidnest: "Titan",
  "Kuro (Sub)": "Zenith (Sub)",
  "Kuro (Dub)": "Zenith (Dub)",
  Kuro: "Zenith",
  FilmU: "Orbital",
  Peachify: "Aurora",
  HDGharTV: "Aether",
  GharTV: "Aether",
  Aether: "Aether",
  NetNaija: "Vesper",
  Vesper: "Vesper",
};

export const getAudioFlagCode = (
  langStr?: string,
  defaultFlag?: string,
): string => {
  const l = (langStr || "").toLowerCase().trim();
  if (l.includes("korean") || l.includes("kor") || l === "ko") return "kr";
  if (l.includes("hindi") || l.includes("hin")) return "in";
  if (l.includes("german") || l.includes("deutsch") || l.includes("ger"))
    return "de";
  if (
    l.includes("spanish") ||
    l.includes("espanol") ||
    l.includes("spa") ||
    l.includes("mx") ||
    l.includes("lamovie")
  )
    return "mx";
  if (
    l.includes("brazil") ||
    l.includes("portuguese") ||
    l.includes("superflix")
  )
    return "br";
  if (l.includes("japan") || l.includes("japanese")) return "jp";
  if (l.includes("french") || l.includes("fre")) return "fr";
  if (l.includes("italian") || l.includes("ita")) return "it";
  if (l.includes("russian") || l.includes("rus")) return "ru";
  if (l.includes("chinese") || l.includes("zh")) return "cn";
  if (l.includes("tagalog") || l.includes("filipino")) return "ph";
  if (
    l.includes("yoruba") ||
    l.includes("hausa") ||
    l.includes("igbo") ||
    l.includes("nigeria")
  )
    return "ng";
  if (
    l.includes("indonesia") ||
    l.includes("indonesian") ||
    l.includes("indo")
  )
    return "id";
  if (l.includes("malay") || l.includes("malaysia")) return "my";
  if (l.includes("arabic") || l.includes("ara")) return "sa";
  if (l.includes("vietnamese") || l.includes("vie")) return "vn";
  if (l.includes("thai")) return "th";
  if (l.includes("turkish") || l.includes("tur")) return "tr";
  if (
    l.includes("dub") ||
    l.includes("english") ||
    l.includes("eng") ||
    l.includes("us")
  )
    return "us";

  if (defaultFlag) {
    const df = defaultFlag.toLowerCase();
    if (df === "en" || df === "eng") return "us";
    if (df === "ko" || df === "kor" || df.includes("kor")) return "kr";
    if (df === "ja" || df === "jpn" || df.includes("japan")) return "jp";
    if (df === "hi" || df === "hin" || df.includes("hindi")) return "in";
    return df;
  }

  return "us";
};

export const getCategoryAlias = (category: string): string => {
  if (!category) return "";
  if (SOURCE_ALIASES[category]) return SOURCE_ALIASES[category];
  const catLower = category.toLowerCase();
  if (catLower.startsWith("vaplayer")) return "Quantum";
  if (catLower.startsWith("vidrock")) return "Hyperion";
  if (
    catLower.startsWith("hdghartv") ||
    catLower.startsWith("ghartv") ||
    catLower.startsWith("aether")
  )
    return "Aether";
  if (catLower.startsWith("netnaija") || catLower.startsWith("vesper"))
    return "Vesper";
  if (catLower.startsWith("vidrift")) return "Velocity";
  if (catLower.startsWith("videasy")) return "Pulse";
  if (catLower.startsWith("vidlink")) return "Spectra";
  if (catLower.startsWith("vidnest")) return "Titan";
  if (catLower.startsWith("filmu")) return "Orbital";
  if (catLower.startsWith("peachify")) return "Aurora";
  if (catLower.startsWith("kuro")) {
    if (catLower.includes("dub")) return "Zenith (Dub)";
    if (catLower.includes("sub")) return "Zenith (Sub)";
    return "Zenith";
  }
  return category;
};

export const formatSubtitleSource = (rawSource?: string): string => {
  if (!rawSource) return "";
  const s = rawSource.trim();
  const sLower = s.toLowerCase();

  if (sLower === "opensubtitles") return "OpenSubtitles";
  if (sLower === "custom") return "Custom";

  const alias = getCategoryAlias(s);
  if (alias && alias.toLowerCase() !== sLower) {
    return alias;
  }

  if (sLower.includes("vidrock")) return "Hyperion";
  if (
    sLower.includes("hdghartv") ||
    sLower.includes("ghartv") ||
    sLower.includes("aether")
  )
    return "Aether";
  if (sLower.includes("vesper") || sLower.includes("netnaija")) return "Vesper";
  if (sLower.includes("vidnest")) return "Titan";
  if (sLower.includes("vaplayer")) return "Quantum";
  if (sLower.includes("vidrift")) return "Velocity";
  if (sLower.includes("filmu")) return "Orbital";
  if (sLower.includes("vidlink")) return "Spectra";
  if (sLower.includes("videasy")) return "Pulse";
  if (sLower.includes("peachify")) return "Aurora";
  if (sLower.includes("kuro")) return "Zenith";
  if (sLower.includes("vidvault")) return "VidVault";

  if (s.includes("(")) {
    const main = s.split("(")[0].trim();
    if (main) return main;
  }

  return s;
};

export const cleanSubProviderName = (name: string): string => {
  return name
    .replace(/HollyMovieHD/i, "Alpha")
    .replace(/MovieBox/i, "Beta")
    .replace(/AllMovies/i, "Gamma")
    .replace(/Vortex/i, "Alpha")
    .replace(/Zenith/i, "Beta")
    .replace(/Aura/i, "Gamma")
    .replace(/KuroAPI|Kuro/i, "Delta")
    .replace(/RiveStream|Rivestream/i, "Epsilon")
    .replace(/Bingr/i, "Zeta")
    .replace(/Showbox/i, "Eta");
};

export const parseMirrorDetails = (sourceName: string) => {
  // Extract trailing #\d+ or (\d+) if present
  let suffix = "";
  const suffixMatch = sourceName.match(/(.*?)\s*(?:#|\()(\d+)\)?$/);
  let cleanSource = sourceName;
  if (suffixMatch) {
    cleanSource = suffixMatch[1].trim();
    suffix = ` #${suffixMatch[2]}`;
  }

  // Remove bracketed audio tags e.g. [Filipino] for clean category matching
  cleanSource = cleanSource.replace(/\s*\[.*?\]/g, "").trim();

  // Parse cleanSource
  const match = cleanSource.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const rawCat = match[1].trim();
    const rawName = match[2].trim();
    const catAlias = getCategoryAlias(rawCat);
    const subClean = cleanSubProviderName(rawName);
    return {
      category: catAlias,
      name: (subClean + suffix).toUpperCase(),
    };
  }

  if (cleanSource.toLowerCase().startsWith("vaplayer")) {
    const rest = cleanSource.replace(/^Vaplayer[\s-]*/i, "").trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Quantum",
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }
  if (cleanSource.toLowerCase().startsWith("vidrock")) {
    const rest = cleanSource.replace(/^VidRock[\s-]*/i, "").trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Hyperion",
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }
  if (
    cleanSource.toLowerCase().startsWith("hdghartv") ||
    cleanSource.toLowerCase().startsWith("ghartv") ||
    cleanSource.toLowerCase().startsWith("aether")
  ) {
    const rest = cleanSource
      .replace(/^(HDGharTV|GharTV|Aether)[\s-]*/i, "")
      .trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Aether",
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }
  if (
    cleanSource.toLowerCase().startsWith("netnaija") ||
    cleanSource.toLowerCase().startsWith("vesper")
  ) {
    const rest = cleanSource.replace(/^(NetNaija|Vesper)[\s-]*/i, "").trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Vesper",
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }
  if (cleanSource.toLowerCase().startsWith("videasy")) {
    const rest = cleanSource.replace(/^Videasy[\s-]*/i, "").trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Pulse",
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }
  if (cleanSource.toLowerCase().startsWith("vidnest")) {
    const rest = cleanSource.replace(/^Vidnest[\s-]*/i, "").trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Titan",
      name: ((subClean || "Stream") + suffix).toUpperCase(),
    };
  }
  if (cleanSource.toLowerCase().startsWith("vidrift")) {
    const rest = cleanSource.replace(/^Vidrift[\s-]*/i, "").trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Velocity",
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }
  if (cleanSource.toLowerCase().startsWith("filmu")) {
    const rest = cleanSource.replace(/^FilmU[\s-]*/i, "").trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Orbital",
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }
  if (cleanSource.toLowerCase().startsWith("peachify")) {
    const rest = cleanSource.replace(/^Peachify[\s-]*/i, "").trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category: "Aurora",
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }
  if (cleanSource.toLowerCase().startsWith("kuro")) {
    const isDub =
      cleanSource.toUpperCase().includes(" DUB") ||
      cleanSource.toUpperCase().includes("(DUB");
    const category = isDub ? "Zenith (Dub)" : "Zenith (Sub)";
    const rest = cleanSource
      .replace(/^Kuro[\s-]*/i, "")
      .replace(/\(Sub\)|\(Dub\)|Sub|Dub/gi, "")
      .trim();
    const subClean = cleanSubProviderName(rest);
    return {
      category,
      name: ((subClean || "Mirror") + suffix).toUpperCase(),
    };
  }

  const alias = getCategoryAlias(cleanSource);
  return {
    category: alias || "Other",
    name: (cleanSource + suffix).toUpperCase(),
  };
};

export const serverSortOrder = [
  "prime",
  "catflix",
  "videasy",
  "allmovies",
  "moviesapi",
  "klikxxi",
  "vsembed",
  "superstream",
  "vidlink",
  "vidplay",
  "mycloud",
  "filemoon",
  "streamtape",
  "fast",
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "omicron",
  "pi",
  "rho",
  "sigma",
  "tau",
  "upsilon",
  "phi",
  "chi",
  "psi",
  "omega",
  "apex",
  "blaze",
  "cipher",
  "drift",
  "echo",
  "flux",
  "pulse",
  "titan",
  "vortex",
  "zenith",
  "aurora",
  "breeze",
  "comet",
  "dawn",
  "ember",
  "frost",
  "glimmer",
  "horizon",
  "iris",
  "jade",
  "kronos",
  "lunar",
  "mystic",
  "nexus",
  "orbit",
  "prism",
  "quasar",
  "radiant",
  "shadow",
  "solar",
  "tempest",
  "umbra",
  "velox",
  "wave",
  "xenon",
  "yield",
  "zephyr",
  "astra",
  "bolt",
  "cosmos",
  "dusk",
  "ether",
  "falcon",
  "galaxy",
  "halo",
  "ignite",
  "jupiter",
  "knight",
  "legend",
  "matrix",
  "nebula",
  "orion",
  "phoenix",
  "quantum",
  "radar",
  "stellar",
  "trident",
  "ultra",
  "vector",
  "wild",
  "xray",
  "yeti",
  "zenith",
  "abyss",
  "beacon",
  "climax",
  "dynamo",
  "exodus",
  "fusion",
  "gravity",
  "hyper",
  "infinity",
  "jolt",
  "kinetic",
  "lumos",
  "magma",
  "nitro",
  "omen",
  "raze",
  "nova",
  "atlas",
  "orion",
];

export const CATEGORY_PRIORITY = [
  "Quantum",
  "Vaplayer",
  "Hyperion",
  "VidRock",
  "Aether",
  "HDGharTV",
  "GharTV",
  "Vesper",
  "NetNaija",
  "Pulse",
  "Videasy",
  "Spectra",
  "VidLink",
  "Titan",
  "Vidnest",
  "Zenith (Sub)",
  "Kuro (Sub)",
  "Zenith (Dub)",
  "Kuro (Dub)",
  "Zenith",
  "Kuro",
  "Orbital",
  "FilmU",
  "Aurora",
  "Peachify",
  "Velocity",
  "Vidrift",
];

export const getMirrorPriority = (sourceName: string) => {
  const { category, name } = parseMirrorDetails(sourceName);
  const cleanName = name.toLowerCase();
  const cleanCategory = category.toLowerCase();

  for (let i = 0; i < serverSortOrder.length; i++) {
    const term = serverSortOrder[i];
    if (cleanName.includes(term) || cleanCategory.includes(term)) {
      return i;
    }
  }
  return 999;
};

export const sortMirrorsList = (list: any[]) => {
  return [...list].sort((a, b) => {
    // Primary: sort by provider category priority (e.g. Quantum/Vaplayer first, Hyperion/VidRock second)
    const { category: catA } = parseMirrorDetails(a.source);
    const { category: catB } = parseMirrorDetails(b.source);
    const cleanCatA = catA.toLowerCase();
    const cleanCatB = catB.toLowerCase();

    const catIdxA = CATEGORY_PRIORITY.findIndex((c) =>
      cleanCatA.startsWith(c.toLowerCase()),
    );
    const catIdxB = CATEGORY_PRIORITY.findIndex((c) =>
      cleanCatB.startsWith(c.toLowerCase()),
    );

    const catPrioA = catIdxA !== -1 ? catIdxA : 999;
    const catPrioB = catIdxB !== -1 ? catIdxB : 999;

    if (catPrioA !== catPrioB) {
      return catPrioA - catPrioB;
    }

    // Tie-breaker: sort sub-servers by serverSortOrder (e.g. PRIME, ALPHA, BETA)
    const prioA = getMirrorPriority(a.source);
    const prioB = getMirrorPriority(b.source);
    return prioA - prioB;
  });
};

export const getHlsLevelHeight = (
  l: any,
  index: number = 0,
  totalLevels: number = 1,
): number => {
  if (l && typeof l.height === "number" && l.height > 0) {
    return l.height;
  }

  const resAttr = l?.attrs?.RESOLUTION || l?.resolution;
  if (typeof resAttr === "string" && resAttr.includes("x")) {
    const parts = resAttr.split("x");
    const parsedH = parseInt(parts[1], 10);
    if (!isNaN(parsedH) && parsedH > 0) return parsedH;
  }

  const nameAttr = l?.attrs?.NAME || l?.name;
  if (typeof nameAttr === "string") {
    const parsedH = parseInt(nameAttr.replace(/\D/g, ""), 10);
    if (!isNaN(parsedH) && parsedH > 0) return parsedH;
  }

  const bitrate = l?.bitrate || 0;
  if (bitrate >= 3_500_000) return 1080;
  if (bitrate >= 1_800_000) return 720;
  if (bitrate >= 800_000) return 480;
  if (bitrate >= 400_000) return 360;
  if (bitrate > 0) return 240;

  if (totalLevels > 1) {
    const defaultHeights = [1080, 720, 480, 360, 240];
    return defaultHeights[Math.min(index, defaultHeights.length - 1)];
  }

  return 480;
};

export const groupMirrors = (mirrorsList: any[]) => {
  const groups: Record<string, any> = {};

  mirrorsList.forEach((m) => {
    if (m.type !== "mp4" && m.type !== "hls") {
      const groupKey = `${m.source}_${m.audio || ""}`;
      groups[groupKey] = { ...m };
      return;
    }

    const { base, quality } = parseMirrorName(m.source);
    const audioLabel = m.audio && m.audio !== "English" ? ` (${m.audio})` : "";
    const groupSource = `${base}${audioLabel}`;
    const groupKey = `${base}_${m.audio || ""}`;
    const height = parseInt(quality.replace(/\D/g, ""), 10) || 480;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        source: groupSource,
        url: m.url,
        type: m.type === "hls" ? "hls_grouped" : "mp4_grouped",
        audio: m.audio,
        flag: m.flag,
        qualities: [{ height, url: m.url, originalSource: m.source }],
      };
    } else {
      groups[groupKey].qualities.push({
        height,
        url: m.url,
        originalSource: m.source,
      });
    }
  });

  const groupedList = Object.values(groups).map((group: any) => {
    if (group.type === "mp4_grouped" || group.type === "hls_grouped") {
      group.qualities.sort((a: any, b: any) => b.height - a.height);
      group.url = group.qualities[0].url;
    }
    return group;
  });

  return sortMirrorsList(groupedList);
};

export const fetchCategoryMirrors = async (
  category: string,
  movie: any,
  season: number | undefined,
  episode: number | undefined,
  apiBase: string,
  fetchVideasyFn: Function,
  force: boolean = false,
): Promise<any[]> => {
  const forceParam = force ? "&force=1" : "";
  let data: any = null;

  if (category === "Videasy") {
    data = await fetchVideasyFn(movie, season, episode, apiBase);
  } else {
    let fetchUrl = "";
    if (category === "VidRock") {
      fetchUrl = `${apiBase}/api/vidrock?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    } else if (category === "FilmU") {
      fetchUrl = `${apiBase}/api/filmu?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}&releaseYear=${movie.year || ""}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    } else if (category === "Vidnest") {
      fetchUrl = `${apiBase}/api/vidnest?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    } else if (category === "Vaplayer") {
      fetchUrl = `${apiBase}/api/vaplayer?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    } else if (category === "Vidrift") {
      fetchUrl = `${apiBase}/api/vidrift?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    } else if (category === "NetNaija" || category === "Vesper") {
      fetchUrl = `${apiBase}/api/netnaija?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    } else if (category === "Peachify") {
      fetchUrl = `${apiBase}/api/peachify?tmdbId=${movie.id}&type=${movie.type}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    } else if (category === "Kuro") {
      fetchUrl = `${apiBase}/api/kuro?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    } else {
      // VidLink
      fetchUrl = `${apiBase}/api/stream?tmdbId=${movie.id}&type=${movie.type}&title=${encodeURIComponent(movie.title || "")}&releaseYear=${movie.year || ""}&releaseDate=${movie.release_date || ""}${forceParam}`;
      if (season !== undefined) fetchUrl += `&season=${season}`;
      if (episode !== undefined) fetchUrl += `&episode=${episode}`;
    }

    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} from backend`);
    data = await res.json();
  }

  let updatedMirrors: any[] = [];
  if (!data || typeof data !== "object") return [];

  if (category === "Videasy") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source: name.toLowerCase().startsWith("videasy")
          ? name
          : `Videasy (${name})`,
        url: v.url,
        type: v.type || "hls",
        audio: v.audio || "",
        flag: v.flag || "us",
      }));
  } else if (category === "VidRock") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source: name.toLowerCase().startsWith("vidrock")
          ? name
          : `VidRock (${name})`,
        url: v.url,
        type: v.type || "hls",
        audio: v.audio || "",
        flag: v.flag || "us",
      }));
  } else if (category === "FilmU") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source: name.toLowerCase().startsWith("filmu")
          ? name
          : `FilmU-${name}`,
        url: v.url,
        type: v.type || "hls",
        quality: (v as any).quality || "Auto",
      }));
  } else if (category === "Vidnest") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source: name.toLowerCase().startsWith("vidnest")
          ? name
          : `Vidnest (${name})`,
        url: v.url,
        type: v.type || "mp4",
        quality: (v as any).quality || "Auto",
      }));
  } else if (category === "Vaplayer") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source: name.toLowerCase().startsWith("vaplayer")
          ? name
          : `Vaplayer (${name})`,
        url: v.url,
        type: v.type || "hls",
        quality: (v as any).quality || "Auto",
      }));
  } else if (category === "Vidrift") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source: name.toLowerCase().startsWith("vidrift")
          ? name
          : `Vidrift (${name})`,
        url: v.url,
        type: v.type || "hls",
        quality: (v as any).quality || "Auto",
      }));
  } else if (category === "NetNaija" || category === "Vesper") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source:
          name.toLowerCase().startsWith("vesper") ||
          name.toLowerCase().startsWith("netnaija")
            ? name
            : `Vesper (${name})`,
        url: v.url,
        type: v.type || "mp4",
        quality: (v as any).quality || "Auto",
        audio: (v as any).audio || "",
        subtitles: v.subtitles || [],
      }));
  } else if (category === "Peachify") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source: name.toLowerCase().startsWith("peachify")
          ? name
          : `Peachify (${name})`,
        url: v.url,
        type: v.type || "hls",
        quality: (v as any).quality || "Auto",
      }));
  } else if (category === "Kuro") {
    updatedMirrors = Object.entries(data)
      .filter(([_, v]: any) => v && typeof v === "object" && Boolean(v.url))
      .map(([name, v]: any) => ({
        source: name.toLowerCase().startsWith("kuro")
          ? name
          : `Kuro (${name})`,
        url: v.url,
        type: v.type || "hls",
        quality: (v as any).quality || "Auto",
      }));
  } else {
    // VidLink
    const results = Array.isArray(data) ? data : data.results || [];
    updatedMirrors = results
      .filter((m: any) => m && m.url)
      .map((m: any) => ({
        source: m.source || "VidLink",
        url: m.url,
        type: m.type || "hls",
        quality: m.quality || "Auto",
      }));
  }

  return updatedMirrors;
};
