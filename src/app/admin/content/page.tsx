import Link from "next/link";
import { Film, Gamepad2, Shield, Plus, Eye } from "lucide-react";
import { getAllContent } from "@/lib/mock-data";

export const metadata = { title: "Manage Content – ETUZA HUB" };

export default function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  return <ContentList searchParams={searchParams} />;
}

async function ContentList({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const typeFilter = params.type;
  let items = getAllContent();
  if (typeFilter) {
    items = items.filter((c) => c.type === typeFilter);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-slate-500 mt-1">
            {items.length} items{typeFilter ? ` · ${typeFilter}` : ""}
          </p>
        </div>
        <Link
          href="/admin/content/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm transition"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { label: "All", href: "/admin/content" },
          { label: "Movies", href: "/admin/content?type=movie" },
          { label: "Games", href: "/admin/content?type=game" },
          { label: "VPN", href: "/admin/content?type=vpn" },
        ].map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              (f.href === "/admin/content" && !typeFilter) ||
              f.href.includes(`type=${typeFilter}`)
                ? "bg-violet-600/20 border-violet-500/30 text-violet-300"
                : "border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        {c.type === "movie" ? (
                          <Film className="w-3.5 h-3.5" />
                        ) : c.type === "game" ? (
                          <Gamepad2 className="w-3.5 h-3.5" />
                        ) : (
                          <Shield className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="font-medium truncate max-w-[180px] sm:max-w-xs">
                        {c.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-400 hidden sm:table-cell">
                    {c.type}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                    {c.category || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        c.status === "published"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {c.views_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
