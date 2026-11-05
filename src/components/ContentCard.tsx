"use client";

import { useState } from "react";
import Link from "next/link";
import { Film, Gamepad2, Shield, Tv, Radio, Music, Clapperboard } from "lucide-react";
import type { ContentType } from "@/types/database";
import { contentCover } from "@/lib/covers";

interface ContentCardProps {
  id: string;
  title: string;
  type: ContentType;
  category?: string | null;
  coverUrl?: string | null;
  linkType?: "download" | "stream";
  href?: string;
}

const icons = {
  movie: Film,
  game: Gamepad2,
  vpn: Shield,
  tv: Tv,
  radio: Radio,
  music: Music,
  drama: Clapperboard,
};

export default function ContentCard({
  id,
  title,
  type,
  category,
  coverUrl,
  href,
}: ContentCardProps) {
  const Icon = icons[type] || Film;
  const link = href ?? `/watch/${id}`;
  const initial = contentCover(type, title, coverUrl);
  const [src, setSrc] = useState(initial);

  return (
    <Link href={link} className="block group">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 ring-1 ring-white/5 shadow-lg shadow-black/40 transition duration-300 group-hover:scale-[1.04] group-hover:ring-red-500/40 group-hover:z-10 group-hover:shadow-red-900/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
          onError={() => {
            setSrc(contentCover(type, title, null));
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition" />
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
          <p className="font-semibold text-[12px] sm:text-[13px] leading-snug line-clamp-2 text-white drop-shadow">
            {title}
          </p>
          {category && (
            <p className="text-[9px] sm:text-[10px] text-slate-300/90 mt-0.5 uppercase tracking-wide truncate">
              {category}
            </p>
          )}
        </div>
        {!coverUrl && (
          <span className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-white/70" />
          </span>
        )}
      </div>
    </Link>
  );
}
