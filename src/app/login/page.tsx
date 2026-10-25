"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const ICONS = [
  { src: CATEGORY_ICONS.movie, label: "Movies", delay: "0ms" },
  { src: CATEGORY_ICONS.music, label: "Miziki", delay: "80ms" },
  { src: CATEGORY_ICONS.radio, label: "Radio", delay: "160ms" },
  { src: CATEGORY_ICONS.tv, label: "TV", delay: "240ms" },
  { src: CATEGORY_ICONS.game, label: "Games", delay: "320ms" },
  { src: CATEGORY_ICONS.vpn, label: "VPN", delay: "400ms" },
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
  const [phase, setPhase] = useState<"splash" | "form">("splash");

  useEffect(() => {
    const t = setTimeout(() => setPhase("form"), 1800);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana kuingia");
        setLoading(false);
        return;
      }

      if (data.user?.role === "admin") {
        router.push(next?.startsWith("/admin") ? next : "/admin");
      } else {
        router.push(next && !next.startsWith("/admin") ? next : "/");
      }
      router.refresh();
    } catch {
      setError("Tatizo la mtandao. Jaribu tena.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0f] overflow-hidden relative">
      <style>{`
        @keyframes fallIn {
          0% { transform: translateY(-120vh) rotate(-20deg) scale(0.6); opacity: 0; }
          60% { opacity: 1; }
          80% { transform: translateY(8px) rotate(4deg) scale(1.05); }
          100% { transform: translateY(0) rotate(0) scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.3); }
          50% { box-shadow: 0 0 40px rgba(139,92,246,0.6); }
        }
        .icon-fall { animation: fallIn 0.9s cubic-bezier(.22,1.2,.36,1) both; }
        .form-in { animation: fadeUp 0.55s ease-out both; }
        .logo-glow { animation: pulseGlow 2.5s ease-in-out infinite; }
      `}</style>

      {phase === "splash" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 z-10">
          <div className="flex items-center gap-2 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="ETUZA"
              className="w-12 h-12 rounded-2xl logo-glow"
              width={48}
              height={48}
            />
            <span className="text-2xl font-extrabold text-violet-300">ETUZA HUB</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-xs">
            {ICONS.map(({ src, label, delay }) => (
              <div
                key={label}
                className="icon-fall w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xl p-2"
                style={{ animationDelay: delay }}
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
              <img
                src="/logo.svg"
                alt="ETUZA"
                className="w-10 h-10 rounded-xl logo-glow"
                width={40}
                height={40}
              />
              <span className="text-xl font-extrabold text-violet-300">ETUZA HUB</span>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-5">
              {ICONS.map(({ src, label }) => (
                <div
                  key={label}
                  className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-1.5"
                  title={label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={label} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>

            <h1 className="text-2xl font-bold">Karibu tena</h1>
            <p className="text-sm text-slate-500 mt-1">
              Movies · Music · Radio · TV · Games · VPN
            </p>
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
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Email
                </label>
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
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  Password
                </label>
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
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 font-semibold text-sm text-white shadow-lg shadow-violet-900/40"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Inaingia…" : "Ingia"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 pt-1">
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
