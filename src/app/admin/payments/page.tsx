"use client";

import { useEffect, useState } from "react";
import { Save, Check, X } from "lucide-react";
import {
  NETWORKS,
  CONTENT_TYPES,
  TYPE_LABELS,
  planLabel,
  networkLabel,
  parsePaidCategories,
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
  paidCategories?: string;
  showPackages?: boolean;
};

type Req = {
  id: string;
  plan: string;
  amount: number;
  senderPhone: string;
  senderNetwork: string;
  screenshotUrl: string;
  status: string;
  createdAt: string;
  user: { email: string; fullName: string | null };
  content: { title: string; type: string } | null;
};

const EMPTY_SETTINGS: Settings = {
  enabled: false,
  payPhone: "",
  payNetwork: "vodacom",
  priceWeek: 2000,
  priceMonth: 5000,
  priceYear: 40000,
  priceOnce: 1000,
  instructions: null,
  showPackages: false,
};

export default function AdminPaymentsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [paidSet, setPaidSet] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Req[]>([]);
  const [recent, setRecent] = useState<Req[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/payments", {
        credentials: "include",
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.settings) {
        setError(data.error || "Imeshindwa kupakia malipo");
        setSettings({ ...EMPTY_SETTINGS });
        return;
      }
      setSettings({
        enabled: !!data.settings?.enabled,
        payPhone: data.settings?.payPhone || "",
        payNetwork: data.settings?.payNetwork || "vodacom",
        priceWeek: data.settings?.priceWeek ?? 2000,
        priceMonth: data.settings?.priceMonth ?? 5000,
        priceYear: data.settings?.priceYear ?? 40000,
        priceOnce: data.settings?.priceOnce ?? 1000,
        instructions: data.settings?.instructions ?? null,
        paidCategories: data.settings?.paidCategories,
        showPackages: data.settings?.showPackages === true,
      });
      setPaidSet(new Set(parsePaidCategories(data.settings?.paidCategories)));
      setPending(data.pending || []);
      setRecent(data.recent || []);
      if (data.error) setError(String(data.error));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Timeout / network");
      setSettings({ ...EMPTY_SETTINGS });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/payments", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        showPackages: !!settings.showPackages,
        paidCategories: Array.from(paidSet),
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Imeshindikana");
    else setMsg("Mipangilio imehifadhiwa ✓");
    setSaving(false);
  }

  async function review(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) load();
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        {error ? (
          <div className="space-y-3">
            <p className="text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError("");
                load();
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm"
            >
              Jaribu tena
            </button>
          </div>
        ) : (
          "Inapakia malipo…"
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Malipo</h1>
      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-300 text-sm">{error}</div>
      )}
      {msg && (
        <div className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 text-sm">{msg}</div>
      )}

      <div className="glass-card p-5 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          />
          Washa malipo
        </label>
        <input
          value={settings.payPhone}
          onChange={(e) => setSettings({ ...settings, payPhone: e.target.value })}
          placeholder="Namba ya kupokea"
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
        />
        <select
          value={settings.payNetwork}
          onChange={(e) => setSettings({ ...settings, payNetwork: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
        >
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {networkLabel(n)}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={settings.priceOnce}
            onChange={(e) =>
              setSettings({ ...settings, priceOnce: Number(e.target.value) || 0 })
            }
            placeholder="Bei once"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
          <input
            type="number"
            value={settings.priceWeek}
            onChange={(e) =>
              setSettings({ ...settings, priceWeek: Number(e.target.value) || 0 })
            }
            placeholder="Bei wiki"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
          <input
            type="number"
            value={settings.priceMonth}
            onChange={(e) =>
              setSettings({ ...settings, priceMonth: Number(e.target.value) || 0 })
            }
            placeholder="Bei mwezi"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
          <input
            type="number"
            value={settings.priceYear}
            onChange={(e) =>
              setSettings({ ...settings, priceYear: Number(e.target.value) || 0 })
            }
            placeholder="Bei mwaka"
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((c) => (
            <label key={c} className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                checked={paidSet.has(c)}
                onChange={(e) => {
                  const next = new Set(paidSet);
                  if (e.target.checked) next.add(c);
                  else next.delete(c);
                  setPaidSet(next);
                }}
              />
              {TYPE_LABELS[c] || c}
            </label>
          ))}
        </div>
        <textarea
          value={settings.instructions || ""}
          onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
          rows={3}
          placeholder="Maelekezo ya malipo"
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
        />
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          <Save className="w-4 h-4" />
          {saving ? "…" : "Hifadhi"}
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-white">Pending ({pending.length})</h2>
        {pending.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 flex flex-wrap items-center gap-2 justify-between"
          >
            <div className="text-sm">
              <p className="text-white font-medium">
                {r.user?.fullName || r.user?.email} · {r.amount} TZS
              </p>
              <p className="text-xs text-slate-500">
                {planLabel(r.plan || "once")} · {r.senderPhone}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => review(r.id, "approve")}
                className="p-2 rounded-lg bg-emerald-600/20 text-emerald-300"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => review(r.id, "reject")}
                className="p-2 rounded-lg bg-red-600/20 text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {!pending.length && (
          <p className="text-sm text-slate-500">Hakuna request pending.</p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-white">Recent</h2>
        {recent.slice(0, 15).map((r) => (
          <div key={r.id} className="text-sm text-slate-400 border-b border-slate-800 py-2">
            {r.user?.email} · {r.amount} · {r.status}
          </div>
        ))}
      </div>
    </div>
  );
}
