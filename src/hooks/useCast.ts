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

  // Initialize Google Cast SDK & AirPlay
  useEffect(() => {
    let isMounted = true;
    let castStateListener: ((event: any) => void) | null = null;
    let castContext: any = null;

    const setupCastContext = () => {
      if (!isMounted || typeof window === "undefined" || !(window as any).cast?.framework) return;
      try {
        castContext = (window as any).cast.framework.CastContext.getInstance();
        
        // Initialize options only once
        if (!castContext.getCastState) {
          castContext.setOptions({
            receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });
        }

        // Session state listener
        const StateEvent = (window as any).cast.framework.CastContextEventType;
        const CastState = (window as any).cast.framework.CastState;

        castStateListener = (event: any) => {
          if (!isMounted) return;
          if (event.castState === CastState.CONNECTED) {
            setIsCasting(true);
            const session = castContext.getCurrentSession();
            setActiveDeviceName(session?.getCastDevice()?.friendlyName || "TV");
          } else if (event.castState === CastState.NOT_CONNECTED) {
            setIsCasting(false);
            setActiveDeviceName(null);
          }
        };

        castContext.addEventListener(StateEvent.CAST_STATE_CHANGED, castStateListener);
        if (isMounted) {
          setIsCastAvailable(true);
        }
      } catch (e) {
        console.warn("[CAST] Context init notice:", e);
      }
    };

    // Check if Cast SDK is already active
    if (typeof window !== "undefined" && (window as any).chrome?.cast?.isAvailable) {
      setIsCastAvailable(true);
      setupCastContext();
    } else if (typeof window !== "undefined") {
      (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable && isMounted) {
          setupCastContext();
        }
      };

      if (!document.getElementById("google-cast-sdk")) {
        const script = document.createElement("script");
        script.id = "google-cast-sdk";
        script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    // AirPlay availability detection for WebKit / Safari
    if (typeof window !== "undefined" && (window as any).WebKitPlaybackTargetAvailabilityEvent) {
      setIsAirPlayAvailable(true);
    }

    // Cleanup listeners on unmount
    return () => {
      isMounted = false;
      if (typeof window !== "undefined" && (window as any).__onGCastApiAvailable) {
        delete (window as any).__onGCastApiAvailable;
      }
      if (castContext && castStateListener && (window as any).cast?.framework) {
        try {
          const StateEvent = (window as any).cast.framework.CastContextEventType;
          castContext.removeEventListener(StateEvent.CAST_STATE_CHANGED, castStateListener);
        } catch {}
      }
    };
  }, []);

  // Trigger Google Chromecast Session
  const triggerCast = useCallback(
    async (streamUrl: string, metadata: CastMetadata) => {
      if (!(window as any).cast?.framework) {
        alert("Chromecast is not available on this browser/device.");
        return;
      }

      try {
        const castContext = (window as any).cast.framework.CastContext.getInstance();
        await castContext.requestSession();
        const session = castContext.getCurrentSession();

        if (session) {
          const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(
            streamUrl,
            streamUrl.includes(".m3u8") ? "application/x-mpegurl" : "video/mp4"
          );

          const mediaMetadata = new (window as any).chrome.cast.media.GenericMediaMetadata();
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
              (window as any).chrome.cast.media.TrackType.TEXT
            );
            subtitleTrack.trackContentId = metadata.subtitleUrl;
            subtitleTrack.trackContentType = "text/vtt";
            subtitleTrack.subtype = (window as any).chrome.cast.media.TextTrackType.SUBTITLES;
            subtitleTrack.name = "English Subtitles";
            subtitleTrack.language = "en-US";
            mediaInfo.tracks = [subtitleTrack];
          }

          const request = new (window as any).chrome.cast.media.LoadRequest(mediaInfo);
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
    []
  );

  // Trigger Apple AirPlay Target Picker
  const triggerAirPlay = useCallback((videoElement: HTMLVideoElement | null) => {
    if (!videoElement) return;

    if ((videoElement as any).webkitShowPlaybackTargetPicker) {
      (videoElement as any).webkitShowPlaybackTargetPicker();
    } else {
      alert("AirPlay is supported on Safari / Apple devices.");
    }
  }, []);

  return {
    isCastAvailable,
    isAirPlayAvailable,
    isCasting,
    activeDeviceName,
    triggerCast,
    triggerAirPlay,
  };
}
