"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { LiquidMark } from "@/components/ui/LiquidMark";
import { readConnections, writeConnections } from "@/lib/workspace";

/* ---------------- session ---------------- */

export type Role = "admin" | "staff";

export type SessionUser = {
  name: string;
  email: string;
  picture?: string;
  provider: "google" | "guest";
};

const SESSION_KEY = "nspace.session.v1";
const ADMIN_KEY = "nspace.admin.v1";
const GOOGLE_KEY = "nspace.google.client.v1";
const TONE_KEY = "nspace.tone.v1";
export const VISIBILITY_KEY = "nspace.visibility.v1";
export const SETTINGS_KEY = "nspace.keys.v1";
export const PROVIDER_KEY = "nspace.provider.v1";

export const ADMIN_PIN = "VisaHOBe1323@";
export const STAFF_PIN = "132313";

export function readUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as Partial<SessionUser>;
    if (!u || typeof u.email !== "string") return null;
    return {
      name: typeof u.name === "string" && u.name ? u.name : u.email.split("@")[0],
      email: u.email,
      picture: typeof u.picture === "string" ? u.picture : undefined,
      provider: u.provider === "google" ? "google" : "guest",
    };
  } catch {
    return null;
  }
}

export function writeUser(u: SessionUser) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    window.dispatchEvent(new Event("nspace:session"));
  } catch {}
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ADMIN_KEY);
    window.dispatchEvent(new Event("nspace:session"));
  } catch {}
}

export function readAdmin(): boolean {
  try {
    return localStorage.getItem(ADMIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdmin(on: boolean) {
  try {
    if (on) localStorage.setItem(ADMIN_KEY, "1");
    else localStorage.removeItem(ADMIN_KEY);
    window.dispatchEvent(new Event("nspace:session"));
  } catch {}
}

export function unlockAdmin(pin: string): boolean {
  if (pin.trim() !== ADMIN_PIN) return false;
  setAdmin(true);
  return true;
}

export function readRole(): Role | null {
  if (readAdmin()) return "admin";
  return readUser() ? "staff" : null;
}

export function readGoogleClientId(): string {
  try {
    return localStorage.getItem(GOOGLE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeGoogleClientId(id: string) {
  try {
    localStorage.setItem(GOOGLE_KEY, id.trim());
  } catch {}
}

export function readTone(): "concise" | "balanced" | "detailed" {
  try {
    const v = localStorage.getItem(TONE_KEY);
    if (v === "concise" || v === "detailed") return v;
  } catch {}
  return "balanced";
}

export function writeTone(t: "concise" | "balanced" | "detailed") {
  try {
    localStorage.setItem(TONE_KEY, t);
  } catch {}
}

export interface KeyBag {
  /* model keys */
  gemini: string;
  openai: string;
  anthropic: string;
  deepseek: string;
  mistral: string;
  groq: string;
  openrouter: string;
  base44: string;
  customKey: string;
  /* per-provider model overrides */
  geminiModel: string;
  openaiModel: string;
  anthropicModel: string;
  deepseekModel: string;
  mistralModel: string;
  groqModel: string;
  openrouterModel: string;
  base44Model: string;
  customModel: string;
  /* endpoints */
  base44Endpoint: string;
  customBaseUrl: string;
  /* repo + hosting */
  github1: string;
  github2: string;
  localServer: string;
}

export const EMPTY_KEYS: KeyBag = {
  gemini: "", openai: "", anthropic: "", deepseek: "", mistral: "", groq: "", openrouter: "", base44: "", customKey: "",
  geminiModel: "", openaiModel: "", anthropicModel: "", deepseekModel: "", mistralModel: "", groqModel: "", openrouterModel: "", base44Model: "", customModel: "",
  base44Endpoint: "", customBaseUrl: "",
  github1: "", github2: "", localServer: "",
};

export function writeKeys(bag: KeyBag) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(bag));
    window.dispatchEvent(new Event("nspace:keys"));
  } catch {}
}

export function readKeys(): KeyBag {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...EMPTY_KEYS, ...(JSON.parse(raw) as Partial<KeyBag>) } as KeyBag;
  } catch {}
  return { ...EMPTY_KEYS };
}

export function readModel(bag: KeyBag, modelField?: string, fallback = ""): string {
  if (!modelField) return fallback;
  const v = (bag as unknown as Record<string, string>)[modelField];
  return v && v.trim() ? v.trim() : fallback;
}

export function writeProvider(id: string) {
  try {
    localStorage.setItem(PROVIDER_KEY, id);
    window.dispatchEvent(new Event("nspace:keys"));
  } catch {}
}

export function readProvider(): string {
  try {
    const v = localStorage.getItem(PROVIDER_KEY);
    if (v && v.trim()) return v.trim();
  } catch {}
  return "builtin";
}

/* ---------------- google identity ---------------- */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function decodeJwt(token: string): SessionUser | null {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(decodeURIComponent(escape(atob(part)))) as {
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!json.email) return null;
    return {
      name: json.name || json.email.split("@")[0],
      email: json.email,
      picture: json.picture,
      provider: "google",
    };
  } catch {
    return null;
  }
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById("gis-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gis failed")));
      return;
    }
    const s = document.createElement("script");
    s.id = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gis failed"));
    document.head.appendChild(s);
  });
}

/* ---------------- gate ---------------- */

export default function Onboarding({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<"boot" | "signin" | "flash" | "open">("boot");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [askClientId, setAskClientId] = useState(false);
  const [askPin, setAskPin] = useState(false);
  const [adminPin, setAdminPin] = useState("");

  useEffect(() => {
    setClientId(readGoogleClientId());
    if (readUser()) {
      setStage("open");
      return;
    }
    const t = setTimeout(() => setStage("signin"), 2100);
    return () => clearTimeout(t);
  }, []);

  function finish(user: SessionUser) {
    writeUser(user);
    if (user.provider === "google") {
      const c = readConnections(user.email);
      writeConnections(user.email, {
        ...c,
        google: { email: user.email, name: user.name, picture: user.picture, checkedAt: new Date().toISOString() },
      });
    }
    setStage("flash");
    setTimeout(() => setStage("open"), 1100);
  }

  async function google() {
    setNote(null);
    const id = clientId || readGoogleClientId();
    if (!id) {
      setAskClientId(true);
      return;
    }
    setBusy(true);
    try {
      await loadGis();
      const g = window.google?.accounts?.id;
      if (!g) throw new Error("unavailable");
      g.initialize({
        client_id: id,
        callback: (res) => {
          const user = decodeJwt(res.credential);
          if (!user) {
            setNote("Google returned no account. Try again.");
            setBusy(false);
            return;
          }
          finish(user);
        },
      });
      g.prompt();
      setNote("Choose your Google account in the popup.");
      setTimeout(() => setBusy(false), 1400);
    } catch {
      setBusy(false);
      setNote("Google sign-in couldn't start. Check the client ID, or continue as guest.");
    }
  }

  return (
    <>
      {stage === "open" ? children : null}
      <AnimatePresence>
        {stage !== "open" && (
          <motion.div
            key="gate"
            className="fixed inset-0 z-[100] overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(14px)" }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background:
                "radial-gradient(1200px 720px at 14% -12%, #cfd9ff 0%, transparent 58%), radial-gradient(920px 700px at 92% 6%, #ffd9ee 0%, transparent 55%), radial-gradient(950px 820px at 58% 112%, #ccfbe4 0%, transparent 56%), linear-gradient(168deg,#f9fbff,#e9eefb)",
            }}
          >
            <motion.span
              className="absolute -left-24 top-6 h-[440px] w-[440px] rounded-full bg-[#007AFF]/25 blur-[100px]"
              animate={{ y: [0, 28, 0], x: [0, 18, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-[#BF5AF2]/25 blur-[100px]"
              animate={{ y: [0, -24, 0], x: [0, -12, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="pointer-events-none absolute inset-0 opacity-70">
              {[...Array(14)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    top: `${(i * 53) % 100}%`,
                    width: 3 + (i % 4),
                    height: 3 + (i % 4),
                    boxShadow: "0 0 12px rgba(255,255,255,0.9)",
                  }}
                  animate={{ y: [0, -26, 0], opacity: [0.2, 0.9, 0.2] }}
                  transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.28, ease: "easeInOut" }}
                />
              ))}
            </div>

            <div className="relative flex h-full flex-col items-center justify-center px-6">
              {stage === "boot" && (
                <div className="flex flex-col items-center gap-8">
                  <div className="relative grid place-items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="absolute rounded-full border border-white/70"
                        initial={{ width: 100, height: 100, opacity: 0 }}
                        animate={{ width: 320, height: 320, opacity: [0, 0.6, 0] }}
                        transition={{ duration: 2.6, delay: 0.2 + i * 0.42, ease: "easeOut", repeat: Infinity }}
                      />
                    ))}
                    <motion.div
                      initial={{ scale: 0.55, opacity: 0, rotate: -14 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      className="relative"
                    >
                      <motion.span
                        className="absolute inset-0 rounded-[38%] bg-white/60 blur-xl"
                        animate={{ scale: [1, 1.25, 1], opacity: [0.55, 0.9, 0.55] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <LiquidMark size={128} />
                    </motion.div>
                  </div>

                  <div className="flex items-end gap-[3px]">
                    {"N SPACE".split("").map((ch, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ delay: 0.5 + i * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        className="text-[19px] font-semibold tracking-[0.34em] text-[#1C1C1E]/85"
                      >
                        {ch === " " ? "\u00A0" : ch}
                      </motion.span>
                    ))}
                  </div>

                  <motion.div
                    className="h-[3px] w-36 overflow-hidden rounded-full bg-black/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 }}
                  >
                    <motion.span
                      className="block h-full rounded-full bg-gradient-to-r from-[#0A84FF] via-[#5AC8FA] to-[#BF5AF2]"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.25, ease: "easeInOut" }}
                    />
                  </motion.div>
                </div>
              )}

              {stage === "signin" && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-[370px]"
                >
                  <div className="flex flex-col items-center gap-4">
                    <LiquidMark size={82} />
                    <div className="text-center">
                      <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1C1E]">N Space</h1>
                      <p className="mt-1 text-[13.5px] text-[#6C6C70]">Your GitHub projects, as a real app store.</p>
                    </div>
                  </div>

                  <div className="mt-7 rounded-[24px] border border-white/80 bg-white/60 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_20px_50px_rgba(17,24,39,0.13)] backdrop-blur-2xl">
                    <button
                      onClick={google}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2.5 rounded-[15px] bg-white py-3.5 text-[15px] font-semibold text-[#1C1C1E] shadow-[0_2px_10px_rgba(0,0,0,0.08)] active:scale-[0.99] disabled:opacity-60"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.4-4.1 6.6-10.1 6.6-17.5z" />
                        <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
                        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.5-5.8l-7.6-5.9c-2 1.4-4.7 2.4-7.9 2.4-6.4 0-11.7-3.7-13.6-8.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
                      </svg>
                      Continue with Google
                    </button>
                    <button
                      onClick={() => setAskPin(true)}
                      className="mt-2.5 w-full rounded-[15px] bg-[#1C1C1E] py-3.5 text-[15px] font-semibold text-white active:scale-[0.99]"
                    >
                      Admin sign-in
                    </button>
                    {askPin && (
                      <div className="mt-2.5 rounded-[14px] bg-white p-2">
                        <input
                          type="password"
                          value={adminPin}
                          onChange={(e) => setAdminPin(e.target.value)}
                          placeholder="Owner PIN"
                          className="w-full rounded-[10px] bg-[#F2F2F7] px-3 py-2.5 text-[14px] outline-none"
                        />
                        <button
                          onClick={() => {
                            if (unlockAdmin(adminPin)) {
                              finish({ name: "Owner", email: "visamotion365@gmail.com", provider: "guest" });
                            } else {
                              setNote("Wrong PIN");
                            }
                            setAdminPin("");
                          }}
                          className="mt-2 w-full rounded-[10px] bg-[#0A84FF] py-2.5 text-[13.5px] font-semibold text-white"
                        >
                          Unlock as admin
                        </button>
                      </div>
                    )}
                    <p className="mt-3 px-1 text-center text-[11.5px] leading-snug text-[#8E8E93]">
                      One account per device. Sign in with Google for a personal workspace, or use the owner PIN for admin.
                    </p>
                  </div>

                  {askClientId && (
                    <div className="mt-4 rounded-[20px] border border-white/80 bg-white/70 p-3 backdrop-blur-2xl">
                      <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-[#8E8E93]">
                        Google Client ID (one time)
                      </p>
                      <input
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="…apps.googleusercontent.com"
                        className="w-full rounded-[12px] bg-white px-3 py-2.5 text-[13px] text-[#1C1C1E] outline-none"
                      />
                      <button
                        onClick={() => {
                          writeGoogleClientId(clientId);
                          if (clientId.trim()) {
                            setAskClientId(false);
                            void google();
                          } else {
                            setNote("Paste a client ID first.");
                          }
                        }}
                        className="mt-2 w-full rounded-[12px] bg-[#0A84FF] py-2.5 text-[13.5px] font-semibold text-white"
                      >
                        Save & sign in
                      </button>
                    </div>
                  )}

                  {note && <p className="mt-3 text-center text-[12px] font-medium text-[#0A84FF]">{note}</p>}
                </motion.div>
              )}

              {stage === "flash" && (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative grid place-items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="absolute rounded-full border border-white/80"
                        initial={{ width: 60, height: 60, opacity: 0.9 }}
                        animate={{ width: 220, height: 220, opacity: 0 }}
                        transition={{ duration: 1.4, delay: i * 0.18, ease: "easeOut", repeat: Infinity }}
                      />
                    ))}
                    <LiquidMark size={84} />
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-[14px] font-medium tracking-tight text-[#1C1C1E]/70"
                  >
                    Loading your projects…
                  </motion.p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
