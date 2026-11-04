"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert, Eye, EyeOff, KeyRound, Loader2, Lock, LogOut, Plug, Server, Unlock, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  PROVIDER_KEY,
  readAdmin,
  readKeys,
  readProvider,
  readTone,
  SETTINGS_KEY,
  setAdmin,
  unlockAdmin,
  writeTone,
  writeProvider,
  type KeyBag,
} from "@/components/onboarding/Onboarding";
import { CLOUD_PROVIDERS, providerById, toRouteProvider } from "@/lib/providers";
import { useStore } from "@/components/store";

type TestState = { status: "idle" | "busy" | "ok" | "fail"; note?: string };

export default function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, user, signOutNow, apps } = useStore();
  const [tone, setTone] = useState<"concise" | "balanced" | "detailed">("balanced");
  const [bag, setBag] = useState<KeyBag>(() => readKeys());
  const [active, setActive] = useState("openai");
  const [admin, setAdminState] = useState(false);
  const [pin, setPin] = useState("");
  const [pinNote, setPinNote] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });

  useEffect(() => {
    if (!open) return;
    setBag(readKeys());
    setActive(readProvider() === "builtin" ? "openai" : readProvider());
    setTone(readTone());
    setAdminState(readAdmin());
    setPin("");
    setPinNote(null);
    setSaved(false);
    setTest({ status: "idle" });
    setShowKey(false);
  }, [open]);

  const def = providerById(active);
  const keyValue = (bag as unknown as Record<string, string>)[def.keyField] ?? "";
  const modelValue = def.modelField ? ((bag as unknown as Record<string, string>)[def.modelField] ?? "") : "";
  const baseUrlValue = def.baseUrlField ? ((bag as unknown as Record<string, string>)[def.baseUrlField] ?? "") : "";

  const [serverReady, setServerReady] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/keys/status")
      .then((r) => r.json())
      .then((d: { ready?: string[] }) => setServerReady(d.ready ?? []))
      .catch(() => setServerReady([]));
  }, []);

  const configuredCount = useMemo(
    () => CLOUD_PROVIDERS.filter((p) => ((bag as unknown as Record<string, string>)[p.keyField] ?? "").trim()).length,
    [bag],
  );

  function patch(field: string, value: string) {
    setBag((prev) => ({ ...prev, [field]: value }) as KeyBag);
    setTest({ status: "idle" });
  }

  function save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(bag));
      if (active !== "builtin") writeProvider(active);
      else localStorage.setItem(PROVIDER_KEY, "builtin");
      window.dispatchEvent(new Event("nspace:keys"));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
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
      setTest({ status: d.ok ? "ok" : "fail", note: d.ok ? `${d.preview ? d.preview.slice(0, 40) : d.detail ?? "ready"} · ${d.ms ?? 0}ms` : d.error || "failed" });
    } catch (e) {
      setTest({ status: "fail", note: (e as Error).message });
    }
  }

  const mcpUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative m-2 w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_30px_80px_rgba(17,24,39,0.25)] backdrop-blur-2xl sm:m-3"
          >
            <div className="flex items-center gap-2 border-b border-black/[0.06] px-5 py-4">
              <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-white">
                <KeyRound size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold tracking-tight text-[#1C1C1E]">Keys & connections</p>
                <p className="text-[11.5px] text-[#8E8E93]">
                  {configuredCount} of {CLOUD_PROVIDERS.length} providers configured
                  {serverReady.length > 0 && <span className="text-[#248A3D]"> · server key: {serverReady.join(", ")}</span>}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.05] text-[#3C3C43]">
                <X size={15} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto px-4 py-4 sm:px-5">
              {/* provider picker */}
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                <button
                  onClick={() => setActive("builtin")}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                    active === "builtin" ? "bg-[#1C1C1E] text-white" : "bg-black/[0.055] text-[#3C3C43]"
                  }`}
                >
                  Built-in
                </button>
                {CLOUD_PROVIDERS.map((p) => {
                  const on = active === p.id;
                  const filled = ((bag as unknown as Record<string, string>)[p.keyField] ?? "").trim().length > 3;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActive(p.id)}
                      className={`relative shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                        on ? "bg-[#0A84FF] text-white" : "bg-black/[0.055] text-[#3C3C43]"
                      }`}
                    >
                      {p.label}
                      {filled && !on && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#34C759]" />}
                    </button>
                  );
                })}
              </div>

              {/* active provider editor */}
              <div className="mt-3 rounded-[18px] border border-black/[0.06] bg-white/80 p-3.5">
                <div className="flex items-baseline justify-between">
                  <p className="text-[13.5px] font-semibold text-[#1C1C1E]">{def.label}</p>
                  <p className="text-[10.5px] text-[#AEAEB2]">{def.hint}</p>
                </div>

                {def.kind === "builtin" ? (
                  <p className="mt-2 text-[12px] leading-snug text-[#8E8E93]">
                    Runs on this device from your own knowledge notes and repo data. No key, no network, always available.
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex items-center gap-2 rounded-[14px] border border-black/[0.07] bg-white px-3">
                      <input
                        type={showKey ? "text" : "password"}
                        value={keyValue}
                        onChange={(e) => patch(def.keyField, e.target.value)}
                        placeholder={def.placeholder}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full bg-transparent py-2.5 text-[13px] outline-none placeholder:text-[#C7C7CC]"
                      />
                      <button onClick={() => setShowKey((v) => !v)} aria-label="Toggle key visibility" className="text-[#8E8E93]">
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {def.baseUrlField && (
                      <input
                        value={baseUrlValue}
                        onChange={(e) => patch(def.baseUrlField!, e.target.value)}
                        placeholder={def.baseUrlPlaceholder}
                        spellCheck={false}
                        className="mt-2 w-full rounded-[14px] border border-black/[0.07] bg-white px-3 py-2.5 text-[12.5px] outline-none placeholder:text-[#C7C7CC]"
                      />
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        list={`${def.id}-models`}
                        value={modelValue}
                        onChange={(e) => def.modelField && patch(def.modelField, e.target.value)}
                        placeholder={def.models[0]}
                        spellCheck={false}
                        className="min-w-0 flex-1 rounded-[14px] border border-black/[0.07] bg-white px-3 py-2.5 text-[12.5px] outline-none placeholder:text-[#C7C7CC]"
                      />
                      <datalist id={`${def.id}-models`}>
                        {def.models.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                      <button
                        onClick={runTest}
                        disabled={test.status === "busy" || (!keyValue && def.kind !== "custom")}
                        className="flex shrink-0 items-center gap-1 rounded-[14px] bg-[#0A84FF] px-3 py-2.5 text-[12px] font-semibold text-white disabled:opacity-40"
                      >
                        {test.status === "busy" ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />} Test
                      </button>
                    </div>

                    {test.status !== "idle" && test.status !== "busy" && (
                      <p className={`mt-2 flex items-start gap-1 text-[11.5px] leading-snug ${test.status === "ok" ? "text-[#1E8E3E]" : "text-[#C1121F]"}`}>
                        {test.status === "ok" ? <Check size={12} className="mt-0.5 shrink-0" /> : <CircleAlert size={12} className="mt-0.5 shrink-0" />}
                        {test.status === "ok" ? `Key works · ${test.note}` : `Failed · ${test.note}`}
                      </p>
                    )}
                  </>
                )}
              </div>

              <p className="mt-3 px-1 text-[11px] leading-snug text-[#8E8E93]">
                Paste the key and tap <span className="font-semibold text-[#1C1C1E]">Save</span>. The build agent uses the selected provider; local and custom
                endpoints also work from the phone on the same Wi-Fi.
              </p>

              {/* repo + hosting */}
              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">Repositories & hosting</p>
              {[
                { field: "github1", label: "GitHub · snbwallet365-ops token", placeholder: "ghp_…" },
                { field: "github2", label: "GitHub · second account token", placeholder: "ghp_…" },
                { field: "localServer", label: "Local agent server", placeholder: "http://192.168.0.10:8787" },
              ].map((f) => (
                <div key={f.field} className="mb-2">
                  <label className="mb-1 block text-[12px] font-semibold text-[#1C1C1E]">{f.label}</label>
                  <input
                    type="password"
                    value={(bag as unknown as Record<string, string>)[f.field] ?? ""}
                    onChange={(e) => patch(f.field, e.target.value)}
                    placeholder={f.placeholder}
                    spellCheck={false}
                    className="w-full rounded-[14px] border border-black/[0.06] bg-white/90 px-3 py-2.5 text-[13px] outline-none placeholder:text-[#C7C7CC]"
                  />
                </div>
              ))}

              <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">Reply tone</p>
              <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-[16px] bg-black/[0.05] p-1">
                {(["concise", "balanced", "detailed"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTone(t);
                      writeTone(t);
                    }}
                    className={`rounded-[12px] py-2 text-[12px] font-semibold capitalize transition ${
                      tone === t ? "bg-white text-[#1C1C1E] shadow-[0_2px_8px_rgba(0,0,0,0.10)]" : "text-[#6C6C70]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mb-3 rounded-[16px] border border-black/[0.06] bg-white/80 p-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1C1E]">
                  <UserRound size={13} /> Account
                </p>
                <p className="mt-1 truncate text-[11.5px] text-[#3C3C43]">
                  {user ? `${user.name} · ${user.email}` : "Not signed in"}
                  {user?.provider === "google" ? " · Google" : ""}
                </p>

                {admin ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="flex items-center gap-1 rounded-full bg-[#34C759]/12 px-2.5 py-1 text-[11px] font-semibold text-[#1E8E3E]">
                      <Unlock size={11} /> Admin · {apps.length} projects
                    </span>
                    <button onClick={() => { setAdmin(false); setAdminState(false); }} className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-semibold text-[#1C1C1E]">
                      Lock
                    </button>
                    <button onClick={signOutNow} className="flex items-center gap-1 rounded-full bg-[#FF3B30]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FF3B30]">
                      <LogOut size={11} /> Sign out
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex flex-1 items-center gap-1.5 rounded-[12px] bg-[#F2F2F7] px-2.5">
                      <Lock size={12} className="text-[#8E8E93]" />
                      <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Admin PIN"
                        className="w-full bg-transparent py-2 text-[13px] outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (unlockAdmin(pin)) {
                          setAdminState(true);
                          setPinNote("Admin unlocked");
                        } else {
                          setPinNote("Wrong PIN");
                        }
                        setPin("");
                      }}
                      className="rounded-[12px] bg-[#0A84FF] px-3 py-2 text-[12px] font-semibold text-white"
                    >
                      Unlock
                    </button>
                  </div>
                )}
                {pinNote && <p className="mt-1.5 text-[11px] font-medium text-[#0A84FF]">{pinNote}</p>}
              </div>

              <div className="rounded-[16px] border border-black/[0.06] bg-[#F2F2F7]/70 p-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1C1E]">
                  <Server size={13} /> MCP server
                </p>
                <code className="mt-1 block break-all text-[11px] text-[#3C3C43]">{mcpUrl}</code>
                <p className="mt-1 text-[11px] leading-snug text-[#8E8E93]">
                  Point any MCP-capable agent at this URL to drive the workspace remotely.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-black/[0.06] px-4 py-3">
              <p className="flex-1 text-[11px] text-[#8E8E93]">Keys are stored in this browser only.</p>
              <button
                onClick={save}
                className="flex items-center gap-1.5 rounded-full bg-[#007AFF] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_18px_rgba(0,122,255,0.3)]"
              >
                {saved ? <Check size={14} /> : null} {saved ? "Saved" : "Save keys"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
