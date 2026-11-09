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
      router.push("/account");
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
          {/* Google imefichwa kwa sasa — itaonekana baadaye */}
          {/* <GoogleSignInButton label="Jisajili na Google" /> */}

          <p className="text-xs text-slate-500 text-center rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3 py-2">
            Baada ya kujisajili, nenda <b className="text-cyan-300">Account</b> →
            sajili <b className="text-cyan-300">Fingerprint</b> ili uingie kwa
            alama ya kidole.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Jina</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-violet-500 focus:outline-none text-sm"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-violet-500 focus:outline-none text-sm"
                  placeholder="Angalau herufi 6"
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
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Invite code (si lazima)
              </label>
              <div className="relative">
                <Gift className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-violet-500 focus:outline-none text-sm"
                  placeholder="Code ya rafiki"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
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
