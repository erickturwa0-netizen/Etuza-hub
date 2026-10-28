"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Coins } from "lucide-react";

type Report = {
  id: string;
  contentTitle: string;
  contentType: string;
  contentKey: string;
  note: string | null;
  screenshotUrl: string | null;
  status: string;
  refundPoints: number;
  createdAt: string;
  user: { email: string; fullName: string | null; points: number };
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/playback-reports", { credentials: "include" });
      const d = await res.json();
      setReports(d.reports || []);
    } catch {
      setMsg("Imeshindwa kupakia");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function refund(id: string) {
    setMsg("");
    try {
      const res = await fetch(`/api/playback-reports/${id}/refund`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) setMsg(d.error || "Imeshindikana");
      else {
        setMsg(`Point +${d.refunded} zimerudishwa`);
        load();
      }
    } catch {
      setMsg("Tatizo la mtandao");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ripoti za kucheza</h1>
          <p className="text-sm text-slate-500">
            Watumiaji waliyoripoti content haikucheza — rudisha point
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg border border-slate-700 text-slate-300"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {msg && <p className="text-sm text-emerald-400 mb-3">{msg}</p>}

      {loading ? (
        <p className="text-slate-500 text-sm">Inapakia…</p>
      ) : reports.length === 0 ? (
        <p className="text-slate-500 text-sm">Hakuna ripoti.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{r.contentTitle}</p>
                  <p className="text-xs text-slate-400">
                    {r.contentType} · {r.user.fullName || r.user.email} · point {r.user.points}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold uppercase px-2 py-1 rounded-lg ${
                    r.status === "refunded"
                      ? "bg-emerald-900/40 text-emerald-300"
                      : "bg-amber-900/40 text-amber-200"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              {r.note && <p className="text-sm text-slate-300">{r.note}</p>}
              {r.screenshotUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.screenshotUrl}
                  alt="screenshot"
                  className="max-h-40 rounded-lg border border-slate-700"
                />
              )}
              {r.status === "pending" && (
                <button
                  type="button"
                  onClick={() => refund(r.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium"
                >
                  <Coins className="w-4 h-4" />
                  Rudisha point (+{r.refundPoints})
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
