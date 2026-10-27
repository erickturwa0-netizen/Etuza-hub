"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coins,
  UserPlus,
  ExternalLink,
  Play,
  CreditCard,
  Gift,
} from "lucide-react";
import {
  PRE_ROLL_AD_URL,
  PRE_ROLL_SECONDS,
  preRollStorageKey,
} from "@/lib/ads";
import { POINTS } from "@/lib/points";
import PaywallDialog from "@/components/PaywallDialog";

type Props = {
  contentKey: string;
  title?: string;
  children: React.ReactNode;
  enabled?: boolean;
};

type MeUser = {
  id: string;
  points: number;
  packagePoints?: number;
  packagePointsExpiresAt?: string | null;
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
  const [points, setPoints] = useState(0);
  const [pkgPoints, setPkgPoints] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [adOpened, setAdOpened] = useState(false);
  const [adsOn, setAdsOn] = useState(true);
  const [payEnabled, setPayEnabled] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);

  const contentId = contentKey.includes(":")
    ? contentKey.split(":").slice(1).join(":")
    : contentKey;

  useEffect(() => {
    if (!enabled) {
      setUnlocked(true);
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
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
          if (!cancelled) {
            setPayEnabled(!!s.enabled);
            if (s.pointsAdsEnabled === false) {
              setAdsOn(false);
            }
          }
        }

        if (accessRes.ok) {
          const a = await accessRes.json();
          if (a.hasPaidAccess) {
            if (!cancelled) {
              setHasPaidAccess(true);
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
            const exp = d.user.packagePointsExpiresAt
              ? new Date(d.user.packagePointsExpiresAt)
              : null;
            const active =
              (d.user.packagePoints || 0) > 0 &&
              (!exp || exp.getTime() > Date.now());
            setPkgPoints(active ? d.user.packagePoints : 0);
          }
        }

        // If ads off and payments off → unlock
        if (setRes.ok) {
          const s = await setRes.json().catch(() => null);
          // re-read from state path — already set above
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentKey, contentId, enabled]);

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

  // Ads off → no gate (unless we still want pay — paywall is separate)
  useEffect(() => {
    if (ready && !adsOn && !payEnabled) {
      setUnlocked(true);
    }
  }, [ready, adsOn, payEnabled]);

  async function claimAdReward() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/points/reward-ad", {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (res.ok && typeof d.points === "number") {
        setPoints(d.points);
        setMsg(`+${d.awarded ?? POINTS.AD_REWARD} point (za kawaida) ✓`);
      } else setMsg(d.error || "Imeshindikana");
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
        if (typeof d.packagePoints === "number") setPkgPoints(d.packagePoints);
        setCounting(true);
        setLeft(PRE_ROLL_SECONDS);
      } else {
        setMsg(d.error || "Point hazitoshi — chagua ads, invite au lipia");
      }
    } catch {
      setMsg("Tatizo la mtandao");
    }
    setBusy(false);
  }

  function copyInvite() {
    const code = user?.inviteCode || "";
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?ref=${code}`
        : code;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setMsg(`Link ya invite imenakiliwa — rafiki akisajili unapata +${POINTS.INVITE_REWARD}`);
      });
    } else {
      setMsg(`Code: ${code}`);
    }
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
        Inapakia…
      </div>
    );
  }

  if (unlocked || hasPaidAccess) return <>{children}</>;

  if (!adsOn && !payEnabled) return <>{children}</>;

  const totalSpendable = points + pkgPoints;

  return (
    <>
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-5 space-y-4 shadow-xl shadow-violet-900/20">
        <div className="text-center space-y-1">
          <h3 className="font-bold text-base text-white">Chagua njia ya kutazama</h3>
          {title && (
            <p className="text-xs text-slate-400 line-clamp-1">{title}</p>
          )}
          {user && (
            <p className="text-xs text-slate-300 pt-1">
              Point za kawaida: <b className="text-white">{points}</b>
              {pkgPoints > 0 && (
                <>
                  {" · "}
                  Kifurushi: <b className="text-amber-300">{pkgPoints}</b>
                </>
              )}
            </p>
          )}
        </div>

        {msg && (
          <p className="text-xs text-center text-emerald-400">{msg}</p>
        )}

        <div className="grid gap-2">
          {/* Tazama with points */}
          {user && adsOn && (
            <button
              type="button"
              disabled={busy || counting || totalSpendable < POINTS.WATCH_COST}
              onClick={spendAndWatch}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {counting
                ? `Subiri ${left}s…`
                : `Tazama (−${POINTS.WATCH_COST} point)`}
            </button>
          )}

          {/* Watch ad */}
          {adsOn && (
            <button
              type="button"
              disabled={busy}
              onClick={openAd}
              className="w-full py-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Tazama tangazo (+{POINTS.AD_REWARD} point)
            </button>
          )}

          {adOpened && user && adsOn && (
            <button
              type="button"
              disabled={busy}
              onClick={claimAdReward}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
            >
              Nimetazama — Pata +{POINTS.AD_REWARD}
            </button>
          )}

          {/* Invite */}
          {user && (
            <button
              type="button"
              onClick={copyInvite}
              className="w-full py-3 rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-100 text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4" />
              Alika rafiki (+{POINTS.INVITE_REWARD} point)
            </button>
          )}

          {/* Pay package */}
          {payEnabled && (
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="w-full py-3 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100 text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Lipia kifurushi (+{POINTS.PACKAGE_BONUS} point za muda)
            </button>
          )}

          {!user && (
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-900 text-sm font-semibold text-center inline-flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Ingia kwanza
            </Link>
          )}
        </div>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Kifurushi: unapata {POINTS.PACKAGE_BONUS} point za muda — zinaisha na muda wa
          kifurushi. Point za kawaida (ads / invite) zinabaki.
        </p>
      </div>

      <PaywallDialog
        contentId={contentId}
        contentTitle={title}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />
    </>
  );
}
