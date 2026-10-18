import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import StreamPlayer from "@/components/StreamPlayer";
import GameDownloadPanel from "@/components/GameDownloadPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBackHref(type: string) {
  if (type === "movie") return "/movies";
  if (type === "tv") return "/tv";
  if (type === "radio") return "/radio";
  if (type === "music") return "/music";
  if (type === "drama") return "/drama";
  if (type === "game") return "/games";
  if (type === "vpn") return "/vpn";
  return "/";
}

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
  const backHref = getBackHref(item.type);

  const forceDownloadUi =
    item.linkType === "download" ||
    item.type === "game" ||
    item.type === "vpn";

  if (forceDownloadUi) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-slate-400 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
        {item.category && (
          <p className="text-xs text-slate-500 mb-4 uppercase tracking-wide">
            {item.category}
          </p>
        )}

        {item.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt=""
            className="w-full max-w-xs rounded-2xl border border-slate-800 mb-6 object-cover"
          />
        )}

        {!link ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Content hii haina download link. Hariri tena kwenye Admin.
          </div>
        ) : (
          <GameDownloadPanel linkUrl={link} title={item.title} />
        )}

        {item.description && (
          <p className="mt-6 text-sm text-slate-400 leading-relaxed">
            {item.description}
          </p>
        )}
      </main>
    );
  }

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
        <p className="text-xs text-slate-500 mb-4 uppercase tracking-wide">
          {item.category}
        </p>
      )}

      {!link ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Content hii haina stream link. Hariri tena kwenye Admin.
        </div>
      ) : (
        <StreamPlayer src={link} poster={item.coverUrl} title={item.title} />
      )}

      <p className="mt-3 text-[11px] text-slate-600 break-all">
        Link iliyohifadhiwa: {link || "(tupu)"}
      </p>

      {item.description && (
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
          {item.description}
        </p>
      )}
    </main>
  );
}
