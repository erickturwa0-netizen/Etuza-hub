"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle, X, Send, Bot, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

/** Lightweight markdown → React (bold, italic, titles, lists, links, breaks) */
function formatInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // **bold**, *italic*, `code`, [text](url)
  const re =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
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
      } else {
        parts.push(token);
      }
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
    const line = raw.trimEnd();
    const t = line.trim();

    if (!t) {
      flushList();
      blocks.push(<div key={k++} className="h-2" />);
      continue;
    }

    // # Title / ## Subtitle
    if (/^#{1,3}\s+/.test(t)) {
      flushList();
      const level = (t.match(/^#+/) || ["#"])[0].length;
      const text = t.replace(/^#{1,3}\s+/, "");
      const cls =
        level === 1
          ? "text-base font-extrabold uppercase tracking-wide text-violet-200 mt-1 mb-1"
          : level === 2
            ? "text-sm font-bold text-white mt-1 mb-0.5"
            : "text-sm font-semibold text-slate-100 mt-1";
      blocks.push(
        <p key={k++} className={cls}>
          {formatInline(text)}
        </p>
      );
      continue;
    }

    // ALL CAPS short line as title
    if (
      t.length >= 3 &&
      t.length <= 48 &&
      t === t.toUpperCase() &&
      /[A-ZÀ-Ÿ]/.test(t) &&
      !/^https?:\/\//i.test(t)
    ) {
      flushList();
      blocks.push(
        <p
          key={k++}
          className="text-sm font-extrabold uppercase tracking-wide text-violet-200 mt-1 mb-0.5"
        >
          {formatInline(t)}
        </p>
      );
      continue;
    }

    // bullet list
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

export default function AiChatFloat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "**HABARI!**\n\nMimi ni msaidizi wa *ETUZA HUB*.\n\nUnaweza kuniuliza kuhusu:\n- Movies & Tamthilia\n- Radio & TV\n- VPN & Point\n- Jinsi ya kutumia site",
    },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, msgs, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setBusy(true);
    try {
      const history = next
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(0, -1)
        .slice(-10);
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgs((m) => [
          ...m,
          {
            role: "assistant",
            content: data.error || "Samahani, sijaweza kujibu sasa.",
          },
        ]);
      } else {
        setMsgs((m) => [
          ...m,
          { role: "assistant", content: data.reply || "…" },
        ]);
      }
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Tatizo la mtandao. Jaribu tena." },
      ]);
    }
    setBusy(false);
  }

  return (
    <>
      {open && (
        <div
          className="fixed z-[80] flex flex-col rounded-2xl border border-violet-500/40 bg-slate-950 shadow-2xl shadow-violet-900/50 overflow-hidden"
          style={{
            bottom: "5.25rem",
            left: "0.75rem",
            right: "0.75rem",
            maxWidth: "24rem",
            marginLeft: "auto",
            height: "min(70vh, 28rem)",
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-violet-700 to-fuchsia-700 text-white shrink-0">
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">ETUZA AI</p>
              <p className="text-[10px] text-white/80">Msaada · mercury-3</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-white/15"
              aria-label="Funga"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2.5 ${
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-br-md text-sm leading-relaxed whitespace-pre-wrap"
                      : "bg-slate-800 text-slate-100 rounded-bl-md border border-slate-700"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <FormattedMessage content={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-3 py-2 text-slate-400 text-sm inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Inafikiri…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-2.5 pb-3">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Uliza kitu…"
                className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-slate-950 border border-slate-600 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-500"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40"
                aria-label="Tuma"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-600/40 flex items-center justify-center active:scale-95 border-2 border-white/20"
          style={{ bottom: "4.75rem", right: "0.85rem" }}
          aria-label="Fungua AI msaada"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
