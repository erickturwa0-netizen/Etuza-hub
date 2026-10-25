"use client";

import { useEffect, useState } from "react";
import { Save, Check, X } from "lucide-react";
import { NETWORKS, planLabel, networkLabel } from "@/lib/payments";

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

export default function AdminPaymentsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pending, setPending] = useState<Req[]>([]);
  const [recent, setRecent] = useState<Req[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/payments", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setSettings(data.settings);
    setPending(data.pending || []);
    setRecent(data.recent || []);
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
      body: JSON.stringify(settings),
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
    if (res.ok) await load();
    else {
      const d = await res.json();
      setError(d.error || "Failed");
    }
  }

  if (!settings) {
    return <p className="text-slate-500 text-sm">Inapakia…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Malipo</h1>
        <p className="text-sm text-slate-500 mt-1">
          Washa/zima malipo, namba ya kupokea, bei za vifurushi, idhinisha malipo
        </p>
      </div>

      {msg && (
        <div className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">{msg}</div>
      )}
      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
      )}

      <section className="glass-card p-5 space-y-4 max-w-xl">
        <label className="flex items-center justify-between gap-3">
          <span className="font-semibold text-sm">Washa malipo (paywall)</span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="w-5 h-5"
          />
        </label>

        <div>
          <label className="text-xs text-slate-400">Namba ya kupokea pesa</label>
          <input
            value={settings.payPhone}
            onChange={(e) => setSettings({ ...settings, payPhone: e.target.value })}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            placeholder="07xxxxxxxx"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">Mtandao wa namba hiyo</label>
          <select
            value={settings.payNetwork}
            onChange={(e) => setSettings({ ...settings, payNetwork: e.target.value })}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {networkLabel(n)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["priceOnce", "Bei moja kwa moja (TZS)"],
              ["priceWeek", "Bei wiki (TZS)"],
              ["priceMonth", "Bei mwezi (TZS)"],
              ["priceYear", "Bei mwaka (TZS)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-slate-400">{label}</label>
              <input
                type="number"
                value={settings[key]}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    [key]: Number(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-slate-400">Maelekezo kwa user</label>
          <textarea
            value={settings.instructions || ""}
            onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
            rows={2}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          <Save className="w-4 h-4" />
          {saving ? "…" : "Hifadhi mipangilio"}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">
          Yanayosubiri ({pending.length})
        </h2>
        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-slate-500">Hakuna ombi linalosubiri</p>
          )}
          {pending.map((r) => (
            <div key={r.id} className="glass-card p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-semibold text-white">
                    {r.user.fullName || r.user.email}
                  </p>
                  <p className="text-xs text-slate-500">{r.user.email}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{planLabel(r.plan)} · {r.amount.toLocaleString()} TZS</p>
                  <p>
                    {r.senderPhone} ({networkLabel(r.senderNetwork)})
                  </p>
                  {r.content && <p>{r.content.type}: {r.content.title}</p>}
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.screenshotUrl}
                alt="proof"
                className="max-h-48 rounded-lg border border-slate-700"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => review(r.id, "approve")}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5" /> Idhinisha
                </button>
                <button
                  type="button"
                  onClick={() => review(r.id, "reject")}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600/80 text-white text-xs font-semibold"
                >
                  <X className="w-3.5 h-3.5" /> Kataa
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Za hivi karibuni</h2>
          <ul className="text-sm text-slate-400 space-y-1">
            {recent.map((r) => (
              <li key={r.id}>
                {r.status} · {r.user.email} · {planLabel(r.plan)} ·{" "}
                {r.amount.toLocaleString()} TZS
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
