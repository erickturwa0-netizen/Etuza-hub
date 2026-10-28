"use client";

import { useEffect, useRef, useState } from "react";
import { getOrCreateDeviceId } from "@/lib/device-id";

type Props = {
  next?: string | null;
  label?: string;
};

const CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "611497432345-vddmu6fqjup24qa8retjp4gkv4kv7e4i.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (
            el: HTMLElement,
            cfg: Record<string, unknown>
          ) => void;
        };
        oauth2: {
          initCodeClient: (cfg: {
            client_id: string;
            scope: string;
            ux_mode: string;
            redirect_uri: string;
            state?: string;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const prev = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (prev) {
      prev.addEventListener("load", () => resolve());
      prev.addEventListener("error", () => reject(new Error("GIS failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Imeshindwa kupakia Google"));
    document.head.appendChild(s);
  });
}

export default function GoogleSignInButton({ next, label }: Props) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Bind device id early
    getOrCreateDeviceId();
    let cancelled = false;
    (async () => {
      try {
        await loadGis();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Google haijapakiwa");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClick() {
    if (started.current) return;
    setError("");
    setLoading(true);

    try {
      await loadGis();
      if (!window.google?.accounts?.oauth2) {
        throw new Error("Google SDK haipo");
      }

      const origin = window.location.origin;
      const redirectUri = `${origin}/api/auth/google/callback`;
      const deviceId = getOrCreateDeviceId();
      const payload = JSON.stringify({
        next: next || "/",
        deviceId,
      });
      const state = btoa(unescape(encodeURIComponent(payload)));

      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: CLIENT_ID,
        scope: "openid email profile",
        ux_mode: "redirect",
        redirect_uri: redirectUri,
        state,
      });
      started.current = true;
      client.requestCode();
    } catch (e) {
      started.current = false;
      setLoading(false);
      setError(e instanceof Error ? e.message : "Google imeshindwa");
    }
  }

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !ready}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm border border-slate-200 disabled:opacity-60"
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
        {loading ? "Inaendelea…" : label || "Sign in with Google"}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
