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
    const cleanHex = (hex || "").replace("#", "");
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
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Parse formatting tags (<i>, <b>, <u>) safely into React nodes
export function parseCueText(text: string): React.ReactNode {
  const decoded = decodeHtmlEntities(text);
  const tokenRegex = /(<\/?[biu]>)/gi;
  const parts = decoded.split(tokenRegex);

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
    } else {
      if (part) {
        let node: React.ReactNode = part;
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
    const textShadowStyle =
      prefs.outlineWidth === "0px"
        ? "1px 1px 3px rgba(0, 0, 0, 0.8)" // Netflix style soft shadow fallback
        : `0 2px 4px rgba(0, 0, 0, 0.8)`; // Clean, soft drop shadow instead of heavy offset shadow to avoid WebKit double-rendering bugs

    const textStrokeStyle =
      prefs.outlineWidth !== "0px"
        ? `${prefs.outlineWidth} ${prefs.outlineColor}`
        : "none";

    return (
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[25] pointer-events-none text-center select-none w-[96%] max-w-5xl bottom-[5%]"
        data-testid="subtitle-overlay"
      >
        <div className="flex flex-col items-center gap-1.5">
          {activeCues.map((cue) => (
            <span
              key={cue.id}
              className="inline-block px-4 py-1.5 rounded-lg whitespace-pre-line text-center"
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
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
