"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Search, User } from "lucide-react";
import LogoutButton from "./LogoutButton";
import PointsBadge from "./PointsBadge";

const links = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV Shows" },
  { href: "/drama", label: "Tamthilia" },
  { href: "/music", label: "Miziki" },
  { href: "/radio", label: "Radio" },
  { href: "/games", label: "Games" },
];

export default function Navbar() {
  const pathname = usePathname();
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 h-14 sm:h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 font-black shrink-0 tracking-tight"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Clapperboard className="w-4 h-4 text-white" />
            </span>
            <span className="text-white text-sm sm:text-base">
              ETUZA<span className="text-red-400">HUB</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? "text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            href="/movies"
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </Link>
          <PointsBadge />
          <Link
            href="/account"
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition hidden sm:inline-flex"
            aria-label="Account"
          >
            <User className="w-5 h-5" />
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
