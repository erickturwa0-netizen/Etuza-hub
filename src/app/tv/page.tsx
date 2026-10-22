import { Suspense } from "react";
import { loadIptvChannels, PINNED_CHANNELS } from "@/lib/iptv";
import PresenceTrackerClient from "@/components/PresenceTrackerClient";
import TvChannelGrid from "@/components/TvChannelGrid";
import ContentSearch from "@/components/ContentSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "TV Channels – ETUZA HUB" };

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || "";
  const group = sp.group || "";

  let channels = PINNED_CHANNELS;

  try {
    const result = await loadIptvChannels({
      limit: 80,
      q,
      group,
      liveOnly: true,
    });
    if (result.channels.length > 0) channels = result.channels;
  } catch (e) {
    console.error("tv page", e);
  }

  if (!channels.length) channels = PINNED_CHANNELS;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
      <PresenceTrackerClient section="tv" title="TV Channels" />
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">TV Channels</h1>
          <p className="text-sm text-slate-400">
            {channels.length} channels · zilizo hai
          </p>
        </div>
        <div className="sm:ml-auto w-full sm:w-auto">
          <Suspense fallback={null}>
            <ContentSearch placeholder="Tafuta channel…" />
          </Suspense>
        </div>
      </div>
      <TvChannelGrid channels={channels} />
    </main>
  );
}
