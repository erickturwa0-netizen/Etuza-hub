"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Film, Gamepad2, Shield, Plus, Eye, Trash2, ToggleLeft } from "lucide-react";

type Item = {
  id: string;
  type: string;
  title: string;
  category: string | null;
  status: string;
  viewsCount: number;
  linkType: string;
};

export default function AdminContentPage() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const q = typeFilter ? `?type=${typeFilter}` : "";
    const res = await fetch(`/api/content${q}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  async function toggleStatus(id: string, status: string) {
    const next = status === "published" ? "draft" : "published";
    await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Futa content hii?")) return;
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? "…" : `${items.length} items`}{typeFilter ? ` · ${typeFilter}` : ""}
          </p>
        </div>
        <Link
          href="/admin/content/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 font-semibold text-sm text-white"
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              (f.href === "/admin/content" && !typeFilter) ||
              f.href.includes(`type=${typeFilter}`)
                ? "bg-violet-600/20 border-violet-500/30 text-violet-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 text-sm">Inapakia…</p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 mb-3">Hakuna content bado</p>
            <Link href="/admin/content/new" className="text-violet-400 text-sm">
              + Ongeza ya kwanza
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Views</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                          {c.type === "movie" ? (
                            <Film className="w-3.5 h-3.5" />
                          ) : c.type === "game" ? (
                            <Gamepad2 className="w-3.5 h-3.5" />
                          ) : (
                            <Shield className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="font-medium truncate max-w-[160px]">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-400 hidden sm:table-cell">{c.type}</td>
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
                        {c.viewsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(c.id, c.status)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-white/5"
                          title="Toggle publish"
                        >
                          <ToggleLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
