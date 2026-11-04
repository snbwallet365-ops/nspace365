import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Project {
  id?: string;
  name?: string;
  framework?: string | null;
  latestDeployments?: { url?: string; readyState?: string; createdAt?: number }[];
}

export async function POST(req: Request) {
  const { token, teamId } = (await req.json()) as { token?: string; teamId?: string };
  const t = String(token ?? "").trim();
  if (!t) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  try {
    const url = new URL("https://api.vercel.com/v9/projects");
    url.searchParams.set("limit", "8");
    if (teamId) url.searchParams.set("teamId", teamId);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Vercel ${r.status}`);
    const d = (await r.json()) as { projects?: Project[] };
    const projects = (d.projects ?? []).map((p) => ({
      name: p.name,
      framework: p.framework ?? "static",
      state: p.latestDeployments?.[0]?.readyState ?? "unknown",
      url: p.latestDeployments?.[0]?.url ? `https://${p.latestDeployments[0].url}` : null,
    }));
    return NextResponse.json({ ok: true, count: projects.length, projects });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}
