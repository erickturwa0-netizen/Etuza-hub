import { Radio } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Radio – ETUZA HUB" };

export default async function RadioPage() {
  let stations: {
    id: string;
    title: string;
    description: string | null;
    coverUrl: string | null;
    linkUrl: string;
    category: string | null;
    network: string | null;
  }[] = [];

  try {
    stations = await prisma.content.findMany({
      where: { type: "radio", status: "published" },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    stations = [];
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="w-6 h-6 text-pink-400" />
          Radio
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Live radio · ongeza stations kupitia Admin Panel
        </p>
      </div>

      {stations.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Hakuna radio station bado</p>
          <p className="text-xs text-slate-600 mt-2">
            Admin: Add Content → Type = Radio → weka stream URL (.mp3 / .m3u8)
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stations.map((s) => (
            <a
              key={s.id}
              href={s.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-4 flex items-center gap-4 hover:border-pink-500/30"
            >
              <div className="w-14 h-14 rounded-xl bg-pink-950 flex items-center justify-center shrink-0 overflow-hidden">
                {s.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Radio className="w-6 h-6 text-pink-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {s.network || s.category || s.description || "Live radio"}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
