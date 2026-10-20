import Link from "next/link";
import { getPublishedContent } from "@/lib/content";
import { Gamepad2, Download } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Games – ETUZA HUB" };

export default async function GamesPage() {
  const items = await getPublishedContent("game");

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-4 py-8 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <p className="text-sm text-slate-400">{items.length} available</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-500 text-sm">Hakuna games bado.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/watch/${c.id}`}
              className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:scale-[0.98] transition"
            >
              <div className="relative w-full aspect-square bg-emerald-950">
                {c.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.cover_url}
                    alt={c.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gamepad2 className="w-12 h-12 text-white/25" />
                  </div>
                )}
                {c.link_type === "download" && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                    <Download className="w-3 h-3" />
                    DL
                  </span>
                )}
              </div>
              <div className="p-2.5 sm:p-3">
                <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                  {c.title}
                </p>
                {c.category && (
                  <p className="text-[11px] text-emerald-300/80 mt-1 uppercase tracking-wide truncate">
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
