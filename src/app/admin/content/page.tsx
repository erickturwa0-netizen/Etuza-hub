"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Film,
  Gamepad2,
  Shield,
  Tv,
  Radio,
  Plus,
  Trash2,
  ToggleLeft,
  Pencil,
  Check,
  X,
  Save,
} from "lucide-react";
import { networkLabel, planLabel, TYPE_LABELS } from "@/lib/payments";

type Item = {
  id: string;
  type: string;
  title: string;
  category: string | null;
  status: string;
  viewsCount: number;
  priceMode?: string;
  priceTzs?: number;
};

type PayReq = {
  id: string;
  plan: string;
  amount: number;
  senderPhone: string;
  senderNetwork: string;
  screenshotUrl: string;
  user: { email: string; fullName: string | null };
  content: { title: string; type: string } | null;
};

function ContentList() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type");
  const [items, setItems] = useState<Item[]>([]);
  const [pending, setPending] = useState<PayReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [pointsAds, setPointsAds] = useState(true);
  const [savingAds, setSavingAds] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q = typeFilter ? `?type=${typeFilter}&admin=1` : "?admin=1";
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/content${q}`, { credentials: "include" }),
        fetch("/api/admin/payments", { credentials: "include" }),
      ]);
      const cData = await cRes.json();
      if (!cRes.ok) setError(cData.error || "Failed to load");
      setItems(cData.items || []);

      if (pRes.ok) {
        const pData = await pRes.json();
        setPending(pData.pending || []);
        setPointsAds(pData.settings?.pointsAdsEnabled !== false);
      }
    } catch {
      setError("Tatizo la mtandao");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  async function toggleStatus(id: string, status: string) {
    const next = status === "published" ? "draft" : "published";
    await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Futa content hii?")) return;
    await fetch(`/api/content/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
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
      load();
    }
  }

  async function savePointsAds() {
    setSavingAds(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/payments", { credentials: "include" });
      const data = await res.json();
      const s = data.settings || {};
      const put = await fetch("/api/admin/payments", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: !!s.enabled,
          payPhone: s.payPhone || "0000000000",
          payNetwork: s.payNetwork || "vodacom",
          priceWeek: s.priceWeek ?? 2000,
          priceMonth: s.priceMonth ?? 5000,
          priceYear: s.priceYear ?? 40000,
          priceOnce: s.priceOnce ?? 1000,
          instructions: s.instructions,
          showPackages: !!s.showPackages,
          pointsAdsEnabled: pointsAds,
          paidCategories: (s.paidCategories || "").split(",").filter(Boolean),
          vpnPackages: s.vpnPackages,
        }),
      });
      if (!put.ok) {
        const e = await put.json().catch(() => ({}));
        setError(e.error || "Imeshindikana kuhifadhi ads");
      } else {
        setMsg(
          pointsAds
            ? "Tangazo la point limewashwa ✓"
            : "Tangazo la point limezimwa ✓"
        );
      }
    } catch {
      setError("Imeshindikana kuhifadhi");
    }
    setSavingAds(false);
  }

  const icon = (type: string) => {
    if (type === "movie") return <Film className="w-3.5 h-3.5" />;
    if (type === "game") return <Gamepad2 className="w-3.5 h-3.5" />;
    if (type === "tv") return <Tv className="w-3.5 h-3.5" />;
    if (type === "radio") return <Radio className="w-3.5 h-3.5" />;
    return <Shield className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-slate-500 mt-1">
            Content (si za API)
            {loading ? "" : ` · ${items.length} items`}
          </p>
        </div>
        <Link
          href="/admin/content/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 font-semibold text-sm text-white"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </Link>
      </div>

      {msg && (
        <div className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">{msg}</div>
      )}
      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
      )}

      {/* Ads toggle + explicit Save */}
      <div className="glass-card p-4 max-w-xl border-2 border-amber-500/40 space-y-3">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="font-bold text-sm text-amber-100">
              Tangazo la point (Tazama tangazo)
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Washa/zima kisha bonyeza <b>Hifadhi</b>. Malipo + ads = user anaona chaguo zote.
            </p>
          </div>
          <input
            type="checkbox"
            className="w-6 h-6 accent-violet-500"
            checked={pointsAds}
            onChange={(e) => setPointsAds(e.target.checked)}
          />
        </label>
        <button
          type="button"
          disabled={savingAds}
          onClick={savePointsAds}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {savingAds ? "Inahifadhi…" : "Hifadhi ads setting"}
        </button>
      </div>

      <section className="rounded-2xl border border-emerald-700/30 bg-emerald-950/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-emerald-100">
            Idhinisha malipo ({pending.length})
          </h2>
          <Link href="/admin/payments" className="text-xs text-violet-400">
            Malipo page →
          </Link>
        </div>
        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-slate-500">Hakuna anayesubiri idhini.</p>
          )}
          {pending.slice(0, 15).map((r) => (
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
                      {TYPE_LABELS[r.content.type] || r.content.type}: {r.content.title}
                    </p>
                  )}
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.screenshotUrl} alt="" className="max-h-40 rounded-lg border border-slate-700" />
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

      <div className="flex gap-2 mb-2 flex-wrap">
        {[
          { label: "All", href: "/admin/content" },
          { label: "Movies", href: "/admin/content?type=movie" },
          { label: "TV", href: "/admin/content?type=tv" },
          { label: "Radio", href: "/admin/content?type=radio" },
          { label: "Games", href: "/admin/content?type=game" },
          { label: "VPN", href: "/admin/content?type=vpn" },
        ].map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              (f.href === "/admin/content" && !typeFilter) ||
              f.href.includes(`type=${typeFilter}`)
                ? "bg-violet-600/20 border-violet-500/30 text-violet-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 text-sm">Inapakia…</p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 mb-3">Hakuna content</p>
            <Link href="/admin/content/new" className="text-violet-400 text-sm">
              + Ongeza
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-500">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                          {icon(c.type)}
                        </div>
                        <span className="font-medium truncate max-w-[140px]">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-400 hidden sm:table-cell">{c.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          c.status === "published"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Link
                          href={`/admin/content/${c.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600/30 border border-violet-500/40 text-violet-200 text-xs font-semibold"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <button type="button" onClick={() => toggleStatus(c.id, c.status)} className="p-1.5 text-slate-400 hover:text-violet-300">
                          <ToggleLeft className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => remove(c.id)} className="p-1.5 text-slate-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminContentPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Inapakia content…</p>}>
      <ContentList />
    </Suspense>
  );
}
