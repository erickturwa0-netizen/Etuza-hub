"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tv } from "lucide-react";
import type { IptvChannel } from "@/lib/iptv";
import { isPlayableStream } from "@/lib/iptv";

function logoSrc(c: IptvChannel) {
  if (c.logo && /^https?:\/\//i.test(c.logo)) return c.logo;
  const n = encodeURIComponent((c.title || "TV").slice(0, 24));
  return `https://ui-avatars.com/api/?name=${n}&background=1e293b&color=f87171&size=256&bold=true`;
}

function sourceOf(c: IptvChannel): string {
  const id = String(c.id || "");
  if (id.startsWith("mfalme")) return "mfalme";
  if (id.startsWith("sf-")) return "streamfree";
  if (id.startsWith("pin")) return "free";
  return "other";
}

const SOURCES: { id: string; label: string }[] = [
  { id: "all", label: "Zote" },
  { id: "free", label: "Free (zinacheza)" },
  { id: "mfalme", label: "Mfalme TV" },
  { id: "streamfree", label: "Orizon / Mechi" },
];

export default function TvChannelGrid({ channels }: { channels: IptvChannel[] }) {
  const [source, setSource] = useState<string>("all");
  const [active, setActive] = useState<string>("All");

  const bySource = useMemo(() => {
    if (source === "all") return channels;
    return channels.filter((c) => sourceOf(c) === source);
  }, [channels, source]);

  const groups = useMemo(
    () =>
      Array.from(new Set(bySource.map((c) => c.group).filter(Boolean))).sort(),
    [bySource]
  );

  const filtered =
    active === "All"
      ? bySource
      : bySource.filter((c) => c.group.toLowerCase() === active.toLowerCase());

  const playableCount = filtered.filter((c) => isPlayableStream(c.url)).length;

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: channels.length };
    for (const c of channels) {
      const s = sourceOf(c);
      m[s] = (m[s] || 0) + 1;
    }
    return m;
  }, [channels]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Tv className="w-6 h-6 text-red-400" />
          TV Channels
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {filtered.length} channels · {playableCount} zinacheza
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {SOURCES.map((s) => {
          const n = s.id === "all" ? counts.all : counts[s.id] || 0;
          if (s.id !== "all" && n === 0) return null;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSource(s.id);
                setActive("All");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                source === s.id
                  ? "bg-red-600 border-red-500 text-white"
                  : "border-slate-700 text-slate-300 hover:border-slate-500 bg-slate-900"
              }`}
            >
              {s.label}
              <span className="ml-1 opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      {groups.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {["All", ...groups].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActive(g)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                active === g
                  ? "bg-red-600/30 border-red-500 text-red-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map((c) => {
          const play = isPlayableStream(c.url);
          const src = sourceOf(c);

          const card = (
            <>
              <div className="aspect-video flex items-center justify-center bg-slate-950 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc(c)}
                  alt={c.title}
                  className="w-full h-full object-contain p-2"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      c.title.slice(0, 16)
                    )}&background=7f1d1d&color=fff&size=256&bold=true`;
                  }}
                />
                {!play && (
                  <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-600/90 text-white">
                    Catalog
                  </span>
                )}
                <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-slate-200 capitalize">
                  {src === "free"
                    ? "Free"
                    : src === "streamfree"
                      ? "Orizon"
                      : src === "mfalme"
                        ? "Mfalme"
                        : src}
                </span>
              </div>
              <div className="p-3 border-t border-slate-800">
                <p className="font-semibold text-sm text-white truncate">{c.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{c.group}</p>
              </div>
            </>
          );

          if (!play) {
            return (
              <div
                key={c.id + "-" + c.title}
                className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden opacity-80"
                title="Catalog"
                onClick={() =>
                  alert(
                    c.title +
                      "\n\nHii ni catalog. Stream haipatikani moja kwa moja."
                  )
                }
              >
                {card}
              </div>
            );
          }

          return (
            <Link
              key={c.id + "-" + c.url}
              href={`/watch/live?url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.title)}`}
              className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:border-red-500"
            >
              {card}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 mt-4">
          Hakuna channel kwenye sehemu hii.
        </p>
      )}
    </>
  );
}
