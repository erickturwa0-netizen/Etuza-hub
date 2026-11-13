"use client";

import { useEffect, useState } from "react";
import { Users, RefreshCw, Shield, Coins } from "lucide-react";

type User = {
  id: string;
  email: string;
  fullName?: string | null;
  name?: string | null;
  role: string;
  points: number;
  createdAt?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");
  const [hint, setHint] = useState("");
  const [editId, setEditId] = useState("");
  const [editVal, setEditVal] = useState("");

  function load() {
    setLoading(true);
    setMsg("");
    setHint("");
    fetch("/api/admin/users", { credentials: "include" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        setUsers(Array.isArray(d.users) ? d.users : []);
        if (!r.ok) {
          setMsg(d.error || `Error ${r.status}`);
        } else if (d.error) {
          setMsg(d.error);
        }
        if (d.hint) setHint(String(d.hint));
        setLoading(false);
      })
      .catch(() => {
        setMsg("Imeshindwa kupakia users (network)");
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function adjust(userId: string, addPoints: number) {
    setBusyId(userId);
    setMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, addPoints }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(d.error || "Imeshindikana");
      else load();
    } catch {
      setMsg("Network error");
    }
    setBusyId("");
  }

  async function setPoints(userId: string) {
    const n = Number(editVal);
    if (!Number.isFinite(n) || n < 0) {
      setMsg("Weka number sahihi");
      return;
    }
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, points: Math.floor(n) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(d.error || "Imeshindikana kuhifadhi");
      else {
        setEditId("");
        load();
      }
    } catch {
      setMsg("Network error");
    }
    setBusyId("");
  }

  async function toggleRole(userId: string, role: string) {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: role === "admin" ? "user" : "admin",
        }),
      });
      if (res.ok) load();
      else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error || "Role update failed");
      }
    } catch {
      setMsg("Network error");
    }
    setBusyId("");
  }

  return (
    <div className="space-y-4 max-w-3xl pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-400" />
            Users &amp; Points
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {loading ? "…" : `${users.length} users`} · Signup +10 · Invite +5 · Ad
            +3 · Watch −1
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-xl bg-slate-800 text-slate-300"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {msg && (
        <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm">
          {msg}
        </div>
      )}
      {hint && (
        <div className="px-3 py-2 rounded-xl bg-slate-800/80 text-slate-400 text-[11px] font-mono break-all">
          {hint}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 p-4">Inapakia users…</p>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-400 space-y-2">
          <p>Hakuna users au huna ruhusa ya admin.</p>
          <p className="text-xs text-slate-500">
            Kama umeingia kama admin, bonyeza refresh. Kama bado, angalia hint
            hapo juu.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const label = u.fullName || u.name || u.email;
            return (
              <div
                key={u.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{label}</p>
                    <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      u.role === "admin"
                        ? "border-violet-500/40 text-violet-300"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Coins className="w-3.5 h-3.5" /> {u.points ?? 0} pts
                  </span>
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => adjust(u.id, 10)}
                    className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-300"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => adjust(u.id, -5)}
                    className="px-2 py-1 rounded-lg bg-red-600/20 text-red-300"
                  >
                    −5
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => toggleRole(u.id, u.role)}
                    className="px-2 py-1 rounded-lg bg-violet-600/20 text-violet-300 inline-flex items-center gap-1"
                  >
                    <Shield className="w-3 h-3" /> Role
                  </button>
                  {editId === u.id ? (
                    <span className="flex items-center gap-1">
                      <input
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setPoints(u.id)}
                        className="px-2 py-1 rounded-lg bg-sky-600 text-white text-xs"
                      >
                        Set
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(u.id);
                        setEditVal(String(u.points ?? 0));
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300"
                    >
                      Set pts
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
