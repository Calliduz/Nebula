/**
 * Unit tests for quality picker logic extracted from MediaPlayer.tsx
 *
 * These tests cover:
 * 1. parseMirrorName — quality suffix extraction
 * 2. groupMirrors — mirror grouping + height assignment
 * 3. The multi-variant-master detection logic (mirrorIsSingleFakeQuality)
 * 4. getHlsLevelHeight fallback chain
 */

import { describe, it, expect } from "vitest";

// ── Helpers duplicated from MediaPlayer.tsx (pure functions, no React) ───────

const parseMirrorName = (name: string) => {
  const parenMatch = name.match(
    /^(.*?)\s*\((1080p|720p|480p|360p|Auto|Original)\)$/i,
  );
  if (parenMatch) {
    return { base: parenMatch[1].trim(), quality: parenMatch[2].trim() };
  }
  const match = name.match(/^(.*?)\s*-\s*(\d+p|Auto|Original)\s*\)?$/i);
  if (match) {
    let base = match[1].trim();
    if (name.includes("(") && !base.endsWith(")")) {
      base = base + ")";
    }
    return { base, quality: match[2].trim() };
  }
  return { base: name, quality: "Original" };
};

const getHlsLevelHeight = (
  l: any,
  index: number = 0,
  totalLevels: number = 1,
): number => {
  if (l && typeof l.height === "number" && l.height > 0) return l.height;

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

/** Simplified groupMirrors mirroring the real implementation */
const groupMirrors = (mirrorsList: any[]) => {
  const groups: Record<string, any> = {};
  mirrorsList.forEach((m) => {
    if (m.type !== "mp4" && m.type !== "hls") {
      const groupKey = `${m.source}_${m.audio || ""}`;
      groups[groupKey] = { ...m };
      return;
    }
    const { base, quality } = parseMirrorName(m.source);
    const groupKey = `${base}_${m.audio || ""}`;
    const height = parseInt(quality.replace(/\D/g, ""), 10) || 480;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        source: base,
        url: m.url,
        type: m.type === "hls" ? "hls_grouped" : "mp4_grouped",
        audio: m.audio,
        qualities: [{ height, url: m.url }],
      };
    } else {
      groups[groupKey].qualities.push({ height, url: m.url });
    }
  });
  const list = Object.values(groups).map((g: any) => {
    if (g.type === "mp4_grouped" || g.type === "hls_grouped") {
      g.qualities.sort((a: any, b: any) => b.height - a.height);
      g.url = g.qualities[0].url;
    }
    return g;
  });
  return list;
};

/** Mirrors the detection logic inside MANIFEST_PARSED */
const detectMirrorIsSingleFakeQuality = (
  activeM: any,
  uniqueQualities: { height: number; levelId: number }[],
) => {
  const isGroupedMirror = Boolean(
    activeM &&
    (activeM.type === "hls_grouped" || activeM.type === "mp4_grouped") &&
    activeM.qualities &&
    activeM.qualities.length > 0,
  );

  const mirrorQualityCount = activeM?.qualities?.length ?? 0;
  const realLevelCount = uniqueQualities.length;

  return isGroupedMirror && mirrorQualityCount <= 1 && realLevelCount > 1;
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("parseMirrorName", () => {
  it("parses parenthesized quality suffix", () => {
    expect(parseMirrorName("Vidnest (1080p)")).toEqual({
      base: "Vidnest",
      quality: "1080p",
    });
    expect(parseMirrorName("Vidnest (720p)")).toEqual({
      base: "Vidnest",
      quality: "720p",
    });
  });

  it("parses hyphen-separated quality suffix", () => {
    expect(parseMirrorName("VidRock - 1080p")).toEqual({
      base: "VidRock",
      quality: "1080p",
    });
  });

  it("returns Original quality for bare source name (no suffix)", () => {
    expect(parseMirrorName("WKM")).toEqual({
      base: "WKM",
      quality: "Original",
    });
    expect(parseMirrorName("Hyperion")).toEqual({
      base: "Hyperion",
      quality: "Original",
    });
  });
});

describe("getHlsLevelHeight", () => {
  it("returns l.height directly when available", () => {
    expect(getHlsLevelHeight({ height: 1080 }, 0, 3)).toBe(1080);
    expect(getHlsLevelHeight({ height: 720 }, 1, 3)).toBe(720);
  });

  it("extracts height from attrs.RESOLUTION", () => {
    expect(
      getHlsLevelHeight({ attrs: { RESOLUTION: "1920x1080" } }, 0, 1),
    ).toBe(1080);
    expect(getHlsLevelHeight({ attrs: { RESOLUTION: "1280x720" } }, 0, 1)).toBe(
      720,
    );
  });

  it("extracts height from attrs.NAME", () => {
    expect(getHlsLevelHeight({ attrs: { NAME: "480p" } }, 0, 1)).toBe(480);
  });

  it("falls back to bitrate-based heuristic", () => {
    expect(getHlsLevelHeight({ bitrate: 4_000_000 }, 0, 1)).toBe(1080);
    expect(getHlsLevelHeight({ bitrate: 2_000_000 }, 0, 1)).toBe(720);
    expect(getHlsLevelHeight({ bitrate: 900_000 }, 0, 1)).toBe(480);
  });

  it("falls back to index-based height when totalLevels > 1 and no info", () => {
    expect(getHlsLevelHeight({}, 0, 3)).toBe(1080);
    expect(getHlsLevelHeight({}, 1, 3)).toBe(720);
    expect(getHlsLevelHeight({}, 2, 3)).toBe(480);
  });

  it("falls back to 480 for a single level with no info", () => {
    expect(getHlsLevelHeight({}, 0, 1)).toBe(480);
  });
});

describe("groupMirrors", () => {
  it("groups multi-quality sources correctly", () => {
    const mirrors = [
      { source: "Vidnest (1080p)", type: "hls", url: "url-1080" },
      { source: "Vidnest (720p)", type: "hls", url: "url-720" },
      { source: "Vidnest (480p)", type: "hls", url: "url-480" },
    ];
    const grouped = groupMirrors(mirrors);
    expect(grouped).toHaveLength(1);
    const g = grouped[0];
    expect(g.type).toBe("hls_grouped");
    expect(g.qualities).toHaveLength(3);
    expect(g.qualities[0].height).toBe(1080);
    expect(g.qualities[1].height).toBe(720);
    expect(g.qualities[2].height).toBe(480);
    expect(g.url).toBe("url-1080");
  });

  it("wraps a bare-name single HLS mirror as hls_grouped with height=480", () => {
    const mirrors = [{ source: "WKM", type: "hls", url: "url-wkm-master" }];
    const grouped = groupMirrors(mirrors);
    expect(grouped).toHaveLength(1);
    const g = grouped[0];
    expect(g.type).toBe("hls_grouped");
    expect(g.qualities).toHaveLength(1);
    // Height defaults to 480 — even if the actual stream is 1080p
    expect(g.qualities[0].height).toBe(480);
  });
});

describe("detectMirrorIsSingleFakeQuality (MANIFEST_PARSED logic)", () => {
  it("returns TRUE when grouped mirror has 1 fake quality but HLS has multiple real levels", () => {
    const activeM = {
      type: "hls_grouped",
      qualities: [{ height: 480, url: "url-wkm-master" }],
    };
    const uniqueQualities = [
      { height: 1080, levelId: 0 },
      { height: 720, levelId: 1 },
      { height: 480, levelId: 2 },
    ];
    expect(detectMirrorIsSingleFakeQuality(activeM, uniqueQualities)).toBe(
      true,
    );
  });

  it("returns FALSE when grouped mirror has multiple real quality URLs", () => {
    const activeM = {
      type: "hls_grouped",
      qualities: [
        { height: 1080, url: "url-1080" },
        { height: 720, url: "url-720" },
        { height: 480, url: "url-480" },
      ],
    };
    const uniqueQualities = [{ height: 1080, levelId: 0 }];
    expect(detectMirrorIsSingleFakeQuality(activeM, uniqueQualities)).toBe(
      false,
    );
  });

  it("returns FALSE when mirror is not grouped (standard HLS)", () => {
    const activeM = null;
    const uniqueQualities = [
      { height: 1080, levelId: 0 },
      { height: 720, levelId: 1 },
    ];
    expect(detectMirrorIsSingleFakeQuality(activeM, uniqueQualities)).toBe(
      false,
    );
  });

  it("returns FALSE when grouped mirror has 1 quality AND HLS also has 1 real level", () => {
    const activeM = {
      type: "hls_grouped",
      qualities: [{ height: 480, url: "url-single" }],
    };
    const uniqueQualities = [{ height: 480, levelId: 0 }];
    expect(detectMirrorIsSingleFakeQuality(activeM, uniqueQualities)).toBe(
      false,
    );
  });
});
