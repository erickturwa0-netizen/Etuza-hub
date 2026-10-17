"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
};

function extractArchiveId(src: string): string | null {
  const d = src.match(/archive\.org\/details\/([^/?#]+)/i);
  if (d) return d[1];
  const e = src.match(/archive\.org\/embed\/([^/?#]+)/i);
  if (e) return e[1];
  const dl = src.match(/archive\.org\/download\/([^/?#]+)/i);
  if (dl) return dl[1];
  return null;
}

export default function StreamPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Inatafuta video…");
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "video" | "embed" | "fail">("loading");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setMode("loading");
    setStatus("Inatafuta video…");

    const archiveId = extractArchiveId(src);

    async function run() {
      // Direct mp4/m3u8 already
      if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(src) && !archiveId) {
        if (!cancelled) {
          setPlayUrl(src);
          setMode("video");
        }
        return;
      }

      if (/\.m3u8/i.test(src) && !archiveId) {
        if (!cancelled) {
          setPlayUrl(src);
          setMode("video");
        }
        return;
      }

      if (archiveId) {
        try {
          setStatus("Inapakia kutoka Internet Archive…");
          const res = await fetch(
            `/api/archive/resolve?id=${encodeURIComponent(archiveId)}`
          );
          const data = await res.json();
          if (cancelled) return;

          if (data.playUrl) {
            setPlayUrl(data.playUrl);
            setEmbedUrl(data.embedUrl || null);
            setMode("video");
            setStatus("");
            return;
          }

          // No direct file – try embed
          if (data.embedUrl) {
            setEmbedUrl(data.embedUrl);
            setMode("embed");
            setStatus("");
            return;
          }

          setMode("fail");
          setError(data.error || "Hakuna video file");
        } catch {
          if (!cancelled) {
            setEmbedUrl(`https://archive.org/embed/${archiveId}`);
            setMode("embed");
          }
        }
        return;
      }

      // YouTube
      const yt =
        src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i) ||
        src.match(/youtube\.com\/embed\/([\w-]{6,})/i);
      if (yt) {
        setEmbedUrl(`https://www.youtube.com/embed/${yt[1]}`);
        setMode("embed");
        return;
      }

      setMode("fail");
      setError("Link hii haitambuliwi kama video.");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // HLS attach when needed
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playUrl || mode !== "video") return;

    if (/\.m3u8/i.test(playUrl)) {
      if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = playUrl;
        return;
      }
      let hls: { destroy: () => void } | null = null;
      (async () => {
        try {
          const Hls = (await import("hls.js")).default;
          if (Hls.isSupported() && videoRef.current) {
            const instance = new Hls();
            instance.loadSource(playUrl);
            instance.attachMedia(videoRef.current);
            hls = instance;
          }
        } catch {
          setError("HLS failed");
        }
      })();
      return () => hls?.destroy();
    }

    el.src = playUrl;
  }, [playUrl, mode]);

  if (mode === "loading") {
    return (
      <div
        className="rounded-2xl border border-slate-800 bg-black flex items-center justify-center text-slate-400 text-sm"
        style={{ aspectRatio: "16/9" }}
      >
        {status || "Loading…"}
      </div>
    );
  }

  if (mode === "video" && playUrl) {
    return (
      <div className="space-y-3">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            preload="metadata"
            poster={poster || undefined}
            onError={() => {
              setError("Direct MP4 imeshindwa – jaribu embed au fungua nje.");
              if (embedUrl) setMode("embed");
            }}
          />
        </div>
        {error && <p className="text-sm text-amber-300">{error}</p>}
        <div className="flex flex-wrap gap-3 text-xs">
          <a href={playUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">
            Direct file
          </a>
          {embedUrl && (
            <button type="button" onClick={() => setMode("embed")} className="text-slate-400 underline">
              Switch to Archive embed
            </button>
          )}
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-slate-500 underline">
            Original link
          </a>
        </div>
      </div>
    );
  }

  if (mode === "embed" && embedUrl) {
    return (
      <div className="space-y-3">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={title || "Video"}
            className="absolute inset-0 w-full h-full border-0"
            allow="encrypted-media; fullscreen; picture-in-picture; autoplay"
            allowFullScreen
          />
        </div>
        <a
          href={src.includes("archive.org") ? src : embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-violet-400 underline"
        >
          Fungua kwenye Archive.org (kama iframe haichezi) →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-3">
      <p className="text-sm text-slate-300">{error || "Haiwezi kucheza."}</p>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex px-4 py-2.5 rounded-xl bg-violet-600 text-sm font-semibold text-white"
      >
        Fungua link nje →
      </a>
    </div>
  );
}
