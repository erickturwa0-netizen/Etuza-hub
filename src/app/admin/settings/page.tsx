"use client";

import { useEffect, useState, useRef } from "react";
import { Sparkles, Save, Trash2, Download, Activity } from "lucide-react";

type ApiSource = {
  id: string;
  category: string;
  name: string;
  url: string;
  urlSet?: boolean;
  enabled: boolean;
  notes?: string | null;
};

const LABELS: Record<string, string> = {
  movie: "Movies",
  drama: "Tamthilia",
  tv: "TV",
  radio: "Radio",
  music: "Miziki",
  game: "Games",
  vpn: "VPN",
  ai: "AI",
  other: "Other",
};

function previewType(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("/ai/") || u.includes("wormgpt") || u.includes("sonu") || u.includes("horde") || u.includes("nicevoice") || u.includes("wan-"))
    return "ai";
  if (u.includes("music") || u.includes("itunes") || u.includes("shazam"))
    return "music";
  if (u.includes("movie") || u.includes("tmdb") || u.includes("vidsrc") || u.includes("eliteplex"))
    return "movie";
  if (u.includes("series") || u.includes("drama") || u.includes("anime") || u.includes("crunchy"))
    return "drama";
  if (u.includes("radio")) return "radio";
  if (u.includes("tv") || u.includes("iptv") || u.includes("channel")) return "tv";
  if (u.includes("game")) return "game";
  return "other";
}

export default function AdminSettingsPage() {
  const [sources, setSources] = useState<ApiSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newSample, setNewSample] = useState("");
  const [newName, setNewName] = useState("");
  const [probeMsg, setProbeMsg] = useState("");
  const [probing, setProbing] = useState(false);
  const probeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preview = previewType(newUrl);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-sources", { credentials: "include" });
      const data = await res.json();
      setSources(data.sources || []);
    } catch {
      setError("Imeshindwa kupakia API sources");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Auto-probe API when URL is pasted
  useEffect(() => {
    const url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      setProbeMsg("");
      return;
    }
    if (probeRef.current) clearTimeout(probeRef.current);
    probeRef.current = setTimeout(async () => {
      setProbing(true);
      setProbeMsg("Inajaribu API…");
      try {
        const res = await fetch(
          `/api/admin/api-probe?url=${encodeURIComponent(url)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.sample) setNewSample(data.sample);
        setProbeMsg(
          data.message ||
            (data.alive ? `Hai ✓ ${data.status}` : `Dead ✗ ${data.status || 0}`)
        );
      } catch (e) {
        setProbeMsg(
          e instanceof Error ? `Dead — ${e.message}` : "Dead — network error"
        );
      }
      setProbing(false);
    }, 800);
    return () => {
      if (probeRef.current) clearTimeout(probeRef.current);
    };
  }, [newUrl]);

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
      setProbeMsg("");
      setMsg(
        added
          ? `Imeongezwa kama: ${LABELS[added.category] || added.category}`
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
      const res = await fetch("/api/admin/import-all", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      setMsg(data.message || JSON.stringify(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
    setSaving(false);
  }

  async function probeNow() {
    const url = newUrl.trim();
    if (!url) return;
    setProbing(true);
    try {
      const res = await fetch(
        `/api/admin/api-probe?url=${encodeURIComponent(url)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.sample) setNewSample(data.sample);
      setProbeMsg(data.message || "");
    } catch (e) {
      setProbeMsg(e instanceof Error ? e.message : "Probe failed");
    }
    setProbing(false);
  }

  return (
    <div className="space-y-5 max-w-2xl pb-24">
      <h1 className="text-2xl font-bold text-white">Settings · API Sources</h1>

      {msg && (
        <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
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
          <Sparkles className="w-4 h-4" /> Ongeza API
        </p>

        <label className="text-xs text-slate-400 space-y-1 block">
          <span>1. API URL</span>
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://api.omegatech.app/api/..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white font-mono"
          />
        </label>

        {newUrl.trim() && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-cyan-300">
              Aina: <strong>{LABELS[preview] || preview}</strong>
            </span>
            <button
              type="button"
              onClick={probeNow}
              disabled={probing}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-200"
            >
              <Activity className="w-3 h-3" />
              {probing ? "…" : "Jaribu sasa"}
            </button>
            {probeMsg && (
              <span
                className={
                  probeMsg.includes("Hai") || probeMsg.includes("hai")
                    ? "text-emerald-400"
                    : "text-amber-300"
                }
              >
                {probeMsg}
              </span>
            )}
          </div>
        )}

        <label className="text-xs text-slate-400 space-y-1 block">
          <span>2. Jibu la API (auto kutoka URL — unaweza kuhariri)</span>
          <textarea
            value={newSample}
            onChange={(e) => setNewSample(e.target.value)}
            rows={10}
            placeholder="Bandika URL hapo juu — jibu litaonekana hapa kiotomatiki…"
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs text-slate-200 font-mono leading-relaxed"
          />
        </label>

        <label className="text-xs text-slate-400 space-y-1 block">
          <span>Jina (si lazima)</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Mfano: Omegatech Sonu3"
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white"
          />
        </label>

        <button
          type="button"
          onClick={addSource}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold"
        >
          {saving ? "…" : "Ongeza API"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm"
        >
          <Save className="w-4 h-4" /> Hifadhi zote
        </button>
        <button
          type="button"
          onClick={importAll}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-700 text-white text-sm"
        >
          <Download className="w-4 h-4" /> Import all
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Inapakia…</p>
      ) : (
        <div className="space-y-2">
          {sources.map((s) => {
            const hasSample = !!(s.notes && s.notes.length > 20);
            return (
              <div
                key={s.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-white font-medium">{s.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {LABELS[s.category] || s.category}
                      {s.urlSet ? " · URL ✓" : " · URL hapana"}
                      {hasSample ? " · sample ✓" : ""}
                      {s.enabled ? " · ON" : " · OFF"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="p-2 rounded-lg text-red-300 hover:bg-red-500/10"
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
    </div>
  );
}
