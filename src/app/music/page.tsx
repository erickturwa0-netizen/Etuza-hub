import Link from "next/link";
import { getPublishedContent } from "@/lib/content";
import { Music } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Miziki – ETUZA HUB" };

export default async function MusicPage() {
  const items = await getPublishedContent("music");

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-4 py-8 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
          <Music className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Miziki</h1>
          <p className="text-sm text-slate-400">{items.length} available</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Hakuna miziki bado. Admin → Add Content → Type = music
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/watch/${c.id}`}
              className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:scale-[0.98] transition"
            >
              <div className="relative w-full aspect-square bg-violet-950">
                {c.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.cover_url}
                    alt={c.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="w-12 h-12 text-white/25" />
                  </div>
                )}
              </div>
              <div className="p-2.5 sm:p-3">
                <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                  {c.title}
                </p>
                {c.category && (
                  <p className="text-[11px] text-violet-300/80 mt-1 uppercase tracking-wide truncate">
                    {c.category}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
