import { createRequire } from "module";
import path from "path";

/** Playwright loader that survives the bundler, plus a plain-HTTP fallback. */

export interface PageSnapshot {
  url: string;
  finalUrl: string;
  title: string;
  html: string;
  text: string;
  ms: number;
  engine: "chromium" | "http";
  status: number;
}

interface PwPage {
  goto: (url: string, opts?: Record<string, unknown>) => Promise<{ status?: () => number } | null>;
  title: () => Promise<string>;
  content: () => Promise<string>;
  innerText: (sel: string) => Promise<string>;
  url: () => string;
  waitForTimeout: (ms: number) => Promise<void>;
}

interface PwModule {
  chromium: {
    launch: (opts?: Record<string, unknown>) => Promise<{
      newContext: (opts: Record<string, unknown>) => Promise<{ newPage: () => Promise<PwPage>; close: () => Promise<void> }>;
      close: () => Promise<void>;
    }>;
  };
}

export function loadPlaywright(): PwModule | null {
  const req = createRequire(path.join(process.cwd(), "index.js"));
  const roots = [
    path.join(process.cwd(), "node_modules"),
    ...(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean),
    "/usr/lib/node_modules",
    "/usr/local/lib/node_modules",
  ];
  for (const name of ["playwright", "playwright-core"]) {
    try {
      return req(name) as PwModule;
    } catch {
      /* next */
    }
    for (const root of roots) {
      try {
        return req(path.join(root, name)) as PwModule;
      } catch {
        /* next */
      }
    }
  }
  return null;
}

export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function snapshot(url: string, opts: { width?: number; height?: number; ms?: number } = {}): Promise<PageSnapshot> {
  const started = Date.now();
  const pw = loadPlaywright();
  if (pw) {
    let browser: Awaited<ReturnType<PwModule["chromium"]["launch"]>> | null = null;
    try {
      browser = await pw.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
      const ctx = await browser.newContext({
        viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 },
        userAgent: UA,
      });
      const page = await ctx.newPage();
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(opts.ms ?? 1800);
      const title = await page.title();
      const html = await page.content();
      const text = await page.innerText("body");
      const finalUrl = page.url();
      const status = res && typeof res.status === "function" ? res.status() : 200;
      await ctx.close();
      return { url, finalUrl, title, html, text, ms: Date.now() - started, engine: "chromium", status };
    } catch (e) {
      if (browser) await browser.close().catch(() => {});
      if ((e as Error).message.includes("Executable doesn't exist")) throw e;
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, redirect: "follow" });
  const html = await res.text();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { url, finalUrl: res.url, title, html, text, ms: Date.now() - started, engine: "http", status: res.status };
}
