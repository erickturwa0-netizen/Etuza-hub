"use client";

import { useEffect, useState } from "react";
import PaywallDialog from "@/components/PaywallDialog";
import type { PayPlan } from "@/lib/payments";

/**
 * Payment gate.
 * - VPN: always hard paywall when locked (never free download)
 * - Other: if points-ads on → PreRollGate shows all choices
 * - Payments only → pay-only UI
 */
export default function WatchPaywallGate({
  contentId,
  title,
  priceMode,
  priceTzs,
  contentType,
  children,
}: {
  contentId: string;
  title: string;
  priceMode?: string | null;
  priceTzs?: number | null;
  contentType?: string | null;
  children: React.ReactNode;
}) {
  const [locked, setLocked] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isVpn, setIsVpn] = useState(contentType === "vpn");
  const [pointsAdsOn, setPointsAdsOn] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [accessRes, setRes] = await Promise.all([
          fetch(
            `/api/payments/access?contentId=${encodeURIComponent(contentId)}`,
            { credentials: "include" }
          ),
          fetch("/api/payments/settings"),
        ]);

        if (setRes.ok) {
          const s = await setRes.json();
          if (!cancelled) setPointsAdsOn(s.pointsAdsEnabled !== false);
        }

        if (accessRes.ok) {
          const data = await accessRes.json();
          if (cancelled) return;
          if (data.isVpn || contentType === "vpn") setIsVpn(true);
          if (data.enabled && data.locked) {
            setLocked(true);
            setNeedLogin(!!data.needLogin);
          }
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentId, contentType]);

  const plan: PayPlan =
    priceMode === "week" ||
    priceMode === "month" ||
    priceMode === "year" ||
    priceMode === "once"
      ? priceMode
      : "once";

  if (!checked) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
        Inapakia…
      </div>
    );
  }

  // VPN paid → always hard lock (never show download free)
  const forcePayOnly = isVpn || contentType === "vpn";

  if (locked && needLogin) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
        <p className="text-sm text-amber-100 font-medium">
          Content hii inahitaji malipo — ingia kwanza
        </p>
        <a
          href={`/login?next=${encodeURIComponent(`/watch/${contentId}`)}`}
          className="inline-block px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          Ingia
        </a>
      </div>
    );
  }

  if (locked && (forcePayOnly || !pointsAdsOn)) {
    return (
      <>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
          <p className="text-sm text-amber-100 font-medium">
            {forcePayOnly
              ? "VPN hii inahitaji kulipia kifurushi"
              : "Content hii inahitaji malipo"}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
          >
            Lipia sasa
          </button>
        </div>
        <PaywallDialog
          contentId={contentId}
          contentTitle={title}
          open={open}
          onClose={() => setOpen(false)}
          defaultPlan={plan}
          contentPrice={priceTzs || undefined}
          isVpn={forcePayOnly}
        />
      </>
    );
  }

  // Ads + payments (non-VPN) → PreRollGate shows all choices
  return <>{children}</>;
}
