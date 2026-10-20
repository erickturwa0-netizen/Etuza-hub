"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function PlayerInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const url = sp.get("url") || "";
  const title = sp.get("title") || "Player";

  const safe = useMemo(() => {
    try {
      const u = new URL(url);
      if (u.protocol === "https:" || u.protocol === "http:") return url;
    } catch {
      /* ignore */
    }
    return "";
  }, [url]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center gap-3 px-3 py-2 bg-black/90 border-b border-slate-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Rudi
        </button>
        <p className="text-sm text-white font-medium truncate flex-1">{title}</p>
      </div>

      <div className="flex-1 relative min-h-0">
        {safe ? (
          <iframe
            src={safe}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
            allowFullScreen
            referrerPolicy="origin"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Link si sahihi
          </div>
        )}
      </div>
    </div>
  );
}

export default function InAppPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black flex items-center justify-center text-slate-400 text-sm">
          Inapakia player…
        </div>
      }
    >
      <PlayerInner />
    </Suspense>
  );
}
