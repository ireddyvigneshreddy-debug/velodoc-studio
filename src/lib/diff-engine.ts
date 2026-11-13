import { getPdfJs } from "@/lib/pdf-engine";
import { diffLines, diffWords, Change } from "diff";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface DocTextExtraction {
  filename: string;
  pageCount: number;
  pagesText: string[];
  fullText: string;
}

export interface DiffComparisonResult {
  docA: DocTextExtraction;
  docB: DocTextExtraction;
  lineChanges: Change[];
  wordChanges: Change[];
  stats: {
    wordsAdded: number;
    wordsRemoved: number;
    wordsUnchanged: number;
    linesAdded: number;
    linesRemoved: number;
    similarityPercent: number;
  };
}

/**
 * Extract full structured text page-by-page from a PDF buffer
 */
export async function extractPdfTextStructure(
  buffer: ArrayBuffer,
  filename: string
): Promise<DocTextExtraction> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error("PDF parser not available");

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pagesText: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageStrings = content.items.map((item: any) => item.str || "");
    pagesText.push(pageStrings.join(" "));
  }

  return {
    filename,
    pageCount: numPages,
    pagesText,
    fullText: pagesText.join("\n\n--- Page Break ---\n\n"),
  };
}

/**
 * Compare two PDFs textually and compute full diff metrics
 */
export async function comparePdfTexts(
  bufferA: ArrayBuffer,
  filenameA: string,
  bufferB: ArrayBuffer,
  filenameB: string
): Promise<DiffComparisonResult> {
  const [docA, docB] = await Promise.all([
    extractPdfTextStructure(bufferA, filenameA),
    extractPdfTextStructure(bufferB, filenameB),
  ]);

  const lineChanges = diffLines(docA.fullText, docB.fullText);
  const wordChanges = diffWords(docA.fullText, docB.fullText);

  let wordsAdded = 0;
  let wordsRemoved = 0;
  let wordsUnchanged = 0;

  for (const c of wordChanges) {
    const wordCount = c.value.trim().split(/\s+/).filter(Boolean).length;
    if (c.added) wordsAdded += wordCount;
    else if (c.removed) wordsRemoved += wordCount;
    else wordsUnchanged += wordCount;
  }

  let linesAdded = 0;
  let linesRemoved = 0;
  for (const c of lineChanges) {
    const count = c.count || 1;
    if (c.added) linesAdded += count;
    else if (c.removed) linesRemoved += count;
  }

  const totalWords = wordsUnchanged + (wordsAdded + wordsRemoved) / 2;
  const similarityPercent =
    totalWords > 0
      ? Math.max(0, Math.min(100, Math.round((wordsUnchanged / (wordsUnchanged + wordsAdded + wordsRemoved)) * 1000) / 10))
      : 100;

  return {
    docA,
    docB,
    lineChanges,
    wordChanges,
    stats: {
      wordsAdded,
      wordsRemoved,
      wordsUnchanged,
      linesAdded,
      linesRemoved,
      similarityPercent,
    },
  };
}

/**
 * Generate a clean, formal PDF Diff Audit Report
 */
export async function generateDiffAuditReport(result: DiffComparisonResult): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  let y = height - 50;

  // Header Title
  page.drawText("VeloDoc Pro — Document Diff Audit Report", {
    x: 40,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.15),
  });
  y -= 20;

  page.drawText(`Generated: ${new Date().toLocaleString()} (100% In-Browser Private Diff)`, {
    x: 40,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 25;

  // Comparison Summary Box
  page.drawRectangle({
    x: 40,
    y: y - 85,
    width: width - 80,
    height: 95,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.94),
    borderWidth: 1,
  });

  page.drawText(`Original Doc A:  ${result.docA.filename} (${result.docA.pageCount} pages)`, {
    x: 55,
    y: y - 18,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Modified Doc B:  ${result.docB.filename} (${result.docB.pageCount} pages)`, {
    x: 55,
    y: y - 36,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(
    `Similarity Score: ${result.stats.similarityPercent}%  |  +${result.stats.wordsAdded} words added  |  -${result.stats.wordsRemoved} words removed`,
    {
      x: 55,
      y: y - 56,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.8),
    }
  );
  y -= 115;

  // Detailed Changes Section
  page.drawText("Key Changed Sections (Excerpts):", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 20;

  // Print first 40 line diffs
  let displayed = 0;
  for (const change of result.lineChanges) {
    if (displayed >= 45) break;
    if (!change.added && !change.removed) continue;

    const prefix = change.added ? "[+] " : "[-] ";
    const color = change.added ? rgb(0.1, 0.6, 0.2) : rgb(0.8, 0.15, 0.15);
    const lines = change.value.split("\n").filter((l) => l.trim().length > 0);

    for (const line of lines) {
      if (displayed >= 45) break;
      if (y < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }

      const truncated = (prefix + line).substring(0, 95);
      page.drawText(truncated, {
        x: 40,
        y,
        size: 8.5,
        font: fontRegular,
        color,
      });
      y -= 14;
      displayed++;
    }
  }

  if (displayed === 0) {
    page.drawText("No textual differences detected between the two documents.", {
      x: 40,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.6, 0.3),
    });
  }

  return await pdfDoc.save({ useObjectStreams: true });
}
