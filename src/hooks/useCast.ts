import { useState, useEffect, useCallback } from "react";

export interface CastMetadata {
  title: string;
  poster?: string;
  subtitleUrl?: string;
  season?: number;
  episode?: number;
}

export function useCast() {
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [isAirPlayAvailable, setIsAirPlayAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [activeDeviceName, setActiveDeviceName] = useState<string | null>(null);

  // Initialize Google Cast SDK
  useEffect(() => {
    // Check if Google Cast API is already loaded
    if (
      typeof window !== "undefined" &&
      (window as any).chrome?.cast?.isAvailable
    ) {
      setIsCastAvailable(true);
    } else {
      // Define window callback for Cast SDK
      (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable && (window as any).cast?.framework) {
          try {
            const castContext = (
              window as any
            ).cast.framework.CastContext.getInstance();
            castContext.setOptions({
              receiverApplicationId: (window as any).chrome.cast.media
                .DEFAULT_MEDIA_RECEIVER_APP_ID,
              autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy
                .ORIGIN_SCOPED,
            });

            // Listen for session state changes
            const StateEvent = (window as any).cast.framework
              .CastContextEventType;
            castContext.addEventListener(
              StateEvent.CAST_STATE_CHANGED,
              (event: any) => {
                const CastState = (window as any).cast.framework.CastState;
                if (event.castState === CastState.CONNECTED) {
                  setIsCasting(true);
                  const session = castContext.getCurrentSession();
                  setActiveDeviceName(
                    session?.getCastDevice()?.friendlyName || "TV",
                  );
                } else if (event.castState === CastState.NOT_CONNECTED) {
                  setIsCasting(false);
                  setActiveDeviceName(null);
                }
              },
            );

            setIsCastAvailable(true);
          } catch (e) {
            console.warn("[CAST] Failed to initialize Google Cast context:", e);
          }
        }
      };

      // Dynamically load Google Cast SDK script if not present
      if (!document.getElementById("google-cast-sdk")) {
        const script = document.createElement("script");
        script.id = "google-cast-sdk";
        script.src =
          "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    // AirPlay availability detection for WebKit/Safari
    if (
      typeof window !== "undefined" &&
      (window as any).WebKitPlaybackTargetAvailabilityEvent
    ) {
      setIsAirPlayAvailable(true);
    }
  }, []);

  // Trigger Google Chromecast Session
  const triggerCast = useCallback(
    async (streamUrl: string, metadata: CastMetadata) => {
      if (!(window as any).cast?.framework) {
        alert("Chromecast is not available on this browser/device.");
        return;
      }

      try {
        const castContext = (
          window as any
        ).cast.framework.CastContext.getInstance();
        await castContext.requestSession();
        const session = castContext.getCurrentSession();

        if (session) {
          const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(
            streamUrl,
            streamUrl.includes(".m3u8") ? "application/x-mpegurl" : "video/mp4",
          );

          const mediaMetadata = new (
            window as any
          ).chrome.cast.media.GenericMediaMetadata();
          mediaMetadata.title = metadata.title;
          if (metadata.poster) {
            mediaMetadata.images = [
              new (window as any).chrome.cast.media.Image(metadata.poster),
            ];
          }
          mediaInfo.metadata = mediaMetadata;

          // Attach subtitles if available
          if (metadata.subtitleUrl) {
            const subtitleTrack = new (window as any).chrome.cast.media.Track(
              1,
              (window as any).chrome.cast.media.TrackType.TEXT,
            );
            subtitleTrack.trackContentId = metadata.subtitleUrl;
            subtitleTrack.trackContentType = "text/vtt";
            subtitleTrack.subtype = (
              window as any
            ).chrome.cast.media.TextTrackType.SUBTITLES;
            subtitleTrack.name = "English Subtitles";
            subtitleTrack.language = "en-US";
            mediaInfo.tracks = [subtitleTrack];
          }

          const request = new (window as any).chrome.cast.media.LoadRequest(
            mediaInfo,
          );
          await session.loadMedia(request);
          setIsCasting(true);
          setActiveDeviceName(session.getCastDevice()?.friendlyName || "TV");
        }
      } catch (err: any) {
        if (err !== "cancel") {
          console.error("[CAST] Error starting cast session:", err);
        }
      }
    },
    [],
  );

  // Trigger Apple AirPlay Target Picker
  const triggerAirPlay = useCallback(
    (videoElement: HTMLVideoElement | null) => {
      if (!videoElement) return;

      if ((videoElement as any).webkitShowPlaybackTargetPicker) {
        (videoElement as any).webkitShowPlaybackTargetPicker();
      } else {
        alert("AirPlay is only supported on Safari / Apple devices.");
      }
    },
    [],
  );

  return {
    isCastAvailable,
    isAirPlayAvailable,
    isCasting,
    activeDeviceName,
    triggerCast,
    triggerAirPlay,
  };
}
