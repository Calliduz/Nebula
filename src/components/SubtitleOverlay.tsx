import React, { memo } from "react";
import { SubtitlePreferences, ActiveCue } from "../hooks/useSubtitleManager";

interface SubtitleOverlayProps {
  activeCues: ActiveCue[];
  prefs: SubtitlePreferences;
  showUi: boolean;
}

// Helper to safely convert hex color to rgba color
export function hexToRgba(hex: string, opacity: number): string {
  try {
    const cleanHex = (hex || "").replace("#", "").trim();
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return isNaN(r) || isNaN(g) || isNaN(b)
        ? `rgba(0, 0, 0, ${opacity})`
        : `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    if (cleanHex.length !== 6) {
      return `rgba(0, 0, 0, ${opacity})`;
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return `rgba(0, 0, 0, ${opacity})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } catch {
    return `rgba(0, 0, 0, ${opacity})`;
  }
}

// Decode basic HTML entities to avoid mathematical tags crashing
export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;|&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => {
      const num = Number(code);
      return isNaN(num) ? "" : String.fromCharCode(num);
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const num = parseInt(hex, 16);
      return isNaN(num) ? "" : String.fromCharCode(num);
    });
}

// Strip extraneous tags and styling artifacts from raw subtitle cues
export function cleanCueText(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Remove ASS/SSA override blocks: {\an8}, {\pos(x,y)}, {\c&H...&}, etc.
  text = text.replace(/\{[^}]*\}/g, "");

  // 2. Convert line break tags (<br>, <br/>, <br />) into newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // 3. Normalize strong/em tags to b/i
  text = text.replace(/<(\/?)strong>/gi, "<$1b>");
  text = text.replace(/<(\/?)em>/gi, "<$1i>");

  // 4. Strip any tag that is not <b>, </b>, <i>, </i>, <u>, </u>
  // This cleans <font ...>, </font>, <color ...>, </color>, <c...>, </c>, <v...>, </v>, <span>, etc.
  text = text.replace(/<(?!\/?(?:b|i|u)\b)[^>]+>/gi, "");

  return text;
}

// Parse formatting tags (<i>, <b>, <u>) safely into React nodes
export function parseCueText(text: string): React.ReactNode {
  if (!text) return null;

  const cleaned = cleanCueText(text);
  const tokenRegex = /(<\/?[biu]>)/gi;
  const parts = cleaned.split(tokenRegex);

  const result: React.ReactNode[] = [];
  const activeStyles = {
    bold: 0,
    italic: 0,
    underline: 0,
  };

  let keyCount = 0;

  for (const part of parts) {
    const lowerPart = part.toLowerCase();
    if (lowerPart === "<b>") {
      activeStyles.bold++;
    } else if (lowerPart === "</b>") {
      activeStyles.bold = Math.max(0, activeStyles.bold - 1);
    } else if (lowerPart === "<i>") {
      activeStyles.italic++;
    } else if (lowerPart === "</i>") {
      activeStyles.italic = Math.max(0, activeStyles.italic - 1);
    } else if (lowerPart === "<u>") {
      activeStyles.underline++;
    } else if (lowerPart === "</u>") {
      activeStyles.underline = Math.max(0, activeStyles.underline - 1);
    } else if (part) {
      const decoded = decodeHtmlEntities(part);
      let node: React.ReactNode = decoded;
      if (activeStyles.bold > 0) {
        node = <strong key={`b-${keyCount++}`}>{node}</strong>;
      }
      if (activeStyles.italic > 0) {
        node = <em key={`i-${keyCount++}`}>{node}</em>;
      }
      if (activeStyles.underline > 0) {
        node = (
          <span
            style={{ textDecoration: "underline" }}
            key={`u-${keyCount++}`}
          >
            {node}
          </span>
        );
      }
      result.push(node);
    }
  }

  return result;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = memo(
  ({ activeCues, prefs, showUi }) => {
    if (prefs.useNativeSubtitles || activeCues.length === 0) {
      return null;
    }

    const bgColor =
      prefs.bgOpacity === 0
        ? "transparent"
        : hexToRgba(prefs.bgColor, prefs.bgOpacity);

    // Build text shadow based on outline width for different visual styles
    const outlineWidthPx = parseInt(prefs.outlineWidth) || 0;
    let textShadowStyle: string;
    if (outlineWidthPx === 0) {
      // No outline: soft drop shadow for readability
      textShadowStyle =
        "1px 1px 3px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5)";
    } else if (outlineWidthPx >= 3) {
      // Heavy outline (anime style): multi-directional crisp shadow for bold outlined look
      const c = prefs.outlineColor;
      textShadowStyle = `0 0 3px ${c}, 0 0 5px rgba(0,0,0,0.9), 1px 1px 2px ${c}, -1px -1px 2px ${c}, 1px -1px 2px ${c}, -1px 1px 2px ${c}`;
    } else {
      // Medium outline (netflix style): clean drop shadow
      textShadowStyle = `0 2px 4px rgba(0, 0, 0, 0.8)`;
    }

    const textStrokeStyle =
      prefs.outlineWidth !== "0px"
        ? `${prefs.outlineWidth} ${prefs.outlineColor}`
        : "none";

    return (
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-[15] pointer-events-none text-center select-none w-[96%] max-w-5xl transition-all duration-200 ${
          showUi ? "bottom-[16%] md:bottom-[12%]" : "bottom-[5%]"
        }`}
        data-testid="subtitle-overlay"
      >
        <div className="flex flex-col items-center gap-1.5">
          {activeCues.map((cue) => (
            <span
              key={cue.id}
              className="inline-block px-4 py-1.5 rounded-lg whitespace-pre-line text-center"
              style={{
                fontFamily: prefs.fontFamily || "Arial, Helvetica, sans-serif",
                fontWeight: (prefs.fontWeight || "normal") as any,
                fontStyle: (prefs.fontStyle || "normal") as any,
                letterSpacing: "0.5px",
                color: prefs.color,
                fontSize: `clamp(calc(12px * ${prefs.size}), calc(2.8cqi * ${prefs.size}), calc(30px * ${prefs.size}))`,
                backgroundColor: bgColor,
                WebkitTextStroke: textStrokeStyle,
                textShadow: textShadowStyle,
                paintOrder: "stroke fill", // Ensure outline paints under fill, keeping text sharp on mobile
                maxWidth: "95%",
                lineHeight: 1.35,
                wordBreak: "break-word",
                paddingLeft: "16px",
                paddingRight: "16px",
              }}
            >
              {parseCueText(cue.text)}
            </span>
          ))}
        </div>
      </div>
    );
  },
);

SubtitleOverlay.displayName = "SubtitleOverlay";
