"use client";

import { motion } from "framer-motion";
import { Bot, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { readSkills, writeSkills, uid, type Skill } from "@/lib/workspace";
import { ViewHeader } from "@/components/ui/SectionHeader";

export const PENDING_PROMPT_KEY = "nspace.pending.prompt.v1";

export default function SkillsView() {
  const { user, go, toast } = useStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [genBusy, setGenBusy] = useState(false);

  useEffect(() => {
    setSkills(readSkills(user?.email));
  }, [user?.email]);

  function persist(next: Skill[]) {
    setSkills(next);
    writeSkills(user?.email, next);
  }

  function add() {
    const s: Skill = {
      id: uid(),
      name: "New skill",
      emoji: "✨",
      instruction: "Describe exactly how the agent should behave for this skill.",
      enabled: true,
      runs: 0,
      updatedAt: new Date().toISOString(),
    };
    persist([s, ...skills]);
    setEditing(s.id);
  }

  async function generate() {
    const text = brief.trim();
    if (!text) return;
    setGenBusy(true);
    try {
      const res = await fetch("/api/agent/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: text }),
      });
      const d = (await res.json()) as {
        ok: boolean;
        error?: string;
        spec?: { name: string; emoji: string; role: string; systemPrompt: string; tools: string[]; steps: string[]; engine: string };
      };
      if (!d.ok || !d.spec) {
        toast(d.error ?? "Agent generate failed");
        return;
      }
      const s2: Skill = {
        id: uid(),
        name: d.spec.name,
        emoji: d.spec.emoji,
        instruction: d.spec.systemPrompt,
        enabled: true,
        runs: 0,
        updatedAt: new Date().toISOString(),
        kind: "agent",
        tools: d.spec.tools,
        steps: d.spec.steps,
        role: d.spec.role,
      };
      persist([s2, ...skills]);
      setEditing(s2.id);
      setBrief("");
      toast(`${d.spec.name} তৈরি হয়েছে (${d.spec.engine})`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setGenBusy(false);
    }
  }

  function use(skill: Skill) {
    try {
      localStorage.setItem(PENDING_PROMPT_KEY, skill.instruction);
    } catch {}
    persist(skills.map((x) => (x.id === skill.id ? { ...x, runs: x.runs + 1 } : x)));
    go("ai");
    toast(`${skill.name} loaded into the agent`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 md:px-8">
      <ViewHeader eyebrow="Agent" title="Skills" />

      <div className="mb-3 rounded-[20px] border border-black/5 bg-white p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1C1C1E]">
          <Wand2 size={14} className="text-[#0A84FF]" /> Generate an agent
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-[#8E8E93]">কী কাজ করবে লিখো — নাম, টুল আর ধাপসহ এজেন্ট তৈরি হবে, সাথে সেভ হয়ে যাবে।</p>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={2}
          placeholder="যেমন: ভিসা ডকুমেন্ট চেক করে ক্লায়েন্টকে বাংলায় আপডেট দেবে"
          className="mt-2 w-full resize-none rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[12.5px] leading-snug outline-none"
        />
        <button onClick={generate} disabled={genBusy || !brief.trim()} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[13px] bg-[#1C1C1E] py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-40">
          {genBusy ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} Generate agent
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-[18px] border border-black/5 bg-white px-4 py-3 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
        <p className="text-[12.5px] leading-snug text-[#8E8E93]">Skills are saved instructions. Pick one and the agent follows it for that chat.</p>
        <button onClick={add} className="ml-3 flex shrink-0 items-center gap-1 rounded-full bg-[#0A84FF] px-3 py-2 text-[12px] font-semibold text-white">
          <Plus size={13} /> New
        </button>
      </div>

      <div className="space-y-2.5">
        {skills.map((s, i) => {
          const open = editing === s.id;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.04, 0.2) }}
              className="rounded-[20px] border border-black/5 bg-white p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[#F2F2F7] text-[16px]">{s.emoji}</span>
                <button onClick={() => setEditing(open ? null : s.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[14.5px] font-semibold text-[#1C1C1E]">{s.name}</p>
                  <p className="truncate text-[11.5px] text-[#8E8E93]">
                    {s.kind === "agent" ? `agent · ${s.tools?.length ?? 0} tools · ` : ""}
                    {s.runs} runs · {s.enabled ? "enabled" : "paused"}
                  </p>
                </button>
                <button
                  onClick={() => persist(skills.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)))}
                  aria-label={s.enabled ? "Disable skill" : "Enable skill"}
                  className={`h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors ${s.enabled ? "bg-[#34C759]" : "bg-black/15"}`}
                >
                  <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${s.enabled ? "translate-x-4" : ""}`} />
                </button>
              </div>

              {open && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-2 overflow-hidden">
                  <div className="flex gap-2">
                    <input
                      value={s.emoji}
                      onChange={(e) => persist(skills.map((x) => (x.id === s.id ? { ...x, emoji: e.target.value.slice(0, 2) } : x)))}
                      className="w-12 rounded-[12px] bg-[#F2F2F7] px-2 py-2 text-center text-[15px] outline-none"
                    />
                    <input
                      value={s.name}
                      onChange={(e) => persist(skills.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
                      className="min-w-0 flex-1 rounded-[12px] bg-[#F2F2F7] px-3 py-2 text-[14px] outline-none"
                    />
                  </div>
                  <textarea
                    value={s.instruction}
                    onChange={(e) => persist(skills.map((x) => (x.id === s.id ? { ...x, instruction: e.target.value } : x)))}
                    rows={4}
                    className="w-full resize-none rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[13px] leading-snug outline-none"
                  />
                  {!!s.steps?.length && (
                    <ol className="space-y-1 rounded-[12px] bg-[#F2F2F7] p-2.5">
                      {s.steps.map((step, si) => (
                        <li key={si} className="flex gap-1.5 text-[11.5px] leading-snug text-[#3C3C43]">
                          <span className="font-mono text-[10px] font-bold text-[#0A84FF]">{si + 1}</span> {step}
                        </li>
                      ))}
                    </ol>
                  )}
                  {!!s.tools?.length && (
                    <div className="flex flex-wrap gap-1">
                      {s.tools.map((t) => (
                        <span key={t} className="rounded-full bg-black/[0.05] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#3C3C43]">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => use(s)} className="flex flex-1 items-center justify-center gap-1.5 rounded-[13px] bg-[#0A84FF] px-3 py-2.5 text-[12.5px] font-semibold text-white">
                      <Sparkles size={14} /> Use in agent
                    </button>
                    <button
                      onClick={() => {
                        persist(skills.filter((x) => x.id !== s.id));
                        setEditing(null);
                        toast("Skill deleted");
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-[13px] bg-[#FF3B30]/10 px-3 py-2.5 text-[12.5px] font-semibold text-[#FF3B30]"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
