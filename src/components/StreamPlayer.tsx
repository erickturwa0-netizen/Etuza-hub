"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { detectSocial } from "@/lib/social-embed";
import { Play, ExternalLink } from "lucide-react";

type Props = {
  src: string;
  poster?: string | null;
  title?: string;
  /** e.g. movie:cuid — for point refund on failure */
  contentKey?: string;
  onPlaybackFailed?: () => void;
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
  contentKey,
  onPlaybackFailed,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const refundedRef = useRef(false);
  const raw = (src || "").trim();
  const social = useMemo(() => detectSocial(raw), [raw]);
  const [error, setError] = useState("");
  const [needsTap, setNeedsTap] = useState(false);
  const [refundMsg, setRefundMsg] = useState("");

  const external = /^https?:\/\//i.test(raw) && blocksIframe(raw);
  const embedUrl =
    social.embedUrl ||
    (!isHls(raw) && !isDirect(raw) && !external && /^https?:\/\//i.test(raw)
      ? raw
      : null);
  const videoUrl = isHls(raw) ? proxyHls(raw) : isDirect(raw) ? raw : null;

  const fail = useCallback(
    async (msg: string) => {
      setError(msg);
      if (refundedRef.current) return;
      refundedRef.current = true;
      onPlaybackFailed?.();
      if (!contentKey) return;
      try {
        const res = await fetch("/api/points/refund", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentKey, reason: "playback_failed" }),
        });
        const d = await res.json();
        if (res.ok && d.refunded) {
          setRefundMsg(`Point +${d.refunded} zimerudishwa (content haikucheza)`);
        } else if (res.ok && d.already) {
          setRefundMsg("Point zilisharudishwa");
        }
      } catch {
        /* ignore */
      }
    },
    [contentKey, onPlaybackFailed]
  );

  useEffect(() => {
    if (!raw) {
      fail("Hakuna link ya kucheza.");
      return;
    }
    if (!embedUrl && !videoUrl && !external) {
      fail("Content haipatikani / link haitambuliwi.");
    }
  }, [raw, embedUrl, videoUrl, external, fail]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl) return;
    let hls: {
      destroy: () => void;
      loadSource: (u: string) => void;
      attachMedia: (e: HTMLVideoElement) => void;
      on: (e: string, cb: () => void) => void;
    } | null = null;
    let cancelled = false;

    (async () => {
      try {
        if (isHls(raw)) {
          const mod = await import("hls.js");
          const Hls = mod.default;
          if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(videoUrl!);
            hls.attachMedia(el);
            hls.on(Hls.Events.ERROR, () => {
              if (!cancelled) fail("Video / stream haipatikani.");
            });
          } else {
            el.src = videoUrl!;
          }
        } else {
          el.src = videoUrl!;
        }
        el.muted = true;
        await el.play().catch(() => setNeedsTap(true));
      } catch {
        if (!cancelled) fail("Video haikucheza.");
      }
    })();

    return () => {
      cancelled = true;
      hls?.destroy();
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
        >
          <ExternalLink className="w-4 h-4" /> Fungua video
        </a>
        {refundMsg && (
          <p className="text-xs text-emerald-400">{refundMsg}</p>
        )}
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
            onError={() => fail("Embed haikufunguka.")}
          />
        </div>
        {error && <p className="text-sm text-amber-300">{error}</p>}
        {refundMsg && <p className="text-xs text-emerald-400">{refundMsg}</p>}
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
                  .then(() => setNeedsTap(false))
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
        {refundMsg && <p className="text-xs text-emerald-400">{refundMsg}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-800/50 bg-slate-900 p-6 space-y-2">
      <p className="text-sm text-amber-200">
        {error || "Haiwezi kucheza — content haipatikani."}
      </p>
      {refundMsg && <p className="text-xs text-emerald-400">{refundMsg}</p>}
    </div>
  );
}
