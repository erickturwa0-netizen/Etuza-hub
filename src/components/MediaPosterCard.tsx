"use client";

import { useState } from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import { movieCover, dramaCover } from "@/lib/covers";

type Props = {
  id: string;
  title: string;
  coverUrl?: string | null;
  category?: string | null;
  kind?: "movie" | "drama";
};

export default function MediaPosterCard({
  id,
  title,
  coverUrl,
  category,
  kind = "movie",
}: Props) {
  const fallback =
    kind === "drama" ? dramaCover(title, null) : movieCover(title, null);
  const initial =
    coverUrl && /^https?:\/\//i.test(coverUrl) && coverUrl.length > 40
      ? coverUrl
      : fallback;

  const [src, setSrc] = useState(initial);
  const [triedItunes, setTriedItunes] = useState(false);

  async function onImgError() {
    if (!triedItunes) {
      setTriedItunes(true);
      try {
        const res = await fetch(
          `/api/covers/movie?title=${encodeURIComponent(title)}`,
          { cache: "force-cache" }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.cover && typeof data.cover === "string") {
            setSrc(data.cover);
            return;
          }
        }
      } catch {
        /* fall through */
      }
    }
    setSrc(fallback);
  }

  return (
    <Link
      href={`/watch/${id}`}
      className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:scale-[0.98] transition group touch-manipulation"
    >
      <div className="relative w-full aspect-[2/3] bg-violet-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
          loading="lazy"
          onError={onImgError}
        />
        {src === fallback && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center">
            <Film className="w-3.5 h-3.5 text-white/50" />
          </div>
        )}
      </div>
      <div className="p-2.5 sm:p-3">
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
          {title}
        </p>
        {category && (
          <p className="text-[11px] text-violet-300/80 mt-1 truncate">{category}</p>
        )}
      </div>
    </Link>
  );
}
