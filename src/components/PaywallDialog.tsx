"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  NETWORKS,
  PLANS,
  planLabel,
  networkLabel,
  type PayNetwork,
  type PayPlan,
} from "@/lib/payments";

type Settings = {
  enabled: boolean;
  payPhone: string;
  payNetwork: string;
  priceWeek: number;
  priceMonth: number;
  priceYear: number;
  priceOnce: number;
  instructions: string | null;
};

export default function PaywallDialog({
  contentId,
  contentTitle,
  open,
  onClose,
  defaultPlan,
  contentPrice,
}: {
  contentId?: string;
  contentTitle?: string;
  open: boolean;
  onClose: () => void;
  defaultPlan?: PayPlan;
  contentPrice?: number;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [plan, setPlan] = useState<PayPlan>(defaultPlan || "month");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderNetwork, setSenderNetwork] = useState<PayNetwork>("vodacom");
  const [screenshot, setScreenshot] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/payments/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  function amount() {
    if (contentPrice && contentPrice > 0) return contentPrice;
    if (!settings) return 0;
    if (plan === "week") return settings.priceWeek;
    if (plan === "month") return settings.priceMonth;
    if (plan === "year") return settings.priceYear;
    return settings.priceOnce;
  }

  async function onFile(file: File | null) {
    if (!file) return;
    if (file.size > 1_400_000) {
      setError("Picha max 1.2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: contentId || null,
          plan,
          senderPhone,
          senderNetwork,
          screenshotUrl: screenshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana");
      } else {
        setMsg(data.message || "Ombi limetumwa ✓");
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/70 p-3">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white">Lipia ili uendelee</h3>
            {contentTitle && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{contentTitle}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {settings && (
            <div className="rounded-xl bg-violet-950/40 border border-violet-800/40 p-3 text-sm">
              <p className="text-slate-300">Tuma TZS <b className="text-white">{amount().toLocaleString()}</b></p>
              <p className="mt-1 text-violet-200 font-mono text-lg tracking-wide">
                {settings.payPhone}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Mtandao: {networkLabel(settings.payNetwork)}
              </p>
              {settings.instructions && (
                <p className="text-xs text-slate-500 mt-2">{settings.instructions}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400">Kifurushi</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`px-2 py-2 rounded-lg text-xs border ${
                    plan === p
                      ? "border-violet-500 bg-violet-950 text-violet-200"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {planLabel(p)}
                  {settings && (
                    <span className="block text-[10px] opacity-80">
                      {(p === "week"
                        ? settings.priceWeek
                        : p === "month"
                          ? settings.priceMonth
                          : p === "year"
                            ? settings.priceYear
                            : settings.priceOnce
                      ).toLocaleString()} TZS
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

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
              <img src={screenshot} alt="proof" className="mt-2 max-h-32 rounded-lg border border-slate-700" />
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
    </div>
  );
}
