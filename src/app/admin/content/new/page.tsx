"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewContentPage() {
  const router = useRouter();
  const [type, setType] = useState<"movie" | "game" | "vpn">("movie");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<"stream" | "download">("stream");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [protocol, setProtocol] = useState("");
  const [network, setNetwork] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Mock save – later wire to Prisma/API
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setDone(true);
    setTimeout(() => router.push("/admin/content"), 1200);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/content"
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Content</h1>
          <p className="text-sm text-slate-500">Create movie, game or VPN config</p>
        </div>
      </div>

      {done ? (
        <div className="glass-card p-8 text-center">
          <p className="text-emerald-400 font-semibold text-lg mb-2">Saved successfully!</p>
          <p className="text-slate-500 text-sm">Redirecting to content list…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-5 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Type</label>
            <div className="flex gap-2">
              {(["movie", "game", "vpn"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setLinkType(t === "movie" ? "stream" : "download");
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize border transition ${
                    type === t
                      ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                      : "border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm"
              placeholder="e.g. Black Panther"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm resize-none"
              placeholder="Short description…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Link URL *</label>
            <input
              required
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm"
              placeholder="https://…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Link Type</label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as "stream" | "download")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm"
              >
                <option value="stream">Stream</option>
                <option value="download">Download</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm"
              placeholder="Action, Sci-Fi, Config…"
            />
          </div>

          {type === "vpn" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Protocol</label>
                <input
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm"
                  placeholder="V2Ray, OpenVPN…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Network</label>
                <input
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm"
                  placeholder="Halotel, Vodacom…"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 font-semibold text-sm shadow-lg shadow-violet-600/20 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save Content"}
          </button>
        </form>
      )}
    </div>
  );
}
