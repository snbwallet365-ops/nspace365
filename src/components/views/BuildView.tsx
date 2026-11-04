"use client";

import { motion } from "framer-motion";
import { Check, ChevronLeft, CircleAlert, Loader2, Plug, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import ChatView from "@/components/chat/ChatView";
import { PROVIDER_KEY, readKeys, readProvider, writeKeys, writeProvider, type KeyBag } from "@/components/onboarding/Onboarding";
import { PROVIDERS, providerById, toRouteProvider } from "@/lib/providers";
import { useStore } from "@/components/store";

const KNOWLEDGE_KEY = "nspace.build.knowledge.v1";

export default function BuildView() {
  const { go } = useStore();
  const [provider, setProvider] = useState("builtin");
  const [bag, setBag] = useState<KeyBag>(() => readKeys());
  const [knowledge, setKnowledge] = useState("");
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [test, setTest] = useState<{ status: "idle" | "busy" | "ok" | "fail"; note?: string }>({ status: "idle" });

  useEffect(() => {
    setProvider(readProvider());
    setBag(readKeys());
    try {
      setKnowledge(localStorage.getItem(KNOWLEDGE_KEY) ?? "");
    } catch {}
  }, []);

  const def = providerById(provider);
  const keyValue = def.keyField ? ((bag as unknown as Record<string, string>)[def.keyField] ?? "") : "";
  const modelValue = def.modelField ? ((bag as unknown as Record<string, string>)[def.modelField] ?? "") : "";
  const baseUrlValue = def.baseUrlField ? ((bag as unknown as Record<string, string>)[def.baseUrlField] ?? "") : "";

  function patch(field: string, value: string) {
    const next = { ...bag, [field]: value } as KeyBag;
    setBag(next);
    writeKeys(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
    setTest({ status: "idle" });
  }

  function pickProvider(id: string) {
    setProvider(id);
    writeProvider(id);
    setTest({ status: "idle" });
  }

  function saveKnowledge(v: string) {
    setKnowledge(v);
    try {
      localStorage.setItem(KNOWLEDGE_KEY, v);
    } catch {}
  }

  async function runTest() {
    setTest({ status: "busy" });
    try {
      const r = await fetch("/api/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: toRouteProvider(def.id),
          apiKey: keyValue,
          model: modelValue || def.models[0],
          baseUrl: baseUrlValue,
          endpoint: baseUrlValue,
        }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string; preview?: string; ms?: number; detail?: string };
      setTest({ status: d.ok ? "ok" : "fail", note: d.ok ? `${d.preview?.slice(0, 30) || d.detail || "ready"} · ${d.ms ?? 0}ms` : d.error || "failed" });
    } catch (e) {
      setTest({ status: "fail", note: (e as Error).message });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-black/[0.06] bg-white/85 px-3 pb-2.5 pt-2 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-2">
          <button onClick={() => go("today")} aria-label="Back to Discover" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F2F2F7] text-[#1C1C1E]">
            <ChevronLeft size={18} />
          </button>
          <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-[16px] bg-black/[0.055] p-1">
            {PROVIDERS.map((p) => {
              const on = provider === p.id;
              const filled = p.keyField ? ((bag as unknown as Record<string, string>)[p.keyField] ?? "").trim().length > 3 : false;
              return (
                <button
                  key={p.id}
                  onClick={() => pickProvider(p.id)}
                  className={
                    "relative flex shrink-0 items-center gap-1.5 rounded-[12px] px-2.5 py-1.5 text-[12px] font-semibold transition-colors " +
                    (on ? "bg-white text-[#0A84FF] shadow-sm" : "text-[#6C6C70]")
                  }
                >
                  {filled && !on && <span className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />}
                  {p.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-[12px] bg-black/[0.055] px-2.5 py-2 text-[12px] font-semibold text-[#1C1C1E]"
          >
            {saved ? <Check size={14} className="text-[#34C759]" /> : "Setup"}
          </button>
        </div>

        <p className="mt-1 px-1 text-[11px] text-[#8E8E93]">
          {def.label} · {def.hint}
          {def.kind !== "builtin" && !keyValue && def.kind !== "custom" ? " · add a key below" : ""}
        </p>

        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 overflow-hidden rounded-[18px] border border-white/80 bg-white/70 p-3 shadow-[0_12px_28px_rgba(17,24,39,0.08)]"
          >
            {def.kind === "builtin" ? (
              <p className="text-[12px] leading-snug text-[#8E8E93]">Built-in engine runs from your own notes with no key. Pick any provider above to use a cloud model.</p>
            ) : (
              <>
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">
                  <Sparkles size={11} /> {def.label} key
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={keyValue}
                    onChange={(e) => patch(def.keyField, e.target.value)}
                    placeholder={def.placeholder}
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[13px] text-[#1C1C1E] outline-none"
                  />
                  <button onClick={runTest} disabled={test.status === "busy"} className="flex shrink-0 items-center gap-1 rounded-[12px] bg-[#0A84FF] px-3 py-2.5 text-[12px] font-semibold text-white disabled:opacity-40">
                    {test.status === "busy" ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />} Test
                  </button>
                </div>
                {def.baseUrlField && (
                  <input
                    value={baseUrlValue}
                    onChange={(e) => patch(def.baseUrlField!, e.target.value)}
                    placeholder={def.baseUrlPlaceholder}
                    spellCheck={false}
                    className="mt-2 w-full rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[12.5px] text-[#1C1C1E] outline-none"
                  />
                )}
                <input
                  list={`bv-${def.id}`}
                  value={modelValue}
                  onChange={(e) => def.modelField && patch(def.modelField, e.target.value)}
                  placeholder={`model · ${def.models[0]}`}
                  spellCheck={false}
                  className="mt-2 w-full rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[12.5px] text-[#1C1C1E] outline-none"
                />
                <datalist id={`bv-${def.id}`}>
                  {def.models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                {test.status === "ok" && <p className="mt-2 flex items-center gap-1 text-[11.5px] text-[#1E8E3E]"><Check size={12} /> Key works · {test.note}</p>}
                {test.status === "fail" && <p className="mt-2 flex items-center gap-1 text-[11.5px] text-[#C1121F]"><CircleAlert size={12} /> {test.note}</p>}
              </>
            )}
            <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">Self-hosted knowledge</p>
            <textarea
              value={knowledge}
              onChange={(e) => saveKnowledge(e.target.value)}
              rows={3}
              placeholder="Company rules, visa steps, prices, tone rules… the built-in engine answers from this instantly, without any key."
              className="w-full resize-none rounded-[12px] bg-[#F2F2F7] px-3 py-2.5 text-[13px] leading-snug text-[#1C1C1E] outline-none"
            />
            <p className="mt-2 text-[11px] leading-snug text-[#8E8E93]">Keys stay on this device. Cloud replies use your key only when you pick that engine.</p>
          </motion.div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <ChatView />
      </div>
    </div>
  );
}
