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
  Clapperboard,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import AdminSyncButtons from "@/components/AdminSyncButtons";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Admin Dashboard – ETUZA HUB" };

const ACTIVE_MS = 90_000;

export default async function AdminDashboard() {
  let recent: {
    id: string;
    title: string;
    type: string;
    status: string;
    viewsCount: number;
  }[] = [];

  // Real DB counts (not capped at 200)
  let totalContent = 0;
  let publishedCount = 0;
  let draftCount = 0;
  let totalViews = 0;
  let byType: Record<string, number> = {
    movie: 0,
    drama: 0,
    music: 0,
    game: 0,
    tv: 0,
    radio: 0,
    vpn: 0,
  };

  let liveCounts = {
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
    const [total, published, drafts, viewsAgg, typeGroups, recentRows] =
      await Promise.all([
        prisma.content.count(),
        prisma.content.count({ where: { status: "published" } }),
        prisma.content.count({ where: { status: "draft" } }),
        prisma.content.aggregate({ _sum: { viewsCount: true } }),
        prisma.content.groupBy({
          by: ["type"],
          _count: { _all: true },
        }),
        prisma.content.findMany({
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            viewsCount: true,
          },
        }),
      ]);

    totalContent = total;
    publishedCount = published;
    draftCount = drafts;
    totalViews = viewsAgg._sum.viewsCount || 0;
    recent = recentRows;

    for (const g of typeGroups) {
      byType[g.type] = g._count._all;
    }
  } catch (e) {
    console.error("admin content stats", e);
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
      if (a.section in liveCounts) {
        liveCounts[a.section as keyof typeof liveCounts] += 1;
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

  const stats = [
    { label: "Jumla ya Content", value: totalContent, icon: FileText },
    { label: "Published", value: publishedCount, icon: Eye },
    { label: "Drafts", value: draftCount, icon: FileText },
    { label: "Views zote", value: totalViews.toLocaleString(), icon: Eye },
  ];

  const catalog = [
    { type: "Movies", count: byType.movie || 0, icon: Film, href: "/admin/content?type=movie" },
    { type: "Drama", count: byType.drama || 0, icon: Clapperboard, href: "/admin/content?type=drama" },
    { type: "Music", count: byType.music || 0, icon: Music, href: "/admin/content?type=music" },
    { type: "Games", count: byType.game || 0, icon: Gamepad2, href: "/admin/content?type=game" },
    { type: "TV", count: byType.tv || 0, icon: Tv, href: "/admin/content?type=tv" },
    { type: "Radio", count: byType.radio || 0, icon: Radio, href: "/admin/content?type=radio" },
    { type: "VPN", count: byType.vpn || 0, icon: Shield, href: "/admin/content?type=vpn" },
  ];

  const live = [
    { label: "Movies", value: liveCounts.movie, icon: Film, color: "text-violet-400" },
    { label: "Miziki", value: liveCounts.music, icon: Music, color: "text-fuchsia-400" },
    { label: "Games", value: liveCounts.game, icon: Gamepad2, color: "text-emerald-400" },
    { label: "TV", value: liveCounts.tv, icon: Tv, color: "text-red-400" },
    { label: "Radio", value: liveCounts.radio, icon: Radio, color: "text-pink-400" },
    { label: "Drama", value: liveCounts.drama, icon: Film, color: "text-orange-400" },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Hesabu halisi kutoka database · ETUZA HUB
          </p>
        </div>
        <Link
          href="/admin/content/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm shadow-lg shadow-violet-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </Link>
      </div>

      <AdminSyncButtons />

      {/* Catalog counts by type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {catalog.map((c) => (
          <Link
            key={c.type}
            href={c.href}
            className="glass-card p-4 flex items-center gap-3 hover:border-violet-500/40 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 shrink-0">
              <c.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold">{c.count}</p>
              <p className="text-xs text-slate-500">{c.type}</p>
            </div>
          </Link>
        ))}
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
            Hakuna mtu active sasa.
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
          {recent.map((c) => (
            <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                {c.type === "movie" ? (
                  <Film className="w-4 h-4" />
                ) : c.type === "game" ? (
                  <Gamepad2 className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
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
          {recent.length === 0 && (
            <p className="px-5 py-6 text-sm text-slate-500">Hakuna content bado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
