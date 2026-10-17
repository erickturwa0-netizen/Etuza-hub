"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film } from "lucide-react";

type Tab = "mine" | "chinese" | "kungfu" | "hindi" | "bongo";

type CatalogItem = {
  id: string;
  title: string;
  year: string | null;
  description: string | null;
  linkUrl: string;
  embedUrl: string;
  coverUrl: string;
};

type MyItem = {
  id: string;
  title: string;
  coverUrl?: string | null;
  cover_url?: string | null;
  category?: string | null;
};

export default function MoviesPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [mine, setMine] = useState<MyItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    if (tab === "mine") {
      fetch("/api/content?type=movie&published=1")
        .then((r) => r.json())
        .then((d) => {
          setMine(d.items || []);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed");
          setLoading(false);
        });
      return;
    }

    const kind = tab === "kungfu" ? "kungfu" : tab;
    fetch(`/api/catalog/archive?kind=${kind}&rows=48`)
      .then((r) => r.json())
      .then((d) => {
        setCatalog(d.items || []);
        if (d.error) setError(d.error);
        setLoading(false);
      })
      .catch(() => {
        setError("Archive catalog failed");
        setLoading(false);
      });
  }, [tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "mine", label: "Yangu" },
    { id: "chinese", label: "Chinese" },
    { id: "kungfu", label: "Kung Fu" },
    { id: "hindi", label: "Hindi" },
    { id: "bongo", label: "Bongo" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400">
          <Film className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Movies</h1>
          <p className="text-sm text-slate-500">Yako + Archive catalogs</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              tab === t.id
                ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-amber-400 mb-3">{error}</p>}

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : tab === "mine" ? (
        mine.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Hakuna movies ulizoongeza. Ongeza kwenye Admin au angalia Chinese / Hindi / Bongo.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mine.map((c) => (
              <Link key={c.id} href={`/watch/${c.id}`} className="block">
                <div className="aspect-[2/3] rounded-2xl border border-slate-800 bg-violet-950 overflow-hidden relative">
                  {(c.coverUrl || c.cover_url) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(c.coverUrl || c.cover_url) as string}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/75">
                    <p className="text-xs font-semibold line-clamp-2">{c.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : catalog.length === 0 ? (
        <p className="text-slate-500 text-sm">Hakuna matokeo kwenye Archive.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {catalog.map((c) => (
            <Link
              key={c.id}
              href={`/watch/archive?id=${encodeURIComponent(c.id)}&title=${encodeURIComponent(c.title)}`}
              className="block"
            >
              <div className="aspect-[2/3] rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.coverUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80">
                  <p className="text-xs font-semibold line-clamp-2">{c.title}</p>
                  {c.year && <p className="text-[10px] text-slate-400">{c.year}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
