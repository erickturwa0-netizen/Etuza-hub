"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { detectSocial } from "@/lib/social-embed";
import {
  parseEmbed,
  buildProviders,
  providerLabel,
} from "@/lib/embed-servers";
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

export default function StreamPlayer({
  src,
  poster,
  title,
  contentKey,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const charge = usePlaybackCharge();
  const raw = (src || "").trim();
  const cid = contentIdFromKey(contentKey);

  const social = useMemo(() => {
    try {
      return detectSocial(raw);
    } catch {
      return { embedUrl: null as string | null };
    }
  }, [raw]);

  const parsed = useMemo(() => parseEmbed(raw), [raw]);
  const providers = useMemo(
    () =>
      parsed
        ? buildProviders(
            parsed.id,
            parsed.kind,
            parsed.imdb,
            parsed.season ?? 1,
            parsed.episode ?? 1
          )
        : [],
    [parsed]
  );
  const [providerIdx, setProviderIdx] = useState(0);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const onRealPlay = useCallback(() => {
    try {
      void charge?.chargeOnPlay?.();
    } catch {
      /* ignore */
    }
  }, [charge]);

  const activeEmbed = useMemo(() => {
    if (!raw) return null;
    if (social.embedUrl) return social.embedUrl;
    if (providers.length) {
      return providers[Math.min(providerIdx, providers.length - 1)];
    }
    if (
      /vidsrc\.|vsembed|2embed|embed\.su|vidlink|autoembed|videasy/i.test(raw) &&
      parsed
    ) {
      return buildProviders(
        parsed.id,
        parsed.kind,
        parsed.imdb,
        parsed.season ?? 1,
        parsed.episode ?? 1
      )[0];
    }
    if (!isHls(raw) && !isDirect(raw) && /^https?:\/\//i.test(raw)) {
      return raw;
    }
    return null;
  }, [social.embedUrl, providers, providerIdx, raw, parsed]);

  const fail = useCallback(
    (msg: string) => {
      setError(msg);
      if (cid) markStream(cid, "bad");
    },
    [cid]
  );

  useEffect(() => {
    setError("");
  }, [activeEmbed, raw, providerIdx]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || activeEmbed) return;
    if (!raw || (!isHls(raw) && !isDirect(raw))) return;

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        if (isHls(raw)) {
          const srcUrl = proxyHls(raw);
          const HlsMod = await import("hls.js");
          const Hls = HlsMod.default;
          if (cancelled) return;
          if (Hls.isSupported()) {
            const inst = new Hls({ enableWorker: true });
            inst.loadSource(srcUrl);
            inst.attachMedia(el);
            inst.on(Hls.Events.ERROR, (_e, data) => {
              if (data?.fatal) fail("Stream haichezi (HLS).");
            });
            hls = inst;
          } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
            el.src = srcUrl;
          } else {
            fail("Kifaa hakiauni HLS.");
          }
        } else {
          el.src = raw;
        }
      } catch {
        if (!cancelled) fail("Imeshindwa kupakia video.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        hls?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [raw, activeEmbed, fail]);

  const box =
    "relative w-full aspect-video min-h-[220px] sm:min-h-[360px] md:min-h-[420px] lg:min-h-[480px] bg-black rounded-xl overflow-hidden";

  if (!raw) {
    return (
      <div className="aspect-video flex items-center justify-center bg-black text-slate-400 text-sm p-4">
        Hakuna link ya video
      </div>
    );
  }

  if (activeEmbed) {
    const total = Math.max(providers.length, 1);
    return (
      <div className="space-y-2 w-full max-w-full overflow-hidden">
        <div className={box}>
          <iframe
            key={activeEmbed + providerIdx}
            src={activeEmbed}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
            onLoad={() => onRealPlay()}
          />
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 space-y-2">
          <p className="text-[11px] text-amber-200/95 leading-relaxed bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-2">
            <b>Video haichezi?</b> Bonyeza <b>Badilisha server</b> au chagua
            server nyingine hapa chini ({total} servers).
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setProviderIdx((i) => (i + 1) % total);
                setError("");
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-semibold"
            >
              <RefreshCw className="w-3 h-3" /> Badilisha server ({" "}
              {providerIdx + 1}/{total})
            </button>
            {providers.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-[11px]"
              >
                <Server className="w-3 h-3" />{" "}
                {showAll ? "Ficha orodha" : "Orodha yote"}
              </button>
            )}
          </div>

          {providers.length >= 1 && (
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {(showAll ? providers : providers.slice(0, 30)).map((p, i) => (
                <button
                  key={p + i}
                  type="button"
                  onClick={() => {
                    setProviderIdx(i);
                    setError("");
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] border ${
                    i === providerIdx
                      ? "bg-violet-600 border-violet-400 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                  }`}
                >
                  {providerLabel(p, i)}
                </button>
              ))}
              {!showAll && providers.length > 30 && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="px-2 py-1 rounded-md text-[10px] border border-slate-600 text-slate-400"
                >
                  +{providers.length - 30} zaidi
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  if (blocksIframe(raw)) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-black text-center p-4">
        <p className="text-sm text-slate-300">Fungua video nje ya app.</p>
        <a
          href={raw}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
          onClick={() => onRealPlay()}
        >
          <ExternalLink className="w-4 h-4" /> Fungua
        </a>
      </div>
    );
  }

  return (
    <div className={box}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        controls
        playsInline
        poster={poster || undefined}
        onPlaying={() => {
          onRealPlay();
          if (cid) markStream(cid, "ok");
        }}
        onError={() => fail("Video haichezi.")}
      />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4">
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs"
            onClick={() => {
              setError("");
              const el = videoRef.current;
              if (el) el.load();
            }}
          >
            <Play className="w-3 h-3 inline" /> Jaribu tena
          </button>
        </div>
      )}
    </div>
  );
}
