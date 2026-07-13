/**
 * skipSegments.ts
 * Pure utility functions for TheIntroDB skip-segment integration.
 * No React dependencies � safe to unit-test without jsdom.
 */

export type SkipSegmentType = "intro" | "recap" | "credits" | "preview";

export interface SkipSegment {
  type: SkipSegmentType;
  /** Start of segment in seconds (0 when API returns null = start of media). */
  startSec: number;
  /** End of segment in seconds, or null when API returns null = end of media. */
  endSec: number | null;
}

export interface IntroDBSegment {
  start_ms: number | null;
  end_ms: number | null;
}

export interface IntroDBResponse {
  tmdb_id?: number;
  type?: string;
  season?: number | null;
  episode?: number | null;
  intro?: IntroDBSegment[];
  recap?: IntroDBSegment[];
  credits?: IntroDBSegment[];
  preview?: IntroDBSegment[];
}

/**
 * Converts milliseconds to seconds (handles null safely).
 */
function msToSec(ms: number | null | undefined): number | null {
  if (ms == null) return null;
  return ms / 1000;
}

/**
 * Determines whether an API segment represents a "no segment" sentinel.
 *
 * TheIntroDB convention:
 *  - intro / recap: `end_ms === 0`  -> no segment
 *  - credits / preview: `start_ms === 0` -> no segment
 */
function isNoSegmentSentinel(
  type: SkipSegmentType,
  seg: IntroDBSegment,
): boolean {
  if (type === "intro" || type === "recap") {
    return seg.end_ms === 0;
  }
  // credits / preview
  return seg.start_ms === 0;
}

/**
 * Parse a raw TheIntroDB `/media` response into a flat list of SkipSegments.
 * Silently ignores malformed or "no segment" entries.
 */
export function parseIntroDBResponse(data: IntroDBResponse): SkipSegment[] {
  const segments: SkipSegment[] = [];
  const segmentTypes: SkipSegmentType[] = [
    "intro",
    "recap",
    "credits",
    "preview",
  ];

  for (const type of segmentTypes) {
    const raw = data[type];
    if (!Array.isArray(raw)) continue;

    for (const seg of raw) {
      if (isNoSegmentSentinel(type, seg)) continue;

      const startSec = msToSec(seg.start_ms) ?? 0; // null -> 0 (start of media)
      const endSec = msToSec(seg.end_ms); // null stays null (end of media)

      segments.push({ type, startSec, endSec });
    }
  }

  return segments;
}

/**
 * Given a list of SkipSegments, a current playback time in seconds, and a set
 * of already-dismissed segment keys, returns the first matching active segment.
 *
 * A segment is "active" when:
 *  - currentTimeSec >= segment.startSec
 *  - currentTimeSec < segment.endSec  (or endSec is null = end of media)
 *  - the segment has NOT been dismissed
 *
 * Returns null when no segment is active.
 */
export function getActiveSkipSegment(
  segments: SkipSegment[],
  currentTimeSec: number,
  dismissed: Set<string>,
): SkipSegment | null {
  for (const seg of segments) {
    const key = getSkipDismissKey(seg);
    if (dismissed.has(key)) continue;

    const afterStart = currentTimeSec >= seg.startSec;
    const beforeEnd = seg.endSec === null ? true : currentTimeSec < seg.endSec;

    if (afterStart && beforeEnd) return seg;
  }
  return null;
}

/**
 * Returns the human-readable label for a given segment type.
 */
export function getSkipLabel(type: SkipSegmentType): string {
  switch (type) {
    case "intro":
      return "Skip Intro";
    case "recap":
      return "Skip Recap";
    case "credits":
      return "Skip Credits";
    case "preview":
      return "Skip Preview";
  }
}

/**
 * Stable dismiss key for a segment -- used to track user dismissals this session.
 */
export function getSkipDismissKey(seg: SkipSegment): string {
  return `${seg.type}-${seg.startSec}`;
}
