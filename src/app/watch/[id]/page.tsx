import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import StreamPlayer from "@/components/StreamPlayer";
import PreRollGate from "@/components/PreRollGate";
import GameDownloadPanel from "@/components/GameDownloadPanel";
import PresenceTracker from "@/components/PresenceTracker";
import WebGamePlayer from "@/components/WebGamePlayer";

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

function isWebGameUrl(url: string) {
  const u = url.toLowerCase();
  return (
    u.includes("crazygames.com") ||
    u.includes("poki.com") ||
    u.includes("itch.io") ||
    u.includes("gamejolt.com") ||
    u.includes("html5") ||
    (u.includes("play.google") === false &&
      (/\/embed|\/game\//i.test(u) || u.endsWith(".html")))
  );
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
    if (item) {
      prisma.content
        .update({
          where: { id },
          data: { viewsCount: { increment: 1 } },
        })
        .catch(() => {});
    }
  } catch (e) {
    console.error("watch page", e);
  }

  if (!item) notFound();

  const link = (item.linkUrl || "").trim();
  const backHref = getBackHref(item.type);
  const section =
    item.type === "drama"
      ? "drama"
      : item.type === "game"
        ? "game"
        : item.type === "music"
          ? "music"
          : item.type === "movie"
            ? "movie"
            : item.type === "tv"
              ? "tv"
              : item.type;

  const isDownload = item.linkType === "download" || item.type === "vpn";

  const isWebGame =
    item.type === "game" &&
    item.linkType !== "download" &&
    (item.linkType === "stream" || isWebGameUrl(link));

  const isGameDownload = item.type === "game" && isDownload;

  // Points + ad gate for streamable media
  const usePointsGate =
    item.type === "movie" ||
    item.type === "drama" ||
    item.type === "tv" ||
    item.type === "music" ||
    item.type === "radio";

  if (isGameDownload || item.type === "vpn") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 pb-28">
        <PresenceTracker section={section} title={item.title} />
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-slate-400 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold mb-2 text-white">{item.title}</h1>
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
            Content hii haina download link.
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

  if (isWebGame) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6 pb-28">
        <PresenceTracker section="game" title={item.title} />
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-slate-400 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold mb-1 text-white">{item.title}</h1>
        {item.category && (
          <p className="text-xs text-slate-500 mb-4 uppercase tracking-wide">
            {item.category}
          </p>
        )}
        <WebGamePlayer src={link} title={item.title} />
        {item.description && (
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            {item.description}
          </p>
        )}
      </main>
    );
  }

  if (item.type === "game") {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8 pb-28">
        <PresenceTracker section="game" title={item.title} />
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-slate-400 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold mb-2 text-white">{item.title}</h1>
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
        <GameDownloadPanel linkUrl={link} title={item.title} />
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
      <PresenceTracker section={section} title={item.title} />
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-slate-400 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold mb-1 text-white">{item.title}</h1>
      {item.category && (
        <p className="text-xs text-slate-500 mb-4 uppercase tracking-wide">
          {item.category}
        </p>
      )}

      {!link ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Content hii haina stream link.
        </div>
      ) : (
        <PreRollGate
          contentKey={`${item.type}:${item.id}`}
          title={item.title}
          enabled={usePointsGate}
        >
          <StreamPlayer src={link} poster={item.coverUrl} title={item.title} />
        </PreRollGate>
      )}

      {item.description && (
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
          {item.description}
        </p>
      )}
    </main>
  );
}
