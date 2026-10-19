import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Archive watch page disabled */
export default function ArchiveWatchDisabled() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/movies" className="inline-flex items-center gap-2 text-sm text-slate-400 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Movies
      </Link>
      <h1 className="text-xl font-bold mb-2">Archive imondolewa</h1>
      <p className="text-sm text-slate-400">
        Internet Archive haipo tena kwenye ETUZA HUB. Movies zinakuja kutoka API
        unayoweka kwenye Admin → Settings.
      </p>
    </main>
  );
}
