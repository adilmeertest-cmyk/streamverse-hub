import { useEffect, useRef } from "react";
import Hls from "hls.js";

export function VideoPlayer({ src, poster, onProgress }: { src: string; poster?: string | null; onProgress?: (sec: number, dur: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | undefined;
    if (src.endsWith(".m3u8")) {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      }
    } else {
      video.src = src;
    }

    let last = 0;
    const onTime = () => {
      const now = video.currentTime;
      if (Math.abs(now - last) > 5 && onProgress) {
        last = now;
        onProgress(Math.floor(now), Math.floor(video.duration || 0));
      }
    };
    video.addEventListener("timeupdate", onTime);

    return () => {
      video.removeEventListener("timeupdate", onTime);
      hls?.destroy();
    };
  }, [src, onProgress]);

  return (
    <video
      ref={videoRef}
      poster={poster ?? undefined}
      controls
      playsInline
      className="w-full h-full bg-black"
    />
  );
}