"use client";

import { useEffect, useRef, useState } from "react";
import {
  startGoogleSignIn,
  resolveGoogleIdToken,
  isGooglePending,
  clearGooglePending,
} from "@/lib/firebase-client";

type Props = {
  next?: string | null;
  label?: string;
};

async function exchangeToken(idToken: string, next?: string | null) {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error || data.detail || `Server error ${res.status}`
    );
  }
  clearGooglePending();
  const dest =
    data.user?.role === "admin"
      ? next?.startsWith("/admin")
        ? next
        : "/admin"
      : next && !next.startsWith("/admin")
        ? next
        : "/";
  window.location.replace(dest || "/");
}

/** Call once at top of login/signup page to finish redirect. */
export function useGoogleRedirectHandler(next?: string | null) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const pending = isGooglePending();
      // Always try — covers cases where flag was lost
      try {
        if (pending) setStatus("Inakamilisha Google sign-in…");
        const idToken = await resolveGoogleIdToken();
        if (!idToken) {
          if (pending) {
            setError(
              "Google haikurudisha session. Jaribu tena button ya Google."
            );
            clearGooglePending();
          }
          setStatus("");
          return;
        }
        setStatus("Inaingiza account…");
        await exchangeToken(idToken, next);
      } catch (e) {
        console.error(e);
        setError(
          e instanceof Error
            ? e.message.slice(0, 220)
            : "Google sign-in imeshindikana"
        );
        setStatus("");
        clearGooglePending();
      }
    })();
  }, [next]);

  return { status, error, setError };
}

export default function GoogleSignInButton({ next, label }: Props) {
  const { status, error, setError } = useGoogleRedirectHandler(next);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await startGoogleSignIn();
      // navigates away
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Imeshindikana kufungua Google";
      if (msg.includes("unauthorized-domain")) {
        setError("Domain haijaidhinishwa kwenye Firebase Authorized domains.");
      } else {
        setError(msg.slice(0, 220));
      }
      setLoading(false);
    }
  }

  const busy = loading || !!status;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-800 font-semibold text-sm border border-slate-200 shadow-sm transition"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {busy ? status || "Inaingia…" : label || "Endelea na Google"}
      </button>
      {status && !error && (
        <p className="text-xs text-emerald-400 text-center">{status}</p>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center leading-relaxed">{error}</p>
      )}
    </div>
  );
}
