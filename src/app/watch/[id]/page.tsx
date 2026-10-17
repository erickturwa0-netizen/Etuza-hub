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

  let item = null;
  try {
    item = await prisma.content.findFirst({
      where: {
        id,
        OR: [{ status: "published" }, { status: "draft" }],
      },
    });
  } catch (e) {
    console.error("watch page", e);
  }

  if (!item) notFound();

  // Download-only types: show button, still try player if URL looks like media
  const isDownloadOnly =
    item.linkType === "download" &&
    (item.type === "game" || item.type === "vpn") &&
    !/archive\.org|\.mp4|\.m3u8|\.mp3/i.test(item.linkUrl);

  if (isDownloadOnly) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
        {item.description && (
          <p className="text-slate-400 text-sm mb-6">{item.description}</p>
        )}
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

  const backHref =
    item.type === "movie"
      ? "/movies"
      : item.type === "tv"
        ? "/tv"
        : item.type === "radio"
          ? "/radio"
          : item.type === "game"
            ? "/games"
            : "/";

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-slate-400 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold mb-1">{item.title}</h1>
      {item.category && (
        <p className="text-xs text-slate-500 mb-4 uppercase tracking-wide">
          {item.category}
        </p>
      )}

      <StreamPlayer
        src={item.linkUrl}
        poster={item.coverUrl}
        title={item.title}
      />

      {item.description && (
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
          {item.description}
        </p>
      )}
    </main>
  );
}
