"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Boxes, ChevronRight, Cog, FileText, Globe, KeyRound, LogOut, Plug, ScanSearch, Server, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { readProfile, writeProfile, type Profile } from "@/lib/workspace";
import { ViewHeader } from "@/components/ui/SectionHeader";

const COLORS = ["#007AFF", "#5E5CE6", "#BF5AF2", "#FF375F", "#FF9F0A", "#30D158", "#64D2FF", "#1C1C1E"];

export default function AccountView() {
  const { user, role, apps, go, signOutNow, toast } = useStore();
  const [profile, setProfile] = useState<Profile>(() => readProfile(user?.email, user?.name));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(readProfile(user?.email, user?.name));
  }, [user?.email, user?.name]);

  function patch(next: Partial<Profile>) {
    const merged = { ...profile, ...next };
    setProfile(merged);
    writeProfile(user?.email, merged);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  }

  const initials = (profile.name || "N")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const rows = [
    { label: "Connections", note: "GitHub · Vercel · Cloudflare · Google", icon: Plug, view: "connections" as const },
    { label: "Skills", note: "Reusable agent instructions", icon: Sparkles, view: "skills" as const },
    { label: "Knowledge", note: "Notes the agent always reads", icon: Boxes, view: "knowledge" as const },
    { label: "MCP server", note: "Use this workspace from any AI", icon: Server, view: "mcp" as const },
    { label: "Live browser", note: "Playwright + Gemini page preview", icon: Globe, view: "browser" as const },
    { label: "Site analysis", note: "Bengali report with citations", icon: ScanSearch, view: "analyze" as const },
    { label: "PDF Studio", note: "Real A4 PDF export", icon: FileText, view: "pdf" as const },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 md:px-8">
      <ViewHeader eyebrow="Your workspace" title="Account" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_10px_34px_rgba(0,0,0,0.06)]">
        <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[#007AFF] via-[#5E5CE6] to-[#BF5AF2]">
          <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />
        </div>
        <div className="-mt-10 px-5 pb-5">
          <div className="flex items-end gap-3">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[24px] text-[26px] font-bold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] ring-4 ring-white" style={{ background: profile.color }}>
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                initials || "N"
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="flex items-center gap-1.5 truncate text-[20px] font-bold tracking-tight text-[#1C1C1E]">
                {profile.name || "Unnamed"}
                {role === "admin" && <BadgeCheck size={16} className="shrink-0 text-[#0A84FF]" />}
              </p>
              <p className="truncate text-[13px] text-[#8E8E93]">{profile.email}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${role === "admin" ? "bg-[#0A84FF]/10 text-[#0A84FF]" : "bg-black/[0.06] text-[#3C3C43]"}`}>
              {role === "admin" ? "Admin" : "Member"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { k: "Projects", v: apps.length },
              { k: "Repos", v: apps.filter((a) => a.source === "github").length },
              { k: "Status", v: saved ? "Saved" : "Live" },
            ].map((s) => (
              <div key={s.k} className="rounded-[16px] bg-[#F2F2F7] px-3 py-2.5 text-center">
                <p className="text-[16px] font-bold text-[#1C1C1E]">{s.v}</p>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8E8E93]">{s.k}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">Display name</label>
              <input
                value={profile.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Your name"
                className="w-full rounded-[14px] border border-black/[0.06] bg-[#F2F2F7] px-3 py-2.5 text-[15px] text-[#1C1C1E] outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">Tagline</label>
              <input
                value={profile.tagline ?? ""}
                onChange={(e) => patch({ tagline: e.target.value })}
                placeholder="Visa partner · builder"
                className="w-full rounded-[14px] border border-black/[0.06] bg-[#F2F2F7] px-3 py-2.5 text-[14px] text-[#1C1C1E] outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">Avatar colour</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={`Colour ${c}`}
                    onClick={() => patch({ color: c })}
                    className={`h-8 w-8 rounded-full ring-2 transition ${profile.color === c ? "ring-[#1C1C1E]" : "ring-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">Avatar image URL</label>
              <input
                value={profile.avatar ?? ""}
                onChange={(e) => patch({ avatar: e.target.value })}
                placeholder="https://…"
                className="w-full rounded-[14px] border border-black/[0.06] bg-[#F2F2F7] px-3 py-2.5 text-[14px] text-[#1C1C1E] outline-none"
              />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-black/5 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <button
              key={r.label}
              onClick={() => go(r.view)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-black/[0.02] ${i ? "border-t border-black/[0.05]" : ""}`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#007AFF]/10 text-[#007AFF]">
                <Icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[#1C1C1E]">{r.label}</span>
                <span className="block truncate text-[12px] text-[#8E8E93]">{r.note}</span>
              </span>
              <ChevronRight size={16} className="text-[#C7C7CC]" />
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => go("ai")} className="flex items-center justify-center gap-1.5 rounded-[16px] bg-[#0A84FF] px-3 py-3 text-[13px] font-semibold text-white shadow-[0_6px_18px_rgba(10,132,255,0.3)]">
          <Sparkles size={15} /> Open agent
        </button>
        <button onClick={() => toast("Keys open from the Keys tab")} className="flex items-center justify-center gap-1.5 rounded-[16px] bg-black/[0.06] px-3 py-3 text-[13px] font-semibold text-[#1C1C1E]">
          <KeyRound size={15} /> API keys
        </button>
      </div>

      <div className="mt-4 rounded-[20px] border border-black/5 bg-white/70 p-4">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1C1E]"><ShieldCheck size={13} /> Private by default</p>
        <p className="mt-1 text-[12px] leading-snug text-[#8E8E93]">Profile, skills, knowledge and connections are stored under your account on this device. Nothing is shared with another sign-in.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={signOutNow} className="flex items-center gap-1.5 rounded-full bg-[#FF3B30]/10 px-3 py-2 text-[12px] font-semibold text-[#FF3B30]">
            <LogOut size={13} /> Sign out
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-2 text-[12px] font-semibold text-[#3C3C43]">
            <UserRound size={13} /> {profile.joinedAt.slice(0, 10)}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-2 text-[12px] font-semibold text-[#3C3C43]">
            <Cog size={13} /> {role ?? "guest"}
          </span>
        </div>
      </div>
    </div>
  );
}
