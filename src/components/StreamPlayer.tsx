"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
};

/** Convert common URLs into something playable */
function normalizeSrc(raw: string): {
  kind: "archive-embed" | "hls" | "video" | "audio" | "iframe" | "unknown";
  url: string;
} {
  const src = raw.trim();

  // Internet Archive – details page → embed
  // https://archive.org/details/ITEM
  // https://archive.org/details/ITEM/path
  const detailsMatch = src.match(
    /archive\.org\/details\/([^/?#]+)/i
  );
  if (detailsMatch) {
    const id = detailsMatch[1];
    return {
      kind: "archive-embed",
      url: `https://archive.org/embed/${id}`,
    };
  }

  // Already embed
  if (/archive\.org\/embed\//i.test(src)) {
    return { kind: "archive-embed", url: src.split("?")[0] };
  }

  // archive.org/download/.../file.mp4
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

  // YouTube
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
          } else {
            setError("Browser haiauni HLS.");
          }
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

  // —— Internet Archive embed ——
  if (normalized.kind === "archive-embed") {
    return (
      <div className="space-y-3">
        <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video">
          <iframe
            src={`${normalized.url}?autoplay=0`}
            title={title || "Archive video"}
            className="absolute inset-0 w-full h-full"
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="text-[11px] text-slate-500">Internet Archive player</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-violet-400"
        >
          Fungua kwenye Archive.org →
        </a>
      </div>
    );
  }

  // —— YouTube / generic iframe ——
  if (normalized.kind === "iframe") {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video">
        <iframe
          src={normalized.url}
          title={title || "Video"}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  // —— Audio ——
  if (normalized.kind === "audio") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <audio controls className="w-full" src={normalized.url} preload="metadata" />
      </div>
    );
  }

  // —— HLS / MP4 video tag ——
  if (normalized.kind === "hls" || normalized.kind === "video") {
    return (
      <div className="space-y-3">
        <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            poster={poster || undefined}
            onError={() => setError("Video haichezi. Jaribu link nyingine.")}
          />
        </div>
        {error && (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
            {error}{" "}
            <a href={src} target="_blank" rel="noopener noreferrer" className="underline text-violet-400">
              Fungua nje
            </a>
          </div>
        )}
      </div>
    );
  }

  // —— Unknown URL ——
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
      <p className="text-sm text-slate-300">
        Link hii si stream ya moja kwa moja (.mp4 / .m3u8 / Archive). Tunajaribu kuifungua kwenye player wa nje.
      </p>
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video">
        <iframe
          src={src}
          title={title || "Content"}
          className="absolute inset-0 w-full h-full"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex px-4 py-2.5 rounded-xl bg-violet-600 text-sm font-semibold text-white"
      >
        Fungua link kamili →
      </a>
    </div>
  );
}
