"use client";

import { motion } from "framer-motion";
import { Download, FileText, Globe, Loader2, ScanSearch, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/components/store";
import { ViewHeader } from "@/components/ui/SectionHeader";

interface Finding {
  title: string;
  detail: string;
  severity: "high" | "medium" | "low" | "good";
  citations: number[];
}
interface Citation {
  n: number;
  label: string;
  locator: string;
  quote: string;
}
interface Report {
  ok: boolean;
  error?: string;
  url?: string;
  host?: string;
  engine?: string;
  render?: string;
  ms?: number;
  scores?: { overall: number; parts: { label: string; score: number }[] };
  summary?: string;
  findings?: Finding[];
  citations?: Citation[];
  nextSteps?: string[];
}

const SEV: Record<Finding["severity"], { bg: string; fg: string; label: string }> = {
  high: { bg: "bg-[#FF3B30]/10", fg: "text-[#C4271E]", label: "জরুরি" },
  medium: { bg: "bg-[#FF9F0A]/12", fg: "text-[#8A5200]", label: "মাঝারি" },
  low: { bg: "bg-[#5E5CE6]/10", fg: "text-[#3F3D9E]", label: "কম" },
  good: { bg: "bg-[#34C759]/12", fg: "text-[#1E7A34]", label: "ভালো" },
};

export default function AnalyzeView() {
  const { toast } = useStore();
  const [url, setUrl] = useState("https://iosliquid365.vercel.app/");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [r, setR] = useState<Report | null>(null);

  async function run() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const d = (await res.json()) as Report;
      if (!d.ok) {
        const msg = /fetch failed|ENOTFOUND|timeout|getaddrinfo|abort/i.test(String(d.error ?? ""))
          ? "পেজটি খোলা যায়নি — URL বানান বা DNS ঠিক আছে কিনা দেখুন।"
          : String(d.error ?? "বিশ্লেষণ ব্যর্থ");
        setR({ ...d, error: msg });
        toast(msg.slice(0, 80));
      } else {
        setR(d);
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!r?.ok) return;
    setPdfBusy(true);
    try {
      const blocks = [
        { heading: "সারসংক্ষেপ", body: r.summary ?? "" },
        {
          heading: "স্কোর",
          bullets: (r.scores?.parts ?? []).map((p) => `${p.label}: ${p.score}/১০০`) .concat(`সার্বিক: ${r.scores?.overall ?? 0}/১০০`),
        },
        ...(r.findings ?? []).map((f) => ({
          heading: `${f.title} (${SEV[f.severity].label})`,
          body: `${f.detail}${f.citations.length ? ` [উৎস: ${f.citations.join(", ")}]` : ""}`,
        })),
        {
          heading: "সাইটেশন",
          bullets: (r.citations ?? []).map((c) => `[${c.n}] ${c.label} — ${c.locator}: ${c.quote.slice(0, 140)}`),
        },
        { heading: "পরবর্তী ধাপ", bullets: r.nextSteps ?? [] },
      ];
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `ওয়েবসাইট রিপোর্ট — ${r.host ?? r.url}`,
          subtitle: `N Space · ${new Date().toLocaleString("bn-BD")}`,
          meta: [
            { label: "সাইট", value: String(r.host ?? r.url) },
            { label: "স্কোর", value: `${r.scores?.overall ?? 0}/১০০` },
            { label: "ইঞ্জিন", value: String(r.engine ?? "") },
          ],
          blocks,
          footer: "এই রিপোর্টটি N Space ওয়েবসাইট বিশ্লেষণ ইঞ্জিন তৈরি করেছে। প্রতিটি দাবির সাইটেশন উপরে দেওয়া আছে।",
          filename: `report-${(r.host ?? "site").replace(/[^a-z0-9.-]/gi, "")}`,
        }),
      });
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) {
        const j = await res.json().catch(() => ({ error: "PDF failed" }));
        toast(j.error ?? "PDF failed");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `report-${(r.host ?? "site").replace(/[^a-z0-9.-]/gi, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(`PDF saved — ${res.headers.get("x-pdf-pages") ?? 1} page`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 md:px-8">
      <ViewHeader eyebrow="Bengali report · citations" title="Site analysis" />

      <div className="rounded-[22px] border border-black/5 bg-white p-3.5 shadow-[0_8px_26px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <Globe size={16} className="shrink-0 text-[#8E8E93]" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="https://yoursite.com"
            className="min-w-0 flex-1 rounded-[13px] bg-[#F2F2F7] px-3 py-2.5 text-[13.5px] outline-none"
          />
          <button onClick={run} disabled={busy} className="flex shrink-0 items-center gap-1.5 rounded-[13px] bg-[#0A84FF] px-3 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />} Run
          </button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-[#AEAEB2]">রিয়েল পেজ রেন্ডার করে বাংলা রিপোর্ট, প্রতিটি দাবির সাথে সাইটেশন।</p>
      </div>

      {r && !r.ok && (
        <div className="mt-3 flex items-start gap-2 rounded-[18px] border border-[#FF3B30]/25 bg-[#FF3B30]/6 p-3">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[#C4271E]" />
          <p className="text-[11.5px] leading-snug text-[#8A1A14]">{r.error}</p>
        </div>
      )}

      {r?.ok && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }} className="mt-3 space-y-3">
          <div className="rounded-[22px] border border-black/5 bg-white p-4 shadow-[0_8px_26px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4">
              <div className="relative grid h-20 w-20 shrink-0 place-items-center">
                <svg viewBox="0 0 36 36" className="absolute h-20 w-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F2F2F7" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke={r.scores && r.scores.overall >= 75 ? "#34C759" : r.scores && r.scores.overall >= 50 ? "#FF9F0A" : "#FF3B30"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${((r.scores?.overall ?? 0) / 100) * 97.4} 97.4`}
                  />
                </svg>
                <span className="text-[20px] font-bold text-[#1C1C1E]">{r.scores?.overall}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold text-[#1C1C1E]">{r.host}</p>
                <p className="text-[11px] text-[#8E8E93]">
                  {r.engine} · {r.render} · {r.ms}ms
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(r.scores?.parts ?? []).map((p) => (
                    <span key={p.label} className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-semibold text-[#3C3C43]">
                      {p.label} {p.score}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 rounded-[14px] bg-[#F2F2F7] p-3 text-[12.5px] leading-relaxed text-[#1C1C1E]">{r.summary}</p>
            <button onClick={downloadPdf} disabled={pdfBusy} className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[15px] bg-[#1C1C1E] py-3 text-[13px] font-semibold text-white disabled:opacity-60">
              {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} বাংলা PDF ডাউনলোড
            </button>
          </div>

          <div className="space-y-2">
            {(r.findings ?? []).map((f, i) => {
              const s = SEV[f.severity];
              return (
                <motion.div
                  key={`${f.title}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, delay: Math.min(i * 0.03, 0.2) }}
                  className="rounded-[18px] border border-black/5 bg-white p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.bg} ${s.fg}`}>{s.label}</span>
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#1C1C1E]">{f.title}</p>
                    <span className="shrink-0 text-[10px] font-semibold text-[#8E8E93]">{f.citations.map((c) => `[${c}]`).join(" ")}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-[#6C6C70]">{f.detail}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="rounded-[20px] border border-black/5 bg-white p-3.5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Sources</p>
            <ol className="space-y-1.5">
              {(r.citations ?? []).map((c) => (
                <li key={c.n} className="text-[11.5px] leading-snug text-[#3C3C43]">
                  <span className="font-mono font-semibold text-[#0A84FF]">[{c.n}]</span> <span className="font-semibold">{c.label}</span>
                  <span className="text-[#8E8E93]"> — {c.locator}</span>
                  <span className="block truncate text-[#AEAEB2]">“{c.quote}”</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-[20px] border border-black/5 bg-white p-3.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
              <Download size={11} /> পরবর্তী ধাপ
            </p>
            <ul className="space-y-1">
              {(r.nextSteps ?? []).map((s) => (
                <li key={s} className="flex gap-1.5 text-[12px] leading-snug text-[#3C3C43]">
                  <span className="text-[#0A84FF]">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}
