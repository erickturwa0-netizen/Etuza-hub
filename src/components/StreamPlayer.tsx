"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
};

function normalizeSrc(raw: string): {
  kind: "archive-embed" | "hls" | "video" | "audio" | "iframe" | "unknown";
  url: string;
  archiveId?: string;
} {
  const src = raw.trim();

  // https://archive.org/details/the-chinese-connection-1973
  const detailsMatch = src.match(/archive\.org\/details\/([^/?#]+)/i);
  if (detailsMatch) {
    const id = detailsMatch[1];
    return {
      kind: "archive-embed",
      url: `https://archive.org/embed/${id}`,
      archiveId: id,
    };
  }

  const embedMatch = src.match(/archive\.org\/embed\/([^/?#]+)/i);
  if (embedMatch) {
    return {
      kind: "archive-embed",
      url: `https://archive.org/embed/${embedMatch[1]}`,
      archiveId: embedMatch[1],
    };
  }

  if (/archive\.org\/download\//i.test(src) && /\.(mp4|webm|ogg)(\?|$)/i.test(src)) {
    return { kind: "video", url: src };
  }

  if (/\.m3u8(\?|$)/i.test(src) || src.includes("m3u8")) {
    return { kind: "hls", url: src };
  }

  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(src)) {
    return { kind: "video", url: src };
  }

  if (/\.(mp3|aac|m4a)(\?|$)/i.test(src)) {
    return { kind: "audio", url: src };
  }

  const yt =
    src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i) ||
    src.match(/youtube\.com\/embed\/([\w-]{6,})/i);
  if (yt) {
    return { kind: "iframe", url: `https://www.youtube.com/embed/${yt[1]}` };
  }

  return { kind: "unknown", url: src };
}

export default function StreamPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const normalized = normalizeSrc(src);

  useEffect(() => {
    setError("");
    const el = videoRef.current;
    if (!el) return;

    if (normalized.kind === "hls") {
      if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = normalized.url;
        return;
      }

      let hls: { destroy: () => void } | null = null;
      let cancelled = false;

      (async () => {
        try {
          const Hls = (await import("hls.js")).default;
          if (cancelled || !videoRef.current) return;
          if (Hls.isSupported()) {
            const instance = new Hls({ enableWorker: true });
            instance.loadSource(normalized.url);
            instance.attachMedia(videoRef.current);
            instance.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) setError("HLS stream imeshindwa.");
            });
            hls = instance;
          } else setError("Browser haiauni HLS.");
        } catch {
          setError("HLS player haijapakia.");
        }
      })();

      return () => {
        cancelled = true;
        hls?.destroy();
      };
    }

    if (normalized.kind === "video") {
      el.src = normalized.url;
    }
  }, [normalized.kind, normalized.url]);

  // Internet Archive embed – your link becomes this automatically
  if (normalized.kind === "archive-embed") {
    return (
      <div className="space-y-3">
        <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black" style={{ aspectRatio: "16/9" }}>
          <iframe
            key={normalized.url}
            src={normalized.url}
            title={title || "Internet Archive"}
            className="absolute inset-0 w-full h-full border-0"
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-emerald-400">Archive embed active</span>
          <a
            href={normalized.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 underline"
          >
            {normalized.url}
          </a>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 underline"
          >
            Original details page
          </a>
        </div>
      </div>
    );
  }

  if (normalized.kind === "iframe") {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={normalized.url}
          title={title || "Video"}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (normalized.kind === "audio") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <audio controls className="w-full" src={normalized.url} preload="metadata" />
      </div>
    );
  }

  if (normalized.kind === "hls" || normalized.kind === "video") {
    return (
      <div className="space-y-3">
        <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black" style={{ aspectRatio: "16/9" }}>
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            poster={poster || undefined}
            onError={() => setError("Video haichezi.")}
          />
        </div>
        {error && (
          <p className="text-sm text-amber-300">
            {error}{" "}
            <a href={src} target="_blank" rel="noopener noreferrer" className="underline text-violet-400">
              Fungua nje
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
      <p className="text-sm text-slate-300">Link si stream ya moja kwa moja. Fungua nje au badilisha kuwa Archive details URL.</p>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex px-4 py-2.5 rounded-xl bg-violet-600 text-sm font-semibold text-white"
      >
        Fungua link →
      </a>
    </div>
  );
}
