"use client";

import { useEffect } from "react";

function sid() {
  try {
    const k = "etuza_vpn_sid";
    let id = localStorage.getItem(k);
    if (!id) {
      id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(k, id);
    }
    return id;
  } catch {
    return `v_${Date.now()}`;
  }
}

export default function VpnPageTracker() {
  useEffect(() => {
    void fetch("/api/vpn/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kind: "view", sessionId: sid(), path: "/vpn" }),
    }).catch(() => {});
  }, []);

  return null;
}

export function trackVpnClick(meta?: string) {
  void fetch("/api/vpn/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      kind: "click",
      sessionId: sid(),
      path: "/vpn",
      meta: meta || "",
    }),
  }).catch(() => {});
}
