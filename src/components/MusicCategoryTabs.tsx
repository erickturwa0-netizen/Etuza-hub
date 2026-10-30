"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Music } from "lucide-react";

type Song = {
  id: string;
  title: string;
  cover_url?: string | null;
  category?: string | null;
  link_url?: string | null;
};

function bucket(cat: string | null | undefined): "dini" | "2026" | "bongo" | "other" {
  const c = (cat || "").toLowerCase();
  if (/dini|gospel|worship|injili|christian|yesu|praise|choir|religious/.test(c))
    return "dini";
  if (/2026/.test(c)) return "2026";
  if (/bongo|singeli|wasafi|tanzania|afrobeats|amapiano/.test(c)) return "bongo";
  return "other";
}

export default function MusicCategoryTabs({ songs }: { songs: Song[] }) {
  const [tab, setTab] = useState<"all" | "bongo" | "dini" | "2026">("all");

  const counts = useMemo(() => {
    let bongo = 0,
      dini = 0,
      y2026 = 0;
    for (const s of songs) {
      const b = bucket(s.category);
      if (b === "dini") dini++;
      else if (b === "2026") y2026++;
      else if (b === "bongo") bongo++;
      // also count 2026 substring in any
      if (/2026/.test(s.category || "") || /2026/.test(s.title || "")) y2026++;
    }
    return { bongo, dini, y2026: Math.min(y2026, songs.length) };
  }, [songs]);

  const filtered = useMemo(() => {
    if (tab === "all") return songs;
    return songs.filter((s) => {
      const b = bucket(s.category);
      if (tab === "dini") return b === "dini";
      if (tab === "2026")
        return b === "2026" || /2026/.test(s.category || "") || /2026/.test(s.title || "");
      if (tab === "bongo") return b === "bongo" || b === "other";
      return true;
    });
  }, [songs, tab]);

  const tabs: { id: typeof tab; label: string; count?: number }[] = [
    { id: "all", label: "Zote", count: songs.length },
    { id: "bongo", label: "Bongo", count: counts.bongo || undefined },
    { id: "dini", label: "Dini", count: counts.dini || undefined },
    { id: "2026", label: "2026", count: counts.y2026 || undefined },
  ];

  return (
    <>
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              tab === t.id
                ? "bg-violet-600/30 border-violet-500 text-violet-200"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            {t.label}
            {typeof t.count === "number" ? ` · ${t.count}` : ""}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/watch/${c.id}`}
            className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:scale-[0.98] transition"
          >
            <div className="relative w-full aspect-square bg-violet-950">
              {c.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.cover_url}
                  alt={c.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music className="w-12 h-12 text-white/25" />
                </div>
              )}
            </div>
            <div className="p-2.5 sm:p-3">
              <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                {c.title}
              </p>
              {c.category && (
                <p className="text-[11px] text-violet-300/80 mt-1 uppercase tracking-wide truncate">
                  {c.category}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 mt-4">
          Hakuna nyimbo kwenye category hii.
        </p>
      )}
    </>
  );
}
