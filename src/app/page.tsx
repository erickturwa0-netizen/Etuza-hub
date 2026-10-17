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
        <h1 className="text-4xl sm:text-5xl font-extrabold text-violet-300 mb-4">ETUZA HUB</h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mb-8">
          Movies, TV, Tamthilia, Miziki, Radio, Games &amp; VPN — yote pamoja.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 mb-10">
        <h2 className="text-lg font-bold mb-3">Explore</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { href: "/movies", icon: Film, title: "Movies", sub: "Filamu" },
            { href: "/tv", icon: Tv, title: "TV", sub: "Channels" },
            { href: "/drama", icon: Clapperboard, title: "Tamthilia", sub: "Drama" },
            { href: "/music", icon: Music, title: "Miziki", sub: "Audio" },
            { href: "/radio", icon: Radio, title: "Radio", sub: "Live FM" },
            { href: "/games", icon: Gamepad2, title: "Games", sub: "APKs" },
            { href: "/vpn", icon: Shield, title: "VPN", sub: "Configs" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 flex flex-col gap-2"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-violet-400">
                <c.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{c.title}</p>
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
        <Link href={href} className="text-xs text-violet-400 inline-flex items-center gap-1">
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
