import Link from "next/link";
import { getPublishedContent } from "@/lib/content";
import { Music } from "lucide-react";
import { ensureMusicVideos } from "@/lib/music-videos";
import { ensureMusicCatalog } from "@/lib/music-sync";
import PresenceTrackerClient from "@/components/PresenceTrackerClient";
import MusicCategoryTabs from "@/components/MusicCategoryTabs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Miziki – ETUZA HUB" };

export default async function MusicPage() {
  try {
    await ensureMusicVideos();
  } catch (e) {
    console.error("music cleanup", e);
  }

  // Auto-scrape: kama catalog ni ndogo, vuta iTunes (Bongo + Dini + 2026)
  try {
    await ensureMusicCatalog();
  } catch (e) {
    console.error("music auto-scrape", e);
  }

  const items = await getPublishedContent("music");
  const songs = items.filter(
    (c) =>
      !/youtube\.com|youtu\.be|youtube-nocookie/i.test(c.link_url || "") &&
      !/music video/i.test(c.category || "")
  );

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-4 py-8 pb-28">
      <PresenceTrackerClient section="music" title="Miziki" />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
          <Music className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Miziki</h1>
          <p className="text-sm text-slate-400">
            {songs.length} nyimbo · Bongo · Dini · 2026
          </p>
        </div>
      </div>

      {songs.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Hakuna nyimbo bado. Subiri auto-scrape au Admin → Sync Music / Import
          All.
        </p>
      ) : (
        <MusicCategoryTabs songs={songs} />
      )}
    </main>
  );
}
