import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-[10px] font-black text-white">
            E
          </span>
          <span>© {new Date().getFullYear()} ETUZA HUB</span>
        </div>
        <div className="flex gap-6">
          <Link href="/movies" className="hover:text-slate-300 transition">Movies</Link>
          <Link href="/games" className="hover:text-slate-300 transition">Games</Link>
          <Link href="/vpn" className="hover:text-slate-300 transition">VPN</Link>
          <Link href="/admin" className="hover:text-slate-300 transition">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
