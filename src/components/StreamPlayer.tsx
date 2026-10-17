"use client";

import { useEffect, useRef, useState } from "react";
import { detectSocial } from "@/lib/social-embed";

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
  const [embedKind, setEmbedKind] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setMode("loading");
    setStatus("Inatafuta video…");

    const social = detectSocial(src);
    if (social.embedUrl) {
      if (!cancelled) {
        setEmbedUrl(social.embedUrl);
        setEmbedKind(social.kind || "social");
        setMode("embed");
        setStatus("");
      }
      return;
    }

    const archiveId = extractArchiveId(src);

    async function run() {
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

      if (/\.(mp3|aac|m4a)(\?|$)/i.test(src)) {
        if (!cancelled) {
          setPlayUrl(src);
          setMode("video"); // audio via video tag works too, or we handle below
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
          if (data.embedUrl) {
            setEmbedUrl(data.embedUrl);
            setEmbedKind("archive");
            setMode("embed");
            setStatus("");
            return;
          }
          setMode("fail");
          setError(data.error || "Hakuna video file");
        } catch {
          if (!cancelled) {
            setEmbedUrl(`https://archive.org/embed/${archiveId}`);
            setEmbedKind("archive");
            setMode("embed");
          }
        }
        return;
      }

      setMode("fail");
      setError("Link hii haitambuliwi. Tumia YouTube, Facebook, Archive, .mp4 au .m3u8");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [src]);

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

  if (mode === "embed" && embedUrl) {
    return (
      <div className="space-y-2">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={title || "Video"}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            // sandbox limited – social players need scripts
          />
        </div>
        <p className="text-[11px] text-slate-500">
          {embedKind === "youtube"
            ? "YouTube embed (branding kidogo inaweza kuonekana – sheria za YouTube)"
            : embedKind === "facebook"
              ? "Facebook embed"
              : embedKind === "archive"
                ? "Internet Archive"
                : "Embedded player"}
        </p>
      </div>
    );
  }

  if (mode === "video" && playUrl) {
    const isAudio = /\.(mp3|aac|m4a)(\?|$)/i.test(playUrl);
    if (isAudio) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <audio controls className="w-full" src={playUrl} preload="metadata" />
        </div>
      );
    }
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
              setError("Direct play imeshindwa.");
              if (embedUrl) setMode("embed");
            }}
          />
        </div>
        {error && <p className="text-sm text-amber-300">{error}</p>}
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
