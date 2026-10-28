"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export default function AiChatFloat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Habari! Mimi ni msaidizi wa ETUZA HUB. Unaweza kuniuliza kuhusu movies, radio, TV, VPN, point au jinsi ya kutumia site.",
    },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
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
      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[60] flex flex-col rounded-2xl border border-violet-500/40 bg-slate-950 shadow-2xl shadow-violet-900/40 overflow-hidden"
          style={{
            bottom: "5.5rem",
            right: "0.75rem",
            width: "min(22rem, calc(100vw - 1.5rem))",
            height: "min(28rem, calc(100vh - 8rem))",
          }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-violet-700 to-fuchsia-700 text-white">
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
              className="p-1.5 rounded-lg hover:bg-white/15"
              aria-label="Funga"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-950">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-br-md"
                      : "bg-slate-800 text-slate-100 rounded-bl-md border border-slate-700"
                  }`}
                >
                  {m.content}
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

          <form
            className="p-2 border-t border-slate-800 bg-slate-900 flex gap-2"
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
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-500"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0"
              aria-label="Tuma"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Float button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-600/40 flex items-center justify-center active:scale-95 border-2 border-white/20"
        style={{ bottom: "4.75rem", right: "0.85rem" }}
        aria-label={open ? "Funga AI" : "Fungua AI msaada"}
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </>
  );
}
