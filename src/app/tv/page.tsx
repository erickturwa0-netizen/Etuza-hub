import Link from "next/link";
import { Tv } from "lucide-react";
import { loadIptvChannels, PINNED_CHANNELS } from "@/lib/iptv";
import PresenceTrackerClient from "@/components/PresenceTrackerClient";

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

  const groups = Array.from(
    new Set(channels.map((c) => c.group).filter(Boolean))
  ).sort();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
      <PresenceTrackerClient section="tv" title="TV Channels" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Tv className="w-6 h-6 text-red-400" />
          TV Channels
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {channels.length} channels zilizothibitishwa
        </p>
        <p className="text-xs text-amber-400/90 mt-2">
          Tip: Anza na <b>TBC2</b>, <b>Mahaasin</b>, <b>France 24</b> au{" "}
          <b>NASA TV</b>.
        </p>
      </div>

      {groups.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {groups.map((g) => (
            <span
              key={g}
              className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-300"
            >
              {g}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {channels.map((c) => (
          <Link
            key={c.id + "-" + c.url}
            href={`/watch/live?url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.title)}`}
            className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:border-red-500"
          >
            <div
              className="aspect-video flex items-center justify-center"
              style={{
                background: c.logo
                  ? "#0a0a0f"
                  : "linear-gradient(135deg,#7f1d1d,#1e1b4b)",
              }}
            >
              {c.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.logo}
                  alt={c.title}
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <div className="text-center px-2">
                  <Tv className="w-8 h-8 text-white/40 mx-auto mb-1" />
                  <p className="text-[11px] text-white/50 line-clamp-2">{c.title}</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-800">
              <p className="font-semibold text-sm text-white truncate">{c.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.group}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
