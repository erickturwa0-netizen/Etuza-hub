"use client";

import { useEffect, useState } from "react";
import { Save, Check, X, Image as ImageIcon, FileUp } from "lucide-react";
import {
  NETWORKS,
  CONTENT_TYPES,
  TYPE_LABELS,
  planLabel,
  networkLabel,
  parsePaidCategories,
  DEFAULT_VPN_PACKAGES,
  type VpnPackage,
} from "@/lib/payments";

type Settings = {
  enabled: boolean;
  payPhone: string;
  payNetwork: string;
  priceWeek: number;
  priceMonth: number;
  priceYear: number;
  priceOnce: number;
  instructions: string | null;
  paidCategories?: string;
  showPackages?: boolean;
  vpnPackages?: VpnPackage[];
};

type Req = {
  id: string;
  plan: string;
  amount: number;
  senderPhone: string;
  senderNetwork: string;
  screenshotUrl: string;
  status: string;
  createdAt: string;
  user: { email: string; fullName: string | null };
  content: { title: string; type: string } | null;
};

function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`Faili kubwa mno (max ${Math.round(maxBytes / 1000)}KB)`));
      return;
    }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Imeshindikana kusoma faili"));
    r.readAsDataURL(file);
  });
}

export default function AdminPaymentsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [paidSet, setPaidSet] = useState<Set<string>>(new Set());
  const [vpnPkgs, setVpnPkgs] = useState<VpnPackage[]>(DEFAULT_VPN_PACKAGES);
  const [pending, setPending] = useState<Req[]>([]);
  const [recent, setRecent] = useState<Req[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/payments", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setSettings({
      ...data.settings,
      showPackages: data.settings?.showPackages === true,
    });
    setPaidSet(new Set(parsePaidCategories(data.settings?.paidCategories)));
    setVpnPkgs(
      data.settings?.vpnPackages?.length
        ? data.settings.vpnPackages
        : DEFAULT_VPN_PACKAGES.map((p) => ({ ...p }))
    );
    setPending(data.pending || []);
    setRecent(data.recent || []);
  }

  useEffect(() => {
    load();
  }, []);

  function updateVpn(plan: string, patch: Partial<VpnPackage>) {
    setVpnPkgs((prev) =>
      prev.map((p) => (p.plan === plan ? { ...p, ...patch } : p))
    );
  }

  async function onVpnImage(plan: string, file: File | null) {
    if (!file) return;
    try {
      const data = await readFileAsDataUrl(file, 1_200_000);
      updateVpn(plan, { imageUrl: data });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Picha imeshindikana");
    }
  }

  async function onVpnFile(plan: string, file: File | null) {
    if (!file) return;
    try {
      // Config files often small; allow up to ~1.8MB as data URL
      const data = await readFileAsDataUrl(file, 1_800_000);
      updateVpn(plan, { fileUrl: data });
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message + " — au weka link ya faili badala yake"
          : "Faili imeshindikana"
      );
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/payments", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        showPackages: !!settings.showPackages,
        paidCategories: Array.from(paidSet),
        vpnPackages: vpnPkgs,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Imeshindikana");
    else setMsg("Mipangilio imehifadhiwa ✓");
    setSaving(false);
  }

  async function review(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      setMsg(action === "approve" ? "Umeidhinisha ✓" : "Umekataa");
      await load();
    } else {
      const d = await res.json();
      setError(d.error || "Failed");
    }
  }

  if (!settings) {
    return <p className="text-slate-500 text-sm">Inapakia…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Malipo</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bei ya content → auto. Tiki = sehemu (si VPN). VPN = vifurushi + picha + file.
        </p>
      </div>

      {msg && (
        <div className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">{msg}</div>
      )}
      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
      )}

      <section>
        <h2 className="text-lg font-bold mb-3">Wanaosubiri ({pending.length})</h2>
        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-slate-500 glass-card p-4">Hakuna ombi.</p>
          )}
          {pending.map((r) => (
            <div key={r.id} className="glass-card p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-semibold">{r.user.fullName || r.user.email}</p>
                  <p className="text-xs text-slate-500">
                    {r.senderPhone} · {networkLabel(r.senderNetwork)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p className="text-violet-300 font-semibold">
                    {r.amount.toLocaleString()} TZS · {planLabel(r.plan)}
                  </p>
                  {r.content && (
                    <p>
                      {r.content.type}: {r.content.title}
                    </p>
                  )}
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.screenshotUrl} alt="" className="max-h-48 rounded-lg border border-slate-700" />
              <div className="flex gap-2">
                <button type="button" onClick={() => review(r.id, "approve")} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Idhinisha
                </button>
                <button type="button" onClick={() => review(r.id, "reject")} className="px-3 py-2 rounded-lg bg-red-600/80 text-white text-xs font-semibold inline-flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Kataa
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card p-5 space-y-4 max-w-xl">
        <label className="flex items-center justify-between gap-3">
          <span className="font-semibold text-sm">Washa malipo</span>
          <input type="checkbox" className="w-5 h-5" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />
        </label>

        <label className="flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-sm block">Onyesha vifurushi (si VPN)</span>
            <span className="text-[11px] text-slate-500">Kwa movie n.k.</span>
          </div>
          <input type="checkbox" className="w-5 h-5" checked={!!settings.showPackages} onChange={(e) => setSettings({ ...settings, showPackages: e.target.checked })} />
        </label>

        <div className="rounded-xl border border-slate-700 p-3 space-y-2">
          <p className="text-sm font-semibold">Sehemu zinazolipiwa (si VPN)</p>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm px-2 py-2 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  checked={paidSet.has(cat)}
                  onChange={() => {
                    setPaidSet((prev) => {
                      const n = new Set(prev);
                      if (n.has(cat)) n.delete(cat);
                      else n.add(cat);
                      return n;
                    });
                  }}
                />
                {TYPE_LABELS[cat]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">Namba ya kupokea</label>
          <input value={settings.payPhone} onChange={(e) => setSettings({ ...settings, payPhone: e.target.value })} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Mtandao</label>
          <select value={settings.payNetwork} onChange={(e) => setSettings({ ...settings, payNetwork: e.target.value })} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm">
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{networkLabel(n)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400">Maelekezo</label>
          <textarea value={settings.instructions || ""} onChange={(e) => setSettings({ ...settings, instructions: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm" />
        </div>

        <button type="button" onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold">
          <Save className="w-4 h-4" /> {saving ? "…" : "Hifadhi mipangilio"}
        </button>
      </section>

      <section className="space-y-3 max-w-xl">
        <h2 className="text-lg font-bold">VPN — vifurushi + picha + file</h2>
        <p className="text-xs text-slate-500">
          Kila kifurushi: picha, file ya config, bei. Faili kubwa → tumia link badala ya kupakia.
        </p>
        {vpnPkgs.map((p) => (
          <div key={p.plan} className="glass-card p-4 space-y-3">
            <label className="flex items-center justify-between">
              <span className="font-semibold text-sm">{p.title || planLabel(p.plan)}</span>
              <input type="checkbox" checked={p.enabled} onChange={(e) => updateVpn(p.plan, { enabled: e.target.checked })} />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Jina</label>
                <input value={p.title} onChange={(e) => updateVpn(p.plan, { title: e.target.value })} className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Bei (TZS)</label>
                <input type="number" value={p.priceTzs} onChange={(e) => updateVpn(p.plan, { priceTzs: Number(e.target.value) || 0 })} className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm" />
              </div>
            </div>

            {/* Image upload */}
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3 space-y-2">
              <p className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Picha ya kifurushi
              </p>
              <input
                type="file"
                accept="image/*"
                className="w-full text-xs text-slate-400"
                onChange={(e) => onVpnImage(p.plan, e.target.files?.[0] || null)}
              />
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt=""
                  className="max-h-28 rounded-lg border border-slate-700 object-cover"
                />
              )}
              <input
                value={p.imageUrl.startsWith("data:") ? "(picha imepakiwa)" : p.imageUrl}
                onChange={(e) => {
                  if (!e.target.value.startsWith("(")) {
                    updateVpn(p.plan, { imageUrl: e.target.value });
                  }
                }}
                placeholder="au link ya picha https://…"
                className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
              />
            </div>

            {/* File upload */}
            <div className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-3 space-y-2">
              <p className="text-xs font-medium text-sky-300 flex items-center gap-1">
                <FileUp className="w-3.5 h-3.5" /> File ya VPN (config)
              </p>
              <input
                type="file"
                className="w-full text-xs text-slate-400"
                onChange={(e) => onVpnFile(p.plan, e.target.files?.[0] || null)}
              />
              {p.fileUrl && (
                <p className="text-[11px] text-slate-400 truncate">
                  {p.fileUrl.startsWith("data:")
                    ? "✓ File imepakiwa"
                    : p.fileUrl}
                </p>
              )}
              <input
                value={p.fileUrl.startsWith("data:") ? "(file imepakiwa)" : p.fileUrl}
                onChange={(e) => {
                  if (!e.target.value.startsWith("(")) {
                    updateVpn(p.plan, { fileUrl: e.target.value });
                  }
                }}
                placeholder="au link ya file https://…"
                className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-500">Protocol</label>
              <input value={p.protocol} onChange={(e) => updateVpn(p.plan, { protocol: e.target.value })} placeholder="OpenVPN / V2Ray / HTTP Injector…" className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Config text (hiari)</label>
              <textarea value={p.configText} onChange={(e) => updateVpn(p.plan, { configText: e.target.value })} rows={2} className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono" />
            </div>
          </div>
        ))}
        <button type="button" onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold">
          <Save className="w-4 h-4" /> Hifadhi VPN packages
        </button>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-2">Historia</h2>
          <ul className="text-sm text-slate-400 space-y-1">
            {recent.map((r) => (
              <li key={r.id}>
                {r.status} · {r.user.email} · {r.amount.toLocaleString()} TZS
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
