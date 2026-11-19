"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { POINTS } from "@/lib/points";
import { PRE_ROLL_AD_URL, PRE_ROLL_SECONDS } from "@/lib/ads";

const AD_WAIT_SECONDS = Math.max(Number(PRE_ROLL_SECONDS) || 12, 12);

type ChargeCtx = {
  contentKey: string;
  chargeOnPlay: () => Promise<void>;
  hasPaidAccess: boolean;
};

const PlaybackChargeContext = createContext<ChargeCtx | null>(null);

export function usePlaybackCharge() {
  return useContext(PlaybackChargeContext);
}

function notifyPointsUpdated(points: number) {
  try {
    window.dispatchEvent(
      new CustomEvent("etuza-points", { detail: { points } })
    );
  } catch {
    /* ignore */
  }
}

type Props = {
  contentKey: string;
  title?: string;
  enabled?: boolean;
  children: ReactNode;
};

export default function PreRollGate({
  contentKey,
  title,
  enabled = true,
  children,
}: Props) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    points: number;
    inviteCode?: string | null;
  } | null>(null);
  const [points, setPoints] = useState(0);
  const [pkgPoints, setPkgPoints] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [adsOn, setAdsOn] = useState(true);
  const [payEnabled, setPayEnabled] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [adOpened, setAdOpened] = useState(false);
  const [adLeft, setAdLeft] = useState(0);
  const [adTotal, setAdTotal] = useState(AD_WAIT_SECONDS);
  const [rewardDone, setRewardDone] = useState(false);
  const [reloadPopup, setReloadPopup] = useState(false);
  const [awardedAmt, setAwardedAmt] = useState(0);

  const charged = useRef(false);
  const claimedRef = useRef(false);
  const claimingRef = useRef(false);
  const userRef = useRef(false);
  const adEndAtRef = useRef(0);

  useEffect(() => {
    userRef.current = !!user;
  }, [user]);

  useEffect(() => {
    if (!enabled) {
      setUnlocked(true);
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [sRes, aRes, meRes] = await Promise.all([
          fetch("/api/payments/settings"),
          fetch(
            `/api/payments/access?contentKey=${encodeURIComponent(contentKey)}`,
            { credentials: "include" }
          ),
          fetch("/api/auth/me", { credentials: "include" }),
        ]);
        if (cancelled) return;
        try {
          const s = await sRes.json();
          if (s.pointsAdsEnabled === false) setAdsOn(false);
          if (s.paymentsEnabled) setPayEnabled(true);
        } catch {
          /* ignore */
        }
        try {
          const a = await aRes.json();
          if (a?.hasAccess) {
            setHasPaidAccess(true);
            setUnlocked(true);
          }
        } catch {
          /* ignore */
        }
        try {
          const d = await meRes.json();
          if (d.user) {
            setUser(d.user);
            setPoints(d.user.points ?? 0);
            setPkgPoints(d.user.packagePoints ?? 0);
          }
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentKey, enabled]);

  useEffect(() => {
    if (ready && !adsOn && !payEnabled) setUnlocked(true);
  }, [ready, adsOn, payEnabled]);

  const doSpend = useCallback(async () => {
    if (hasPaidAccess || charged.current) return true;
    setBusy(true);
    setMsg("Inakatwa point…");
    try {
      const res = await fetch("/api/points/spend", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentKey }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && typeof d.points === "number") {
        charged.current = true;
        setPoints(d.points);
        notifyPointsUpdated(d.points);
        setMsg(
          typeof d.spent === "number"
            ? `−${d.spent} point zimekatwa · baki ${d.points}`
            : `Point: ${d.points}`
        );
        setBusy(false);
        return true;
      }
      if (res.status === 402) {
        setMsg("Point zimeisha — tazama tangazo");
        setPoints(typeof d.points === "number" ? d.points : points);
      } else {
        setMsg(d.error || "Imeshindikana kukata point");
      }
      setBusy(false);
      return false;
    } catch {
      setMsg("Tatizo la mtandao — jaribu tena");
      setBusy(false);
      return false;
    }
  }, [hasPaidAccess, contentKey, points]);

  const chargeOnPlay = useCallback(async () => {
    await doSpend();
  }, [doSpend]);

  const awardPointsAuto = useCallback(async () => {
    if (claimedRef.current || claimingRef.current) return;
    if (!userRef.current) {
      setMsg("Ingia kwanza ili upate point");
      return;
    }
    claimingRef.current = true;
    setBusy(true);
    setMsg("Inaongeza point kiotomatiki…");
    try {
      const res = await fetch("/api/points/reward-ad", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && typeof d.points === "number") {
        setPoints(d.points);
        notifyPointsUpdated(d.points);
        if (d.awarded > 0) {
          claimedRef.current = true;
          setRewardDone(true);
          setAwardedAmt(d.awarded);
          setMsg(`+${d.awarded} point zimeongezwa ✓`);
          setReloadPopup(true);
        } else if (d.cooldown) {
          setMsg(d.message || "Subiri kidogo kisha jaribu tena");
          claimedRef.current = true;
          setRewardDone(true);
          setReloadPopup(true);
        } else {
          setMsg(d.message || d.error || "Hakuna point zilizoongezwa");
          claimedRef.current = false;
        }
      } else if (res.status === 401 || d.guest) {
        setMsg("Ingia kwanza ili upate point");
        claimedRef.current = false;
      } else {
        setMsg(d.error || "Imeshindikana kuongeza point");
        claimedRef.current = false;
      }
    } catch {
      try {
        await new Promise((r) => setTimeout(r, 800));
        const res2 = await fetch("/api/points/reward-ad", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const d2 = await res2.json().catch(() => ({}));
        if (res2.ok && typeof d2.points === "number" && d2.awarded > 0) {
          setPoints(d2.points);
          notifyPointsUpdated(d2.points);
          claimedRef.current = true;
          setRewardDone(true);
          setAwardedAmt(d2.awarded);
          setMsg(`+${d2.awarded} point zimeongezwa ✓`);
          setReloadPopup(true);
        } else {
          setMsg("Tatizo la mtandao — jaribu tena");
          claimedRef.current = false;
        }
      } catch {
        setMsg("Tatizo la mtandao");
        claimedRef.current = false;
      }
    }
    claimingRef.current = false;
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!adOpened || rewardDone) return;
    if (!adEndAtRef.current) return;
    const tick = () => {
      const remain = Math.max(
        0,
        Math.ceil((adEndAtRef.current - Date.now()) / 1000)
      );
      setAdLeft(remain);
      if (remain <= 0) void awardPointsAuto();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [adOpened, rewardDone, awardPointsAuto]);

  useEffect(() => {
    if (!adOpened || rewardDone) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (!adEndAtRef.current) return;
      if (Date.now() >= adEndAtRef.current) void awardPointsAuto();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [adOpened, rewardDone, awardPointsAuto]);

  function openAd() {
    if (!user) {
      setMsg("Ingia / jisajili kwanza ili upate point kutoka tangazo");
      return;
    }
    claimedRef.current = false;
    claimingRef.current = false;
    setRewardDone(false);
    setReloadPopup(false);
    setAwardedAmt(0);
    const secs = AD_WAIT_SECONDS;
    setAdTotal(secs);
    setAdLeft(secs);
    adEndAtRef.current = Date.now() + secs * 1000;
    setAdOpened(true);
    setMsg(
      `Tangazo limefunguka. Subiri ${secs}s — +${POINTS.AD_REWARD} point auto.`
    );
    try {
      window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer");
    } catch {
      setMsg(`Ruhusu popup. Countdown ${secs}s inaendelea.`);
    }
  }

  async function openPlayer() {
    setMsg("");
    if (hasPaidAccess) {
      setUnlocked(true);
      return;
    }
    if (!user) {
      setMsg("Ingia kwanza");
      return;
    }
    if (points + pkgPoints < POINTS.WATCH_COST) {
      setMsg("Point hazitoshi — tazama tangazo, alika au lipia");
      return;
    }
    const ok = await doSpend();
    if (ok) setUnlocked(true);
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

  const adProgress =
    adTotal > 0 ? Math.min(100, ((adTotal - adLeft) / adTotal) * 100) : 0;

  return (
    <>
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-5 space-y-4">
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
                  {" "}
                  + pkg <b>{pkgPoints}</b>
                </>
              )}
            </p>
          )}
        </div>

        {adOpened && !rewardDone && (
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all"
                style={{ width: `${adProgress}%` }}
              />
            </div>
            <p className="text-center text-sm text-violet-200">
              Countdown: <b>{adLeft}s</b> — point zitaingia automatic
            </p>
          </div>
        )}

        {msg && (
          <p className="text-center text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {msg}
          </p>
        )}

        <div className="grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={openAd}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {adOpened && !rewardDone
              ? `Inasubiri… ${adLeft}s`
              : `Tazama tangazo (+${POINTS.AD_REWARD} point · ${AD_WAIT_SECONDS}s)`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={openPlayer}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-600 disabled:opacity-50"
          >
            Fungua player (−{POINTS.WATCH_COST} point)
          </button>
          {!user && (
            <Link
              href="/login"
              className="block text-center text-sm text-violet-400 py-2"
            >
              Ingia / Jisajili
            </Link>
          )}
        </div>
      </div>

      {reloadPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-6 max-w-sm w-full text-center space-y-3">
            <p className="text-white font-bold text-lg">
              {awardedAmt > 0
                ? `+${awardedAmt} point zimeongezwa!`
                : "Point zimesasishwa"}
            </p>
            <p className="text-sm text-slate-400">
              Bonyeza reload kuona point zako mpya.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-semibold"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => setReloadPopup(false)}
              className="w-full py-2 text-sm text-slate-400"
            >
              Funga
            </button>
          </div>
        </div>
      )}
    </>
  );
}
