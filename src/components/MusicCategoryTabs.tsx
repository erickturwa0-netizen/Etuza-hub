"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Music, Video } from "lucide-react";

type Song = {
  id: string;
  title: string;
  cover_url?: string | null;
  category?: string | null;
  link_url?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function bucket(
  cat: string | null | undefined,
  link?: string | null
): "video" | "dini" | "2026" | "bongo" | "free" | "other" {
  const c = (cat || "").toLowerCase();
  const l = (link || "").toLowerCase();
  if (/video/.test(c) || /youtube|youtu\.be|youtube-nocookie/.test(l))
    return "video";
  if (/dini|gospel|worship|injili|christian|yesu|praise|choir|religious/.test(c))
    return "dini";
  if (/2026/.test(c)) return "2026";
  if (/free/.test(c) || /freetouse\.com/.test(l)) return "free";
  if (/bongo|singeli|wasafi|tanzania|afrobeats|amapiano/.test(c)) return "bongo";
  return "other";
}

function isNew(s: Song): boolean {
  const raw = s.updated_at || s.created_at;
  if (!raw) return false;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
}

function sortNewest(a: Song, b: Song): number {
  const ta = Date.parse(a.updated_at || a.created_at || "") || 0;
  const tb = Date.parse(b.updated_at || b.created_at || "") || 0;
  return tb - ta;
}

export default function MusicCategoryTabs({ songs }: { songs: Song[] }) {
  const [tab, setTab] = useState<
    "all" | "bongo" | "dini" | "video" | "2026" | "free"
  >("video");

  const counts = useMemo(() => {
    let bongo = 0,
      dini = 0,
      video = 0,
      y2026 = 0,
      free = 0;
    for (const s of songs) {
      const b = bucket(s.category, s.link_url);
      if (b === "video") video++;
      else if (b === "dini") dini++;
      else if (b === "2026") y2026++;
      else if (b === "free") free++;
      else if (b === "bongo") bongo++;
      if (/2026/.test(s.category || "") || /2026/.test(s.title || "")) y2026++;
    }
    return {
      bongo,
      dini,
      video,
      free,
      y2026: Math.min(y2026, songs.length),
    };
  }, [songs]);

  const filtered = useMemo(() => {
    let list = songs;
    if (tab !== "all") {
      list = songs.filter((s) => {
        const b = bucket(s.category, s.link_url);
        if (tab === "video") return b === "video";
        if (tab === "dini") return b === "dini";
        if (tab === "free") return b === "free";
        if (tab === "2026")
          return (
            b === "2026" ||
            /2026/.test(s.category || "") ||
            /2026/.test(s.title || "")
          );
        if (tab === "bongo") return b === "bongo" || b === "other";
        return true;
      });
    }
    return [...list].sort(sortNewest);
  }, [songs, tab]);

  const tabs: { id: typeof tab; label: string; count?: number }[] = [
    { id: "video", label: "Video", count: counts.video || undefined },
    { id: "all", label: "Zote", count: songs.length },
    { id: "bongo", label: "Bongo", count: counts.bongo || undefined },
    { id: "dini", label: "Dini", count: counts.dini || undefined },
    { id: "2026", label: "2026", count: counts.y2026 || undefined },
    { id: "free", label: "Free MP3", count: counts.free || undefined },
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
        {filtered.map((c) => {
          const isVideo = bucket(c.category, c.link_url) === "video";
          const neu = isNew(c);
          return (
            <Link
              key={c.id}
              href={`/watch/${c.id}`}
              className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:scale-[0.98] transition"
            >
              <div
                className={`relative w-full bg-violet-950 ${
                  isVideo ? "aspect-video" : "aspect-square"
                }`}
              >
                {c.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.cover_url}
                    alt={c.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isVideo ? (
                      <Video className="w-12 h-12 text-white/25" />
                    ) : (
                      <Music className="w-12 h-12 text-white/25" />
                    )}
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  {isVideo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/90 text-white font-semibold">
                      VIDEO
                    </span>
                  )}
                  {neu && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/90 text-white font-semibold">
                      MPYA
                    </span>
                  )}
                </div>
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
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 mt-4">
          Hakuna nyimbo kwenye category hii.
        </p>
      )}
    </>
  );
}
