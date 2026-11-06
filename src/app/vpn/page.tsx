import ContentCard from "@/components/ContentCard";
import { getPublishedContent } from "@/lib/content";
import { Shield } from "lucide-react";
import VpnPageTracker from "@/components/VpnPageTracker";
import VpnMyConfigs from "@/components/VpnMyConfigs";

export const dynamic = "force-dynamic";
export const metadata = { title: "VPN – ETUZA HUB" };

export default async function VpnPage() {
  const items = await getPublishedContent("vpn");

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <VpnPageTracker />
      <VpnMyConfigs />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">VPN Configs</h1>
          <p className="text-sm text-slate-500">{items.length} available</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 text-sm text-slate-300 space-y-2">
        <p className="font-semibold text-blue-200">REFERRAL BONUS</p>
        <p className="text-xs text-slate-400">
          Mwalike mtu akanunue VPN Configuration. Bonus yako inaongezwa kwenye
          muda wa VPN yako (Team A / B / C).
        </p>
        <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
          <li>TSh 1,500 → Team A +1 DAY · B +12h · C +8h</li>
          <li>TSh 2,500 → Team A +2 DAYS · B +1 DAY · C +12h</li>
          <li>TSh 8,000 → Team A +5 DAYS · B +2.5 DAYS · C +2 DAYS</li>
        </ul>
      </div>

      <p className="text-xs text-slate-500 mb-6 max-w-xl">
        Baada ya malipo na admin kutuma config, itaonekana hapa juu na button{" "}
        <b className="text-slate-300">Nakili config</b>.
      </p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
          Hakuna VPN configs bado. Admin:{" "}
          <b className="text-slate-200">Add Content → VPN</b>
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
