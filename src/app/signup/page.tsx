"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Gift } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/category-icons";

const ICONS = [
  { src: CATEGORY_ICONS.movie, label: "Movies" },
  { src: CATEGORY_ICONS.tv, label: "TV" },
  { src: CATEGORY_ICONS.drama, label: "Tamthilia" },
  { src: CATEGORY_ICONS.music, label: "Miziki" },
  { src: CATEGORY_ICONS.radio, label: "Radio" },
  { src: CATEGORY_ICONS.game, label: "Games" },
  { src: CATEGORY_ICONS.vpn, label: "VPN" },
];

function SignupForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ref = sp.get("ref") || sp.get("invite") || "";
    if (ref) setInviteCode(ref.toUpperCase());
  }, [sp]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          inviteCode: inviteCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Imeshindikana kuunda account");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Tatizo la mtandao. Jaribu tena.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0f]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="ETUZA"
              className="w-10 h-10 rounded-xl"
              width={40}
              height={40}
            />
            <span className="text-xl font-extrabold text-violet-300">ETUZA HUB</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {ICONS.map(({ src, label }) => (
              <div
                key={label}
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1.5"
                title={label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} className="w-full h-full object-contain" />
              </div>
            ))}
          </div>

          <h1 className="text-2xl font-bold">Fungua account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pata <span className="text-amber-400 font-semibold">point 10 bure</span> za
            kuanza
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-4">
          {error && (
            <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Jina
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-900 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm"
                placeholder="Jina lako"
              />
            </div>
          </div>

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
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-900 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm"
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
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm"
                placeholder="Angalau herufi 6"
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

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Invite code (si lazima)
            </label>
            <div className="relative">
              <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-900 border border-white/10 focus:border-violet-500/50 focus:outline-none text-sm uppercase"
                placeholder="mf. ETAB12CD"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ukitumia code ya rafiki, yeye anapata +5 point
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 font-semibold text-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? "Inaunda…" : "Jisajili (+10 point)"}
          </button>

          <p className="text-center text-sm text-slate-500 pt-2">
            Una account?{" "}
            <Link
              href="/login"
              className="text-violet-400 hover:text-violet-300 font-medium"
            >
              Ingia
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm bg-[#0a0a0f]">
          Inapakia…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
