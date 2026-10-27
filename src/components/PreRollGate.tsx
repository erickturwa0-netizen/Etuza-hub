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
  const [showOutModal, setShowOutModal] = useState(false);
  const [adsOn, setAdsOn] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setUnlocked(true);
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const contentId = contentKey.includes(":")
          ? contentKey.split(":").slice(1).join(":")
          : contentKey;

        const [setRes, accessRes, meRes] = await Promise.all([
          fetch("/api/payments/settings"),
          fetch(
            `/api/payments/access?contentId=${encodeURIComponent(contentId)}`,
            { credentials: "include" }
          ),
          fetch("/api/auth/me", { credentials: "include" }),
        ]);

        if (setRes.ok) {
          const s = await setRes.json();
          if (s.pointsAdsEnabled === false) {
            if (!cancelled) {
              setAdsOn(false);
              setUnlocked(true);
              setReady(true);
            }
            return;
          }
        }

        if (accessRes.ok) {
          const a = await accessRes.json();
          if (a.hasPaidAccess) {
            if (!cancelled) {
              setUnlocked(true);
              setReady(true);
            }
            return;
          }
        }

        try {
          if (sessionStorage.getItem(preRollStorageKey(contentKey)) === "1") {
            if (!cancelled) setUnlocked(true);
          }
        } catch {
          /* ignore */
        }

        if (meRes.ok) {
          const d = await meRes.json();
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
    if (!counting) return;
    if (left <= 0) {
      setCounting(false);
      setUnlocked(true);
      try {
        sessionStorage.setItem(preRollStorageKey(contentKey), "1");
      } catch {
        /* ignore */
      }
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [counting, left, contentKey]);

  async function claimAdReward() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/points/reward-ad", {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (res.ok) {
        if (typeof d.points === "number") {
          setPoints(d.points);
          const got = d.awarded ?? POINTS.AD_REWARD;
          setMsg(`+${got} point ✓`);
        }
      } else {
        setMsg(d.error || "Imeshindikana");
      }
    } catch {
      setMsg("Tatizo la mtandao");
    }
    setBusy(false);
  }

  function openAd() {
    setAdOpened(true);
    window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer");
  }

  async function spendAndWatch() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/points/spend", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentKey }),
      });
      const d = await res.json();
      if (res.ok) {
        if (typeof d.points === "number") setPoints(d.points);
        setCounting(true);
        setLeft(PRE_ROLL_SECONDS);
      } else if (d.code === "NO_POINTS") {
        setShowOutModal(true);
      } else {
        setMsg(d.error || "Imeshindikana");
      }
    } catch {
      setMsg("Tatizo la mtandao");
    }
    setBusy(false);
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
        Inapakia…
      </div>
    );
  }

  if (unlocked || !adsOn) return <>{children}</>;

  return (
    <>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-200">
          <Coins className="w-5 h-5" />
          <h3 className="font-semibold text-sm">Point zinahitajika</h3>
        </div>
        {title && <p className="text-xs text-slate-400 line-clamp-1">{title}</p>}

        {user ? (
          <p className="text-sm text-slate-300">
            Point zako: <b className="text-white">{points ?? user.points}</b>
          </p>
        ) : (
          <p className="text-sm text-slate-400">Ingia ili utumie point au ulipe.</p>
        )}

        {msg && <p className="text-xs text-emerald-400">{msg}</p>}

        <div className="flex flex-col gap-2">
          {user && (
            <button
              type="button"
              disabled={busy || counting}
              onClick={spendAndWatch}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {counting
                ? `Subiri ${left}s…`
                : `Tumia ${POINTS.WATCH_COST} point — Tazama`}
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={openAd}
            className="w-full py-3 rounded-xl border border-slate-600 text-slate-200 text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Tazama tangazo (+{POINTS.AD_REWARD})
          </button>

          {adOpened && user && (
            <button
              type="button"
              disabled={busy}
              onClick={claimAdReward}
              className="w-full py-2.5 rounded-xl bg-emerald-600/90 text-white text-sm font-semibold"
            >
              Nimetazama — Pata point
            </button>
          )}

          {!user && (
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-900 text-sm font-semibold text-center"
            >
              Ingia
            </Link>
          )}

          {user && (
            <Link
              href="/account"
              className="text-center text-xs text-violet-400 inline-flex items-center justify-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" /> Alika rafiki / Account
            </Link>
          )}
        </div>
      </div>

      <PointsOutModal
        open={showOutModal}
        points={points ?? user?.points ?? 0}
        inviteCode={user?.inviteCode}
        onClose={() => setShowOutModal(false)}
        onWatchAd={() => {
          setShowOutModal(false);
          openAd();
        }}
      />
    </>
  );
}
