"use client";

import { useEffect, useRef, useState } from "react";
import { detectSocial } from "@/lib/social-embed";
import { ExternalLink } from "lucide-react";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
};

type Source = { provider: string; url: string };

function isDirectMedia(src: string) {
  return /\.(mp4|webm|ogg|mov|mp3|aac|m4a)(\?|$)/i.test(src);
}

function isHls(src: string) {
  return /\.m3u8(\?|$)/i.test(src) || src.includes("m3u8");
}

function proxyHls(url: string) {
  return `/api/proxy/stream?url=${encodeURIComponent(url)}`;
}

function extractTmdbEmbed(src: string): { id: string; media: "movie" | "tv" } | null {
  const m2 = src.match(/\/(movie|tv)\/(\d{3,})/i);
  if (m2) return { id: m2[2], media: m2[1].toLowerCase() as "movie" | "tv" };
  const m3 = src.match(/tmdb_id=(\d+).*media=(movie|tv)/i);
  if (m3) return { id: m3[1], media: m3[2] as "movie" | "tv" };
  return null;
}

const FALLBACK_EMBEDS = (id: string, media: "movie" | "tv"): Source[] => [
  { provider: "Videasy", url: `https://player.videasy.to/${media}/${id}` },
  { provider: "Vidrock", url: `https://vidrock.net/${media}/${id}` },
  { provider: "VidLink", url: `https://vidlink.pro/${media}/${id}` },
  { provider: "VidFast", url: `https://vidfast.pro/${media}/${id}` },
  { provider: "VidKing", url: `https://www.vidking.net/embed/${media}/${id}` },
  { provider: "111Movies", url: `https://111movies.com/${media}/${id}` },
  { provider: "MoviesAPI", url: `https://moviesapi.to/${media}/${id}` },
  { provider: "VidPlus", url: `https://player.vidplus.to/embed/${media}/${id}` },
];

export default function StreamPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Inatafuta video…");
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "video" | "embed" | "fail">("loading");
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceIdx, setSourceIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setMode("loading");
    setStatus("Inatafuta video…");
    setPlayUrl(null);
    setEmbedUrl(null);
    setSources([]);
    setSourceIdx(0);

    const raw = (src || "").trim();
    if (!raw) {
      setMode("fail");
      setError("Hakuna link.");
      return;
    }

    const social = detectSocial(raw);
    if (social.embedUrl) {
      if (!cancelled) {
        setEmbedUrl(social.embedUrl);
        setMode("embed");
        setStatus("");
      }
      return;
    }

    // HLS / direct via proxy for m3u8
    if (isHls(raw) || isDirectMedia(raw)) {
      if (!cancelled) {
        setPlayUrl(isHls(raw) ? proxyHls(raw) : raw);
        setMode("video");
        setStatus("");
      }
      return;
    }

    const tmdb = extractTmdbEmbed(raw);
    if (tmdb) {
      (async () => {
        setStatus("Inatafuta sources…");
        let list: Source[] = [];
        try {
          const res = await fetch(
            `https://eliteplex-api.vercel.app/api/play?tmdb_id=${tmdb.id}&media=${tmdb.media}&fast=true`
          );
          if (res.ok) {
            const data = await res.json();
            list = ((data.sources || []) as { provider?: string; url?: string; play_url?: string }[])
              .map((s) => ({
                provider: s.provider || "Source",
                url: s.play_url || s.url || "",
              }))
              .filter((s) => s.url && s.url.startsWith("http"));
          }
        } catch {
          /* ignore */
        }
        if (!list.length) list = FALLBACK_EMBEDS(tmdb.id, tmdb.media);
        if (cancelled) return;
        setSources(list);
        setSourceIdx(0);
        setEmbedUrl(list[0].url);
        setMode("embed");
        setStatus("");
      })();
      return;
    }

    if (/^https?:\/\//i.test(raw)) {
      if (!cancelled) {
        setEmbedUrl(raw);
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

  // Auto-advance embed source after 5s if user hasn't switched (helps dead embeds)
  useEffect(() => {
    if (mode !== "embed" || sources.length < 2) return;
    const t = setTimeout(() => {
      // only auto-advance first 3 attempts
      if (sourceIdx < 2 && sourceIdx + 1 < sources.length) {
        setSourceIdx((i) => i + 1);
        setEmbedUrl(sources[sourceIdx + 1]?.url || null);
      }
    }, 6000);
    return () => clearTimeout(t);
  }, [mode, sourceIdx, sources]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playUrl || mode !== "video") return;

    if (isHls(playUrl) || playUrl.includes("/api/proxy/stream")) {
      if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = playUrl;
        el.play().catch(() => {});
        return;
      }
      let hls: { destroy: () => void } | null = null;
      (async () => {
        try {
          const Hls = (await import("hls.js")).default;
          if (Hls.isSupported() && videoRef.current) {
            const instance = new Hls({
              enableWorker: true,
              maxBufferLength: 30,
              xhrSetup: (xhr: XMLHttpRequest) => {
                xhr.withCredentials = false;
              },
            });
            instance.loadSource(playUrl);
            instance.attachMedia(videoRef.current);
            instance.on(Hls.Events.MANIFEST_PARSED, () => {
              videoRef.current?.play().catch(() => {});
            });
            instance.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) {
                setError("Stream imeshindwa. Jaribu channel nyingine.");
              }
            });
            hls = instance;
          } else {
            setError("Kifaa hakisaidii HLS");
          }
        } catch {
          setError("HLS failed");
        }
      })();
      return () => hls?.destroy();
    }

    el.src = playUrl;
    el.play().catch(() => {});
  }, [playUrl, mode]);

  function switchSource(i: number) {
    if (!sources[i]) return;
    setSourceIdx(i);
    setEmbedUrl(sources[i].url);
    setError("");
    setMode("embed");
  }

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
      <div className="space-y-3">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={title || "Player"}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            allowFullScreen
            referrerPolicy="origin"
          />
        </div>

        {sources.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">
                Source {sourceIdx + 1}/{sources.length}:{" "}
                <span className="text-slate-300">{sources[sourceIdx]?.provider}</span>
              </p>
              <button
                type="button"
                onClick={() =>
                  sourceIdx + 1 < sources.length && switchSource(sourceIdx + 1)
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-700 text-white"
              >
                Source inayofuata →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.slice(0, 12).map((s, i) => (
                <button
                  key={s.provider + i}
                  type="button"
                  onClick={() => switchSource(i)}
                  className={`px-2 py-1 rounded-md text-[10px] border ${
                    i === sourceIdx
                      ? "border-violet-500 bg-violet-600/30 text-violet-200"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {s.provider}
                </button>
              ))}
            </div>
          </div>
        )}

        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-sm font-semibold text-white"
        >
          <ExternalLink className="w-4 h-4" />
          Fungua player nje (kama iframe haichezi)
        </a>

        <p className="text-[11px] text-slate-500">
          Tip: Movies mpya (2026) zinaweza kuwa bado hazina stream. Jaribu movie za zamani.
        </p>
      </div>
    );
  }

  if (mode === "video" && playUrl) {
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
            autoPlay
            preload="auto"
            poster={poster || undefined}
            onError={() => setError("Stream imeshindwa. Jaribu channel nyingine.")}
          />
        </div>
        {error && <p className="text-sm text-amber-300">{error}</p>}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-violet-400"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Fungua stream nje
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
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-sm font-semibold text-white"
      >
        <ExternalLink className="w-4 h-4" />
        Fungua link nje →
      </a>
    </div>
  );
}
