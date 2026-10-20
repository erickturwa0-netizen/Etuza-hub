"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { detectSocial } from "@/lib/social-embed";
import { ExternalLink, Play, RefreshCw } from "lucide-react";

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
];

export default function StreamPlayer({ src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Inatafuta…");
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [rawHls, setRawHls] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"loading" | "video" | "embed" | "fail">("loading");
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [useProxy, setUseProxy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setMode("loading");
    setStatus("Inatafuta…");
    setPlayUrl(null);
    setRawHls(null);
    setEmbedUrl(null);
    setSources([]);
    setSourceIdx(0);
    setUseProxy(true);

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
      }
      return;
    }

    if (isHls(raw)) {
      if (!cancelled) {
        setRawHls(raw);
        setPlayUrl(proxyHls(raw));
        setMode("video");
      }
      return;
    }

    if (isDirectMedia(raw)) {
      if (!cancelled) {
        setPlayUrl(raw);
        setMode("video");
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
              .filter((s) => s.url.startsWith("http"));
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
      })();
      return;
    }

    if (/^https?:\/\//i.test(raw)) {
      if (!cancelled) {
        setEmbedUrl(raw);
        setMode("embed");
      }
      return;
    }

    setMode("fail");
    setError("Link haitambuliwi.");
    return () => {
      cancelled = true;
    };
  }, [src]);

  const attachHls = useCallback(async (url: string) => {
    const el = videoRef.current;
    if (!el) return;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    setError("");

    // Safari / iOS native
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = url;
      try {
        await el.play();
      } catch {
        /* user gesture needed */
      }
      return;
    }

    try {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const instance = new Hls({
          enableWorker: true,
          maxBufferLength: 40,
          fragLoadingMaxRetry: 4,
          manifestLoadingMaxRetry: 3,
        });
        instance.loadSource(url);
        instance.attachMedia(el);
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          el.play().catch(() => {});
        });
        instance.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            instance.startLoad();
            return;
          }
          setError("Stream imeshindwa kwenye browser hii.");
        });
        hlsRef.current = instance;
      } else {
        el.src = url;
      }
    } catch {
      setError("HLS player haikupatikana");
      el.src = url;
    }
  }, []);

  useEffect(() => {
    if (mode !== "video" || !playUrl) return;
    attachHls(playUrl);
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [playUrl, mode, attachHls]);

  function toggleProxy() {
    if (!rawHls) return;
    const next = !useProxy;
    setUseProxy(next);
    setPlayUrl(next ? proxyHls(rawHls) : rawHls);
    setError("");
  }

  function switchSource(i: number) {
    if (!sources[i]) return;
    setSourceIdx(i);
    setEmbedUrl(sources[i].url);
    setError("");
  }

  function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (mode === "loading") {
    return (
      <div
        className="rounded-2xl border border-slate-800 bg-black flex items-center justify-center text-slate-400 text-sm"
        style={{ minHeight: 220, aspectRatio: "16/9" }}
      >
        {status}
      </div>
    );
  }

  // ——— EMBED (movies / series) ———
  if (mode === "embed" && embedUrl) {
    return (
      <div className="space-y-3">
        {/* Primary: open outside iframe — works on mobile webviews */}
        <button
          type="button"
          onClick={() => openExternal(embedUrl)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-emerald-600 text-white font-semibold text-sm"
        >
          <Play className="w-5 h-5 fill-current" />
          Cheza sasa (fungua player)
        </button>

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
            referrerPolicy="origin"
          />
        </div>

        {sources.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">
                {sources[sourceIdx]?.provider} ({sourceIdx + 1}/{sources.length})
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

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Kama kisanduku kinaonyesha ikoni tupu: bofya <b>Cheza sasa</b> juu.
          Movies za 2026 zinaweza kuwa bado hazina video.
        </p>
      </div>
    );
  }

  // ——— VIDEO / HLS (TV) ———
  if (mode === "video" && playUrl) {
    return (
      <div className="space-y-3">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-black"
          style={{ aspectRatio: "16/9", minHeight: 200 }}
        >
          <video
            ref={videoRef}
            className="w-full h-full bg-black"
            controls
            playsInline
            autoPlay
            muted={false}
            preload="auto"
            poster={poster || undefined}
            style={{ minHeight: 200 }}
            onError={() =>
              setError("Video haikucheza. Jaribu " + (useProxy ? "bila proxy" : "proxy") + ".")
            }
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const el = videoRef.current;
              if (el) el.play().catch(() => {});
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
          >
            <Play className="w-4 h-4 fill-current" />
            Play
          </button>

          {rawHls && (
            <button
              type="button"
              onClick={toggleProxy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm text-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
              {useProxy ? "Jaribu moja kwa moja" : "Jaribu proxy"}
            </button>
          )}

          <a
            href={rawHls || src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-sm text-white font-semibold"
          >
            <ExternalLink className="w-4 h-4" />
            Fungua nje
          </a>
        </div>

        {error && <p className="text-sm text-amber-300">{error}</p>}
        <p className="text-[11px] text-slate-500 break-all">{rawHls || src}</p>
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
        Fungua link nje
      </a>
    </div>
  );
}
