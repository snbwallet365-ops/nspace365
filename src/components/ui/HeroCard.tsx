"use client";

import { motion } from "framer-motion";
import { useStore } from "@/components/store";
import { iconFor } from "@/lib/icon-map";
import type { StoreApp } from "@/lib/types";
import AppIcon from "./AppIcon";
import ArtTile from "./ArtTile";
import GetButton from "./GetButton";

export default function HeroCard({
  app, image, badge, title, tall = true, index = 0,
}: {
  app: StoreApp;
  image?: string;
  badge?: string;
  title: string;
  tall?: boolean;
  index?: number;
}) {
  const { openSheet } = useStore();
  const Big = iconFor(app.icon);
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: index * 0.06 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => openSheet(app.id)}
      className={`relative cursor-pointer overflow-hidden rounded-3xl border border-black/5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ${tall ? "h-[440px] sm:h-[480px]" : "h-[340px]"}`}
      style={{ background: `linear-gradient(145deg, ${app.color1}, ${app.color2})` }}
    >
      <ArtTile seed={app.id + app.name} label={app.name} rounded={0} className="absolute inset-0 h-full w-full" />
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-soft-light transition-transform duration-500 ease-out hover:scale-[1.04]"
          draggable={false}
        />
      ) : null}
      <Big className="absolute -right-6 top-4 text-white/15" size={200} strokeWidth={1.1} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/25" />

      <div className="relative p-6 sm:p-7">
        {badge && <p className="text-[13px] font-semibold uppercase tracking-wider text-white/85">{badge}</p>}
        <h3 className="mt-1.5 max-w-[16ch] whitespace-pre-line text-[32px] font-bold leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-[38px]">{title}</h3>
      </div>

      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2.5 rounded-2xl border border-white/40 bg-white/70 p-3 sm:gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <AppIcon app={app} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold leading-tight text-black">{app.name}</p>
          <p className="line-clamp-2 text-[13px] leading-snug text-[#3C3C43]/70 sm:line-clamp-1">{app.subtitle}</p>
        </div>
        <GetButton app={app} variant="solid" />
      </div>
    </motion.article>
  );
}
