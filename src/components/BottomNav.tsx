"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, Radio, Music } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/tv", label: "TV", icon: Tv },
  { href: "/music", label: "Miziki", icon: Music },
  { href: "/radio", label: "Radio", icon: Radio },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-[#0a0a0f]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] ${
                active ? "text-violet-400" : "text-slate-500"
              }`}
            >
              <t.icon className="w-5 h-5 mb-0.5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
