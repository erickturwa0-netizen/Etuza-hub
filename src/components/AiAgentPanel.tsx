"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  Globe,
  Loader2,
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Terminal,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  Volume2,
} from "lucide-react";

type Playable = {
  id: string;
  title: string;
  type: string;
  category?: string | null;
  coverUrl?: string | null;
  watchUrl: string;
};

type ToolMeta = {
  tool: string;
  ok: boolean;
  summary: string;
  imageUrl?: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  playables?: Playable[];
  tools?: ToolMeta[];
  images?: string[];
  attachments?: { name: string; type: string }[];
};

type LiveStep = {
  id: string;
  label: string;
  status: "pending" | "run" | "done";
};

function toolIcon(name: string) {
  if (name.includes("search") || name.includes("web")) return Search;
  if (name.includes("terminal")) return Terminal;
  if (name.includes("image")) return ImageIcon;
  return Sparkles;
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="text-sm leading-relaxed space-y-1 whitespace-pre-wrap break-words">
      {lines.map((line, i) => (
        <p key={i}>{line || "\u00a0"}</p>
      ))}
    </div>
  );
}

function AiPlayableCards({ items }: { items: Playable[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {items.slice(0, 6).map((it) => (
        <a
          key={it.id}
          href={it.watchUrl}
          className="rounded-xl border border-slate-700 bg-slate-950/80 p-2 hover:border-violet-500"
        >
          <p className="text-xs font-semibold text-white line-clamp-2">{it.title}</p>
          <p className="text-[10px] text-violet-300 mt-1">Cheza →</p>
        </a>
      ))}
    </div>
  );
}

function LiveSteps({ steps }: { steps: LiveStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">Agent steps</p>
      {steps.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-xs text-slate-300">
          {s.status === "run" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
          ) : s.status === "done" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <span className="w-3.5 h-3.5 rounded-full border border-slate-600" />
          )}
          {s.label}
        </div>
      ))}
    </div>
  );
}

function ToolsDone({ tools }: { tools: ToolMeta[] }) {
  if (!tools?.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {tools.map((t, j) => {
        const Icon = toolIcon(t.tool);
        return (
          <div
            key={j}
            className="flex items-start gap-1.5 text-[11px] text-slate-400"
          >
            {t.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            )}
            <span>
              <span className="font-semibold text-slate-300">{t.tool}</span>
              {" — "}{t.summary}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AiAgentPanel({
  mode = "agent",
}: {
  mode?: "hub" | "agent";
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);
  const [speakIdx, setSpeakIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionId = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now())
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, liveSteps]);

  useEffect(() => {
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      audioRef.current?.pause();
    };
  }, []);

  async function speakMessage(idx: number, content: string) {
    if (speakIdx === idx) {
      audioRef.current?.pause();
      setSpeakIdx(null);
      return;
    }
    setSpeakIdx(idx);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const data = await res.json();
      if (!res.ok || !data.audioUrl) {
        setSpeakIdx(null);
        alert(data.error || "Sauti haikupatikana");
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const a = new Audio(data.audioUrl);
      audioRef.current = a;
      a.onended = () => setSpeakIdx(null);
      a.onerror = () => setSpeakIdx(null);
      await a.play();
    } catch {
      setSpeakIdx(null);
      alert("Tatizo la mtandao kwa sauti");
    }
  }

  function startSteps(message: string) {
    const steps: LiveStep[] = [];
    if (/picha|image|draw|tengeneza\s+picha|horde/i.test(message)) {
      steps.push({ id: "img", label: "Inatengeneza picha (Horde)…", status: "pending" });
    }
    if (/tafuta|search|nani|habari|http/i.test(message) || mode === "agent") {
      steps.push({ id: "search", label: "Inatafuta mtandaoni…", status: "pending" });
    }
    steps.push({ id: "reply", label: "Inaandaa jibu…", status: "pending" });
    setLiveSteps(steps);
    let i = 0;
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => {
      setLiveSteps((prev) =>
        prev.map((s, idx) =>
          idx < i ? { ...s, status: "done" } : idx === i ? { ...s, status: "run" } : s
        )
      );
      i += 1;
      if (i >= steps.length) {
        if (stepTimer.current) clearInterval(stepTimer.current);
      }
    }, 900);
  }

  function stopSteps() {
    if (stepTimer.current) clearInterval(stepTimer.current);
    setLiveSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
  }

  async function send() {
    const t = text.trim();
    if ((!t && !files.length) || busy) return;
    setText("");
    setBusy(true);
    startSteps(t);

    const attachments = files.map((f) => ({ name: f.name, type: f.type }));
    setMsgs((m) => [
      ...m,
      { role: "user", content: t || "(attachment)", attachments },
    ]);
    setFiles([]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: t || "Tafadhali angalia attachment zangu.",
          mode,
          sessionId: sessionId.current,
          history: msgs.slice(-8).map((x) => ({
            role: x.role,
            content: x.content,
          })),
        }),
      });
      const data = await res.json();
      stopSteps();
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply || data.error || "Hakuna jibu",
          playables: Array.isArray(data.playables) ? data.playables : undefined,
          tools: Array.isArray(data.tools) ? data.tools : undefined,
          images: Array.isArray(data.images) ? data.images : undefined,
        },
      ]);
    } catch {
      stopSteps();
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Tatizo la mtandao. Jaribu tena." },
      ]);
    }
    setBusy(false);
    setLiveSteps([]);
  }

  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-2xl border border-slate-800 bg-[#0a0a12] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-violet-600/30 flex items-center justify-center">
          <Bot className="w-4 h-4 text-violet-300" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">ETUZA AI Agent</p>
          <p className="text-[10px] text-slate-400 truncate">
            Live tools · web_search · image_gen · TTS · Cheza
          </p>
        </div>
        <Globe className="w-4 h-4 text-violet-400/60 ml-auto" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[min(60vh,520px)] min-h-[280px]">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl px-3 py-2.5 max-w-[95%] ${
              m.role === "user"
                ? "ml-auto bg-violet-600/80 text-white"
                : "mr-auto bg-slate-900/90 border border-slate-800 text-slate-100"
            }`}
          >
            {m.attachments && m.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {m.attachments.map((a, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-black/25"
                  >
                    {a.type.startsWith("image/") ? (
                      <ImageIcon className="w-3 h-3" />
                    ) : (
                      <FileText className="w-3 h-3" />
                    )}
                    {a.name}
                  </span>
                ))}
              </div>
            )}
            {m.role === "assistant" ? (
              <>
                <FormattedMessage content={m.content} />
                <button
                  type="button"
                  onClick={() => void speakMessage(i, m.content)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/40"
                >
                  {speakIdx === i ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  {speakIdx === i ? "Inasikilizwa…" : "Sikiliza jibu"}
                </button>
                {m.playables && m.playables.length > 0 && (
                  <AiPlayableCards items={m.playables} />
                )}
                {m.tools && m.tools.length > 0 && <ToolsDone tools={m.tools} />}
                {((m.images && m.images.length > 0) ||
                  m.tools?.some((t) => t.imageUrl)) && (
                  <div className="mt-2 grid gap-2">
                    {(m.images && m.images.length
                      ? m.images
                      : (m.tools || [])
                          .map((t) => t.imageUrl)
                          .filter((u): u is string => !!u)
                    ).map((src, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={j}
                        src={src}
                        alt="AI generated"
                        className="rounded-xl border border-slate-700 max-h-64 w-full object-contain bg-black"
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              m.content
            )}
          </div>
        ))}

        {busy && <LiveSteps steps={liveSteps} />}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-slate-800 flex gap-2 items-end">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            const list = e.target.files ? Array.from(e.target.files) : [];
            setFiles((f) => [...f, ...list].slice(0, 5));
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-2.5 rounded-xl border border-slate-700 text-slate-400"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Uliza… mfano: Tengeneza picha / sikiliza jibu"
          className="flex-1 resize-none rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void send()}
          className="p-2.5 rounded-xl bg-violet-600 text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
