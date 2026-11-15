import { PDFDocument, PDFName, rgb, StandardFonts, PageSizes } from "pdf-lib";
import { toSafeArrayBuffer, createSafeFile } from "@/lib/utils";

export interface TocEntry {
  title: string;
  targetPageIndex: number; // 0-based index in the final document
  pageDisplayNumber: number; // 1-based page number displayed to user
}

export interface TocOptions {
  title: string; // e.g., "TABLE OF CONTENTS" or "INDEX"
  subtitle?: string; // e.g., "Laboratory Experiments & Project Submissions"
  accentColor?: string; // Hex color for headers
}

/**
 * Builds a Table of Contents page and attaches true GoTo internal Link annotations
 */
export async function insertClickableToc(
  masterDoc: PDFDocument,
  entries: TocEntry[],
  options: TocOptions
): Promise<Uint8Array> {
  // Prepend TOC page at index 0
  const tocPage = masterDoc.insertPage(0, PageSizes.A4);
  const { width: pW, height: pH } = tocPage.getSize();

  const fontBold = await masterDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await masterDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await masterDoc.embedFont(StandardFonts.Courier);

  // Top Title Banner
  tocPage.drawRectangle({
    x: 40,
    y: pH - 110,
    width: pW - 80,
    height: 70,
    color: rgb(0.97, 0.97, 0.98),
    borderWidth: 1,
    borderColor: rgb(0.85, 0.85, 0.88),
  });

  tocPage.drawText(options.title.toUpperCase(), {
    x: 60,
    y: pH - 75,
    size: 18,
    font: fontBold,
    color: rgb(0.08, 0.09, 0.12),
  });

  if (options.subtitle) {
    tocPage.drawText(options.subtitle, {
      x: 60,
      y: pH - 95,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.52),
    });
  }

  // Column Headers
  const startY = pH - 145;
  tocPage.drawText("S.NO", { x: 50, y: startY, size: 9, font: fontBold, color: rgb(0.4, 0.45, 0.52) });
  tocPage.drawText("TITLE / EXPERIMENT DESCRIPTION", { x: 95, y: startY, size: 9, font: fontBold, color: rgb(0.4, 0.45, 0.52) });
  tocPage.drawText("PAGE NO", { x: pW - 105, y: startY, size: 9, font: fontBold, color: rgb(0.4, 0.45, 0.52) });

  tocPage.drawLine({
    start: { x: 45, y: startY - 8 },
    end: { x: pW - 45, y: startY - 8 },
    thickness: 0.8,
    color: rgb(0.8, 0.82, 0.85),
  });

  const rowHeight = 28;
  const pages = masterDoc.getPages(); // Note: index 0 is TOC page, entries point to target pages

  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx];
    const rowY = startY - 24 - idx * rowHeight;
    if (rowY < 45) break; // Don't overflow bottom margin

    // Target page reference: entry.targetPageIndex + 1 (since TOC page was inserted at 0)
    const targetPageIdx = Math.min(pages.length - 1, entry.targetPageIndex + 1);
    const targetPage = pages[targetPageIdx];

    // Serial No
    tocPage.drawText(String(idx + 1).padStart(2, "0"), {
      x: 52,
      y: rowY + 3,
      size: 9.5,
      font: fontMono,
      color: rgb(0.45, 0.5, 0.55),
    });

    // Truncate title if needed
    const maxTitleLen = 50;
    const cleanTitle = entry.title.length > maxTitleLen ? entry.title.substring(0, maxTitleLen) + "..." : entry.title;

    tocPage.drawText(cleanTitle, {
      x: 95,
      y: rowY + 3,
      size: 10,
      font: fontBold,
      color: rgb(0.12, 0.15, 0.2),
    });

    // Dotted leader line
    const titleWidth = fontBold.widthOfTextAtSize(cleanTitle, 10);
    const leaderStartX = 95 + titleWidth + 10;
    const leaderEndX = pW - 115;
    if (leaderEndX > leaderStartX) {
      tocPage.drawLine({
        start: { x: leaderStartX, y: rowY + 6 },
        end: { x: leaderEndX, y: rowY + 6 },
        thickness: 0.75,
        color: rgb(0.75, 0.77, 0.8),
        dashArray: [2, 3],
      });
    }

    // Page number text
    const displayPage = String(entry.pageDisplayNumber);
    tocPage.drawText(displayPage, {
      x: pW - 85,
      y: rowY + 3,
      size: 10,
      font: fontBold,
      color: rgb(0.12, 0.15, 0.2),
    });

    // ATTACH REAL INTERNAL GOTO LINK ANNOTATION
    // Rect coordinates in PDF: [x1, y1, x2, y2]
    const linkRect = [45, rowY - 5, pW - 45, rowY + 18];
    const linkAnnot = masterDoc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: linkRect,
      Border: [0, 0, 0],
      Dest: [targetPage.ref, "Fit"],
    });

    const linkAnnotRef = masterDoc.context.register(linkAnnot);
    tocPage.node.addAnnot(linkAnnotRef);
  }

  // Footer Note
  tocPage.drawText("⚡ Interactive Document Index • Click any row above to jump directly to that chapter", {
    x: 50,
    y: 25,
    size: 8,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.55),
  });

  return await masterDoc.save();
}

/**
 * Combines up to 30 individual chapter PDFs into a single master PDF with a clickable Table of Contents
 */
export async function combinePdfsWithClickableToc(
  files: Array<{ name: string; buffer: ArrayBuffer }>,
  options: TocOptions
): Promise<Uint8Array> {
  const masterDoc = await PDFDocument.create();
  const entries: TocEntry[] = [];
  let currentPageOffset = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeBuf = toSafeArrayBuffer(file.buffer);
    const subDoc = await PDFDocument.load(safeBuf, { ignoreEncryption: true });
    const subPages = await masterDoc.copyPages(subDoc, subDoc.getPageIndices());

    // Clean title from filename (e.g., "01_Introduction_To_AI.pdf" -> "Introduction To AI")
    const cleanTitle = file.name
      .replace(/\.pdf$/i, "")
      .replace(/^[\d_ -]+/, "")
      .replace(/[_-]+/g, " ")
      .trim();

    entries.push({
      title: cleanTitle || `Chapter ${i + 1}`,
      targetPageIndex: currentPageOffset,
      pageDisplayNumber: currentPageOffset + 2, // Accounting for TOC at Page 1
    });

    subPages.forEach((p) => masterDoc.addPage(p));
    currentPageOffset += subPages.length;
  }

  return await insertClickableToc(masterDoc, entries, options);
}

/**
 * Generates a 3-chapter sample PDF bundle for 1-click TOC testing
 */
export async function generateSampleChapterFiles(): Promise<File[]> {
  const chapters = [
    {
      title: "01_System_Architecture_Overview.pdf",
      heading: "CHAPTER 1: SYSTEM ARCHITECTURE & HIGH-LEVEL DESIGN",
      content:
        "This chapter outlines the modular architecture of the VeloDoc in-memory document processing pipeline.\nAll transformations execute inside client sandboxed WebAssembly execution contexts, ensuring zero exfiltration of sensitive telemetry.",
    },
    {
      title: "02_Ensemble_Learning_Methodology.pdf",
      heading: "CHAPTER 2: ENSEMBLE LEARNING & MODEL FINE-TUNING",
      content:
        "Bagging and Boosting paradigms represent complementary approaches to bias-variance trade-offs in modern machine learning.\nHere we evaluate gradient-boosted decision trees against random forest benchmarks under high-noise distributions.",
    },
    {
      title: "03_Performance_Evaluation_Results.pdf",
      heading: "CHAPTER 3: EXPERIMENTAL EVALUATION & RESULTS",
      content:
        "Throughput benchmarks demonstrate a 4.2x reduction in pipeline processing latency compared to traditional round-trip HTTP cloud converters.\nAccuracy across OCR character recognition was measured at 99.4% on high-DPI scans.",
    },
  ];

  const files: File[] = [];

  for (const ch of chapters) {
    const doc = await PDFDocument.create();
    const page = doc.addPage(PageSizes.A4);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontReg = await doc.embedFont(StandardFonts.Helvetica);

    page.drawText(ch.heading, {
      x: 50,
      y: 750,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    page.drawText(ch.content, {
      x: 50,
      y: 680,
      size: 11,
      font: fontReg,
      color: rgb(0.3, 0.35, 0.4),
      lineHeight: 18,
    });

    const bytes = await doc.save();
    files.push(createSafeFile(bytes, ch.title, "application/pdf"));
  }

  return files;
}
