"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore, type View } from "@/components/store";
import { readSkills } from "@/lib/workspace";
import GithubMark from "@/components/ui/GithubMark";

const QUICK: { id: string; view: View; title: string; sub: string; image: string; tint: string }[] = [
  { id: "analyze", view: "analyze", title: "Site analysis", sub: "বাংলা রিপোর্ট + সাইটেশন", image: "/hero/hero-aurora.jpg", tint: "#0A84FF" },
  { id: "pdf", view: "pdf", title: "PDF Studio", sub: "আসল A4 PDF এক্সপোর্ট", image: "/hero/hero-mint.jpg", tint: "#1E7A34" },
  { id: "browser", view: "browser", title: "Live browser", sub: "Playwright মোবাইল প্রিভিউ", image: "/hero/hero-sunset.jpg", tint: "#FF9F0A" },
  { id: "skills", view: "skills", title: "Agent build", sub: "লিখেই এজেন্ট তৈরি", image: "/hero/hero-aurora.jpg", tint: "#5E5CE6" },
];

export default function DashboardCards({ repos }: { repos: { id: string; name: string; subtitle?: string }[] }) {
  const { github, go, user, openSheet } = useStore();
  const [agents, setAgents] = useState(0);

  useEffect(() => {
    const skills = readSkills(user?.email);
    setAgents(skills.filter((s) => s.kind === "agent").length);
  }, [user?.email]);

  const sync = github.lastSync ? new Date(github.lastSync) : null;
  const stats = [
    { label: "Repos synced", value: String(github.repoCount ?? repos.length ?? 0) },
    { label: "Apps live", value: String(repos.length) },
    { label: "Agents", value: String(agents) },
    { label: "Last sync", value: sync ? sync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—" },
  ];

  return (
    <section className="mt-5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[18px] border border-black/5 bg-white p-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">{s.label}</p>
            <p className="mt-1 text-[20px] font-bold leading-none tracking-tight text-[#1C1C1E]">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {QUICK.map((q, i) => (
          <motion.button
            key={q.id}
            onClick={() => go(q.view)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            whileTap={{ scale: 0.97 }}
            className="group relative h-[112px] overflow-hidden rounded-[20px] text-left shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
            <span className="absolute inset-0" style={{ background: `radial-gradient(90% 70% at 88% 12%, ${q.tint}66 0%, transparent 60%)` }} />
            <span className="relative flex h-full flex-col justify-end p-3">
              <span className="text-[13px] font-semibold leading-tight text-white">{q.title}</span>
              <span className="text-[10.5px] leading-tight text-white/70">{q.sub}</span>
            </span>
            <span className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
              <ArrowUpRight size={12} />
            </span>
          </motion.button>
        ))}
      </div>

      {repos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {repos.slice(0, 2).map((r) => (
            <button
              key={r.id}
              onClick={() => openSheet(r.id)}
              className="flex items-center gap-2 rounded-[18px] border border-black/5 bg-white p-2.5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#F2F2F7] text-[#1C1C1E]">
                <GithubMark size={15} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[#1C1C1E]">{r.name}</span>
                <span className="block truncate text-[10.5px] text-[#8E8E93]">{r.subtitle ?? "GitHub repo"}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {agents > 0 && (
        <button onClick={() => go("skills")} className="mt-2.5 flex w-full items-center gap-2 rounded-[16px] bg-[#0A84FF]/8 p-2.5 text-left">
          <Bot size={14} className="shrink-0 text-[#0A84FF]" />
          <span className="text-[11.5px] font-semibold text-[#0A84FF]">{agents}টি এজেন্ট তৈরি হয়েছে — Skills-এ দেখুন</span>
        </button>
      )}
    </section>
  );
}
