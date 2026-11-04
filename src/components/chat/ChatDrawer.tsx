"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, ChevronDown, FolderGit2, GitBranch, Globe, MessageSquare, Pin, PinOff, Plug, Search, Server, Sparkles, SquarePen, Trash2, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/components/store";
import AppIcon from "@/components/ui/AppIcon";
import { timeAgo } from "@/lib/format";
import type { ChatSession } from "@/lib/types";

export default function ChatDrawer({
  open, onClose, sessions, activeId, onSelect, onNew, onDelete, onTogglePin, onPinRepo,
}: {
  open: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (s: ChatSession) => void;
  onPinRepo: (repoId: string | null) => void;
}) {
  const { apps, go } = useStore();
  const repos = apps.filter((a) => a.source === "github");
  const active = sessions.find((s) => s.id === activeId);
  const activeRepo = repos.find((r) => r.id === active?.pinnedRepoId);
  const [q, setQ] = useState("");
  const [reposOpen, setReposOpen] = useState(false);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? repos.filter((r) => `${r.name} ${r.meta.fullName ?? ""} ${r.genre}`.toLowerCase().includes(t)) : repos;
  }, [q, repos]);
  const sorted = [...sessions].sort((a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} onClick={onClose} />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 flex w-[340px] max-w-[88vw] flex-col border-r border-black/5 bg-white/85 shadow-[0_8px_48px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
            style={{ paddingTop: "var(--safe-top)" }}
          >
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="text-[22px] font-bold tracking-tight">Chats</h2>
              <button onClick={onClose} aria-label="Close drawer" className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.06] text-[#8E8E93]">
                <X size={16} strokeWidth={2.6} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
              <button onClick={onNew} className="mb-3 flex w-full items-center gap-2 rounded-2xl bg-[#007AFF] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(0,122,255,0.3)] transition-transform active:scale-[0.98]">
                <SquarePen size={17} /> New chat
              </button>

              {/* repo button — tap to browse every repo */}
              <button
                onClick={() => setReposOpen((v) => !v)}
                aria-expanded={reposOpen}
                className="mb-3 w-full rounded-2xl border border-black/5 bg-[#F2F2F7] p-3.5 text-left transition-colors hover:bg-[#EDEDF3]"
              >
                <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  <FolderGit2 size={12} /> GitHub repo
                  <span className="ml-auto flex items-center gap-1 text-[10.5px] font-semibold normal-case tracking-normal text-[#007AFF]">
                    {repos.length} repos <ChevronDown size={13} className={`transition-transform ${reposOpen ? "rotate-180" : ""}`} />
                  </span>
                </p>
                <div className="mt-2 flex items-center gap-2.5">
                  {activeRepo ? <AppIcon app={activeRepo} size={36} /> : <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white text-[#8E8E93]"><GitBranch size={17} /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{activeRepo?.meta.fullName ?? "No repository pinned"}</p>
                    <p className="flex items-center gap-1 font-mono text-[12px] text-[#007AFF]">
                      <GitBranch size={12} /> {active?.branch ?? "main"}
                    </p>
                  </div>
                </div>
              </button>

              {/* all repos */}
              {reposOpen && (
                <>
                  <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#F2F2F7] px-2.5">
                    <Search size={14} className="shrink-0 text-[#8E8E93]" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all repos" className="w-full bg-transparent py-2 text-[13.5px] outline-none placeholder:text-[#AEAEB2]" autoFocus />
                  </div>
                  <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">All repositories</p>
                  <div className="mb-4 max-h-[38vh] space-y-0.5 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <p className="px-2 py-3 text-[12.5px] text-[#8E8E93]">Nothing matches.</p>
                    ) : (
                      filtered.slice(0, 120).map((r) => {
                        const on = r.id === active?.pinnedRepoId;
                        return (
                          <button
                            key={r.id}
                            onClick={() => {
                              onPinRepo(on ? null : r.id);
                              setReposOpen(false);
                              if (!on) onClose();
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${on ? "bg-[#007AFF]/10" : "hover:bg-black/[0.04]"}`}
                          >
                            <AppIcon app={r} size={32} />
                            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{r.name}</span>
                            {on && <Check size={16} className="text-[#007AFF]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
              {repos.length === 0 ? (
                <button onClick={() => { onClose(); go("github"); }} className="mb-4 w-full rounded-2xl border border-dashed border-black/10 p-3 text-left text-[13px] text-[#8E8E93] hover:bg-black/[0.02]">
                  No repositories yet. <span className="font-semibold text-[#007AFF]">Sync GitHub →</span>
                </button>
              ) : (
                <div className="mb-4 space-y-0.5">
                  {filtered.slice(0, 60).map((r) => {
                    const on = r.id === active?.pinnedRepoId;
                    return (
                      <button key={r.id} onClick={() => { onPinRepo(on ? null : r.id); if (!on) onClose(); }} className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${on ? "bg-[#007AFF]/10" : "hover:bg-black/[0.04]"}`}>
                        <AppIcon app={r} size={32} />
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{r.name}</span>
                        {on && <Check size={16} className="text-[#007AFF]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* workspace pages */}
              <p className="mb-1.5 mt-1 px-1 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Workspace</p>
              <div className="mb-4 grid grid-cols-2 gap-1.5">
                {[
                  { label: "Account", icon: UserRound, view: "account" as const },
                  { label: "Connections", icon: Plug, view: "connections" as const },
                  { label: "Skills", icon: Sparkles, view: "skills" as const },
                  { label: "Knowledge", icon: BookOpen, view: "knowledge" as const },
                  { label: "MCP server", icon: Server, view: "mcp" as const },
                  { label: "Live browser", icon: Globe, view: "browser" as const },
                ].map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.label}
                      onClick={() => {
                        onClose();
                        go(it.view);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-[#F2F2F7] px-2.5 py-2 text-[12.5px] font-semibold text-[#1C1C1E] transition-colors hover:bg-[#E9E9EF]"
                    >
                      <Icon size={13} className="text-[#0A84FF]" /> {it.label}
                    </button>
                  );
                })}
              </div>

              {/* sessions */}
              <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Conversations</p>
              <div className="space-y-0.5">
                {sorted.map((s) => (
                  <div key={s.id} className={`group flex items-center gap-1 rounded-xl pr-1 transition-colors ${s.id === activeId ? "bg-black/[0.06]" : "hover:bg-black/[0.04]"}`}>
                    <button onClick={() => onSelect(s.id)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left">
                      {s.pinned ? <Pin size={15} className="shrink-0 text-[#007AFF]" /> : <MessageSquare size={15} className="shrink-0 text-[#8E8E93]" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-medium">{s.title}</span>
                        <span className="block text-[11.5px] text-[#8E8E93]">{timeAgo(s.updatedAt)} · {s.branch}</span>
                      </span>
                    </button>
                    <button onClick={() => onTogglePin(s)} aria-label={s.pinned ? "Unpin" : "Pin"} className="grid h-8 w-8 place-items-center rounded-full text-[#8E8E93] hover:bg-black/[0.06]">
                      {s.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button onClick={() => onDelete(s.id)} aria-label="Delete chat" className="grid h-8 w-8 place-items-center rounded-full text-[#8E8E93] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
