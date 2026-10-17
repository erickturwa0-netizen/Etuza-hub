import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import StreamPlayer from "@/components/StreamPlayer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    status: string;
  } | null = null;

  try {
    item = await prisma.content.findUnique({ where: { id } });
  } catch (e) {
    console.error("watch page", e);
  }

  if (!item) notFound();

  const link = (item.linkUrl || "").trim();

  const isDownloadOnly =
    item.linkType === "download" &&
    (item.type === "game" || item.type === "vpn") &&
    !/archive\.org|youtube|youtu\.be|facebook|\.mp4|\.m3u8|\.mp3/i.test(link);

  if (isDownloadOnly) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex px-5 py-3 rounded-xl bg-violet-600 font-semibold text-sm text-white"
        >
          Download / Open Link
        </a>
      </main>
    );
  }

  const backHref =
    item.type === "movie"
      ? "/movies"
      : item.type === "tv"
        ? "/tv"
        : item.type === "radio"
          ? "/radio"
          : item.type === "music"
            ? "/music"
            : item.type === "drama"
              ? "/drama"
              : item.type === "game"
                ? "/games"
                : "/";

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-slate-400 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold mb-1">{item.title}</h1>
      {item.category && (
        <p className="text-xs text-slate-500 mb-4 uppercase tracking-wide">{item.category}</p>
      )}

      {!link ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Content hii haina stream link kwenye database. Hariri tena kwenye Admin na weka YouTube URL.
        </div>
      ) : (
        <StreamPlayer src={link} poster={item.coverUrl} title={item.title} />
      )}

      {/* Debug: show saved link so user can verify */}
      <p className="mt-3 text-[11px] text-slate-600 break-all">
        Link iliyohifadhiwa: {link || "(tupu)"}
      </p>

      {item.description && (
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">{item.description}</p>
      )}
    </main>
  );
}
