import Link from "next/link";
import { Tv } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "TV Channels – ETUZA HUB" };

export default async function TvPage() {
  let channels: {
    id: string;
    title: string;
    description: string | null;
    coverUrl: string | null;
    linkUrl: string;
    category: string | null;
    network: string | null;
  }[] = [];

  try {
    channels = await prisma.content.findMany({
      where: { type: "tv", status: "published" },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    channels = [];
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tv className="w-6 h-6 text-red-400" />
          TV Channels
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Live TV · ongeza channels kupitia Admin Panel
        </p>
      </div>

      {channels.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Hakuna TV channel bado</p>
          <p className="text-xs text-slate-600 mt-2">
            Admin: Add Content → Type = TV → weka stream URL (m3u8)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {channels.map((c) => (
            <a
              key={c.id}
              href={c.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden"
            >
              <div
                className="aspect-video flex items-center justify-center"
                style={{
                  background: c.coverUrl
                    ? undefined
                    : "linear-gradient(135deg,#7f1d1d,#1e1b4b)",
                }}
              >
                {c.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.coverUrl} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <Tv className="w-10 h-10 text-white/30" />
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{c.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {c.network || c.category || "Live"}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
