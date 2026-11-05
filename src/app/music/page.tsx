import { getPublishedContent } from "@/lib/content";
import { Music } from "lucide-react";
import { ensureMusicVideos } from "@/lib/music-videos";
import { ensureMusicCatalog } from "@/lib/music-sync";
import PresenceTrackerClient from "@/components/PresenceTrackerClient";
import MusicCategoryTabs from "@/components/MusicCategoryTabs";
import AiAgentCard from "@/components/AiAgentCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Miziki – ETUZA HUB" };

export default async function MusicPage() {
  try {
    await ensureMusicVideos();
    await ensureMusicCatalog();
  } catch {
    /* ignore */
  }
  const items = await getPublishedContent("music");

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-4 py-8 pb-28">
      <AiAgentCard context="music" />
      <PresenceTrackerClient section="music" title="Miziki" />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
          <Music className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Miziki</h1>
          <p className="text-xs text-slate-500">{items.length} tracks</p>
        </div>
      </div>
      <MusicCategoryTabs items={items} />
    </main>
  );
}
