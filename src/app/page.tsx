import Link from "next/link";
import {
  Film,
  Gamepad2,
  Shield,
  Tv,
  Radio,
  Music,
  Clapperboard,
  ArrowRight,
} from "lucide-react";
import ContentCard from "@/components/ContentCard";
import { getPublishedContent } from "@/lib/content";

export const dynamic = "force-dynamic";

const CATS = [
  {
    href: "/movies",
    icon: Film,
    title: "Movies",
    sub: "Filamu",
    grad: "from-violet-500 to-purple-700",
  },
  {
    href: "/tv",
    icon: Tv,
    title: "TV",
    sub: "Channels",
    grad: "from-red-500 to-orange-600",
  },
  {
    href: "/drama",
    icon: Clapperboard,
    title: "Tamthilia",
    sub: "Drama",
    grad: "from-amber-500 to-orange-700",
  },
  {
    href: "/music",
    icon: Music,
    title: "Miziki",
    sub: "Audio",
    grad: "from-fuchsia-500 to-pink-600",
  },
  {
    href: "/radio",
    icon: Radio,
    title: "Radio",
    sub: "Live FM",
    grad: "from-rose-500 to-red-600",
  },
  {
    href: "/games",
    icon: Gamepad2,
    title: "Games",
    sub: "Play & APK",
    grad: "from-emerald-500 to-teal-600",
  },
  {
    href: "/vpn",
    icon: Shield,
    title: "VPN",
    sub: "Configs",
    grad: "from-blue-500 to-indigo-700",
  },
];

export default async function HomePage() {
  const [movies, tvs, dramas, music, radios, games, vpns] = await Promise.all([
    getPublishedContent("movie"),
    getPublishedContent("tv"),
    getPublishedContent("drama"),
    getPublishedContent("music"),
    getPublishedContent("radio"),
    getPublishedContent("game"),
    getPublishedContent("vpn"),
  ]);

  return (
    <main className="flex-1">
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-12 text-center">
        <p className="inline-block text-xs font-medium text-violet-300 bg-violet-950 border border-violet-800 rounded-full px-3 py-1 mb-5">
          Premium · Tanzania
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent mb-4">
          ETUZA HUB
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mb-8">
          Movies, TV, Tamthilia, Miziki, Radio, Games &amp; VPN — yote pamoja.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 mb-10">
        <h2 className="text-lg font-bold mb-3">Explore</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {CATS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-3 hover:border-violet-500/40 transition group"
            >
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition`}
              >
                <c.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{c.title}</p>
                <p className="text-[11px] text-slate-500">{c.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {movies.length > 0 && (
        <Section title="Movies" href="/movies" items={movies.slice(0, 4)} />
      )}
      {dramas.length > 0 && (
        <Section title="Tamthilia" href="/drama" items={dramas.slice(0, 4)} />
      )}
      {music.length > 0 && (
        <Section title="Miziki" href="/music" items={music.slice(0, 4)} />
      )}
      {tvs.length > 0 && <Section title="TV" href="/tv" items={tvs.slice(0, 4)} />}
      {radios.length > 0 && (
        <Section title="Radio" href="/radio" items={radios.slice(0, 4)} />
      )}
      {games.length > 0 && (
        <Section title="Games" href="/games" items={games.slice(0, 4)} />
      )}
      {vpns.length > 0 && <Section title="VPN" href="/vpn" items={vpns.slice(0, 4)} />}
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
    <section className="max-w-6xl mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link
          href={href}
          className="text-xs text-violet-400 inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((c) => (
          <ContentCard
            key={c.id}
            id={c.id}
            title={c.title}
            type={c.type}
            category={c.category}
            coverUrl={c.cover_url}
            linkType={c.link_type}
          />
        ))}
      </div>
    </section>
  );
}
