"use client";

import { motion } from "framer-motion";
import { ArrowRight, GitBranch } from "lucide-react";
import GithubMark from "@/components/ui/GithubMark";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import AppIcon from "@/components/ui/AppIcon";
import AppRow from "@/components/ui/AppRow";
import GetButton from "@/components/ui/GetButton";
import HeroCard from "@/components/ui/HeroCard";
import SectionHeader, { ViewHeader } from "@/components/ui/SectionHeader";

export default function TodayView() {
  const { apps, github, go, openSheet } = useStore();
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const repos = apps.filter((a) => a.source === "github");
  const by = (id: string) => apps.find((a) => a.id === id);
  const lumen = by("lumen") ?? repos[0];
  const pulse = by("pulse") ?? repos[1];
  const sky = by("skyforge") ?? repos[2];
  const trending = repos.slice(0, 8);
  const topApps = repos.slice(8, 14);
  const games = apps.filter((a) => a.category === "games").slice(0, 3);
  const arcade = repos.slice(14, 17);

  return (
    <div>
      <ViewHeader eyebrow={date || " "} title="Discover" />

      <div className="grid gap-5 md:grid-cols-2">
        {lumen && (
          <div className="md:col-span-2">
            <HeroCard app={lumen} image="/hero/hero-aurora.jpg" badge="LIVE FROM GITHUB" title={"Your repo,\non your phone."} index={0} />
          </div>
        )}
        {pulse && <HeroCard app={pulse} image="/hero/hero-mint.jpg" badge="TAP TO OPEN" title={"Full app,\ninside here."} tall={false} index={1} />}
        {sky && <HeroCard app={sky} image="/hero/hero-sunset.jpg" badge="JUST SYNCED" title={"Every commit,\none place."} tall={false} index={2} />}
      </div>

      {/* GitHub CTA */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        className="relative mt-5 overflow-hidden rounded-3xl border border-black/5 bg-[#F2F2F7] p-6 sm:p-7"
      >
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#007AFF]/15 blur-3xl" />
        <p className="relative text-[13px] font-semibold uppercase tracking-wider text-[#007AFF]">Developer</p>
        <h3 className="relative mt-1 max-w-[18ch] text-[28px] font-bold leading-tight tracking-tight text-black">Turn your repos into apps.</h3>
        <p className="relative mt-2 max-w-md text-[15px] leading-snug text-[#3C3C43]/70">
          Sync GitHub and every repository becomes an App Store listing with an auto-generated icon, live preview and commit timeline.
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          onClick={() => go("github")}
          className="relative mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#007AFF] px-5 text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(0,122,255,0.35)]"
        >
          <GithubMark size={18} /> {github.connected ? `${github.repoCount ?? repos.length} repos synced` : "Sync Repositories"} <ArrowRight size={16} />
        </motion.button>
      </motion.section>

      {repos.length > 0 && (
        <>
          <SectionHeader title="Your Projects" action="Manage" onAction={() => go("github")} />
          <div className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
            {repos.map((r) => (
              <div key={r.id} onClick={() => openSheet(r.id)} className="w-[260px] shrink-0 cursor-pointer snap-start rounded-3xl border border-black/5 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)]">
                <div className="flex items-center gap-3">
                  <AppIcon app={r} size={56} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words text-[16px] font-semibold leading-[1.2]">{r.name}</p>
                    <p className="flex items-center gap-1 text-[12px] text-[#8E8E93]">
                      <GitBranch size={12} /> {r.meta.branch}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 min-h-[36px] text-[13px] leading-snug text-[#8E8E93]">{r.description}</p>
                <div className="mt-3 flex justify-end">
                  <GetButton app={r} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeader title="Fresh from your repos" />
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {trending.slice(0, 8).map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.04, 0.24) }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openSheet(a.id)}
            className="group cursor-pointer rounded-[24px] border border-black/5 bg-white p-2.5 shadow-[0_4px_18px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_12px_30px_rgba(0,0,0,0.10)]"
          >
            <AppIcon app={a} size={160} className="!h-auto !w-full aspect-square !rounded-[20px]" />
            <p className="mt-2 line-clamp-2 break-words text-[13.5px] font-semibold leading-[1.25] text-black">{a.name}</p>
            <p className="truncate text-[11px] leading-snug text-[#8E8E93]">{a.genre}</p>
            <div className="mt-1.5 flex justify-end">
              <GetButton app={a} />
            </div>
          </motion.div>
        ))}
      </div>

      <SectionHeader title="All Projects" action="See All" onAction={() => go("apps")} />
      <div className="mt-1 grid gap-x-8 md:grid-cols-2">
        {topApps.map((a, i) => (
          <AppRow key={a.id} app={a} rank={i + 1} index={i} divider={i < topApps.length - 1} />
        ))}
      </div>

      

      
    </div>
  );
}
