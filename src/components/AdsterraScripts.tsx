"use client";

import { useEffect } from "react";
import { POPUNDER_SCRIPT, SOCIAL_BAR_SCRIPT } from "@/lib/ads";

/**
 * Loads Adsterra Social Bar + Popunder once per session.
 * Skips admin routes so dashboard stays clean.
 */
export default function AdsterraScripts() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const path = window.location.pathname || "";
    if (path.startsWith("/admin")) return;

    // Avoid double-inject on client navigations
    if (document.getElementById("adsterra-social-bar")) return;

    const inject = (id: string, src: string) => {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.setAttribute("data-cfasync", "false");
      s.src = src;
      document.body.appendChild(s);
    };

    inject("adsterra-social-bar", SOCIAL_BAR_SCRIPT);
    inject("adsterra-popunder", POPUNDER_SCRIPT);
  }, []);

  return null;
}
