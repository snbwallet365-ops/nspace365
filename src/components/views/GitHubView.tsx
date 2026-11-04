"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Clock, Eye, EyeOff, ExternalLink, GitBranch, KeyRound, LogOut, MessageSquareText, RefreshCw, Star, FlaskConical, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/components/store";
import AppIcon from "@/components/ui/AppIcon";
import GetButton from "@/components/ui/GetButton";
import GithubMark from "@/components/ui/GithubMark";
import SectionHeader, { ViewHeader } from "@/components/ui/SectionHeader";
import { compact, timeAgo } from "@/lib/format";
import type { GithubState, StoreApp } from "@/lib/types";

const STAGES = ["Authenticating with GitHub", "Fetching repositories", "Generating app icons", "Capturing live previews", "Publishing to catalog"];
const LS_TOKEN = "nspace.gh.token";
const LS_TARGET = "nspace.gh.target";

type Phase = "idle" | "syncing" | "done" | "error";

export default function GitHubView() {
  const { apps, github, replaceData, setSyncing, toast, openSheet, askAboutRepo, openApp } = useStore();
  const [token, setToken] = useState("");
  const [target, setTarget] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [canDemo, setCanDemo] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem(LS_TOKEN) ?? "");
      setTarget(localStorage.getItem(LS_TARGET) ?? "");
    } catch {}
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const repos = apps.filter((a) => a.source === "github");

  const sync = async (demo = false) => {
    if (phase === "syncing") return;
    setError(null);
    setCanDemo(false);
    setPhase("syncing");
    setSyncing(true);
    setStage(0);
    timer.current = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 2)), 650);
    try {
      if (!demo) {
        try {
          if (remember) {
            localStorage.setItem(LS_TOKEN, token);
            localStorage.setItem(LS_TARGET, target);
          } else {
            localStorage.removeItem(LS_TOKEN);
            localStorage.removeItem(LS_TARGET);
          }
        } catch {}
      }
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, target, demo }),
      });
      const d = (await res.json()) as { error?: string; canDemo?: boolean; apps?: StoreApp[]; github?: GithubState };
      if (timer.current) clearInterval(timer.current);
      if (!res.ok || !d.apps || !d.github) {
        setError(d.error ?? "Sync failed");
        setCanDemo(!!d.canDemo);
        setPhase("error");
        return;
      }
      setStage(STAGES.length);
      replaceData(d.apps, d.github);
      setPhase("done");
      toast(`Synced ${d.github.repoCount} repositories`);
    } catch {
      if (timer.current) clearInterval(timer.current);
      setError("Network error — check your connection.");
      setCanDemo(true);
      setPhase("error");
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    const res = await fetch("/api/github/sync", { method: "DELETE" });
    const d = (await res.json()) as { apps: StoreApp[]; github: GithubState };
    replaceData(d.apps, d.github);
    setPhase("idle");
    toast("GitHub disconnected");
  };

  const statusDot =
    phase === "syncing" ? "bg-[#007AFF] pulse-dot" : phase === "error" ? "bg-[#FF3B30]" : github.connected ? "bg-[#34C759]" : "bg-[#C7C7CC]";
  const statusText =
    phase === "syncing"
      ? STAGES[Math.min(stage, STAGES.length - 1)]
      : phase === "error"
        ? "Sync failed"
        : github.connected
          ? `Live · synced ${timeAgo(github.lastSync)}`
          : "Not connected";

  return (
    <div>
      <ViewHeader eyebrow="Developer" title="GitHub Sync" />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: "easeOut" }}
        className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white">
            <GithubMark size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-bold tracking-tight">Connect GitHub</p>
            <p className="flex items-center gap-2 text-[13px] text-[#8E8E93]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
              <motion.span key={statusText} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="truncate">
                {statusText}
              </motion.span>
            </p>
          </div>
          {github.connected && (
            <button onClick={disconnect} className="flex items-center gap-1.5 rounded-full bg-[#F2F2F7] px-3 py-1.5 text-[13px] font-semibold text-[#FF3B30] transition-colors hover:bg-[#E9E9EF]">
              <LogOut size={14} /> Disconnect
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#8E8E93]">
              <KeyRound size={13} /> Personal Access Token
            </span>
            <span className="flex h-12 items-center rounded-2xl border border-black/[0.06] bg-[#F2F2F7] px-3.5 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(0,122,255,0.25)]">
              <input
                type={show ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none placeholder:text-[#C7C7CC]"
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide token" : "Show token"} className="text-[#8E8E93]">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#8E8E93]">
              <Link2 size={13} /> Username or repository
            </span>
            <span className="flex h-12 items-center rounded-2xl border border-black/[0.06] bg-[#F2F2F7] px-3.5 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(0,122,255,0.25)]">
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="octocat  ·  owner/repo"
                spellCheck={false}
                autoCapitalize="none"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#C7C7CC]"
              />
            </span>
          </label>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-[#8E8E93]">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#007AFF]" />
          Remember on this device. Your token is only sent to GitHub for the sync and never saved on the server.
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            onClick={() => sync(false)}
            disabled={phase === "syncing"}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#007AFF] px-6 text-[16px] font-semibold text-white shadow-[0_6px_18px_rgba(0,122,255,0.35)] disabled:opacity-70"
          >
            <RefreshCw size={18} className={phase === "syncing" ? "spin" : ""} />
            {phase === "syncing" ? "Syncing…" : "Sync Repositories"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            onClick={() => sync(true)}
            disabled={phase === "syncing"}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#F2F2F7] px-5 text-[15px] font-semibold text-[#007AFF] disabled:opacity-60"
          >
            <FlaskConical size={17} /> Try sample workspace
          </motion.button>
        </div>

        <AnimatePresence initial={false}>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} className="overflow-hidden">
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#FF3B30]/15 bg-[#FF3B30]/[0.06] p-3.5 text-[14px] text-[#C4271D]">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  {error}
                  {canDemo && (
                    <button onClick={() => sync(true)} className="ml-1 font-semibold underline">
                      Load sample workspace
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {phase === "syncing" || phase === "done" ? (
            <motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} className="overflow-hidden">
              <div className="mt-5 space-y-2.5 rounded-2xl bg-[#F2F2F7] p-4">
                {STAGES.map((s, i) => {
                  const done = i < stage || phase === "done";
                  const active = i === stage && phase === "syncing";
                  return (
                    <li key={s} className="flex items-center gap-3 text-[14px]">
                      <span className={`grid h-5 w-5 place-items-center rounded-full ${done ? "bg-[#34C759] text-white" : active ? "bg-[#007AFF]/15 text-[#007AFF]" : "bg-black/[0.06] text-transparent"}`}>
                        {done ? <Check size={12} strokeWidth={3.5} /> : active ? <RefreshCw size={11} className="spin" /> : <Check size={12} />}
                      </span>
                      <span className={done || active ? "font-medium text-[#1C1C1E]" : "text-[#8E8E93]"}>{s}</span>
                    </li>
                  );
                })}
              </div>
            </motion.ol>
          ) : null}
        </AnimatePresence>
      </motion.section>

      <SectionHeader title={repos.length ? `Synced Projects · ${repos.length}` : "Synced Projects"} />

      {repos.length === 0 ? (
        <div className="mt-4 grid place-items-center rounded-3xl border border-dashed border-black/10 bg-[#F2F2F7]/60 px-6 py-14 text-center">
          <GithubMark size={40} className="text-[#C7C7CC]" />
          <p className="mt-3 text-[19px] font-semibold">No projects yet</p>
          <p className="mt-1 max-w-sm text-[14px] text-[#8E8E93]">Sync a token, a username (e.g. <span className="font-mono">vercel</span>) or an <span className="font-mono">owner/repo</span> to turn repositories into App Store listings.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {repos.map((r, i) => (
            <RepoCard key={r.id} repo={r} index={i} onOpen={() => openSheet(r.id)} onAsk={() => askAboutRepo(r.id)} onLive={() => openApp(r)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RepoCard({ repo, index, onOpen, onAsk }: { repo: StoreApp; index: number; onOpen: () => void; onAsk: () => void; onLive: () => void }) {
  const m = repo.meta;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: "easeOut", delay: Math.min(index * 0.05, 0.25) }}
      className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
    >
      <button onClick={onOpen} className="relative block aspect-[16/9] w-full overflow-hidden bg-[#F2F2F7]" aria-label={`Open ${repo.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.previewUrl} alt={`${repo.name} preview`} className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-[1.03]" loading="lazy" />
      </button>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <AppIcon app={repo} size={56} />
          <div className="min-w-0 flex-1">
            <button onClick={onOpen} className="line-clamp-2 max-w-full break-words text-left text-[16px] font-semibold leading-[1.2] text-black sm:text-[17px]">{repo.name}</button>
            <p className="truncate text-[13px] text-[#8E8E93]">{m.fullName}</p>
          </div>
          <GetButton app={repo} />
        </div>
        <p className="mt-3 line-clamp-2 min-h-[38px] text-[14px] leading-snug text-[#3C3C43]/75">{repo.description}</p>
        {!!m.topics?.length && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {m.topics.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-[#007AFF]/10 px-2.5 py-0.5 text-[12px] font-medium text-[#007AFF]">{t}</span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#8E8E93]">
          <span className="flex items-center gap-1"><GitBranch size={13} /> {m.branch}</span>
          <span className="flex items-center gap-1"><Clock size={13} /> {timeAgo(m.pushedAt)}</span>
          <span className="flex items-center gap-1"><Star size={13} /> {compact(m.stars ?? 0)}</span>
          {m.language && <span>{m.language}</span>}
        </div>
        <div className="mt-4 flex gap-2">
          <a href={m.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#F2F2F7] text-[14px] font-semibold text-[#007AFF] transition-colors hover:bg-[#E9E9EF]">
            <ExternalLink size={15} /> Live Preview
          </a>
          <button onClick={onAsk} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#007AFF]/10 text-[14px] font-semibold text-[#007AFF] transition-colors hover:bg-[#007AFF]/15">
            <MessageSquareText size={15} /> Ask AI
          </button>
        </div>
      </div>
    </motion.article>
  );
}
