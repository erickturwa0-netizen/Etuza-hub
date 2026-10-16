"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        localStorage.setItem(
          "etuza_user",
          JSON.stringify({ email, name: fullName || email.split("@")[0] })
        );
        setSuccess(true);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1000);
        return;
      }

      const supabase = createClient();
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-black shadow-lg shadow-violet-500/30">
              E
            </span>
            <span className="text-xl font-extrabold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              ETUZA HUB
            </span>
          </Link>
          <h1 className="text-2xl font-bold">Fungua account</h1>
          <p className="text-sm text-slate-500 mt-1">Jisajili bure · sekunde chache</p>
        </div>

        {success ? (
          <div className="glass-card p-8 text-center">
            <p className="text-emerald-400 font-semibold text-lg mb-2">Account imeundwa!</p>
            <p className="text-slate-500 text-sm">Inakuelekeza…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-4">
            {error && (
              <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Jina</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm"
                  placeholder="Jina lako"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm"
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
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900/80 border border-white/10 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm"
                  placeholder="Angalau herufi 6"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 font-semibold text-sm shadow-lg shadow-violet-600/25 transition"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? "Inaunda…" : "Jisajili"}
            </button>

            <p className="text-center text-sm text-slate-500 pt-2">
              Una account?{" "}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
                Ingia
              </Link>
            </p>
          </form>
        )}

        <p className="text-center text-xs text-slate-600 mt-6">
          <Link href="/" className="hover:text-slate-400">← Rudi nyumbani</Link>
        </p>
      </div>
    </main>
  );
}
