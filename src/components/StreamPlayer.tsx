"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { detectSocial } from "@/lib/social-embed";
import { Play, RefreshCw, Volume2, Maximize2 } from "lucide-react";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
  requirePreRoll?: boolean;
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

function buildInAppSources(id: string, media: "movie" | "tv"): Source[] {
  if (media === "movie") {
    return [
      { provider: "VidSrc", url: `https://vidsrc.to/embed/movie/${id}` },
      { provider: "VidSrc.xyz", url: `https://vidsrc.xyz/embed/movie/${id}` },
      { provider: "2Embed", url: `https://www.2embed.cc/embed/${id}` },
      { provider: "MultiEmbed", url: `https://multiembed.mov/?video_id=${id}&tmdb=1` },
      { provider: "EmbedSU", url: `https://embed.su/embed/movie/${id}` },
      { provider: "VidLink", url: `https://vidlink.pro/movie/${id}` },
      { provider: "Vidrock", url: `https://vidrock.net/movie/${id}` },
      { provider: "Videasy", url: `https://player.videasy.to/movie/${id}` },
      { provider: "VidKing", url: `https://www.vidking.net/embed/movie/${id}` },
      { provider: "MoviesAPI", url: `https://moviesapi.to/movie/${id}` },
      { provider: "VidPlus", url: `https://player.vidplus.to/embed/movie/${id}` },
      { provider: "VidFast", url: `https://vidfast.pro/movie/${id}` },
      { provider: "111Movies", url: `https://111movies.com/movie/${id}` },
      { provider: "AutoEmbed", url: `https://player.autoembed.cc/embed/movie/${id}` },
    ];
  }
  return [
    { provider: "VidSrc", url: `https://vidsrc.to/embed/tv/${id}` },
    { provider: "VidSrc.xyz", url: `https://vidsrc.xyz/embed/tv/${id}` },
    { provider: "2Embed", url: `https://www.2embed.cc/embedtv/${id}` },
    { provider: "EmbedSU", url: `https://embed.su/embed/tv/${id}` },
    { provider: "VidLink", url: `https://vidlink.pro/tv/${id}` },
    { provider: "Vidrock", url: `https://vidrock.net/tv/${id}` },
    { provider: "Videasy", url: `https://player.videasy.to/tv/${id}` },
    { provider: "VidKing", url: `https://www.vidking.net/embed/tv/${id}` },
  ];
}

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
  const [needsTap, setNeedsTap] = useState(false);
  const [autoNote, setAutoNote] = useState("");
  const manualRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    manualRef.current = false;
    setError("");
    setMode("loading");
    setStatus("Inatafuta…");
    setPlayUrl(null);
    setRawHls(null);
    setEmbedUrl(null);
    setSources([]);
    setSourceIdx(0);
    setUseProxy(true);
    setNeedsTap(false);
    setAutoNote("");

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
        setStatus("Inatafuta player…");
        let list = buildInAppSources(tmdb.id, tmdb.media);

        try {
          const res = await fetch(
            `https://eliteplex-api.vercel.app/api/play?tmdb_id=${tmdb.id}&media=${tmdb.media}&fast=true`
          );
          if (res.ok) {
            const data = await res.json();
            const extra = ((data.sources || []) as {
              provider?: string;
              url?: string;
              play_url?: string;
            }[])
              .map((s) => ({
                provider: s.provider || "Source",
                url: s.play_url || s.url || "",
              }))
              .filter((s) => s.url.startsWith("http"));
            const seen = new Set(list.map((x) => x.url));
            for (const e of extra) {
              if (!seen.has(e.url)) {
                seen.add(e.url);
                list.push(e);
              }
            }
          }
        } catch {
          /* ignore */
        }

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

  useEffect(() => {
    if (mode !== "embed" || sources.length < 2) return;
    if (manualRef.current) return;
    if (sourceIdx >= sources.length - 1) {
      setAutoNote("Sources zote zimejaribiwa — chagua manual au movie nyingine");
      return;
    }
    const t = setTimeout(() => {
      if (manualRef.current) return;
      const next = sourceIdx + 1;
      setSourceIdx(next);
      setEmbedUrl(sources[next].url);
      setAutoNote(`Inajaribu ${sources[next].provider}…`);
    }, 10000);
    return () => clearTimeout(t);
  }, [mode, sourceIdx, sources]);

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
          maxBufferLength: 40,
          fragLoadingMaxRetry: 5,
          manifestLoadingMaxRetry: 4,
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
          setError("Stream imeshindwa. Badilisha channel au bofya Play.");
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

  function toggleProxy() {
    if (!rawHls) return;
    const next = !useProxy;
    setUseProxy(next);
    setPlayUrl(next ? proxyHls(rawHls) : rawHls);
    setError("");
  }

  function switchSource(i: number) {
    if (!sources[i]) return;
    manualRef.current = true;
    setAutoNote("");
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

  function goFullscreenPlayer() {
    if (!embedUrl) return;
    const q = new URLSearchParams({
      url: embedUrl,
      title: title || "Player",
    });
    window.location.href = `/play?${q.toString()}`;
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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            allowFullScreen
            referrerPolicy="origin"
          />
        </div>

        {autoNote && (
          <p className="text-xs text-amber-300 text-center">{autoNote}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goFullscreenPlayer}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm text-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
              Source nyingine
            </button>
          )}
        </div>

        {sources.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {sources.slice(0, 16).map((s, i) => (
              <button
                key={s.provider + i}
                type="button"
                onClick={() => switchSource(i)}
                className={`px-2 py-1 rounded-md text-[10px] border ${\n                  i === sourceIdx
                    ? "border-violet-500 bg-violet-600/30 text-violet-200"
                    : "border-slate-700 text-slate-400"
                }`}
              >
                {s.provider}
              </button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          {sources[sourceIdx]?.provider || "player"} ({sourceIdx + 1}/
          {Math.max(sources.length, 1)}). Kama inaandika couldnt find → bofya{" "}
          <b>Source nyingine</b>. Movie mpya za 2026 zinaweza kukosa kwenye free
          players — jaribu movie maarufu zaidi.
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
            onError={() =>
              setError("Video haikucheza. Bofya Play au badilisha proxy.")
            }
          />

          {needsTap && (
            <button
              type="button"
              onClick={userPlay}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white"
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
          >
            <Play className="w-4 h-4 fill-current" />
            Play / Sauti
          </button>

          <button
            type="button"
            onClick={() => {
              const el = videoRef.current;
              if (el) el.muted = !el.muted;
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm text-slate-200"
          >
            <Volume2 className="w-4 h-4" />
            Sauti
          </button>

          {rawHls && (
            <button
              type="button"
              onClick={toggleProxy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm text-slate-200"
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
