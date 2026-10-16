"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogIn } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/games", label: "Games" },
  { href: "/vpn", label: "VPN" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/signup";

  if (isAuth) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-black">
            E
          </span>
          <span className="text-base sm:text-lg text-violet-300">ETUZA HUB</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  active
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/admin"
            className="ml-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin
          </Link>
          <Link
            href="/login"
            className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition"
          >
            <LogIn className="w-4 h-4" />
            Ingia
          </Link>
        </nav>

        <Link
          href="/login"
          className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white"
        >
          <LogIn className="w-4 h-4" />
          Ingia
        </Link>
      </div>
    </header>
  );
}
