"use client";

import { useEffect, useState } from "react";
import {
  Save,
  Link2,
  Film,
  Tv,
  Radio,
  Gamepad2,
  Shield,
  Music,
  Clapperboard,
} from "lucide-react";

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
  music: Music,
  drama: Clapperboard,
};

const LABELS: Record<string, string> = {
  movie: "Movies",
  tv: "TV",
  drama: "Tamthilia",
  music: "Miziki",
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
      if (!res.ok) setError(data.error || "Failed");
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
      if (!res.ok) setError(data.error || "Imeshindikana");
      else setMsg("Imehifadhiwa ✓");
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
          <p className="text-sm text-slate-500 mt-1">Public API kwa kila kipengele</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "…" : "Hifadhi APIs"}
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">{msg}</div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {sources.map((s) => {
            const Icon = ICONS[s.category] || Link2;
            return (
              <div key={s.category} className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-violet-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="font-semibold text-sm">{LABELS[s.category] || s.category}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => update(s.category, { enabled: e.target.checked })}
                    />
                    On
                  </label>
                </div>
                <input
                  value={s.name}
                  onChange={(e) => update(s.category, { name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
                  placeholder="Jina"
                />
                <input
                  value={s.url}
                  onChange={(e) => update(s.category, { url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono"
                  placeholder="https://public-api…"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
