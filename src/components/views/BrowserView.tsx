"use client";

import { motion } from "framer-motion";
import { Bot, Loader2, Play, RefreshCw, Smartphone, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { ViewHeader } from "@/components/ui/SectionHeader";

type Device = "iphone" | "pixel" | "desktop";

interface Result {
  ok: boolean;
  error?: string;
  url?: string;
  device?: string;
  title?: string;
  ms?: number;
  screenshot?: string;
  text?: string;
  summary?: string | null;
}

const DEVICES: { id: Device; label: string }[] = [
  { id: "iphone", label: "iPhone 15" },
  { id: "pixel", label: "Pixel 7" },
  { id: "desktop", label: "Desktop" },
];

export default function BrowserView() {
  const { toast } = useStore();
  const [url, setUrl] = useState("https://iosliquid365.vercel.app/");
  const [device, setDevice] = useState<Device>("iphone");
  const [busy, setBusy] = useState(false);
  const [summing, setSumming] = useState(false);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch("/api/browser")
      .then((r) => r.json())
      .then((d: { installed?: boolean }) => setInstalled(Boolean(d.installed)))
      .catch(() => setInstalled(false));
  }, []);

  async function run(summarize = false) {
    if (!url.trim()) return;
    if (summarize) setSumming(true);
    else setBusy(true);
    try {
      const r = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, device, summarize }),
      });
      const d = (await r.json()) as Result;
      if (!d.ok) {
        toast(d.error?.slice(0, 90) ?? "Browser failed");
        setResult(d);
      } else {
        setResult(summarize ? { ...(result ?? d), ...d } : d);
        if (summarize) toast("Gemini reviewed the page");
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      setSumming(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 md:px-8">
      <ViewHeader eyebrow="Playwright + Gemini" title="Live browser" />

      <div className="rounded-[22px] border border-black/5 bg-white p-3.5 shadow-[0_8px_26px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="min-w-0 flex-1 rounded-[13px] bg-[#F2F2F7] px-3 py-2.5 text-[13.5px] outline-none"
          />
          <button onClick={() => run(false)} disabled={busy} className="flex shrink-0 items-center gap-1.5 rounded-[13px] bg-[#0A84FF] px-3 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Preview
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${device === d.id ? "bg-[#1C1C1E] text-white" : "bg-black/[0.06] text-[#3C3C43]"}`}
            >
              <Smartphone size={11} /> {d.label}
            </button>
          ))}
          <span className={`ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold ${installed ? "bg-[#34C759]/12 text-[#248A3D]" : "bg-[#FF9F0A]/12 text-[#B26A00]"}`}>
            {installed ? "Playwright ready" : "Playwright not installed"}
          </span>
        </div>
      </div>

      {result && !result.ok && (
        <div className="mt-3 flex items-start gap-2 rounded-[18px] border border-[#FF9F0A]/25 bg-[#FF9F0A]/8 p-3">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[#B26A00]" />
          <p className="text-[11.5px] leading-snug text-[#7A4A00]">{result.error}</p>
        </div>
      )}

      {result?.ok && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }} className="mt-3">
          <div className="overflow-hidden rounded-[26px] border border-black/10 bg-[#0B0B0F] p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
            <div className="mb-2 flex items-center gap-1.5 px-1">
              <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
              <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
              <span className="h-2 w-2 rounded-full bg-[#28C840]" />
              <span className="ml-2 truncate text-[10.5px] text-white/50">{result.url}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.screenshot} alt={`Preview of ${result.title ?? url}`} className="w-full rounded-[16px] bg-white" />
          </div>

          <div className="mt-2 flex items-center gap-2 px-1 text-[11.5px] text-[#8E8E93]">
            <span className="truncate font-semibold text-[#1C1C1E]">{result.title || "Untitled"}</span>
            <span>·</span>
            <span>{result.device}</span>
            <span>·</span>
            <span>{result.ms}ms</span>
            <button onClick={() => run(false)} className="ml-auto flex items-center gap-1 font-semibold text-[#0A84FF]">
              <RefreshCw size={11} /> Re-run
            </button>
          </div>

          <button
            onClick={() => run(true)}
            disabled={summing}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[16px] bg-[#1C1C1E] py-3 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {summing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} Ask Gemini about this page
          </button>

          {result.summary && (
            <div className="mt-2.5 rounded-[18px] border border-black/5 bg-white p-3.5">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                <Bot size={11} /> Gemini review
              </p>
              <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-[#1C1C1E]">{result.summary}</pre>
            </div>
          )}

          {result.text && (
            <details className="mt-2.5 rounded-[18px] border border-black/5 bg-white p-3">
              <summary className="cursor-pointer text-[12px] font-semibold text-[#3C3C43]">Page text ({result.text.length} chars)</summary>
              <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-[#6C6C70]">{result.text.slice(0, 2000)}</pre>
            </details>
          )}
        </motion.div>
      )}

      <p className="mt-3 px-1 text-[11px] leading-snug text-[#AEAEB2]">
        Runs a real Chromium browser server-side with mobile emulation, then sends the page to Gemini for a review. Works on your own server / localhost; on a serverless host without a browser it tells you the install command.
      </p>
    </div>
  );
}
