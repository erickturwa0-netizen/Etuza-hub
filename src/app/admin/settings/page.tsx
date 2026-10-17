"use client";

import { useEffect, useState } from "react";
import { Save, Link2, Film, Tv, Radio, Gamepad2, Shield } from "lucide-react";

type Source = {
  id: string;
  category: string;
  name: string;
  url: string;
  enabled: boolean;
  notes: string | null;
};

const ICONS: Record<string, typeof Film> = {
  movie: Film,
  tv: Tv,
  radio: Radio,
  game: Gamepad2,
  vpn: Shield,
};

const LABELS: Record<string, string> = {
  movie: "Movies",
  tv: "TV",
  radio: "Radio",
  game: "Games",
  vpn: "VPN",
};

export default function AdminSettingsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/api-sources", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      setSources(data.sources || []);
    } catch {
      setError("Tatizo la mtandao");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function update(category: string, patch: Partial<Source>) {
    setSources((prev) =>
      prev.map((s) => (s.category === category ? { ...s, ...patch } : s))
    );
  }

  async function save() {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/api-sources", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: sources.map((s) => ({
            category: s.category,
            name: s.name,
            url: s.url,
            enabled: s.enabled,
            notes: s.notes,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana kuhifadhi");
      } else {
        setMsg("Imehifadhiwa ✓");
        if (data.sources?.length) {
          // merge returned
          setSources((prev) =>
            prev.map((p) => data.sources.find((x: Source) => x.category === p.category) || p)
          );
        }
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Public API (bila key / id) kwa kila kipengele
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Inahifadhi…" : "Hifadhi APIs"}
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {msg}
        </div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="glass-card p-5 mb-6 max-w-2xl">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-violet-400" />
          Public API Sources
        </h2>
        <p className="text-sm text-slate-500">
          Weka URL za API za <strong className="text-slate-400">umma</strong> (zisizohitaji API key).
          Mfano radio-browser, au catalog yako ya JSON. Epuka APIs za piracy.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {sources.map((s) => {
            const Icon = ICONS[s.category] || Link2;
            return (
              <div key={s.category} className="glass-card p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-violet-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {LABELS[s.category] || s.category}
                      </p>
                      <p className="text-[11px] text-slate-500">{s.category}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => update(s.category, { enabled: e.target.checked })}
                      className="rounded"
                    />
                    Enabled
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Jina</label>
                  <input
                    value={s.name}
                    onChange={(e) => update(s.category, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Public API URL</label>
                  <input
                    value={s.url}
                    onChange={(e) => update(s.category, { url: e.target.value })}
                    placeholder="https://….json au endpoint bila key"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Notes</label>
                  <input
                    value={s.notes || ""}
                    onChange={(e) => update(s.category, { notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 glass-card p-5 max-w-2xl text-sm text-slate-500 space-y-2">
        <p className="font-medium text-slate-300">Mifano halali (bila key)</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Radio TZ:{" "}
            <code className="text-xs text-violet-300 break-all">
              https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/TZ?hidebroken=true&limit=50
            </code>
          </li>
          <li>Archive search – tumia catalog iliyopo kwenye Movies tabs</li>
          <li>JSON yako mwenyewe: array ya objects yenye title + url</li>
        </ul>
      </div>
    </div>
  );
}
