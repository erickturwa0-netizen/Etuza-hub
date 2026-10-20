"use client";

import { useState } from "react";
import { Maximize2, ExternalLink, Gamepad2 } from "lucide-react";

export default function WebGamePlayer({
  src,
  title,
}: {
  src: string;
  title?: string;
}) {
  const [full, setFull] = useState(false);

  if (!src) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
        Hakuna game link.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-black ${
          full ? "fixed inset-0 z-[90] rounded-none border-0" : ""
        }`}
        style={full ? undefined : { aspectRatio: "16/10", minHeight: 280 }}
      >
        <iframe
          src={src}
          title={title || "Game"}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; fullscreen; gamepad; clipboard-write"
          allowFullScreen
          referrerPolicy="origin"
        />
        {full && (
          <button
            type="button"
            onClick={() => setFull(false)}
            className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-black/70 text-white text-xs border border-white/20"
          >
            Funga
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFull(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
        >
          <Maximize2 className="w-4 h-4" />
          Cheza full screen
        </button>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm text-slate-200"
        >
          <ExternalLink className="w-4 h-4" />
          Fungua game
        </a>
      </div>

      <p className="text-[11px] text-slate-500 flex items-center gap-1">
        <Gamepad2 className="w-3.5 h-3.5" />
        Web game · inacheza ndani ya app
      </p>
    </div>
  );
}
