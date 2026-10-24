import Link from "next/link";
import {
  Gamepad2,
  Shield,
  ArrowRight,
} from "lucide-react";
import ContentCard from "@/components/ContentCard";
import HomeHeroSlideshow, { type HeroSlide } from "@/components/HomeHeroSlideshow";
import { getPublishedContent } from "@/lib/content";
import { contentCover } from "@/lib/covers";
import { PINNED_CHANNELS } from "@/lib/iptv";
import { CATEGORY_ICONS } from "@/lib/category-icons";

export const dynamic = "force-dynamic";

const CATS: {
  href: string;
  title: string;
  iconUrl?: string;
  lucide?: typeof Gamepad2;
  grad: string;
}[] = [
  {
    href: "/movies",
    title: "Movies",
    iconUrl: CATEGORY_ICONS.movie,
    grad: "from-violet-500 to-purple-700",
  },
  {
    href: "/tv",
    title: "TV",
    iconUrl: CATEGORY_ICONS.tv,
    grad: "from-red-500 to-orange-600",
  },
  {
    href: "/drama",
    title: "Tamthilia",
    iconUrl: CATEGORY_ICONS.drama,
    grad: "from-amber-500 to-orange-700",
  },
  {
    href: "/music",
    title: "Miziki",
    iconUrl: CATEGORY_ICONS.music,
    grad: "from-fuchsia-500 to-pink-600",
  },
  {
    href: "/radio",
    title: "Radio",
    iconUrl: CATEGORY_ICONS.radio,
    grad: "from-rose-500 to-red-600",
  },
  {
    href: "/games",
    title: "Games",
    lucide: Gamepad2,
    grad: "from-emerald-500 to-teal-600",
  },
  {
    href: "/vpn",
    title: "VPN",
    lucide: Shield,
    grad: "from-blue-500 to-indigo-700",
  },
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

  for (const m of movies.slice(0, 4)) {
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
  for (const m of music.slice(0, 2)) {
    slides.push({
      id: m.id,
      title: m.title,
      cover: contentCover("music", m.title, m.cover_url),
      href: `/watch/${m.id}`,
      kind: "music",
      category: m.category,
    });
  }
  for (const r of radios.slice(0, 1)) {
    slides.push({
      id: r.id,
      title: r.title,
      cover: contentCover("radio", r.title, r.cover_url),
      href: `/watch/${r.id}`,
      kind: "radio",
      category: r.category,
    });
  }
  for (const ch of PINNED_CHANNELS.slice(0, 3)) {
    slides.push({
      id: ch.id,
      title: ch.title,
      cover: ch.logo || contentCover("tv", ch.title, null),
      href: `/watch/live?url=${encodeURIComponent(ch.url)}&title=${encodeURIComponent(ch.title)}`,
      kind: "tv",
      category: ch.group,
    });
  }

  return (
    <main className="flex-1 pb-8">
      <section className="max-w-6xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        <div className="mb-3">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            ETUZA HUB
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Movies · TV · Tamthilia · Miziki · Radio
          </p>
        </div>
        <HomeHeroSlideshow slides={slides} />
      </section>

      <section className="max-w-6xl mx-auto px-3 sm:px-4 mt-6 mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Explore
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
          {CATS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 sm:p-3 flex flex-col items-center gap-1.5 hover:border-violet-500/40 transition text-center"
            >
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-md overflow-hidden p-1.5`}
              >
                {c.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.iconUrl}
                    alt={c.title}
                    className="w-full h-full object-contain"
                  />
                ) : c.lucide ? (
                  <c.lucide className="w-5 h-5 text-white" />
                ) : null}
              </div>
              <p className="font-medium text-[11px] sm:text-xs text-white leading-tight">
                {c.title}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {movies.length > 0 && (
        <Section title="Movies" href="/movies" items={movies.slice(0, 6)} />
      )}
      {dramas.length > 0 && (
        <Section title="Tamthilia" href="/drama" items={dramas.slice(0, 6)} />
      )}
      {music.length > 0 && (
        <Section title="Miziki" href="/music" items={music.slice(0, 6)} />
      )}

      <section className="max-w-6xl mx-auto px-3 sm:px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">TV Channels</h2>
          <Link
            href="/tv"
            className="text-xs text-violet-400 inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {PINNED_CHANNELS.slice(0, 10).map((ch) => (
            <Link
              key={ch.id}
              href={`/watch/live?url=${encodeURIComponent(ch.url)}&title=${encodeURIComponent(ch.title)}`}
              className="snap-start shrink-0 w-[100px] sm:w-[112px]"
            >
              <div className="aspect-square rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ch.logo || contentCover("tv", ch.title, null)}
                  alt={ch.title}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-white mt-1.5 truncate text-center">
                {ch.title}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {radios.length > 0 && (
        <Section title="Radio" href="/radio" items={radios.slice(0, 6)} />
      )}
      {games.length > 0 && (
        <Section title="Games" href="/games" items={games.slice(0, 4)} />
      )}
      {vpns.length > 0 && (
        <Section title="VPN" href="/vpn" items={vpns.slice(0, 4)} />
      )}
    </main>
  );
}

function Section({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: Awaited<ReturnType<typeof getPublishedContent>>;
}) {
  return (
    <section className="max-w-6xl mx-auto px-3 sm:px-4 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <Link
          href={href}
          className="text-xs text-violet-400 inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {items.map((c) => (
          <div key={c.id} className="snap-start shrink-0 w-[120px] sm:w-[140px]">
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
