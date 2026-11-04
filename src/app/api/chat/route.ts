import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { addMessage, getSession, listMessages, touchSession } from "@/lib/server/live";
import { knowledgeAnswer } from "@/lib/server/knowledge";
import type { Block } from "@/lib/types";
import { callLLM, DEFAULT_MODELS, type RouteProvider } from "@/lib/server/llm";

export const dynamic = "force-dynamic";

export type { RouteProvider };

interface Body {
  sessionId?: string;
  message?: string;
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  endpoint?: string;
  tone?: "concise" | "balanced" | "detailed";
  repo?: { name?: string; branch?: string; language?: string | null; liveUrl?: string } | null;
  knowledge?: string;
  attachments?: { name?: string; content?: string }[];
}

function pickNotes(notes: string, query: string): string {
  const lines = notes
    .split(/[\n•]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);
  if (!lines.length) return "";
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9\u0980-\u09FF]+/)
    .filter((w) => w.length > 2);
  const scored = lines
    .map((line) => {
      const low = line.toLowerCase();
      const hits = words.filter((w) => low.includes(w)).length;
      return { line, hits };
    })
    .sort((a, b) => b.hits - a.hits);
  const best = scored.slice(0, 3).filter((s) => s.hits > 0);
  const chosen = best.length ? best : scored.slice(0, 2);
  return chosen.map((c) => c.line).join("\n");
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const text = String(body.message ?? "").trim();
  if (!text) return NextResponse.json({ error: "message is required" }, { status: 400 });

  const session = (body.sessionId && getSession(body.sessionId)) || null;
  const sessionId = session?.id ?? body.sessionId ?? "local";

  if (session) addMessage({ sessionId, role: "user", content: text, blocks: [] });

  const provider = (body.provider ?? "local") as RouteProvider;
  const key = body.apiKey?.trim() ?? "";
  const model = body.model?.trim() || DEFAULT_MODELS[provider] || "";

  const repo = body.repo ?? (session?.pinnedRepoId ? { name: session.pinnedRepoId } : null);
  const notes = String(body.knowledge ?? "").slice(0, 6000).trim();

  const attachments = (body.attachments ?? [])
    .filter((a) => a && typeof a.content === "string" && a.content.trim())
    .slice(0, 6)
    .map((a) => `--- ${String(a.name ?? "file").slice(0, 80)} ---\n${String(a.content).slice(0, 12000)}`)
    .join("\n\n");

  const prompt = [
    notes ? `Owner knowledge (authoritative):\n${notes}` : "",
    attachments ? `Attached files:\n${attachments}` : "",
    repo?.name ? `Repository: ${repo.name}${repo.branch ? ` (branch ${repo.branch})` : ""}` : "",
    `Request: ${text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let content = "";
  let blocks: Block[] = [];
  let used = "local";

  if ((key || provider === "custom") && provider !== "local") {
    try {
      content = (await callLLM(provider, { key, model, baseUrl: body.baseUrl, endpoint: body.endpoint }, prompt)) || "";
      used = provider;
    } catch (err) {
      content = "";
      used = `${provider}-error:${(err as Error).message}`;
    }
  }

  const tone = (body.tone ?? "balanced") as "concise" | "balanced" | "detailed";

  if (!content && (provider === "local" || (!key && provider !== "anthropic"))) {
    const kb = knowledgeAnswer(text, tone, { repo: repo?.name ?? null });
    const noteHit = pickNotes(notes, text);
    if (noteHit) {
      const generic = /I can help with the workspace itself/i.test(kb ?? "");
      content = [noteHit, generic ? "" : kb].filter(Boolean).join("\n\n");
      used = "knowledge+notes";
    } else if (kb) {
      content = kb;
      used = "knowledge";
    }
  }

  if (!content) {
    const result = runAgent({
      text,
      branch: session?.branch ?? "main",
      ahead: 0,
      repo: repo?.name
        ? {
            name: repo.name,
            language: repo.language ?? null,
            defaultBranch: repo.branch ?? "main",
            liveUrl: repo.liveUrl,
          }
        : null,
    });
    content = result.content;
    blocks = result.blocks;
    if (!key) used = provider === "local" ? "built-in" : used;
  }

  const assistant = addMessage({ sessionId, role: "assistant", content, blocks });
  const updated = session ? touchSession(session.id, { title: session.title === "New chat" ? text.slice(0, 40) : session.title }) : null;

  return NextResponse.json({
    userMessage: { id: assistant.id - 1, sessionId, role: "user", content: text, blocks: [], createdAt: assistant.createdAt },
    assistantMessage: assistant,
    session: updated,
    provider: used,
    history: session ? listMessages(sessionId) : [],
  });
}

export async function GET() {
  return NextResponse.json({
    providers: ["local", "gemini", "openai", "anthropic", "deepseek", "mistral", "groq", "openrouter", "base44", "custom"],
    note: "Send { message, provider, apiKey, model, baseUrl?, endpoint?, sessionId, attachments? } to chat with your own key.",
  });
}
