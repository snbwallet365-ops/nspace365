import "regenerator-runtime/runtime.js";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/** A real, layered PDF: A4, embedded Bengali font (shaped), wrapped text, page numbers. */

export interface PdfBlock {
  heading?: string;
  body?: string;
  bullets?: string[];
}

export interface PdfDocInput {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  blocks: PdfBlock[];
  footer?: string;
}

const PAGE: [number, number] = [595.28, 841.89]; // A4 points
const MARGIN = 52;
const INK = rgb(0.11, 0.11, 0.12);
const SOFT = rgb(0.42, 0.42, 0.45);
const ACCENT = rgb(0.04, 0.52, 1);

function fontPath() {
  return path.join(process.cwd(), "public", "fonts", "NotoSansBengali.ttf");
}

export async function buildPdf(input: PdfDocInput): Promise<{ bytes: Uint8Array; pages: number; font: string }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(input.title);
  doc.setProducer("N Space PDF Studio");
  doc.setCreator("N Space");

  let font: PDFFont;
  let fontName = "Helvetica (latin only)";
  const file = fontPath();
  if (fs.existsSync(file)) {
    font = await doc.embedFont(fs.readFileSync(file), { subset: true });
    fontName = "Noto Sans Bengali";
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
  }

  const safe = (t: string) => {
    if (fontName.startsWith("Noto")) return t;
    return t.replace(/[^\x20-\x7E\n]/g, "");
  };

  let page = doc.addPage(PAGE);
  let y = PAGE[1] - MARGIN;
  let pages = 1;
  const width = PAGE[0] - MARGIN * 2;

  const wrap = (text: string, size: number, max: number): string[] => {
    const out: string[] = [];
    for (const rawLine of text.split("\n")) {
      const words = rawLine.split(/\s+/).filter(Boolean);
      if (!words.length) {
        out.push("");
        continue;
      }
      let line = "";
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(next, size) > max && line) {
          out.push(line);
          line = w;
        } else {
          line = next;
        }
      }
      if (line) out.push(line);
    }
    return out;
  };

  const need = (h: number) => {
    if (y - h >= MARGIN + 26) return;
    const old = page;
    page = doc.addPage(PAGE);
    pages += 1;
    y = PAGE[1] - MARGIN;
    page.drawText(String(pages), { x: PAGE[0] - MARGIN - 8, y: 28, size: 8, font, color: SOFT });
    old.drawText("N Space", { x: MARGIN, y: 28, size: 8, font, color: SOFT });
  };

  const write = (text: string, size: number, opts: { color?: ReturnType<typeof rgb>; gap?: number; indent?: number; boldish?: boolean } = {}) => {
    const lineHeight = size * 1.55;
    for (const line of wrap(safe(text), size, width - (opts.indent ?? 0))) {
      need(lineHeight);
      if (line) {
        page.drawText(line, {
          x: MARGIN + (opts.indent ?? 0),
          y: y - size,
          size,
          font,
          color: opts.color ?? INK,
        });
      }
      y -= lineHeight;
    }
    y -= opts.gap ?? 0;
  };

  // header band
  page.drawRectangle({ x: 0, y: PAGE[1] - 8, width: PAGE[0], height: 8, color: ACCENT });
  write(input.title, 21, { gap: 4 });
  if (input.subtitle) write(input.subtitle, 10.5, { color: SOFT, gap: 10 });
  else y -= 6;

  if (input.meta?.length) {
    const line = input.meta.map((m) => `${m.label}: ${m.value}`).join("   ·   ");
    write(line, 8.5, { color: SOFT, gap: 6 });
    page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE[0] - MARGIN, y: y + 2 }, thickness: 0.7, color: rgb(0.86, 0.86, 0.88) });
    y -= 12;
  }

  for (const b of input.blocks) {
    if (b.heading) {
      need(30);
      y -= 4;
      write(b.heading, 13, { gap: 3, color: rgb(0.05, 0.05, 0.07) });
    }
    if (b.body) write(b.body, 10.5, { gap: 6 });
    if (b.bullets?.length) {
      for (const item of b.bullets) {
        need(18);
        page.drawCircle({ x: MARGIN + 3, y: y - 6.5, size: 1.8, color: ACCENT });
        write(item, 10.5, { indent: 14, gap: 2 });
      }
      y -= 4;
    }
  }

  if (input.footer) {
    need(28);
    y -= 8;
    write(input.footer, 8.5, { color: SOFT });
  }

  page.drawText("N Space · PDF Studio", { x: MARGIN, y: 28, size: 8, font, color: SOFT });
  page.drawText(String(pages), { x: PAGE[0] - MARGIN - 8, y: 28, size: 8, font, color: SOFT });

  const bytes = await doc.save();
  return { bytes, pages, font: fontName };
}
