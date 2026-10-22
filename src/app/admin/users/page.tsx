"use client";

import { useEffect, useState } from "react";
import { Users, Coins } from "lucide-react";

type User = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  points: number;
  inviteCode: string | null;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, addPoints }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error || "Imeshindikana");
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, points: d.user.points, role: d.user.role } : u
          )
        );
        setMsg(`Point zimebadilishwa (${d.user.email}: ${d.user.points})`);
      }
    } catch {
      setMsg("Tatizo la mtandao");
    }
    setBusyId("");
  }

  async function setPoints(userId: string) {
    const raw = window.prompt("Weka point mpya (namba):");
    if (raw == null) return;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) {
      setMsg("Namba si sahihi");
      return;
    }
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, points: n }),
      });
      const d = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, points: d.user.points } : u))
        );
      } else setMsg(d.error || "Fail");
    } catch {
      setMsg("Tatizo");
    }
    setBusyId("");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-violet-400" />
          Users & Points
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? "…" : `${users.length} users`} · Signup +10 · Invite +5 · Ad +3 · Watch −1
        </p>
        {msg && <p className="text-sm text-amber-300 mt-2">{msg}</p>}
      </div>

      <div className="glass-card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-slate-500 text-sm">Inapakia…</p>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> Points
                  </span>
                </th>
                <th className="px-4 py-3 font-medium">Invite</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.email}</p>
                    <p className="text-xs text-slate-500">{u.fullName || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        u.role === "admin"
                          ? "bg-violet-500/15 text-violet-300"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-amber-300">{u.points ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                    {u.inviteCode || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => adjust(u.id, 5)}
                        className="px-2 py-1 rounded-md text-[11px] bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => adjust(u.id, 10)}
                        className="px-2 py-1 rounded-md text-[11px] bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => adjust(u.id, -5)}
                        className="px-2 py-1 rounded-md text-[11px] bg-red-600/20 text-red-300 border border-red-500/30"
                      >
                        −5
                      </button>
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => setPoints(u.id)}
                        className="px-2 py-1 rounded-md text-[11px] bg-slate-700 text-slate-200"
                      >
                        Set…
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
