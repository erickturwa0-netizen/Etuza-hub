/**
 * Restricted terminal for ETUZA AI Agent (serverless-safe allowlist).
 * NOT a full shell — only safe, read-only / diagnostic commands.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const ALLOWED = [
  /^date$/i,
  /^uname( -a)?$/i,
  /^node -v$/i,
  /^npm -v$/i,
  /^echo .+$/i,
  /^pwd$/i,
  /^whoami$/i,
  /^ls( -[la]+)?( \.)?$/i,
  /^cat package\.json$/i,
  /^wc -l package\.json$/i,
];

const BLOCK =
  /rm |sudo |curl |wget |chmod |chown |kill |pkill |dd |mkfs |>|>>|\|\||&&|;|`|\$\(/i;

export type TerminalResult = {
  tool: string;
  ok: boolean;
  summary: string;
  data?: { stdout?: string; stderr?: string; command?: string };
};

export function wantsTerminal(message: string): boolean {
  return /\b(terminal|shell|run command|execute|amri ya|run\s+`|bash|cmd)\b/i.test(
    message
  );
}

export function extractCommand(message: string): string | null {
  const m =
    message.match(/```(?:bash|sh|shell)?\s*([\s\S]+?)```/i) ||
    message.match(/run[:\s]+[`"]([^`"]+)[`"]/i) ||
    message.match(/amri[:\s]+[`"]([^`"]+)[`"]/i);
  if (m?.[1]) return m[1].trim().slice(0, 200);
  return null;
}

export async function runTerminal(command: string): Promise<TerminalResult> {
  const cmd = command.trim().slice(0, 200);
  if (!cmd) {
    return { tool: "run_terminal", ok: false, summary: "Amri tupu." };
  }
  if (BLOCK.test(cmd)) {
    return {
      tool: "run_terminal",
      ok: false,
      summary: "Amri imezuiwa kwa usalama (si full root shell).",
    };
  }
  const allowed = ALLOWED.some((re) => re.test(cmd));
  if (!allowed) {
    return {
      tool: "run_terminal",
      ok: false,
      summary: `Amri haijaruhusiwa. Ruhusa: date, uname -a, node -v, npm -v, echo, pwd, whoami, ls, cat package.json. Uliza: run: \`node -v\``,
      data: { command: cmd },
    };
  }

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 8000,
      maxBuffer: 64 * 1024,
      shell: "/bin/sh",
    });
    return {
      tool: "run_terminal",
      ok: true,
      summary: `Terminal OK: ${cmd}`,
      data: {
        command: cmd,
        stdout: (stdout || "").slice(0, 4000),
        stderr: (stderr || "").slice(0, 1000),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "exec failed";
    return {
      tool: "run_terminal",
      ok: false,
      summary: `Terminal failed: ${msg.slice(0, 300)}`,
      data: { command: cmd },
    };
  }
}
