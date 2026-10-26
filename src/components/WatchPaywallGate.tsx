"use client";

import { useEffect, useState } from "react";
import PaywallDialog from "@/components/PaywallDialog";
import type { PayPlan } from "@/lib/payments";

export default function WatchPaywallGate({
  contentId,
  title,
  priceMode,
  priceTzs,
  children,
}: {
  contentId: string;
  title: string;
  priceMode?: string | null;
  priceTzs?: number | null;
  children: React.ReactNode;
}) {
  const [locked, setLocked] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/payments/access?contentId=${encodeURIComponent(contentId)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.enabled && data.locked) {
          setLocked(true);
          setNeedLogin(!!data.needLogin);
          if (!data.needLogin) setOpen(true);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const plan: PayPlan =
    priceMode === "week" ||
    priceMode === "month" ||
    priceMode === "year" ||
    priceMode === "once"
      ? priceMode
      : "month";

  if (!checked) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
        Inapakia…
      </div>
    );
  }

  if (locked) {
    return (
      <>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
          <p className="text-sm text-amber-100 font-medium">
            Content hii inahitaji malipo
          </p>
          <p className="text-xs text-slate-400">
            Tuma pesa → pakia screenshot → admin atakufungulia
          </p>
          {needLogin ? (
            <a
              href={`/login?next=${encodeURIComponent(`/watch/${contentId}`)}`}
              className="inline-block px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
            >
              Ingia kisha ulipe
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
            >
              Lipia sasa
            </button>
          )}
        </div>
        <PaywallDialog
          contentId={contentId}
          contentTitle={title}
          open={open && !needLogin}
          onClose={() => setOpen(false)}
          defaultPlan={plan}
          contentPrice={priceTzs || undefined}
        />
      </>
    );
  }

  return <>{children}</>;
}
