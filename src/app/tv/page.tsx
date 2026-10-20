import { loadIptvChannels, PINNED_CHANNELS } from "@/lib/iptv";
import PresenceTrackerClient from "@/components/PresenceTrackerClient";
import TvChannelGrid from "@/components/TvChannelGrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "TV Channels – ETUZA HUB" };

export default async function TvPage() {
  let channels = PINNED_CHANNELS;

  try {
    const result = await loadIptvChannels({ source: "pinned", limit: 40 });
    if (result.channels.length > 0) channels = result.channels;
  } catch (e) {
    console.error("tv page", e);
  }

  if (!channels.length) channels = PINNED_CHANNELS;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
      <PresenceTrackerClient section="tv" title="TV Channels" />
      <TvChannelGrid channels={channels} />
    </main>
  );
}
