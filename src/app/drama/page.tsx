import { Clapperboard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureElitePlexContent } from "@/lib/eliteplex";
import { probeUnknownStreams } from "@/lib/stream-probe";
import MediaPosterCard from "@/components/MediaPosterCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;
export const metadata = { title: "Tamthilia – ETUZA HUB" };

export default async function DramaPage() {
  let items: {
    id: string;
    title: string;
    coverUrl: string | null;
    category: string | null;
    streamStatus?: string;
    createdAt?: Date;
  }[] = [];

  try {
    // Re-import / migrate embeds (vsembed → vidsrc)
    await ensureElitePlexContent("drama");
    try {
      await probeUnknownStreams("drama", 16);
    } catch {
      /* ignore */
    }

    const raw = await prisma.content.findMany({
      where: { type: "drama", status: "published" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        category: true,
        createdAt: true,
      },
      take: 200,
    });

    let statusMap: Record<string, string> = {};
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id, stream_status FROM "Content" WHERE type = 'drama' AND status = 'published' LIMIT 300`
      )) as { id: string; stream_status: string | null }[];
      for (const r of rows) {
        statusMap[r.id] = (r.stream_status || "unknown").toLowerCase();
      }
    } catch {
      /* ignore */
    }

    const mapped = raw.map((a) => ({
      ...a,
      streamStatus: statusMap[a.id] || "unknown",
    }));

    const working = mapped
      .filter((a) => a.streamStatus === "ok")
      .sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
    const unknown = mapped
      .filter((a) => a.streamStatus !== "ok" && a.streamStatus !== "bad")
      .sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );

    // Working first; hide pure bad from main grid
    items = [...working, ...unknown.slice(0, 40)];
  } catch (e) {
    console.error("drama page", e);
  }

  const okCount = items.filter((i) => i.streamStatus === "ok").length;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-400">
          <Clapperboard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tamthilia</h1>
          <p className="text-sm text-slate-500">
            {okCount} zinazocheza juu · {items.length} zinaonekana · badilisha server kwenye player
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
              streamStatus={c.streamStatus}
            />
          ))}
        </div>
      )}
    </main>
  );
}
