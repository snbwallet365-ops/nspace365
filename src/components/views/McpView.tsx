"use client";

import { motion } from "framer-motion";
import { Check, Copy, Server, Terminal, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { ViewHeader } from "@/components/ui/SectionHeader";

const TOOLS = [
  { name: "list_projects", note: "Every app in the workspace with status and URL" },
  { name: "get_project", note: "Full record for one project by id or name" },
  { name: "search_projects", note: "Free-text search across your projects" },
  { name: "workspace_status", note: "GitHub sync state, repo count, last sync" },
];

const CLIENTS = [
  { id: "chatgpt", name: "ChatGPT", how: "Settings → Connectors → Add MCP server → paste the URL" },
  { id: "gemini", name: "Gemini", how: "Gemini app → Extensions → Add custom tool → paste the URL" },
  { id: "claude", name: "Claude", how: "Settings → Connectors → Add custom connector → paste the URL" },
  { id: "cursor", name: "Cursor / CLI", how: 'Add it under "mcpServers" in your config JSON' },
];

export default function McpView() {
  const { toast } = useStore();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; tools?: number; note?: string } | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/mcp")
      .then((r) => r.json())
      .then((d: { serverInfo?: { name?: string }; tools?: unknown[]; note?: string }) =>
        setHealth({ ok: true, tools: d.tools?.length ?? 0, note: d.note }),
      )
      .catch(() => setHealth({ ok: false }));
  }, []);

  const url = `${origin}/api/mcp`;
  const config = JSON.stringify(
    { mcpServers: { "nspace-workspace": { type: "http", url } } },
    null,
    2,
  );

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast("Copied — paste it into your AI");
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast("Copy blocked — long-press to copy");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 md:px-8">
      <ViewHeader eyebrow="For any AI" title="MCP server" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} className="rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#0A84FF]/10 text-[#0A84FF]">
            <Server size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-[#1C1C1E]">N Space workspace server</p>
            <p className="text-[12px] text-[#8E8E93]">
              {health?.ok ? `Live · ${health.tools ?? 0} tools · Streamable HTTP` : "checking…"}
            </p>
          </div>
          <span className={`h-2 w-2 rounded-full ${health?.ok ? "bg-[#34C759]" : "bg-[#FF9F0A]"}`} />
        </div>

        <div className="mt-3 rounded-[16px] bg-[#F2F2F7] p-3">
          <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-[#8E8E93]">Server URL</p>
          <p className="break-all font-mono text-[12.5px] text-[#1C1C1E]">{url || "…"}</p>
          <button
            onClick={() => copy(url, "url")}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-[#0A84FF] py-2.5 text-[13px] font-semibold text-white"
          >
            {copied === "url" ? <Check size={14} /> : <Copy size={14} />} {copied === "url" ? "Copied" : "Copy server URL"}
          </button>
        </div>

        <div className="mt-2.5 rounded-[16px] bg-[#0B0B0F] p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white/50">
            <Terminal size={11} /> JSON config (Cursor, Claude Desktop)
          </p>
          <pre className="overflow-x-auto whitespace-pre text-[11.5px] leading-relaxed text-[#7CE38B]">{config}</pre>
          <button
            onClick={() => copy(config, "json")}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-white/10 py-2.5 text-[12.5px] font-semibold text-white"
          >
            {copied === "json" ? <Check size={14} /> : <Copy size={14} />} {copied === "json" ? "Copied" : "Copy JSON"}
          </button>
        </div>
      </motion.div>

      <p className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">Paste it into</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CLIENTS.map((c, i) => (
          <motion.button
            key={c.id}
            onClick={() => copy(url, c.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[18px] border border-black/5 bg-white p-3.5 text-left shadow-[0_6px_18px_rgba(0,0,0,0.04)] transition-colors hover:bg-black/[0.02]"
          >
            <p className="flex items-center justify-between text-[14px] font-semibold text-[#1C1C1E]">
              {c.name}
              {copied === c.id ? <Check size={14} className="text-[#34C759]" /> : <Copy size={13} className="text-[#C7C7CC]" />}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-[#8E8E93]">{c.how}</p>
          </motion.button>
        ))}
      </div>

      <p className="mb-2 mt-5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
        <Wrench size={11} /> Tools it exposes
      </p>
      <div className="overflow-hidden rounded-[18px] border border-black/5 bg-white">
        {TOOLS.map((t, i) => (
          <div key={t.name} className={`px-3.5 py-3 ${i ? "border-t border-black/[0.05]" : ""}`}>
            <p className="font-mono text-[12.5px] font-semibold text-[#0A84FF]">{t.name}</p>
            <p className="text-[11.5px] text-[#8E8E93]">{t.note}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 px-1 text-[11px] leading-snug text-[#AEAEB2]">
        Any assistant that supports remote MCP can read this workspace. Nothing is written and no keys are exposed — the server only reads project metadata.
      </p>
    </div>
  );
}
