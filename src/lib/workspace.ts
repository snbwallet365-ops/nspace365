"use client";

/**
 * Per-user workspace storage.
 * Everything is namespaced by the signed-in account so two people sharing a
 * device never see each other's profile, skills, knowledge or connections.
 */

export interface Profile {
  name: string;
  email: string;
  avatar?: string;
  tagline?: string;
  color: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  emoji: string;
  instruction: string;
  enabled: boolean;
  runs: number;
  updatedAt: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  body: string;
  tags: string[];
  updatedAt: string;
}

export interface ConnectionState {
  github?: { token?: string; login?: string; avatar?: string; repos?: number; checkedAt?: string };
  vercel?: { token?: string; username?: string; checkedAt?: string };
  cloudflare?: { token?: string; status?: string; checkedAt?: string };
  google?: { email?: string; name?: string; picture?: string; checkedAt?: string };
  workspace?: { domain?: string; checkedAt?: string };
}

const NS = "nspace.ws.v1";

function scope(email?: string | null) {
  return `${NS}.${(email || "guest").toLowerCase()}`;
}

function read<T>(email: string | null | undefined, key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${scope(email)}.${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(email: string | null | undefined, key: string, value: T) {
  try {
    localStorage.setItem(`${scope(email)}.${key}`, JSON.stringify(value));
    window.dispatchEvent(new Event("nspace:workspace"));
  } catch {}
}

/* ---------------- profile ---------------- */

export function readProfile(email: string | null | undefined, fallbackName = "N Space user"): Profile {
  const fallback: Profile = {
    name: fallbackName,
    email: email || "guest@nspace",
    color: "#007AFF",
    role: "member",
    joinedAt: new Date().toISOString(),
  };
  const p = read<Partial<Profile>>(email, "profile", {});
  return { ...fallback, ...p, email: p.email || email || fallback.email };
}

export function writeProfile(email: string | null | undefined, profile: Profile) {
  write(email, "profile", profile);
}

/* ---------------- skills ---------------- */

const SEED_SKILLS: Skill[] = [
  {
    id: "visa-check",
    name: "Visa requirement check",
    emoji: "🛂",
    instruction:
      "Act as a visa case officer. List the exact documents, fees, processing time and embassy steps for the destination country, then flag what is missing.",
    enabled: true,
    runs: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "repo-review",
    name: "Repo code review",
    emoji: "🔍",
    instruction: "Review the repository like a senior engineer: risks first, then quick wins, each with the file path and a ready code snippet.",
    enabled: true,
    runs: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "deploy",
    name: "Deploy to Vercel",
    emoji: "🚀",
    instruction: "Prepare a production deploy: build check, env var list, domain notes and a rollback plan.",
    enabled: true,
    runs: 0,
    updatedAt: new Date().toISOString(),
  },
];

export function readSkills(email: string | null | undefined): Skill[] {
  return read<Skill[]>(email, "skills", SEED_SKILLS);
}

export function writeSkills(email: string | null | undefined, skills: Skill[]) {
  write(email, "skills", skills);
}

/* ---------------- knowledge ---------------- */

const SEED_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "k-business",
    title: "Business",
    body: "VisaMOTion / World Vision Consultancy — visa, work permit and overseas job paperwork. Answer in the owner's language, quote prices in BDT.",
    tags: ["business"],
    updatedAt: new Date().toISOString(),
  },
];

export function readKnowledge(email: string | null | undefined): KnowledgeEntry[] {
  const list = read<KnowledgeEntry[]>(email, "knowledge", SEED_KNOWLEDGE);
  return list.length ? list : SEED_KNOWLEDGE;
}

export function writeKnowledge(email: string | null | undefined, entries: KnowledgeEntry[]) {
  write(email, "knowledge", entries);
}

export function knowledgeText(entries: KnowledgeEntry[], limit = 4000): string {
  return entries
    .map((e) => `${e.title}: ${e.body}`)
    .join("\n")
    .slice(0, limit);
}

/* ---------------- connections ---------------- */

export function readConnections(email: string | null | undefined): ConnectionState {
  return read<ConnectionState>(email, "connections", {});
}

export function writeConnections(email: string | null | undefined, state: ConnectionState) {
  write(email, "connections", state);
}

export const uid = () => Math.random().toString(36).slice(2, 10);
