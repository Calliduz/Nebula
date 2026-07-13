import { useState, useEffect, useRef, useCallback } from "react";

export interface SubtitlePreferences {
  preset: "vlc" | "netflix" | "anime" | "minimal" | "custom";
  size: number;
  color: string;
  bgColor: string;
  bgOpacity: number;
  outlineWidth: string;
  outlineColor: string;
  fontWeight: string;
  fontStyle: string;
  fontFamily: string;
  useNativeSubtitles: boolean;
}

export interface ActiveCue {
  id: string;
  text: string;
}

export const DEFAULT_PREFERENCES: SubtitlePreferences = {
  preset: "netflix",
  size: 0.75,
  color: "#ffffff",
  bgColor: "#000000",
  bgOpacity: 0.0,
  outlineWidth: "2px",
  outlineColor: "#000000",
  fontWeight: "bold",
  fontStyle: "normal",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  useNativeSubtitles: false,
};

const PRESETS: Record<
  string,
  Omit<SubtitlePreferences, "preset" | "useNativeSubtitles">
> = {
  vlc: {
    size: 0.75,
    color: "#ffffff",
    bgColor: "#000000",
    bgOpacity: 0.0,
    outlineWidth: "1px",
    outlineColor: "#000000",
    fontWeight: "normal",
    fontStyle: "normal",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  netflix: {
    size: 0.75,
    color: "#ffffff",
    bgColor: "#000000",
    bgOpacity: 0.0,
    outlineWidth: "2px",
    outlineColor: "#000000",
    fontWeight: "bold",
    fontStyle: "normal",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  anime: {
    size: 0.94,
    color: "#ffffff",
    bgColor: "#000000",
    bgOpacity: 0.0,
    outlineWidth: "3px",
    outlineColor: "#000000",
    fontWeight: "800",
    fontStyle: "normal",
    fontFamily: "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif",
  },
  minimal: {
    size: 0.75,
    color: "#ffffff",
    bgColor: "#000000",
    bgOpacity: 0.0,
    outlineWidth: "0px",
    outlineColor: "#000000",
    fontWeight: "300",
    fontStyle: "normal",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
};

export function useSubtitleManager(streamUrl: string | null) {
  // 1. Safe Preferences Hydration
  const [prefs, setPrefs] = useState<SubtitlePreferences>(() => {
    // Detect iOS Safari
    const isIosSafari =
      typeof navigator !== "undefined" &&
      /iP(hone|od|ad)/.test(navigator.userAgent) &&
      /Safari/.test(navigator.userAgent) &&
      !/CriOS/.test(navigator.userAgent) &&
      !/FxiOS/.test(navigator.userAgent);

    try {
      const saved = localStorage.getItem("nebula-subtitle-preferences");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed === "object" &&
          ["vlc", "netflix", "anime", "minimal", "custom"].includes(
            parsed.preset,
          ) &&
          typeof parsed.size === "number" &&
          typeof parsed.color === "string" &&
          typeof parsed.bgColor === "string" &&
          typeof parsed.bgOpacity === "number" &&
          typeof parsed.outlineWidth === "string" &&
          typeof parsed.outlineColor === "string" &&
          typeof parsed.useNativeSubtitles === "boolean" &&
          (typeof parsed.fontWeight === "undefined" ||
            typeof parsed.fontWeight === "string") &&
          (typeof parsed.fontStyle === "undefined" ||
            typeof parsed.fontStyle === "string") &&
          (typeof parsed.fontFamily === "undefined" ||
            typeof parsed.fontFamily === "string")
        ) {
          return {
            ...DEFAULT_PREFERENCES,
            ...parsed,
            fontWeight: parsed.fontWeight ?? DEFAULT_PREFERENCES.fontWeight,
            fontStyle: parsed.fontStyle ?? DEFAULT_PREFERENCES.fontStyle,
            fontFamily: parsed.fontFamily ?? DEFAULT_PREFERENCES.fontFamily,
          };
        }
      }
    } catch (e) {
      console.warn(
        "Corrupted subtitle preferences, falling back to default.",
        e,
      );
    }

    return {
      ...DEFAULT_PREFERENCES,
      useNativeSubtitles: isIosSafari
        ? true
        : DEFAULT_PREFERENCES.useNativeSubtitles,
    };
  });

  // Keep state for language preservation
  const [preferredLanguageISO, setPreferredLanguageISO] = useState<
    string | null
  >(() => {
    try {
      return localStorage.getItem("nebula-preferred-subtitle-language-iso");
    } catch {
      return null;
    }
  });

  // Save preferences when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "nebula-subtitle-preferences",
        JSON.stringify(prefs),
      );
    } catch (e) {
      console.error("Failed to save subtitle preferences to localStorage:", e);
    }
  }, [prefs]);

  // Save preferred language when it changes
  useEffect(() => {
    try {
      if (preferredLanguageISO) {
        localStorage.setItem(
          "nebula-preferred-subtitle-language-iso",
          preferredLanguageISO,
        );
      } else {
        localStorage.removeItem("nebula-preferred-subtitle-language-iso");
      }
    } catch (e) {
      console.error(
        "Failed to save preferred subtitle language to localStorage:",
        e,
      );
    }
  }, [preferredLanguageISO]);

  const updatePreference = useCallback(
    <K extends keyof SubtitlePreferences>(
      key: K,
      value: SubtitlePreferences[K],
    ) => {
      setPrefs((prev) => {
        const updated = { ...prev, [key]: value };
        if (key !== "preset" && key !== "useNativeSubtitles") {
          updated.preset = "custom";
        }
        return updated;
      });
    },
    [],
  );

  const selectPreset = useCallback(
    (presetName: "vlc" | "netflix" | "anime" | "minimal") => {
      setPrefs((prev) => ({
        ...prev,
        ...PRESETS[presetName],
        preset: presetName,
      }));
    },
    [],
  );

  // 2. Cue and State Management
  const [activeCues, setActiveCues] = useState<ActiveCue[]>([]);
  const lastSerializedCuesRef = useRef<string>("");

  const updateActiveCues = useCallback((cuesList: TextTrackCueList | null) => {
    if (!cuesList) {
      if (lastSerializedCuesRef.current !== "[]") {
        lastSerializedCuesRef.current = "[]";
        setActiveCues([]);
      }
      return;
    }

    const currentCues: ActiveCue[] = [];
    for (let i = 0; i < cuesList.length; i++) {
      const cue = cuesList[i] as VTTCue;
      currentCues.push({
        id: cue.id || String(i),
        text: cue.text || "",
      });
    }

    const serialized = JSON.stringify(currentCues);
    if (lastSerializedCuesRef.current !== serialized) {
      lastSerializedCuesRef.current = serialized;
      setActiveCues(currentCues);
    }
  }, []);

  // 3. Centralized Source/Mirror Switching Cleanup
  const cleanupSubtitleState = useCallback(
    (videoElement: HTMLVideoElement | null) => {
      console.log(
        "[useSubtitleManager] Running aggressive subtitle cleanup...",
      );

      // Clear active cues state
      if (lastSerializedCuesRef.current !== "[]") {
        lastSerializedCuesRef.current = "[]";
        setActiveCues([]);
      }

      // Programmatically disable all text tracks
      if (videoElement) {
        const textTracks = videoElement.textTracks;
        for (let i = 0; i < textTracks.length; i++) {
          textTracks[i].mode = "disabled";
        }
      }
    },
    [],
  );

  return {
    prefs,
    updatePreference,
    selectPreset,
    activeCues,
    updateActiveCues,
    cleanupSubtitleState,
    preferredLanguageISO,
    setPreferredLanguageISO,
  };
}
