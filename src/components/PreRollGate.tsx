"use client";

import { useEffect, useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import {
  PRE_ROLL_AD_URL,
  PRE_ROLL_SECONDS,
  preRollStorageKey,
} from "@/lib/ads";

type Props = {
  /** Unique key per movie/episode so unlock can be remembered this session */
  contentKey: string;
  title?: string;
  children: React.ReactNode;
};

export default function PreRollGate({ contentKey, title, children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [counting, setCounting] = useState(false);
  const [left, setLeft] = useState(PRE_ROLL_SECONDS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(preRollStorageKey(contentKey));
      if (v === "1") setUnlocked(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [contentKey]);

  useEffect(() => {
    if (!counting || left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [counting, left]);

  useEffect(() => {
    if (counting && left <= 0) {
      try {
        sessionStorage.setItem(preRollStorageKey(contentKey), "1");
      } catch {
        /* ignore */
      }
      setUnlocked(true);
      setCounting(false);
    }
  }, [counting, left, contentKey]);

  function startAd() {
    // Open offer / ad landing
    window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer");
    setLeft(PRE_ROLL_SECONDS);
    setCounting(true);
  }

  if (!ready) {
    return (
      <div
        className="rounded-2xl border border-slate-800 bg-black flex items-center justify-center text-slate-400 text-sm"
        style={{ minHeight: 220, aspectRatio: "16/9" }}
      >
        Inapakia…
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-violet-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950"
      style={{ aspectRatio: "16/9", minHeight: 220 }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-xs uppercase tracking-widest text-violet-300/80 mb-2">
          Sponsored
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-1 max-w-md">
          {title || "Video"}
        </h2>
        <p className="text-sm text-slate-300 mb-6 max-w-sm">
          Tazama tangazo fupi kwanza, kisha utaweza kuangalia movie bila kizuizi.
        </p>

        {!counting ? (
          <button
            type="button"
            onClick={startAd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-900/40"
          >
            <ExternalLink className="w-4 h-4" />
            Fungua tangazo & anzisha
          </button>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-white font-semibold text-lg tabular-nums">
              {left}s
            </p>
            <p className="text-xs text-slate-400">
              Subiri… movie itafunguka baada ya countdown
            </p>
            <button
              type="button"
              onClick={() =>
                window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer")
              }
              className="text-xs text-violet-300 underline"
            >
              Fungua tangazo tena
            </button>
          </div>
        )}

        {left <= 0 && counting && (
          <button
            type="button"
            onClick={() => setUnlocked(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
          >
            <Play className="w-4 h-4 fill-current" />
            Anza movie
          </button>
        )}
      </div>
    </div>
  );
}
