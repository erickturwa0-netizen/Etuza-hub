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

function isDirectMedia(src: string) {
  return /\.(mp4|webm|ogg|mov|mp3|aac|m4a)(\?|$)/i.test(src);
}

function isHls(src: string) {
  return /\.m3u8(\?|$)/i.test(src) || src.includes("m3u8");
}

export default function StreamPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Inatafuta video…");
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "video" | "embed" | "fail">("loading");
  const [embedKind, setEmbedKind] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setMode("loading");
    setStatus("Inatafuta video…");
    setPlayUrl(null);
    setEmbedUrl(null);

    const raw = (src || "").trim();
    if (!raw) {
      setMode("fail");
      setError("Hakuna link.");
      return;
    }

    // 1) Social media → in-app embed (no navigate away)
    const social = detectSocial(raw);
    if (social.embedUrl) {
      if (!cancelled) {
        setEmbedUrl(social.embedUrl);
        setEmbedKind(social.kind || "social");
        setMode("embed");
        setStatus("");
      }
      return;
    }

    // 2) Direct file
    if (isDirectMedia(raw) || isHls(raw)) {
      if (!cancelled) {
        setPlayUrl(raw);
        setMode("video");
        setStatus("");
      }
      return;
    }

    // 3) Internet Archive
    const archiveId = extractArchiveId(raw);
    if (archiveId) {
      (async () => {
        try {
          setStatus("Inapakia Archive…");
          const res = await fetch(
            `/api/archive/resolve?id=${encodeURIComponent(archiveId)}`
          );
          const data = await res.json();
          if (cancelled) return;
          if (data.playUrl) {
            setPlayUrl(data.playUrl);
            setEmbedUrl(data.embedUrl || `https://archive.org/embed/${archiveId}`);
            setMode("video");
            setStatus("");
            return;
          }
          setEmbedUrl(data.embedUrl || `https://archive.org/embed/${archiveId}`);
          setEmbedKind("archive");
          setMode("embed");
          setStatus("");
        } catch {
          if (!cancelled) {
            setEmbedUrl(`https://archive.org/embed/${archiveId}`);
            setEmbedKind("archive");
            setMode("embed");
          }
        }
      })();
      return;
    }

    // 4) Any other https URL → try iframe in-app (generic page/player)
    if (/^https?:\/\//i.test(raw)) {
      if (!cancelled) {
        setEmbedUrl(raw);
        setEmbedKind("page");
        setMode("embed");
        setStatus("");
      }
      return;
    }

    setMode("fail");
    setError("Link haitambuliwi.");

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playUrl || mode !== "video") return;

    if (isHls(playUrl)) {
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
          if (embedUrl) setMode("embed");
        }
      })();
      return () => hls?.destroy();
    }

    el.src = playUrl;
  }, [playUrl, mode, embedUrl]);

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
            title={title || "Player"}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p className="text-[11px] text-slate-500">
          {embedKind === "youtube"
            ? "Inacheza ndani ya app (YouTube embed)"
            : embedKind === "facebook"
              ? "Inacheza ndani ya app (Facebook)"
              : embedKind === "archive"
                ? "Internet Archive"
                : "Inacheza ndani ya player"}
        </p>
      </div>
    );
  }

  if (mode === "video" && playUrl) {
    if (/\.(mp3|aac|m4a)(\?|$)/i.test(playUrl)) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <audio controls className="w-full" src={playUrl} preload="auto" />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            preload="auto"
            poster={poster || undefined}
            onError={() => {
              setError("Direct play imeshindwa – jaribu embed.");
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
