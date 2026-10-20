"use client";

import { useEffect, useRef } from "react";

function getSessionId() {
  if (typeof window === "undefined") return "";
  const key = "etuza_vid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

export default function PresenceTracker({
  section,
  title,
}: {
  section: string;
  title?: string;
}) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const sessionId = getSessionId();
    if (!sessionId || !section) return;

    const path = typeof window !== "undefined" ? window.location.pathname : "";

    async function beat() {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, section, title, path }),
          keepalive: true,
        });
      } catch {
        /* ignore */
      }
    }

    beat();
    const t = setInterval(beat, 25000);
    return () => clearInterval(t);
  }, [section, title]);

  return null;
}
