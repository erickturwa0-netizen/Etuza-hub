import Link from "next/link";
import { Tv } from "lucide-react";
import { loadIptvChannels, PINNED_CHANNELS } from "@/lib/iptv";
import TvClient from "./TvClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "TV Channels – ETUZA HUB" };

export default async function TvPage() {
  let channels = PINNED_CHANNELS;
  let total = PINNED_CHANNELS.length;
  let error = "";

  try {
    const result = await loadIptvChannels({ source: "ea", limit: 150 });
    if (result.channels.length > 0) {
      channels = result.channels;
      total = result.total;
    }
  } catch (e) {
    console.error("tv page", e);
    error = "Baadhi ya channels za remote hazikupatikana — inaonyesha TZ";
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tv className="w-6 h-6 text-red-400" />
          TV Channels
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {total} channels · Tanzania + East Africa + IPTV
        </p>
      </div>

      {error && <p className="text-sm text-amber-400 mb-3">{error}</p>}

      {/* Server-rendered list — always visible even if JS fails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {channels.slice(0, 24).map((c) => (
          <Link
            key={c.id + c.url}
            href={`/watch/live?url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.title)}`}
            className="block rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-red-500/40 transition"
          >
            <div
              className="aspect-video flex items-center justify-center bg-slate-950"
              style={{
                background: c.logo
                  ? undefined
                  : "linear-gradient(135deg,#7f1d1d,#1e1b4b)",
              }}
            >
              {c.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logo}
                  alt=""
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <Tv className="w-10 h-10 text-white/30" />
              )}
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm truncate">{c.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{c.group}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Client search / more channels */}
      <TvClient initial={channels} total={total} />
    </main>
  );
}
