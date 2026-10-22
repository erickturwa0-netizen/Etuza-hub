"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { detectSocial } from "@/lib/social-embed";
import { Play, RefreshCw, Maximize2 } from "lucide-react";

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
  return "/api/proxy/stream?url=" + encodeURIComponent(url);
}

function extractTmdbEmbed(src: string): { id: string; media: "movie" | "tv" } | null {
  const m = src.match(/\/(movie|tv)\/(\d{3,})/i);
  if (!m) return null;
  return { id: m[2], media: m[1].toLowerCase() as "movie" | "tv" };
}

/** Fastest common free embeds first */
function buildSources(id: string, media: "movie" | "tv"): Source[] {
  if (media === "movie") {
    return [
      {
        provider: "MultiEmbed",
        url: "https://multiembed.mov/?video_id=" + id + "&tmdb=1",
      },
      { provider: "VidSrc.xyz", url: "https://vidsrc.xyz/embed/movie/" + id },
      { provider: "2Embed", url: "https://www.2embed.cc/embed/" + id },
      { provider: "VidSrc", url: "https://vidsrc.to/embed/movie/" + id },
    ];
  }
  return [
    {
      provider: "MultiEmbed",
      url: "https://multiembed.mov/?video_id=" + id + "&tmdb=1&s=1&e=1",
    },
    { provider: "VidSrc.xyz", url: "https://vidsrc.xyz/embed/tv/" + id },
    { provider: "2Embed", url: "https://www.2embed.cc/embedtv/" + id },
    { provider: "VidSrc", url: "https://vidsrc.to/embed/tv/" + id },
  ];
}

type Resolved =
  | { kind: "embed"; url: string; sources: Source[]; idx: number }
  | { kind: "hls"; url: string; raw: string }
  | { kind: "video"; url: string }
  | { kind: "fail"; error: string };

function resolveSrc(src: string): Resolved {
  const raw = (src || "").trim();
  if (!raw) return { kind: "fail", error: "Hakuna link." };

  const social = detectSocial(raw);
  if (social.embedUrl) {
    return { kind: "embed", url: social.embedUrl, sources: [], idx: 0 };
  }

  if (isHls(raw)) {
    return { kind: "hls", url: proxyHls(raw), raw };
  }

  if (isDirectMedia(raw)) {
    return { kind: "video", url: raw };
  }

  const tmdb = extractTmdbEmbed(raw);
  if (tmdb) {
    const list = buildSources(tmdb.id, tmdb.media);
    return { kind: "embed", url: list[0].url, sources: list, idx: 0 };
  }

  if (/^https?:\/\//i.test(raw)) {
    return { kind: "embed", url: raw, sources: [], idx: 0 };
  }

  return { kind: "fail", error: "Link haitambuliwi." };
}

export default function StreamPlayer({ src, poster, title }: Props) {
  // Resolve on first paint — no "Inapakia" delay for embeds
  const initial = useMemo(() => resolveSrc(src), [src]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [error, setError] = useState(
    initial.kind === "fail" ? initial.error : ""
  );
  const [sources, setSources] = useState<Source[]>(
    initial.kind === "embed" ? initial.sources : []
  );
  const [sourceIdx, setSourceIdx] = useState(
    initial.kind === "embed" ? initial.idx : 0
  );
  const [embedUrl, setEmbedUrl] = useState<string | null>(
    initial.kind === "embed" ? initial.url : null
  );
  const [playUrl, setPlayUrl] = useState<string | null>(
    initial.kind === "hls" || initial.kind === "video" ? initial.url : null
  );
  const [rawHls, setRawHls] = useState<string | null>(
    initial.kind === "hls" ? initial.raw : null
  );
  const [mode, setMode] = useState<"video" | "embed" | "fail">(
    initial.kind === "fail"
      ? "fail"
      : initial.kind === "embed"
        ? "embed"
        : "video"
  );
  const [useProxy, setUseProxy] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const r = resolveSrc(src);
    if (r.kind === "fail") {
      setMode("fail");
      setError(r.error);
      setEmbedUrl(null);
      setPlayUrl(null);
      return;
    }
    if (r.kind === "embed") {
      setMode("embed");
      setEmbedUrl(r.url);
      setSources(r.sources);
      setSourceIdx(r.idx);
      setPlayUrl(null);
      setRawHls(null);
      setError("");
      return;
    }
    if (r.kind === "hls") {
      setMode("video");
      setPlayUrl(r.url);
      setRawHls(r.raw);
      setEmbedUrl(null);
      setError("");
      return;
    }
    setMode("video");
    setPlayUrl(r.url);
    setRawHls(null);
    setEmbedUrl(null);
    setError("");
  }, [src]);

  const attachHls = useCallback(async (url: string) => {
    const el = videoRef.current;
    if (!el) return;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    setError("");
    setNeedsTap(false);
    el.muted = true;

    const tryPlay = async () => {
      try {
        await el.play();
        setNeedsTap(false);
      } catch {
        setNeedsTap(true);
      }
    };

    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = url;
      await tryPlay();
      return;
    }

    try {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const instance = new Hls({
          enableWorker: true,
          maxBufferLength: 20,
          fragLoadingMaxRetry: 3,
          manifestLoadingMaxRetry: 2,
        });
        instance.loadSource(url);
        instance.attachMedia(el);
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          tryPlay();
        });
        instance.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            instance.startLoad();
            return;
          }
          setError("Stream imeshindwa.");
        });
        hlsRef.current = instance;
      } else {
        el.src = url;
        await tryPlay();
      }
    } catch {
      el.src = url;
      await tryPlay();
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

  function switchSource(i: number) {
    if (!sources[i]) return;
    setSourceIdx(i);
    setEmbedUrl(sources[i].url);
    setError("");
  }

  async function userPlay() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    try {
      await el.play();
      setNeedsTap(false);
    } catch {
      setNeedsTap(true);
    }
  }

  function goFullscreen() {
    if (!embedUrl) return;
    const q = new URLSearchParams({ url: embedUrl, title: title || "Player" });
    window.location.href = "/play?" + q.toString();
  }

  if (mode === "embed" && embedUrl) {
    return (
      <div className="space-y-3">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-black"
          style={{ aspectRatio: "16/9", minHeight: 220 }}
        >
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={title || "Player"}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
            loading="eager"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goFullscreen}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold touch-manipulation"
          >
            <Maximize2 className="w-4 h-4" />
            Player kamili
          </button>

          {sources.length > 1 && (
            <button
              type="button"
              onClick={() =>
                switchSource(sourceIdx + 1 < sources.length ? sourceIdx + 1 : 0)
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm text-slate-200 touch-manipulation"
            >
              <RefreshCw className="w-4 h-4" />
              Source nyingine
            </button>
          )}
        </div>

        {sources.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s, i) => (
              <button
                key={s.provider + String(i)}
                type="button"
                onClick={() => switchSource(i)}
                className={
                  "px-2 py-1 rounded-md text-[10px] border touch-manipulation " +
                  (i === sourceIdx
                    ? "border-violet-500 bg-violet-600/30 text-violet-200"
                    : "border-slate-700 text-slate-400")
                }
              >
                {s.provider}
              </button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          {(sources[sourceIdx] && sources[sourceIdx].provider) || "player"} ·
          ikichelewa bofya Source nyingine
        </p>
      </div>
    );
  }

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
            muted
            preload="auto"
            poster={poster || undefined}
            style={{ minHeight: 200 }}
            onError={() => setError("Video haikucheza.")}
          />
          {needsTap && (
            <button
              type="button"
              onClick={userPlay}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white touch-manipulation"
            >
              <span className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-2">
                <Play className="w-8 h-8 fill-current ml-1" />
              </span>
              <span className="text-sm font-semibold">Bofya kucheza</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={userPlay}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold touch-manipulation"
          >
            <Play className="w-4 h-4 fill-current" />
            Play / Sauti
          </button>
          {rawHls && (
            <button
              type="button"
              onClick={() => {
                const next = !useProxy;
                setUseProxy(next);
                setPlayUrl(next && rawHls ? proxyHls(rawHls) : rawHls);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm text-slate-200 touch-manipulation"
            >
              <RefreshCw className="w-4 h-4" />
              {useProxy ? "Bila proxy" : "Na proxy"}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-amber-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-300">{error || "Haiwezi kucheza."}</p>
    </div>
  );
}
