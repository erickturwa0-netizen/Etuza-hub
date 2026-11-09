"use client";

import { useState } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";

type Mode = "login" | "register";

function mapWebAuthnError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e || "");
  const lower = msg.toLowerCase();

  if (/cancel|abort|notallowederror/i.test(msg) || lower.includes("timed out")) {
    return "Umekatisha au muda umeisha. Jaribu tena.";
  }
  if (
    lower.includes("credential manager") ||
    lower.includes("unknown error") ||
    lower.includes("publickeycredential")
  ) {
    return "Hakuna fingerprint iliyosajiliwa kwenye account hii, au browser hauruhusu. Andika email → Account → Sajili Fingerprint.";
  }
  if (lower.includes("invalid state") || lower.includes("already registered")) {
    return "Fingerprint tayari imesajiliwa kwenye kifaa hiki.";
  }
  if (lower.includes("security") || lower.includes("https")) {
    return "Fingerprint inahitaji HTTPS / browser salama.";
  }
  if (lower.includes("not supported") || lower.includes("unavailable")) {
    return "Simu au browser hii haina fingerprint / Face ID.";
  }
  // keep short
  return msg.length > 120
    ? "Hitilafu ya fingerprint. Hakikisha umesajili kwenye Account kwanza."
    : msg || "Hitilafu ya fingerprint";
}

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
      if (
        typeof window === "undefined" ||
        !window.PublicKeyCredential
      ) {
        setError("Browser hii haitumii fingerprint / passkey.");
        setLoading(false);
        return;
      }

      const optRes = await fetch("/api/auth/webauthn/register/options", {
        method: "POST",
        credentials: "include",
      });
      const optData = await optRes.json();
      if (!optRes.ok) {
        setError(optData.error || "Ingia kwa email/password kwanza kisha usajili fingerprint");
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
        setError(verData.error || "Imeshindikana kusajili fingerprint");
        setLoading(false);
        return;
      }
      setOk("Fingerprint imesajiliwa ✓ — sasa unaweza kuingia nayo");
      onRegistered?.();
    } catch (e) {
      setError(mapWebAuthnError(e));
    }
    setLoading(false);
  }

  async function login() {
    setError("");
    setOk("");
    const em = (email || "").trim().toLowerCase();
    if (!em || !em.includes("@")) {
      setError("Andika email yako hapo chini kwanza, kisha bonyeza Fingerprint.");
      return;
    }

    setLoading(true);
    try {
      if (
        typeof window === "undefined" ||
        !window.PublicKeyCredential
      ) {
        setError("Browser hii haitumii fingerprint / passkey.");
        setLoading(false);
        return;
      }

      const optRes = await fetch("/api/auth/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      });
      const optData = await optRes.json();
      if (!optRes.ok) {
        setError(
          optData.error ||
            "Hakuna fingerprint kwa email hii. Ingia kwa password → Account → Sajili Fingerprint."
        );
        setLoading(false);
        return;
      }

      const authResp = await startAuthentication({
        optionsJSON: optData.options,
      });
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
      setError(mapWebAuthnError(e));
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
      {error && <p className="text-xs text-red-400 mt-2 leading-relaxed">{error}</p>}
      {ok && <p className="text-xs text-emerald-400 mt-2">{ok}</p>}
      {mode === "login" && (
        <p className="text-[10px] text-slate-500 mt-1.5 text-center leading-relaxed">
          1) Andika <b className="text-slate-400">email</b> hapo chini · 2) Fingerprint
          inafanya kazi tu baada ya kusajili kwenye{" "}
          <b className="text-slate-400">Account</b> (baada ya kuingia kwa password)
        </p>
      )}
    </div>
  );
}
