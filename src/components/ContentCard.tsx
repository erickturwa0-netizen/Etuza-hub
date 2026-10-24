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
    <Link href={link} className="block">
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => {
            // Final fallback: colored avatar with title
            setSrc(contentCover(type, title, null));
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 p-3"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <p className="font-semibold text-[13px] leading-snug line-clamp-2 text-white">
            {title}
          </p>
          {category && (
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
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
