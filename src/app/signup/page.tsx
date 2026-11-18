"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Gift } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { getOrCreateDeviceId } from "@/lib/device-id";

const ICONS = [
  { src: CATEGORY_ICONS.movie, label: "Movies" },
  { src: CATEGORY_ICONS.tv, label: "TV" },
  { src: CATEGORY_ICONS.drama, label: "Tamthilia" },
  { src: CATEGORY_ICONS.music, label: "Miziki" },
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState(ref);

  useEffect(() => {
    getOrCreateDeviceId();
    if (ref) setInvite(ref);
  }, [ref]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName,
          email,
          password,
          inviteCode: invite || undefined,
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana kusajili");
        setLoading(false);
        return;
      }
      // Baada ya signup: home moja kwa moja (sio points/account)
      if (data.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch {
      setError("Tatizo la mtandao. Jaribu tena.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0f]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="ETUZA" className="w-12 h-12 mx-auto rounded-xl mb-3" />
          <h1 className="text-2xl font-bold text-white">Jisajili</h1>
          <p className="text-sm text-slate-400 mt-1">ETUZA HUB</p>
        </div>

        <div className="space-y-4">
          <GoogleSignInButton mode="signup" />

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
              <label className="text-xs text-slate-400 mb-1 block">Jina</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  placeholder="Jina lako"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  placeholder="email@example.com"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  placeholder="Angalau herufi 6"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Invite code (si lazima)</label>
              <div className="relative">
                <Gift className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                  placeholder="Code ya mwaliko"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? "Inasajili…" : "Jisajili"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Una account?{" "}
            <Link href="/login" className="text-violet-400 font-medium">
              Ingia
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <SignupForm />
    </Suspense>
  );
}
