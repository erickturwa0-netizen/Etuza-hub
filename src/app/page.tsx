import Link from "next/link";
import { Film, Gamepad2, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-blue-900/20 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              ETUZA HUB
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Movies • Android Games • VPN – All in one premium platform
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/movies"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition"
            >
              <Film className="w-5 h-5" />
              Movies
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 font-semibold transition"
            >
              <Gamepad2 className="w-5 h-5" />
              Games
            </Link>
            <Link
              href="/vpn"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 font-semibold transition"
            >
              <Shield className="w-5 h-5" />
              VPN
            </Link>
          </div>
        </div>
      </section>

      {/* Placeholder sections */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Featured</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass-card aspect-[2/3] flex items-center justify-center text-slate-500"
            >
              Coming soon
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
