import Link from "next/link";
import {
  Film,
  Gamepad2,
  Shield,
  Eye,
  FileText,
  Plus,
  Music,
  Tv,
  Radio,
  Users,
  Clock,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Admin Dashboard – ETUZA HUB" };

const ACTIVE_MS = 90_000;

export default async function AdminDashboard() {
  let all: {
    id: string;
    title: string;
    type: string;
    status: string;
    viewsCount: number;
  }[] = [];

  let counts = {
    movie: 0,
    music: 0,
    game: 0,
    tv: 0,
    radio: 0,
    drama: 0,
  };
  let totalActive = 0;
  let activeList: {
    section: string;
    title: string | null;
    minutesAgo: number;
  }[] = [];

  try {
    all = await prisma.content.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        viewsCount: true,
      },
    });
  } catch (e) {
    console.error("admin content", e);
  }

  try {
    const since = new Date(Date.now() - ACTIVE_MS);
    const active = await prisma.viewSession.findMany({
      where: { lastSeen: { gte: since } },
      orderBy: { lastSeen: "desc" },
      take: 100,
    });
    totalActive = active.length;
    for (const a of active) {
      if (a.section in counts) {
        counts[a.section as keyof typeof counts] += 1;
      }
    }
    activeList = active.map((a) => ({
      section: a.section,
      title: a.title,
      minutesAgo: Math.max(
        0,
        Math.round((Date.now() - a.lastSeen.getTime()) / 60000)
      ),
    }));
  } catch (e) {
    console.error("admin presence", e);
  }

  const published = all.filter((c) => c.status === "published");
  const drafts = all.filter((c) => c.status === "draft");
  const movies = all.filter((c) => c.type === "movie");
  const games = all.filter((c) => c.type === "game");
  const vpns = all.filter((c) => c.type === "vpn");
  const totalViews = all.reduce((s, c) => s + (c.viewsCount || 0), 0);

  const stats = [
    { label: "Total Content", value: all.length, icon: FileText },
    { label: "Published", value: published.length, icon: Eye },
    { label: "Drafts", value: drafts.length, icon: FileText },
    { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye },
  ];

  const live = [
    { label: "Movies", value: counts.movie, icon: Film, color: "text-violet-400" },
    { label: "Miziki", value: counts.music, icon: Music, color: "text-fuchsia-400" },
    { label: "Games", value: counts.game, icon: Gamepad2, color: "text-emerald-400" },
    { label: "TV", value: counts.tv, icon: Tv, color: "text-red-400" },
    { label: "Radio", value: counts.radio, icon: Radio, color: "text-pink-400" },
    { label: "Drama", value: counts.drama, icon: Film, color: "text-orange-400" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">ETUZA HUB Admin Panel</p>
        </div>
        <Link
          href="/admin/content/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm shadow-lg shadow-violet-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </Link>
      </div>

      {/* Live viewers */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold">Wanaotazama sasa (live)</h2>
          <span className="ml-auto text-sm text-emerald-400 font-bold">
            {totalActive} active
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {live.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-700 bg-slate-900/60 p-3"
            >
              <s.icon className={`w-4 h-4 mb-1 ${s.color}`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {activeList.length > 0 ? (
          <div className="max-h-56 overflow-y-auto divide-y divide-white/5 border border-slate-800 rounded-xl">
            {activeList.map((a, i) => (
              <div
                key={i}
                className="px-3 py-2 flex items-center gap-2 text-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="capitalize text-slate-300 w-16 shrink-0">
                  {a.section}
                </span>
                <span className="truncate text-white flex-1">
                  {a.title || "—"}
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {a.minutesAgo === 0 ? "sasa" : `${a.minutesAgo}m`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Hakuna mtu active sasa. Fungua movie/TV/radio kwenye site kuona data.
            (Ikiwa table haipo bado: run <code className="text-violet-300">prisma db push</code>)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <s.icon className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {[
          {
            type: "Movies",
            count: movies.length,
            icon: Film,
            href: "/admin/content?type=movie",
          },
          {
            type: "Games",
            count: games.length,
            icon: Gamepad2,
            href: "/admin/content?type=game",
          },
          {
            type: "VPN",
            count: vpns.length,
            icon: Shield,
            href: "/admin/content?type=vpn",
          },
        ].map((c) => (
          <Link
            key={c.type}
            href={c.href}
            className="glass-card p-5 flex items-center gap-4 hover:border-violet-500/30 transition"
          >
            <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400">
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">{c.type}</p>
              <p className="text-sm text-slate-500">{c.count} items</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-semibold">Recent Content</h2>
          <Link
            href="/admin/content"
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {all.slice(0, 8).map((c) => (
            <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                {c.type === "movie" ? (
                  <Film className="w-4 h-4" />
                ) : c.type === "game" ? (
                  <Gamepad2 className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{c.title}</p>
                <p className="text-xs text-slate-500 capitalize">
                  {c.type} · {c.viewsCount} views
                </p>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  c.status === "published"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
