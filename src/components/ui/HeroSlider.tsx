"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore, type View } from "@/components/store";

interface Slide {
  id: string;
  brand: string;
  headline: string;
  sub: string;
  image: string;
  tint: string;
  view: View;
  cta: string;
  logo: "github" | "vercel" | "cloudflare" | "lovable" | "base44" | "nspace";
}

const SLIDES: Slide[] = [
  {
    id: "github",
    brand: "GitHub",
    headline: "Your repos,\nas an app store.",
    sub: "83 repositories, live from the GitHub API",
    image: "/hero/hero-aurora.jpg",
    tint: "#0A84FF",
    view: "github",
    cta: "Browse repos",
    logo: "github",
  },
  {
    id: "vercel",
    brand: "Vercel",
    headline: "Ship it\nin one tap.",
    sub: "Token in, deployments and domains out",
    image: "/hero/hero-mint.jpg",
    tint: "#111111",
    view: "connections",
    cta: "Connect Vercel",
    logo: "vercel",
  },
  {
    id: "cloudflare",
    brand: "Cloudflare",
    headline: "Workers,\nKV and Pages.",
    sub: "Edge runtime wired to the same workspace",
    image: "/hero/hero-sunset.jpg",
    tint: "#F38020",
    view: "connections",
    cta: "Connect Cloudflare",
    logo: "cloudflare",
  },
  {
    id: "lovable",
    brand: "Lovable",
    headline: "Design first,\nthen build.",
    sub: "Generated screens land in your projects",
    image: "/hero/hero-aurora.jpg",
    tint: "#FF375F",
    view: "apps",
    cta: "Open projects",
    logo: "lovable",
  },
  {
    id: "base44",
    brand: "Base44",
    headline: "Agent plus\nbackend.",
    sub: "Entities, functions and automations ready",
    image: "/hero/hero-mint.jpg",
    tint: "#5E5CE6",
    view: "ai",
    cta: "Open agent",
    logo: "base44",
  },
  {
    id: "nspace",
    brand: "N Space",
    headline: "One workspace,\nall your keys.",
    sub: "Models, skills, knowledge in one place",
    image: "/hero/hero-sunset.jpg",
    tint: "#30D158",
    view: "account",
    cta: "Your account",
    logo: "nspace",
  },
];

function BrandLogo({ kind, size = 22 }: { kind: Slide["logo"]; size?: number }) {
  if (kind === "github") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.8 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.8-1.4-3.8-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.7 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0C17.4 4.4 18.4 4.7 18.4 4.7c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.5-1.5 7.8-5.8 7.8-10.9C23.5 5.7 18.3.5 12 .5z" />
      </svg>
    );
  }
  if (kind === "vercel") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2 23 21H1L12 2z" />
      </svg>
    );
  }
  if (kind === "cloudflare") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.6 12.6c.1-.4.2-.8.2-1.2 0-2.6-2.1-4.7-4.7-4.7-2 0-3.7 1.3-4.4 3.1-.4-.2-.9-.3-1.4-.3C5.8 9.5 4.5 10.8 4.5 12.4c0 .2 0 .4.1.6C3.1 13.3 2 14.6 2 16c0 1.7 1.4 3 3.1 3h12.3c1.7 0 3.1-1.4 3.1-3.1 0-1.5-1.1-2.8-2.5-3.1l-.4-.2z" />
      </svg>
    );
  }
  if (kind === "lovable") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.6C20 16.1 12 21 12 21z" />
      </svg>
    );
  }
  if (kind === "base44") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M5 19V8l7-4 7 4v11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 19v-5h6v5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M5 19V5l14 14V5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HeroSlider() {
  const { go } = useStore();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(next, 4600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [next, paused, index]);

  const slide = SLIDES[index];

  return (
    <section
      aria-label="Featured platforms"
      className="relative overflow-hidden rounded-[28px] bg-[#0B0B0F] shadow-[0_18px_50px_rgba(11,11,15,0.28)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="relative h-[248px] sm:h-[286px]">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
            <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 82% 8%, ${slide.tint}55 0%, transparent 62%)` }} />
          </motion.div>
        </AnimatePresence>

        <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
              <BrandLogo kind={slide.logo} size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-white">{slide.brand}</p>
              <p className="text-[10.5px] uppercase tracking-[0.16em] text-white/60">connected platform</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + "-text"}
                  initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="whitespace-pre-line text-[26px] font-bold leading-[1.08] tracking-tight text-white sm:text-[32px]">{slide.headline}</h2>
                  <p className="mt-1.5 max-w-[260px] text-[12.5px] leading-snug text-white/70">{slide.sub}</p>
                </motion.div>
              </AnimatePresence>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => go(slide.view)}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#0B0B0F] shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
              >
                {slide.cta} <ArrowUpRight size={14} />
              </motion.button>
            </div>

            <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setIndex(i)}
                  aria-label={s.brand}
                  className={`grid h-7 w-7 place-items-center rounded-full ring-1 transition-all ${i === index ? "bg-white text-[#0B0B0F] ring-white" : "bg-white/10 text-white/70 ring-white/25 hover:bg-white/20"}`}
                >
                  <BrandLogo kind={s.logo} size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* progress */}
        <div className="absolute inset-x-0 bottom-0 flex gap-1 px-5 pb-2.5 sm:px-6">
          {SLIDES.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              {i === index && (
                <motion.span
                  key={`${slide.id}-bar`}
                  className="block h-full rounded-full bg-white"
                  initial={{ width: "0%" }}
                  animate={{ width: paused ? "35%" : "100%" }}
                  transition={{ duration: paused ? 0.3 : 4.6, ease: "linear" }}
                />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* swipe layer */}
      <motion.div
        className="absolute inset-0 z-10"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.14}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) next();
          else if (info.offset.x > 60) prev();
        }}
      />
    </section>
  );
}
