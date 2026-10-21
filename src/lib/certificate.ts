import { PDFDocument, rgb, type Color, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { CertificateLayout } from "@/lib/certificate-defaults";

/**
 * Certificate text layout, shared by the learner download route and the admin preview.
 * The project's template PDF supplies the frame, badge, signature and partner logos; this
 * stamps the BoostMySkills logo, heading, learner name, project texts and course title on top,
 * as one centred block inside the content box.
 */

export interface CertificateAssets {
  logo: Uint8Array;
  nameFont: Uint8Array;
  regularFont: Uint8Array;
  semiBoldFont: Uint8Array;
  boldFont: Uint8Array;
}

/** Public URLs of the assets; the server reads the same files from `public/`. */
export const CERTIFICATE_ASSET_PATHS: Record<keyof CertificateAssets, string> = {
  logo: "/logos/boostmyskills-logo.png",
  nameFont: "/certificate/Lora-SemiBold.ttf",
  regularFont: "/certificate/Urbanist-Regular.ttf",
  semiBoldFont: "/certificate/Urbanist-SemiBold.ttf",
  boldFont: "/certificate/Urbanist-Bold.ttf",
};

export const CERTIFICATE_HEADING = "BoostMySkills CERTIFICATE";

// Sizes and gaps are fractions of the content box width, measured from the reference design.
const LOGO_WIDTH = 0.238;
const HEADING = { size: 0.042, gapBefore: 0.0576 };
// A long name shrinks to fit, but no further than minScale; past that it wraps instead.
const NAME = { size: 0.0946, lineHeight: 1.15, gapBefore: 0.0787, minScale: 0.7 };
const INTRO = { size: 0.0348, lineHeight: 0.0403, gapBefore: 0.092, wrap: 0.96 };
const TITLE = { size: 0.079, lineHeight: 0.096, gapBefore: 0.071, wrap: 1 };
const CLOSING = { size: 0.0301, lineHeight: 0.0504, gapBefore: 0.072, wrap: 0.96 };

// Lora and Urbanist both have a cap height of 0.7 em and descend about 0.25 em.
const CAP_HEIGHT = 0.7;
const DESCENT = 0.25;
const GREY = rgb(0.43, 0.42, 0.42);
const INK = rgb(0.1, 0.1, 0.1);

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

type Block =
  | { kind: "logo"; gapBefore: number; width: number; height: number }
  | { kind: "text"; gapBefore: number; lines: string[]; font: PDFFont; size: number; lineHeight: number; color: Color };

/** Block height from its top (logo top / first line's cap top) to its bottom (logo bottom / last baseline). */
function blockHeight(b: Block) {
  if (b.kind === "logo") return b.height;
  return CAP_HEIGHT * b.size + (b.lines.length - 1) * b.lineHeight;
}

function drawBlocks(page: PDFPage, blocks: Block[], logo: PDFImage, centerX: number, top: number, scale: number) {
  let y = top;
  for (const b of blocks) {
    y -= b.gapBefore * scale;
    if (b.kind === "logo") {
      const width = b.width * scale;
      const height = b.height * scale;
      page.drawImage(logo, { x: centerX - width / 2, y: y - height, width, height });
      y -= height;
      continue;
    }
    const size = b.size * scale;
    b.lines.forEach((line, i) => {
      const baseline = y - CAP_HEIGHT * size - i * b.lineHeight * scale;
      const width = b.font.widthOfTextAtSize(line, size);
      page.drawText(line, { x: centerX - width / 2, y: baseline, size, font: b.font, color: b.color });
    });
    y -= blockHeight(b) * scale;
  }
}

export async function stampCertificate(
  template: Uint8Array | ArrayBuffer,
  assets: CertificateAssets,
  content: { learnerName: string; title: string },
  layout: CertificateLayout,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(template);
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.getPages()[0];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const [logo, nameFont, regularFont, semiBoldFont, boldFont] = await Promise.all([
    pdfDoc.embedPng(assets.logo),
    pdfDoc.embedFont(assets.nameFont, { subset: true }),
    pdfDoc.embedFont(assets.regularFont, { subset: true }),
    pdfDoc.embedFont(assets.semiBoldFont, { subset: true }),
    pdfDoc.embedFont(assets.boldFont, { subset: true }),
  ]);

  // Lay the block out at the full box width, then shrink it uniformly if it is too tall for the box.
  const boxWidth = (layout.contentWidth / 100) * pageWidth;
  const boxTop = pageHeight - (layout.contentTop / 100) * pageHeight;
  const boxHeight = Math.max(0, ((layout.contentBottom - layout.contentTop) / 100) * pageHeight);

  const name = content.learnerName.toLocaleUpperCase();
  let nameSize = NAME.size * boxWidth;
  let nameLines = [name];
  const nameWidth = nameFont.widthOfTextAtSize(name, nameSize);
  if (nameWidth > boxWidth) {
    if (nameWidth * NAME.minScale > boxWidth) {
      nameSize *= NAME.minScale;
      nameLines = wrapText(name, nameFont, nameSize, boxWidth);
    }
    const widest = Math.max(...nameLines.map((line) => nameFont.widthOfTextAtSize(line, nameSize)));
    if (widest > boxWidth) nameSize *= boxWidth / widest;
  }

  const logoWidth = LOGO_WIDTH * boxWidth;
  const blocks: Block[] = [
    { kind: "logo", gapBefore: 0, width: logoWidth, height: logoWidth * (logo.height / logo.width) },
    { kind: "text", gapBefore: HEADING.gapBefore * boxWidth, lines: [CERTIFICATE_HEADING], font: semiBoldFont, size: HEADING.size * boxWidth, lineHeight: 0, color: GREY },
    { kind: "text", gapBefore: NAME.gapBefore * boxWidth, lines: nameLines, font: nameFont, size: nameSize, lineHeight: NAME.lineHeight * nameSize, color: INK },
  ];
  const paragraphs = [
    { text: layout.introText, font: regularFont, spec: INTRO },
    { text: content.title, font: boldFont, spec: TITLE },
    { text: layout.closingText, font: semiBoldFont, spec: CLOSING },
  ];
  for (const { text, font, spec } of paragraphs) {
    const size = spec.size * boxWidth;
    const lines = wrapText(text, font, size, spec.wrap * boxWidth);
    if (lines.length === 0) continue;
    blocks.push({ kind: "text", gapBefore: spec.gapBefore * boxWidth, lines, font, size, lineHeight: spec.lineHeight * boxWidth, color: INK });
  }

  const last = blocks[blocks.length - 1];
  const contentHeight = blocks.reduce((sum, b) => sum + b.gapBefore + blockHeight(b), 0) + (last.kind === "text" ? DESCENT * last.size : 0);
  const scale = contentHeight > boxHeight && contentHeight > 0 ? boxHeight / contentHeight : 1;
  const top = boxTop - (boxHeight - contentHeight * scale) / 2;

  drawBlocks(page, blocks, logo, pageWidth / 2, top, scale);
  return pdfDoc.save();
}
