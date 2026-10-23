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
  Download,
  Info,
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

/** Reference endpoints (sniffed) shown under each section */
const SECTION_HINTS: Record<string, string[]> = {
  movie: [
    "TMDB: api.themoviedb.org/3 (key from Movian APK)",
    "ElitePlex: eliteplex-api.vercel.app/api/movies",
    "Sync Movies button on Dashboard pulls Popular + Top Rated + Trending",
  ],
  tv: [
    "EasyAPI: easyapi.sh/live-tv/api/v1/channel-visibility",
    "Proxy: easyapi.sh/proxy.json",
    "Sports: popflix.dev/live-tv/api/v1/sports/events",
    "Free streams: pinned m3u8 + IPTV-org",
  ],
  drama: ["ElitePlex Series: eliteplex-api.vercel.app/api/series"],
  music: ["iTunes Search (Bongo / TZ)"],
  radio: ["Radio Browser (Tanzania)"],
  game: ["FreeToGame API"],
  vpn: ["Manual only"],
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

  async function importAll() {
    setImporting(true);
    setMsg("");
    setError("");
    try {
      await fetch("/api/admin/api-sources", { credentials: "include" });
      const res = await fetch("/api/admin/import-all", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import imeshindikana");
      } else {
        const lines = (data.report || [])
          .map(
            (r: { category: string; count: number; error?: string }) =>
              `${LABELS[r.category] || r.category}: ${r.count}${r.error ? ` (${r.error})` : ""}`
          )
          .join(" · ");
        setMsg(`Import ✓ ${data.total || 0} items — ${lines}`);
        await load();
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setImporting(false);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            API kwa kila sehemu (Movies, TV, Drama…)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={importAll}
            disabled={importing || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {importing ? "Inapakia…" : "Import APIs zote"}
          </button>
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
      </div>

      {msg && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">
          {msg}
        </div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {sources.map((s) => {
            const Icon = ICONS[s.category] || Link2;
            const hints = SECTION_HINTS[s.category] || [];
            return (
              <div key={s.category} className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-violet-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {LABELS[s.category] || s.category}
                      </p>
                      {s.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {s.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) =>
                        update(s.category, { enabled: e.target.checked })
                      }
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
                  placeholder="https://api…"
                />
                {hints.length > 0 && (
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-2">
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                      <Info className="w-3 h-3" /> APIs za sehemu hii
                    </p>
                    <ul className="text-[11px] text-slate-500 space-y-0.5 list-disc list-inside">
                      {hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
