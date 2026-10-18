"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";

type LinkItem = { url: string; host: string; label: string };

function isDirectFile(url: string) {
  return /\.(zip|rar|7z|apk|ipa|iso|cso|mp4|mkv)(\?|$)/i.test(url);
}

function isFileHost(url: string) {
  return /mediafire\.com|mega\.nz|drive\.google\.com|pixeldrain\.com|gofile\.io/i.test(
    url
  );
}

export default function GameDownloadPanel({
  linkUrl,
  title,
}: {
  linkUrl: string;
  title: string;
}) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const direct = isDirectFile(linkUrl) || isFileHost(linkUrl);

  useEffect(() => {
    if (!linkUrl || direct) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/resolve-downloads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: linkUrl }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error || "Imeshindikana");
        else setLinks(data.links || []);
      } catch {
        if (!cancelled) setError("Tatizo la mtandao");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [linkUrl, direct]);

  if (direct) {
    const filename = isDirectFile(linkUrl)
      ? decodeURIComponent(linkUrl.split("/").pop()?.split("?")[0] || "file")
      : undefined;
    return (
      <div className="space-y-4">
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          {...(filename ? { download: filename } : {})}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm text-white transition"
        >
          <Download className="w-5 h-5" />
          {isFileHost(linkUrl) ? "Download (MediaFire / Host)" : "Download Direct"}
        </a>
        <p className="text-[11px] text-slate-500 break-all">{linkUrl}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Inachimba MediaFire / download links…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {!loading && links.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-emerald-400 font-medium">
            Files zilizopatikana ({links.length})
          </p>
          {links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition"
            >
              <Download className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left truncate">{l.label}</span>
              <span className="text-[10px] opacity-70 shrink-0">{l.host}</span>
            </a>
          ))}
        </div>
      )}

      {!loading && links.length === 0 && !error && (
        <div className="space-y-3">
          <p className="text-xs text-amber-400/90">
            Hakuna MediaFire iliyopatikana kiotomatiki. Fungua ukurasa wa download:
          </p>
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm text-white"
          >
            <ExternalLink className="w-5 h-5" />
            Open Download Page
          </a>
        </div>
      )}

      <p className="text-[11px] text-slate-500 break-all">Source: {linkUrl}</p>
      <p className="text-[11px] text-slate-600">{title}</p>
    </div>
  );
}
