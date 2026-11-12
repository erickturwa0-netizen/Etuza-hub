"use client";

import { useEffect, useState } from "react";
import {
  Film,
  Tv,
  Radio,
  Gamepad2,
  Shield,
  Music,
  Settings,
  Clapperboard,
  Bot,
  Plus,
  Trash2,
  Save,
} from "lucide-react";

type Source = {
  id: string;
  category: string;
  name: string;
  url: string;
  urlSet?: boolean;
  enabled: boolean;
  notes?: string | null;
};

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "drama", label: "Tamthilia / Drama" },
  { value: "tv", label: "TV / Live" },
  { value: "radio", label: "Radio" },
  { value: "music", label: "Music" },
  { value: "game", label: "Game" },
  { value: "vpn", label: "VPN" },
  { value: "ai", label: "AI" },
  { value: "other", label: "Other" },
];

const ICONS: Record<string, typeof Film> = {
  movie: Film,
  drama: Clapperboard,
  tv: Tv,
  radio: Radio,
  music: Music,
  game: Gamepad2,
  vpn: Shield,
  ai: Bot,
  other: Settings,
};

const LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
);

export default function AdminSettingsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [newCat, setNewCat] = useState("movie");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/api-sources", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSources(data.sources || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function update(id: string, patch: Partial<Source>) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function saveAll() {
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
            id: s.id,
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  }

  async function addSource() {
    if (!newName.trim()) {
      setError("Andika jina la API");
      return;
    }
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/api-sources", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCat,
          name: newName.trim(),
          url: newUrl.trim(),
          notes: newNotes.trim() || null,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNewName("");
      setNewUrl("");
      setNewNotes("");
      setMsg("API mpya imeongezwa");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Futa API hii?")) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/api-sources?id=${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setMsg("Imefutwa");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
    setSaving(false);
  }

  async function importAll() {
    setSaving(true);
    setMsg("");
    try {
      await fetch("/api/admin/api-sources", { credentials: "include" });
      const res = await fetch("/api/admin/import-all", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setMsg(data.message || "Import imekamilika");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold text-white">Settings · API Sources</h1>
        <p className="text-sm text-slate-400 mt-1">
          Chagua <strong>aina</strong> (movie, tamthilia, TV, AI…) kisha weka URL ya API
        </p>
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

      <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4 space-y-3">
        <p className="text-sm font-semibold text-violet-200 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ongeza API mpya
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-400 space-y-1">
            <span>Aina ya API</span>
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Jina</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Mfano: Omegatech Movies"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <label className="text-xs text-slate-400 space-y-1 block">
          <span>API URL</span>
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white font-mono"
          />
        </label>
        <label className="text-xs text-slate-400 space-y-1 block">
          <span>Notes (si lazima)</span>
          <input
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Maelezo mafupi"
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void addSource()}
          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Ongeza
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : (
        <div className="space-y-3">
          {sources.map((s) => {
            const Icon = ICONS[s.category] || Settings;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <Icon className="w-5 h-5 text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input
                      value={s.name}
                      onChange={(e) => update(s.id, { name: e.target.value })}
                      className="w-full bg-transparent font-semibold text-white text-sm border-b border-transparent focus:border-slate-600 outline-none"
                    />
                  </div>
                  <select
                    value={s.category}
                    onChange={(e) => update(s.id, { category: e.target.value })}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-slate-200"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => update(s.id, { enabled: e.target.checked })}
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() => void remove(s.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                    title="Futa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <label className="text-xs text-slate-500 space-y-1 block">
                  <span>
                    API URL{" "}
                    {s.urlSet ? (
                      <span className="text-emerald-500">(imewekwa)</span>
                    ) : (
                      <span className="text-amber-500">(bado)</span>
                    )}
                  </span>
                  <input
                    value={s.url}
                    onChange={(e) => update(s.id, { url: e.target.value })}
                    placeholder="Weka URL mpya au acha masked ***"
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-300 font-mono"
                  />
                </label>
                <p className="text-[10px] text-slate-600">
                  Aina: {LABELS[s.category] || s.category}
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
          onClick={() => void saveAll()}
          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Hifadhi mabadiliko
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void importAll()}
          className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm disabled:opacity-50"
        >
          Import all
        </button>
      </div>
    </div>
  );
}
