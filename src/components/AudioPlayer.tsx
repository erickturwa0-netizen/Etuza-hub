"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Music2,
} from "lucide-react";
import { usePlaybackCharge } from "@/components/PreRollGate";

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
  const chargedRef = useRef(false);
  const charge = usePlaybackCharge();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [vol, setVol] = useState(1);
  const [loading, setLoading] = useState(false);

  const onRealPlay = useCallback(() => {
    if (chargedRef.current) return;
    chargedRef.current = true;
    charge?.chargeOnPlay();
  }, [charge]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
    setProgress(0);
    setError("");
    setLoading(true);
    chargedRef.current = false;
    el.src = src;
    el.load();
    const onCanPlay = () => setLoading(false);
    el.addEventListener("canplay", onCanPlay);
    return () => el.removeEventListener("canplay", onCanPlay);
  }, [src]);

  async function toggle() {
    const el = audioRef.current;
    if (!el) return;
    setError("");
    try {
      if (playing) {
        el.pause();
        setPlaying(false);
      } else {
        setLoading(true);
        await el.play();
        setPlaying(true);
        setLoading(false);
        onRealPlay();
      }
    } catch {
      setLoading(false);
      setPlaying(false);
      setError("Haiwezi kucheza. Hakuna point zilizokatwa.");
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
      <div className="rounded-3xl overflow-hidden border border-pink-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-2xl shadow-pink-900/30">
        <div className="pt-6 pb-2 px-6 flex flex-col items-center">
          <div
            className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 bg-white shadow-xl ${
              playing ? "border-pink-400 shadow-pink-500/40" : "border-slate-600"
            }`}
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="w-full h-full object-contain p-3"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-600 to-rose-900 flex items-center justify-center">
                <Icon className="w-12 h-12 text-white" />
              </div>
            )}
          </div>
          {isRadio && playing && (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              ● On Air
            </p>
          )}
        </div>

        <div className="px-6 pb-5 space-y-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-pink-300/80 font-semibold">
              {isRadio ? "Radio Live" : "Muziki"}
            </p>
            <h3 className="mt-1 font-bold text-base text-white line-clamp-2">
              {title || "Now playing"}
            </h3>
          </div>

          {isRadio && (
            <div className="flex items-end justify-center gap-1 h-8">
              {[6, 12, 18, 10, 16, 8, 14, 9].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-pink-400/90"
                  style={{
                    height: playing ? h * 1.6 : 5,
                    transition: "height 0.2s ease",
                  }}
                />
              ))}
            </div>
          )}

          {!isRadio && duration > 0 && (
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
                <span>{fmt(progress)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={toggleMute}
              className="p-3 rounded-full bg-white/10 border border-white/10 text-white"
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
              disabled={loading}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-pink-600/40 active:scale-95 disabled:opacity-60"
            >
              {playing ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-0.5" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : vol}
              onChange={(e) => changeVol(Number(e.target.value))}
              className="w-14 accent-pink-400"
            />
          </div>

          {error && (
            <p className="text-xs text-amber-300 text-center">{error}</p>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        onTimeUpdate={onTime}
        onPlaying={() => {
          setPlaying(true);
          setLoading(false);
          onRealPlay();
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setLoading(false);
          setError("Stream haipatikani. Hakuna point zilizokatwa.");
        }}
        className="hidden"
      />
    </div>
  );
}
