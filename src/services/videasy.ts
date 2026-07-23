const b = [
  1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993,
  2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987,
  1925078388, 2162078206, 2614888103, 3248222580,
];
const f = [109, 118, 109, 49]; // "mvm1"

const I = (e: number) => ((e * (e + 1)) & 1) === 0;

function w(e: number): number {
  e >>>= 0;
  e ^= e >>> 16;
  e = Math.imul(e, 2246822507) >>> 0;
  e ^= e >>> 13;
  e = Math.imul(e, 3266489909) >>> 0;
  return (e ^= e >>> 16) >>> 0;
}

function y(e: number, t: number): number {
  e >>>= 0;
  t &= 31;
  if (t === 0) return e >>> 0;
  return ((e << t) | (e >>> (32 - t))) >>> 0;
}

function base64ToBytes(e: string): Uint8Array {
  const t = e.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(t);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decryptSources(
  ciphertext: string,
  seed: string,
  tmdbId: string,
): any {
  const o = base64ToBytes(ciphertext);

  const state = (() => {
    const s = Array(61);
    const seedHash = (() => {
      let t = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        t = Math.imul(t ^ seed.charCodeAt(i), 16777619) >>> 0;
      }
      return w(t);
    })();

    let a = w(seedHash ^ w((parseInt(tmdbId, 10) >>> 0) ^ 2654435769)) >>> 0;

    for (let e = 0; e < 8; e++) {
      if (I(e)) {
        const t = a % 61;
        a = y((a + 2654435769) >>> 0, 7 + (7 & e));
        s[t] = (a ^ w(a)) >>> 0;
        a = w((a + t) >>> 0);
      } else {
        s[e] = b[15 & e];
      }
    }

    return {
      S: s,
      acc: w(2779096485 ^ a) >>> 0,
    };
  })();

  function nextWord(stateObj: any, index: number): number {
    const oArr = stateObj.S;
    let r = stateObj.acc;
    const n = r % 61;
    const i = 0 - Number(n in oArr);
    const d = oArr[n] >>> 0;

    const s_val = r;
    const a_val = (d ^ (Math.imul(2654435769, index + 1) >>> 0)) >>> 0;
    let l_val = ((s_val ^ a_val) >>> 0) | ((s_val & a_val & i) >>> 0);

    l_val = (y((l_val + r) >>> 0, 31 & n) ^ y(r, 31 & Math.imul(n, 7))) >>> 0;
    r = w((l_val + 2654435769) >>> 0);
    oArr[n] = r >>> 0;
    stateObj.acc = r;
    return r >>> 0;
  }

  const keyBytes = new Uint8Array(o.length);
  let keyIndex = 0;
  for (let e = 0; e < o.length; ) {
    const t = nextWord(state, keyIndex++);
    keyBytes[e++] = t & 255;
    if (e < o.length) keyBytes[e++] = (t >>> 8) & 255;
    if (e < o.length) keyBytes[e++] = (t >>> 16) & 255;
    if (e < o.length) keyBytes[e++] = (t >>> 24) & 255;
  }

  for (let e = 0; e < o.length; e++) {
    const ob = o[e];
    const kb = keyBytes[e];
    if (ob !== undefined && kb !== undefined) {
      o[e] = ob ^ kb;
    }
  }

  for (let e = 0; e < f.length; e++) {
    const ob = o[e];
    const fb = f[e];
    if (ob === undefined || fb === undefined || ob !== fb) {
      throw new Error("decrypt failed: bad seed or tampered payload");
    }
  }

  const payload = o.subarray(f.length);
  const pt = new TextDecoder("utf-8").decode(payload);
  return JSON.parse(pt);
}

interface ProviderDef {
  name: string;
  path: string;
  extraParams?: Record<string, string>;
  filter?: (data: any) => any[];
  audio?: string;
  flag?: string;
}

const providers: ProviderDef[] = [
  { name: "Jett", path: "jett", audio: "Original audio", flag: "us" },
  { name: "Yoru", path: "cdn", audio: "Movies only, may have 4K", flag: "us" },
  { name: "Tejo", path: "tejo", audio: "Original audio", flag: "us" },
  { name: "Neon", path: "neon2", audio: "Original audio", flag: "us" },
  { name: "Sage", path: "ym", audio: "Original audio", flag: "us" },
  { name: "Cypher", path: "downloader2", audio: "Original audio", flag: "us" },
  { name: "Breach", path: "m4uhd", audio: "Original audio", flag: "us" },
  {
    name: "Vyse",
    path: "hdmovie",
    audio: "Original audio",
    flag: "us",
    filter: (data: any) =>
      (data.sources || []).filter(
        (s: any) => s.quality === "English" || s.quality === "Original",
      ),
  },
  {
    name: "Fade",
    path: "hdmovie",
    audio: "Hindi audio",
    flag: "in",
    filter: (data: any) =>
      (data.sources || []).filter((s: any) => s.quality === "Hindi"),
  },
  {
    name: "Killjoy",
    path: "meine",
    extraParams: { language: "german" },
    audio: "German audio",
    flag: "de",
  },
  { name: "Omen", path: "lamovie", audio: "Spanish audio", flag: "mx" },
  { name: "Raze", path: "superflix", audio: "Brazil audio", flag: "br" },
];

/**
 * Scrapes Videasy directly from the browser (with open CORS on speedracelight.com).
 * Falls back to backend endpoint if client-side scrape fails (e.g. adblock / CORS issues).
 */
export async function fetchVideasySourcesDirect(
  movie: any,
  season?: number,
  episode?: number,
  apiBaseUrl: string = "",
): Promise<Record<string, any>> {
  const tmdbId = movie.id || movie.tmdbId;
  const mediaType = movie.type || (movie.seasons ? "tv" : "movie");
  const year =
    movie.year ||
    (movie.first_air_date
      ? new Date(movie.first_air_date).getFullYear().toString()
      : "");
  const title = movie.title || movie.name || "";
  const imdbId = movie.imdbId || movie.imdb_id || "";

  const s = season ?? 1;
  const ep = episode ?? 1;

  // 0. Session Cache Check
  const cacheKey = `videasy-${tmdbId}-${mediaType}-${s}-${ep}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      console.log("[VIDEASY] Session cache hit:", parsed);
      return parsed;
    }
  } catch (cacheErr) {
    console.warn("[VIDEASY] Failed to read from sessionStorage:", cacheErr);
  }

  // Construct fallback backend URL
  let backendUrl = `${apiBaseUrl}/api/videasy?tmdbId=${tmdbId}&type=${mediaType}&title=${encodeURIComponent(title)}&releaseYear=${year}`;
  if (season !== undefined) backendUrl += `&season=${s}`;
  if (episode !== undefined) backendUrl += `&episode=${ep}`;

  try {
    console.log("[VIDEASY] Attempting direct browser-side scrape...");

    // 1. Fetch Seed — speedracelight.com has open ACAO:* on all endpoints.
    const seedRes = await fetch(
      `https://api.speedracelight.com/seed?mediaId=${tmdbId}`,
    );
    if (!seedRes.ok) throw new Error(`Seed endpoint HTTP ${seedRes.status}`);
    const seedData = await seedRes.json();
    const seed = seedData?.seed;
    if (!seed) throw new Error("Empty seed returned");

    const activeMirrors: Record<string, any> = {};

    // 2. Query each provider with staggering
    const scanPromises = providers.map(async (prov, index) => {
      await new Promise((resolve) => setTimeout(resolve, index * 150));

      if (Object.keys(activeMirrors).length >= 3) return null;

      try {
        const url = new URL(
          `https://api.speedracelight.com/${prov.path}/sources-with-title`,
        );
        url.searchParams.append("title", encodeURIComponent(title));
        url.searchParams.append("mediaType", mediaType);
        url.searchParams.append("year", String(year));
        url.searchParams.append("totalSeasons", "");
        url.searchParams.append("episodeId", String(ep));
        url.searchParams.append("seasonId", String(s));
        url.searchParams.append("tmdbId", String(tmdbId));
        url.searchParams.append("imdbId", String(imdbId));
        url.searchParams.append("enc", "2");
        url.searchParams.append("seed", seed);
        if (prov.extraParams) {
          Object.entries(prov.extraParams).forEach(([k, v]) => {
            url.searchParams.append(k, v);
          });
        }

        const res = await fetch(url.toString(), {
          headers: {
            accept: "*/*",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ciphertext = (await res.text()).trim();
        if (!ciphertext || ciphertext.startsWith("{")) {
          throw new Error(`Invalid ciphertext: ${ciphertext}`);
        }

        const decrypted = decryptSources(ciphertext, seed, String(tmdbId));
        let sources = decrypted.sources || [];
        if (prov.filter) {
          sources = prov.filter(decrypted);
        }
        if (sources.length === 0) return null;

        const urls = sources.map((src: any) => encodeURIComponent(src.url));
        const qualities = sources.map((src: any) => src.quality || "Auto");
        const mirrorName = `Videasy (${prov.name})`;

        activeMirrors[mirrorName] = {
          url: `/api/videasy/master.m3u8?urls=${urls.join(",")}&qualities=${qualities.join(",")}`,
          type: "hls",
          audio: prov.audio || "Original audio",
          flag: prov.flag || "us",
        };
      } catch (err: any) {
        console.warn(
          `[VIDEASY] Direct scrape failed for ${prov.name}:`,
          err.message,
        );
      }
      return null;
    });

    // Race the parallel scans with a 5-second timeout
    const raceTimeout = new Promise<void>((resolve) =>
      setTimeout(resolve, 5000),
    );
    await Promise.race([Promise.all(scanPromises), raceTimeout]);

    if (Object.keys(activeMirrors).length > 0) {
      console.log(
        `[VIDEASY] Direct browser scrape succeeded! Found ${Object.keys(activeMirrors).length} mirror(s).`,
      );

      // Save to session cache
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(activeMirrors));
      } catch (cacheErr) {
        console.warn("[VIDEASY] Failed to write to sessionStorage:", cacheErr);
      }

      return activeMirrors;
    } else {
      throw new Error("No mirrors found from direct scraping");
    }
  } catch (err: any) {
    console.warn(
      `[VIDEASY] Direct browser scrape failed: ${err.message}. Falling back to backend...`,
    );

    // Fallback query to our backend endpoint
    const res = await fetch(backendUrl);
    if (!res.ok) throw new Error(`Backend fallback failed: HTTP ${res.status}`);
    const data = await res.json();
    return data;
  }
}
