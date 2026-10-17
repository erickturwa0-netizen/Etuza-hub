"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
};

function isHls(url: string) {
  return /\.m3u8(\?|$)/i.test(url) || url.includes("m3u8");
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function isAudio(url: string) {
  return /\.(mp3|aac|ogg|m4a)(\?|$)/i.test(url);
}

export default function StreamPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"hls" | "video" | "audio" | "iframe" | "external">("video");

  useEffect(() => {
    setError("");
    const el = videoRef.current;

    if (isAudio(src) && !isHls(src)) {
      setMode("audio");
      return;
    }

    if (isHls(src)) {
      setMode("hls");
      if (!el) return;

      // Native HLS (Safari)
      if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = src;
        return;
      }

      // hls.js for Chrome / Firefox / Android
      let hls: { destroy: () => void } | null = null;
      let cancelled = false;

      (async () => {
        try {
          const Hls = (await import("hls.js")).default;
          if (cancelled || !videoRef.current) return;
          if (Hls.isSupported()) {
            const instance = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });
            instance.loadSource(src);
            instance.attachMedia(videoRef.current);
            instance.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) {
                setError("Stream imeshindwa kucheza. Angalia link au CORS.");
              }
            });
            hls = instance;
          } else {
            setError("Browser hii haiauni HLS stream.");
          }
        } catch {
          setError("Imeshindwa kupakia HLS player.");
        }
      })();

      return () => {
        cancelled = true;
        hls?.destroy();
      };
    }

    if (isDirectVideo(src)) {
      setMode("video");
      if (el) el.src = src;
      return;
    }

    // Unknown – try as video first, fallback message with open link
    setMode("video");
    if (el) {
      el.src = src;
    }
  }, [src]);

  if (mode === "audio") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <audio controls className="w-full" src={src} preload="metadata">
          Browser yako haiauni audio.
        </audio>
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 mt-2 inline-block">
          Open stream URL
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          playsInline
          poster={poster || undefined}
          onError={() =>
            setError(
              "Haiwezi kucheza link hii moja kwa moja (mp4/m3u8 inahitajika, au server inazuia CORS)."
            )
          }
        >
          Browser yako haiauni video tag.
        </video>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm space-y-2">
          <p>{error}</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-violet-400 underline text-xs"
          >
            Fungua link nje →
          </a>
        </div>
      )}

      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-slate-500 hover:text-violet-400"
      >
        Open original link
      </a>
    </div>
  );
}
