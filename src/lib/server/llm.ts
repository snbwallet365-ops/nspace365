/** Server-side LLM calls for every supported provider. Keys arrive per request and are never stored. */

export type RouteProvider =
  | "local"
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "mistral"
  | "groq"
  | "openrouter"
  | "base44"
  | "custom";

export const SYSTEM = [
  "You are the N Space build agent — a precise engineering assistant inside a personal app-store workspace.",
  "Answer briefly and concretely about repositories, deployments and code changes.",
  "When you propose code, keep it copy-paste ready and mention the file path.",
].join(" ");

export const OPENAI_COMPATIBLE: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

export const DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  deepseek: "deepseek-chat",
  mistral: "mistral-large-latest",
  groq: "llama-3.3-70b-versatile",
  openrouter: "openai/gpt-4o-mini",
  custom: "llama3.2",
  base44: "superagent",
};

export interface LlmCtx {
  key: string;
  model: string;
  baseUrl?: string;
  endpoint?: string;
}

export async function callLLM(provider: RouteProvider, ctx: LlmCtx, prompt: string): Promise<string> {
  if (provider === "gemini") {
    const model = ctx.model || DEFAULT_MODELS.gemini;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(ctx.key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const d = await res.json();
    const parts = d?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: { text?: string }) => p.text ?? "").join("").trim();
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ctx.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ctx.model || DEFAULT_MODELS.anthropic,
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Claude ${res.status}`);
    const d = await res.json();
    const blocks = d?.content ?? [];
    return blocks.map((b: { text?: string }) => b.text ?? "").join("").trim();
  }

  if (provider === "base44") {
    if (!ctx.endpoint) throw new Error("Base44 endpoint missing");
    const res = await fetch(ctx.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ctx.key ? { Authorization: `Bearer ${ctx.key}` } : {}),
      },
      body: JSON.stringify({ message: prompt, agent: ctx.model || "superagent", system: SYSTEM }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Base44 ${res.status}`);
    const d = await res.json();
    return String(d?.reply ?? d?.content ?? d?.message ?? d?.answer ?? "").trim();
  }

  const url =
    provider === "custom"
      ? `${(ctx.baseUrl || "http://localhost:11434/v1").replace(/\/$/, "")}/chat/completions`
      : OPENAI_COMPATIBLE[provider];
  if (!url) throw new Error(`${provider} unsupported`);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ctx.key) headers.Authorization = `Bearer ${ctx.key}`;
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://iosliquid365.vercel.app";
    headers["X-Title"] = "N Space";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: ctx.model || DEFAULT_MODELS[provider] || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${provider} ${res.status}`);
  const d = await res.json();
  return String(d?.choices?.[0]?.message?.content ?? "").trim();
}
