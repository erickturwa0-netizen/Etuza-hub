"use client";

import { useEffect, useState } from "react";
import { Radio, Search, X } from "lucide-react";
import PresenceTracker from "@/components/PresenceTracker";
import AudioPlayer from "@/components/AudioPlayer";
import { radioCover } from "@/lib/covers";

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
  const [source, setSource] = useState("");

  async function load(kind: "TZ" | "TOP" | "SEARCH", query?: string) {
    setLoading(true);
    setError("");
    try {
      let path = "/api/radio/stations?country=TZ&limit=60";
      if (kind === "TOP") path = "/api/radio/stations?country=TOP&limit=60";
      if (kind === "SEARCH" && query) {
        path = `/api/radio/stations?q=${encodeURIComponent(query)}&limit=40`;
      }
      const res = await fetch(path, { cache: "no-store" });
      const data = await res.json();
      const list = (data.stations || []) as Station[];
      setStations(list);
      setSource(data.source || "");
      if (!list.length) setError("Hakuna stations zilizopatikana");
    } catch {
      setError("Imeshindwa kupakia radio");
      setStations([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load("TZ");
  }, []);

  function coverOf(s: Station) {
    return radioCover(s.name, s.favicon);
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-4 py-8 pb-36">
      <PresenceTracker section="radio" title={playing?.name || "Radio"} />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-pink-900/40">
          <Radio className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Radio</h1>
          <p className="text-sm text-slate-400">
            Live stations{source ? ` · ${source}` : ""}
          </p>
        </div>
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
                ? "bg-pink-600/20 border-pink-500/40 text-pink-200"
                : "border-slate-700 text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "SEARCH" && (
        <form
          className="flex gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            load("SEARCH", q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta station…"
            className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-pink-600 text-white"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-amber-300 mb-3">{error}</p>
      )}

      {/* Full player */}
      {playing && (
        <div className="mb-6 sticky top-2 z-20">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPlaying(null)}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300"
              aria-label="Funga"
            >
              <X className="w-4 h-4" />
            </button>
            <AudioPlayer
              src={playing.url}
              title={playing.name}
              coverUrl={coverOf(playing)}
              kind="radio"
            />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia stations…</p>
      ) : stations.length === 0 ? (
        <p className="text-slate-500 text-sm">Hakuna stations.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stations.map((s) => {
            const cover = coverOf(s);
            const active = playing?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setPlaying(s)}
                className={`text-left rounded-2xl border p-3.5 flex items-center gap-3 transition ${
                  active
                    ? "border-pink-500/60 bg-pink-950/40"
                    : "border-slate-700 bg-slate-900 active:border-pink-500/40"
                }`}
              >
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-slate-700 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      if (!el.dataset.fallback) {
                        el.dataset.fallback = "1";
                        el.src = radioCover(s.name, null);
                      }
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px] text-white truncate">
                    {s.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {s.country}
                    {s.bitrate ? ` · ${s.bitrate}kbps` : ""}
                    {active ? " · Inacheza" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
