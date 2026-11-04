import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Body {
  provider?: "github" | "vercel" | "cloudflare";
  token?: string;
}

async function gh(token: string) {
  const r = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const d = (await r.json()) as { login?: string; avatar_url?: string; public_repos?: number; total_private_repos?: number };
  return {
    login: d.login,
    avatar: d.avatar_url,
    repos: (d.public_repos ?? 0) + (d.total_private_repos ?? 0),
  };
}

async function vercel(token: string) {
  const r = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Vercel ${r.status}`);
  const d = (await r.json()) as { user?: { username?: string; email?: string } };
  return { username: d.user?.username ?? d.user?.email ?? "vercel user" };
}

async function cloudflare(token: string) {
  const r = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const d = (await r.json()) as { success?: boolean; result?: { status?: string }; errors?: { message?: string }[] };
  if (!r.ok || !d.success) throw new Error(d.errors?.[0]?.message || `Cloudflare ${r.status}`);
  return { status: d.result?.status ?? "active" };
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const token = String(body.token ?? "").trim();
  if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  try {
    if (body.provider === "github") return NextResponse.json({ ok: true, detail: "GitHub connected", data: await gh(token) });
    if (body.provider === "vercel") return NextResponse.json({ ok: true, detail: "Vercel connected", data: await vercel(token) });
    if (body.provider === "cloudflare") return NextResponse.json({ ok: true, detail: "Cloudflare connected", data: await cloudflare(token) });
    return NextResponse.json({ ok: false, error: "unknown provider" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}
