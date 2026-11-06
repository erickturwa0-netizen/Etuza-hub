"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Film,
  Tv,
  Radio,
  Gamepad2,
  Shield,
  Music,
  Clapperboard,
} from "lucide-react";

type Source = {
  category: string;
  name: string;
  url: string;
  enabled: boolean;
  notes?: string | null;
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
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/api-sources", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSources(data.sources || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
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
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Imehifadhiwa");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setSaving(false);
  }

  async function importAll() {
    setImporting(true);
    setMsg("");
    try {
      await fetch("/api/admin/api-sources", { credentials: "include" });
      const res = await fetch("/api/admin/import-all", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setMsg("Import imekamilika");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-violet-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-slate-500">
            API sources · URL zimefichwa kwa usalama
          </p>
        </div>
      </div>

      {msg && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => {
            const Icon = ICONS[s.category] || Settings;
            return (
              <div
                key={s.category}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-violet-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {LABELS[s.category] || s.category}
                    </p>
                    <p className="text-[11px] text-slate-500">{s.name}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) =>
                        update(s.category, { enabled: e.target.checked })
                      }
                    />
                    Enabled
                  </label>
                </div>
                <p className="text-xs text-slate-500 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
                  API URL / endpoints zimefichwa · hazionekani kwenye panel
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          Hifadhi
        </button>
        <button
          type="button"
          disabled={importing}
          onClick={() => void importAll()}
          className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm disabled:opacity-50"
        >
          Import all
        </button>
      </div>
    </div>
  );
}
