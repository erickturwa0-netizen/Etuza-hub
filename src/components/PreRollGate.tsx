"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, UserPlus, ExternalLink, Play } from "lucide-react";
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
  /** When false, skip gate (movies play free). Default false for now. */
  enabled?: boolean;
};

type MeUser = {
  id: string;
  points: number;
  inviteCode?: string | null;
  role?: string;
};

export default function PreRollGate({
  contentKey,
  title,
  children,
  enabled = false,
}: Props) {
  const [unlocked, setUnlocked] = useState(!enabled);
  const [counting, setCounting] = useState(false);
  const [left, setLeft] = useState(PRE_ROLL_SECONDS);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [adOpened, setAdOpened] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setUnlocked(true);
      setReady(true);
      return;
    }

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
  }, [contentKey, enabled]);

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

  function startAd() {
    setMsg("");
    setAdOpened(true);
    setLeft(PRE_ROLL_SECONDS);
    setCounting(true);

    const win = window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer");
    if (!win) {
      try {
        sessionStorage.setItem("etuza_ad_return", window.location.href);
        sessionStorage.setItem(preRollStorageKey(contentKey) + "_pending", "1");
      } catch {
        /* ignore */
      }
      window.location.assign(PRE_ROLL_AD_URL);
      return;
    }

    setMsg("Tangazo limefunguka. Rudi hapa baada ya countdown.");
  }

  function reopenAd() {
    window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer");
  }

  if (!enabled) return <>{children}</>;

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

  if (counting || adOpened) {
    const done = left <= 0;
    return (
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-violet-500/50 bg-gradient-to-b from-violet-950 to-slate-950"
        style={{ aspectRatio: "16/9", minHeight: 240 }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center gap-3">
          <div className="w-16 h-16 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
          <p className="text-3xl font-black text-white tabular-nums">
            {done ? "0" : left}s
          </p>
          <p className="text-sm text-violet-200 font-medium">
            {done
              ? "Tayari — endelea kucheza"
              : "Tangazo linaendelea…"}
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-1">
            <button
              type="button"
              onClick={reopenAd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4" />
              Fungua tena
            </button>
            {done && (
              <button
                type="button"
                onClick={() => setUnlocked(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
              >
                <Play className="w-4 h-4 fill-current" />
                Cheza sasa
              </button>
            )}
          </div>
          {msg && <p className="text-xs text-amber-300">{msg}</p>}
        </div>
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            <ExternalLink className="w-4 h-4" />
            Fungua tangazo (+{POINTS.AD_REWARD})
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
