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
      limit: 250,
      q,
      group,
      liveOnly: false,
    });
    if (result.channels.length > 0) channels = result.channels;
  } catch (e) {
    console.error("tv page", e);
  }

  if (!channels.length) channels = PINNED_CHANNELS;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
      <PresenceTrackerClient section="tv" title="TV Channels" />
      <div className="mb-4 w-full sm:max-w-md sm:ml-auto">
        <Suspense fallback={null}>
          <ContentSearch placeholder="Tafuta channel…" />
        </Suspense>
      </div>
      <TvChannelGrid channels={channels} />
    </main>
  );
}
