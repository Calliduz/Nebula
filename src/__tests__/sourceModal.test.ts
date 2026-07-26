import { describe, it, expect } from "vitest";

function serializeSources(
  sources: any[],
  extra?: (s: any) => string,
): string {
  return sources
    .map((s) => {
      if (s.url.includes("#")) return s.url;
      const ex = extra ? extra(s) : "";
      return `${s.url}#${s.name}#${s.type}${ex ? `#${ex}` : ""}`;
    })
    .join("|");
}

describe("Source Selection Modal Logic", () => {
  it("correctly serializes sources without extra info", () => {
    const sources = [
      { name: "VidRock 1", url: "https://example.com/stream1.m3u8", type: "hls" },
      { name: "VidRock 2", url: "https://example.com/stream2.m3u8", type: "hls" },
    ];
    const result = serializeSources(sources);
    expect(result).toBe(
      "https://example.com/stream1.m3u8#VidRock 1#hls|https://example.com/stream2.m3u8#VidRock 2#hls"
    );
  });

  it("correctly includes extra audio information when provided", () => {
    const sources = [
      { name: "GharTV HD", url: "https://example.com/ghartv.m3u8", type: "hls", audio: "Hindi" },
    ];
    const result = serializeSources(sources, (s) => s.audio || "");
    expect(result).toBe("https://example.com/ghartv.m3u8#GharTV HD#hls#Hindi");
  });

  it("preserves URLs that already contain # hashes", () => {
    const sources = [
      { name: "Preformatted", url: "https://example.com/stream.m3u8#Preformatted#hls", type: "hls" },
    ];
    const result = serializeSources(sources);
    expect(result).toBe("https://example.com/stream.m3u8#Preformatted#hls");
  });
});
