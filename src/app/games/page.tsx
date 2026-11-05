import Link from "next/link";
import { getPublishedContent } from "@/lib/content";
import { Gamepad2, Download } from "lucide-react";
import AiAgentCard from "@/components/AiAgentCard";
import ContentCard from "@/components/ContentCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Games – ETUZA HUB" };

export default async function GamesPage() {
  const items = await getPublishedContent("game");

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-4 py-8 pb-28">
      <AiAgentCard context="game" />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <p className="text-xs text-slate-500">{items.length} games</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((c) => (
          <ContentCard
            key={c.id}
            id={c.id}
            title={c.title}
            type={c.type}
            category={c.category}
            coverUrl={c.cover_url}
            linkType={c.link_type}
          />
        ))}
      </div>
      {items.length === 0 && (
        <p className="text-slate-500 text-sm">Hakuna games bado.</p>
      )}
    </main>
  );
}
