"use client";

import { useEffect, useMemo, useState } from "react";
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
  Sparkles,
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

const LABELS: Record<string, string> = {
  movie: "Movie",
  drama: "Tamthilia / Anime",
  tv: "TV / Live",
  radio: "Radio",
  music: "Music",
  game: "Game",
  vpn: "VPN",
  ai: "AI",
  other: "Other",
};

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

function previewType(url: string): string {
  const u = url.toLowerCase();
  if (/\/ai\/|freeimage|horde|nicevoice|sonu|wrmgpt|wan|mureka/.test(u)) return "ai";
  if (/anime|crunchyroll|gogo|anilist|series|tamthilia/.test(u)) return "drama";
  if (/movie|tmdb|film|cinema|moviebox/.test(u)) return "movie";
  if (/iptv|\.m3u|live-?tv|channel|modobo|epg/.test(u)) return "tv";
  if (/radio|radio-browser/.test(u)) return "radio";
  if (/music|itunes|spotify|track|song|freetouse|ytm/.test(u)) return "music";
  if (/game|freetogame/.test(u)) return "game";
  if (/vpn|v2ray|clash|wireguard/.test(u)) return "vpn";
  return "other";
}

export default function AdminSettingsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [newUrl, setNewUrl] = useState("");
  const [newSample, setNewSample] = useState("");
  const [newName, setNewName] = useState("");

  const preview = useMemo(() => previewType(newUrl), [newUrl]);

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
    const url = newUrl.trim();
    if (!url) {
      setError("Weka API URL");
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
          url,
          name: newName.trim() || undefined,
          notes: newSample.trim() || null,
          autoDetect: true,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const added = Array.isArray(data.sources) ? data.sources[0] : null;
      setNewUrl("");
      setNewSample("");
      setNewName("");
      setMsg(
        added
          ? `Imeongezwa kama: ${LABELS[added.category] || added.category} — URL + sample zimehifadhiwa`
          : "API imeongezwa"
      );
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
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
          Weka <strong>URL</strong> na <strong>jibu/code</strong> la API (JSON). Mfumo
          hugundua aina (AI / movie / TV…) na data inaenda sehemu sahihi. Movie, music,
          radio zilizopo <strong>hazifutwi</strong>.
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
          <Sparkles className="w-4 h-4" /> Ongeza API (URL + code/jibu)
        </p>

        <label className="text-xs text-slate-400 space-y-1 block">
          <span>1. API URL</span>
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://api.omegatech.app/api/ai/sonu3?action=generate&prompt=Sad+song"
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white font-mono"
          />
        </label>

        {newUrl.trim() && (
          <p className="text-xs text-cyan-300/90">
            Itatambuliwa kama: <strong>{LABELS[preview] || preview}</strong>
            {preview === "ai"
              ? " → AI Agent / tools"
              : preview === "music"
                ? " → Miziki"
                : preview === "movie"
                  ? " → Movies"
                  : " → sehemu inayofaa"}
          </p>
        )}

        <label className="text-xs text-slate-400 space-y-1 block">
          <span>2. Jibu / code la API (bandika JSON chini ya URL)</span>
          <textarea
            value={newSample}
            onChange={(e) => setNewSample(e.target.value)}
            rows={10}
            placeholder={`Status: 200\n{\n  "statusCode": 200,\n  "success": true,\n  "taskId": "...",\n  "status": "pending",\n  "message": "Poll ?action=result&taskId=..."\n}`}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs text-slate-200 font-mono leading-relaxed"
          />
          <span className="text-[10px] text-slate-500">
            Mfano: taskId, pending, poll action=result — ili mfumo ujue jinsi ya kusoma jibu
          </span>
        </label>

        <label className="text-xs text-slate-400 space-y-1 block">
          <span>Jina (si lazima)</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Mfano: Omegatech Sonu3 Music"
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
          />
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={() => void addSource()}
          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Ongeza API
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            APIs zilizosajiliwa ({sources.length})
          </p>
          {sources.map((s) => {
            const Icon = ICONS[s.category] || Settings;
            const hasSample = Boolean(s.notes && s.notes.length > 20);
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <Icon className="w-5 h-5 text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {LABELS[s.category] || s.category}
                      {s.urlSet ? " · URL ✓" : " · URL hapana"}
                      {hasSample ? " · sample ✓" : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => update(s.id, { enabled: e.target.checked })}
                    />
                    On
                  </label>
                  <button
                    type="button"
                    onClick={() => void remove(s.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 font-mono truncate">
                  {s.url || "(masked)"}
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
          <Save className="w-4 h-4" /> Hifadhi
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
