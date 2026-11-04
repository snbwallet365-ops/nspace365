"use client";

import { motion } from "framer-motion";
import { useStore } from "@/components/store";
import type { StoreApp } from "@/lib/types";
import AppIcon from "./AppIcon";
import GetButton from "./GetButton";

export default function AppRow({ app, rank, divider = true, index = 0 }: { app: StoreApp; rank?: number; divider?: boolean; index?: number }) {
  const { openSheet, openApp } = useStore();
  const direct = app.source === "github" && !!app.url && /^https?:/.test(app.url);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut", delay: Math.min(index * 0.03, 0.18) }}
      role="button"
      tabIndex={0}
      onClick={() => (direct ? openApp(app) : openSheet(app.id))}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (direct ? openApp(app) : openSheet(app.id))}
      className="group relative flex cursor-pointer items-center gap-2.5 rounded-2xl py-2.5 sm:gap-3 outline-none transition-colors hover:bg-black/[0.025] focus-visible:ring-2 focus-visible:ring-[#007AFF]/40"
    >
      {rank !== undefined && <span className="w-5 shrink-0 text-center text-[17px] font-semibold text-[#1C1C1E]">{rank}</span>}
      <AppIcon app={app} size={56} className="sm:h-[60px] sm:w-[60px]" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-[16px] font-semibold leading-[1.2] text-black sm:text-[17px]">{app.name}</p>
        <p className="mt-0.5 line-clamp-2 break-words text-[13px] leading-snug text-[#8E8E93]">{app.subtitle || app.genre}</p>
        <p className="mt-0.5 truncate text-[12px] leading-snug text-[#8E8E93]/80">{app.genre}</p>
      </div>
      <GetButton app={app} />
      {divider && <span className="absolute bottom-0 right-0 h-px bg-black/[0.06]" style={{ left: rank !== undefined ? 86 : 66 }} />}
    </motion.div>
  );
}
