"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  Loader2,
  Send,
  Paperclip,
  X,
  Globe,
  FileText,
  Image as ImageIcon,
  Search,
  Terminal,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import AiPlayableCards, {
  type PlayableCard,
} from "@/components/AiPlayableCards";

type ToolMeta = { tool: string; ok: boolean; summary: string };

type Msg = {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; type: string }[];
  tools?: ToolMeta[];
  playables?: PlayableCard[];
};

type AttachmentPayload = {
  name: string;
  type: string;
  text?: string;
  dataUrl?: string;
};

type LiveStep = {
  id: string;
  label: string;
  status: "running" | "done" | "error";
};

function getAiSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const k = "etuza_ai_sid";
    let id = localStorage.getItem(k);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(k, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

function toolIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("search") || n.includes("web")) return Search;
  if (n.includes("terminal") || n.includes("run")) return Terminal;
  if (n.includes("visit") || n.includes("http") || n.includes("browse"))
    return Globe;
  return Sparkles;
}

function formatInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={k++} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={k++} className="italic text-violet-200">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={k++}
          className="px-1 py-0.5 rounded bg-slate-900 text-violet-300 text-[12px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const lm = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (lm) {
        parts.push(
          <a
            key={k++}
            href={lm[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-300 underline underline-offset-2 break-all"
          >
            {lm[1]}
          </a>
        );
      } else parts.push(token);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function FormattedMessage({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listBuf: string[] = [];
  let k = 0;
  function flushList() {
    if (!listBuf.length) return;
    blocks.push(
      <ul key={k++} className="list-disc pl-4 my-1.5 space-y-1">
        {listBuf.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {formatInline(item)}
          </li>
        ))}
      </ul>
    );
    listBuf = [];
  }
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) {
      flushList();
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      listBuf.push(t.replace(/^[-*]\s+/, ""));
      continue;
    }
    flushList();
    if (/^###\s+/.test(t)) {
      blocks.push(
        <h3 key={k++} className="text-sm font-bold text-violet-200 mt-2">
          {formatInline(t.replace(/^###\s+/, ""))}
        </h3>
      );
    } else if (/^##\s+/.test(t)) {
      blocks.push(
        <h2 key={k++} className="text-base font-bold text-white mt-2">
          {formatInline(t.replace(/^##\s+/, ""))}
        </h2>
      );
    } else if (/^#\s+/.test(t)) {
      blocks.push(
        <h1 key={k++} className="text-lg font-bold text-white mt-2">
          {formatInline(t.replace(/^#\s+/, ""))}
        </h1>
      );
    } else {
      blocks.push(
        <p key={k++} className="leading-relaxed my-1">
          {formatInline(t)}
        </p>
      );
    }
  }
  flushList();
  return <div className="text-sm text-slate-100">{blocks}</div>;
}

function LiveSteps({ steps }: { steps: LiveStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="mr-auto max-w-[95%] rounded-2xl border border-violet-500/25 bg-slate-950/90 px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold mb-1">
        Agent steps
      </p>
      {steps.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-xs text-slate-300">
          {s.status === "running" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400 shrink-0" />
          ) : s.status === "done" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          )}
          <span className={s.status === "running" ? "text-violet-200" : ""}>
            {s.label}
          </span>
          {s.status === "running" && (
            <span className="text-violet-400 font-mono animate-pulse">▊</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ToolsDone({ tools }: { tools: ToolMeta[] }) {
  if (!tools?.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        Tools zilizotumika
      </p>
      {tools.map((t, j) => {
        const Icon = toolIcon(t.tool);
        return (
          <div
            key={j}
            className="flex items-start gap-2 text-[11px] text-slate-400"
          >
            <Icon className="w-3.5 h-3.5 mt-0.5 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-slate-300">{t.tool}</span>
              {" · "}
              <span className={t.ok ? "text-emerald-400" : "text-amber-400"}>
                {t.ok ? "OK" : "FAIL"}
              </span>
              <p className="text-slate-500 truncate">{t.summary}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AiAgentPanel({
  contextLabel,
  className = "",
}: {
  contextLabel?: string;
  className?: string;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Habari! Mimi ni **ETUZA AI Agent**.\n\nNina **kutafuta mtandaoni** (si kubahatisha). Uliza: *Lisu ni nani*, *nipatie movie…*, *run: node -v*.\n\nUtaona **hatua** (search / browse / terminal) zinapozunguka kabla ya jibu.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef("");
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    sessionIdRef.current = getAiSessionId();
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, liveSteps]);

  function startLiveSteps(userText: string) {
    const wantsTerm =
      /\b(terminal|shell|run command|run:|amri|bash|cmd)\b/i.test(userText);
    const steps: LiveStep[] = [
      { id: "plan", label: "Kupanga ombi…", status: "running" },
      {
        id: "search",
        label: "web_search — inatafuta mtandaoni…",
        status: "running",
      },
      {
        id: "browse",
        label: "visit_web / scrape — inasoma vyanzo…",
        status: "running",
      },
    ];
    if (wantsTerm) {
      steps.push({
        id: "term",
        label: "run_terminal — inaendesha amri…",
        status: "running",
      });
    }
    steps.push({
      id: "answer",
      label: "Inaandaa jibu kutoka data…",
      status: "running",
    });
    setLiveSteps(steps);

    let i = 0;
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => {
      i += 1;
      setLiveSteps((prev) =>
        prev.map((s, idx) => {
          if (idx < i - 1) return { ...s, status: "done" };
          if (idx === i - 1) return { ...s, status: "running" };
          return s;
        })
      );
      // keep last step running until request finishes
      if (i >= steps.length) {
        if (stepTimer.current) clearInterval(stepTimer.current);
      }
    }, 900);
  }

  function finishLiveSteps(ok: boolean) {
    if (stepTimer.current) clearInterval(stepTimer.current);
    setLiveSteps((prev) =>
      prev.map((s) => ({
        ...s,
        status: ok ? "done" : s.status === "running" ? "error" : s.status,
      }))
    );
    setTimeout(() => setLiveSteps([]), 1200);
  }

  async function fileToPayload(f: File): Promise<AttachmentPayload> {
    const base: AttachmentPayload = { name: f.name, type: f.type || "file" };
    if (f.type.startsWith("image/")) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      return { ...base, dataUrl: dataUrl.slice(0, 1_500_000) };
    }
    if (
      f.type.startsWith("text/") ||
      /\.(txt|md|json|csv|js|ts|tsx|py|log)$/i.test(f.name)
    ) {
      const text = await f.text();
      return { ...base, text: text.slice(0, 12000) };
    }
    return base;
  }

  async function send() {
    const text = input.trim();
    if ((!text && !files.length) || busy) return;
    setInput("");
    const attsMeta = files.map((f) => ({ name: f.name, type: f.type || "file" }));
    const userContent =
      text ||
      (files.length ? `(attachments: ${files.map((f) => f.name).join(", ")})` : "");
    setMsgs((m) => [
      ...m,
      { role: "user", content: userContent, attachments: attsMeta },
    ]);
    setBusy(true);
    startLiveSteps(text || userContent);
    const pendingFiles = [...files];
    setFiles([]);

    try {
      const atts: AttachmentPayload[] = [];
      for (const f of pendingFiles.slice(0, 4)) {
        atts.push(await fileToPayload(f));
      }
      const history = msgs
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));
      if (!sessionIdRef.current) sessionIdRef.current = getAiSessionId();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text || "Tafadhali angalia attachment zangu.",
          history,
          sessionId: sessionIdRef.current,
          attachments: atts,
          context: contextLabel || undefined,
          mode: "agent",
        }),
      });
      const data = await res.json();
      finishLiveSteps(res.ok);
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data.reply || data.error || "Samahani, sijaweza kujibu sasa.",
          tools: Array.isArray(data.tools) ? data.tools : undefined,
          playables: Array.isArray(data.playables) ? data.playables : [],
        },
      ]);
    } catch {
      finishLiveSteps(false);
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Tatizo la mtandao. Jaribu tena." },
      ]);
    }
    setBusy(false);
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border border-violet-500/30 bg-slate-950 overflow-hidden shadow-xl shadow-violet-950/20 ${className}`}
    >
      <div className="px-4 py-3 border-b border-violet-500/20 flex items-center gap-2 bg-violet-950/30">
        <Bot className="w-5 h-5 text-violet-300" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">ETUZA AI Agent</p>
          <p className="text-[10px] text-slate-400 truncate">
            Live tools · web_search · scrape · terminal · Cheza
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
                {m.playables && m.playables.length > 0 && (
                  <AiPlayableCards items={m.playables} />
                )}
                {m.tools && m.tools.length > 0 && (
                  <ToolsDone tools={m.tools} />
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

      {files.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-800 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-700"
            >
              {f.name}
              <button
                type="button"
                onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-slate-800 flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = e.target.files ? Array.from(e.target.files) : [];
            setFiles((prev) => [...prev, ...list].slice(0, 4));
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-900"
          title="Attachment"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Uliza — nita-search mtandaoni (si kubahatisha)…"
          className="flex-1 resize-none rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-white max-h-28"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void send()}
          className="p-2.5 rounded-xl bg-violet-600 text-white disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
