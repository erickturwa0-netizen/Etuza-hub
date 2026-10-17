"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

type ContentKind = "movie" | "game" | "vpn" | "tv" | "radio";

type TmdbHit = {
  tmdbId: number;
  title: string;
  overview: string;
  coverUrl: string | null;
  year: string | null;
};

export default function NewContentPage() {
  const router = useRouter();
  const [type, setType] = useState<ContentKind>("movie");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [linkType, setLinkType] = useState<"stream" | "download">("stream");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [protocol, setProtocol] = useState("");
  const [network, setNetwork] = useState("");
  const [configText, setConfigText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tmdbQ, setTmdbQ] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TmdbHit[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);

  async function searchTmdb() {
    if (tmdbQ.trim().length < 2) return;
    setTmdbLoading(true);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(tmdbQ)}`);
      const data = await res.json();
      setTmdbResults(data.results || []);
      if (data.error && !(data.results || []).length) {
        setError(data.error);
      }
    } catch {
      setError("TMDB search failed");
    }
    setTmdbLoading(false);
  }

  function pickTmdb(m: TmdbHit) {
    setTitle(m.title + (m.year ? ` (${m.year})` : ""));
    setDescription(m.overview || "");
    if (m.coverUrl) setCoverUrl(m.coverUrl);
    setTmdbResults([]);
    setTmdbQ("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          description: description || null,
          linkUrl,
          coverUrl: coverUrl || null,
          linkType,
          category: category || null,
          status,
          protocol: protocol || null,
          network: network || null,
          configText: configText || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana kuhifadhi");
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/content" className="p-2 rounded-lg text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Content</h1>
          <p className="text-sm text-slate-500">Movie · TV · Radio · Game · VPN</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-5 max-w-xl">
        {error && (
          <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Type</label>
          <div className="flex flex-wrap gap-2">
            {(["movie", "tv", "radio", "game", "vpn"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setLinkType(t === "game" || t === "vpn" ? "download" : "stream");
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border ${
                  type === t
                    ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                    : "border-slate-700 text-slate-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {type === "movie" && (
          <div className="rounded-xl border border-slate-700 p-3 space-y-2">
            <p className="text-xs text-slate-500 font-medium">TMDB – tafuta cover + title</p>
            <div className="flex gap-2">
              <input
                value={tmdbQ}
                onChange={(e) => setTmdbQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchTmdb())}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none"
                placeholder="Search movie name…"
              />
              <button
                type="button"
                onClick={searchTmdb}
                disabled={tmdbLoading}
                className="px-3 py-2 rounded-lg bg-slate-800 text-sm inline-flex items-center gap-1"
              >
                <Search className="w-4 h-4" />
                {tmdbLoading ? "…" : "Search"}
              </button>
            </div>
            {tmdbResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {tmdbResults.map((m) => (
                  <button
                    key={m.tmdbId}
                    type="button"
                    onClick={() => pickTmdb(m)}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-800 flex gap-2 items-center text-sm"
                  >
                    {m.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.coverUrl} alt="" className="w-8 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-8 h-12 bg-slate-700 rounded" />
                    )}
                    <span>
                      {m.title} {m.year ? `(${m.year})` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Title *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none text-sm"
            placeholder={
              type === "tv"
                ? "e.g. TBC1 Live"
                : type === "radio"
                  ? "e.g. Clouds FM"
                  : "Title"
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            {type === "tv" || type === "radio" ? "Stream URL *" : "Link URL *"}
          </label>
          <input
            required
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none text-sm"
            placeholder={
              type === "tv"
                ? "https://….m3u8"
                : type === "radio"
                  ? "https://….mp3 / .m3u8"
                  : "https://…"
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Cover / Logo URL</label>
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none text-sm"
            placeholder="https://…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Link Type</label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as "stream" | "download")}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Category / Network</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            placeholder={type === "tv" ? "News, Sports…" : type === "radio" ? "Bongo, Gospel…" : "Category"}
          />
        </div>

        {(type === "tv" || type === "radio") && (
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Network / Station</label>
            <input
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
              placeholder="TBC, ITV, Clouds…"
            />
          </div>
        )}

        {type === "vpn" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Protocol</label>
                <input
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
                  placeholder="V2Ray…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Network</label>
                <input
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
                  placeholder="Halotel…"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Config Text</label>
              <textarea
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono resize-none"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 disabled:opacity-60 font-semibold text-sm text-white"
        >
          <Save className="w-4 h-4" />
          {saving ? "Inahifadhi…" : "Save Content"}
        </button>
      </form>
    </div>
  );
}
