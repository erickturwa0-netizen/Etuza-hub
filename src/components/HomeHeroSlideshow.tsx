"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Film, Clapperboard, Music, Radio, Tv } from "lucide-react";

export type HeroSlide = {
  id: string;
  title: string;
  cover: string;
  href: string;
  kind: "movie" | "drama" | "music" | "radio" | "tv";
  category?: string | null;
};

const KIND_META: Record<
  HeroSlide["kind"],
  { label: string; icon: typeof Film; color: string }
> = {
  movie: { label: "Movie", icon: Film, color: "bg-violet-600" },
  drama: { label: "Tamthilia", icon: Clapperboard, color: "bg-orange-600" },
  music: { label: "Miziki", icon: Music, color: "bg-fuchsia-600" },
  radio: { label: "Radio", icon: Radio, color: "bg-rose-600" },
  tv: { label: "TV", icon: Tv, color: "bg-red-600" },
};

export default function HomeHeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const list = slides.slice(0, 12);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => {
      setI((x) => (x + 1) % list.length);
    }, 4500);
    return () => clearInterval(t);
  }, [list.length]);

  if (!list.length) return null;

  const s = list[i];
  const meta = KIND_META[s.kind];
  const Icon = meta.icon;

  function prev() {
    setI((x) => (x - 1 + list.length) % list.length);
  }
  function next() {
    setI((x) => (x + 1) % list.length);
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
      {/* Standard 16:9 hero */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[280px] sm:max-h-[320px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={s.id + s.cover}
          src={s.cover}
          alt={s.title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://ui-avatars.com/api/?name=" +
              encodeURIComponent(s.title.slice(0, 20)) +
              "&background=1e1b4b&color=c4b5fd&size=512&bold=true";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white px-2 py-0.5 rounded-md ${meta.color} mb-2`}
            >
              <Icon className="w-3 h-3" />
              {meta.label}
            </span>
            <Link href={s.href}>
              <h2 className="text-lg sm:text-xl font-bold text-white line-clamp-2 hover:text-violet-200 transition">
                {s.title}
              </h2>
            </Link>
            {s.category && (
              <p className="text-xs text-slate-300 mt-1 truncate">{s.category}</p>
            )}
          </div>
          <Link
            href={s.href}
            className="shrink-0 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-semibold text-white backdrop-blur-sm"
          >
            Tazama
          </Link>
        </div>

        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Dots + strip of thumbs */}
      {list.length > 1 && (
        <div className="px-3 py-2.5 flex items-center gap-2 overflow-x-auto bg-slate-950/80">
          {list.map((slide, idx) => (
            <button
              key={slide.id + idx}
              type="button"
              onClick={() => setI(idx)}
              className={`relative shrink-0 w-12 h-16 sm:w-14 sm:h-[4.5rem] rounded-lg overflow-hidden border-2 transition ${
                idx === i
                  ? "border-violet-400 opacity-100"
                  : "border-transparent opacity-60 hover:opacity-90"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.cover}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
