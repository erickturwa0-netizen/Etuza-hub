"use client";

import Link from "next/link";
import { Play, Radio, Tv, Film, Music, Gamepad2 } from "lucide-react";

export type PlayableCard = {
  id: string;
  title: string;
  type: string;
  category?: string | null;
  coverUrl?: string | null;
  watchUrl: string;
};

const ICONS: Record<string, typeof Film> = {
  movie: Film,
  drama: Film,
  tv: Tv,
  radio: Radio,
  music: Music,
  game: Gamepad2,
};

export default function AiPlayableCards({ items }: { items: PlayableCard[] }) {
  if (!items?.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
        Bonyeza Cheza
      </p>
      <div className="grid gap-2">
        {items.map((item) => {
          const Icon = ICONS[item.type] || Film;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-violet-500/30 bg-slate-950/80 p-2.5"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon className="w-5 h-5 text-violet-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {item.type}
                  {item.category ? ` · ${item.category}` : ""}
                </p>
              </div>
              <Link
                href={item.watchUrl}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-900/40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Cheza
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
