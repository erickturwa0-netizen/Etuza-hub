import Link from "next/link";
import {
  LayoutDashboard,
  Film,
  Plus,
  Settings,
  Users,
  ArrowLeft,
  Wallet,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/content", label: "Content", icon: Film },
  { href: "/admin/content/new", label: "Add Content", icon: Plus },
  { href: "/admin/payments", label: "Malipo", icon: Wallet },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-slate-800 bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm font-black text-white">
              E
            </span>
            <div>
              <p className="font-bold text-sm text-violet-300">ETUZA HUB</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Admin Panel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400"
            >
              <ArrowLeft className="w-4 h-4" />
              Site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-52 shrink-0">
          <nav className="glass-card p-3 space-y-1 sticky top-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-violet-950 hover:text-violet-300"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
