"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Props = {
  next?: string | null;
  label?: string;
};

const FALLBACK_CLIENT_ID =
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
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("GIS load failed"))
      );
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

async function exchangeIdToken(idToken: string, next?: string | null) {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.detail || `Server ${res.status}`);
  }
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

export default function GoogleSignInButton({ next, label }: Props) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const nextRef = useRef(next);
  nextRef.current = next;

  const onCredential = useCallback(async (response: { credential?: string }) => {
    if (!response.credential) {
      setError("Google haikutoa credential");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await exchangeIdToken(response.credential, nextRef.current);
    } catch (e) {
      setError(e instanceof Error ? e.message.slice(0, 220) : "Imeshindikana");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGisScript();
        if (cancelled || !window.google?.accounts?.id) return;

        let clientId = FALLBACK_CLIENT_ID;
        try {
          const r = await fetch("/api/auth/google-client");
          const j = await r.json();
          if (j.clientId) clientId = j.clientId;
        } catch {
          /* use fallback */
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: onCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
        });

        if (btnRef.current) {
          btnRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(btnRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: 320,
            logo_alignment: "left",
          });
        }
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Google haijaweza kupakiwa"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  return (
    <div className="space-y-2">
      {loading && (
        <p className="text-xs text-emerald-400 text-center">Inaingiza account…</p>
      )}
      <div
        ref={btnRef}
        className={`flex justify-center min-h-[44px] ${loading ? "opacity-50 pointer-events-none" : ""}`}
      />
      {!ready && !error && (
        <p className="text-xs text-slate-500 text-center">
          {label || "Inapakia Google…"}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center leading-relaxed">{error}</p>
      )}
    </div>
  );
}
