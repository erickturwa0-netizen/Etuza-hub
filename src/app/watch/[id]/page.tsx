import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import StreamPlayer from "@/components/StreamPlayer";
import AudioPlayer from "@/components/AudioPlayer";
import MusicVideoPlayer from "@/components/MusicVideoPlayer";
import PreRollGate from "@/components/PreRollGate";
import GameDownloadPanel from "@/components/GameDownloadPanel";
import PresenceTracker from "@/components/PresenceTracker";
import WebGamePlayer from "@/components/WebGamePlayer";
import WatchPaywallGate from "@/components/WatchPaywallGate";
import PlaybackReportForm from "@/components/PlaybackReportForm";
import { isVideoMusicLink } from "@/lib/social-embed";

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
    priceMode?: string;
    priceTzs?: number;
    fileUrl?: string | null;
  } | null = null;

  try {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        title: string;
        description: string | null;
        link_url: string;
        link_type: string;
        type: string;
        cover_url: string | null;
        category: string | null;
        status: string;
      }[]
    >`
      SELECT id, title, description, link_url, link_type, type, cover_url,
             category, status
      FROM "Content"
      WHERE id = ${id}
      LIMIT 1
    `;
    if (rows[0]) {
      const r = rows[0];
      item = {
        id: r.id,
        title: r.title,
        description: r.description,
        linkUrl: r.link_url,
        linkType: r.link_type,
        type: r.type,
        coverUrl: r.cover_url,
        category: r.category,
        status: r.status,
        fileUrl: null,
      };
    }
  } catch (e) {
    console.error("watch page raw", e);
    try {
      item = await prisma.content.findUnique({ where: { id } });
    } catch (e2) {
      console.error("watch page prisma", e2);
    }
  }

  if (!item || item.status === "draft") notFound();

  const link = (item.fileUrl || item.linkUrl || "").trim();
  const backHref = getBackHref(item.type);
  const contentKey = `${item.type}:${item.id}`;
  const isDownload = item.linkType === "download" || item.type === "vpn";
  const isWebGame =
    item.linkType !== "download" &&
    (item.linkType === "stream" || isWebGameUrl(link));
  const isGameDownload = item.type === "game" && isDownload;
  const usePointsGate =
    item.type === "movie" ||
    item.type === "drama" ||
    item.type === "tv" ||
    item.type === "music" ||
    item.type === "radio";

  const reportForm = (
    <PlaybackReportForm
      contentKey={contentKey}
      contentTitle={item.title}
      contentType={item.type}
      contentId={item.id}
    />
  );

  const body = (() => {
    if (isGameDownload || item.type === "vpn") {
      return (
        <>
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
        </>
      );
    }
    if (item.type === "game" && isWebGameUrl(link)) {
      return <WebGamePlayer src={link} title={item.title} />;
    }
    if (item.type === "game") {
      return (
        <>
          {item.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverUrl}
              alt=""
              className="w-full max-w-xs rounded-2xl border border-slate-800 mb-6 object-cover"
            />
          )}
          {link ? (
            <GameDownloadPanel linkUrl={link} title={item.title} />
          ) : (
            <p className="text-slate-400 text-sm">Hakuna link.</p>
          )}
        </>
      );
    }
    if (item.type === "music" && isVideoMusicLink(link)) {
      return <MusicVideoPlayer src={link} title={item.title} />;
    }
    if (item.type === "music" || item.type === "radio") {
      return <AudioPlayer src={link} title={item.title} />;
    }
    // movie / drama / tv — video stream (YouTube etc.)
    return <StreamPlayer src={link} title={item.title} poster={item.coverUrl} />;
  })();

  const gated = usePointsGate ? (
    <WatchPaywallGate contentId={item.id} contentType={item.type}>
      <PreRollGate>{body}</PreRollGate>
    </WatchPaywallGate>
  ) : (
    body
  );

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-5 py-4 pb-24">
      <PresenceTracker section={item.type} title={item.title} />
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Rudi
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{item.title}</h1>
      {item.category && (
        <p className="text-xs text-slate-500 mb-4">{item.category}</p>
      )}
      {item.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-3">{item.description}</p>
      )}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
        {gated}
      </div>
      <div className="mt-4">{reportForm}</div>
    </main>
  );
}
