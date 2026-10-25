"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
  Search,
  Image as ImageIcon,
  Link2,
  Download,
  Wand2,
} from "lucide-react";
import Link from "next/link";

type ContentKind = "movie" | "game" | "vpn" | "tv" | "radio" | "music" | "drama";

type TmdbHit = {
  tmdbId: number;
  title: string;
  overview: string;
  coverUrl: string | null;
  year: string | null;
};

type ResolvedLink = { url: string; host: string; label: string };

const TYPE_LABELS: Record<ContentKind, string> = {
  movie: "Movie",
  tv: "TV",
  radio: "Radio",
  music: "Miziki",
  drama: "Tamthilia",
  game: "Game",
  vpn: "VPN",
};

export default function NewContentPage() {
  const router = useRouter();
  const [type, setType] = useState<ContentKind>("movie");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [linkType, setLinkType] = useState<"stream" | "download">("stream");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [protocol, setProtocol] = useState("");
  const [configText, setConfigText] = useState("");
  const [priceMode, setPriceMode] = useState<
    "free" | "once" | "week" | "month" | "year"
  >("free");
  const [priceTzs, setPriceTzs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedLink[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tmdbQ, setTmdbQ] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TmdbHit[]>([]);
  const [autoCoverMsg, setAutoCoverMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function searchTmdb(query: string) {
    if (query.trim().length < 2) return;
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setTmdbResults(data.results || []);
      if (data.error && !(data.results || []).length) setAutoCoverMsg(data.error);
    } catch {
      setError("TMDB failed");
    }
  }

  useEffect(() => {
    if (type !== "movie" || title.trim().length < 3) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTmdb(title), 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, type]);

  function pickTmdb(m: TmdbHit) {
    setTitle(m.title + (m.year ? ` (${m.year})` : ""));
    setDescription(m.overview || "");
    if (m.coverUrl) {
      setCoverUrl(m.coverUrl);
      setAutoCoverMsg("Cover ✓");
    }
    setTmdbResults([]);
  }

  async function chimbaLinks() {
    if (!linkUrl.trim()) {
      setError("Weka link ya ukurasa kwanza");
      return;
    }
    setResolving(true);
    setError("");
    setInfo("");
    setResolved([]);
    try {
      const res = await fetch("/api/admin/resolve-downloads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Chimba imeshindikana");
      else if (!(data.links || []).length) {
        setError("Hakuna file host iliyopatikana");
      } else {
        setResolved(data.links);
        const first = data.links[0] as ResolvedLink;
        setLinkUrl(first.url);
        setLinkType("download");
        if (!title.trim() && data.title) {
          setTitle(String(data.title).replace(/\s*[|–-].*$/, "").slice(0, 120));
        }
        setInfo(`${data.links.length} download link(s) ✓`);
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setResolving(false);
  }

  async function saveApiToSettings() {
    if (!apiUrl.trim()) return;
    await fetch("/api/admin/api-sources", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: type,
        url: apiUrl.trim(),
        enabled: true,
        name: `${TYPE_LABELS[type]} public API`,
      }),
    });
  }

  async function importFromApi() {
    if (!apiUrl.trim()) {
      setError("Weka Public API URL");
      return;
    }
    setImporting(true);
    setError("");
    setInfo("");
    try {
      await saveApiToSettings();
      const imp = await fetch("/api/admin/import-api", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: type, apiUrl: apiUrl.trim() }),
      });
      const impData = await imp.json();
      if (!imp.ok) setError(impData.error || "Import failed");
      else {
        setInfo(`${impData.count || 0} items zimeingizwa ✓`);
        setTimeout(() => {
          router.push("/admin/content");
          router.refresh();
        }, 900);
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setImporting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSaving(true);
    try {
      if (apiUrl.trim()) await saveApiToSettings();
      if (!linkUrl.trim()) {
        if (apiUrl.trim()) {
          setSaving(false);
          await importFromApi();
          return;
        }
        setError("Weka Stream/Download link au Public API");
        setSaving(false);
        return;
      }
      if (!title.trim()) {
        setError("Weka Title");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
          configText: configText || null,
          fileUrl: type === "vpn" ? linkUrl : null,
          priceMode,
          priceTzs: Number(priceTzs) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setSaving(false);
        return;
      }
      router.push("/admin/content");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
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
          <p className="text-sm text-slate-500">VPN upload, bei, stream/download</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-5 max-w-xl">
        {error && (
          <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
        )}
        {info && (
          <div className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">{info}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Type</label>
          <div className="flex flex-wrap gap-2">
            {(["movie", "tv", "music", "drama", "radio", "game", "vpn"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setLinkType(t === "game" || t === "vpn" ? "download" : "stream");
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  type === t
                    ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                    : "border-slate-700 text-slate-400"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {type === "movie" && (
          <div className="rounded-xl border border-violet-800/40 bg-violet-950/20 p-3 space-y-2">
            <p className="text-xs text-violet-300 font-medium flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" /> Cover automatic (TMDB)
            </p>
            <div className="flex gap-2">
              <input
                value={tmdbQ}
                onChange={(e) => setTmdbQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchTmdb(tmdbQ))}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                placeholder="Search movie…"
              />
              <button type="button" onClick={() => searchTmdb(tmdbQ || title)} className="px-3 py-2 rounded-lg bg-slate-800">
                <Search className="w-4 h-4" />
              </button>
            </div>
            {autoCoverMsg && <p className="text-xs text-emerald-400">{autoCoverMsg}</p>}
            {tmdbResults.map((m) => (
              <button
                key={m.tmdbId}
                type="button"
                onClick={() => pickTmdb(m)}
                className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-800 flex gap-2 text-sm"
              >
                {m.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.coverUrl} alt="" className="w-8 h-12 object-cover rounded" />
                ) : null}
                {m.title} {m.year ? `(${m.year})` : ""}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">
            Stream / Download / Page link
          </label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            placeholder="https://…"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={chimbaLinks}
              disabled={resolving || !linkUrl.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-700 text-sm font-medium text-white disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              {resolving ? "Inachimba…" : "Chimba MediaFire"}
            </button>
          </div>
        </div>

        {resolved.length > 0 && (
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3 space-y-2">
            {resolved.map((l) => (
              <button
                key={l.url}
                type="button"
                onClick={() => {
                  setLinkUrl(l.url);
                  setLinkType("download");
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm border border-slate-700"
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border-2 border-violet-600/40 bg-violet-950/30 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-violet-300">
            <Link2 className="w-4 h-4" /> Public API URL
          </label>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-violet-800/50 text-sm font-mono"
          />
          <button
            type="button"
            onClick={importFromApi}
            disabled={importing || !apiUrl.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 text-sm font-medium text-white disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {importing ? "Inapakia…" : "Import kutoka API"}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Cover URL</label>
          <input
            value={coverUrl.startsWith("data:") ? "(picha imepakiwa)" : coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
        </div>

        {type === "vpn" && (
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-300">VPN — picha &amp; file</p>
            <div>
              <label className="text-xs text-slate-400">Picha / Cover (upload)</label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-sm text-slate-400"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 1_500_000) {
                    setError("Picha max ~1.5MB");
                    return;
                  }
                  const r = new FileReader();
                  r.onload = () => setCoverUrl(String(r.result || ""));
                  r.readAsDataURL(f);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">File ya VPN (ndogo) au tumia link juu</label>
              <input
                type="file"
                className="mt-1 w-full text-sm text-slate-400"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 2_000_000) {
                    setError("File max ~2MB — tumia link ya Drive/MediaFire");
                    return;
                  }
                  const r = new FileReader();
                  r.onload = () => {
                    setLinkUrl(String(r.result || ""));
                    setLinkType("download");
                  };
                  r.readAsDataURL(f);
                }}
              />
            </div>
            <input
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              placeholder="Protocol"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            />
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={3}
              placeholder="Config text"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono"
            />
          </div>
        )}

        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-200">Bei / Kifurushi</p>
          <select
            value={priceMode}
            onChange={(e) => setPriceMode(e.target.value as typeof priceMode)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          >
            <option value="free">Bure</option>
            <option value="once">Moja kwa moja</option>
            <option value="week">Wiki</option>
            <option value="month">Mwezi</option>
            <option value="year">Mwaka</option>
          </select>
          {priceMode !== "free" && (
            <div>
              <label className="text-xs text-slate-400">
                Bei maalum TZS (0 = bei ya global kwenye Malipo)
              </label>
              <input
                type="number"
                value={priceTzs}
                onChange={(e) => setPriceTzs(Number(e.target.value) || 0)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
              />
            </div>
          )}
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
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 font-semibold text-sm text-white disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "…" : "Save & Publish"}
        </button>
      </form>
    </div>
  );
}
