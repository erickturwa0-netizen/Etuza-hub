import ContentCard from "@/components/ContentCard";
import { getPublishedContent } from "@/lib/content";
import { Clapperboard } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tamthilia – ETUZA HUB" };

export default async function DramaPage() {
  const items = await getPublishedContent("drama");

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400">
          <Clapperboard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tamthilia</h1>
          <p className="text-sm text-slate-500">{items.length} available</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Clapperboard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Hakuna tamthilia bado</p>
          <p className="text-xs text-slate-600 mt-2">
            Admin → Add Content → Type = Drama
          </p>
        </div>
      ) : (
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
      )}
    </main>
  );
}
