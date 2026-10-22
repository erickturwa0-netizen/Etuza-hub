import Link from "next/link";
import { Film } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureElitePlexContent } from "@/lib/eliteplex";
import { getNewContentBanner } from "@/lib/catalog-sync";
import ContentSearch from "@/components/ContentSearch";
import NewContentBanner from "@/components/NewContentBanner";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Movies – ETUZA HUB" };

function yearFromCategory(cat: string | null): number {
  const m = (cat || "").match(/(20\d{2}|19\d{2})/);
  return m ? parseInt(m[1], 10) : 0;
}

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
  }[] = [];
  let bannerTitles: string[] = [];

  try {
    // ALWAYS check tag — replaces old unplayable catalog when tag bumps
    await ensureElitePlexContent("movie");

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
      select: { id: true, title: true, coverUrl: true, category: true },
      take: 120,
    });

    items = raw.sort((a, b) => {
      const ya = yearFromCategory(a.category);
      const yb = yearFromCategory(b.category);
      if (yb !== ya) return yb - ya;
      return a.title.localeCompare(b.title);
    });
  } catch (e) {
    console.error("movies page", e);
  }

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
              {items.length} movies · zinazocheza
            </p>
          </div>
        </div>
        <div className="sm:ml-auto w-full sm:w-auto">
          <Suspense fallback={null}>
            <ContentSearch placeholder="Tafuta movie…" />
          </Suspense>
        </div>
      </div>

      {bannerTitles.length > 0 && <NewContentBanner titles={bannerTitles} />}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {q
              ? `Hakuna matokeo ya "${q}"`
              : "Inapakia movies… fungua tena sekunde chache."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/watch/${c.id}`}
              className="block rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden active:scale-[0.98] transition group touch-manipulation"
            >
              <div className="relative w-full aspect-[2/3] bg-violet-950">
                {c.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.coverUrl}
                    alt={c.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-12 h-12 text-white/20" />
                  </div>
                )}
              </div>
              <div className="p-2.5 sm:p-3">
                <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                  {c.title}
                </p>
                {c.category && (
                  <p className="text-[11px] text-violet-300/80 mt-1 truncate">
                    {c.category}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
