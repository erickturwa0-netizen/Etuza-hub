import Link from "next/link";
import { Film, Gamepad2, Shield, ArrowRight, Sparkles } from "lucide-react";
import ContentCard from "@/components/ContentCard";
import { getPublished } from "@/lib/mock-data";

export default function HomePage() {
  const movies = getPublished("movie").slice(0, 4);
  const games = getPublished("game").slice(0, 4);
  const vpns = getPublished("vpn").slice(0, 4);

  return (
    <main className="flex-1">
      {/* Hero – no heavy blur (cross-browser safe) */}
      <section className="relative">
        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-14 sm:pt-20 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Premium · Tanzania
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 leading-[1.05]">
            <span className="gradient-text">ETUZA HUB</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-xl mx-auto mb-9 leading-relaxed">
            Movies, Games &amp; VPN configs — yote mahali pamoja.
            Platform ya kisasa kwa watumiaji wa Tanzania.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/movies"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm shadow-lg shadow-violet-600/25 transition"
            >
              <Film className="w-5 h-5" />
              Tazama Movies
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/10 font-semibold text-sm transition"
            >
              <Gamepad2 className="w-5 h-5" />
              Download Games
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 mb-12">
        <h2 className="text-lg font-bold mb-4">Explore</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/movies", icon: Film, title: "Movies", sub: "Stream films", bg: "bg-violet-500/20 text-violet-400" },
            { href: "/games", icon: Gamepad2, title: "Games", sub: "Android APKs", bg: "bg-emerald-500/20 text-emerald-400" },
            { href: "/vpn", icon: Shield, title: "VPN", sub: "Zero-rated", bg: "bg-blue-500/20 text-blue-400" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-2xl border border-white/10 bg-slate-900 p-3.5 sm:p-5 flex flex-col gap-2.5 hover:border-violet-500/40 transition"
            >
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
                <c.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
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
    <section className="max-w-6xl mx-auto px-4 pb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
        <Link
          href={href}
          className="text-xs sm:text-sm text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 font-medium"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
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
