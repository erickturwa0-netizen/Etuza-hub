import Link from "next/link";
import { Film, Gamepad2, Shield, Tv, Radio } from "lucide-react";
import type { ContentType } from "@/types/database";

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
};

const bg: Record<ContentType, string> = {
  movie: "#4c1d95",
  game: "#064e3b",
  vpn: "#1e3a8a",
  tv: "#7f1d1d",
  radio: "#831843",
};

const paths: Record<ContentType, string> = {
  movie: "/movies",
  game: "/games",
  vpn: "/vpn",
  tv: "/tv",
  radio: "/radio",
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
  const link = href ?? paths[type] ?? "/";

  return (
    <Link href={link} className="block">
      <div
        className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-slate-800"
        style={{ background: coverUrl ? "#111827" : bg[type] || "#111827" }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-12 h-12 text-white opacity-30" />
          </div>
        )}

        <div
          className="absolute bottom-0 left-0 right-0 p-3"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <p className="font-semibold text-[13px] leading-snug line-clamp-2 text-white">{title}</p>
          {category && (
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">{category}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
