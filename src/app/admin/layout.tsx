import Link from "next/link";
import {
  LayoutDashboard,
  Film,
  Gamepad2,
  Shield,
  Settings,
  Plus,
  ArrowLeft,
} from "lucide-react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/content", label: "Content", icon: Film },
  { href: "/admin/content/new", label: "Add Content", icon: Plus },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-56 shrink-0">
        <div className="glass-card p-4 sticky top-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-400">
              Admin
            </h2>
            <Link
              href="/"
              className="text-slate-500 hover:text-slate-300"
              title="Back to site"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-violet-600/15 hover:text-violet-300 transition"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 pt-4 border-t border-white/5 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-slate-600 px-3 mb-2">
              Quick links
            </p>
            <Link href="/movies" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-300">
              <Film className="w-3.5 h-3.5" /> Movies
            </Link>
            <Link href="/games" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-300">
              <Gamepad2 className="w-3.5 h-3.5" /> Games
            </Link>
            <Link href="/vpn" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-300">
              <Shield className="w-3.5 h-3.5" /> VPN
            </Link>
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
