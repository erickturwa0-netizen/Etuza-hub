"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StreamPlayer from "@/components/StreamPlayer";

function ArchiveWatch() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  const title = sp.get("title") || id;

  if (!id) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-slate-400">Identifier haipo.</p>
        <Link href="/movies" className="text-violet-400 text-sm">
          Back to Movies
        </Link>
      </main>
    );
  }

  const detailsUrl = `https://archive.org/details/${id}`;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/movies" className="inline-flex items-center gap-2 text-sm text-slate-400 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Movies
      </Link>
      <h1 className="text-xl font-bold mb-4">{title}</h1>
      <StreamPlayer src={detailsUrl} title={title} />
    </main>
  );
}

export default function ArchiveWatchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">…</div>}>
      <ArchiveWatch />
    </Suspense>
  );
}
