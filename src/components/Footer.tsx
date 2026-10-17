"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <footer className="border-t border-slate-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center text-[10px] font-black text-white">
            E
          </span>
          <span>© {new Date().getFullYear()} ETUZA HUB</span>
        </div>
        <div className="flex gap-6">
          <Link href="/movies" className="hover:text-slate-300">Movies</Link>
          <Link href="/games" className="hover:text-slate-300">Games</Link>
          <Link href="/vpn" className="hover:text-slate-300">VPN</Link>
        </div>
      </div>
    </footer>
  );
}
