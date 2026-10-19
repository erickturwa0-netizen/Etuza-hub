"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Tv, Search, Loader2 } from "lucide-react";

type Channel = {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
};

export default function TvPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [source, setSource] = useState<"ea" | "full">("ea");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      limit: source === "full" ? "200" : "150",
      source,
    });
    if (q.trim()) params.set("q", q.trim());
    if (group) params.set("group", group);

    fetch(`/api/tv/channels?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setChannels(d.channels || []);
        setTotal(d.total || 0);
        if (d.error) setError(d.error);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Tatizo la mtandao");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [q, group, source]);

  const groups = useMemo(() => {
    const s = new Set(channels.map((c) => c.group).filter(Boolean));
    return Array.from(s).sort();
  }, [channels]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tv className="w-6 h-6 text-red-400" />
          TV Channels
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          IPTV-org · {total} channels · {" "}
          <span className="text-slate-600">index.m3u</span>
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta channel…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
        </div>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as "ea" | "full")}
          className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
        >
          <option value="ea">East Africa + Highlights</option>
          <option value="full">Full index.m3u</option>
        </select>
      </div>

      {groups.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            type="button"
            onClick={() => setGroup("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              !group
                ? "bg-red-600/20 border-red-500/40 text-red-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            Zote
          </button>
          {groups.slice(0, 12).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g === group ? "" : g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                group === g
                  ? "bg-red-600/20 border-red-500/40 text-red-300"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-amber-400 mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Inapakia channels…
        </div>
      ) : channels.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Hakuna channel</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {channels.map((c) => (
            <Link
              key={c.id + c.url}
              href={`/watch/live?url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.title)}`}
              className="block rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-red-500/40 transition"
            >
              <div
                className="aspect-video flex items-center justify-center bg-slate-950"
                style={{
                  background: c.logo
                    ? undefined
                    : "linear-gradient(135deg,#7f1d1d,#1e1b4b)",
                }}
              >
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.logo}
                    alt=""
                    className="w-full h-full object-contain p-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Tv className="w-10 h-10 text-white/30" />
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{c.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{c.group}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
