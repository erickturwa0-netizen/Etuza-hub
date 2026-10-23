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
import PointsOutModal from "@/components/PointsOutModal";

type Props = {
  contentKey: string;
  title?: string;
  children: React.ReactNode;
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
  enabled = true,
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
  const [awarded, setAwarded] = useState(0);
  const [showOutModal, setShowOutModal] = useState(false);

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

  // Countdown finished → award points THEN unlock
  useEffect(() => {
    if (!(counting && left <= 0)) return;
    let cancelled = false;
    (async () => {
      let got = 0;
      try {
        const res = await fetch("/api/points/reward-ad", { method: "POST" });
        if (res.ok) {
          const d = await res.json();
          if (typeof d.points === "number" && !cancelled) {
            setPoints(d.points);
          }
          if (typeof d.awarded === "number") got = d.awarded;
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setAwarded(got);
        if (got > 0) {
          setMsg(`+${got} point zimeongezwa!`);
          setShowOutModal(false);
        } else if (!user) {
          setMsg("Ingia account ili upate point baada ya tangazo");
        }
        try {
          sessionStorage.setItem(preRollStorageKey(contentKey), "1");
        } catch {
          /* ignore */
        }
        setCounting(false);
        setTimeout(() => {
          if (!cancelled) setUnlocked(true);
        }, 700);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [counting, left, contentKey, user]);

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
        setPoints(d.points ?? 0);
        setShowOutModal(true);
        setMsg("Point zimeisha — tazama tangazo.");
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
    setAwarded(0);
    setAdOpened(true);
    setShowOutModal(false);
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

    setMsg("Tangazo limefunguka. Subiri countdown iishe ili upate point.");
  }

  function reopenAd() {
    window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer");
  }

  function copyInvite() {
    if (!user?.inviteCode) return;
    const url = `${window.location.origin}/signup?ref=${user.inviteCode}`;
    navigator.clipboard?.writeText(url);
    setMsg("Invite link imenakiliwa — marafiki wakijisajili unapata +5");
  }

  if (!enabled) return <>{children}</>;

  if (!ready) {
    return (
      <div
        className="rounded-2xl border border-red-900/40 bg-black flex items-center justify-center text-slate-400 text-sm"
        style={{ minHeight: 220, aspectRatio: "16/9" }}
      >
        …
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  const hasPoints = user && (points ?? 0) >= POINTS.WATCH_COST;

  return (
    <>
      <PointsOutModal
        open={showOutModal}
        points={points ?? 0}
        inviteCode={user?.inviteCode}
        onClose={() => setShowOutModal(false)}
        onWatchAd={startAd}
        onInvite={user?.inviteCode ? copyInvite : undefined}
      />

      {counting || adOpened ? (
        <div
          className="relative w-full rounded-2xl overflow-hidden border-2 border-red-600/50 bg-gradient-to-b from-red-950 to-slate-950"
          style={{ aspectRatio: "16/9", minHeight: 240 }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center gap-3">
            {left > 0 && (
              <div className="w-16 h-16 rounded-full border-4 border-red-400 border-t-transparent animate-spin" />
            )}
            <p className="text-3xl font-black text-white tabular-nums">
              {left > 0 ? left : 0}s
            </p>
            <p className="text-sm text-red-100 font-medium">
              {left <= 0
                ? awarded > 0
                  ? `+${awarded} point zimeongezwa!`
                  : "Tayari — endelea kucheza"
                : "Tangazo linaendelea… subiri countdown"}
            </p>
            {user && points !== null && (
              <p className="text-xs text-amber-300 flex items-center gap-1 justify-center">
                <Coins className="w-3.5 h-3.5" />
                Point zako: {points}
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              <button
                type="button"
                onClick={reopenAd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold touch-manipulation"
              >
                <ExternalLink className="w-4 h-4" />
                Fungua tena
              </button>
              {left <= 0 && (
                <button
                  type="button"
                  onClick={() => setUnlocked(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold touch-manipulation"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Cheza sasa
                </button>
              )}
            </div>
            {msg && <p className="text-xs text-amber-300">{msg}</p>}
          </div>
        </div>
      ) : (
        <div
          className="relative w-full rounded-2xl overflow-hidden border-2 border-red-600/40 bg-slate-950"
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
                <Link href="/login" className="text-red-300 underline">
                  Ingia
                </Link>{" "}
                ·{" "}
                <Link href="/signup" className="text-red-300 underline">
                  Jisajili (+{POINTS.SIGNUP})
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60 touch-manipulation"
                >
                  {busy ? "…" : `Cheza (−${POINTS.WATCH_COST} point)`}
                </button>
              )}

              {!hasPoints && user && (
                <button
                  type="button"
                  onClick={() => setShowOutModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold touch-manipulation"
                >
                  Point zimeisha — fungua
                </button>
              )}

              <button
                type="button"
                onClick={startAd}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold touch-manipulation"
              >
                <ExternalLink className="w-4 h-4" />
                Tazama tangazo (+{POINTS.AD_REWARD})
              </button>

              {user?.inviteCode && (
                <button
                  type="button"
                  onClick={copyInvite}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-sm inline-flex items-center gap-1 touch-manipulation"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite (+{POINTS.INVITE_REWARD})
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 text-center max-w-xs">
              Point zinapatikana baada ya countdown ya tangazo kuisha (ukiwa
              umeingia account).
            </p>
          </div>
        </div>
      )}
    </>
  );
}
