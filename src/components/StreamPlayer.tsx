"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { detectSocial } from "@/lib/social-embed";
import { Play, ExternalLink, RefreshCw } from "lucide-react";
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

/** Extract TMDB id + kind from common embed URLs */
function parseEmbed(url: string): { id: string; kind: "movie" | "tv" } | null {
  try {
    const u = url.trim();
    const mMovie = u.match(
      /(?:vidsrc\.(?:to|xyz|me|pm)|vsembed\.ru|2embed\.(?:cc|org)|embed\.su|multiembed\.mov|moviesapi\.club)\/(?:embed\/)?(?:movie|film)\/(\d+)/i
    );
    if (mMovie) return { id: mMovie[1], kind: "movie" };
    const mTv = u.match(
      /(?:vidsrc\.(?:to|xyz|me|pm)|vsembed\.ru|2embed\.(?:cc|org)|embed\.su)\/(?:embed\/)?(?:tv|series)\/(\d+)/i
    );
    if (mTv) return { id: mTv[1], kind: "tv" };
    const bare = u.match(/\/(?:movie|tv)\/(\d{2,7})(?:\/|$|\?)/i);
    if (bare) {
      return {
        id: bare[1],
        kind: /\/tv\//i.test(u) ? "tv" : "movie",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function buildProviders(id: string, kind: "movie" | "tv"): string[] {
  if (kind === "tv") {
    return [
      `https://vidsrc.to/embed/tv/${id}`,
      `https://vidsrc.xyz/embed/tv/${id}`,
      `https://www.2embed.cc/embedtv/${id}`,
      `https://embed.su/embed/tv/${id}`,
    ];
  }
  return [
    `https://vidsrc.to/embed/movie/${id}`,
    `https://vidsrc.xyz/embed/movie/${id}`,
    `https://www.2embed.cc/embed/${id}`,
    `https://embed.su/embed/movie/${id}`,
    `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  ];
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

  // Prefer working providers; rewrite vsembed → vidsrc first
  const activeEmbed = useMemo(() => {
    if (social.embedUrl) return social.embedUrl;
    if (providers.length) {
      return providers[Math.min(providerIdx, providers.length - 1)];
    }
    if (/vsembed\.ru/i.test(raw) && parsed) {
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
      // Try next provider before marking bad
      if (providers.length && providerIdx < providers.length - 1) {
        setProviderIdx((i) => i + 1);
        setError("Inajaribu server nyingine…");
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
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] text-slate-500">Server:</span>
            {providers.map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setProviderIdx(i);
                  setError("");
                }}
                className={`text-[11px] px-2 py-1 rounded-lg border ${
                  i === providerIdx
                    ? "border-violet-500 bg-violet-600/30 text-violet-200"
                    : "border-slate-700 text-slate-400"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setProviderIdx((i) => (i + 1) % providers.length);
                setError("");
              }}
              className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-300 inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Badilisha
            </button>
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
