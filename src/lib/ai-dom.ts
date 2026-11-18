/**
 * Lightweight DOM extraction for ETUZA AI agent (no headless browser required).
 * Parses HTML into structured nodes the agent can reason over.
 */

export type DomNodeSummary = {
  tag: string;
  id?: string;
  className?: string;
  text?: string;
  href?: string;
  src?: string;
  name?: string;
  type?: string;
};

export type DomSnapshot = {
  title: string;
  url: string;
  headings: string[];
  links: { text: string; href: string }[];
  forms: { action: string; method: string; fields: string[] }[];
  images: { alt: string; src: string }[];
  textSample: string;
  nodes: DomNodeSummary[];
};

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseDom(html: string, pageUrl = ""): DomSnapshot {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 200) : "";

  const headings: string[] = [];
  const hRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m: RegExpExecArray | null;
  while ((m = hRe.exec(html)) && headings.length < 30) {
    const t = stripTags(m[1]);
    if (t) headings.push(t.slice(0, 160));
  }

  const links: { text: string; href: string }[] = [];
  const aRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = aRe.exec(html)) && links.length < 40) {
    const href = m[1];
    const text = stripTags(m[2]).slice(0, 80);
    if (href && !href.startsWith("javascript:")) {
      links.push({ text: text || href.slice(0, 40), href });
    }
  }

  const forms: { action: string; method: string; fields: string[] }[] = [];
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  while ((m = formRe.exec(html)) && forms.length < 10) {
    const attrs = m[1] || "";
    const body = m[2] || "";
    const action = (attrs.match(/action=["']([^"']*)["']/i) || [])[1] || "";
    const method = ((attrs.match(/method=["']([^"']*)["']/i) || [])[1] || "get").toLowerCase();
    const fields: string[] = [];
    const inputRe = /<(input|textarea|select)\b([^>]*)>/gi;
    let im: RegExpExecArray | null;
    while ((im = inputRe.exec(body)) && fields.length < 20) {
      const ia = im[2] || "";
      const name = (ia.match(/name=["']([^"']+)/i) || [])[1];
      const type = (ia.match(/type=["']([^"']+)/i) || [])[1] || im[1];
      if (name) fields.push(`${name}:${type}`);
    }
    forms.push({ action, method, fields });
  }

  const images: { alt: string; src: string }[] = [];
  const imgRe = /<img\b([^>]*)>/gi;
  while ((m = imgRe.exec(html)) && images.length < 20) {
    const a = m[1] || "";
    const src = (a.match(/src=["']([^"']+)/i) || [])[1] || "";
    const alt = (a.match(/alt=["']([^"']*)/i) || [])[1] || "";
    if (src) images.push({ alt, src });
  }

  const nodes: DomNodeSummary[] = [];
  const interesting = /<(button|input|a|nav|main|article|section)\b([^>]*)>/gi;
  while ((m = interesting.exec(html)) && nodes.length < 50) {
    const tag = m[1].toLowerCase();
    const a = m[2] || "";
    nodes.push({
      tag,
      id: (a.match(/\bid=["']([^"']+)/i) || [])[1],
      className: (a.match(/\bclass=["']([^"']+)/i) || [])[1]?.slice(0, 80),
      href: (a.match(/\bhref=["']([^"']+)/i) || [])[1],
      src: (a.match(/\bsrc=["']([^"']+)/i) || [])[1],
      name: (a.match(/\bname=["']([^"']+)/i) || [])[1],
      type: (a.match(/\btype=["']([^"']+)/i) || [])[1],
    });
  }

  const textSample = stripTags(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  ).slice(0, 2500);

  return { title, url: pageUrl, headings, links, forms, images, textSample, nodes };
}

export async function fetchAndParseDom(url: string): Promise<{
  ok: boolean;
  summary: string;
  data?: DomSnapshot & { tool: string };
}> {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(u, {
      headers: {
        "User-Agent": "ETUZA-HUB-Agent-DOM/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, summary: `DOM fetch HTTP ${res.status}` };
    }
    const html = (await res.text()).slice(0, 400_000);
    const snap = parseDom(html, res.url || u);
    return {
      ok: true,
      summary: `DOM: "${snap.title}" · ${snap.links.length} links · ${snap.forms.length} forms`,
      data: { ...snap, tool: "dom_parse" },
    };
  } catch (e) {
    return {
      ok: false,
      summary: e instanceof Error ? e.message : "DOM fetch fail",
    };
  }
}

export function wantsDomParse(message: string): boolean {
  return /\b(dom|parse\s+page|extract\s+html|chambua\s+(ukurasa|page)|soma\s+page|elements?|selectors?)\b/i.test(
    message
  );
}

export function extractUrlFromMessage(message: string): string | null {
  const m = message.match(/https?:\/\/[^\s<>"']+/i);
  if (m) return m[0];
  const bare = message.match(/\b([a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/i);
  return bare ? bare[1] : null;
}
