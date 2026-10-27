"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  NETWORKS,
  planLabel,
  networkLabel,
  type PayNetwork,
  type PayPlan,
} from "@/lib/payments";
import { packageLabel, type ContentVpnPackage } from "@/lib/vpn-packages";

type Settings = {
  enabled: boolean;
  payPhone: string;
  payNetwork: string;
  priceWeek: number;
  priceMonth: number;
  priceYear: number;
  priceOnce: number;
  instructions: string | null;
  showPackages?: boolean;
};

export default function PaywallDialog({
  contentId,
  contentTitle,
  open,
  onClose,
  defaultPlan,
  contentPrice,
  isVpn,
  contentVpnPackages,
}: {
  contentId?: string;
  contentTitle?: string;
  open: boolean;
  onClose: () => void;
  defaultPlan?: PayPlan;
  contentPrice?: number;
  isVpn?: boolean;
  /** Packages for THIS VPN content only */
  contentVpnPackages?: ContentVpnPackage[];
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [plan, setPlan] = useState<string>(defaultPlan || "once");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderNetwork, setSenderNetwork] = useState<PayNetwork>("vodacom");
  const [screenshot, setScreenshot] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [vpnPkgs, setVpnPkgs] = useState<ContentVpnPackage[]>(
    contentVpnPackages || []
  );

  useEffect(() => {
    if (!open) return;
    fetch("/api/payments/settings")
      .then((r) => r.json())
      .then((s: Settings) => {
        setSettings(s);
      })
      .catch(() => {});

    // Load packages from access API for this content
    if (contentId && isVpn) {
      fetch(`/api/payments/access?contentId=${encodeURIComponent(contentId)}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => {
          const pkgs = (d.vpnPackages || []) as ContentVpnPackage[];
          if (pkgs.length) {
            setVpnPkgs(pkgs);
            setPlan(pkgs[0].plan);
          } else if (contentVpnPackages?.length) {
            setVpnPkgs(contentVpnPackages);
            setPlan(contentVpnPackages[0].plan);
          }
        })
        .catch(() => {});
    }
  }, [open, contentId, isVpn, contentVpnPackages]);

  if (!open) return null;

  const showVpnPackages = !!isVpn && vpnPkgs.length > 0;
  const showGlobalPackages = !isVpn && !!settings?.showPackages;
  const fixedPrice =
    !showGlobalPackages && !showVpnPackages && !!(contentPrice && contentPrice > 0);

  function amount() {
    if (showVpnPackages) {
      const pkg = vpnPkgs.find((p) => p.plan === plan);
      if (pkg) return pkg.priceTzs;
    }
    if (showGlobalPackages && settings) {
      if (plan === "week") return settings.priceWeek;
      if (plan === "month") return settings.priceMonth;
      if (plan === "year") return settings.priceYear;
      return settings.priceOnce;
    }
    if (fixedPrice && contentPrice) return contentPrice;
    if (settings) {
      if (plan === "week") return settings.priceWeek;
      if (plan === "month") return settings.priceMonth;
      if (plan === "year") return settings.priceYear;
      return settings.priceOnce;
    }
    return contentPrice || 0;
  }

  function onFile(file: File | null) {
    if (!file) return;
    if (file.size > 1_500_000) {
      setError("Picha kubwa mno");
      return;
    }
    const r = new FileReader();
    r.onload = () => setScreenshot(String(r.result || ""));
    r.readAsDataURL(file);
  }

  async function submit() {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/payments/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: contentId || null,
          plan,
          amount: amount(),
          senderPhone,
          senderNetwork,
          screenshotUrl: screenshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana");
      } else {
        setMsg("Ombi limetumwa — subiri idhini ya admin");
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Funga"
      />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-lg">Lipia content</h2>
            {contentTitle && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{contentTitle}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {settings && (
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm space-y-1">
            <p>
              Tuma <b className="text-violet-300">{amount().toLocaleString()} TZS</b> kwenda{" "}
              <b>{settings.payPhone}</b> ({networkLabel(settings.payNetwork)})
            </p>
            {settings.instructions && (
              <p className="text-xs text-slate-500">{settings.instructions}</p>
            )}
          </div>
        )}

        {/* VPN packages for THIS content */}
        {showVpnPackages && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Chagua kifurushi</p>
            <div className="grid grid-cols-1 gap-2">
              {vpnPkgs.map((p) => (
                <button
                  key={p.plan}
                  type="button"
                  onClick={() => setPlan(p.plan)}
                  className={`text-left px-3 py-3 rounded-xl border text-sm ${
                    plan === p.plan
                      ? "border-violet-500 bg-violet-950 text-violet-100"
                      : "border-slate-700 text-slate-300"
                  }`}
                >
                  <span className="font-semibold">{packageLabel(p)}</span>
                  <span className="block text-[11px] opacity-80 mt-0.5">
                    {p.priceTzs.toLocaleString()} TZS
                    {p.plan === "timed" && p.accessDays
                      ? ` · siku ${p.accessDays}`
                      : p.plan === "week"
                        ? " · wiki 1"
                        : p.plan === "month"
                          ? " · mwezi 1"
                          : p.plan === "once"
                            ? " · daima"
                            : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showGlobalPackages && settings && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Chagua kifurushi</p>
            <div className="grid grid-cols-2 gap-2">
              {(["once", "week", "month", "year"] as PayPlan[]).map((p) => {
                const price =
                  p === "week"
                    ? settings.priceWeek
                    : p === "month"
                      ? settings.priceMonth
                      : p === "year"
                        ? settings.priceYear
                        : settings.priceOnce;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`px-2 py-2 rounded-xl border text-xs text-left ${
                      plan === p
                        ? "border-violet-500 bg-violet-950 text-violet-200"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    <span className="font-medium">{planLabel(p)}</span>
                    <span className="block text-[10px] opacity-80">
                      {price.toLocaleString()} TZS
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {fixedPrice && (
          <p className="text-sm text-slate-300">
            Bei: <b className="text-violet-300">{amount().toLocaleString()} TZS</b>
          </p>
        )}

        <div>
          <label className="text-xs text-slate-400">Namba uliyotumia kutuma</label>
          <input
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm"
            placeholder="07xxxxxxxx"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">Mtandao wa namba yako</label>
          <select
            value={senderNetwork}
            onChange={(e) => setSenderNetwork(e.target.value as PayNetwork)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm"
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {networkLabel(n)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400">Screenshot ya muamala</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
            className="mt-1 w-full text-sm text-slate-400"
          />
          {screenshot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={screenshot}
              alt="proof"
              className="mt-2 max-h-32 rounded-lg border border-slate-700"
            />
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {msg && <p className="text-xs text-emerald-400">{msg}</p>}

        <button
          type="button"
          disabled={loading || !senderPhone || !screenshot}
          onClick={submit}
          className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Inatuma…" : "Nimetuma — Wasilisha ushahidi"}
        </button>
      </div>
    </div>
  );
}
