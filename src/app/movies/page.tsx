import { Film } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureElitePlexContent } from "@/lib/eliteplex";
import { getNewContentBanner } from "@/lib/catalog-sync";
import { probeUnknownStreams } from "@/lib/stream-probe";
import ContentSearch from "@/components/ContentSearch";
import NewContentBanner from "@/components/NewContentBanner";
import MediaPosterCard from "@/components/MediaPosterCard";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;
export const metadata = { title: "Movies – ETUZA HUB" };

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim().toLowerCase();

  let items: {
    id: string;
    title: string;
    coverUrl: string | null;
    category: string | null;
    streamStatus?: string | null;
    createdAt?: Date;
  }[] = [];
  let bannerTitles: string[] = [];
  let probeInfo = "";

  try {
    await ensureElitePlexContent("movie");

    // Check many unknowns NOW (parallel) before listing
    try {
      const pr = await probeUnknownStreams("movie", 24);
      if (pr.checked > 0) {
        probeInfo = ` · checked ${pr.checked} (${pr.ok} ok)`;
      }
    } catch {
      /* ignore */
    }

    const banner = await getNewContentBanner();
    if (banner?.titles) bannerTitles = banner.titles;

    const raw = await prisma.content.findMany({
      where: {
        type: "movie",
        status: "published",
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        category: true,
        createdAt: true,
      },
      take: 300,
      orderBy: { createdAt: "desc" },
    });

    let statusMap: Record<string, string> = {};
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id, stream_status FROM "Content" WHERE type = 'movie' AND status = 'published' LIMIT 400`
      )) as { id: string; stream_status: string | null }[];
      for (const r of rows) {
        statusMap[r.id] = (r.stream_status || "unknown").toLowerCase();
      }
    } catch {
      /* ignore */
    }

    const mapped = raw.map((a) => ({
      ...a,
      streamStatus: statusMap[a.id] || "unknown",
    }));

    // Prefer ONLY working at top: ok (newest) → unknown (newest) → bad last
    // When not searching, hide pure "bad" from the main grid so broken don't dominate
    const working = mapped
      .filter((a) => a.streamStatus === "ok")
      .sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
    const unknown = mapped
      .filter((a) => a.streamStatus !== "ok" && a.streamStatus !== "bad")
      .sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
    const broken = mapped
      .filter((a) => a.streamStatus === "bad")
      .sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );

    // Main list: working first (new), then a few unknown; bad only if searching
    if (q) {
      items = [...working, ...unknown, ...broken];
    } else {
      items = [...working, ...unknown.slice(0, 40)];
    }
  } catch (e) {
    console.error("movies page", e);
  }

  const okCount = items.filter((i) => i.streamStatus === "ok").length;

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-4 py-8 pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">Movies</h1>
            <p className="text-sm text-slate-400">
              {okCount} zinazocheza juu · {items.length} zinaonekana
              {probeInfo}
            </p>
          </div>
        </div>
        <Suspense fallback={null}>
          <ContentSearch placeholder="Tafuta movie…" />
        </Suspense>
      </div>

      {bannerTitles.length > 0 && <NewContentBanner titles={bannerTitles} />}

      {items.length === 0 ? (
        <p className="text-slate-500 text-sm mt-8">
          Hakuna movies zinazocheza bado. Fungua tena baada ya sekunde chache.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {items.map((m) => (
            <MediaPosterCard
              key={m.id}
              id={m.id}
              title={m.title}
              coverUrl={m.coverUrl}
              category={m.category}
              kind="movie"
              streamStatus={m.streamStatus}
            />
          ))}
        </div>
      )}
    </main>
  );
}
