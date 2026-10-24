"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import PointsBadge from "./PointsBadge";

const links = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV" },
  { href: "/drama", label: "Tamthilia" },
  { href: "/music", label: "Miziki" },
  { href: "/radio", label: "Radio" },
  { href: "/games", label: "Games" },
  { href: "/vpn", label: "VPN" },
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
    <header className="border-b border-slate-800 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-extrabold shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="ETUZA HUB"
            className="w-8 h-8 rounded-lg"
            width={32}
            height={32}
          />
          <span className="text-violet-300 hidden xs:inline">ETUZA HUB</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5 flex-wrap justify-end">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-2.5 py-2 rounded-lg text-sm font-medium ${
                  active ? "bg-violet-950 text-violet-300" : "text-slate-400"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <PointsBadge />
          <LogoutButton />
        </nav>

        <div className="lg:hidden flex items-center gap-2">
          <PointsBadge />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
