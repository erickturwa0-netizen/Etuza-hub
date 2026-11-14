"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function NewContentBanner({
  titles,
}: {
  titles: string[];
}) {
  const [open, setOpen] = useState(true);
  if (!open || !titles.length) return null;

  return (
    <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/50 px-4 py-3 flex gap-3 items-start shadow-lg shadow-emerald-900/20">
      <span className="text-xl shrink-0 mt-0.5" aria-hidden>
        🎉
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-emerald-200">
          Content mpya zimeingia!
        </p>
        <p className="text-xs text-emerald-100/85 mt-1 line-clamp-3">
          {titles.slice(0, 8).join(" · ")}
          {titles.length > 8 ? " …" : ""}
        </p>
        <p className="text-[10px] text-emerald-300/60 mt-1">
          Movies · Tamthilia · Miziki · TV · Radio · Games · VPN
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-emerald-300/70 hover:text-white p-1"
        aria-label="Funga"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
