import { NextResponse } from "next/server";
import { liveApps, findApp } from "@/lib/server/live";

export const dynamic = "force-dynamic";

/**
 * MCP (Model Context Protocol) server over Streamable HTTP.
 * Paste the URL of this endpoint into ChatGPT, Gemini, Claude or Cursor and
 * they get the N Space workspace as a tool.
 */

const PROTOCOL = "2024-11-05";
const SERVER = { name: "nspace-workspace", version: "1.0.0" };

interface Rpc {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const TOOLS = [
  {
    name: "list_projects",
    description: "List the projects and apps in the N Space workspace with their install status and URL.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "How many projects to return (max 50)" } },
    },
  },
  {
    name: "get_project",
    description: "Get full details for one project by id or name.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Project id or name" } },
      required: ["id"],
    },
  },
  {
    name: "search_projects",
    description: "Search projects by name, genre or description.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Free text query" } },
      required: ["query"],
    },
  },
  {
    name: "workspace_status",
    description: "GitHub sync state of the workspace: account, repository count and last sync time.",
    inputSchema: { type: "object", properties: {} },
  },
];

function text(body: unknown) {
  return { content: [{ type: "text", text: typeof body === "string" ? body : JSON.stringify(body, null, 2) }] };
}

async function callTool(name: string, args: Record<string, unknown>) {
  const { apps, github } = await liveApps();

  if (name === "list_projects") {
    const limit = Math.min(Number(args.limit ?? 20) || 20, 50);
    return text(
      apps.slice(0, limit).map((a) => ({
        id: a.id,
        name: a.name,
        genre: a.genre,
        status: a.status,
        url: a.url,
        source: a.source,
      })),
    );
  }

  if (name === "get_project") {
    const id = String(args.id ?? "");
    const app = findApp(apps, id) ?? apps.find((a) => a.name.toLowerCase() === id.toLowerCase());
    if (!app) return text({ error: `No project matches "${id}"` });
    return text(app);
  }

  if (name === "search_projects") {
    const q = String(args.query ?? "").toLowerCase().trim();
    if (!q) return text({ error: "query is required" });
    const hits = apps.filter((a) => `${a.name} ${a.genre} ${a.description ?? ""}`.toLowerCase().includes(q));
    return text({ count: hits.length, results: hits.slice(0, 20).map((a) => ({ id: a.id, name: a.name, genre: a.genre, status: a.status, url: a.url })) });
  }

  if (name === "workspace_status") {
    return text({
      connected: github.connected,
      login: github.login,
      repositories: apps.filter((a) => a.source === "github").length,
      projects: apps.length,
      lastSync: github.lastSync,
    });
  }

  return text({ error: `Unknown tool: ${name}` });
}

export async function POST(req: Request) {
  let body: Rpc | Rpc[];
  try {
    body = (await req.json()) as Rpc | Rpc[];
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }

  const messages = Array.isArray(body) ? body : [body];
  const responses = [];

  for (const msg of messages) {
    const id = msg.id ?? null;
    const method = msg.method ?? "";

    if (method === "initialize") {
      responses.push({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER,
          instructions:
            "N Space workspace tools. Use list_projects to see apps, search_projects to find one, get_project for details and workspace_status for the GitHub sync state.",
        },
      });
    } else if (method.startsWith("notifications/")) {
      /* notifications need no response */
    } else if (method === "ping") {
      responses.push({ jsonrpc: "2.0", id, result: {} });
    } else if (method === "tools/list") {
      responses.push({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    } else if (method === "tools/call") {
      const p = (msg.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
      try {
        const result = await callTool(String(p.name ?? ""), p.arguments ?? {});
        responses.push({ jsonrpc: "2.0", id, result });
      } catch (err) {
        responses.push({ jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: (err as Error).message }] } });
      }
    } else if (method === "resources/list" || method === "prompts/list") {
      responses.push({ jsonrpc: "2.0", id, result: method === "resources/list" ? { resources: [] } : { prompts: [] } });
    } else if (method) {
      responses.push({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  }

  if (!responses.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? responses : responses[0], {
    headers: { "Cache-Control": "no-store", "MCP-Protocol-Version": PROTOCOL },
  });
}

export async function GET() {
  return NextResponse.json({
    ...SERVER,
    protocolVersion: PROTOCOL,
    transport: "streamable-http",
    endpoint: "/api/mcp",
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    note: "POST JSON-RPC 2.0 to this URL (initialize → tools/list → tools/call).",
  });
}
