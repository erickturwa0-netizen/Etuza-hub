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
} from "lucide-react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; type: string }[];
  tools?: { tool: string; ok: boolean; summary: string }[];
};

type AttachmentPayload = {
  name: string;
  type: string;
  text?: string;
  dataUrl?: string;
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
      blocks.push(<div key={k++} className="h-2" />);
      continue;
    }
    if (/^#{1,3}\s+/.test(t)) {
      flushList();
      blocks.push(
        <p key={k++} className="text-sm font-bold text-white mt-1 mb-0.5">
          {formatInline(t.replace(/^#{1,3}\s+/, ""))}
        </p>
      );
      continue;
    }
    if (/^([-*•]|\d+[.)])\s+/.test(t)) {
      listBuf.push(t.replace(/^([-*•]|\d+[.)])\s+/, ""));
      continue;
    }
    flushList();
    blocks.push(
      <p key={k++} className="leading-relaxed my-0.5">
        {formatInline(t)}
      </p>
    );
  }
  flushList();
  return <div className="space-y-0.5 text-[13px] sm:text-sm">{blocks}</div>;
}

async function fileToAttachment(file: File): Promise<AttachmentPayload | null> {
  const name = file.name.slice(0, 120);
  const type = file.type || "application/octet-stream";
  if (
    type.startsWith("text/") ||
    /\.(txt|md|csv|json|log|xml|html|js|ts|tsx|css)$/i.test(name)
  ) {
    return { name, type: type || "text/plain", text: (await file.text()).slice(0, 80000) };
  }
  if (type.startsWith("image/")) {
    if (file.size > 900000) {
      return {
        name,
        type,
        text: `[Image: ${name}, ${Math.round(file.size / 1024)}KB]`,
      };
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("read fail"));
      r.readAsDataURL(file);
    });
    return { name, type, dataUrl };
  }
  return {
    name,
    type,
    text: `[File: ${name} (${type})]`,
  };
}

export default function AiAgentPanel({
  contextLabel,
  fullPage = false,
}: {
  contextLabel?: string;
  fullPage?: boolean;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<AttachmentPayload[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "**ETUZA AI Agent** 🤖\n\nNinaweza kujibu **swali lolote** — si mambo ya site tu.\n\nPia nina **browser + scrape**, na napokea **attachments**.\n\nJaribu kuuliza chochote au: *Fungua https://…*" +
        (contextLabel ? `\n\nContext: **${contextLabel}**` : ""),
    },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sessionIdRef = useRef("");

  useEffect(() => {
    sessionIdRef.current = getAiSessionId();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: AttachmentPayload[] = [...pending];
    for (const f of Array.from(files).slice(0, 4)) {
      if (next.length >= 4) break;
      try {
        const a = await fileToAttachment(f);
        if (a) next.push(a);
      } catch {
        /* skip */
      }
    }
    setPending(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send() {
    const text = input.trim();
    if ((!text && !pending.length) || busy) return;
    setInput("");
    const atts = pending;
    setPending([]);
    const userContent =
      text ||
      (atts.length ? `(Attachment: ${atts.map((a) => a.name).join(", ")})` : "");
    const next: Msg[] = [
      ...msgs,
      {
        role: "user",
        content: userContent,
        attachments: atts.map((a) => ({ name: a.name, type: a.type })),
      },
    ];
    setMsgs(next);
    setBusy(true);
    try {
      const history = next
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(0, -1)
        .slice(-10)
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
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply || data.error || "Samahani, sijaweza kujibu sasa.",
          tools: Array.isArray(data.tools) ? data.tools : undefined,
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Tatizo la mtandao. Jaribu tena." },
      ]);
    }
    setBusy(false);
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border border-violet-500/30 bg-slate-950 overflow-hidden shadow-xl shadow-violet-950/20 ${
        fullPage ? "min-h-[70vh]" : "h-[min(70vh,32rem)]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3 bg-gradient-to-r from-violet-700 to-fuchsia-700 text-white shrink-0">
        <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">ETUZA AI Agent</p>
          <p className="text-[10px] text-white/80 flex items-center gap-1.5">
            <Globe className="w-3 h-3" /> Swali lolote · Browser · Scrape
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2.5 ${
                m.role === "user"
                  ? "bg-violet-600 text-white rounded-br-md text-sm leading-relaxed whitespace-pre-wrap"
                  : "bg-slate-800 text-slate-100 rounded-bl-md border border-slate-700"
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
                <FormattedMessage content={m.content} />
              ) : (
                m.content
              )}
              {m.tools && m.tools.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                  {m.tools.map((t, j) => (
                    <p key={j} className="text-[10px] text-slate-400">
                      🔧 {t.tool}: {t.summary}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-3 py-2 text-slate-400 text-sm inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Agent anafanya kazi…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {pending.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/80 flex flex-wrap gap-1.5">
          {pending.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-violet-500/15 text-violet-100 border border-violet-500/30"
            >
              <Paperclip className="w-3 h-3" />
              {a.name}
              <button
                type="button"
                className="ml-0.5 p-0.5 rounded hover:bg-white/10"
                onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-2.5">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.txt,.md,.csv,.json,.log,.xml,.html,.js,.ts,.tsx,.css,text/*"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="h-11 w-11 shrink-0 rounded-xl border border-slate-600 bg-slate-950 text-slate-300 flex items-center justify-center hover:border-violet-500 hover:text-white disabled:opacity-40"
            aria-label="Pakia attachment"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Uliza chochote, paste link, au pakia faili…"
            rows={1}
            className="flex-1 min-w-0 min-h-[44px] max-h-28 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-600 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-500 resize-y"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="submit"
            disabled={busy || (!input.trim() && !pending.length)}
            className="h-11 w-11 shrink-0 rounded-xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40"
            aria-label="Tuma"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-500 mt-1.5 px-1">
          Mode: agent (swali lolote) · tools · attachments
        </p>
      </div>
    </div>
  );
}
