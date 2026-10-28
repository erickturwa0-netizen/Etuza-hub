"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { detectSocial } from "@/lib/social-embed";
import { Play, ExternalLink, RefreshCw, Server } from "lucide-react";
import { usePlaybackCharge } from "@/components/PreRollGate";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
  contentKey?: string;
};

function isHls(src: string) {
  return /\.m3u8(\?|$)/i.test(src) || src.includes("m3u8");
}
function isDirect(src: string) {
  return /\.(mp4|webm|ogg|mov|mp3|aac|m4a)(\?|$)/i.test(src);
}
function blocksIframe(src: string) {
  try {
    const host = new URL(src).hostname.toLowerCase();
    return host.endsWith(".vercel.app") || host.includes("avdisk");
  } catch {
    return false;
  }
}
function proxyHls(url: string) {
  return "/api/proxy/stream?url=" + encodeURIComponent(url);
}

function contentIdFromKey(key?: string) {
  if (!key || !key.includes(":")) return "";
  return key.split(":").slice(1).join(":");
}

function markStream(contentId: string, status: "ok" | "bad") {
  if (!contentId) return;
  void fetch("/api/content/stream-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId, status }),
  }).catch(() => {});
}

function parseEmbed(url: string): { id: string; kind: "movie" | "tv" } | null {
  try {
    const u = url.trim();
    const mMovie = u.match(
      /(?:vidsrc\.[\w.]+|vsembed\.ru|2embed\.[\w.]+|embed\.su|multiembed\.mov|moviesapi\.club|vidlink\.pro|autoembed\.[\w.]+|player\.videasy\.net|embedsito\.[\w.]+|vidsrc\.icu|vidsrc\.nl)[\/\?](?:embed\/?)?(?:movie|film)\/?(\d+)/i
    );
    if (mMovie) return { id: mMovie[1], kind: "movie" };
    const mTv = u.match(
      /(?:vidsrc\.[\w.]+|vsembed\.ru|2embed\.[\w.]+|embed\.su|vidlink\.pro|autoembed\.[\w.]+)[\/\?](?:embed\/?)?(?:tv|series)\/?(\d+)/i
    );
    if (mTv) return { id: mTv[1], kind: "tv" };
    const bare = u.match(/\/(?:movie|tv)\/(\d{2,7})(?:\/|$|\?)/i);
    if (bare) {
      return {
        id: bare[1],
        kind: /\/tv\//i.test(u) ? "tv" : "movie",
      };
    }
    // multiembed style
    const q = u.match(/[?&](?:video_id|tmdb|id)=(\d{2,7})/i);
    if (q) {
      return { id: q[1], kind: /tv|series/i.test(u) ? "tv" : "movie" };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Many alternate embed hosts — user can cycle until one plays */
function buildProviders(id: string, kind: "movie" | "tv"): string[] {
  const list: string[] = [];

  if (kind === "tv") {
    const hosts = [
      `https://vidsrc.to/embed/tv/${id}`,
      `https://vidsrc.xyz/embed/tv/${id}`,
      `https://vidsrc.me/embed/tv/${id}`,
      `https://vidsrc.pm/embed/tv/${id}`,
      `https://vidsrc.pro/embed/tv/${id}`,
      `https://vidsrc.icu/embed/tv/${id}`,
      `https://vidsrc.nl/embed/tv/${id}`,
      `https://vidsrc.in/embed/tv/${id}`,
      `https://www.2embed.cc/embedtv/${id}`,
      `https://www.2embed.cc/embedtvfull/${id}`,
      `https://www.2embed.to/embed/tv/${id}`,
      `https://2embed.org/embed/tv/${id}`,
      `https://embed.su/embed/tv/${id}`,
      `https://vidlink.pro/tv/${id}`,
      `https://player.videasy.net/tv/${id}`,
      `https://autoembed.co/tv/tmdb/${id}`,
      `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=1&e=1`,
      `https://www.nontongo.win/embed/tv/${id}`,
      `https://vidsrc.vip/embed/tv/${id}`,
      `https://embed.smashystream.com/playere.php?tmdb=${id}&type=tv`,
      `https://moviesapi.club/tv/${id}`,
      `https://vidsrc.cc/v2/embed/tv/${id}`,
      `https://www.primewire.tf/embed/tv?tmdb=${id}`,
      `https://flicky.host/embed/tv/?id=${id}`,
      `https://embed.warezcdn.com/serie/${id}`,
      // season1 ep1 variants
      `https://vidsrc.to/embed/tv/${id}/1/1`,
      `https://vidsrc.xyz/embed/tv/${id}/1/1`,
      `https://vidsrc.me/embed/tv/${id}/1/1`,
      `https://vidsrc.pm/embed/tv/${id}/1/1`,
      `https://embed.su/embed/tv/${id}/1/1`,
      `https://vidlink.pro/tv/${id}/1/1`,
      `https://player.videasy.net/tv/${id}/1/1`,
      `https://autoembed.co/tv/tmdb/${id}-1-1`,
      `https://www.2embed.cc/embedtv/${id}&s=1&e=1`,
      `https://multiembed.mov/?video_id=${id}&tmdb=1&s=1&e=1`,
    ];
    list.push(...hosts);
  } else {
    const hosts = [
      `https://vidsrc.to/embed/movie/${id}`,
      `https://vidsrc.xyz/embed/movie/${id}`,
      `https://vidsrc.me/embed/movie/${id}`,
      `https://vidsrc.pm/embed/movie/${id}`,
      `https://vidsrc.pro/embed/movie/${id}`,
      `https://vidsrc.icu/embed/movie/${id}`,
      `https://vidsrc.nl/embed/movie/${id}`,
      `https://vidsrc.in/embed/movie/${id}`,
      `https://vidsrc.vip/embed/movie/${id}`,
      `https://vidsrc.cc/v2/embed/movie/${id}`,
      `https://www.2embed.cc/embed/${id}`,
      `https://www.2embed.cc/embedfull/${id}`,
      `https://www.2embed.to/embed/movie/${id}`,
      `https://2embed.org/embed/movie/${id}`,
      `https://embed.su/embed/movie/${id}`,
      `https://vidlink.pro/movie/${id}`,
      `https://player.videasy.net/movie/${id}`,
      `https://autoembed.co/movie/tmdb/${id}`,
      `https://multiembed.mov/?video_id=${id}&tmdb=1`,
      `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
      `https://moviesapi.club/movie/${id}`,
      `https://www.nontongo.win/embed/movie/${id}`,
      `https://embed.smashystream.com/playere.php?tmdb=${id}`,
      `https://flicky.host/embed/movie/?id=${id}`,
      `https://embed.warezcdn.com/filme/${id}`,
      `https://www.primewire.tf/embed/movie?tmdb=${id}`,
      `https://vidsrc-embed.ru/embed/movie/${id}`,
      `https://vsembed.ru/embed/movie/${id}`,
      // extra mirrors / patterns
      `https://vidsrc.to/embed/film/${id}`,
      `https://vidsrc.xyz/embed/film/${id}`,
      `https://www.2embed.stream/embed/${id}`,
      `https://streamsrc.top/embed/movie/${id}`,
      `https://gomo.to/movie/${id}`,
      `https://databasegdriveplayer.co/player.php?tmdb=${id}`,
      `https://vidjoy.pro/embed/movie/${id}`,
      `https://vidify.top/embed/movie/${id}`,
      `https://player.superembed.stream/movie/${id}`,
      `https://api.remotestream.cc/e/movie/${id}`,
    ];
    list.push(...hosts);
  }

  // de-dupe
  return [...new Set(list)];
}

export default function StreamPlayer({
  src,
  poster,
  title,
  contentKey,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const chargedRef = useRef(false);
  const markedRef = useRef(false);
  const charge = usePlaybackCharge();
  const raw = (src || "").trim();
  const cid = contentIdFromKey(contentKey);
  const social = useMemo(() => detectSocial(raw), [raw]);
  const parsed = useMemo(() => parseEmbed(raw), [raw]);
  const providers = useMemo(
    () => (parsed ? buildProviders(parsed.id, parsed.kind) : []),
    [parsed]
  );
  const [providerIdx, setProviderIdx] = useState(0);
  const [error, setError] = useState("");
  const [needsTap, setNeedsTap] = useState(false);

  const activeEmbed = useMemo(() => {
    if (social.embedUrl) return social.embedUrl;
    if (providers.length) {
      return providers[Math.min(providerIdx, providers.length - 1)];
    }
    if (/vsembed\.ru|vidsrc\./i.test(raw) && parsed) {
      return buildProviders(parsed.id, parsed.kind)[0];
    }
    const external = /^https?:\/\//i.test(raw) && blocksIframe(raw);
    if (!isHls(raw) && !isDirect(raw) && !external && /^https?:\/\//i.test(raw)) {
      return raw;
    }
    return null;
  }, [social.embedUrl, providers, providerIdx, raw, parsed]);

  const external = /^https?:\/\//i.test(raw) && blocksIframe(raw);
  const videoUrl = isHls(raw) ? proxyHls(raw) : isDirect(raw) ? raw : null;

  const mark = useCallback(
    (status: "ok" | "bad") => {
      if (markedRef.current && status === "ok") return;
      if (status === "ok") markedRef.current = true;
      markStream(cid, status);
    },
    [cid]
  );

  const onRealPlay = useCallback(() => {
    mark("ok");
    if (chargedRef.current) return;
    chargedRef.current = true;
    void charge?.chargeOnPlay();
  }, [charge, mark]);

  const fail = useCallback(
    (msg: string) => {
      setError(msg);
      if (providers.length && providerIdx < providers.length - 1) {
        setProviderIdx((i) => i + 1);
        setError(`Inajaribu server ${providerIdx + 2}/${providers.length}…`);
        return;
      }
      mark("bad");
    },
    [mark, providers.length, providerIdx]
  );

  useEffect(() => {
    if (!raw) fail("Hakuna link ya kucheza.");
    else if (!activeEmbed && !videoUrl && !external)
      fail("Content haipatikani / link haitambuliwi.");
  }, [raw, activeEmbed, videoUrl, external, fail]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hls: any = null;
    let cancelled = false;

    (async () => {
      try {
        if (isHls(raw)) {
          const mod = await import("hls.js");
          const Hls = mod.default;
          if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(el);
            hls.on(Hls.Events.ERROR, (_e: unknown, data: { fatal?: boolean }) => {
              if (!cancelled && data?.fatal) fail("Video / stream haipatikani.");
            });
          } else {
            el.src = videoUrl;
          }
        } else {
          el.src = videoUrl;
        }
        el.muted = true;
        await el.play().catch(() => setNeedsTap(true));
      } catch {
        if (!cancelled) fail("Video haikucheza.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        hls?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [videoUrl, raw, fail]);

  const box =
    "relative w-full max-w-full rounded-2xl overflow-hidden border-2 border-red-600/80 bg-black touch-manipulation";
  const boxStyle = {
    aspectRatio: "16/9",
    maxHeight: "min(55vh, 360px)",
    width: "100%",
  } as const;

  if (external) {
    return (
      <div className="rounded-2xl border border-amber-600/40 bg-slate-900 p-5 space-y-3">
        <p className="text-sm text-amber-100">
          Link haichezi ndani ya app — fungua nje.
        </p>
        <a
          href={raw}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
          onClick={() => onRealPlay()}
        >
          <ExternalLink className="w-4 h-4" /> Fungua video
        </a>
      </div>
    );
  }

  if (activeEmbed) {
    return (
      <div className="space-y-2 w-full max-w-full overflow-hidden">
        <div className={box} style={boxStyle}>
          <iframe
            key={activeEmbed}
            src={activeEmbed}
            title={title || "Player"}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => {
              setTimeout(() => onRealPlay(), 2500);
            }}
            onError={() => fail("Embed imeshindwa.")}
          />
        </div>

        {providers.length > 1 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Server className="w-3.5 h-3.5 text-violet-400" />
              <span>
                Server {providerIdx + 1} / {providers.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setProviderIdx((i) => (i + 1) % providers.length);
                  setError("");
                }}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 text-white text-[11px] font-semibold"
              >
                <RefreshCw className="w-3 h-3" /> Badilisha server
              </button>
            </div>
            <select
              value={providerIdx}
              onChange={(e) => {
                setProviderIdx(Number(e.target.value));
                setError("");
              }}
              className="w-full text-xs rounded-lg bg-slate-950 border border-slate-600 text-slate-200 px-2 py-2"
            >
              {providers.map((_, i) => (
                <option key={i} value={i}>
                  Server {i + 1}
                  {i === 0 ? " (vidsrc)" : ""}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {providers.slice(0, 24).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setProviderIdx(i);
                    setError("");
                  }}
                  className={`text-[10px] min-w-[1.75rem] px-1.5 py-1 rounded border ${
                    i === providerIdx
                      ? "border-violet-500 bg-violet-600/40 text-violet-100"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              {providers.length > 24 && (
                <span className="text-[10px] text-slate-500 self-center px-1">
                  +{providers.length - 24} (chagua kwenye orodha)
                </span>
              )}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-amber-300">{error}</p>}
      </div>
    );
  }

  if (videoUrl) {
    return (
      <div className="space-y-2 w-full max-w-full overflow-hidden">
        <div className={box} style={boxStyle}>
          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            controls
            playsInline
            poster={poster || undefined}
            onPlaying={onRealPlay}
            onError={() => fail("Video haikucheza / haipatikani.")}
          />
          {needsTap && (
            <button
              type="button"
              onClick={() => {
                const el = videoRef.current;
                if (!el) return;
                el.muted = false;
                el.play()
                  .then(() => {
                    setNeedsTap(false);
                    onRealPlay();
                  })
                  .catch(() => fail("Video haikucheza."));
              }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white"
            >
              <span className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-2">
                <Play className="w-8 h-8 fill-current ml-1" />
              </span>
              Bofya kucheza
            </button>
          )}
        </div>
        {error && <p className="text-sm text-amber-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-800/50 bg-slate-900 p-6">
      <p className="text-sm text-amber-200">
        {error || "Haiwezi kucheza — content haipatikani."}
      </p>
      <p className="text-xs text-slate-500 mt-1">Hakuna point zilizokatwa.</p>
    </div>
  );
}
