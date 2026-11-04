"use client";

import { motion } from "framer-motion";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { readSkills, writeSkills, uid, type Skill } from "@/lib/workspace";
import { ViewHeader } from "@/components/ui/SectionHeader";

export const PENDING_PROMPT_KEY = "nspace.pending.prompt.v1";

export default function SkillsView() {
  const { user, go, toast } = useStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

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
                  <p className="truncate text-[11.5px] text-[#8E8E93]">{s.runs} runs · {s.enabled ? "enabled" : "paused"}</p>
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
