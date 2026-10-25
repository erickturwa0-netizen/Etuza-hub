"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { isGooglePending } from "@/lib/firebase-client";

const ICONS = [
  { src: CATEGORY_ICONS.movie, label: "Movies" },
  { src: CATEGORY_ICONS.music, label: "Miziki" },
  { src: CATEGORY_ICONS.radio, label: "Radio" },
  { src: CATEGORY_ICONS.tv, label: "TV" },
  { src: CATEGORY_ICONS.game, label: "Games" },
  { src: CATEGORY_ICONS.vpn, label: "VPN" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Skip splash when returning from Google
  const [phase, setPhase] = useState<"splash" | "form">(() =>
    typeof window !== "undefined" && isGooglePending() ? "form" : "splash"
  );

  useEffect(() => {
    if (phase !== "splash") return;
    const t = setTimeout(() => setPhase("form"), 1200);
    return () => clearTimeout(t);
  }, [phase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana kuingia");
        setLoading(false);
        return;
      }

      if (data.user?.role === "admin") {
        window.location.href = next?.startsWith("/admin") ? next : "/admin";
      } else {
        window.location.href =
          next && !next.startsWith("/admin") ? next : "/";
      }
    } catch {
      setError("Tatizo la mtandao. Jaribu tena.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0f] overflow-hidden relative">
      <style>{`
        @keyframes fallIn {
          0% { transform: translateY(-80vh) scale(0.7); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .icon-fall { animation: fallIn 0.7s ease-out both; }
        .form-in { animation: fadeUp 0.4s ease-out both; }
      `}</style>

      {phase === "splash" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="ETUZA" className="w-12 h-12 rounded-2xl" width={48} height={48} />
            <span className="text-2xl font-extrabold text-violet-300">ETUZA HUB</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-xs">
            {ICONS.map(({ src, label }, i) => (
              <div
                key={label}
                className="icon-fall w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-2"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} className="w-full h-full object-contain" />
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 animate-pulse">Inapakia…</p>
        </div>
      )}

      {phase === "form" && (
        <div className="w-full max-w-md form-in relative z-20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="ETUZA" className="w-10 h-10 rounded-xl" width={40} height={40} />
              <span className="text-xl font-extrabold text-violet-300">ETUZA HUB</span>
            </div>
            <h1 className="text-2xl font-bold">Karibu tena</h1>
            <p className="text-sm text-slate-500 mt-1">Ingia na Google au email</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur p-6 sm:p-8 space-y-4 shadow-2xl">
            <GoogleSignInButton next={next} />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500">au email</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-violet-500 focus:outline-none text-sm"
                    placeholder="wewe@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-violet-500 focus:outline-none text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 disabled:opacity-60 font-semibold text-sm text-white"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Inaingia…" : "Ingia"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500">
              Huna account?{" "}
              <Link href="/signup" className="text-violet-400 font-medium">
                Jisajili
              </Link>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <LoginForm />
    </Suspense>
  );
}
