import { NextResponse } from "next/server";
import { createRequire } from "module";
import path from "path";
import { callLLM, serverKey } from "@/lib/server/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const require = createRequire(import.meta.url);

type Device = "iphone" | "pixel" | "desktop";

const DEVICES: Record<Device, { width: number; height: number; dsf: number; ua: string; label: string }> = {
  iphone: {
    width: 390,
    height: 844,
    dsf: 2,
    label: "iPhone 15",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  pixel: {
    width: 412,
    height: 915,
    dsf: 2,
    label: "Pixel 7",
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
  },
  desktop: {
    width: 1280,
    height: 800,
    dsf: 1,
    label: "Desktop",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
};

interface PlaywrightModule {
  chromium: {
    launch: (opts?: { executablePath?: string; args?: string[] }) => Promise<{
      newContext: (opts: Record<string, unknown>) => Promise<{ newPage: () => Promise<BrowserPage>; close: () => Promise<void> }>;
      close: () => Promise<void>;
    }>;
  };
}

interface BrowserPage {
  goto: (url: string, opts?: Record<string, unknown>) => Promise<unknown>;
  title: () => Promise<string>;
  innerText: (sel: string) => Promise<string>;
  screenshot: (opts?: Record<string, unknown>) => Promise<Buffer>;
  waitForTimeout: (ms: number) => Promise<void>;
}

function loadPlaywright(): PlaywrightModule | null {
  // Turbopack rewrites bare `require(variable)` calls, so resolve through a real
  // Node require created at runtime.
  const req = createRequire(path.join(process.cwd(), "index.js"));
  const roots = [
    path.join(process.cwd(), "node_modules"),
    ...(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean),
    "/usr/lib/node_modules",
    "/usr/local/lib/node_modules",
  ];
  for (const name of ["playwright", "playwright-core"]) {
    try {
      return req(name) as PlaywrightModule;
    } catch {
      /* try absolute roots next */
    }
    for (const root of roots) {
      try {
        return req(path.join(root, name)) as PlaywrightModule;
      } catch {
        /* keep looking */
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { url?: string; device?: Device; summarize?: boolean; key?: string; model?: string; agent?: boolean };
  const raw = String(body.url ?? "").trim();
  if (!raw) return NextResponse.json({ ok: false, error: "url required" }, { status: 400 });
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  const pw = loadPlaywright();
  if (!pw) {
    return NextResponse.json({
      ok: false,
      error: "Browser engine not installed on this server. Run: npm i playwright && npx playwright install chromium (works on your own server / localhost).",
    });
  }

  const device = DEVICES[(body.device ?? "iphone") as Device] ?? DEVICES.iphone;
  let browser: Awaited<ReturnType<PlaywrightModule["chromium"]["launch"]>> | null = null;

  try {
    browser = await pw.chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const ctx = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.dsf,
      isMobile: device !== DEVICES.desktop,
      hasTouch: device !== DEVICES.desktop,
      userAgent: device.ua,
    });
    const page = await ctx.newPage();
    const started = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2200);

    const title = await page.title();
    const text = (await page.innerText("body")).replace(/\s+\n/g, "\n").trim().slice(0, 4000);
    const shot = await page.screenshot({ type: "png", fullPage: false });
    const ms = Date.now() - started;
    await ctx.close();

    let summary: string | null = null;
    if (body.summarize || body.agent) {
      const key = body.key || serverKey("gemini");
      if (key) {
        try {
          summary = await callLLM(
            "gemini",
            { key, model: body.model || "gemini-2.5-flash" },
            `You are reviewing a live web page rendered on ${device.label}.\nURL: ${url}\nTitle: ${title}\n\nPage text:\n${text.slice(0, 3000)}\n\nGive: 1) what the page does in one line, 2) three concrete UI/UX fixes for this device size, 3) anything broken or missing. Keep it short.`,
          );
        } catch (e) {
          summary = `Gemini summary failed: ${(e as Error).message}`;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      url,
      device: device.label,
      title,
      ms,
      screenshot: `data:image/png;base64,${shot.toString("base64")}`,
      text,
      summary,
      engine: "playwright",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export async function GET() {
  const pw = loadPlaywright();
  return NextResponse.json({ engine: "playwright", installed: Boolean(pw), devices: Object.keys(DEVICES) });
}
