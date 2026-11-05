import { NextResponse } from "next/server";
import { callLLM, serverKey } from "@/lib/server/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export interface AgentSpec {
  name: string;
  emoji: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  steps: string[];
  sampleTasks: string[];
  engine: string;
}

const TOOLBOX = ["list_projects", "get_project", "search_projects", "workspace_status", "site_analysis", "pdf_export"];

const DOMAINS: { match: RegExp; name: string; emoji: string; role: string; tools: string[]; steps: string[] }[] = [
  {
    match: /visa|ভিসা|embassy|passport|ওয়ার্ক\s*পারমিট|migration/i,
    name: "Visa Case Agent",
    emoji: "🛂",
    role: "ভিসা ফাইল, ডকুমেন্ট চেকলিস্ট আর অ্যাপয়েন্টমেন্ট ট্র্যাক করে",
    tools: ["list_projects", "get_project", "site_analysis", "pdf_export"],
    steps: [
      "কেসের দেশ ও ভিসা টাইপ পড়ে চেকলিস্ট তৈরি করুন",
      "ডকুমেন্টের মেয়াদ ও নামের মিল যাচাই করুন",
      "দূতাবাসের সর্বশেষ ফি ও সময়সূচি মিলিয়ে নিন",
      "ক্লায়েন্টকে বাংলায় স্টেটাস আপডেট লিখুন",
      "সারসংক্ষেপ PDF হিসেবে এক্সপোর্ট করুন",
    ],
  },
  {
    match: /website|seo|site|ওয়েবসাইট|ল্যান্ডিং|audit/i,
    name: "Site Audit Agent",
    emoji: "🔍",
    role: "ওয়েবসাইট স্ক্যান করে বাংলা রিপোর্ট ও সাইটেশন দেয়",
    tools: ["site_analysis", "search_projects", "pdf_export", "list_projects"],
    steps: [
      "URL নিয়ে রিয়েল ব্রাউজারে পেজ রেন্ডার করুন",
      "শিরোনাম, বর্ণনা, H1, alt, ভিউপোর্ট যাচাই করুন",
      "লোড সময় ও থার্ড-পার্টি স্ক্রিপ্ট মাপুন",
      "প্রতিটি দাবির সাথে সাইটেশন দিয়ে বাংলা রিপোর্ট লিখুন",
      "PDF আকারে ডাউনলোড দিন",
    ],
  },
  {
    match: /content|blog|লেখা|copy|social|পোস্ট/i,
    name: "Content Agent",
    emoji: "✍️",
    role: "বাংলা কনটেন্ট ও সোশ্যাল পোস্ট লেখে",
    tools: ["search_projects", "get_project", "pdf_export"],
    steps: ["ব্র্যান্ড টোন নির্ধারণ করুন", "আউটলাইন বানান", "ড্রাফট লিখুন", "হেডলাইন ভ্যারিয়েন্ট দিন", "পাবলিশের জন্য PDF/টেক্সট এক্সপোর্ট করুন"],
  },
  {
    match: /deploy|vercel|cloudflare|github|repo|build|ডিপ্লয়/i,
    name: "Deploy Agent",
    emoji: "🚀",
    role: "রিপো ও ডিপ্লয়মেন্ট দেখাশোনা করে",
    tools: ["list_projects", "get_project", "workspace_status"],
    steps: ["রিপো স্টেট পড়ুন", "বিল্ড লগ যাচাই করুন", "ব্যর্থ ডিপ্লয়মেন্টের কারণ লিখুন", "ফিক্সের ধাপ দিন", "রি-ডিপ্লয়ের সারসংক্ষেপ দিন"],
  },
];

function build(brief: string): AgentSpec {
  const d = DOMAINS.find((x) => x.match.test(brief)) ?? {
    name: "Workspace Agent",
    emoji: "🤖",
    role: "ওয়ার্কস্পেসের প্রজেক্ট ও ফাইল নিয়ে কাজ করে",
    tools: ["list_projects", "search_projects", "get_project", "pdf_export"],
    steps: ["লক্ষ্য বুঝুন", "প্রজেক্ট ও ডেটা খুঁজুন", "বিশ্লেষণ করুন", "বাংলায় সারসংক্ষেপ দিন", "প্রয়োজনে PDF দিন"],
  };
  const label = brief.trim().slice(0, 70) || d.role;
  return {
    name: d.name,
    emoji: d.emoji,
    role: d.role,
    systemPrompt: [
      `তুমি ${d.name} — ${d.role}।`,
      `ব্যবহারকারীর অনুরোধ: “${label}”।`,
      "সবসময় বাংলায় উত্তর দাও, সংক্ষেপে, বুলেট দিয়ে।",
      "তথ্য না থাকলে অনুমান করবে না — কী দরকার সেটা এক লাইনে বলবে।",
      `ব্যবহারযোগ্য টুল: ${d.tools.join(", ")}।`,
    ].join(" "),
    tools: d.tools.filter((t) => TOOLBOX.includes(t)),
    steps: d.steps,
    sampleTasks: ["এই সপ্তাহের কাজের সারসংক্ষেপ দাও", "একটা ফাইল দিয়ে পুরো ফ্লো চালাও", "ফলাফল PDF করে দাও"],
    engine: "built-in planner",
  };
}

export async function POST(req: Request) {
  const { brief, ai } = (await req.json()) as { brief?: string; ai?: boolean };
  const text = String(brief ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, error: "brief required" }, { status: 400 });

  const fallback = build(text);
  const key = serverKey("gemini");
  if (ai === false || !key) return NextResponse.json({ ok: true, spec: fallback });

  try {
    const prompt = [
      "তুমি একটি AI এজেন্ট ডিজাইনার। ব্যবহারকারীর চাহিদা থেকে একটি এজেন্ট স্পেসিফিকেশন বানাও।",
      "শুধু JSON ফেরত দাও।",
      `ফরম্যাট: {"name":"ইংরেজি নাম","emoji":"একটি ইমোজি","role":"বাংলায় এক লাইন","systemPrompt":"বাংলায় ৩-৪ বাক্যের নির্দেশনা","tools":["..."],"steps":["বাংলায় ৪-৫ ধাপ"],"sampleTasks":["বাংলায় ৩টি"]}`,
      `টুল লিস্ট থেকে বেছে নাও: ${TOOLBOX.join(", ")}`,
      `চাহিদা: ${text}`,
    ].join("\n");
    const out = await callLLM("gemini", { key, model: "gemini-2.5-flash" }, prompt);
    const spec = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)) as AgentSpec;
    return NextResponse.json({
      ok: true,
      spec: {
        ...fallback,
        ...spec,
        tools: (spec.tools ?? []).filter((t) => TOOLBOX.includes(t)).slice(0, 6),
        engine: "gemini-2.5-flash",
      },
    });
  } catch {
    return NextResponse.json({ ok: true, spec: fallback });
  }
}

export async function GET() {
  return NextResponse.json({ tools: TOOLBOX, domains: DOMAINS.map((d) => d.name) });
}
