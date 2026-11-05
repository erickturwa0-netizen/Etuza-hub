import { Clapperboard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureElitePlexContent } from "@/lib/eliteplex";
import { resetEmbedStatuses } from "@/lib/stream-probe";
import MediaPosterCard from "@/components/MediaPosterCard";
import AiAgentCard from "@/components/AiAgentCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Tamthilia – ETUZA HUB" };

export default async function DramaPage() {
  let items: {
    id: string;
    title: string;
    coverUrl: string | null;
    category: string | null;
    streamStatus?: string | null;
  }[] = [];

  try {
    await ensureElitePlexContent("drama");
    await resetEmbedStatuses("drama");
    const raw = await prisma.content.findMany({
      where: { type: "drama", status: "published" },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        category: true,
        createdAt: true,
      },
      take: 1500,
      orderBy: { createdAt: "desc" },
    });
    items = raw.map((a) => ({ ...a, streamStatus: "unknown" }));
  } catch (e) {
    console.error("drama page", e);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <AiAgentCard context="drama" />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
          <Clapperboard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tamthilia</h1>
          <p className="text-xs text-slate-500">{items.length} titles</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.map((item) => (
          <MediaPosterCard
            key={item.id}
            id={item.id}
            title={item.title}
            coverUrl={item.coverUrl}
            category={item.category}
            type="drama"
            streamStatus={item.streamStatus}
          />
        ))}
      </div>
    </main>
  );
}
