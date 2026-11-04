"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
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
  children: ReactNode;
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

export const PlaybackChargeContext = createContext<{
  contentKey: string;
  chargeOnPlay: () => Promise<void>;
  hasPaidAccess: boolean;
} | null>(null);

export function usePlaybackCharge() {
  return useContext(PlaybackChargeContext);
}

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
  const [adLeft, setAdLeft] = useState(0);
  const [adsOn, setAdsOn] = useState(true);
  const [payEnabled, setPayEnabled] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [charged, setCharged] = useState(false);
  const claimedRef = useRef(false);

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
            if (s.pointsAdsEnabled === false) setAdsOn(false);
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

  useEffect(() => {
    if (ready && !adsOn && !payEnabled) setUnlocked(true);
  }, [ready, adsOn, payEnabled]);

  const claimAdReward = useCallback(async () => {
    if (claimedRef.current || busy) return;
    if (!user) {
      setMsg("Ingia kwanza ili upate point");
      return;
    }
    claimedRef.current = true;
    setBusy(true);
    setMsg("Inaongeza point…");
    try {
      const res = await fetch("/api/points/reward-ad", {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (res.ok && typeof d.points === "number") {
        setPoints(d.points);
        if (d.awarded > 0) {
          setMsg(`+${d.awarded} point zimeongezwa ✓`);
        } else if (d.cooldown) {
          setMsg(d.message || `Subiri ${d.waitSec || 45}s kisha jaribu tena`);
          claimedRef.current = false;
        } else if (d.guest) {
          setMsg("Ingia kwanza ili upate point");
          claimedRef.current = false;
        } else {
          setMsg(d.message || "Tayari");
        }
      } else {
        setMsg(d.error || "Imeshindikana");
        claimedRef.current = false;
      }
    } catch {
      setMsg("Tatizo la mtandao — jaribu tena");
      claimedRef.current = false;
    }
    setBusy(false);
  }, [busy, user]);

  // Countdown while ad is "watching" then auto-claim
  useEffect(() => {
    if (!adOpened || adLeft <= 0) return;
    const t = setTimeout(() => setAdLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [adOpened, adLeft]);

  useEffect(() => {
    if (adOpened && adLeft === 0 && user && !claimedRef.current) {
      void claimAdReward();
    }
  }, [adOpened, adLeft, user, claimAdReward]);

  // When user returns to tab after ad, finish countdown faster / claim
  useEffect(() => {
    if (!adOpened) return;
    function onVis() {
      if (document.visibilityState === "visible" && adLeft > 2) {
        setAdLeft(2);
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [adOpened, adLeft]);

  function openAd() {
    if (!user) {
      setMsg("Ingia / jisajili kwanza ili upate point kutoka tangazo");
      return;
    }
    claimedRef.current = false;
    setAdOpened(true);
    setAdLeft(Math.max(PRE_ROLL_SECONDS, 8));
    setMsg(`Fungua tangazo — point zitaongezwa baada ya sekunde chache…`);
    window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer");
  }

  function openPlayer() {
    setMsg("");
    if (hasPaidAccess || user?.role === "admin") {
      setUnlocked(true);
      return;
    }
    const total = points + pkgPoints;
    if (total < POINTS.WATCH_COST) {
      setMsg("Point hazitoshi — tazama tangazo, alika au lipia");
      return;
    }
    setCounting(true);
    setLeft(Math.min(PRE_ROLL_SECONDS, 2));
  }

  const chargeOnPlay = useCallback(async () => {
    if (charged || hasPaidAccess) return;
    if (user?.role === "admin") return;
    try {
      const res = await fetch("/api/points/spend", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentKey }),
      });
      const d = await res.json();
      if (res.ok) {
        setCharged(true);
        if (typeof d.points === "number") setPoints(d.points);
        if (typeof d.packagePoints === "number") setPkgPoints(d.packagePoints);
      }
    } catch {
      /* ignore */
    }
  }, [charged, hasPaidAccess, user?.role, contentKey]);

  function copyInvite() {
    const code = user?.inviteCode || "";
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/login?ref=${code}`
        : code;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setMsg(
          `Invite link imenakiliwa (+${POINTS.INVITE_REWARD} rafiki akisajili)`
        );
      });
    } else setMsg(`Code: ${code}`);
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
        Inapakia…
      </div>
    );
  }

  if (unlocked || hasPaidAccess) {
    return (
      <PlaybackChargeContext.Provider
        value={{ contentKey, chargeOnPlay, hasPaidAccess }}
      >
        {children}
      </PlaybackChargeContext.Provider>
    );
  }

  if (!adsOn && !payEnabled) {
    return (
      <PlaybackChargeContext.Provider
        value={{ contentKey, chargeOnPlay, hasPaidAccess }}
      >
        {children}
      </PlaybackChargeContext.Provider>
    );
  }

  const totalSpendable = points + pkgPoints;

  return (
    <>
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-5 space-y-4 shadow-xl shadow-violet-900/20">
        <div className="text-center space-y-1">
          <h3 className="font-bold text-base text-white">
            Chagua njia ya kutazama
          </h3>
          {title && (
            <p className="text-xs text-slate-400 line-clamp-1">{title}</p>
          )}
          {user && (
            <p className="text-xs text-slate-300 pt-1">
              Point: <b className="text-white">{points}</b>
              {pkgPoints > 0 && (
                <>
                  {" · "}Kifurushi:{" "}
                  <b className="text-amber-300">{pkgPoints}</b>
                </>
              )}
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            Point zitakatwa tu baada ya video/audio kuanza kucheza
          </p>
        </div>

        {msg && (
          <p className="text-xs text-center text-emerald-400 font-medium">{msg}</p>
        )}

        <div className="grid gap-2">
          {user && adsOn && (
            <button
              type="button"
              disabled={busy || counting || totalSpendable < POINTS.WATCH_COST}
              onClick={openPlayer}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {counting
                ? `Subiri ${left}s…`
                : `Tazama (point −${POINTS.WATCH_COST} ikicheza)`}
            </button>
          )}

          {adsOn && (
            <button
              type="button"
              disabled={busy || (adOpened && adLeft > 0)}
              onClick={openAd}
              className="w-full py-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ExternalLink className="w-4 h-4" />
              {adOpened && adLeft > 0
                ? `Inasubiri tangazo… ${adLeft}s`
                : `Tazama tangazo (+${POINTS.AD_REWARD} point)`}
            </button>
          )}

          {adOpened && user && adsOn && adLeft === 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                claimedRef.current = false;
                void claimAdReward();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
            >
              {busy ? "Inaongeza…" : `Pata +${POINTS.AD_REWARD} point sasa`}
            </button>
          )}

          {user && (
            <button
              type="button"
              onClick={copyInvite}
              className="w-full py-3 rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-100 text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4" />
              Alika rafiki (+{POINTS.INVITE_REWARD})
            </button>
          )}

          {payEnabled && (
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="w-full py-3 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100 text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Lipia kifurushi
            </button>
          )}

          {!user && (
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-900 text-sm font-semibold text-center inline-flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Ingia kwanza (point + tangazo)
            </Link>
          )}
        </div>
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
