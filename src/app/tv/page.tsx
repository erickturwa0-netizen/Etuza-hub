import { Suspense } from "react";
import { loadIptvChannels, PINNED_CHANNELS } from "@/lib/iptv";
import PresenceTrackerClient from "@/components/PresenceTrackerClient";
import TvChannelGrid from "@/components/TvChannelGrid";
import ContentSearch from "@/components/ContentSearch";
import AiAgentCard from "@/components/AiAgentCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "TV – ETUZA HUB" };

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  let channels = PINNED_CHANNELS;
  try {
    channels = await loadIptvChannels();
  } catch {
    /* use pinned */
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
      <AiAgentCard context="tv" />
      <PresenceTrackerClient section="tv" title="TV Channels" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">TV Channels</h1>
          <p className="text-xs text-slate-500">Live IPTV</p>
        </div>
        <div className="sm:ml-auto w-full sm:w-72">
          <Suspense fallback={null}>
            <ContentSearch placeholder="Tafuta channel…" />
          </Suspense>
        </div>
      </div>
      <TvChannelGrid channels={channels} query={q} />
    </main>
  );
}
