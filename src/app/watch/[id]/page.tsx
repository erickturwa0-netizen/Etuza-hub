import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import StreamPlayer from "@/components/StreamPlayer";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let item: {
    id: string;
    title: string;
    description: string | null;
    linkUrl: string;
    linkType: string;
    type: string;
    coverUrl: string | null;
    category: string | null;
  } | null = null;

  try {
    item = await prisma.content.findUnique({ where: { id } });
  } catch {
    item = null;
  }

  if (!item || item.status === "draft") {
    // try without status check for admin preview — only published for public
  }

  if (!item) notFound();

  if (item.linkType === "download" || item.type === "game" || item.type === "vpn") {
    // redirect-style: show download link
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
        {item.description && <p className="text-slate-400 text-sm mb-6">{item.description}</p>}
        <a
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex px-5 py-3 rounded-xl bg-violet-600 font-semibold text-sm text-white"
        >
          Download / Open Link
        </a>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <Link href={`/${item.type === "movie" ? "movies" : item.type === "tv" ? "tv" : item.type === "radio" ? "radio" : ""}`} className="inline-flex items-center gap-2 text-sm text-slate-400 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold mb-1">{item.title}</h1>
      {item.category && (
        <p className="text-xs text-slate-500 mb-4 uppercase tracking-wide">{item.category}</p>
      )}

      <StreamPlayer src={item.linkUrl} poster={item.coverUrl} title={item.title} />

      {item.description && (
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">{item.description}</p>
      )}

      <p className="mt-3 text-[11px] text-slate-600 break-all">Source: {item.linkUrl}</p>
    </main>
  );
}
