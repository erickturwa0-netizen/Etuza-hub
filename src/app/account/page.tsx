"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Copy, UserPlus } from "lucide-react";
import { POINTS } from "@/lib/points";
import FingerprintAuth from "@/components/FingerprintAuth";

type User = {
  email: string;
  fullName: string | null;
  points: number;
  inviteCode: string | null;
  role: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  if (!user) {
    return (
      <main className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-slate-400 mb-4">Ingia ili uone point zako</p>
        <Link href="/login" className="text-violet-400 underline">
          Login
        </Link>
      </main>
    );
  }

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${user.inviteCode || ""}`
      : `/signup?ref=${user.inviteCode || ""}`;

  return (
    <main className="max-w-lg mx-auto px-4 py-10 pb-28">
      <h1 className="text-2xl font-bold mb-1">Account</h1>
      <p className="text-sm text-slate-500 mb-6">{user.email}</p>

      <div className="glass-card p-5 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Coins className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className="text-3xl font-black text-amber-300">{user.points}</p>
          <p className="text-xs text-slate-500">Point zilizopo</p>
        </div>
      </div>

      <div className="glass-card p-5 mb-4 space-y-3">
        <p className="font-semibold text-white text-sm">Fingerprint / Biometric</p>
        <p className="text-xs text-slate-400">
          Sajili alama ya kidole (au Face ID) ya simu yako baada ya Google/login —
          kisha utaweza kuingia bila password.
        </p>
        <FingerprintAuth mode="register" />
      </div>

      <div className="glass-card p-5 mb-4 space-y-2 text-sm text-slate-300">
        <p>
          • Usajili: <b className="text-white">+{POINTS.SIGNUP}</b> point
        </p>
        <p>
          • Kila video: <b className="text-white">−{POINTS.WATCH_COST}</b> point
        </p>
        <p>
          • Tazama tangazo: <b className="text-white">+{POINTS.AD_REWARD}</b>{" "}
          point
        </p>
        <p>
          • Alika rafiki (akasajili):{" "}
          <b className="text-white">+{POINTS.INVITE_REWARD}</b> point
        </p>
      </div>

      <div className="glass-card p-5">
        <p className="font-semibold mb-2 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-violet-400" />
          Invite link yako
        </p>
        <p className="text-xs text-slate-500 mb-2 font-mono break-all">{inviteUrl}</p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(inviteUrl);
            setMsg("Imenakiliwa!");
            setTimeout(() => setMsg(""), 2000);
          }}
          className="inline-flex items-center gap-2 text-sm text-violet-300"
        >
          <Copy className="w-4 h-4" /> Nakili link
        </button>
        {msg && <p className="text-xs text-emerald-400 mt-2">{msg}</p>}
      </div>
    </main>
  );
}
