"use client";

import { useState } from "react";
import { AlertTriangle, Upload, Send } from "lucide-react";

type Props = {
  contentKey: string;
  contentTitle: string;
  contentType?: string;
  contentId?: string;
};

export default function PlaybackReportForm({
  contentKey,
  contentTitle,
  contentType = "movie",
  contentId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("Haikucheza / stream haipatikani");
  const [shot, setShot] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(f: File | null) {
    if (!f) return;
    if (f.size > 1_500_000) {
      setMsg("Picha kubwa mno (max ~1.5MB)");
      return;
    }
    const r = new FileReader();
    r.onload = () => setShot(String(r.result || ""));
    r.readAsDataURL(f);
  }

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/playback-reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentKey,
          contentTitle,
          contentType,
          contentId: contentId || null,
          note,
          screenshotUrl: shot || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) setMsg(d.error || "Imeshindikana");
      else {
        setMsg("Ripoti imetumwa. Admin atakagua na kurudisha point.");
        setOpen(false);
      }
    } catch {
      setMsg("Tatizo la mtandao");
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-xs text-amber-300/90 border border-amber-700/40 rounded-lg px-3 py-2 bg-amber-950/30"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Haikucheza? Ripoti & rudisha point
        </button>
        {msg && <p className="text-xs text-emerald-400 mt-1">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-700/40 bg-slate-900 p-3 space-y-2">
      <p className="text-sm font-semibold text-amber-100">Ripoti content haikucheza</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm"
        placeholder="Eleza tatizo…"
      />
      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
        <Upload className="w-3.5 h-3.5" />
        Pakia screenshot
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </label>
      {shot && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shot} alt="" className="max-h-28 rounded-lg border border-slate-700" />
      )}
      {msg && <p className="text-xs text-amber-300">{msg}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {busy ? "…" : "Tuma ripoti"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-lg text-sm text-slate-400"
        >
          Ghairi
        </button>
      </div>
    </div>
  );
}
