import ContentCard from "@/components/ContentCard";
import { getPublished } from "@/lib/mock-data";
import { Shield } from "lucide-react";

export const metadata = { title: "VPN – ETUZA HUB" };

export default function VpnPage() {
  const items = getPublished("vpn");

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">VPN Configs</h1>
          <p className="text-sm text-slate-500">{items.length} available · Zero-rated & multi-network</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.map((c) => (
          <ContentCard
            key={c.id}
            id={c.id}
            title={c.title}
            type={c.type}
            category={c.network || c.category}
            coverUrl={c.cover_url}
            linkType={c.link_type}
          />
        ))}
      </div>
    </main>
  );
}
