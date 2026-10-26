import ContentCard from "@/components/ContentCard";
import { getPublishedContent } from "@/lib/content";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "VPN – ETUZA HUB" };

export default async function VpnPage() {
  const items = await getPublishedContent("vpn");

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">VPN Configs</h1>
          <p className="text-sm text-slate-500">{items.length} available</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-6 max-w-xl">
        Bofya config → ukurasa wa download. Ikiwa malipo yamewashwa kwenye Admin,
        utaona <b className="text-slate-300">dialog ya bei</b>, utatuma pesa kwenye
        namba ya admin, kisha upakie screenshot + namba yako + mtandao (Vodacom /
        Airtel / Halotel / Mix).
      </p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
          Hakuna VPN configs bado. Admin: <b className="text-slate-200">Add Content → VPN</b>{" "}
          → pakia picha + file, chagua bei (wiki / mwezi / mwaka / moja kwa moja).
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((c) => (
            <ContentCard
              key={c.id}
              id={c.id}
              title={c.title}
              type={c.type}
              category={c.category || c.network}
              coverUrl={c.cover_url}
              linkType={c.link_type}
            />
          ))}
        </div>
      )}
    </main>
  );
}
