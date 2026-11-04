"use client";

import { motion } from "framer-motion";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store";
import { readKnowledge, writeKnowledge, uid, type KnowledgeEntry } from "@/lib/workspace";
import { ViewHeader } from "@/components/ui/SectionHeader";

export default function KnowledgeView() {
  const { user, toast } = useStore();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(readKnowledge(user?.email));
  }, [user?.email]);

  function persist(next: KnowledgeEntry[]) {
    setEntries(next);
    writeKnowledge(user?.email, next);
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return entries;
    return entries.filter((e) => `${e.title} ${e.body} ${e.tags.join(" ")}`.toLowerCase().includes(t));
  }, [entries, q]);

  function add() {
    const e: KnowledgeEntry = {
      id: uid(),
      title: "New note",
      body: "Anything the agent should always know — prices, steps, tone, contacts.",
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    persist([e, ...entries]);
    setOpenId(e.id);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 md:px-8">
      <ViewHeader eyebrow="Agent memory" title="Knowledge" />

      <div className="mb-3 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-[#F2F2F7] px-3">
          <Search size={14} className="shrink-0 text-[#8E8E93]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search knowledge" className="w-full bg-transparent py-2.5 text-[13.5px] outline-none placeholder:text-[#AEAEB2]" />
        </div>
        <button onClick={add} className="flex shrink-0 items-center gap-1 rounded-[14px] bg-[#0A84FF] px-3 py-2.5 text-[12.5px] font-semibold text-white">
          <Plus size={14} /> Note
        </button>
      </div>

      <p className="mb-3 flex items-center gap-1.5 px-1 text-[11.5px] text-[#8E8E93]">
        <BookOpen size={12} /> {entries.length} notes · every note is passed to the agent on each message
      </p>

      <div className="space-y-2.5">
        {filtered.map((e, i) => {
          const open = openId === e.id;
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.04, 0.2) }}
              className="rounded-[20px] border border-black/5 bg-white p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.04)]"
            >
              <button onClick={() => setOpenId(open ? null : e.id)} className="w-full text-left">
                <p className="truncate text-[14.5px] font-semibold text-[#1C1C1E]">{e.title}</p>
                {!open && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#8E8E93]">{e.body}</p>}
              </button>
              {open && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2 overflow-hidden">
                  <input
                    value={e.title}
                    onChange={(ev) => persist(entries.map((x) => (x.id === e.id ? { ...x, title: ev.target.value, updatedAt: new Date().toISOString() } : x)))}
                    className="w-full rounded-[12px] bg-[#F2F2F7] px-3 py-2 text-[14px] font-semibold outline-none"
                  />
                  <textarea
                    value={e.body}
                    onChange={(ev) => persist(entries.map((x) => (x.id === e.id ? { ...x, body: ev.target.value, updatedAt: new Date().toISOString() } : x)))}
                    rows={5}
                    className="w-full resize-none rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[13px] leading-snug outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={e.tags.join(", ")}
                      onChange={(ev) =>
                        persist(
                          entries.map((x) =>
                            x.id === e.id ? { ...x, tags: ev.target.value.split(",").map((t) => t.trim()).filter(Boolean), updatedAt: new Date().toISOString() } : x,
                          ),
                        )
                      }
                      placeholder="tags, comma separated"
                      className="min-w-0 flex-1 rounded-[12px] bg-[#F2F2F7] px-3 py-2 text-[12px] outline-none placeholder:text-[#AEAEB2]"
                    />
                    <button
                      onClick={() => {
                        persist(entries.filter((x) => x.id !== e.id));
                        setOpenId(null);
                        toast("Note deleted");
                      }}
                      className="flex items-center gap-1 rounded-[12px] bg-[#FF3B30]/10 px-2.5 py-2 text-[12px] font-semibold text-[#FF3B30]"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="px-2 py-6 text-center text-[13px] text-[#8E8E93]">No notes match.</p>}
      </div>
    </div>
  );
}
