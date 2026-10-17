"use client";

import { useEffect, useState } from "react";
import { Radio, Search } from "lucide-react";

type Station = {
  id: string;
  name: string;
  url: string;
  favicon: string | null;
  tags: string;
  country: string;
  bitrate: number;
};

export default function RadioPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [tab, setTab] = useState<"TZ" | "TOP" | "SEARCH">("TZ");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<Station | null>(null);
  const [error, setError] = useState("");

  async function load(kind: "TZ" | "TOP" | "SEARCH", query?: string) {
    setLoading(true);
    setError("");
    try {
      let path = "/api/radio/stations?country=TZ&limit=60";
      if (kind === "TOP") path = "/api/radio/stations?country=TOP&limit=60";
      if (kind === "SEARCH" && query) {
        path = `/api/radio/stations?q=${encodeURIComponent(query)}&limit=40`;
      }
      const res = await fetch(path);
      const data = await res.json();
      setStations(data.stations || []);
      if (data.error) setError(data.error);
    } catch {
      setError("Imeshindwa kupakia radio");
    }
    setLoading(false);
  }

  useEffect(() => {
    load("TZ");
  }, []);

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 py-8 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="w-6 h-6 text-pink-400" />
          Radio
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Live stations · Radio Browser API (Tanzania + world)
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            { id: "TZ" as const, label: "Tanzania" },
            { id: "TOP" as const, label: "Top world" },
            { id: "SEARCH" as const, label: "Search" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              if (t.id !== "SEARCH") load(t.id);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              tab === t.id
                ? "bg-pink-600/20 border-pink-500/40 text-pink-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "SEARCH" && (
        <div className="flex gap-2 mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load("SEARCH", q)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            placeholder="BBC, Clouds, Capital…"
          />
          <button
            type="button"
            onClick={() => load("SEARCH", q)}
            className="px-3 py-2 rounded-xl bg-slate-800"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      {playing && (
        <div className="glass-card p-4 mb-4 sticky top-2 z-20">
          <p className="text-sm font-semibold mb-2">Now playing: {playing.name}</p>
          <audio
            key={playing.id}
            controls
            autoPlay
            className="w-full"
            src={playing.url}
          />
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia stations…</p>
      ) : stations.length === 0 ? (
        <p className="text-slate-500 text-sm">Hakuna stations.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {stations.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPlaying(s)}
              className={`text-left glass-card p-3 flex items-center gap-3 hover:border-pink-500/30 ${
                playing?.id === s.id ? "border-pink-500/50" : ""
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-pink-950 flex items-center justify-center overflow-hidden shrink-0">
                {s.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.favicon} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Radio className="w-5 h-5 text-pink-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{s.name}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {s.country} {s.bitrate ? `· ${s.bitrate}kbps` : ""}{" "}
                  {s.tags ? `· ${s.tags.split(",").slice(0, 2).join(", ")}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
