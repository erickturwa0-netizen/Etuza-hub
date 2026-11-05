import { Bot } from "lucide-react";
import AiAgentPanel from "@/components/AiAgentPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Agent – ETUZA HUB" };

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ ctx?: string }>;
}) {
  const sp = await searchParams;
  const ctx = (sp.ctx || "").trim();
  const label =
    ctx === "movie"
      ? "Movies"
      : ctx === "tv"
        ? "TV"
        : ctx === "music"
          ? "Miziki"
          : ctx === "radio"
            ? "Radio"
            : ctx === "drama"
              ? "Tamthilia"
              : ctx === "game"
                ? "Games"
                : ctx || undefined;

  return (
    <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 pb-28">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Agent</h1>
          <p className="text-xs text-slate-400">
            Inception mercury-3 · browser · scrape · attachments
            {label ? ` · ${label}` : ""}
          </p>
        </div>
      </div>
      <AiAgentPanel contextLabel={label} fullPage />
    </main>
  );
}
