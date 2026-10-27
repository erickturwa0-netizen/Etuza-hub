"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function EditContentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [priceMode, setPriceMode] = useState("free");
  const [priceTzs, setPriceTzs] = useState(0);
  const [accessDays, setAccessDays] = useState(7);
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/content/${id}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Haipo");
          setLoading(false);
          return;
        }
        const c = data.item;
        setTitle(c.title || "");
        setDescription(c.description || "");
        setLinkUrl(c.linkUrl || c.fileUrl || "");
        setCoverUrl(c.coverUrl || "");
        setStatus(c.status === "draft" ? "draft" : "published");
        setPriceMode(c.priceMode || "free");
        setPriceTzs(c.priceTzs || 0);
        setAccessDays(c.accessDays || 7);
        setCategory(c.category || "");
        setType(c.type || "");
      } catch {
        setError("Tatizo la mtandao");
      }
      setLoading(false);
    })();
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          linkUrl,
          coverUrl: coverUrl || null,
          status,
          category: category || null,
          priceMode,
          priceTzs: Number(priceTzs) || 0,
          accessDays: priceMode === "timed" ? Number(accessDays) || 7 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana");
        setSaving(false);
        return;
      }
      router.push("/admin/content");
      router.refresh();
    } catch {
      setError("Tatizo la mtandao");
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-500 text-sm">Inapakia…</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/content" className="p-2 rounded-lg text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Content</h1>
          <p className="text-sm text-slate-500 capitalize">{type}</p>
        </div>
      </div>

      <form onSubmit={save} className="glass-card p-5 space-y-4 max-w-xl">
        {error && (
          <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
        )}

        <div>
          <label className="text-xs text-slate-400">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" required />
        </div>
        <div>
          <label className="text-xs text-slate-400">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Stream / Download link</label>
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" required />
        </div>
        <div>
          <label className="text-xs text-slate-400">Cover URL</label>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
        </div>

        <div>
          <label className="text-xs text-slate-400">Bei</label>
          <select value={priceMode} onChange={(e) => setPriceMode(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm">
            <option value="free">Bure</option>
            <option value="once">Inauzwa kabisa</option>
            <option value="week">Wiki 1</option>
            <option value="month">Mwezi 1</option>
            <option value="year">Mwaka 1</option>
            <option value="timed">Muda maalum</option>
          </select>
        </div>
        {priceMode !== "free" && (
          <div>
            <label className="text-xs text-slate-400">Bei (TZS)</label>
            <input type="number" value={priceTzs} onChange={(e) => setPriceTzs(Number(e.target.value) || 0)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
          </div>
        )}
        {priceMode === "timed" && (
          <div>
            <label className="text-xs text-slate-400">Siku za access</label>
            <input type="number" value={accessDays} onChange={(e) => setAccessDays(Number(e.target.value) || 1)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
          </div>
        )}

        <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm">
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 font-semibold text-sm text-white">
          <Save className="w-4 h-4" />
          {saving ? "…" : "Hifadhi mabadiliko"}
        </button>
      </form>
    </div>
  );
}
