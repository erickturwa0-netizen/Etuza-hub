"use client";

import { useState } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";

type Mode = "login" | "register";

export default function FingerprintAuth({
  mode = "login",
  email,
  next,
  onRegistered,
  className = "",
}: {
  mode?: Mode;
  email?: string;
  next?: string | null;
  onRegistered?: () => void;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function register() {
    setError("");
    setOk("");
    setLoading(true);
    try {
      const optRes = await fetch("/api/auth/webauthn/register/options", {
        method: "POST",
        credentials: "include",
      });
      const optData = await optRes.json();
      if (!optRes.ok) {
        setError(optData.error || "Imeshindikana");
        setLoading(false);
        return;
      }
      const attResp = await startRegistration({ optionsJSON: optData.options });
      const verRes = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          response: attResp,
          challengeToken: optData.challengeToken,
        }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) {
        setError(verData.error || "Imeshindikana kusajili");
        setLoading(false);
        return;
      }
      setOk("Fingerprint imesajiliwa ✓");
      onRegistered?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Imeghairiwa";
      if (/cancel|not allowed|abort/i.test(msg)) {
        setError("Umekatisha au kifaa hakina fingerprint");
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  }

  async function login() {
    setError("");
    setOk("");
    setLoading(true);
    try {
      const optRes = await fetch("/api/auth/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      const optData = await optRes.json();
      if (!optRes.ok) {
        setError(optData.error || "Imeshindikana");
        setLoading(false);
        return;
      }
      const authResp = await startAuthentication({ optionsJSON: optData.options });
      const verRes = await fetch("/api/auth/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          response: authResp,
          challengeToken: optData.challengeToken,
        }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) {
        setError(verData.error || "Fingerprint haikukubaliwa");
        setLoading(false);
        return;
      }
      const role = verData.user?.role;
      if (role === "admin") {
        window.location.href = next?.startsWith("/admin") ? next : "/admin";
      } else {
        window.location.href =
          next && !next.startsWith("/admin") ? next : "/";
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Imeghairiwa";
      if (/cancel|not allowed|abort/i.test(msg)) {
        setError("Umekatisha au fingerprint haipatikani");
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={loading}
        onClick={() => (mode === "register" ? void register() : void login())}
        className="w-full py-3 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-100 font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Fingerprint className="w-4 h-4" />
        )}
        {loading
          ? "Inasubiri fingerprint…"
          : mode === "register"
            ? "Sajili Fingerprint ya simu"
            : "Ingia kwa Fingerprint"}
      </button>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {ok && <p className="text-xs text-emerald-400 mt-2">{ok}</p>}
      {mode === "login" && (
        <p className="text-[10px] text-slate-500 mt-1.5 text-center">
          Lazima uwe umesajili fingerprint baada ya Google/login (Account)
        </p>
      )}
    </div>
  );
}
