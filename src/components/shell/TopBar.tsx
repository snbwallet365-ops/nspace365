"use client";

import { motion } from "framer-motion";
import { Layers, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { timeAgo } from "@/lib/format";

export default function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { github, syncing, apps, go } = useStore();
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const updates = apps.filter((a) => a.status === "update").length;
  const status = syncing
    ? { dot: "bg-[#007AFF] pulse-dot", text: "Syncing repositories…" }
    : github.connected
      ? { dot: "bg-[#34C759]", text: `GitHub · synced ${timeAgo(github.lastSync)}` }
      : { dot: "bg-[#C7C7CC]", text: "Connect GitHub" };

  return (
    <header className="z-30 shrink-0 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl backdrop-saturate-150" style={{ paddingTop: "var(--safe-top)" }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-8 lg:pl-[120px]">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] shadow-[0_4px_12px_rgba(0,122,255,0.3)] ring-1 ring-black/5">
          <Layers size={19} className="text-white" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[17px] font-bold tracking-tight text-black">N Space</p>
          <button onClick={() => go("github")} className="flex max-w-full items-center gap-1.5 text-[12px] text-[#8E8E93] transition-colors hover:text-[#1C1C1E]">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} />
            <motion.span key={status.text} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="truncate">
              {status.text}
            </motion.span>
          </button>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => onOpenSettings()}
          aria-label="Keys and connections"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-black/[0.06] bg-white/80 text-[#3C3C43] shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-xl"
        >
          <SlidersHorizontal size={16} />
        </motion.button>

        <div className="relative shrink-0">
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          onClick={() => go("account")}
          aria-label="Account"
          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#AEAEB2] to-[#636366] ring-2 ring-white shadow-[0_2px_10px_rgba(0,0,0,0.12)]"
        >
          {github.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={github.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#5AC8FA] to-[#007AFF] text-[15px] font-semibold text-white">
              {(github.login ?? "N").slice(0, 1).toUpperCase()}
            </span>
          )}
        </motion.button>
        {updates > 0 && <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#FF3B30]" />}
        </div>
      </div>
    </header>
  );
}
