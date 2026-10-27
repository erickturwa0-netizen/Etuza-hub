"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Music2,
  Waves,
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
  const [vol, setVol] = useState(1);

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

  function changeVol(v: number) {
    const el = audioRef.current;
    setVol(v);
    if (el) {
      el.volume = v;
      if (v === 0) {
        el.muted = true;
        setMuted(true);
      } else if (muted) {
        el.muted = false;
        setMuted(false);
      }
    }
  }

  function fmt(s: number) {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const isRadio = kind === "radio";
  const Icon = isRadio ? Radio : Music2;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-900/30 bg-slate-950">
        {/* Ambient glow */}
        <div
          className={`absolute inset-0 opacity-40 pointer-events-none ${
            playing
              ? "bg-gradient-to-br from-violet-600/40 via-fuchsia-600/20 to-cyan-500/20"
              : "bg-gradient-to-br from-slate-800/60 to-slate-950"
          }`}
        />

        {/* Cover */}
        <div className="relative pt-8 pb-4 px-6 flex flex-col items-center">
          <div
            className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 shadow-xl ${
              playing
                ? "border-violet-400/60 shadow-violet-500/40 animate-[spin_12s_linear_infinite]"
                : "border-slate-600/50 shadow-black/40"
            }`}
            style={playing ? undefined : undefined}
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="w-full h-full object-contain bg-white p-3"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-700 to-slate-900 flex items-center justify-center">
                <Icon className="w-16 h-16 text-white/90" />
              </div>
            )}
          </div>

          {isRadio && playing && (
            <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              On Air
              <Waves className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Meta + controls */}
        <div className="relative px-6 pb-6 space-y-4">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300/80 font-semibold">
              {isRadio ? "Radio Live" : "Muziki"}
            </p>
            <h3 className="mt-1 font-bold text-lg text-white line-clamp-2 leading-snug">
              {title || "Now playing"}
            </h3>
          </div>

          {!isRadio && duration > 0 && (
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full accent-violet-500 h-1.5"
              />
              <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
                <span>{fmt(progress)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
          )}

          {isRadio && (
            <div className="flex items-end justify-center gap-1 h-8 opacity-80">
              {[0.4, 0.7, 1, 0.55, 0.9, 0.5, 0.75, 0.45].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-violet-400"
                  style={{
                    height: playing ? `${h * 100}%` : "20%",
                    animation: playing
                      ? `pulse 0.8s ease-in-out ${i * 0.08}s infinite alternate`
                      : undefined,
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={toggleMute}
              className="p-3 rounded-full bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10"
              aria-label="Mute"
            >
              {muted || vol === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={toggle}
              className="w-[4.5rem] h-[4.5rem] rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/40 active:scale-95 transition"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>

            <div className="flex flex-col items-center gap-1 w-14">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : vol}
                onChange={(e) => changeVol(Number(e.target.value))}
                className="w-full accent-violet-400"
                aria-label="Volume"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-amber-300 text-center">{error}</p>
          )}
        </div>
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

      <style jsx>{`
        @keyframes pulse {
          from {
            transform: scaleY(0.35);
          }
          to {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
