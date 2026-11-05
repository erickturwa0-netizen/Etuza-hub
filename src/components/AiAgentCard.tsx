"use client";

import Link from "next/link";
import { Bot, Sparkles, Globe, Paperclip } from "lucide-react";

/** Card shown at top of Movies / TV / Music / Radio / Drama / Games lists */
export default function AiAgentCard({
  context = "general",
}: {
  context?: string;
}) {
  const href =
    context && context !== "general"
      ? `/ai?ctx=${encodeURIComponent(context)}`
      : "/ai";

  return (
    <Link
      href={href}
      className="block mb-5 rounded-2xl border border-violet-500/40 bg-gradient-to-r from-violet-950/80 via-slate-900 to-fuchsia-950/50 p-4 sm:p-5 hover:border-violet-400/60 transition shadow-lg shadow-violet-950/30"
    >
      <div className="flex items-start gap-3">
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-600/30">
          <Bot className="w-6 h-6 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-white">
              ETUZA AI Agent
            </h2>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-500/30">
              Inception · mercury-3
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            Uliza, fungua link, scrape web, au pakia faili — agent ana tools za
            browser + HTTP.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-black/30 text-slate-300 border border-white/10">
              <Globe className="w-3 h-3 text-sky-400" /> Browser / scrape
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-black/30 text-slate-300 border border-white/10">
              <Paperclip className="w-3 h-3 text-amber-400" /> Attachments
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-black/30 text-slate-300 border border-white/10">
              <Sparkles className="w-3 h-3 text-fuchsia-400" /> Chat agent
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
