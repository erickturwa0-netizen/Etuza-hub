import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureElitePlexContent } from "@/lib/eliteplex";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Tamthilia – ETUZA HUB" };

export default async function DramaPage() {
  let items: {
    id: string;
    title: string;
    coverUrl: string | null;
    category: string | null;
  }[] = [];

  try {
    await ensureElitePlexContent("drama");
    items = await prisma.content.findMany({
      where: { type: "drama", status: "published" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, coverUrl: true, category: true },
    });
  } catch (e) {
    console.error("drama page", e);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-400">
          <Clapperboard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tamthilia</h1>
          <p className="text-sm text-slate-500">
            {items.length} series / anime · ElitePlex
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-400 text-sm">Hakuna tamthilia bado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((c) => (
            <Link key={c.id} href={`/watch/${c.id}`} className="block group">
              <div className="aspect-[2/3] rounded-2xl border border-slate-800 bg-pink-950 overflow-hidden relative">
                {c.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.coverUrl}
                    alt={c.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
                  />
                ) : null}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                  <p className="text-xs font-semibold line-clamp-2">{c.title}</p>
                  {c.category && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{c.category}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
