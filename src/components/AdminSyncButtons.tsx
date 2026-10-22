"use client";

import { useState } from "react";
import { RefreshCw, Film, Clapperboard, Layers } from "lucide-react";

export default function AdminSyncButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function runSync(scope: "movies" | "drama" | "all") {
    setLoading(scope);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sync imeshindikana");
      } else {
        if (scope === "movies") {
          setMsg(
            `Movies ✓ +${data.added ?? data.moviesAdded ?? 0} mpya (jumla ${data.total ?? data.moviesTotal ?? "?"})`
          );
        } else if (scope === "drama") {
          setMsg(
            `Drama ✓ +${data.added ?? data.dramaAdded ?? 0} mpya (jumla ${data.total ?? data.dramaTotal ?? "?"})`
          );
        } else {
          setMsg(
            `All ✓ Movies +${data.moviesAdded ?? 0}, Drama +${data.dramaAdded ?? 0}, TV live ${data.tvLive ?? 0}`
          );
        }
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setLoading(null);
  }

  return (
    <div className="glass-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-5 h-5 text-violet-400" />
        <h2 className="font-semibold">Sync Content (TMDB + Elite)</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Bonyeza ili kuvuta movies mpya kutoka TMDB (Popular, Top Rated, Trending)
        na ElitePlex. Inaweza kuchukua sekunde 30–60.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runSync("movies")}
          disabled={!!loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-60 transition"
        >
          <Film className="w-4 h-4" />
          {loading === "movies" ? "Inapakia Movies…" : "Sync Movies"}
        </button>

        <button
          type="button"
          onClick={() => runSync("drama")}
          disabled={!!loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold disabled:opacity-60 transition"
        >
          <Clapperboard className="w-4 h-4" />
          {loading === "drama" ? "Inapakia Drama…" : "Sync Drama"}
        </button>

        <button
          type="button"
          onClick={() => runSync("all")}
          disabled={!!loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-60 transition"
        >
          <Layers className="w-4 h-4" />
          {loading === "all" ? "Inapakia All…" : "Sync All"}
        </button>
      </div>

      {msg && (
        <div className="mt-4 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">
          {msg}
        </div>
      )}
      {error && (
        <div className="mt-4 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
