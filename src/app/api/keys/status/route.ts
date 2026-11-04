import { NextResponse } from "next/server";
import { serverKeyProviders } from "@/lib/server/llm";

export const dynamic = "force-dynamic";

/** Which providers already have a workspace key on the server. Booleans only — never the value. */
export async function GET() {
  return NextResponse.json({ ready: serverKeyProviders() }, { headers: { "Cache-Control": "no-store" } });
}
