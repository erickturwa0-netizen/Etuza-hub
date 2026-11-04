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
  Timer,
  RefreshCw,
  Coins,
  X,
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

const AD_WAIT_SECONDS = Math.max(Number(PRE_ROLL_SECONDS) || 12, 12);

function spentKey(contentKey: string) {
  return `etuza_spent_${contentKey}`;
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

export default function PreRollGate({
  contentKey,
  title,
  children,
  enabled = true,
}: Props) {
  const [unlocked, setUnlocked] = useState(!enabled);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [points, setPoints] = useState(0);
  const [pkgPoints, setPkgPoints] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [adOpened, setAdOpened] = useState(false);
  const [adLeft, setAdLeft] = useState(0);
  const [adTotal, setAdTotal] = useState(AD_WAIT_SECONDS);
  const [adsOn, setAdsOn] = useState(true);
  const [payEnabled, setPayEnabled] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [charged, setCharged] = useState(false);
  const [rewardDone, setRewardDone] = useState(false);
  const [reloadPopup, setReloadPopup] = useState(false);
  const [awardedAmt, setAwardedAmt] = useState(0);

  const claimedRef = useRef(false);
  const claimingRef = useRef(false);
  const adEndAtRef = useRef(0);
  const userRef = useRef<MeUser | null>(null);
  const chargingRef = useRef(false);

  const contentId = contentKey.includes(":")
    ? contentKey.split(":").slice(1).join(":")
    : contentKey;

  useEffect(() => {
    userRef.current = user;
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
          if (sessionStorage.getItem(spentKey(contentKey)) === "1") {
            if (!cancelled) {
              setCharged(true);
              setUnlocked(true);
            }
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
    if (ready && !adsOn && !payEnabled) setUnlocked(true);
  }, [ready, adsOn, payEnabled]);

  /** Deduct points — only once per contentKey per browser session */
  const doSpend = useCallback(async (): Promise<boolean> => {
    if (hasPaidAccess) return true;

    try {
      if (sessionStorage.getItem(spentKey(contentKey)) === "1") {
        setCharged(true);
        return true;
      }
    } catch {
      /* ignore */
    }

    if (charged) return true;
    if (chargingRef.current) return false;

    chargingRef.current = true;
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
        setCharged(true);
        setPoints(d.points);
        notifyPointsUpdated(d.points);
        if (typeof d.packagePoints === "number") setPkgPoints(d.packagePoints);
        try {
          sessionStorage.setItem(spentKey(contentKey), "1");
          sessionStorage.setItem(preRollStorageKey(contentKey), "1");
        } catch {
          /* ignore */
        }
        if (d.spent > 0) {
          setMsg(`−${d.spent} point zimekatwa · baki ${d.points}`);
        } else {
          setMsg(`Point: ${d.points}`);
        }
        chargingRef.current = false;
        setBusy(false);
        return true;
      }

      if (d.code === "NO_POINTS") {
        setMsg("Point zimeisha — tazama tangazo");
        setPoints(typeof d.points === "number" ? d.points : points);
      } else if (res.status === 401) {
        setMsg("Ingia kwanza");
      } else {
        setMsg(d.error || "Imeshindikana kukata point");
      }
      chargingRef.current = false;
      setBusy(false);
      return false;
    } catch {
      setMsg("Tatizo la mtandao — jaribu tena");
      chargingRef.current = false;
      setBusy(false);
      return false;
    }
  }, [hasPaidAccess, charged, contentKey, points]);

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
          setMsg(
            d.message ||
              `Point zimeshalipwa hivi karibuni — subiri ${d.waitSec || 20}s`
          );
          claimedRef.current = true;
          setRewardDone(true);
          setAwardedAmt(0);
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
      setMsg("Tatizo la mtandao");
      claimedRef.current = false;
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
    if (!adOpened) return;
    function onVis() {
      if (document.visibilityState !== "visible") return;
      if (!adEndAtRef.current) return;
      const remain = Math.max(
        0,
        Math.ceil((adEndAtRef.current - Date.now()) / 1000)
      );
      setAdLeft(remain);
      if (remain <= 0) void awardPointsAuto();
    }
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [adOpened, awardPointsAuto]);

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

  /** CRITICAL: spend FIRST, only then unlock player */
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
    const total = points + pkgPoints;
    if (total < POINTS.WATCH_COST) {
      setMsg("Point hazitoshi — tazama tangazo, alika au lipia");
      return;
    }

    const ok = await doSpend();
    if (ok) {
      setUnlocked(true);
    }
  }

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

  function reloadPage() {
    try {
      window.location.reload();
    } catch {
      window.location.href = window.location.href;
    }
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
  const adProgress =
    adTotal > 0 ? Math.min(100, ((adTotal - adLeft) / adTotal) * 100) : 0;

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
            Point −{POINTS.WATCH_COST} zitakatwa mara moja unapobonyeza Tazama
          </p>
        </div>

        {adOpened && !rewardDone && adLeft > 0 && (
          <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-200 text-xs font-medium uppercase tracking-wide">
              <Timer className="w-4 h-4" />
              Subiri — point zitaingia kiotomatiki
            </div>
            <p className="text-5xl font-black tabular-nums text-amber-300 leading-none">
              {adLeft}
            </p>
            <p className="text-sm text-amber-100/90">
              sekunde · kisha +{POINTS.AD_REWARD} point
            </p>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-200 ease-linear"
                style={{ width: `${adProgress}%` }}
              />
            </div>
          </div>
        )}

        {rewardDone && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center space-y-2">
            <p className="text-sm font-semibold text-emerald-300">
              Point zimeongezwa ✓ · sasa una {points}
            </p>
            <button
              type="button"
              onClick={reloadPage}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh page
            </button>
          </div>
        )}

        {msg && (
          <p className="text-xs text-center text-emerald-400 font-medium">{msg}</p>
        )}

        <div className="grid gap-2">
          {user && (
            <button
              type="button"
              disabled={busy || totalSpendable < POINTS.WATCH_COST}
              onClick={() => void openPlayer()}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {busy
                ? "Inakatwa point…"
                : `Tazama (−${POINTS.WATCH_COST} point)`}
            </button>
          )}

          {adsOn && (
            <button
              type="button"
              disabled={busy || (adOpened && !rewardDone && adLeft > 0)}
              onClick={openAd}
              className="w-full py-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-100 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ExternalLink className="w-4 h-4" />
              {adOpened && !rewardDone && adLeft > 0
                ? `Subiri ${adLeft}s… (auto +${POINTS.AD_REWARD})`
                : rewardDone
                  ? `Tazama tangazo tena (+${POINTS.AD_REWARD})`
                  : `Tazama tangazo (+${POINTS.AD_REWARD} point · ${AD_WAIT_SECONDS}s)`}
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

      {reloadPopup && (
        <div
          className="fixed inset-0 z-[100050] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setReloadPopup(false)}
            aria-label="Funga"
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 to-black p-6 shadow-2xl text-center space-y-4">
            <button
              type="button"
              onClick={() => setReloadPopup(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-600 flex items-center justify-center">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {awardedAmt > 0
                  ? `+${awardedAmt} Point!`
                  : "Point zimesasishwa"}
              </h2>
              <p className="text-sm text-slate-300 mt-2">
                Point zako:{" "}
                <span className="text-amber-300 font-bold text-lg">{points}</span>
              </p>
              <p className="text-sm text-slate-400 mt-2">
                <b className="text-white">Refresh</b> page ili uone point mpya.
              </p>
            </div>
            <button
              type="button"
              onClick={reloadPage}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh page sasa
            </button>
          </div>
        </div>
      )}

      <PaywallDialog
        contentId={contentId}
        contentTitle={title}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />
    </>
  );
}
