import Link from "next/link";
import { Film, Gamepad2, Shield, Eye, FileText, Plus } from "lucide-react";
import { getAllContent } from "@/lib/mock-data";

export const metadata = { title: "Admin Dashboard – ETUZA HUB" };

export default function AdminDashboard() {
  const all = getAllContent();
  const published = all.filter((c) => c.status === "published");
  const drafts = all.filter((c) => c.status === "draft");
  const movies = all.filter((c) => c.type === "movie");
  const games = all.filter((c) => c.type === "game");
  const vpns = all.filter((c) => c.type === "vpn");
  const totalViews = all.reduce((s, c) => s + c.views_count, 0);

  const stats = [
    { label: "Total Content", value: all.length, icon: FileText, color: "violet" },
    { label: "Published", value: published.length, icon: Eye, color: "emerald" },
    { label: "Drafts", value: drafts.length, icon: FileText, color: "amber" },
    { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, color: "blue" },
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 text-${s.color}-400`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {[
          { type: "Movies", count: movies.length, icon: Film, href: "/admin/content?type=movie", color: "violet" },
          { type: "Games", count: games.length, icon: Gamepad2, href: "/admin/content?type=game", color: "emerald" },
          { type: "VPN", count: vpns.length, icon: Shield, href: "/admin/content?type=vpn", color: "blue" },
        ].map((c) => (
          <Link key={c.type} href={c.href} className="glass-card p-5 flex items-center gap-4 hover:border-violet-500/30 transition">
            <div className={`w-11 h-11 rounded-xl bg-${c.color}-500/15 flex items-center justify-center text-${c.color}-400`}>
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
          <Link href="/admin/content" className="text-sm text-violet-400 hover:text-violet-300">
            View all
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {all.slice(0, 5).map((c) => (
            <div key={c.id} className="px-5 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                {c.type === "movie" ? <Film className="w-4 h-4" /> : c.type === "game" ? <Gamepad2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{c.title}</p>
                <p className="text-xs text-slate-500 capitalize">{c.type} · {c.views_count} views</p>
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
