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
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Premium platform · Tanzania
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-5 leading-[1.1]">
            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
              ETUZA HUB
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Movies, Android Games na VPN configs — yote mahali pamoja.
            Platform ya kisasa kwa watumiaji wa Tanzania.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/movies"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold shadow-lg shadow-violet-600/25 transition"
            >
              <Film className="w-5 h-5" />
              Tazama Movies
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 font-semibold transition"
            >
              <Gamepad2 className="w-5 h-5" />
              Download Games
            </Link>
            <Link
              href="/vpn"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 font-semibold transition"
            >
              <Shield className="w-5 h-5" />
              VPN Configs
            </Link>
          </div>
        </div>
      </section>

      {/* Categories quick */}
      <section className="max-w-6xl mx-auto px-4 -mt-4 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/movies", icon: Film, title: "Movies", desc: "Stream latest films", color: "violet" },
            { href: "/games", icon: Gamepad2, title: "Games", desc: "Android APKs", color: "emerald" },
            { href: "/vpn", icon: Shield, title: "VPN", desc: "Zero-rated configs", color: "blue" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="glass-card p-5 flex items-center gap-4 group hover:border-violet-500/30"
            >
              <div className={`w-12 h-12 rounded-xl bg-${c.color}-500/15 flex items-center justify-center text-${c.color}-400 group-hover:scale-110 transition`}>
                <c.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{c.title}</p>
                <p className="text-sm text-slate-500">{c.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition" />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Movies */}
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
    <section className="max-w-6xl mx-auto px-4 pb-14">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        <Link
          href={href}
          className="text-sm text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 font-medium"
        >
          View all <ArrowRight className="w-4 h-4" />
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
            href={`/${c.type === "movie" ? "movies" : c.type === "game" ? "games" : "vpn"}`}
          />
        ))}
      </div>
    </section>
  );
}
