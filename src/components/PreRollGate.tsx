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
  const [adsOn, setAdsOn] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setUnlocked(true);
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      // Global ads toggle + paid package skip
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
          // Paid package / access active → no ad for points
          if (a.enabled && a.locked === false && !a.free && !a.admin) {
            // has paid access
            if (!cancelled) {
              setUnlocked(true);
              setReady(true);
            }
            return;
          }
          // Also if userHasAccess via unlocked when payments on
          if (a.enabled && a.locked === false && a.priceMode && a.priceMode !== "free") {
            if (!cancelled) {
              setUnlocked(true);
              setReady(true);
            }
            return;
          }
        }

        // Session already watched this content
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
    if (!counting || left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [counting, left]);

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
            got = d.awarded ?? POINTS.WATCH_AD ?? 1;
            setAwarded(got);
          }
        }
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.setItem(preRollStorageKey(contentKey), "1");
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setCounting(false);
        setUnlocked(true);
        if (got) setMsg(`+${got} point`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [counting, left, contentKey]);

  function startAd() {
    setAdOpened(true);
    setLeft(PRE_ROLL_SECONDS);
    setCounting(true);
    window.open(PRE_ROLL_AD_URL, "_blank", "noopener,noreferrer");
  }

  async function spendAndWatch() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/points/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentKey }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.code === "NO_POINTS") setShowOutModal(true);
        else setMsg(d.error || "Imeshindikana");
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

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
        Inapakia…
      </div>
    );
  }

  if (!enabled || !adsOn || unlocked) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center gap-2 text-violet-300">
          <Coins className="w-5 h-5" />
          <h3 className="font-semibold text-sm">Tazama au lipia kwa point</h3>
        </div>
        {title && <p className="text-xs text-slate-400">{title}</p>}
        {points !== null && (
          <p className="text-xs text-slate-400">
            Point zako: <b className="text-white">{points}</b>
          </p>
        )}

        {counting ? (
          <p className="text-sm text-amber-200">
            Subiri tangazo… {left}s
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={startAd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
            >
              <Play className="w-4 h-4" /> Tazama tangazo (+point)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={spendAndWatch}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Coins className="w-4 h-4" /> Tumia point kutazama
            </button>
            <Link
              href="/invite"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm"
            >
              <UserPlus className="w-4 h-4" /> Alika rafiki
            </Link>
            <Link
              href="/admin/payments"
              className="hidden"
            />
          </div>
        )}

        {adOpened && !counting && (
          <a
            href={PRE_ROLL_AD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-500"
          >
            <ExternalLink className="w-3 h-3" /> Fungua tangazo tena
          </a>
        )}

        {msg && <p className="text-xs text-emerald-400">{msg}</p>}
        {awarded > 0 && unlocked && (
          <p className="text-xs text-slate-500">Umepewa point — content iko wazi.</p>
        )}

        <p className="text-[11px] text-slate-500">
          Ukilipia kifurushi (wiki/mwezi…) hutakutana na tangazo hadi muda uishe.
        </p>
      </div>

      {showOutModal && (
        <PointsOutModal onClose={() => setShowOutModal(false)} />
      )}
    </>
  );
}
