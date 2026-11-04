"use client";

/**
 * Single source of truth for every AI engine the workspace can talk to.
 * Keys never leave the device except in the request that uses them.
 */

export type ProviderKind = "builtin" | "cloud" | "agent" | "custom";

export interface ProviderDef {
  id: string;
  label: string;
  kind: ProviderKind;
  /** KeyBag field that stores the API key */
  keyField: string;
  /** KeyBag field that stores the chosen model */
  modelField?: string;
  models: string[];
  hint: string;
  placeholder: string;
  /** KeyBag field for a base URL (custom endpoints / local servers) */
  baseUrlField?: string;
  baseUrlPlaceholder?: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "builtin",
    label: "Built-in",
    kind: "builtin",
    keyField: "",
    models: ["nspace-knowledge"],
    hint: "Self-hosted knowledge · no key needed",
    placeholder: "",
  },
  {
    id: "gemini",
    label: "Gemini",
    kind: "cloud",
    keyField: "gemini",
    modelField: "geminiModel",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"],
    hint: "aistudio.google.com/apikey",
    placeholder: "AIza…",
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "cloud",
    keyField: "openai",
    modelField: "openaiModel",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "o4-mini"],
    hint: "platform.openai.com/api-keys",
    placeholder: "sk-…",
  },
  {
    id: "anthropic",
    label: "Claude",
    kind: "cloud",
    keyField: "anthropic",
    modelField: "anthropicModel",
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
    hint: "console.anthropic.com",
    placeholder: "sk-ant-…",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "cloud",
    keyField: "deepseek",
    modelField: "deepseekModel",
    models: ["deepseek-chat", "deepseek-reasoner"],
    hint: "platform.deepseek.com",
    placeholder: "sk-…",
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "cloud",
    keyField: "mistral",
    modelField: "mistralModel",
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest"],
    hint: "console.mistral.ai",
    placeholder: "…",
  },
  {
    id: "groq",
    label: "Groq",
    kind: "cloud",
    keyField: "groq",
    modelField: "groqModel",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    hint: "console.groq.com/keys",
    placeholder: "gsk_…",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "cloud",
    keyField: "openrouter",
    modelField: "openrouterModel",
    models: [
      "openai/gpt-4o-mini",
      "anthropic/claude-3.7-sonnet",
      "google/gemini-2.0-flash-001",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
    ],
    hint: "openrouter.ai/keys · 300+ models",
    placeholder: "sk-or-…",
  },
  {
    id: "base44",
    label: "Base44 agent",
    kind: "agent",
    keyField: "base44",
    modelField: "base44Model",
    models: ["superagent", "custom-agent"],
    hint: "Your Base44 Superagent API key + message endpoint",
    placeholder: "b44_…",
    baseUrlField: "base44Endpoint",
    baseUrlPlaceholder: "https://app.base44.com/api/agents/<agent-id>/messages",
  },
  {
    id: "custom",
    label: "Custom / local",
    kind: "custom",
    keyField: "customKey",
    modelField: "customModel",
    models: ["llama3.2", "qwen2.5-coder", "gpt-oss-20b", "any-openai-compatible"],
    hint: "OpenAI-compatible endpoint · Ollama, LM Studio, vLLM, any cloud",
    placeholder: "optional",
    baseUrlField: "customBaseUrl",
    baseUrlPlaceholder: "http://localhost:11434/v1",
  },
];

export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];

export const CLOUD_PROVIDERS = PROVIDERS.filter((p) => p.kind !== "builtin");

/** chat-route provider ids (everything the server knows how to call) */
export const ROUTE_PROVIDERS = ["local", "gemini", "openai", "anthropic", "deepseek", "mistral", "groq", "openrouter", "base44", "custom"] as const;

export function toRouteProvider(id: string): string {
  return id === "builtin" ? "local" : id;
}
