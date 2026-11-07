"use client";

import { useMemo, useState, useCallback } from "react";
import { Play, ExternalLink, RefreshCw, Server } from "lucide-react";
import { detectSocial, youtubeEmbedMirrors } from "@/lib/social-embed";
import { usePlaybackCharge } from "@/components/PreRollGate";

type Props = {
  src: string;
  title?: string;
  poster?: string | null;
};

/**
 * Dedicated VIDEO player for music videos (YouTube / social embeds).
 * Not the audio-only player.
 */
export default function MusicVideoPlayer({
  src,
  title,
  poster,
}: Props) {
  const charge = usePlaybackCharge();
  const social = useMemo(() => detectSocial(src), [src]);
  const mirrors = useMemo(() => {
    if (social.id && social.kind === "youtube") {
      return youtubeEmbedMirrors(social.id);
    }
    if (social.mirrors?.length) return social.mirrors;
    if (social.embedUrl) return [social.embedUrl];
    return [];
  }, [social]);

  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const active = mirrors[Math.min(idx, Math.max(0, mirrors.length - 1))] || "";

  const onPlay = useCallback(() => {
    setStarted(true);
    void charge?.chargeOnPlay();
  }, [charge]);

  if (!active) {
    return (
      <div className="rounded-2xl border border-amber-700/40 bg-slate-900 p-5 space-y-3">
        <p className="text-sm text-amber-100">
          Link ya video haikutambulika. Fungua nje au jaribu video nyingine.
        </p>
        {/^https?:\/\//i.test(src) && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
          >
            <ExternalLink className="w-4 h-4" /> Fungua link
          </a>
        )}
      </div>
    );
  }

  const watchOnYt =
    social.kind === "youtube" && social.id
      ? `https://www.youtube.com/watch?v=${social.id}`
      : src;

  return (
    <div className="space-y-2 w-full max-w-full">
      <div
        className="relative w-full rounded-2xl overflow-hidden border-2 border-violet-600/50 bg-black"
        style={{
          aspectRatio: "16/9",
          maxHeight: "min(70vh, 480px)",
          width: "100%",
        }}
      >
        {!started && poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
          />
        )}
        <iframe
          key={active}
          src={active}
          title={title || "Music Video"}
          className="absolute inset-0 w-full h-full border-0 z-10"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setTimeout(() => onPlay(), 1200);
          }}
        />
        {!started && (
          <button
            type="button"
            onClick={onPlay}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 text-white"
          >
            <span className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-2 shadow-lg">
              <Play className="w-8 h-8 fill-current ml-1" />
            </span>
            <span className="text-sm font-semibold">Cheza video</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {mirrors.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setIdx((i) => (i + 1) % mirrors.length);
              setStarted(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <Server className="w-3.5 h-3.5" />
            Badilisha server ({idx + 1}/{mirrors.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setIdx((i) => i);
            setStarted(false);
            // force iframe remount via key change by toggling idx
            setIdx((i) => (i + mirrors.length) % Math.max(1, mirrors.length));
          }}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload
        </button>
        <a
          href={watchOnYt}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-700/50 text-red-200 hover:bg-red-950/40"
          onClick={() => onPlay()}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Fungua YouTube
        </a>
      </div>

      <p className="text-[11px] text-slate-500">
        Video Music · player ya video (si audio). Ikiwa haionekani, bofya{" "}
        <strong className="text-slate-400">Badilisha server</strong> au Fungua
        YouTube.
      </p>
    </div>
  );
}
