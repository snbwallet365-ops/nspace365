"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CloudDownload, RefreshCw, Square } from "lucide-react";
import { useStore } from "@/components/store";
import type { StoreApp } from "@/lib/types";

type Variant = "soft" | "solid" | "glass";

const styles: Record<Variant, string> = {
  soft: "bg-[#F2F2F7] text-[#007AFF] hover:bg-[#E9E9EF]",
  solid: "bg-[#007AFF] text-white hover:bg-[#0A84FF] shadow-[0_4px_14px_rgba(0,122,255,0.35)]",
  glass: "bg-white/85 text-[#007AFF] backdrop-blur-md hover:bg-white shadow-sm",
};

export default function GetButton({ app, variant = "soft", large = false }: { app: StoreApp; variant?: Variant; large?: boolean }) {
  const { installing, getApp, openApp } = useStore();
  const progress = installing[app.id];
  const isInstalling = progress !== undefined;
  const size = large ? "h-11 min-w-[92px] px-6 text-[16px]" : "h-9 min-w-[74px] px-4 text-[15px] sm:h-8 sm:min-w-[72px]";

  const state = isInstalling ? "installing" : app.status === "installed" ? "open" : app.status === "update" ? "update" : "get";

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === "installing") return;
    if (state === "open") openApp(app);
    else getApp(app);
  };

  const r = 12;
  const c = 2 * Math.PI * r;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      aria-label={`${state} ${app.name}`}
      className={`relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-bold tracking-tight transition-colors ${size} ${styles[variant]}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "installing" ? (
          <motion.span key="i" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.16, ease: "easeOut" }} className="relative grid h-7 w-7 place-items-center">
            <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
              <circle cx="14" cy="14" r={r} fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
              <circle cx="14" cy="14" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} style={{ transition: "stroke-dashoffset 0.14s ease-out" }} />
            </svg>
            <Square size={8} fill="currentColor" className="absolute" />
          </motion.span>
        ) : (
          <motion.span key={state} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }} className="inline-flex items-center gap-1.5">
            {state === "get" && (
              <>
                GET <CloudDownload size={large ? 17 : 15} strokeWidth={2.4} />
              </>
            )}
            {state === "update" && (
              <>
                <RefreshCw size={large ? 15 : 13} strokeWidth={2.6} /> UPDATE
              </>
            )}
            {state === "open" && "OPEN"}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
