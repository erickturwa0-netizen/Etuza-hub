"use client";

import { useEffect, useState } from "react";
import { Shield, Eye, MousePointerClick, CreditCard, Send } from "lucide-react";

type Order = {
  id: string;
  user_id: string;
  amount: number;
  plan: string;
  package_label: string | null;
  status: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  config_text?: string | null;
  file_url?: string | null;
};

export default function AdminVpnPage() {
  const [stats, setStats] = useState({ view: 0, click: 0, pay: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [bonuses, setBonuses] = useState<
    {
      email: string | null;
      team_level: string;
      amount_paid: number;
      bonus_hours: number;
      created_at: string;
    }[]
  >([]);
  const [events, setEvents] = useState<
    { kind: string; email: string | null; created_at: string }[]
  >([]);
  const [active, setActive] = useState<Order | null>(null);
  const [configText, setConfigText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [protocol, setProtocol] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/vpn", { credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Imeshindikana");
      return;
    }
    setStats(data.stats || { view: 0, click: 0, pay: 0 });
    setOrders(data.orders || []);
    setBonuses(data.bonuses || []);
    setEvents(data.recentEvents || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function deliver() {
    if (!active) return;
    setBusy(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/vpn", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: active.id,
        configText,
        fileUrl,
        protocol,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Imeshindikana");
    else {
      setMsg("Config imetumwa kwa mnunuzi ✓");
      setActive(null);
      setConfigText("");
      setFileUrl("");
      await load();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">VPN Dashboard</h1>
          <p className="text-xs text-slate-500">
            Requests · Views · Clicks · Malipo · Referral bonuses
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <Eye className="w-4 h-4 text-slate-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.view}</p>
          <p className="text-[11px] text-slate-500">Views (siku 30)</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <MousePointerClick className="w-4 h-4 text-violet-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.click}</p>
          <p className="text-[11px] text-slate-500">Clicks</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <CreditCard className="w-4 h-4 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.pay}</p>
          <p className="text-[11px] text-slate-500">Paid events</p>
        </div>
      </div>

      {msg && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
          {msg}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="font-semibold text-white text-sm">
            Config requests (baada ya malipo)
          </h2>
          <p className="text-[11px] text-slate-500">
            Bonyeza request → andika config kama Add Content → Tuma kwa mnunuzi
          </p>
        </div>
        <div className="divide-y divide-slate-800 max-h-[28rem] overflow-y-auto">
          {orders.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Hakuna request bado.</p>
          )}
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setActive(o);
                setConfigText(o.config_text || "");
                setFileUrl(o.file_url || "");
              }}
              className={`w-full text-left px-4 py-3 hover:bg-slate-900/80 ${
                o.status === "pending_config" ? "bg-amber-500/5" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {o.full_name || o.email || o.user_id.slice(0, 8)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    TSh {o.amount.toLocaleString()} · {o.plan} ·{" "}
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                    o.status === "pending_config"
                      ? "bg-amber-500/20 text-amber-200"
                      : "bg-emerald-500/20 text-emerald-200"
                  }`}
                >
                  {o.status === "pending_config" ? "Pending" : "Delivered"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {active && (
        <section className="rounded-2xl border border-violet-500/40 bg-slate-950 p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Tuma config → {active.full_name || active.email}
          </h3>
          <input
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            placeholder="Protocol (V2Ray, OpenVPN, WireGuard…)"
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
          />
          <input
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="File / download URL (hiari)"
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white"
          />
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            rows={8}
            placeholder="Bandika config text hapa (kama unavyoongeza content)…"
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white font-mono"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void deliver()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Tuma config
            </button>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm"
            >
              Funga
            </button>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Referral bonuses</h3>
          <ul className="space-y-2 max-h-48 overflow-y-auto text-xs text-slate-400">
            {bonuses.map((b, i) => (
              <li key={i}>
                Team {b.team_level} · {b.email || "user"} · TSh{" "}
                {b.amount_paid} → +{b.bonus_hours}h
              </li>
            ))}
            {!bonuses.length && <li>Hakuna bado</li>}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Events</h3>
          <ul className="space-y-2 max-h-48 overflow-y-auto text-xs text-slate-400">
            {events.map((e, i) => (
              <li key={i}>
                {e.kind} · {e.email || "guest"} ·{" "}
                {new Date(e.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-200">Referral bonus (VPN siku)</p>
        <p>Team A: 1,500→+1d · 2,500→+2d · 8,000→+5d</p>
        <p>Team B: 1,500→+12h · 2,500→+1d · 8,000→+2.5d</p>
        <p>Team C: 1,500→+8h · 2,500→+12h · 8,000→+2d</p>
      </div>
    </div>
  );
}
