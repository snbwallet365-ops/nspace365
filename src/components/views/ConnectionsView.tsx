"use client";

import { motion } from "framer-motion";
import { Check, Cloud, GitBranch, Globe2, Loader2, Plug, TriangleAlert, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { readConnections, writeConnections, type ConnectionState } from "@/lib/workspace";
import { ViewHeader } from "@/components/ui/SectionHeader";

type Provider = "github" | "vercel" | "cloudflare";

const CARDS: { id: Provider; name: string; blurb: string; tint: string; placeholder: string; where: string }[] = [
  { id: "github", name: "GitHub", blurb: "Repositories, branches and commits", tint: "#1C1C1E", placeholder: "ghp_… or github_pat_…", where: "github.com/settings/tokens" },
  { id: "vercel", name: "Vercel", blurb: "Deployments, previews and domains", tint: "#111111", placeholder: "vercel access token", where: "vercel.com/account/tokens" },
  { id: "cloudflare", name: "Cloudflare", blurb: "Workers, KV, Pages and DNS", tint: "#F38020", placeholder: "cloudflare API token", where: "dash.cloudflare.com/profile/api-tokens" },
];

export default function ConnectionsView() {
  const { user, toast } = useStore();
  const [state, setState] = useState<ConnectionState>(() => readConnections(user?.email));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setState(readConnections(user?.email));
  }, [user?.email]);

  function persist(next: ConnectionState) {
    setState(next);
    writeConnections(user?.email, next);
  }

  async function connect(id: Provider) {
    const token = (drafts[id] ?? "").trim();
    if (!token) {
      toast("Paste a token first");
      return;
    }
    setBusy(id);
    try {
      const r = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id, token }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string; data?: Record<string, unknown> };
      if (!d.ok) {
        toast(d.error ?? "Could not connect");
        return;
      }
      const now = new Date().toISOString();
      const next: ConnectionState = { ...state };
      if (id === "github") next.github = { token, login: String(d.data?.login ?? ""), avatar: String(d.data?.avatar ?? ""), repos: Number(d.data?.repos ?? 0), checkedAt: now };
      if (id === "vercel") next.vercel = { token, username: String(d.data?.username ?? ""), checkedAt: now };
      if (id === "cloudflare") next.cloudflare = { token, status: String(d.data?.status ?? "active"), checkedAt: now };
      persist(next);
      setDrafts((p) => ({ ...p, [id]: "" }));
      toast(`${id} connected`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const google = state.google;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 md:px-8">
      <ViewHeader eyebrow="Integrations" title="Connections" />

      <div className="space-y-3">
        {CARDS.map((c, i) => {
          const connected = Boolean(state[c.id]?.token);
          const Icon = c.id === "github" ? GitBranch : c.id === "cloudflare" ? Cloud : Plug;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
              className="rounded-[22px] border border-black/5 bg-white p-4 shadow-[0_6px_22px_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[13px] text-white" style={{ background: c.tint }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[15px] font-semibold text-[#1C1C1E]">
                    {c.name}
                    {connected && <Check size={14} className="text-[#34C759]" />}
                  </p>
                  <p className="truncate text-[12px] text-[#8E8E93]">{c.blurb}</p>
                </div>
                {connected && (
                  <button
                    onClick={() => {
                      const next = { ...state };
                      delete next[c.id];
                      persist(next);
                      toast(`${c.name} disconnected`);
                    }}
                    className="flex items-center gap-1 rounded-full bg-black/[0.05] px-2.5 py-1.5 text-[11px] font-semibold text-[#3C3C43]"
                  >
                    <Unplug size={12} /> Remove
                  </button>
                )}
              </div>

              {connected ? (
                <div className="mt-3 rounded-[14px] bg-[#F2F2F7] px-3 py-2.5 text-[12px] text-[#3C3C43]">
                  <p className="font-semibold text-[#1C1C1E]">
                    {c.id === "github" ? state.github?.login || "connected" : c.id === "vercel" ? state.vercel?.username || "connected" : state.cloudflare?.status || "connected"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#8E8E93]">
                    {c.id === "github" ? `${state.github?.repos ?? 0} repositories visible` : `verified ${state[c.id]?.checkedAt?.slice(0, 16).replace("T", " ") ?? ""}`}
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="password"
                    value={drafts[c.id] ?? ""}
                    onChange={(e) => setDrafts((p) => ({ ...p, [c.id]: e.target.value }))}
                    placeholder={c.placeholder}
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-[13px] border border-black/[0.07] bg-[#F2F2F7] px-3 py-2.5 text-[13px] outline-none placeholder:text-[#AEAEB2]"
                  />
                  <button
                    onClick={() => connect(c.id)}
                    disabled={busy === c.id}
                    className="flex shrink-0 items-center gap-1 rounded-[13px] bg-[#0A84FF] px-3 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
                  >
                    {busy === c.id ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />} Connect
                  </button>
                </div>
              )}
              <p className="mt-2 text-[10.5px] text-[#AEAEB2]">Token from {c.where}</p>
            </motion.div>
          );
        })}

        {/* google workspace */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="rounded-[22px] border border-black/5 bg-white p-4 shadow-[0_6px_22px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#4285F4] text-white">
              <Globe2 size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold text-[#1C1C1E]">
                Google Workspace
                {google?.email && <Check size={14} className="text-[#34C759]" />}
              </p>
              <p className="truncate text-[12px] text-[#8E8E93]">Sign-in identity, Drive and Calendar scopes</p>
            </div>
          </div>
          <div className="mt-3 rounded-[14px] bg-[#F2F2F7] px-3 py-2.5 text-[12px] text-[#3C3C43]">
            {google?.email ? (
              <>
                <p className="font-semibold text-[#1C1C1E]">{google.name || google.email}</p>
                <p className="mt-0.5 text-[11px] text-[#8E8E93]">{google.email}</p>
              </>
            ) : (
              <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[#8E8E93]">
                <TriangleAlert size={12} className="mt-0.5 shrink-0 text-[#FF9F0A]" />
                Sign in with your real Google account to link this workspace. The Google identity is read straight from the sign-in token, not typed.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
