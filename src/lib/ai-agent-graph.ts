/**
 * Lightweight LangGraph-style agent graph for ETUZA AI.
 * Nodes: plan → tools → synthesize (no heavy LangGraph package — Vercel-safe).
 */
import { runAiToolsForMessage, type ToolResult } from "@/lib/ai-tools";

export type AgentState = {
  message: string;
  mode: "hub" | "agent";
  plan: string[];
  toolResults: ToolResult[];
  replyHints: string[];
};

export function planSteps(message: string, mode: "hub" | "agent"): string[] {
  const steps: string[] = [];
  const m = message.toLowerCase();
  if (/\b(picha|image|chora|draw)\b/.test(m)) steps.push("image_gen");
  if (/\b(dom|parse|ukurasa|html|elements)\b/.test(m)) steps.push("dom_parse");
  if (/\b(search|tafuta|google|web)\b/.test(m) || mode === "agent")
    steps.push("web_search");
  if (/\b(terminal|command|run)\b/.test(m)) steps.push("terminal");
  if (/\b(miziki|music|wimbo)\b/.test(m)) steps.push("music_gen");
  if (!steps.length) steps.push("respond");
  return steps;
}

export async function runAgentGraph(opts: {
  message: string;
  mode?: "hub" | "agent";
}): Promise<AgentState> {
  const mode = opts.mode || "agent";
  const plan = planSteps(opts.message, mode);
  const { results } = await runAiToolsForMessage(opts.message, { mode });
  const replyHints: string[] = [];
  for (const r of results) {
    if (r.ok && r.data?.imageUrl)
      replyHints.push(`Onyesha picha: ${r.data.imageUrl}`);
    if (r.ok && r.tool === "dom_parse")
      replyHints.push(`DOM parsed: ${r.summary}`);
    if (r.ok) replyHints.push(r.summary);
  }
  return {
    message: opts.message,
    mode,
    plan,
    toolResults: results,
    replyHints,
  };
}
