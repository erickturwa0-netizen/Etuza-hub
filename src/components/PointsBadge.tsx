"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";

export default function PointsBadge() {
  const [points, setPoints] = useState<number | null>(null);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setLogged(true);
          setPoints(d.user.points ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  if (!logged) {
    return (
      <Link
        href="/signup"
        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-amber-300/90 border border-amber-500/20"
      >
        <Coins className="w-3.5 h-3.5" />
        +10 point
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-amber-300 border border-amber-500/30 bg-amber-500/10"
      title="Point zako"
    >
      <Coins className="w-3.5 h-3.5" />
      {points ?? 0}
    </Link>
  );
}
