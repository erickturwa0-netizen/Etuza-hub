import { Suspense } from "react";
import { loadIptvChannels, PINNED_CHANNELS } from "@/lib/iptv";
import PresenceTrackerClient from "@/components/PresenceTrackerClient";
import TvChannelGrid from "@/components/TvChannelGrid";
import ContentSearch from "@/components/ContentSearch";
import AiAgentCard from "@/components/AiAgentCard";
import type { IptvChannel } from "@/lib/iptv";

export const dynamic = "force-dynamic";
export const metadata = { title: "TV – ETUZA HUB" };

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim().toLowerCase();
  let channels: IptvChannel[] = PINNED_CHANNELS;
  try {
    const loaded = await loadIptvChannels({ limit: 800, q: q || undefined });
    if (Array.isArray(loaded.channels) && loaded.channels.length) {
      channels = loaded.channels;
    }
  } catch {
    /* use pinned */
  }

  if (q) {
    channels = channels.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
      <AiAgentCard context="tv" />
      <PresenceTrackerClient section="tv" title="TV Channels" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">TV Channels</h1>
          <p className="text-xs text-slate-500">
            Live IPTV · {channels.length} channels
          </p>
        </div>
        <div className="sm:ml-auto w-full sm:w-72">
          <Suspense fallback={null}>
            <ContentSearch placeholder="Tafuta channel…" />
          </Suspense>
        </div>
      </div>
      <TvChannelGrid channels={channels} />
    </main>
  );
}
