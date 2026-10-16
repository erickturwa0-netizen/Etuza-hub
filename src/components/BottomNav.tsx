"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Gamepad2, Shield, LayoutDashboard } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/vpn", label: "VPN", icon: Shield },
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/signup") return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#0a0a0f] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((t) => {
          const active =
            t.href === "/"
              ? pathname === "/"
              : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium ${
                active ? "text-violet-400" : "text-slate-500"
              }`}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
