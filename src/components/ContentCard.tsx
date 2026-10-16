import Link from "next/link";
import { Film, Gamepad2, Shield, Play, Download } from "lucide-react";
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

const typeMeta = {
  movie: {
    icon: Film,
    gradient: "from-violet-700 via-purple-800 to-indigo-950",
    accent: "bg-violet-500",
  },
  game: {
    icon: Gamepad2,
    gradient: "from-emerald-700 via-teal-800 to-cyan-950",
    accent: "bg-emerald-500",
  },
  vpn: {
    icon: Shield,
    gradient: "from-blue-700 via-sky-800 to-indigo-950",
    accent: "bg-blue-500",
  },
};

export default function ContentCard({
  id,
  title,
  type,
  category,
  coverUrl,
  linkType = "stream",
  href,
}: ContentCardProps) {
  const meta = typeMeta[type];
  const Icon = meta.icon;
  const link =
    href ??
    `/${type === "movie" ? "movies" : type === "game" ? "games" : "vpn"}`;

  return (
    <Link href={link} className="block">
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-lg">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-12 h-12 text-white/25" />
            </div>
            <div className="absolute top-3 left-3">
              <span className={`w-2 h-2 rounded-full ${meta.accent} block`} />
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="font-semibold text-[13px] sm:text-sm leading-snug line-clamp-2 text-white">
            {title}
          </p>
          {category && (
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 uppercase tracking-wider">
              {category}
            </p>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-600/90 text-white">
            {linkType === "download" ? (
              <Download className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
