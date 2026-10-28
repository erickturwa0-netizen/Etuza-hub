import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import StreamPlayer from "@/components/StreamPlayer";
import AudioPlayer from "@/components/AudioPlayer";
import PreRollGate from "@/components/PreRollGate";
import GameDownloadPanel from "@/components/GameDownloadPanel";
import PresenceTracker from "@/components/PresenceTracker";
import WebGamePlayer from "@/components/WebGamePlayer";
import WatchPaywallGate from "@/components/WatchPaywallGate";
import PlaybackReportForm from "@/components/PlaybackReportForm";

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

  const link = (item.fileUrl || item.linkUrl || "").trim();
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

  const contentKey = `${item.type}:${item.id}`;
  const isDownload = item.linkType === "download" || item.type === "vpn";
  const isWebGame =
    item.type === "game" &&
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
    if (isWebGame) {
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
          <GameDownloadPanel linkUrl={link} title={item.title} />
        </>
      );
    }
    if (!link) {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Content hii haina stream link.
        </div>
      );
    }
    if (item.type === "radio" || item.type === "music") {
      return (
        <PreRollGate
          contentKey={contentKey}
          title={item.title}
          enabled={usePointsGate}
        >
          <AudioPlayer
            src={link}
            title={item.title}
            coverUrl={item.coverUrl}
            kind={item.type === "radio" ? "radio" : "music"}
          />
          {reportForm}
        </PreRollGate>
      );
    }
    return (
      <PreRollGate
        contentKey={contentKey}
        title={item.title}
        enabled={usePointsGate}
      >
        <div className="w-full max-w-full overflow-hidden">
          <StreamPlayer
            src={link}
            poster={item.coverUrl}
            title={item.title}
            contentKey={contentKey}
          />
        </div>
        {reportForm}
      </PreRollGate>
    );
  })();

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-28 overflow-x-hidden">
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

      <WatchPaywallGate
        contentId={item.id}
        title={item.title}
        priceMode={item.priceMode}
        priceTzs={item.priceTzs}
        contentType={item.type}
      >
        {body}
      </WatchPaywallGate>

      {item.description && (
        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
          {item.description}
        </p>
      )}
    </main>
  );
}
