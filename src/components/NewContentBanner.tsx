"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

export default function NewContentBanner({
  titles,
}: {
  titles: string[];
}) {
  const [open, setOpen] = useState(true);
  if (!open || !titles.length) return null;

  return (
    <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 flex gap-3 items-start">
      <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-emerald-200">
          Movie / content mpya zimekuja!
        </p>
        <p className="text-xs text-emerald-100/80 mt-1 line-clamp-2">
          {titles.slice(0, 6).join(" · ")}
          {titles.length > 6 ? " …" : ""}
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
