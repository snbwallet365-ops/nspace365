"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Cpu, FileText, GitBranch, Mic, PanelLeft, Paperclip, SquarePen, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/components/store";
import { readKeys, readModel, readProvider, readTone } from "@/components/onboarding/Onboarding";
import { providerById, toRouteProvider } from "@/lib/providers";
import type { ChatMessage, ChatSession } from "@/lib/types";
import ChatDrawer from "./ChatDrawer";
import MessageBubble from "./MessageBubble";
import AgentOrb from "./AgentOrb";
import LiquidMark from "@/components/ui/LiquidMark";


export default function ChatView() {
  const { apps, chatRepoRequest, clearChatRequest, toast } = useStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [ready, setReady] = useState(false);
  const [attach, setAttach] = useState<{ name: string; content: string }[]>([]);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const [provider, setProvider] = useState("builtin");

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const repo = apps.find((a) => a.id === active?.pinnedRepoId);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
      if (!r.ok) {
        setMessages([]);
        return;
      }
      const d = (await r.json()) as { messages?: ChatMessage[] };
      setMessages(d.messages ?? []);
    } catch {
      setMessages([]);
    }
  }, []);

  const createSession = useCallback(async (pinnedRepoId: string | null = null) => {
    const r = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinnedRepoId }) });
    const d = (await r.json()) as { session: ChatSession };
    setSessions((s) => [d.session, ...s]);
    setActiveId(d.session.id);
    setMessages([]);
    return d.session;
  }, []);

  useEffect(() => {
    setProvider(readProvider());
    const sync = () => setProvider(readProvider());
    window.addEventListener("nspace:keys", sync);
    return () => window.removeEventListener("nspace:keys", sync);
  }, []);

  const providerDef = providerById(provider);

  // initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/sessions", { cache: "no-store" });
        if (!r.ok) throw new Error("sessions unavailable");
        const d = (await r.json()) as { sessions: ChatSession[] };
        if (!alive) return;
        if (d.sessions.length) {
          setSessions(d.sessions);
          setActiveId(d.sessions[0].id);
          await loadMessages(d.sessions[0].id);
        } else {
          await createSession();
        }
      } catch {
        toast("Could not load chats");
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadMessages, createSession, toast]);

  // "Ask AI" from a repo
  useEffect(() => {
    if (!ready || !chatRepoRequest) return;
    const { repoId } = chatRepoRequest;
    clearChatRequest();
    const name = apps.find((a) => a.id === repoId)?.name ?? "repo";
    void createSession(repoId).then(() => toast(`Pinned ${name}`));
  }, [ready, chatRepoRequest, clearChatRequest, createSession, apps, toast]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || sending) return;
      let sid = activeId;
      if (!sid) sid = (await createSession()).id;
      setInput("");
      if (taRef.current) taRef.current.style.height = "auto";
      const temp: ChatMessage = { id: `tmp-${Date.now()}`, sessionId: sid, role: "user", content: msg, blocks: [], createdAt: new Date().toISOString() };
      setMessages((m) => [...m, temp]);
      setSending(true);
      const keys = readKeys();
      const def = providerById(readProvider());
      const apiKey = def.keyField ? ((keys as unknown as Record<string, string>)[def.keyField] ?? "").trim() : "";
      const model = readModel(keys, def.modelField, def.models[0] ?? "");
      const baseUrl = def.baseUrlField ? ((keys as unknown as Record<string, string>)[def.baseUrlField] ?? "").trim() : "";
      const endpoint = def.id === "base44" ? baseUrl : "";
      const routeProvider = toRouteProvider(def.id);
      const files = attach;
      const localServer = (keys.localServer || "").trim().replace(/\/$/, "");
      let knowledge = "";
      try {
        knowledge = localStorage.getItem("nspace.build.knowledge.v1") ?? "";
      } catch {}
      const repoPayload = repo ? { name: repo.name, branch: repo.meta.branch, language: repo.meta.language, liveUrl: repo.url } : null;

      if (localServer && routeProvider === "local") {
        try {
          const local = await fetch(`${localServer}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sid, message: msg, provider: "local", repo: repoPayload, knowledge, attachments: files }),
          });
          if (local.ok) {
            const ld = (await local.json()) as { assistantMessage?: { content?: string; blocks?: unknown[] } };
            const text = ld.assistantMessage?.content ?? "";
            if (text) {
              setMessages((m) => [
                ...m.filter((x) => x.id !== temp.id),
                { ...temp, role: "user", content: msg },
                { id: `local-${Date.now()}`, sessionId: sid, role: "assistant", content: text, blocks: (ld.assistantMessage?.blocks as never) ?? [], createdAt: new Date().toISOString() },
              ]);
              setSending(false);
              return;
            }
          }
        } catch {
          /* local instance offline — fall through to the hosted API */
        }
      }

      try {
        const [res] = await Promise.all([
          fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
            sessionId: sid,
            message: msg,
            provider: routeProvider,
            apiKey,
            model,
            baseUrl,
            endpoint,
            tone: readTone(),
            repo: repoPayload,
            knowledge,
            attachments: files,
          }) }),
          new Promise((r) => setTimeout(r, 700)),
        ]);
        const d = (await res.json()) as { userMessage: ChatMessage; assistantMessage: ChatMessage; session: ChatSession; error?: string };
        if (!res.ok) throw new Error(d.error ?? "Failed");
        setMessages((m) => [...m.filter((x) => x.id !== temp.id), d.userMessage, d.assistantMessage]);
        setAttach([]);
        if (d.session) setSessions((s) => s.map((x) => (x.id === d.session!.id ? d.session! : x)));
      } catch {
        setMessages((m) => m.filter((x) => x.id !== temp.id));
        toast("Message failed — try again");
        setInput(msg);
      } finally {
        setSending(false);
      }
    },
    [activeId, sending, createSession, toast, repo, attach],
  );

  const patch = async (id: string, body: Record<string, unknown>) => {
    setSessions((prev) => prev.map((x) => (x.id === id ? { ...x, ...(body as Partial<ChatSession>) } : x)));
    try {
      const r = await fetch(`/api/sessions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) return;
      const d = (await r.json()) as { session?: ChatSession };
      if (d.session) setSessions((s) => s.map((x) => (x.id === d.session!.id ? d.session! : x)));
    } catch {
      /* ignore transient network errors */
    }
  };

  const del = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    const rest = sessions.filter((s) => s.id !== id);
    setSessions(rest);
    if (id === activeId) {
      if (rest.length) {
        setActiveId(rest[0].id);
        await loadMessages(rest[0].id);
      } else {
        await createSession();
      }
    }
  };

  const selectSession = async (id: string) => {
    setActiveId(id);
    setDrawer(false);
    setMessages([]);
    await loadMessages(id);
  };

  return (
    <div className="relative flex h-full flex-col bg-[#FFFFFF]">
      {/* chat header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.05] px-3 py-2 md:px-6">
        <button onClick={() => setDrawer(true)} aria-label="Open chats" className="grid h-9 w-9 place-items-center rounded-full bg-[#F2F2F7] text-[#1C1C1E] transition-colors hover:bg-[#E9E9EF]">
          <PanelLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[16px] font-semibold">{active?.title ?? "AI Terminal"}</p>
          <p className="flex items-center justify-center gap-1 truncate text-[12px] text-[#8E8E93]">
            <GitBranch size={11} className="text-[#007AFF]" />
            <span className="font-mono text-[#007AFF]">{active?.branch ?? "main"}</span>
            <span>·</span>
            <span className="truncate">{repo ? repo.meta.fullName : "no repo pinned"}</span>
            <span className="text-[#C7C7CC]">·</span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#3C3C43]"><Cpu size={11} /> {providerDef.label}</span>
          </p>
        </div>
        <button onClick={() => createSession(active?.pinnedRepoId ?? null)} aria-label="New chat" className="grid h-9 w-9 place-items-center rounded-full bg-[#F2F2F7] text-[#007AFF] transition-colors hover:bg-[#E9E9EF]">
          <SquarePen size={17} />
        </button>
      </div>

      {/* messages */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-6">
        <div className="mx-auto max-w-3xl space-y-4 py-5">
          {ready && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center pt-10 text-center sm:pt-16"
            >
              <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2, ease: "easeOut" }} className="rounded-[30px] bg-white p-1.5 shadow-[0_18px_44px_rgba(10,80,200,0.20)] ring-1 ring-black/5">
                <LiquidMark size={72} />
              </motion.div>
              <p className="mt-5 text-[17px] font-semibold tracking-tight text-[#1C1C1E]">N Space Agent</p>
              <p className="mt-1 text-[13px] text-[#8E8E93]">{repo ? repo.name : "ready"}</p>
              <div className="mt-6 grid w-full max-w-[440px] gap-2 sm:grid-cols-2">
                {[
                  "Push this repo to Vercel",
                  "Review my Supabase RLS rules",
                  "Add a voice search screen",
                  "Fix the mobile layout",
                ].map((t) => (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => void send(t)}
                    className="rounded-[16px] border border-black/[0.06] bg-white/80 px-3.5 py-3 text-left text-[13px] font-medium text-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-colors hover:bg-white"
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={m.id} message={m} onPrompt={send} latest={i === messages.length - 1} />
          ))}

          <AnimatePresence>
            {sending && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="flex gap-2.5">
                <AgentOrb size={28} live />
                <div className="flex items-center gap-1 rounded-[22px] rounded-tl-lg border border-black/5 bg-[#F2F2F7] px-4 py-3.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot h-2 w-2 rounded-full bg-[#8E8E93]" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </div>

      {/* composer */}
      <div className="shrink-0 px-3 pb-[calc(var(--safe-bottom)+0.75rem)] pt-2 md:px-6">
        <div className="mx-auto max-w-3xl">
          {attach.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attach.map((f, i) => (
                <span key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full bg-[#007AFF]/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#007AFF]">
                  <FileText size={11} /> {f.name.slice(0, 24)}
                  <button type="button" onClick={() => setAttach((a) => a.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="rounded-[26px] border border-black/[0.06] bg-[#F2F2F7] p-1.5 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(0,122,255,0.2)]"
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".txt,.md,.json,.ts,.tsx,.js,.jsx,.css,.html,.csv,.yml,.yaml,.pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={async (e) => {
                const picked = Array.from(e.target.files ?? []).slice(0, 6);
                const read: { name: string; content: string }[] = [];
                for (const f of picked) {
                  const isText = /\.(txt|md|json|ts|tsx|js|jsx|css|html|csv|ya?ml)$/i.test(f.name) || f.type.startsWith("text/");
                  if (isText) {
                    const text = await f.text();
                    read.push({ name: f.name, content: text.slice(0, 20000) });
                  } else {
                    read.push({ name: f.name, content: `[${f.type || "file"} · ${Math.round(f.size / 1024)} KB — binary, describe what you need]` });
                  }
                }
                setAttach((a) => [...a, ...read].slice(0, 6));
                if (fileRef.current) fileRef.current.value = "";
                toast(read.length ? `${read.length} file added` : "No file added");
              }}
            />
            <div className="flex items-end gap-2 pl-1">
            <textarea
              ref={taRef}
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Message N Terminal…  try “git pull”"
              aria-label="Message"
              className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-snug text-[#1C1C1E] outline-none placeholder:text-[#8E8E93]"
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              disabled={!input.trim() || sending}
              aria-label="Send"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#007AFF] text-white transition-opacity disabled:bg-[#C7C7CC]"
            >
              <ArrowUp size={20} strokeWidth={2.8} />
            </motion.button>
            </div>
            <div className="flex items-center gap-1 px-1 pb-0.5 pt-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Attach files"
                className="grid h-8 w-8 place-items-center rounded-full text-[#6C6C70] transition-colors hover:bg-black/[0.06]"
              >
                <Paperclip size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (listening) {
                    recRef.current?.stop();
                    setListening(false);
                    return;
                  }
                  type SR = new () => {
                    lang: string;
                    continuous: boolean;
                    interimResults: boolean;
                    start: () => void;
                    stop: () => void;
                    onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
                    onend: (() => void) | null;
                    onerror: (() => void) | null;
                  };
                  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
                  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
                  if (!Ctor) {
                    toast("Voice input is not supported in this browser");
                    return;
                  }
                  const rec = new Ctor();
                  rec.lang = navigator.language || "en-US";
                  rec.continuous = false;
                  rec.interimResults = true;
                  const base = input;
                  rec.onresult = (ev) => {
                    let said = "";
                    for (let i = ev.resultIndex; i < ev.results.length; i++) said += ev.results[i][0].transcript;
                    setInput((base ? base + " " : "") + said);
                  };
                  rec.onend = () => setListening(false);
                  rec.onerror = () => setListening(false);
                  recRef.current = rec;
                  setListening(true);
                  rec.start();
                }}
                aria-label="Voice command"
                className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${listening ? "bg-[#FF3B30] text-white pulse-dot" : "text-[#6C6C70] hover:bg-black/[0.06]"}`}
              >
                <Mic size={16} />
              </button>
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10.5px] font-semibold text-[#6C6C70]">
                <Cpu size={10} /> {providerDef.label}
                {providerDef.kind !== "builtin" ? ` · ${providerDef.models[0]}` : " · self-hosted"}
              </span>
              <span className="ml-auto pr-1 text-[10.5px] text-[#AEAEB2]">{listening ? "listening…" : "voice · files · keys"}</span>
            </div>
          </form>
        </div>
      </div>

      <ChatDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        sessions={sessions}
        activeId={activeId}
        onSelect={selectSession}
        onNew={async () => {
          await createSession(active?.pinnedRepoId ?? null);
          setDrawer(false);
        }}
        onDelete={del}
        onTogglePin={(s) => patch(s.id, { pinned: !s.pinned })}
        onPinRepo={(rid) => {
          if (active) {
            void patch(active.id, { pinnedRepoId: rid });
          } else if (rid) {
            void createSession(rid);
          }
        }}
      />
    </div>
  );
}
