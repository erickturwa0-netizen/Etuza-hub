"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/covers";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import FingerprintAuth from "@/components/FingerprintAuth";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { isGooglePending } from "@/lib/firebase-client";

const ICONS = [
  { src: CATEGORY_ICONS.movie, label: "Movies" },
  { src: CATEGORY_ICONS.music, label: "Miziki" },
  { src: CATEGORY_ICONS.radio, label: "Radio" },
  { src: CATEGORY_ICONS.tv, label: "TV" },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"splash" | "form">(() =>
    typeof window !== "undefined" && isGooglePending() ? "form" : "splash"
  );

  useEffect(() => {
    getOrCreateDeviceId();
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
        body: JSON.stringify({
          email,
          password,
          deviceId: getOrCreateDeviceId(),
        }),
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

  const oauthErr = searchParams.get("error");

  if (phase === "splash") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] px-4">
        <div className="text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="ETUZA" className="w-16 h-16 mx-auto rounded-2xl" />
          <p className="text-violet-300 font-bold text-lg">ETUZA HUB</p>
          <div className="flex gap-2 justify-center flex-wrap max-w-xs mx-auto">
            {ICONS.map((ic) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={ic.label} src={ic.src} alt={ic.label} className="w-8 h-8" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0f]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="ETUZA" className="w-12 h-12 mx-auto rounded-xl mb-3" />
          <h1 className="text-2xl font-bold text-white">Ingia</h1>
          <p className="text-sm text-slate-400 mt-1">ETUZA HUB</p>
        </div>

        <div className="space-y-4">
          <GoogleSignInButton next={next} />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-[#0a0a0f] px-2 text-slate-500">au fingerprint</span>
            </div>
          </div>
          <FingerprintAuth mode="login" email={email} next={next} />

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-[#0a0a0f] px-2 text-slate-500">au email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-violet-500 focus:outline-none text-sm"
                  placeholder="wewe@email.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-violet-500 focus:outline-none text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {(error || oauthErr) && (
              <p className="text-sm text-red-400">{error || oauthErr}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Inaingia…" : "Ingia"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Huna account?{" "}
            <Link href="/signup" className="text-violet-400 font-medium">
              Jisajili
            </Link>
          </p>
        </div>
      </div>
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
