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

const typeIcon = {
  movie: Film,
  game: Gamepad2,
  vpn: Shield,
};

const typeColor = {
  movie: "from-violet-600/80 to-purple-900/80",
  game: "from-emerald-600/80 to-teal-900/80",
  vpn: "from-blue-600/80 to-cyan-900/80",
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
  const Icon = typeIcon[type];
  const link = href ?? `/${type}s/${id}`;

  return (
    <Link href={link} className="group block">
      <div className="glass-card overflow-hidden aspect-[2/3] relative">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${typeColor[type]} flex items-center justify-center`}
          >
            <Icon className="w-12 h-12 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="font-semibold text-sm leading-tight line-clamp-2">{title}</p>
          {category && (
            <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">{category}</p>
          )}
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white shadow-lg">
            {linkType === "download" ? (
              <Download className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
