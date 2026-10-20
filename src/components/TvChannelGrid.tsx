"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tv } from "lucide-react";
import type { IptvChannel } from "@/lib/iptv";

export default function TvChannelGrid({ channels }: { channels: IptvChannel[] }) {
  const groups = useMemo(
    () =>
      Array.from(new Set(channels.map((c) => c.group).filter(Boolean))).sort(),
    [channels]
  );
  const [active, setActive] = useState<string>("All");

  const filtered =
    active === "All"
      ? channels
      : channels.filter((c) => c.group.toLowerCase() === active.toLowerCase());

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Tv className="w-6 h-6 text-red-400" />
          TV Channels
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {filtered.length} channels · bofya group kuchuja
        </p>
        <p className="text-xs text-amber-400/90 mt-2">
          Tip: Anza na <b>TBC2</b>, <b>Mahaasin</b>, <b>France 24</b>. Kenya
          channels zinahitaji network nzuri — bofya channel kisha <b>Play</b>.
        </p>
      </div>

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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map((c) => (
          <Link
            key={c.id + "-" + c.url}
            href={`/watch/live?url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.title)}`}
            className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:border-red-500"
          >
            <div
              className="aspect-video flex items-center justify-center"
              style={{
                background: c.logo
                  ? "#0a0a0f"
                  : "linear-gradient(135deg,#7f1d1d,#1e1b4b)",
              }}
            >
              {c.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logo}
                  alt={c.title}
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <div className="text-center px-2">
                  <Tv className="w-8 h-8 text-white/40 mx-auto mb-1" />
                  <p className="text-[11px] text-white/50 line-clamp-2">{c.title}</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-800">
              <p className="font-semibold text-sm text-white truncate">{c.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.group}</p>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 mt-4">Hakuna channel kwenye group hii.</p>
      )}
    </>
  );
}
