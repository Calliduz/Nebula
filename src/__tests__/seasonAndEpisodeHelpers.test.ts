import { describe, it, expect } from "vitest";
import { formatSeasonName } from "../utils/helpers";

describe("formatSeasonName", () => {
  it("formats generic Season 1 with episode count", () => {
    const season = {
      season_number: 1,
      name: "Season 1",
      episode_count: 24,
    };
    expect(formatSeasonName(season)).toBe("Season 1 (24)");
  });

  it("formats custom season arc name with episode count", () => {
    const season = {
      season_number: 2,
      name: "Thousand-Year Blood War",
      episode_count: 50,
    };
    expect(formatSeasonName(season)).toBe("Thousand-Year Blood War (50)");
  });

  it("formats specific show name with episode count", () => {
    const season = {
      season_number: 1,
      name: "Bleach",
      episode_count: 366,
    };
    expect(formatSeasonName(season)).toBe("Bleach (366)");
  });

  it("returns base season name when episode_count is 0 or undefined", () => {
    const season = {
      season_number: 3,
      name: "Season 3",
      episode_count: 0,
    };
    expect(formatSeasonName(season)).toBe("Season 3");
  });

  it("uses fallbackSeasonNumber when season object is missing", () => {
    expect(formatSeasonName(null, 4)).toBe("Season 4");
    expect(formatSeasonName(undefined, 1)).toBe("Season 1");
  });

  it("returns empty string if neither season object nor fallback is provided", () => {
    expect(formatSeasonName(null)).toBe("");
  });
});
