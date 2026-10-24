"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/category-icons";

const tabs: {
  href: string;
  label: string;
  iconUrl?: string;
  lucide?: typeof Home;
}[] = [
  { href: "/", label: "Home", lucide: Home },
  { href: "/movies", label: "Movies", iconUrl: CATEGORY_ICONS.movie },
  { href: "/tv", label: "TV", iconUrl: CATEGORY_ICONS.tv },
  { href: "/music", label: "Miziki", iconUrl: CATEGORY_ICONS.music },
  { href: "/radio", label: "Radio", iconUrl: CATEGORY_ICONS.radio },
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[99999] border-t border-slate-800 bg-[#0a0a0f]">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                "flex flex-col items-center justify-center flex-1 h-full text-[10px] touch-manipulation " +
                (active ? "text-violet-400" : "text-slate-500")
              }
            >
              {t.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.iconUrl}
                  alt=""
                  className={
                    "w-6 h-6 mb-0.5 object-contain " +
                    (active ? "opacity-100" : "opacity-70")
                  }
                />
              ) : t.lucide ? (
                <t.lucide className="w-5 h-5 mb-0.5" />
              ) : null}
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
