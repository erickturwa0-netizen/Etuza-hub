"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
  Search,
  Image as ImageIcon,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import {
  EMPTY_VPN_PACKAGES,
  type ContentVpnPackage,
} from "@/lib/vpn-packages";

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

function readDataUrl(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > max) {
      reject(new Error("Faili kubwa mno"));
      return;
    }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Imeshindikana"));
    r.readAsDataURL(file);
  });
}

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
  const [configText, setConfigText] = useState("");
  const [priceMode, setPriceMode] = useState<
    "free" | "once" | "week" | "month" | "year" | "timed"
  >("free");
  const [priceTzs, setPriceTzs] = useState(0);
  const [accessDays, setAccessDays] = useState(7);
  const [vpnPkgs, setVpnPkgs] = useState<ContentVpnPackage[]>(
    EMPTY_VPN_PACKAGES.map((p) => ({ ...p }))
  );
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const [tmdbQ, setTmdbQ] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TmdbHit[]>([]);
  const [autoCoverMsg, setAutoCoverMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updatePkg(plan: string, patch: Partial<ContentVpnPackage>) {
    setVpnPkgs((prev) =>
      prev.map((p) => (p.plan === plan ? { ...p, ...patch } : p))
    );
  }

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
      setError("Weka link");
      return;
    }
    setResolving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/resolve-downloads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed");
      else if (!(data.links || []).length) setError("Hakuna links");
      else {
        setLinkUrl(data.links[0].url);
        setLinkType("download");
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setResolving(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      // VPN: need title; link can be first package file or placeholder
      const enabledPkgs = vpnPkgs.filter((p) => p.enabled);
      let finalLink = linkUrl.trim();
      if (type === "vpn") {
        if (!title.trim()) {
          setError("Weka title ya VPN");
          setSaving(false);
          return;
        }
        if (!enabledPkgs.length && !finalLink) {
          setError("Washa angalau kifurushi kimoja au weka link");
          setSaving(false);
          return;
        }
        if (!finalLink) {
          finalLink =
            enabledPkgs.find((p) => p.fileUrl)?.fileUrl ||
            "vpn-package";
        }
      } else if (!finalLink || !title.trim()) {
        setError("Weka title na link");
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
          linkUrl: finalLink,
          coverUrl: coverUrl || null,
          linkType,
          category: category || null,
          status,
          protocol: protocol || null,
          configText: configText || null,
          fileUrl: type === "vpn" ? finalLink : null,
          priceMode: type === "vpn" && enabledPkgs.length ? "once" : priceMode,
          priceTzs: Number(priceTzs) || 0,
          accessDays:
            priceMode === "timed"
              ? Number(accessDays) || 7
              : priceMode === "week"
                ? 7
                : priceMode === "month"
                  ? 30
                  : priceMode === "year"
                    ? 365
                    : 0,
          vpnPackages: type === "vpn" ? vpnPkgs : undefined,
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
          <p className="text-sm text-slate-500">
            VPN: weka vifurushi kwenye content hii tu
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-5 max-w-xl">
        {error && (
          <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
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
              <ImageIcon className="w-3.5 h-3.5" /> Cover (TMDB)
            </p>
            <div className="flex gap-2">
              <input
                value={tmdbQ}
                onChange={(e) => setTmdbQ(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                placeholder="Search…"
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
                {m.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.coverUrl} alt="" className="w-8 h-12 object-cover rounded" />
                )}
                {m.title}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm resize-none" />
        </div>

        {type !== "vpn" && (
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Stream / Download link</label>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
            <button type="button" onClick={chimbaLinks} disabled={resolving} className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-700 text-sm text-white">
              <Wand2 className="w-4 h-4" /> {resolving ? "…" : "Chimba MediaFire"}
            </button>
          </div>
        )}

        {/* VPN packages per content */}
        {type === "vpn" && (
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4 space-y-4">
            <div>
              <p className="text-sm font-bold text-emerald-200">Vifurushi vya VPN hii</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Tiki = kifurushi kinapatikana. User atachagua kimoja na kupata config yake tu.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-400">Cover / picha ya VPN</label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-xs text-slate-400"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    setCoverUrl(await readDataUrl(f, 1_200_000));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Picha");
                  }
                }}
              />
            </div>

            {vpnPkgs.map((p) => (
              <div
                key={p.plan}
                className={`rounded-xl border p-3 space-y-2 ${
                  p.enabled
                    ? "border-emerald-600/50 bg-slate-900/80"
                    : "border-slate-800 bg-slate-950/40 opacity-70"
                }`}
              >
                <label className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{p.title}</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5"
                    checked={p.enabled}
                    onChange={(e) => updatePkg(p.plan, { enabled: e.target.checked })}
                  />
                </label>

                {p.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-500">Bei (TZS)</label>
                        <input
                          type="number"
                          value={p.priceTzs}
                          onChange={(e) =>
                            updatePkg(p.plan, {
                              priceTzs: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                        />
                      </div>
                      {p.plan === "timed" && (
                        <div>
                          <label className="text-[11px] text-slate-500">Siku</label>
                          <input
                            type="number"
                            min={1}
                            value={p.accessDays || 3}
                            onChange={(e) =>
                              updatePkg(p.plan, {
                                accessDays: Number(e.target.value) || 1,
                              })
                            }
                            className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">Protocol</label>
                      <input
                        value={p.protocol}
                        onChange={(e) => updatePkg(p.plan, { protocol: e.target.value })}
                        placeholder="OpenVPN / V2Ray…"
                        className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">File ya config</label>
                      <input
                        type="file"
                        className="w-full text-xs text-slate-400"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          try {
                            updatePkg(p.plan, {
                              fileUrl: await readDataUrl(f, 1_800_000),
                            });
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message + " — au weka link"
                                : "File"
                            );
                          }
                        }}
                      />
                      <input
                        value={
                          p.fileUrl.startsWith("data:")
                            ? "(file imepakiwa)"
                            : p.fileUrl
                        }
                        onChange={(e) => {
                          if (!e.target.value.startsWith("(")) {
                            updatePkg(p.plan, { fileUrl: e.target.value });
                          }
                        }}
                        placeholder="au link https://…"
                        className="mt-1 w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">Config text</label>
                      <textarea
                        value={p.configText}
                        onChange={(e) =>
                          updatePkg(p.plan, { configText: e.target.value })
                        }
                        rows={2}
                        className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pricing for non-VPN */}
        {type !== "vpn" && (
          <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-200">Bei ya content hii</p>
            <select
              value={priceMode}
              onChange={(e) => setPriceMode(e.target.value as typeof priceMode)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            >
              <option value="free">Bure (Free)</option>
              <option value="once">Inauzwa kabisa</option>
              <option value="week">Wiki 1</option>
              <option value="month">Mwezi 1</option>
              <option value="year">Mwaka 1</option>
              <option value="timed">Muda maalum (weka siku)</option>
            </select>

            {priceMode !== "free" && (
              <div>
                <label className="text-xs text-slate-400">Bei (TZS)</label>
                <input
                  type="number"
                  value={priceTzs}
                  onChange={(e) => setPriceTzs(Number(e.target.value) || 0)}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
                />
              </div>
            )}

            {priceMode === "timed" && (
              <div>
                <label className="text-xs text-slate-400">Siku za ufikiaji</label>
                <input
                  type="number"
                  min={1}
                  value={accessDays}
                  onChange={(e) => setAccessDays(Number(e.target.value) || 1)}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Cover URL</label>
          <input
            value={coverUrl.startsWith("data:") ? "(picha imepakiwa)" : coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <select
            value={linkType}
            onChange={(e) => setLinkType(e.target.value as "stream" | "download")}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          >
            <option value="stream">Stream</option>
            <option value="download">Download</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
        />

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
