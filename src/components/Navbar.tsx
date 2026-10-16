"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Gamepad2, Shield, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/vpn", label: "VPN", icon: Shield },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-black">
            E
          </span>
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            ETUZA HUB
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
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
            className="ml-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin
          </Link>
        </nav>

        <button
          type="button"
          className="md:hidden p-2 rounded-lg hover:bg-white/5 text-slate-300"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#0a0a0f] px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                pathname === l.href
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Admin Panel
          </Link>
        </div>
      )}
    </header>
  );
}
