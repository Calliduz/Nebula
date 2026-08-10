import { describe, it, expect } from "vitest";
import {
  PROVIDERS,
  CATEGORY_PRIORITY,
  PRIORITY_PROVIDER_ID,
} from "../config/providers";

// Unit test function simulating the new autoplay selection logic from MovieDetails
export function selectAutoplayProvider(
  scan: Record<string, { loading: boolean; sources: any[] }>,
  favoriteIds: string[] = [],
): string | null {
  // Priority 0: Check if any favourited provider is scanning or has sources
  if (favoriteIds.length > 0) {
    const favProviders = PROVIDERS.filter((p) => favoriteIds.includes(p.id));
    for (const p of favProviders) {
      const prefState = scan[p.id];
      const isPrefLoading = prefState?.loading ?? true;
      const prefSrcsCount = prefState?.sources?.length ?? 0;

      if (isPrefLoading) return null; // Wait for favorited provider scan
      if (prefSrcsCount > 0) return p.id; // Play favorited provider
    }
  }

  // Default sequential fallback: check providers in PROVIDERS order
  for (const p of PROVIDERS) {
    const providerState = scan[p.id];
    const isLoading = providerState?.loading ?? true;
    const sourcesCount = providerState?.sources?.length ?? 0;

    if (isLoading) return null; // Highest priority remaining provider is scanning — wait!
    if (sourcesCount > 0) return p.id; // Found non-empty source
  }

  return null;
}

describe("Provider Configuration and Autoplay Selection", () => {
  it("should have correct top 4 provider ordering: Aether, Vesper, Quantum, Hyperion", () => {
    const top4 = PROVIDERS.slice(0, 4).map((p) => p.name);
    expect(top4).toEqual(["Aether", "Vesper", "Quantum", "Hyperion"]);
    expect(PRIORITY_PROVIDER_ID).toBe("hdghartv");
  });

  it("should have CATEGORY_PRIORITY matching provider order", () => {
    expect(CATEGORY_PRIORITY[0]).toBe("Aether");
    expect(CATEGORY_PRIORITY[3]).toBe("Vesper");
    expect(CATEGORY_PRIORITY[5]).toBe("Quantum");
    expect(CATEGORY_PRIORITY[7]).toBe("Hyperion");
  });

  it("should wait while 1st source (Aether) is scanning", () => {
    const scanState: Record<string, { loading: boolean; sources: any[] }> = {
      hdghartv: { loading: true, sources: [] },
      netnaija: { loading: false, sources: [{ url: "http://test.com" }] },
    };
    // Even if 2nd source (Vesper) finished with sources, wait for 1st source
    expect(selectAutoplayProvider(scanState)).toBeNull();
  });

  it("should autoplay 1st source (Aether) when it returns non-empty sources", () => {
    const scanState: Record<string, { loading: boolean; sources: any[] }> = {
      hdghartv: {
        loading: false,
        sources: [{ url: "http://test.com/aether" }],
      },
      netnaija: {
        loading: false,
        sources: [{ url: "http://test.com/vesper" }],
      },
    };
    expect(selectAutoplayProvider(scanState)).toBe("hdghartv");
  });

  it("should autoplay 2nd source (Vesper) if 1st source (Aether) returns empty", () => {
    const scanState: Record<string, { loading: boolean; sources: any[] }> = {
      hdghartv: { loading: false, sources: [] },
      netnaija: {
        loading: false,
        sources: [{ url: "http://test.com/vesper" }],
      },
    };
    expect(selectAutoplayProvider(scanState)).toBe("netnaija");
  });

  it("should prioritize favourite source if specified and has sources", () => {
    const scanState: Record<string, { loading: boolean; sources: any[] }> = {
      hdghartv: {
        loading: false,
        sources: [{ url: "http://test.com/aether" }],
      },
      vaplayer: {
        loading: false,
        sources: [{ url: "http://test.com/quantum" }],
      },
    };
    // Favourite source is Quantum (vaplayer)
    expect(selectAutoplayProvider(scanState, ["vaplayer"])).toBe("vaplayer");
  });

  it("should wait for favourite source if favourite source is still loading", () => {
    const scanState: Record<string, { loading: boolean; sources: any[] }> = {
      hdghartv: {
        loading: false,
        sources: [{ url: "http://test.com/aether" }],
      },
      vaplayer: { loading: true, sources: [] },
    };
    // Favourite source is Quantum (vaplayer) which is loading
    expect(selectAutoplayProvider(scanState, ["vaplayer"])).toBeNull();
  });

  it("should fall back to default order if favourite source returns empty", () => {
    const scanState: Record<string, { loading: boolean; sources: any[] }> = {
      hdghartv: {
        loading: false,
        sources: [{ url: "http://test.com/aether" }],
      },
      vaplayer: { loading: false, sources: [] },
    };
    // Favourite source Quantum returned empty -> fall back to Aether
    expect(selectAutoplayProvider(scanState, ["vaplayer"])).toBe("hdghartv");
  });
});
