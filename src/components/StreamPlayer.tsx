"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { detectSocial } from "@/lib/social-embed";
import { Play, ExternalLink } from "lucide-react";
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

export default function StreamPlayer({
  src,
  poster,
  title,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const chargedRef = useRef(false);
  const charge = usePlaybackCharge();
  const raw = (src || "").trim();
  const social = useMemo(() => detectSocial(raw), [raw]);
  const [error, setError] = useState("");
  const [needsTap, setNeedsTap] = useState(false);

  const external = /^https?:\/\//i.test(raw) && blocksIframe(raw);
  const embedUrl =
    social.embedUrl ||
    (!isHls(raw) && !isDirect(raw) && !external && /^https?:\/\//i.test(raw)
      ? raw
      : null);
  const videoUrl = isHls(raw) ? proxyHls(raw) : isDirect(raw) ? raw : null;

  const onRealPlay = useCallback(() => {
    if (chargedRef.current) return;
    chargedRef.current = true;
    void charge?.chargeOnPlay();
  }, [charge]);

  useEffect(() => {
    if (!raw) setError("Hakuna link ya kucheza.");
    else if (!embedUrl && !videoUrl && !external)
      setError("Content haipatikani / link haitambuliwi.");
  }, [raw, embedUrl, videoUrl, external]);

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
              if (!cancelled && data?.fatal) {
                setError("Video / stream haipatikani.");
              }
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
        if (!cancelled) setError("Video haikucheza.");
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
  }, [videoUrl, raw]);

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

  if (embedUrl) {
    return (
      <div className="space-y-2 w-full max-w-full overflow-hidden">
        <div className={box} style={boxStyle}>
          <iframe
            src={embedUrl}
            title={title || "Player"}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => {
              setTimeout(() => onRealPlay(), 2500);
            }}
          />
        </div>
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
            onError={() => setError("Video haikucheza / haipatikani.")}
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
                  .catch(() => setError("Video haikucheza."));
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
