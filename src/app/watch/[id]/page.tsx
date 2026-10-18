import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import StreamPlayer from "@/components/StreamPlayer";

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

/** True when the URL looks like a direct downloadable file */
function isDirectFile(url: string) {
  return /\.(zip|rar|7z|apk|ipa|iso|cso|mp4|mkv|avi|mov|webm|mp3|flac|pdf|exe|dmg|tar|gz)(\?|$)/i.test(
    url
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
  } catch (e) {
    console.error("watch page", e);
  }

  if (!item) notFound();

  const link = (item.linkUrl || "").trim();
  const backHref = getBackHref(item.type);

  // When admin chose "download", always show download UI instead of player
  if (item.linkType === "download") {
    const forceDownload = isDirectFile(link);
    const filename = forceDownload
      ? decodeURIComponent(link.split("/").pop()?.split("?")[0] || "file")
      : undefined;

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
          <div className="space-y-4">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              {...(forceDownload && filename
                ? { download: filename }
                : {})}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm text-white transition"
            >
              <Download className="w-5 h-5" />
              {forceDownload ? "Download Direct" : "Download / Open Link"}
            </a>

            <p className="text-[11px] text-slate-500 break-all">
              {link}
            </p>
          </div>
        )}

        {item.description && (
          <p className="mt-6 text-sm text-slate-400 leading-relaxed">
            {item.description}
          </p>
        )}
      </main>
    );
  }

  // Stream mode (default)
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
          Content hii haina stream link kwenye database. Hariri tena kwenye Admin
          na weka YouTube URL.
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
