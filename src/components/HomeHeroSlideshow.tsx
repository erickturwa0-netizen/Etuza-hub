"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Clapperboard,
  Music,
  Radio,
  Tv,
  Play,
} from "lucide-react";

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
  movie: { label: "Movie", icon: Film, color: "bg-red-600" },
  drama: { label: "Tamthilia", icon: Clapperboard, color: "bg-orange-600" },
  music: { label: "Miziki", icon: Music, color: "bg-fuchsia-600" },
  radio: { label: "Radio", icon: Radio, color: "bg-rose-600" },
  tv: { label: "Live TV", icon: Tv, color: "bg-sky-600" },
};

export default function HomeHeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const list = slides.slice(0, 12);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => {
      setI((x) => (x + 1) % list.length);
    }, 5500);
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
    <div className="relative w-full overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-800/80 bg-black">
      {/* Netflix-style tall hero */}
      <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] min-h-[340px] max-h-[520px] sm:max-h-[480px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={s.id + s.cover}
          src={s.cover}
          alt={s.title}
          className="absolute inset-0 w-full h-full object-cover scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://ui-avatars.com/api/?name=" +
              encodeURIComponent(s.title.slice(0, 20)) +
              "&background=0f0f14&color=f87171&size=800&bold=true";
          }}
        />

        {/* Cinematic gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/90 via-[#0a0a0f]/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 md:p-12 max-w-3xl">
          <span
            className={`inline-flex w-fit items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-md ${meta.color} mb-3 shadow-lg`}
          >
            <Icon className="w-3.5 h-3.5" />
            {meta.label}
            {s.category ? ` · ${s.category}` : ""}
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.05] tracking-tight drop-shadow-2xl line-clamp-3">
            {s.title}
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-200/90 max-w-md line-clamp-2 drop-shadow">
            Stream the best movies anytime, anywhere on ETUZA HUB.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={s.href}
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white text-black text-sm font-bold hover:bg-red-50 transition shadow-xl shadow-black/40"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Now
            </Link>
            <Link
              href={s.href}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-semibold backdrop-blur-md transition"
            >
              Info
            </Link>
          </div>
        </div>

        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/15 flex items-center justify-center text-white backdrop-blur-sm transition"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/15 flex items-center justify-center text-white backdrop-blur-sm transition"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 right-4 sm:right-8 flex gap-1.5">
              {list.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setI(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === i
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
