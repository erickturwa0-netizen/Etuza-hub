"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Shield, Download } from "lucide-react";

type Cfg = {
  id: string;
  plan: string;
  amount: number;
  package_label: string | null;
  status: string;
  config_text: string | null;
  file_url: string | null;
  protocol: string | null;
  delivered_at: string | null;
};

export default function VpnMyConfigs() {
  const [configs, setConfigs] = useState<Cfg[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/vpn/my-config", { credentials: "include" });
        if (res.status === 401) {
          setNeedLogin(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setConfigs(data.configs || []);
      } catch {
        /* */
      }
      setLoading(false);
    })();
  }, []);

  async function copyConfig(c: Cfg) {
    const text =
      (c.config_text || "").trim() ||
      (c.file_url ? `Download: ${c.file_url}` : "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  if (loading) {
    return (
      <p className="text-xs text-slate-500 mb-4">Inatafuta config zako…</p>
    );
  }

  if (needLogin) {
    return (
      <p className="text-xs text-slate-500 mb-6">
        <a href="/login" className="text-blue-400 underline">
          Ingia
        </a>{" "}
        kuona na kunakili VPN config zako.
      </p>
    );
  }

  if (!configs.length) return null;

  return (
    <section className="mb-8 space-y-3">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-400" />
        Config zako (baada ya malipo)
      </h2>
      {configs.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl border border-blue-500/30 bg-slate-950/90 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {c.package_label || c.plan} · TSh {c.amount.toLocaleString()}
              </p>
              {c.protocol && (
                <p className="text-[11px] text-slate-400">{c.protocol}</p>
              )}
              {c.delivered_at && (
                <p className="text-[10px] text-slate-500">
                  {new Date(c.delivered_at).toLocaleString()}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void copyConfig(c)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/40"
            >
              {copiedId === c.id ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Imenakiliwa
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Nakili config
                </>
              )}
            </button>
          </div>

          {c.config_text && (
            <pre className="text-[11px] leading-relaxed text-slate-300 bg-black/50 border border-slate-800 rounded-xl p-3 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
              {c.config_text.slice(0, 2000)}
              {c.config_text.length > 2000 ? "\n…" : ""}
            </pre>
          )}

          {c.file_url && (
            <a
              href={c.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-300 underline"
            >
              <Download className="w-3.5 h-3.5" /> Pakua file
            </a>
          )}
        </div>
      ))}
    </section>
  );
}
