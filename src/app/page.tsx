import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import ContentCard from "@/components/ContentCard";
import HomeHeroSlideshow, { type HeroSlide } from "@/components/HomeHeroSlideshow";
import { getPublishedContent } from "@/lib/content";
import { contentCover } from "@/lib/covers";
import { PINNED_CHANNELS } from "@/lib/iptv";
import { CATEGORY_ICONS } from "@/lib/category-icons";

export const dynamic = "force-dynamic";

const CATS: { href: string; title: string; iconUrl: string }[] = [
  { href: "/movies", title: "Movies", iconUrl: CATEGORY_ICONS.movie },
  { href: "/tv", title: "TV", iconUrl: CATEGORY_ICONS.tv },
  { href: "/drama", title: "Tamthilia", iconUrl: CATEGORY_ICONS.drama },
  { href: "/music", title: "Miziki", iconUrl: CATEGORY_ICONS.music },
  { href: "/radio", title: "Radio", iconUrl: CATEGORY_ICONS.radio },
  { href: "/games", title: "Games", iconUrl: CATEGORY_ICONS.game },
  { href: "/vpn", title: "VPN", iconUrl: CATEGORY_ICONS.vpn },
];

export default async function HomePage() {
  const [movies, dramas, music, radios, games, vpns] = await Promise.all([
    getPublishedContent("movie"),
    getPublishedContent("drama"),
    getPublishedContent("music"),
    getPublishedContent("radio"),
    getPublishedContent("game"),
    getPublishedContent("vpn"),
  ]);

  const slides: HeroSlide[] = [];

  for (const m of movies.slice(0, 6)) {
    slides.push({
      id: m.id,
      title: m.title,
      cover: contentCover("movie", m.title, m.cover_url),
      href: `/watch/${m.id}`,
      kind: "movie",
      category: m.category,
    });
  }
  for (const d of dramas.slice(0, 2)) {
    slides.push({
      id: d.id,
      title: d.title,
      cover: contentCover("drama", d.title, d.cover_url),
      href: `/watch/${d.id}`,
      kind: "drama",
      category: d.category,
    });
  }
  for (const ch of PINNED_CHANNELS.slice(0, 2)) {
    slides.push({
      id: ch.id,
      title: ch.title,
      cover: ch.logo || contentCover("tv", ch.title, null),
      href: `/watch/live?url=${encodeURIComponent(ch.url)}&title=${encodeURIComponent(ch.title)}`,
      kind: "tv",
      category: ch.group,
    });
  }

  const trending = [
    ...movies.slice(0, 8),
    ...dramas.slice(0, 4),
  ].slice(0, 12);

  return (
    <main className="flex-1 pb-10 bg-[#0a0a0f]">
      {/* Full-bleed hero */}
      <section className="w-full">
        <HomeHeroSlideshow slides={slides} />
      </section>

      {/* Quick categories — compact pills under hero */}
      <section className="max-w-7xl mx-auto px-3 sm:px-5 -mt-2 sm:mt-4 relative z-10">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="shrink-0 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.iconUrl}
                alt=""
                className="w-5 h-5 object-contain"
              />
              <span className="text-xs font-semibold text-white">{c.title}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Now */}
      {trending.length > 0 && (
        <MediaRow
          title="Trending Now"
          href="/movies"
          items={trending}
        />
      )}

      {movies.length > 0 && (
        <MediaRow title="Movies" href="/movies" items={movies.slice(0, 14)} />
      )}

      {dramas.length > 0 && (
        <MediaRow
          title="Popular Tamthilia"
          href="/drama"
          items={dramas.slice(0, 14)}
        />
      )}

      {/* TV row */}
      <section className="max-w-7xl mx-auto px-3 sm:px-5 pt-6 pb-2">
        <div className="flex items-end justify-between mb-3 gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Live TV
          </h2>
          <Link
            href="/tv"
            className="text-xs sm:text-sm text-red-400 hover:text-red-300 inline-flex items-center gap-1 font-medium"
          >
            See All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x scrollbar-none">
          {PINNED_CHANNELS.slice(0, 12).map((ch) => (
            <Link
              key={ch.id}
              href={`/watch/live?url=${encodeURIComponent(ch.url)}&title=${encodeURIComponent(ch.title)}`}
              className="snap-start shrink-0 w-[100px] sm:w-[120px] group"
            >
              <div className="aspect-square rounded-xl border border-white/10 bg-gradient-to-b from-slate-900 to-black overflow-hidden flex items-center justify-center p-3 transition group-hover:border-red-500/40 group-hover:scale-[1.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ch.logo || contentCover("tv", ch.title, null)}
                  alt={ch.title}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-200 mt-1.5 truncate text-center font-medium">
                {ch.title}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {music.length > 0 && (
        <MediaRow title="Miziki" href="/music" items={music.slice(0, 12)} />
      )}
      {radios.length > 0 && (
        <MediaRow title="Radio" href="/radio" items={radios.slice(0, 10)} />
      )}
      {games.length > 0 && (
        <MediaRow title="Games" href="/games" items={games.slice(0, 8)} />
      )}
      {vpns.length > 0 && (
        <MediaRow title="VPN" href="/vpn" items={vpns.slice(0, 6)} />
      )}

      {/* CTA strip */}
      <section className="max-w-7xl mx-auto px-3 sm:px-5 py-10">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-red-950/40 via-slate-900 to-violet-950/30 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Epic Adventures</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              Stream the best movies, TV & miziki — anytime on ETUZA HUB.
            </p>
          </div>
          <Link
            href="/movies"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition shadow-lg shadow-red-900/30"
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </Link>
        </div>
      </section>
    </main>
  );
}

function MediaRow({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: Awaited<ReturnType<typeof getPublishedContent>>;
}) {
  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-5 pt-6 pb-1">
      <div className="flex items-end justify-between mb-3 gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          {title}
        </h2>
        <Link
          href={href}
          className="text-xs sm:text-sm text-red-400 hover:text-red-300 inline-flex items-center gap-1 font-medium shrink-0"
        >
          See All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 sm:gap-3.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x scrollbar-none">
        {items.map((c) => (
          <div
            key={c.id}
            className="snap-start shrink-0 w-[118px] sm:w-[140px] md:w-[152px]"
          >
            <ContentCard
              id={c.id}
              title={c.title}
              type={c.type}
              category={c.category}
              coverUrl={c.cover_url}
              linkType={c.link_type}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
