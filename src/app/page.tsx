import Link from "next/link";
import { Film, Gamepad2, Shield, ArrowRight } from "lucide-react";
import ContentCard from "@/components/ContentCard";
import { getPublished } from "@/lib/mock-data";

export default function HomePage() {
  const movies = getPublished("movie").slice(0, 4);
  const games = getPublished("game").slice(0, 4);
  const vpns = getPublished("vpn").slice(0, 4);

  return (
    <main className="flex-1">
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-12 text-center">
        <p className="inline-block text-xs font-medium text-violet-300 bg-violet-950 border border-violet-800 rounded-full px-3 py-1 mb-5">
          Premium · Tanzania
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-violet-300 mb-4">
          ETUZA HUB
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto mb-8">
          Movies, Games &amp; VPN configs — yote mahali pamoja.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/movies"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 font-semibold text-sm text-white"
          >
            <Film className="w-5 h-5" />
            Tazama Movies
          </Link>
          <Link
            href="/games"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 font-semibold text-sm"
          >
            <Gamepad2 className="w-5 h-5" />
            Download Games
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 mb-10">
        <h2 className="text-lg font-bold mb-3">Explore</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/movies", icon: Film, title: "Movies", sub: "Stream films" },
            { href: "/games", icon: Gamepad2, title: "Games", sub: "Android APKs" },
            { href: "/vpn", icon: Shield, title: "VPN", sub: "Zero-rated" },
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

      <Section title="Featured Movies" href="/movies" items={movies} />
      <Section title="Popular Games" href="/games" items={games} />
      <Section title="VPN Configs" href="/vpn" items={vpns} />
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
  items: ReturnType<typeof getPublished>;
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
