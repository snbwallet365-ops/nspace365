import { NextResponse } from "next/server";
import { callLLM, type RouteProvider } from "@/lib/server/llm";

export const dynamic = "force-dynamic";

interface Body {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  endpoint?: string;
}

/** Sends one tiny prompt to the chosen provider so the owner can verify a pasted key. */
export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const provider = String(body.provider ?? "").trim() as RouteProvider;
  if (!provider || provider === "local") {
    return NextResponse.json({ ok: true, detail: "Built-in engine needs no key." });
  }
  const started = Date.now();
  try {
    const text = await callLLM(
      provider,
      {
        key: String(body.apiKey ?? "").trim(),
        model: String(body.model ?? "").trim(),
        baseUrl: body.baseUrl,
        endpoint: body.endpoint,
      },
      "Reply with the single word: ready",
    );
    return NextResponse.json({ ok: true, ms: Date.now() - started, model: body.model || "", preview: text.slice(0, 120) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, ms: Date.now() - started }, { status: 200 });
  }
}
