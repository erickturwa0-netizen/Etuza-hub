"use client";

import { useEffect } from "react";
import { POPUNDER_SCRIPT, SOCIAL_BAR_SCRIPT } from "@/lib/ads";

/**
 * Load ads after UI is interactive so bottom nav / buttons stay clickable.
 */
export default function AdsterraScripts() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const path = window.location.pathname || "";
    if (path.startsWith("/admin")) return;
    if (document.getElementById("adsterra-social-bar")) return;

    const inject = (id: string, src: string) => {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.defer = true;
      s.setAttribute("data-cfasync", "false");
      s.src = src;
      document.body.appendChild(s);
    };

    // Delay so page + bottom nav bind first
    const t = window.setTimeout(() => {
      inject("adsterra-social-bar", SOCIAL_BAR_SCRIPT);
      inject("adsterra-popunder", POPUNDER_SCRIPT);
    }, 2500);

    return () => window.clearTimeout(t);
  }, []);

  return null;
}
