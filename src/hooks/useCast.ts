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
        
        // Ensure Cast Context options are always initialized
        try {
          castContext.setOptions({
            receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });
        } catch {}

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
      const prevCallback = (window as any).__onGCastApiAvailable;
      (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
        if (typeof prevCallback === "function") {
          try { prevCallback(isAvailable); } catch {}
        }
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
      if (typeof window === "undefined" || !(window as any).cast?.framework) {
        alert("Chromecast is not supported or ready on this browser. Try Google Chrome or MS Edge.");
        return;
      }

      try {
        const castContext = (window as any).cast.framework.CastContext.getInstance();
        
        // Ensure receiver application options are initialized before requesting session
        try {
          castContext.setOptions({
            receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });
        } catch {}

        await castContext.requestSession();
        const session = castContext.getCurrentSession();

        if (session) {
          // Resolve relative URLs to absolute HTTP/HTTPS origin URLs for Chromecast Receiver
          let fullStreamUrl = streamUrl;
          if (streamUrl && streamUrl.startsWith("/")) {
            fullStreamUrl = `${window.location.origin}${streamUrl}`;
          }

          const lowerUrl = fullStreamUrl.toLowerCase();
          const isHls =
            lowerUrl.includes(".m3u8") ||
            lowerUrl.includes("/proxy/stream") ||
            lowerUrl.includes("type=hls") ||
            lowerUrl.includes("format=hls");

          const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(
            fullStreamUrl,
            isHls ? "application/x-mpegurl" : "video/mp4"
          );

          const mediaMetadata = new (window as any).chrome.cast.media.GenericMediaMetadata();
          mediaMetadata.title = metadata.title;
          if (metadata.poster) {
            let posterUrl = metadata.poster;
            if (posterUrl.startsWith("/")) {
              posterUrl = `${window.location.origin}${posterUrl}`;
            }
            mediaMetadata.images = [
              new (window as any).chrome.cast.media.Image(posterUrl),
            ];
          }
          mediaInfo.metadata = mediaMetadata;

          // Attach subtitles if available (must be valid HTTP/HTTPS URL, not blob:)
          if (metadata.subtitleUrl && !metadata.subtitleUrl.startsWith("blob:")) {
            let subUrl = metadata.subtitleUrl;
            if (subUrl.startsWith("/")) {
              subUrl = `${window.location.origin}${subUrl}`;
            }
            const subtitleTrack = new (window as any).chrome.cast.media.Track(
              1,
              (window as any).chrome.cast.media.TrackType.TEXT
            );
            subtitleTrack.trackContentId = subUrl;
            subtitleTrack.trackContentType = "text/vtt";
            subtitleTrack.subtype = (window as any).chrome.cast.media.TextTrackType.SUBTITLES;
            subtitleTrack.name = "Subtitles";
            subtitleTrack.language = "en";
            mediaInfo.tracks = [subtitleTrack];
            mediaInfo.activeTrackIds = [1];
          }

          const request = new (window as any).chrome.cast.media.LoadRequest(mediaInfo);
          await session.loadMedia(request);
          setIsCasting(true);
          setActiveDeviceName(session.getCastDevice()?.friendlyName || "TV");
        }
      } catch (err: any) {
        if (err !== "cancel" && err?.code !== "cancel") {
          console.error("[CAST] Error starting cast session:", err);
          alert(`Cast session notice: ${typeof err === "string" ? err : err?.message || "Failed to connect to Cast device."}`);
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
