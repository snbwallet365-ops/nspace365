"use client";

import { motion } from "framer-motion";
import { Download, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/components/store";
import { ViewHeader } from "@/components/ui/SectionHeader";

interface Section {
  id: string;
  heading: string;
  body: string;
}

const PRESET: Section[] = [
  { id: "s1", heading: "সারসংক্ষেপ", body: "VisaMOTion দিনে গড়ে ১৪টি ভিসা ফাইল প্রসেস করে। এই মাসে ৩৮টি ফাইল সম্পন্ন হয়েছে এবং ৬টি অপেক্ষমাণ।" },
  { id: "s2", heading: "মূল পর্যবেক্ষণ", body: "ডকুমেন্ট ভেরিফিকেশনে সবচেয়ে বেশি সময় যাচ্ছে পাসপোর্ট স্ক্যানের গুণমান যাচাইয়ে।" },
  { id: "s3", heading: "পরবর্তী ধাপ", body: "প্রতিটি নতুন কেসে অটো চেকলিস্ট পাঠানো হবে এবং ৭২ ঘণ্টা পর রিমাইন্ডার যাবে।" },
];

export default function PdfView() {
  const { toast } = useStore();
  const [title, setTitle] = useState("ভিসা কেস রিপোর্ট");
  const [subtitle, setSubtitle] = useState("VisaMOTion · দৈনিক সারসংক্ষেপ");
  const [footer, setFooter] = useState("N Space PDF Studio দিয়ে তৈরি।");
  const [sections, setSections] = useState<Section[]>(PRESET);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ pages: string; font: string; kb: number } | null>(null);

  function update(id: string, patch: Partial<Section>) {
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          footer,
          meta: [
            { label: "তারিখ", value: new Date().toLocaleDateString("bn-BD") },
            { label: "মোট সেকশন", value: String(sections.length) },
          ],
          blocks: sections.map((s) => ({
            heading: s.heading,
            body: s.body,
            bullets: s.body.includes("\n") ? s.body.split("\n").filter(Boolean) : undefined,
          })),
          filename: "nspace-report",
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
      a.download = `nspace-report-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      const meta = {
        pages: res.headers.get("x-pdf-pages") ?? "1",
        font: res.headers.get("x-pdf-font") ?? "Helvetica",
        kb: Math.round(blob.size / 1024),
      };
      setLast(meta);
      toast(`PDF তৈরি — ${meta.pages} পেজ, ${meta.kb}KB`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 md:px-8">
      <ViewHeader eyebrow="A4 · embedded Bengali font" title="PDF Studio" />

      <div className="rounded-[22px] border border-black/5 bg-white p-3.5 shadow-[0_8px_26px_rgba(0,0,0,0.05)]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ডকুমেন্টের শিরোনাম" className="w-full rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[14px] font-semibold outline-none" />
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="সাবটাইটেল" className="mt-2 w-full rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[12.5px] outline-none" />
      </div>

      <div className="mt-3 space-y-2">
        {sections.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: Math.min(i * 0.03, 0.15) }} className="rounded-[18px] border border-black/5 bg-white p-3">
            <div className="flex items-center gap-2">
              <input value={s.heading} onChange={(e) => update(s.id, { heading: e.target.value })} placeholder="সেকশন শিরোনাম" className="min-w-0 flex-1 rounded-[10px] bg-[#F2F2F7] px-2.5 py-2 text-[12.5px] font-semibold outline-none" />
              <button onClick={() => setSections((x) => x.filter((y) => y.id !== s.id))} aria-label="Remove section" className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#FF3B30]/10 text-[#FF3B30]">
                <Trash2 size={13} />
              </button>
            </div>
            <textarea value={s.body} onChange={(e) => update(s.id, { body: e.target.value })} rows={3} placeholder="লেখা (নতুন লাইন মানে নতুন বুলেট)" className="mt-2 w-full resize-none rounded-[10px] bg-[#F2F2F7] px-2.5 py-2 text-[12px] leading-snug outline-none" />
          </motion.div>
        ))}
      </div>

      <button onClick={() => setSections((s) => [...s, { id: `s${Date.now()}`, heading: "নতুন সেকশন", body: "" }])} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-black/15 py-2.5 text-[12.5px] font-semibold text-[#0A84FF]">
        <Plus size={14} /> সেকশন যোগ করুন
      </button>

      <input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="ফুটার" className="mt-2 w-full rounded-[12px] bg-white px-3 py-2.5 text-[11.5px] outline-none ring-1 ring-black/5" />

      <button onClick={generate} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#0A84FF] py-3.5 text-[13.5px] font-semibold text-white shadow-[0_8px_22px_rgba(10,132,255,0.3)] disabled:opacity-60">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Generate real PDF
      </button>

      {last && (
        <div className="mt-2.5 flex items-center gap-2 rounded-[16px] border border-[#34C759]/25 bg-[#34C759]/8 p-3">
          <Download size={14} className="shrink-0 text-[#1E7A34]" />
          <p className="text-[11.5px] font-semibold text-[#1E7A34]">
            সত্যিকারের PDF ফাইল সেভ হয়েছে — {last.pages} পেজ, {last.kb}KB, ফন্ট {last.font}
          </p>
        </div>
      )}

      <p className="mt-3 px-1 text-[11px] leading-snug text-[#AEAEB2]">
        সার্ভারে A4 PDF তৈরি হয়, এমবেড করা Noto Sans Bengali ফন্ট দিয়ে, পেজ নম্বর ও টেক্সট র‍্যাপিং সহ। ব্রাউজারে ফাইলটি সরাসরি নামে।
      </p>
    </div>
  );
}
