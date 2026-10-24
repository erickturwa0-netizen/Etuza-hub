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
  const [editId, setEditId] = useState("");
  const [editVal, setEditVal] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/users", { credentials: "include" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setMsg(d.error || `Error ${r.status}`);
          setUsers([]);
        } else {
          setUsers(d.users || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setMsg("Imeshindwa kupakia users");
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
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error || "Imeshindikana");
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, points: d.user.points, role: d.user.role }
              : u
          )
        );
        setMsg(`✓ ${d.user.email}: ${d.user.points} points`);
      }
    } catch {
      setMsg("Tatizo la mtandao");
    }
    setBusyId("");
  }

  async function savePoints(userId: string) {
    const n = parseInt(editVal, 10);
    if (!Number.isFinite(n) || n < 0 || n > 100000) {
      setMsg("Weka namba sahihi (0–100000)");
      return;
    }
    setBusyId(userId);
    setMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, points: n }),
      });
      const d = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, points: d.user.points } : u
          )
        );
        setMsg(`✓ Point zimewekwa: ${d.user.email} = ${d.user.points}`);
        setEditId("");
        setEditVal("");
      } else {
        setMsg(d.error || "Imeshindikana kuhifadhi");
      }
    } catch {
      setMsg("Tatizo la mtandao");
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
          {loading ? "…" : `${users.length} users`} · Signup +10 · Invite +5 · Ad
          +3 · Watch −1
        </p>
        {msg && (
          <p className="text-sm text-amber-300 mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {msg}
          </p>
        )}
      </div>

      <div className="glass-card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-slate-500 text-sm">Inapakia…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-slate-500 text-sm">
            Hakuna users au huna ruhusa ya admin.
          </p>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
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
                  <td className="px-4 py-3">
                    {editId === u.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100000}
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-600 text-amber-200 text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => savePoints(u.id)}
                          className="px-2 py-1 rounded-md text-[11px] bg-violet-600 text-white"
                        >
                          Hifadhi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditId("");
                            setEditVal("");
                          }}
                          className="px-2 py-1 rounded-md text-[11px] text-slate-400"
                        >
                          Ghairi
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-amber-300">
                        {u.points ?? 0}
                      </span>
                    )}
                  </td>
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
                        onClick={() => {
                          setEditId(u.id);
                          setEditVal(String(u.points ?? 0));
                        }}
                        className="px-2 py-1 rounded-md text-[11px] bg-slate-700 text-slate-200"
                      >
                        Set
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
