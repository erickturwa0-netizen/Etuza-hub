import { Suspense } from "react";
import { loadIptvChannels, PINNED_CHANNELS } from "@/lib/iptv";
import PresenceTrackerClient from "@/components/PresenceTrackerClient";
import TvChannelGrid from "@/components/TvChannelGrid";
import ContentSearch from "@/components/ContentSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;
export const metadata = { title: "TV Channels – ETUZA HUB" };

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string; live?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || "";
  const group = sp.group || "";
  const liveOnly = sp.live === "1";

  let channels = PINNED_CHANNELS;
  let total = PINNED_CHANNELS.length;
  let source = "pinned";

  try {
    const result = await loadIptvChannels({
      limit: 5000,
      q,
      group,
      liveOnly,
    });
    if (result.channels.length > 0) {
      channels = result.channels;
      total = result.total;
      source = result.source;
    }
  } catch (e) {
    console.error("tv page", e);
  }

  if (!channels.length) channels = PINNED_CHANNELS;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
      <PresenceTrackerClient section="tv" title="TV Channels" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">TV Channels</h1>
          <p className="text-sm text-slate-400">
            {channels.length.toLocaleString()} zinaonekana
            {total > channels.length
              ? ` · catalog ${total.toLocaleString()}`
              : ""}{" "}
            · {source}
          </p>
        </div>
        <div className="w-full sm:max-w-md sm:ml-auto">
          <Suspense fallback={null}>
            <ContentSearch placeholder="Tafuta channel…" />
          </Suspense>
        </div>
      </div>
      <TvChannelGrid channels={channels} />
    </main>
  );
}
