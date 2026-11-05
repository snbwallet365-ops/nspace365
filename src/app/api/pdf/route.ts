import { NextResponse } from "next/server";
import { buildPdf, type PdfBlock } from "@/lib/server/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  title?: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  blocks?: PdfBlock[];
  footer?: string;
  filename?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, error: "title required" }, { status: 400 });
  const blocks = (body.blocks ?? []).filter((b) => b.heading || b.body || b.bullets?.length);
  if (!blocks.length) return NextResponse.json({ ok: false, error: "at least one section required" }, { status: 400 });

  try {
    const { bytes, pages, font } = await buildPdf({
      title,
      subtitle: body.subtitle,
      meta: body.meta,
      blocks,
      footer: body.footer,
    });
    // HTTP headers are latin-1: keep the visible filename ASCII and send the
    // Bengali name in the RFC 5987 field instead.
    const asciiName = `${(body.filename ?? title).replace(/[^\w\-. ]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "document"}`;
    const utf8Name = encodeURIComponent(`${(body.filename ?? title).replace(/[^\w\u0980-\u09FF\-. ]+/g, "-").slice(0, 60) || "document"}.pdf`);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${asciiName}.pdf"; filename*=UTF-8''${utf8Name}`,
        "Content-Length": String(bytes.length),
        "X-Pdf-Pages": String(pages),
        "X-Pdf-Font": font,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const exists = fs.existsSync(path.join(process.cwd(), "public", "fonts", "NotoSansBengali.ttf"));
  return NextResponse.json({ engine: "pdf-lib", bengaliFont: exists, page: "A4", format: "PDF 1.7" });
}
