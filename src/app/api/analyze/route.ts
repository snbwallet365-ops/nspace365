import { NextResponse } from "next/server";
import { snapshot } from "@/lib/server/page";
import { callLLM, serverKey } from "@/lib/server/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Citation {
  n: number;
  label: string;
  locator: string;
  quote: string;
}

interface Finding {
  title: string;
  detail: string;
  severity: "high" | "medium" | "low" | "good";
  citations: number[];
}

interface ScorePart {
  label: string;
  score: number;
}

interface Signals {
  url: string;
  finalUrl: string;
  status: number;
  engine: string;
  ms: number;
  title: string;
  description: string;
  lang: string;
  viewport: boolean;
  canonical: string;
  h1: string[];
  h2: string[];
  imgs: number;
  imgsNoAlt: number;
  links: number;
  externalLinks: number;
  scripts: number;
  thirdParty: string[];
  ogTags: number;
  schema: boolean;
  words: number;
  htmlKb: number;
  https: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
  privacy: boolean;
}

function pick(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? m[1].trim().replace(/\s+/g, " ") : "";
}

function collect(html: string, re: RegExp, limit = 6): string[] {
  const out: string[] = [];
  const g = new RegExp(re.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = g.exec(html)) && out.length < limit) {
    const t = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (t) out.push(t.slice(0, 160));
  }
  return out;
}

function extract(scan: { finalUrl: string; url: string; status: number; engine: string; ms: number; title: string; html: string; text: string }): Signals {
  const { html, text } = scan;
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imgsNoAlt = imgTags.filter((t) => !/\balt\s*=\s*["'][^"']+["']/i.test(t)).length;
  const scripts = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const hosts = new Set<string>();
  for (const s of scripts) {
    try {
      const h = new URL(s, scan.finalUrl).hostname;
      if (!h.endsWith(new URL(scan.finalUrl).hostname.replace(/^www\./, ""))) hosts.add(h);
    } catch {
      /* ignore */
    }
  }
  const words = text.split(/\s+/).filter(Boolean).length;

  return {
    url: scan.url,
    finalUrl: scan.finalUrl,
    status: scan.status,
    engine: scan.engine,
    ms: scan.ms,
    title: pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || scan.title,
    description: pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
    lang: pick(html, /<html[^>]+lang=["']([^"']+)["']/i),
    viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    canonical: pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i),
    h1: collect(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/),
    h2: collect(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/),
    imgs: imgTags.length,
    imgsNoAlt,
    links: (html.match(/<a\b/gi) ?? []).length,
    externalLinks: (html.match(/<a\b[^>]*href=["']https?:\/\//gi) ?? []).length,
    scripts: scripts.length,
    thirdParty: [...hosts].slice(0, 8),
    ogTags: (html.match(/property=["']og:/gi) ?? []).length,
    schema: /application\/ld\+json/i.test(html),
    words,
    htmlKb: Math.round(html.length / 1024),
    https: scan.finalUrl.startsWith("https://"),
    hasPhone: /(\+?88)?0?1[3-9]\d{8}|tel:\+?\d{6,}/.test(text) || /tel:/i.test(html),
    hasAddress: /(road|street|dhaka|chattogram|address|ঠিকানা|রোড|ঢাকা)/i.test(text),
    privacy: /privacy|গোপনীয়তা|terms|শর্তাবলী/i.test(text),
  };
}

function score(s: Signals): { overall: number; parts: ScorePart[] } {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const seo =
    (s.title ? 20 : 0) +
    (s.title.length >= 15 && s.title.length <= 65 ? 15 : 8) +
    (s.description ? 15 : 0) +
    (s.description.length >= 50 ? 10 : 4) +
    (s.h1.length === 1 ? 15 : s.h1.length ? 8 : 0) +
    (s.h2.length >= 2 ? 10 : s.h2.length ? 5 : 0) +
    (s.canonical ? 5 : 0) +
    (s.ogTags >= 3 ? 10 : s.ogTags ? 5 : 0);
  const mobile = (s.viewport ? 55 : 0) + (s.words > 120 ? 25 : 12) + (s.htmlKb < 220 ? 20 : 8);
  const a11y =
    (s.lang ? 20 : 0) +
    (s.imgs ? Math.round((1 - s.imgsNoAlt / s.imgs) * 50) : 35) +
    (s.h1.length === 1 ? 15 : 0) +
    (s.privacy ? 15 : 0);
  const perf = (s.ms < 1500 ? 45 : s.ms < 3000 ? 30 : 15) + (s.htmlKb < 120 ? 25 : s.htmlKb < 300 ? 15 : 5) + (s.scripts < 12 ? 20 : 8) + (s.thirdParty.length < 5 ? 10 : 3);
  const trust = (s.https ? 40 : 0) + (s.hasPhone ? 20 : 0) + (s.hasAddress ? 15 : 0) + (s.privacy ? 15 : 0) + (s.schema ? 10 : 0);
  const parts: ScorePart[] = [
    { label: "SEO", score: clamp(seo) },
    { label: "Mobile", score: clamp(mobile) },
    { label: "Accessibility", score: clamp(a11y) },
    { label: "Speed", score: clamp(perf) },
    { label: "Trust", score: clamp(trust) },
  ];
  const overall = clamp(parts.reduce((a, p) => a + p.score, 0) / parts.length);
  return { overall, parts };
}

function report(s: Signals, sc: { overall: number; parts: ScorePart[] }) {
  const host = (() => {
    try {
      return new URL(s.finalUrl).hostname;
    } catch {
      return s.finalUrl;
    }
  })();

  const citations: Citation[] = [
    { n: 1, label: "পেজের শিরোনাম", locator: `${host} — <title>`, quote: s.title || "(শিরোনাম পাওয়া যায়নি)" },
    { n: 2, label: "মেটা বর্ণনা", locator: `<meta name="description">`, quote: s.description || "(বর্ণনা নেই)" },
    { n: 3, label: "মোবাইল ভিউপোর্ট", locator: `<meta name="viewport">`, quote: s.viewport ? "পাওয়া গেছে, রেসপন্সিভ রেন্ডারিং চালু" : "ট্যাগ পাওয়া যায়নি" },
    { n: 4, label: "প্রধান শিরোনাম (H1)", locator: "<h1>", quote: s.h1[0] ?? `(H1 ${s.h1.length}টি)` },
    { n: 5, label: "ছবির alt টেক্সট", locator: `<img> — ${s.imgs}টি ছবি`, quote: s.imgsNoAlt ? `${s.imgsNoAlt}টি ছবিতে alt নেই` : "সব ছবিতে alt আছে" },
    { n: 6, label: "লোড সময়", locator: `${s.engine === "chromium" ? "Chromium" : "HTTP"} রেন্ডার`, quote: `${s.ms}ms, HTML ${s.htmlKb}KB, স্ক্রিপ্ট ${s.scripts}টি` },
    { n: 7, label: "নিরাপত্তা (HTTPS)", locator: "URL স্কিম", quote: s.https ? "HTTPS সক্রিয়" : "HTTPS নেই" },
    { n: 8, label: "যোগাযোগের তথ্য", locator: "পেজ টেক্সট", quote: [s.hasPhone ? "ফোন নম্বর পাওয়া গেছে" : "ফোন নম্বর নেই", s.hasAddress ? "ঠিকানা পাওয়া গেছে" : "ঠিকানা নেই"].join(", ") },
    { n: 9, label: "থার্ড-পার্টি স্ক্রিপ্ট", locator: "external <script>", quote: s.thirdParty.length ? s.thirdParty.join(", ") : "কোনো থার্ড-পার্টি স্ক্রিপ্ট নেই" },
    { n: 10, label: "কনটেন্ট পরিমাণ", locator: "body text", quote: `${s.words} শব্দ, ${s.h2.length}টি H2 সেকশন` },
  ];

  const findings: Finding[] = [];

  if (s.title.length < 15) findings.push({ title: "শিরোনাম খুব ছোট", detail: `শিরোনাম ${s.title.length} অক্ষরের। সার্চ রেজাল্টে ভালো দেখাতে ৩০-৬০ অক্ষরের শিরোনাম দরকার, ব্র্যান্ড নামসহ।`, severity: s.title ? "medium" : "high", citations: [1] });
  else if (s.title.length > 65) findings.push({ title: "শিরোনাম বেশি লম্বা", detail: "৬৫ অক্ষরের বেশি হলে গুগল শিরোনাম কেটে দেয়। মূল কীওয়ার্ড প্রথমে রাখুন।", severity: "low", citations: [1] });
  else findings.push({ title: "শিরোনাম ঠিক আছে", detail: `“${s.title}” দৈর্ঘ্য ও গঠন দুই দিক থেকেই উপযুক্ত।`, severity: "good", citations: [1] });

  if (!s.description) findings.push({ title: "মেটা বর্ণনা নেই", detail: "সার্চ রেজাল্টে নিচের লাইনটা দেখানোর জন্য ৫০-১৬০ অক্ষরের বর্ণনা যোগ করুন, সাথে কল-টু-অ্যাকশন।", severity: "high", citations: [2] });
  else findings.push({ title: "মেটা বর্ণনা পাওয়া গেছে", detail: `${s.description.length} অক্ষর। ${s.description.length < 50 ? "আরেকটু বিস্তারিত করলে ভালো।" : "দৈর্ঘ্য ঠিক আছে।"}`, severity: s.description.length < 50 ? "medium" : "good", citations: [2] });

  if (!s.viewport) findings.push({ title: "মোবাইল ভিউপোর্ট নেই", detail: "ভিউপোর্ট মেটা ট্যাগ ছাড়া মোবাইলে পেজ জুম-আউট হয়ে ছোট দেখাবে।", severity: "high", citations: [3] });
  else findings.push({ title: "মোবাইল রেন্ডারিং চালু", detail: "ভিউপোর্ট ঠিক আছে; তবে ট্যাপ টার্গেট ৪৪px এর নিচে না রাখাই ভালো।", severity: "good", citations: [3] });

  if (s.h1.length !== 1) findings.push({ title: `H1 সংখ্যা ${s.h1.length}`, detail: "প্রতি পেজে ঠিক একটি H1 রাখলে বিষয়বস্তুর মূল বার্তা স্পষ্ট থাকে।", severity: s.h1.length ? "medium" : "high", citations: [4] });
  else findings.push({ title: "H1 কাঠামো ঠিক", detail: `“${s.h1[0].slice(0, 80)}” মূল শিরোনাম হিসেবে কাজ করছে।`, severity: "good", citations: [4] });

  if (s.imgs && s.imgsNoAlt / s.imgs > 0.3) findings.push({ title: "ছবিতে alt টেক্সট কম", detail: `${s.imgs}টি ছবির মধ্যে ${s.imgsNoAlt}টিতে alt নেই। এতে অ্যাক্সেসিবিলিটি ও ইমেজ সার্চ দুটোই ক্ষতিগ্রস্ত হয়।`, severity: "medium", citations: [5] });
  else if (s.imgs) findings.push({ title: "ছবির অ্যাক্সেসিবিলিটি ভালো", detail: "alt কভারেজ যথেষ্ট; ছবির ফাইল সাইজ WebP করলে গতি আরও বাড়বে।", severity: "good", citations: [5] });

  if (s.ms > 3000) findings.push({ title: "লোড সময় বেশি", detail: `${s.ms}ms সময় নিচ্ছে। হিরো ইমেজ কমপ্রেস, ফন্ট প্রি-লোড আর অপ্রয়োজনীয় স্ক্রিপ্ট সরিয়ে ২ সেকেন্ডের নিচে নামানো সম্ভব।`, severity: "high", citations: [6, 9] });
  else findings.push({ title: "লোড সময় গ্রহণযোগ্য", detail: `${s.ms}ms, HTML ${s.htmlKb}KB — স্বাভাবিক সীমার মধ্যে।`, severity: "good", citations: [6] });

  if (!s.https) findings.push({ title: "HTTPS নেই", detail: "ফর্ম বা লগইন থাকলে অবশ্যই HTTPS লাগবে, নাহলে ব্রাউজার “Not secure” দেখাবে।", severity: "high", citations: [7] });
  if (!s.hasPhone || !s.hasAddress) findings.push({ title: "যোগাযোগের তথ্য অসম্পূর্ণ", detail: [s.hasPhone ? "" : "ফোন নম্বর যুক্ত করুন", s.hasAddress ? "" : "ঠিকানা/লোকেশন যুক্ত করুন"].filter(Boolean).join(", ") + " — ভিসা consultancy পেজে ট্রাস্ট সিগন্যাল হিসেবে এগুলো সরাসরি প্রভাব ফেলে।", severity: "medium", citations: [8] });
  if (s.thirdParty.length >= 5) findings.push({ title: "থার্ড-পার্টি স্ক্রিপ্ট বেশি", detail: `${s.thirdParty.length}টি এক্সটার্নাল হোস্ট (${s.thirdParty.slice(0, 4).join(", ")})। প্রয়োজন 없는 ট্যাগ সরালে TBT কমবে।`, severity: "medium", citations: [9] });
  if (s.words < 200) findings.push({ title: "কনটেন্ট কম", detail: `মাত্র ${s.words} শব্দ। সার্ভিস পেজে ৪০০+ শব্দ, FAQ ও স্কিমা মার্কআপ থাকলে র‍্যাংকিং সহজ হয়।`, severity: "medium", citations: [10] });
  if (!s.privacy) findings.push({ title: "প্রাইভেসি পেজের লিংক নেই", detail: "প্রাইভেসি পলিসি ও টার্মস লিংক ফুটারে রাখুন — ভিসা ডকুমেন্ট নেওয়ার সাইটে ক্লায়েন্ট এটা খোঁজে।", severity: "low", citations: [8] });

  const summary = `${host} পেজটি ${s.engine === "chromium" ? "রিয়েল ব্রাউজারে" : "HTTP ফেচে"} রেন্ডার করে বিশ্লেষণ করা হয়েছে। সার্বিক স্কোর ${sc.overall}/১০০ — ${sc.parts.map((p) => `${p.label} ${p.score}`).join(", ")}। শিরোনাম “${s.title || "নেই"}”, মোবাইল ভিউপোর্ট ${s.viewport ? "সক্রিয়" : "নেই"}, লোড ${s.ms}ms। মোট ${findings.filter((f) => f.severity !== "good").length}টি উন্নতির জায়গা পাওয়া গেছে।`;

  const nextSteps = [
    s.description ? "মেটা বর্ণনায় কল-টু-অ্যাকশন যোগ করুন" : "১২০-১৫৫ অক্ষরের মেটা বর্ণনা লিখুন",
    s.imgsNoAlt ? `${s.imgsNoAlt}টি ছবির alt লিখুন` : "হিরো ইমেজ WebP/AVIF ফরম্যাটে নিন",
    "প্রতিটি সার্ভিস পেজে FAQ স্কিমা (JSON-LD) যোগ করুন",
    "ফুটারে ফোন, ঠিকানা, প্রাইভেসি ও টার্মস লিংক রাখুন",
  ];

  return {
    summary,
    findings,
    citations,
    nextSteps,
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as { url?: string; ai?: boolean };
  const raw = String(body.url ?? "").trim();
  if (!raw) return NextResponse.json({ ok: false, error: "url required" }, { status: 400 });
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const scan = await snapshot(url);
    const signals = extract(scan);
    const sc = score(signals);
    const base = report(signals, sc);

    let engine = "built-in (Regex + rule engine)";
    let summary = base.summary;
    let findings = base.findings;
    let nextSteps = base.nextSteps;

    const key = serverKey("gemini");
    if (body.ai !== false && key) {
      try {
        const prompt = [
          "তুমি একজন বাংলাদেশি ওয়েবসাইট অডিট বিশেষজ্ঞ। নিচের রিয়েল সিগন্যাল থেকে বাংলায় সংক্ষিপ্ত রিপোর্ট লেখো।",
          "শুধু JSON ফেরত দাও, কোনো মার্কডাউন নয়।",
          'ফরম্যাট: {"summary":"বাংলা ৩-৪ বাক্য","findings":[{"title":"বাংলা","detail":"বাংলা","severity":"high|medium|low|good","citations":[1,2]}],"nextSteps":["বাংলা"]}',
          "citations-এ শুধু নিচের সাইটেশন নম্বর ব্যবহার করবে। প্রতিটি দাবির পাশে অন্তত একটি সাইটেশন দাও।",
          `সিগন্যাল: ${JSON.stringify(signals).slice(0, 3500)}`,
          `সাইটেশন: ${JSON.stringify(base.citations.map((c) => ({ n: c.n, label: c.label, quote: c.quote }))).slice(0, 1800)}`,
        ].join("\n");
        const text = await callLLM("gemini", { key, model: "gemini-2.5-flash" }, prompt);
        const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
          summary: string;
          findings: Finding[];
          nextSteps: string[];
        };
        if (json.summary && json.findings?.length) {
          summary = json.summary;
          findings = json.findings.map((f) => ({ ...f, citations: (f.citations ?? []).filter((n) => n >= 1 && n <= base.citations.length) }));
          nextSteps = json.nextSteps ?? nextSteps;
          engine = "gemini-2.5-flash";
        }
      } catch {
        /* keep the built-in report */
      }
    }

    return NextResponse.json({
      ok: true,
      url,
      host: (() => {
        try {
          return new URL(signals.finalUrl).hostname;
        } catch {
          return url;
        }
      })(),
      fetchedAt: new Date().toISOString(),
      engine,
      render: signals.engine,
      ms: signals.ms,
      scores: { overall: sc.overall, parts: sc.parts },
      signals,
      summary,
      findings,
      citations: base.citations,
      nextSteps,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ engine: "rule + gemini", languages: ["bn"], citations: true });
}
