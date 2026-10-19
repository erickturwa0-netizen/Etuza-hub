"use client";

import { useEffect, useRef, useState } from "react";
import { detectSocial } from "@/lib/social-embed";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
};

type Source = { provider: string; url: string };

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

/** Detect embed players that use TMDB id in path */
function extractTmdbEmbed(src: string): { id: string; media: "movie" | "tv" } | null {
  const patterns = [
    /(?:videasy\.(?:net|to)|vidrock\.net|vidlink\.pro|vidfast\.pro|vidnest\.fun|vidup\.to|111movies\.com|vidzen\.fun|vidcore\.net|moviesapi\.to)\/(movie|tv)\/(\d+)/i,
    /vidking\.net\/embed\/(movie|tv)\/(\d+)/i,
    /player\.vidplus\.to\/embed\/(movie|tv)\/(\d+)/i,
    /vixsrc\.to\/embed\/(movie|tv)\/(\d+)/i,
    /eliteplex[^/]*\/.*?tmdb_id=(\d+).*?media=(movie|tv)/i,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (m) {
      if (m[1] && /^\d+$/.test(m[1])) {
        return { id: m[1], media: (m[2] as "movie" | "tv") || "movie" };
      }
      if (m[2] && /^\d+$/.test(m[2])) {
        return { id: m[2], media: (m[1] as "movie" | "tv") || "movie" };
      }
    }
  }
  // fallback: /movie/12345 or /tv/12345 anywhere
  const m2 = src.match(/\/(movie|tv)\/(\d{3,})/i);
  if (m2) return { id: m2[2], media: m2[1].toLowerCase() as "movie" | "tv" };
  return null;
}

const FALLBACK_EMBEDS = (id: string, media: "movie" | "tv"): Source[] => [
  { provider: "Videasy", url: `https://player.videasy.to/${media}/${id}` },
  { provider: "Vidrock", url: `https://vidrock.net/${media}/${id}` },
  { provider: "VidLink", url: `https://vidlink.pro/${media}/${id}` },
  { provider: "VidFast", url: `https://vidfast.pro/${media}/${id}` },
  { provider: "VidKing", url: `https://www.vidking.net/embed/${media}/${id}` },
  { provider: "111Movies", url: `https://111movies.com/${media}/${id}` },
  { provider: "VidNest", url: `https://vidnest.fun/${media}/${id}` },
];

export default function StreamPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Inatafuta video…");
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "video" | "embed" | "fail">("loading");
  const [embedKind, setEmbedKind] = useState("");
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

    // 1) Social
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

    // 2) Direct / HLS
    if (isDirectMedia(raw) || isHls(raw)) {
      if (!cancelled) {
        setPlayUrl(raw);
        setMode("video");
        setStatus("");
      }
      return;
    }

    // 3) ElitePlex / TMDB embed multi-source
    const tmdb = extractTmdbEmbed(raw);
    if (tmdb) {
      (async () => {
        setStatus("Inatafuta sources…");
        let list: Source[] = [];
        try {
          const res = await fetch(
            `https://eliteplex-api.vercel.app/api/play?tmdb_id=${tmdb.id}&media=${tmdb.media}&fast=true`,
            { headers: { Accept: "application/json" } }
          );
          if (res.ok) {
            const data = await res.json();
            list = ((data.sources || []) as { provider?: string; url?: string; play_url?: string }[])
              .map((s) => ({
                provider: s.provider || "Source",
                url: s.play_url || s.url || "",
              }))
              .filter((s) => s.url);
          }
        } catch {
          /* ignore */
        }
        if (!list.length) list = FALLBACK_EMBEDS(tmdb.id, tmdb.media);
        if (cancelled) return;
        setSources(list);
        setSourceIdx(0);
        setEmbedUrl(list[0].url);
        setEmbedKind("eliteplex");
        setMode("embed");
        setStatus("");
      })();
      return;
    }

    // 4) Archive
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

    // 5) Generic https → iframe
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
            const instance = new Hls({
              enableWorker: true,
              maxBufferLength: 30,
            });
            instance.loadSource(playUrl);
            instance.attachMedia(videoRef.current);
            instance.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) {
                setError("Stream imeshindwa (HLS).");
              }
            });
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

  function switchSource(i: number) {
    if (!sources[i]) return;
    setSourceIdx(i);
    setEmbedUrl(sources[i].url);
    setError("");
    setMode("embed");
  }

  function nextSource() {
    if (sourceIdx + 1 < sources.length) switchSource(sourceIdx + 1);
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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
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
                onClick={nextSource}
                disabled={sourceIdx + 1 >= sources.length}
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-700 text-white disabled:opacity-40"
              >
                Source inayofuata →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sources.slice(0, 10).map((s, i) => (
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

        <p className="text-[11px] text-slate-500">
          {embedKind === "eliteplex"
            ? "Multi-source player · kama haichezi, chagua source nyingine"
            : "Inacheza ndani ya player"}
        </p>
        {error && <p className="text-sm text-amber-300">{error}</p>}
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
            onError={() => setError("Stream imeshindwa.")}
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
