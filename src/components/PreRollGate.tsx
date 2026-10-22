"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, ExternalLink, Coins, UserPlus } from "lucide-react";
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
  const [user, setUser] = useState<MeUser | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Session unlock already?
      try {
        if (sessionStorage.getItem(preRollStorageKey(contentKey)) === "1") {
          if (!cancelled) setUnlocked(true);
        }
      } catch {
        /* ignore */
      }

      // Load user points
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
      // Reward ad points if logged in
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
        setMsg("Ingia account ili utumie point zako.");
        setBusy(false);
        return;
      }
      if (res.status === 402 || d.code === "NO_POINTS") {
        setMsg("Point zimeisha — tazama tangazo au alika rafiki.");
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

  const hasPoints = user && (points ?? 0) >= POINTS.WATCH_COST;
  const inviteUrl =
    typeof window !== "undefined" && user?.inviteCode
      ? `${window.location.origin}/signup?ref=${user.inviteCode}`
      : user?.inviteCode
        ? `/signup?ref=${user.inviteCode}`
        : "";

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-violet-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950"
      style={{ aspectRatio: "16/9", minHeight: 240 }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <p className="text-xs uppercase tracking-widest text-violet-300/80">
            Point system
          </p>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-1 max-w-md">
          {title || "Video"}
        </h2>

        {user ? (
          <p className="text-sm text-slate-300 mb-1">
            Point zako:{" "}
            <span className="font-bold text-amber-300">{points ?? 0}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-400 mb-1">
            <Link href="/login" className="text-violet-300 underline">
              Ingia
            </Link>{" "}
            au{" "}
            <Link href="/signup" className="text-violet-300 underline">
              fungua account
            </Link>{" "}
            (point 10 bure)
          </p>
        )}

        <p className="text-xs text-slate-500 mb-5 max-w-sm">
          Tumia {POINTS.WATCH_COST} point kuangalia, au tazama tangazo (+{POINTS.AD_REWARD}{" "}
          point). Alika rafiki = +{POINTS.INVITE_REWARD} point.
        </p>

        {msg && (
          <p className="text-xs text-amber-300 mb-3 max-w-sm">{msg}</p>
        )}

        {!counting ? (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
            {hasPoints && (
              <button
                type="button"
                disabled={busy}
                onClick={spendAndUnlock}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm disabled:opacity-60"
              >
                <Coins className="w-4 h-4" />
                {busy ? "…" : `Tumia ${POINTS.WATCH_COST} point`}
              </button>
            )}

            <button
              type="button"
              onClick={startAd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Tazama tangazo (+{POINTS.AD_REWARD})
            </button>

            {user?.inviteCode && (
              <button
                type="button"
                onClick={() => {
                  const url =
                    inviteUrl.startsWith("http")
                      ? inviteUrl
                      : `${window.location.origin}${inviteUrl}`;
                  navigator.clipboard?.writeText(url);
                  setMsg("Link ya invite imenakiliwa! Alika rafiki → +5 point");
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Nakili invite link
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-white font-semibold text-lg tabular-nums">{left}s</p>
            <p className="text-xs text-slate-400">
              Subiri… utapata +{POINTS.AD_REWARD} point na content itafunguka
            </p>
          </div>
        )}

        {left <= 0 && counting && (
          <button
            type="button"
            onClick={() => setUnlocked(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
          >
            <Play className="w-4 h-4 fill-current" />
            Anza sasa
          </button>
        )}
      </div>
    </div>
  );
}
