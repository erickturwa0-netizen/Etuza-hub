import { Clapperboard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureElitePlexContent } from "@/lib/eliteplex";
import MediaPosterCard from "@/components/MediaPosterCard";

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
            <MediaPosterCard
              key={c.id}
              id={c.id}
              title={c.title}
              coverUrl={c.coverUrl}
              category={c.category}
              kind="drama"
            />
          ))}
        </div>
      )}
    </main>
  );
}
