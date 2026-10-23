"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import StreamPlayer from "@/components/StreamPlayer";
import PreRollGate from "@/components/PreRollGate";
import PresenceTracker from "@/components/PresenceTracker";

function LiveInner() {
  const sp = useSearchParams();
  const url = sp.get("url") || "";
  const title = sp.get("title") || "Live TV";
  const key = "tv:" + (title || "live").slice(0, 40);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <PresenceTracker section="tv" title={title} />

      <Link
        href="/tv"
        className="inline-flex items-center gap-2 text-sm text-slate-400 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        TV Channels
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-white">{title}</h1>

      {!url ? (
        <p className="text-sm text-red-400">Hakuna stream URL</p>
      ) : (
        <PreRollGate contentKey={key} title={title} enabled>
          <StreamPlayer src={url} title={title} />
        </PreRollGate>
      )}
    </main>
  );
}

export default function LiveWatchPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-4xl mx-auto px-4 py-10 text-slate-400 text-sm">
          Inapakia…
        </main>
      }
    >
      <LiveInner />
    </Suspense>
  );
}
