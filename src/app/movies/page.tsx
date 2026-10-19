"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film } from "lucide-react";

type MyItem = {
  id: string;
  title: string;
  coverUrl?: string | null;
  cover_url?: string | null;
  category?: string | null;
};

export default function MoviesPage() {
  const [mine, setMine] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
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
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400">
          <Film className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Movies</h1>
          <p className="text-sm text-slate-500">
            {mine.length} available · kutoka API yako / Admin
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-amber-400 mb-3">{error}</p>}

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : mine.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Hakuna movies. Ongeza kwenye Admin → Content au weka Movie API kwenye Settings.
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
      )}
    </main>
  );
}
