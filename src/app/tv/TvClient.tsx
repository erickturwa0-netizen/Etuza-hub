"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Tv } from "lucide-react";

type Channel = {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
};

export default function TvClient({
  initial,
  total,
}: {
  initial: Channel[];
  total: number;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");

  const groups = useMemo(() => {
    const s = new Set(initial.map((c) => c.group).filter(Boolean));
    return Array.from(s).sort();
  }, [initial]);

  const filtered = useMemo(() => {
    let list = initial;
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(qq) ||
          c.group.toLowerCase().includes(qq)
      );
    }
    if (group) list = list.filter((c) => c.group === group);
    return list;
  }, [initial, q, group]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta channel…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
        </div>
      </div>

      {groups.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setGroup("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              !group
                ? "bg-red-600/20 border-red-500/40 text-red-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            Zote ({total})
          </button>
          {groups.slice(0, 14).map((g) => (
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

      {(q || group) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <Link
              key={"f-" + c.id + c.url}
              href={`/watch/live?url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.title)}`}
              className="block rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden"
            >
              <div className="aspect-video flex items-center justify-center bg-slate-950">
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo} alt="" className="w-full h-full object-contain p-3" />
                ) : (
                  <Tv className="w-10 h-10 text-white/30" />
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{c.title}</p>
                <p className="text-[11px] text-slate-500">{c.group}</p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 col-span-full">Hakuna matokeo</p>
          )}
        </div>
      )}
    </div>
  );
}
