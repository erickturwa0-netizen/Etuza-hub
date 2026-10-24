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

function looksBroken(url?: string | null) {
  if (!url || !/^https?:\/\//i.test(url)) return true;
  if (url.includes("image.tmdb.org")) {
    const file = url.split("/").pop() || "";
    if (file.length < 20) return true;
  }
  return false;
}

export default function MediaPosterCard({
  id,
  title,
  coverUrl,
  category,
  kind = "movie",
}: Props) {
  const fallback =
    kind === "drama" ? dramaCover(title, null) : movieCover(title, null);
  const initial = looksBroken(coverUrl) ? fallback : coverUrl!;

  const [src, setSrc] = useState(initial);
  const [tried, setTried] = useState(false);

  async function loadRealPoster() {
    if (tried) {
      setSrc(fallback);
      return;
    }
    setTried(true);
    try {
      const res = await fetch(
        `/api/covers/movie?title=${encodeURIComponent(title)}`,
        { cache: "force-cache" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.cover && typeof data.cover === "string" && data.cover.startsWith("http")) {
          setSrc(data.cover);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setSrc(fallback);
  }

  // Auto-fetch real poster when URL is broken/missing
  if (looksBroken(coverUrl) && !tried && src === fallback) {
    // fire once
    if (typeof window !== "undefined") {
      // schedule microtask to avoid setState during render issues in strict mode
      queueMicrotask(() => {
        if (!tried) loadRealPoster();
      });
    }
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
          onError={() => loadRealPoster()}
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
