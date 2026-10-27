"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Music2,
} from "lucide-react";

type Props = {
  src: string;
  title?: string;
  coverUrl?: string | null;
  kind?: "radio" | "music";
};

export default function AudioPlayer({
  src,
  title,
  coverUrl,
  kind = "music",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.src = src;
    el.load();
    setPlaying(false);
    setProgress(0);
    setError("");
  }, [src]);

  async function toggle() {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (playing) {
        el.pause();
        setPlaying(false);
      } else {
        await el.play();
        setPlaying(true);
      }
    } catch {
      setError("Haiwezi kucheza — jaribu tena");
    }
  }

  function toggleMute() {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  function onTime() {
    const el = audioRef.current;
    if (!el) return;
    setProgress(el.currentTime);
    if (el.duration && isFinite(el.duration)) setDuration(el.duration);
  }

  function seek(v: number) {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = v;
    setProgress(v);
  }

  function fmt(s: number) {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const Icon = kind === "radio" ? Radio : Music2;

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden shadow-xl">
      <div className="aspect-square max-h-[280px] w-full bg-slate-950 relative flex items-center justify-center">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
            <Icon className="w-12 h-12 text-violet-300" />
          </div>
        )}
        {playing && (
          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[10px] font-bold text-white uppercase tracking-wide">
            Live
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            {kind === "radio" ? "Radio" : "Muziki"}
          </p>
          <h3 className="font-bold text-white text-base line-clamp-2">
            {title || "Now playing"}
          </h3>
        </div>

        {kind === "music" && duration > 0 && (
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={toggleMute}
            className="p-3 rounded-full bg-slate-800 text-slate-300"
            aria-label="Mute"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={toggle}
            className="w-16 h-16 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-900/40 active:scale-95 transition"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-0.5" />
            )}
          </button>
          <div className="w-11" />
        </div>

        {error && <p className="text-xs text-amber-300 text-center">{error}</p>}
      </div>

      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        onTimeUpdate={onTime}
        onEnded={() => setPlaying(false)}
        onError={() => setError("Stream haipatikani")}
        className="hidden"
      />
    </div>
  );
}
