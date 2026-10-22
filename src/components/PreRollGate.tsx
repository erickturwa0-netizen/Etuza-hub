"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, UserPlus } from "lucide-react";
import {
  PRE_ROLL_AD_URL,
  PRE_ROLL_SECONDS,
  preRollStorageKey,
} from "@/lib/ads";
import { POINTS } from "@/lib/points";

type Props = {
  contentKey: string;
  title?: string;
  children: React.ReactNode;
};

type MeUser = {
  id: string;
  points: number;
  inviteCode?: string | null;
  role?: string;
};

export default function PreRollGate({ contentKey, title, children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [counting, setCounting] = useState(false);
  const [left, setLeft] = useState(PRE_ROLL_SECONDS);
  const [ready, setReady] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (sessionStorage.getItem(preRollStorageKey(contentKey)) === "1") {
          if (!cancelled) setUnlocked(true);
        }
      } catch {
        /* ignore */
      }

      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const d = await res.json();
          if (d.user && !cancelled) {
            setUser(d.user);
            setPoints(d.user.points ?? 0);
          }
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentKey]);

  useEffect(() => {
    if (!counting || left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [counting, left]);

  useEffect(() => {
    if (!(counting && left <= 0)) return;
    (async () => {
      try {
        const res = await fetch("/api/points/reward-ad", { method: "POST" });
        if (res.ok) {
          const d = await res.json();
          if (typeof d.points === "number") setPoints(d.points);
        }
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.setItem(preRollStorageKey(contentKey), "1");
      } catch {
        /* ignore */
      }
      setShowAd(false);
      setUnlocked(true);
      setCounting(false);
    })();
  }, [counting, left, contentKey]);

  async function spendAndUnlock() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/points/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentKey }),
      });
      const d = await res.json();
      if (res.status === 401) {
        setMsg("Ingia account ili utumie point.");
        setBusy(false);
        return;
      }
      if (res.status === 402 || d.code === "NO_POINTS") {
        setMsg("Point zimeisha — bofya Tangazo.");
        setPoints(d.points ?? 0);
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setMsg(d.error || "Imeshindikana");
        setBusy(false);
        return;
      }
      if (typeof d.points === "number") setPoints(d.points);
      try {
        sessionStorage.setItem(preRollStorageKey(contentKey), "1");
      } catch {
        /* ignore */
      }
      setUnlocked(true);
    } catch {
      setMsg("Tatizo la mtandao");
    }
    setBusy(false);
  }

  /** Show ad inside page (no popup window) */
  function startAd() {
    setShowAd(true);
    setLeft(PRE_ROLL_SECONDS);
    setCounting(true);
  }

  if (!ready) {
    return (
      <div
        className="rounded-2xl border border-slate-800 bg-black flex items-center justify-center text-slate-400 text-sm"
        style={{ minHeight: 220, aspectRatio: "16/9" }}
      >
        …
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  const hasPoints = user && (points ?? 0) >= POINTS.WATCH_COST;

  if (showAd) {
    return (
      <div className="space-y-2">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-violet-500/40 bg-black"
          style={{ aspectRatio: "16/9", minHeight: 240 }}
        >
          <iframe
            src={PRE_ROLL_AD_URL}
            title="Ad"
            className="absolute inset-0 w-full h-full border-0 bg-white"
            allow="autoplay; fullscreen; clipboard-write"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-full bg-black/80 text-white text-xs font-bold tabular-nums">
            {left > 0 ? `${left}s` : "✓"}
          </div>
        </div>
        {left <= 0 && (
          <button
            type="button"
            onClick={() => {
              setShowAd(false);
              setUnlocked(true);
            }}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
          >
            Endelea kucheza
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950"
      style={{ aspectRatio: "16/9", minHeight: 220 }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-3">
        <p className="text-sm font-semibold text-white truncate max-w-full">
          {title || "Video"}
        </p>

        {user ? (
          <p className="text-xs text-amber-300 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            {points ?? 0} point
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            <Link href="/login" className="text-violet-300 underline">
              Ingia
            </Link>{" "}
            ·{" "}
            <Link href="/signup" className="text-violet-300 underline">
              Jisajili (+10)
            </Link>
          </p>
        )}

        {msg && <p className="text-xs text-amber-300">{msg}</p>}

        <div className="flex flex-wrap gap-2 justify-center">
          {hasPoints && (
            <button
              type="button"
              disabled={busy}
              onClick={spendAndUnlock}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "…" : `Cheza (−${POINTS.WATCH_COST})`}
            </button>
          )}

          <button
            type="button"
            onClick={startAd}
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            Tangazo (+{POINTS.AD_REWARD})
          </button>

          {user?.inviteCode && (
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/signup?ref=${user.inviteCode}`;
                navigator.clipboard?.writeText(url);
                setMsg("Invite link imenakiliwa");
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-sm inline-flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
