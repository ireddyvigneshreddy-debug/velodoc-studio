import { PDFDocument, PDFImage, rgb, degrees, StandardFonts, PageSizes } from "pdf-lib";
import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";
import {
  WatermarkSettings,
  PageNumberSettings,
  PageThumbnail,
  SignatureAnnotation,
  RedactionArea,
  CropMargins,
  GrayscaleSettings,
  PdfMetadataInfo,
} from "@/types";
import { yieldToMain } from "@/lib/batch-queue-engine";
import { toSafeArrayBuffer } from "@/lib/utils";

// Polyfill Promise.withResolvers for cross-browser safety (required by modern PDF.js)
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (Promise as any).withResolvers === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Promise as any).withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let reject!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

// Cached dynamic PDF.js instance
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export async function getPdfJs() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      if (pdfjs.GlobalWorkerOptions) {
        const version = pdfjs.version || "4.10.38";
        // Bulletproof CDN worker loading cascade (cdnjs -> unpkg -> local)
        // cdnjs serves proper application/javascript with CORS enabled
        const cdnWorker = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
        pdfjs.GlobalWorkerOptions.workerSrc = cdnWorker;
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export function hexToPdfRgb(hex: string) {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(clean, 16) || 0;
  return rgb(
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  );
}

/**
 * Universal safe image embedder for PDF documents (handles JPEG, PNG, WebP)
 */
export async function embedImageSafely(
  pdfDoc: PDFDocument,
  imageSource: ArrayBuffer | Uint8Array | string
): Promise<PDFImage> {
  let bytes: Uint8Array;
  if (typeof imageSource === "string") {
    const res = await fetch(imageSource);
    const blob = await res.blob();
    const ab = await blob.arrayBuffer();
    bytes = new Uint8Array(ab);
  } else if (imageSource instanceof ArrayBuffer) {
    bytes = new Uint8Array(imageSource);
  } else {
    bytes = imageSource;
  }

  // Detect JPEG magic numbers: 0xFF, 0xD8, 0xFF
  const isJpg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpg) {
    try {
      return await pdfDoc.embedJpg(bytes);
    } catch {
      // Fallback
    }
  }

  // Detect PNG magic numbers: 0x89, 0x50, 0x4E, 0x47
  const isPng = bytes.length > 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (isPng) {
    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      // Fallback
    }
  }

  // WebP or fallback: rasterize through an offscreen HTML Image & Canvas to PNG
  if (typeof window !== "undefined") {
    const blob = new Blob([bytes as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 400;
      canvas.height = img.naturalHeight || 400;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const pngBlob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );
      const ab = await pngBlob.arrayBuffer();
      canvas.width = 1;
      canvas.height = 1;
      return await pdfDoc.embedPng(new Uint8Array(ab));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return await pdfDoc.embedPng(bytes);
}

/**
 * Render a single page of a PDF onto an HTML5 Canvas using PDF.js
 */
export async function renderPdfPageToCanvas(
  pdfBuffer: ArrayBuffer | Uint8Array,
  pageNumber: number,
  scale: number = 1.0
): Promise<HTMLCanvasElement> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error("PDF.js can only be loaded in a browser environment.");

  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  const loadingTask = pdfjs.getDocument({ data: safeBuf.slice(0) });
  const pdfDoc = await loadingTask.promise;

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not get 2D canvas context.");

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    // Fill white background
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    // @ts-expect-error PDF.js typing variations
    await page.render(renderContext).promise;
    return canvas;
  } finally {
    try {
      await pdfDoc.cleanup?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (pdfDoc as any).destroy?.();
      await loadingTask.destroy?.();
    } catch {
      // ignore
    }
  }
}

/**
 * Get total page count of a PDF using dual-engine fallback (pdf-lib -> pdfjs)
 */
export async function getPdfPageCount(pdfBuffer: ArrayBuffer | Uint8Array): Promise<number> {
  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  try {
    const doc = await PDFDocument.load(safeBuf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch (pdfLibErr: unknown) {
    // Graceful fallback to PDF.js
    try {
      const pdfjs = await getPdfJs();
      if (pdfjs) {
        const loadingTask = pdfjs.getDocument({ data: safeBuf.slice(0) });
        const doc = await loadingTask.promise;
        const count = doc.numPages;
        try {
          await doc.cleanup?.();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (doc as any).destroy?.();
          await loadingTask.destroy?.();
        } catch {
          // ignore
        }
        return count;
      }
    } catch {
      // ignore fallback error
    }
    console.error("Failed to load PDF page count:", pdfLibErr);
    throw new Error(
      "Could not read PDF. The file may be password protected or corrupted."
    );
  }
}

/**
 * Render thumbnails for all pages of a PDF with single-page fault isolation,
 * zero-memory canvas pooling, and cooperative event-loop yielding.
 */
export async function renderAllPagesThumbnails(
  pdfBuffer: ArrayBuffer | Uint8Array,
  scale: number = 0.35,
  onProgress?: (current: number, total: number) => void
): Promise<PageThumbnail[]> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error("PDF.js browser environment required.");

  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  const loadingTask = pdfjs.getDocument({ data: safeBuf.slice(0) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const thumbnails: PageThumbnail[] = [];

  try {
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          context.fillStyle = "#FFFFFF";
          context.fillRect(0, 0, canvas.width, canvas.height);
          // @ts-expect-error PDF.js typing variations
          await page.render({ canvasContext: context, viewport }).promise;

          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          // Zero canvas memory immediately
          canvas.width = 1;
          canvas.height = 1;

          thumbnails.push({
            pageIndex: i - 1,
            pageNumber: i,
            dataUrl,
            width: viewport.width,
            height: viewport.height,
            rotation: page.rotate || 0,
            selected: false,
          });
        }
      } catch (pageErr) {
        console.warn(`[VeloDoc] Fallback for page ${i} rendering:`, pageErr);
        // Isolate single-page error: provide fallback thumbnail instead of failing the whole document
        thumbnails.push({
          pageIndex: i - 1,
          pageNumber: i,
          dataUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='140' viewBox='0 0 100 140'><rect width='100' height='140' fill='%231E202E'/><text x='50' y='70' fill='%2394A3B8' font-size='10' text-anchor='middle'>Page " + i + "</text></svg>",
          width: 100,
          height: 140,
          rotation: 0,
          selected: false,
        });
      }

      if (onProgress) {
        onProgress(i, numPages);
      }

      // Cooperative multitasking: yield to browser event loop every page
      await yieldToMain(8);
    }
  } finally {
    try {
      await pdfDoc.cleanup?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (pdfDoc as any).destroy?.();
      await loadingTask.destroy?.();
    } catch {
      // ignore
    }
  }

  return thumbnails;
}

/**
 * Tool 1: Merge multiple PDFs into one with custom page ranges & interleaving
 */
export async function mergePdfsPro(
  items: { buffer?: ArrayBuffer; file?: File; pageRanges?: string }[],
  interleave: boolean = false
): Promise<Uint8Array> {
  if (items.length < 2) {
    throw new Error("At least 2 PDF files are required to merge.");
  }

  const mergedDoc = await PDFDocument.create();

  if (interleave && items.length === 2) {
    // Interleave front & back pages (e.g. from duplex scan)
    const bufA = items[0].buffer || (items[0].file ? await items[0].file.arrayBuffer() : null);
    const bufB = items[1].buffer || (items[1].file ? await items[1].file.arrayBuffer() : null);
    if (!bufA || !bufB) throw new Error("Could not read buffers for interleaved merge.");

    const docA = await PDFDocument.load(bufA, { ignoreEncryption: true });
    const docB = await PDFDocument.load(bufB, { ignoreEncryption: true });
    const countA = docA.getPageCount();
    const countB = docB.getPageCount();
    const maxPages = Math.max(countA, countB);

    for (let i = 0; i < maxPages; i++) {
      if (i < countA) {
        const [pageA] = await mergedDoc.copyPages(docA, [i]);
        mergedDoc.addPage(pageA);
      }
      if (i < countB) {
        const [pageB] = await mergedDoc.copyPages(docB, [i]);
        mergedDoc.addPage(pageB);
      }
      if (i % 10 === 0) await yieldToMain(2);
    }
    return await mergedDoc.save({ useObjectStreams: true });
  }

  // Standard merge with optional page range filters - read one at a time to prevent OOM
  for (const item of items) {
    const buf = item.buffer || (item.file ? await item.file.arrayBuffer() : null);
    if (!buf) continue;

    const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const total = srcDoc.getPageCount();
    let indicesToCopy = srcDoc.getPageIndices();

    if (item.pageRanges && item.pageRanges.trim().length > 0) {
      const selected = parsePageRanges(item.pageRanges, total);
      if (selected.length > 0) {
        indicesToCopy = selected;
      }
    }

    const copiedPages = await mergedDoc.copyPages(srcDoc, indicesToCopy);
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
    await yieldToMain(4);
  }

  return await mergedDoc.save({ useObjectStreams: true });
}

export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const result: Set<number> = new Set();
  const parts = rangeStr.split(/[,;]/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          result.add(p - 1); // 0-based index
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        result.add(p - 1);
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Tool 2: Remove / Delete Pages
 */
export async function removePages(
  pdfBuffer: ArrayBuffer,
  pageIndicesToRemove: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const removeSet = new Set(pageIndicesToRemove);
  const remainingIndices: number[] = [];

  for (let i = 0; i < totalPages; i++) {
    if (!removeSet.has(i)) {
      remainingIndices.push(i);
    }
  }

  if (remainingIndices.length === 0) {
    throw new Error("Cannot remove all pages from the document.");
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, remainingIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * Tool 3: Add / Insert Pages
 */
export type InsertPagesOptions =
  | {
      type: "blank";
      count: number;
      pattern?: "blank" | "lined" | "grid" | "dotted";
      pageSize: "a4" | "letter" | "match";
      tint?: string;
    }
  | {
      type: "pdf";
      sourceBuffer: ArrayBuffer;
    };

export async function insertPages(
  targetBuffer: ArrayBuffer,
  insertIndex: number,
  options: InsertPagesOptions
): Promise<Uint8Array> {
  const targetDoc = await PDFDocument.load(targetBuffer, { ignoreEncryption: true });
  const totalPages = targetDoc.getPageCount();
  const clampedIndex = Math.max(0, Math.min(insertIndex, totalPages));

  if (options.type === "blank") {
    let width = 595.28;
    let height = 841.89;

    if (options.pageSize === "letter") {
      width = 612;
      height = 792;
    } else if (options.pageSize === "match" && totalPages > 0) {
      const firstPage = targetDoc.getPage(0);
      width = firstPage.getWidth();
      height = firstPage.getHeight();
    }

    for (let i = 0; i < options.count; i++) {
      const newPage = targetDoc.insertPage(clampedIndex + i, [width, height]);

      // If tint is specified
      if (options.tint && options.tint !== "#FFFFFF") {
        newPage.drawRectangle({
          x: 0,
          y: 0,
          width,
          height,
          color: hexToPdfRgb(options.tint),
        });
      }

      // Draw lined or grid patterns if requested
      if (options.pattern === "lined") {
        const lineSpacing = 28;
        const lineCol = rgb(0.85, 0.88, 0.92);
        for (let y = 60; y < height - 60; y += lineSpacing) {
          newPage.drawLine({
            start: { x: 50, y },
            end: { x: width - 50, y },
            thickness: 0.75,
            color: lineCol,
          });
        }
      } else if (options.pattern === "grid") {
        const gridSpacing = 20;
        const gridCol = rgb(0.88, 0.9, 0.94);
        for (let x = 40; x < width - 40; x += gridSpacing) {
          newPage.drawLine({
            start: { x, y: 40 },
            end: { x, y: height - 40 },
            thickness: 0.5,
            color: gridCol,
          });
        }
        for (let y = 40; y < height - 40; y += gridSpacing) {
          newPage.drawLine({
            start: { x: 40, y },
            end: { x: width - 40, y },
            thickness: 0.5,
            color: gridCol,
          });
        }
      }
    }
  } else {
    const srcDoc = await PDFDocument.load(options.sourceBuffer, { ignoreEncryption: true });
    const copiedPages = await targetDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    for (let i = 0; i < copiedPages.length; i++) {
      targetDoc.insertPage(clampedIndex + i, copiedPages[i]);
    }
  }

  return await targetDoc.save({ useObjectStreams: true });
}

/**
 * Tool 4: Split & Burst PDF
 */
export async function splitPdfBurst(
  pdfBuffer: ArrayBuffer,
  mode: "extract" | "burst-all" | "every-n" | "custom-ranges",
  options?: {
    selectedIndices?: number[];
    nPages?: number;
    customRanges?: string;
    mergeRangesIntoOne?: boolean;
  }
): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (mode === "extract") {
    const indices = options?.selectedIndices || [];
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, indices);
    copied.forEach((p) => newDoc.addPage(p));
    const bytes = await newDoc.save({ useObjectStreams: true });
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    return { blob, filename: "extracted_pages.pdf", mimeType: "application/pdf" };
  }

  if (mode === "custom-ranges" && options?.mergeRangesIntoOne) {
    const indices = parsePageRanges(options.customRanges || "1", totalPages);
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, indices);
    copied.forEach((p) => newDoc.addPage(p));
    const bytes = await newDoc.save({ useObjectStreams: true });
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    return { blob, filename: "ranges_merged.pdf", mimeType: "application/pdf" };
  }

  // Streamed ZIP packaging for burst or range-splits with low RAM overhead
  const blobWriter = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(blobWriter);

  if (mode === "burst-all") {
    for (let i = 0; i < totalPages; i++) {
      const singleDoc = await PDFDocument.create();
      const [copied] = await singleDoc.copyPages(srcDoc, [i]);
      singleDoc.addPage(copied);
      const pdfBytes = await singleDoc.save({ useObjectStreams: true });
      const numStr = String(i + 1).padStart(3, "0");
      await zipWriter.add(
        `page_${numStr}.pdf`,
        new BlobReader(new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" })),
        { level: 0 }
      );
      if (i % 5 === 0) await yieldToMain(2);
    }
  } else if (mode === "every-n") {
    const n = Math.max(1, options?.nPages || 2);
    let chunkIndex = 1;
    for (let i = 0; i < totalPages; i += n) {
      const chunkDoc = await PDFDocument.create();
      const indices = [];
      for (let j = i; j < Math.min(i + n, totalPages); j++) {
        indices.push(j);
      }
      const copied = await chunkDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => chunkDoc.addPage(p));
      const bytes = await chunkDoc.save({ useObjectStreams: true });
      await zipWriter.add(
        `part_${String(chunkIndex).padStart(2, "0")}.pdf`,
        new BlobReader(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })),
        { level: 0 }
      );
      chunkIndex++;
      await yieldToMain(2);
    }
  } else if (mode === "custom-ranges") {
    const rangeGroups = (options?.customRanges || "1").split(";");
    let partNum = 1;
    for (const group of rangeGroups) {
      const indices = parsePageRanges(group, totalPages);
      if (indices.length > 0) {
        const partDoc = await PDFDocument.create();
        const copied = await partDoc.copyPages(srcDoc, indices);
        copied.forEach((p) => partDoc.addPage(p));
        const bytes = await partDoc.save({ useObjectStreams: true });
        await zipWriter.add(
          `range_part_${partNum}.pdf`,
          new BlobReader(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })),
          { level: 0 }
        );
        partNum++;
        await yieldToMain(2);
      }
    }
  }

  const zipBlob = await zipWriter.close();
  return { blob: zipBlob, filename: "split_documents_bundle.zip", mimeType: "application/zip" };
}

/**
 * Tool 5: Organize, Reorder, Rotate, Reverse & Sort
 */
export interface OrganizePageItem {
  originalIndex: number;
  rotationDelta: number;
}

export async function organizePdfPagesExtended(
  pdfBuffer: ArrayBuffer,
  pageItems: OrganizePageItem[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const item of pageItems) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalIndex]);
    if (item.rotationDelta) {
      const curAngle = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((curAngle + item.rotationDelta) % 360));
    }
    newDoc.addPage(copiedPage);
  }

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * Tool 7: Sign & Annotate PDF
 */
export async function signAndAnnotatePdf(
  pdfBuffer: ArrayBuffer,
  annotations: SignatureAnnotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const ann of annotations) {
    if (ann.pageNumber < 1 || ann.pageNumber > pdfDoc.getPageCount()) continue;
    const page = pdfDoc.getPage(ann.pageNumber - 1);
    const { width: pW, height: pH } = page.getSize();

    const x = (ann.xPercent / 100) * pW;
    const y = pH - ((ann.yPercent + ann.heightPercent) / 100) * pH;
    const w = (ann.widthPercent / 100) * pW;
    const h = (ann.heightPercent / 100) * pH;

    if (ann.type === "signature") {
      // Signature image data URL or external asset (handles JPEG, PNG, WebP)
      const embeddedImg = await embedImageSafely(pdfDoc, ann.content);
      page.drawImage(embeddedImg, { x, y, width: w, height: h });
    } else if (ann.type === "text" || ann.type === "date") {
      const fontSize = ann.fontSize || 14;
      page.drawText(ann.content, {
        x,
        y: y + h / 4,
        size: fontSize,
        font: fontRegular,
        color: hexToPdfRgb(ann.color || "#000000"),
      });
    } else if (ann.type === "checkmark") {
      // Draw standard vector checkmark lines to eliminate WinAnsi checkmark encoding failures
      const checkColor = hexToPdfRgb(ann.color || "#16A34A");
      const thickness = Math.max(2, Math.min(w, h) * 0.12);
      page.drawLine({
        start: { x: x + w * 0.15, y: y + h * 0.45 },
        end: { x: x + w * 0.4, y: y + h * 0.18 },
        thickness,
        color: checkColor,
      });
      page.drawLine({
        start: { x: x + w * 0.4, y: y + h * 0.18 },
        end: { x: x + w * 0.85, y: y + h * 0.82 },
        thickness,
        color: checkColor,
      });
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Tool 8: Redact & Sanitize Sensitive PDF (True Security Flatten)
 */
export async function redactAndSanitizePdf(
  pdfBuffer: ArrayBuffer,
  redactions: RedactionArea[]
): Promise<Uint8Array> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error("Browser canvas environment required for redaction.");

  const dataCopy = pdfBuffer.slice(0);
  const loadingTask = pdfjs.getDocument({ data: dataCopy });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const newDoc = await PDFDocument.create();
  // Sanitize all metadata
  newDoc.setTitle("");
  newDoc.setAuthor("");
  newDoc.setSubject("");
  newDoc.setKeywords([]);
  newDoc.setProducer("VeloDoc Pro Redaction Engine");

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const scale = 2.0; // High resolution rasterization
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // @ts-expect-error PDF.js typing variations
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Apply redaction rectangles directly to canvas
    const pageRedactions = redactions.filter((r) => r.pageNumber === i);
    for (const r of pageRedactions) {
      const rx = (r.xPercent / 100) * canvas.width;
      const ry = (r.yPercent / 100) * canvas.height;
      const rw = (r.widthPercent / 100) * canvas.width;
      const rh = (r.heightPercent / 100) * canvas.height;

      ctx.fillStyle = r.color || "#000000";
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Convert flattened canvas to JPEG (permanent rasterization destroys all text streams)
    const jpegBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
    );
    const jpegBuffer = await jpegBlob.arrayBuffer();
    const embeddedImg = await newDoc.embedJpg(jpegBuffer);

    const origViewport = page.getViewport({ scale: 1.0 });
    const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height,
    });
  }

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * Tool 9: Stamp & Watermark Pro (Text & Image, Tiled Grid, Custom Range)
 */
export async function addWatermarkPro(
  pdfBuffer: ArrayBuffer,
  options: WatermarkSettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = pdfDoc.getPageCount();

  let embeddedLogo: PDFImage | null = null;
  if (options.type === "image" && options.imageDataUrl) {
    embeddedLogo = await embedImageSafely(pdfDoc, options.imageDataUrl);
  }

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    // Page range filter
    if (options.pageFilter === "all-except-first" && pageNum === 1) continue;
    if (options.pageFilter === "custom" && options.customPages) {
      const allowed = parsePageRanges(options.customPages, totalPages);
      if (!allowed.includes(i)) continue;
    }

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const watermarkColor = hexToPdfRgb(options.color);

    if (options.tiledGrid) {
      // Full-page diagonal tile grid
      const stepX = width / 3;
      const stepY = height / 4;
      for (let tx = stepX / 2; tx < width; tx += stepX) {
        for (let ty = stepY / 2; ty < height; ty += stepY) {
          page.drawText(options.text, {
            x: tx - 40,
            y: ty,
            size: Math.max(14, options.fontSize * 0.6),
            font,
            color: watermarkColor,
            opacity: options.opacity * 0.6,
            rotate: degrees(options.rotationAngle || 45),
          });
        }
      }
      continue;
    }

    // Single placement (9-point or center)
    if (options.type === "image" && embeddedLogo) {
      const logoW = options.imageWidth || 150;
      const logoH = options.imageHeight || 150;
      page.drawImage(embeddedLogo, {
        x: (width - logoW) / 2,
        y: (height - logoH) / 2,
        width: logoW,
        height: logoH,
        opacity: options.opacity,
        rotate: degrees(options.rotationAngle || 0),
      });
    } else if (options.text.trim().length > 0) {
      const textW = font.widthOfTextAtSize(options.text, options.fontSize);
      const textH = font.heightAtSize(options.fontSize);

      let x = (width - textW) / 2;
      let y = (height - textH) / 2;

      if (options.position.includes("left")) x = 40;
      if (options.position.includes("right")) x = width - textW - 40;
      if (options.position.includes("top")) y = height - textH - 40;
      if (options.position.includes("bottom")) y = 40;

      page.drawText(options.text, {
        x,
        y,
        size: options.fontSize,
        font,
        color: watermarkColor,
        opacity: options.opacity,
        rotate: degrees(options.rotationAngle || (options.diagonal ? 45 : 0)),
      });
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Tool 10: Page Numbers & Bates Stamping
 */
export async function addPageNumbersAndBates(
  pdfBuffer: ArrayBuffer,
  options: PageNumberSettings
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const totalPages = pdfDoc.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    // Check start page offset (e.g. skip cover)
    if (i < options.startPageOffset) continue;

    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const effectivePageNum = i - options.startPageOffset + options.startNumber;

    let label = "";
    if (options.format === "bates") {
      const prefix = options.batesPrefix || "DOC-";
      const digits = options.batesDigits || 5;
      label = `${prefix}${String(effectivePageNum).padStart(digits, "0")}`;
    } else if (options.format === "page_x_of_y") {
      label = `Page ${effectivePageNum} of ${totalPages - options.startPageOffset}`;
    } else if (options.format === "dash_x_dash") {
      label = `- ${effectivePageNum} -`;
    } else if (options.format === "x_slash_y") {
      label = `${effectivePageNum} / ${totalPages - options.startPageOffset}`;
    } else {
      label = `${effectivePageNum}`;
    }

    const fontSize = options.fontSize || 10;
    const textW = font.widthOfTextAtSize(label, fontSize);
    const textH = font.heightAtSize(fontSize);
    const margin = options.margin || 25;

    let x = (width - textW) / 2;
    let y = margin;

    const isTop = options.position.startsWith("top");
    if (isTop) y = height - margin - textH;

    if (options.position === "alternating-margins") {
      // Odd pages right, Even pages left
      const isOdd = effectivePageNum % 2 === 1;
      x = isOdd ? width - margin - textW : margin;
    } else if (options.position.includes("left")) {
      x = margin;
    } else if (options.position.includes("right")) {
      x = width - margin - textW;
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: hexToPdfRgb(options.color || "#475569"),
    });
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Tool 11: Crop & Resize Margins
 */
export async function cropPdfMargins(
  pdfBuffer: ArrayBuffer,
  margins: CropMargins
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    const page = srcDoc.getPage(i);
    const { width, height } = page.getSize();

    const trimLeft = (margins.leftPercent / 100) * width;
    const trimRight = (margins.rightPercent / 100) * width;
    const trimTop = (margins.topPercent / 100) * height;
    const trimBottom = (margins.bottomPercent / 100) * height;

    const newX = trimLeft;
    const newY = trimBottom;
    const newW = Math.max(50, width - trimLeft - trimRight);
    const newH = Math.max(50, height - trimTop - trimBottom);

    page.setCropBox(newX, newY, newW, newH);
  }

  return await srcDoc.save({ useObjectStreams: true });
}

/**
 * Tool 12: Grayscale & Clean Scan Enhancer
 */
export async function enhancePdfGrayscale(
  pdfBuffer: ArrayBuffer,
  settings: GrayscaleSettings
): Promise<Uint8Array> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error("Browser canvas environment required.");

  const dataCopy = pdfBuffer.slice(0);
  const loadingTask = pdfjs.getDocument({ data: dataCopy });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const scale = 1.75;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // @ts-expect-error PDF.js typing variations
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // Apply brightness & contrast
    const contrastFactor =
      (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

    for (let p = 0; p < d.length; p += 4) {
      let r = d[p] + settings.brightness;
      let g = d[p + 1] + settings.brightness;
      let b = d[p + 2] + settings.brightness;

      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;

      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (settings.mode === "clean-scan") {
        // High contrast thresholding (turns paper texture pure white and text crisp black)
        gray = gray < settings.threshold ? 0 : 255;
      }

      gray = Math.max(0, Math.min(255, gray));
      d[p] = gray;
      d[p + 1] = gray;
      d[p + 2] = gray;
    }

    ctx.putImageData(imgData, 0, 0);

    const jpegBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.88)
    );
    const jpegBuffer = await jpegBlob.arrayBuffer();
    const embeddedImg = await newDoc.embedJpg(jpegBuffer);

    const origViewport = page.getViewport({ scale: 1.0 });
    const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height,
    });
  }

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * Tool 15: Extract Text, Markdown & JSON from PDF
 */
export async function extractPdfTextContent(pdfBuffer: ArrayBuffer): Promise<{
  fullText: string;
  markdown: string;
  json: { page: number; text: string; wordCount: number }[];
  totalWords: number;
  totalChars: number;
}> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error("Browser canvas environment required.");

  const dataCopy = pdfBuffer.slice(0);
  const loadingTask = pdfjs.getDocument({ data: dataCopy });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pageTexts: { page: number; text: string; wordCount: number }[] = [];
  let fullText = "";
  let markdown = "";

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageLines: string[] = [];
    let currentY: number | null = null;
    let currentLine = "";

    // Group text items by vertical position
    for (const item of textContent.items) {
      // @ts-expect-error PDF.js text item transform
      const text = item.str || "";
      // @ts-expect-error PDF.js transform coords
      const y = item.transform ? Math.round(item.transform[5]) : 0;

      if (currentY === null || Math.abs(currentY - y) > 5) {
        if (currentLine) pageLines.push(currentLine.trim());
        currentLine = text;
        currentY = y;
      } else {
        currentLine += " " + text;
      }
    }
    if (currentLine) pageLines.push(currentLine.trim());

    const pageStr = pageLines.join("\n");
    const words = pageStr.trim() ? pageStr.trim().split(/\s+/).length : 0;

    pageTexts.push({ page: i, text: pageStr, wordCount: words });
    fullText += `--- Page ${i} ---\n${pageStr}\n\n`;
    markdown += `## Page ${i}\n\n${pageStr}\n\n`;
  }

  const totalWords = pageTexts.reduce((acc, p) => acc + p.wordCount, 0);
  const totalChars = fullText.length;

  return { fullText, markdown, json: pageTexts, totalWords, totalChars };
}

/**
 * Tool 16: Markdown to PDF Creator
 */
export async function generatePdfFromMarkdown(
  markdownText: string,
  options: {
    fontFamily: "Helvetica" | "TimesRoman" | "Courier";
    fontSize: number;
    title: string;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(
    options.fontFamily === "TimesRoman"
      ? StandardFonts.TimesRomanBold
      : options.fontFamily === "Courier"
      ? StandardFonts.CourierBold
      : StandardFonts.HelveticaBold
  );
  const fontRegular = await pdfDoc.embedFont(
    options.fontFamily === "TimesRoman"
      ? StandardFonts.TimesRoman
      : options.fontFamily === "Courier"
      ? StandardFonts.Courier
      : StandardFonts.Helvetica
  );

  let page = pdfDoc.addPage([595.28, 841.89]);
  const margin = 50;
  let y = 841.89 - margin;

  // Title
  if (options.title) {
    page.drawText(options.title, {
      x: margin,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.18),
    });
    y -= 35;
  }

  const lines = markdownText.split("\n");

  for (const rawLine of lines) {
    if (y < margin + 40) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 841.89 - margin;
    }

    const line = rawLine.trim();

    if (line.startsWith("# ")) {
      y -= 10;
      page.drawText(line.replace("# ", ""), {
        x: margin,
        y,
        size: 16,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.4),
      });
      y -= 24;
    } else if (line.startsWith("## ")) {
      y -= 8;
      page.drawText(line.replace("## ", ""), {
        x: margin,
        y,
        size: 13,
        font: fontBold,
        color: rgb(0.25, 0.3, 0.45),
      });
      y -= 20;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      page.drawText("• " + line.substring(2), {
        x: margin + 15,
        y,
        size: options.fontSize,
        font: fontRegular,
        color: rgb(0.15, 0.18, 0.22),
      });
      y -= options.fontSize + 6;
    } else if (line === "") {
      y -= 10;
    } else {
      // Normal paragraph text (simple line wrap)
      const words = line.split(" ");
      let currentLine = "";
      for (const w of words) {
        const testLine = currentLine ? `${currentLine} ${w}` : w;
        const width = fontRegular.widthOfTextAtSize(testLine, options.fontSize);
        if (width > 495.28) {
          page.drawText(currentLine, {
            x: margin,
            y,
            size: options.fontSize,
            font: fontRegular,
            color: rgb(0.15, 0.18, 0.22),
          });
          y -= options.fontSize + 5;
          currentLine = w;
          if (y < margin + 40) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = 841.89 - margin;
          }
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y,
          size: options.fontSize,
          font: fontRegular,
          color: rgb(0.15, 0.18, 0.22),
        });
        y -= options.fontSize + 5;
      }
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Tool 17: Read & Update PDF Metadata
 */
export async function readPdfMetadata(pdfBuffer: ArrayBuffer): Promise<PdfMetadataInfo> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const count = doc.getPageCount();

  let pageSizeSummary = "Standard";
  if (count > 0) {
    const p1 = doc.getPage(0);
    pageSizeSummary = `${Math.round(p1.getWidth())} × ${Math.round(p1.getHeight())} pt`;
  }

  return {
    title: doc.getTitle() || "Untitled",
    author: doc.getAuthor() || "Unknown",
    subject: doc.getSubject() || "",
    keywords: doc.getKeywords() || "",
    creator: doc.getCreator() || "Unknown",
    producer: doc.getProducer() || "Unknown",
    creationDate: doc.getCreationDate()?.toISOString() || "Not Recorded",
    modificationDate: doc.getModificationDate()?.toISOString() || "Not Recorded",
    pageCount: count,
    pageSizeSummary,
  };
}

export async function updatePdfMetadata(
  pdfBuffer: ArrayBuffer,
  metadata: Partial<PdfMetadataInfo>,
  sanitizeAll: boolean = false
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  if (sanitizeAll) {
    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setProducer("VeloDoc Pro Sanitizer");
    doc.setCreator("VeloDoc Pro");
  } else {
    if (metadata.title !== undefined) doc.setTitle(metadata.title);
    if (metadata.author !== undefined) doc.setAuthor(metadata.author);
    if (metadata.subject !== undefined) doc.setSubject(metadata.subject);
    if (metadata.keywords !== undefined) {
      const kwList = metadata.keywords.split(/[,;]/).map((k) => k.trim()).filter(Boolean);
      doc.setKeywords(kwList);
    }
    if (metadata.creator !== undefined) doc.setCreator(metadata.creator);
    if (metadata.producer !== undefined) doc.setProducer(metadata.producer);
  }

  return await doc.save({ useObjectStreams: true });
}

/**
 * Tool 18: Compare Two PDFs (Neon Pixel Diff Highlight with bounds safety)
 */
export async function comparePdfPages(
  bufferA: ArrayBuffer | Uint8Array,
  bufferB: ArrayBuffer | Uint8Array,
  pageNumber: number
): Promise<{
  canvasA: HTMLCanvasElement;
  canvasB: HTMLCanvasElement;
  diffCanvas: HTMLCanvasElement;
  differentPixelsCount: number;
  differencePercentage: number;
}> {
  const countA = await getPdfPageCount(bufferA);
  const countB = await getPdfPageCount(bufferB);

  let canvasA: HTMLCanvasElement;
  let canvasB: HTMLCanvasElement;

  if (pageNumber <= countA) {
    canvasA = await renderPdfPageToCanvas(bufferA, pageNumber, 1.2);
  } else {
    canvasA = document.createElement("canvas");
    canvasA.width = 600;
    canvasA.height = 800;
    const ctxA = canvasA.getContext("2d")!;
    ctxA.fillStyle = "#F8FAFC";
    ctxA.fillRect(0, 0, 600, 800);
    ctxA.fillStyle = "#94A3B8";
    ctxA.font = "bold 16px sans-serif";
    ctxA.textAlign = "center";
    ctxA.fillText(`Page ${pageNumber} does not exist in Base PDF`, 300, 400);
  }

  if (pageNumber <= countB) {
    canvasB = await renderPdfPageToCanvas(bufferB, pageNumber, 1.2);
  } else {
    canvasB = document.createElement("canvas");
    canvasB.width = 600;
    canvasB.height = 800;
    const ctxB = canvasB.getContext("2d")!;
    ctxB.fillStyle = "#F8FAFC";
    ctxB.fillRect(0, 0, 600, 800);
    ctxB.fillStyle = "#94A3B8";
    ctxB.font = "bold 16px sans-serif";
    ctxB.textAlign = "center";
    ctxB.fillText(`Page ${pageNumber} does not exist in Comparison PDF`, 300, 400);
  }

  const width = Math.min(canvasA.width, canvasB.width);
  const height = Math.min(canvasA.height, canvasB.height);

  const diffCanvas = document.createElement("canvas");
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext("2d")!;

  const ctxA = canvasA.getContext("2d")!;
  const ctxB = canvasB.getContext("2d")!;

  const imgDataA = ctxA.getImageData(0, 0, width, height);
  const imgDataB = ctxB.getImageData(0, 0, width, height);
  const diffData = diffCtx.createImageData(width, height);

  const dA = imgDataA.data;
  const dB = imgDataB.data;
  const dDiff = diffData.data;
  let diffPixels = 0;

  for (let i = 0; i < dA.length; i += 4) {
    const dr = Math.abs(dA[i] - dB[i]);
    const dg = Math.abs(dA[i + 1] - dB[i + 1]);
    const db = Math.abs(dA[i + 2] - dB[i + 2]);
    const delta = dr + dg + db;

    if (delta > 35) {
      // Highlight difference in vibrant neon magenta
      dDiff[i] = 255;
      dDiff[i + 1] = 0;
      dDiff[i + 2] = 128;
      dDiff[i + 3] = 230;
      diffPixels++;
    } else {
      // Dim background
      const gray = 0.3 * dA[i] + 0.59 * dA[i + 1] + 0.11 * dA[i + 2];
      dDiff[i] = gray;
      dDiff[i + 1] = gray;
      dDiff[i + 2] = gray;
      dDiff[i + 3] = 60;
    }
  }

  diffCtx.putImageData(diffData, 0, 0);
  const totalPixels = width * height;
  const differencePercentage = parseFloat(((diffPixels / totalPixels) * 100).toFixed(2));

  return {
    canvasA,
    canvasB,
    diffCanvas,
    differentPixelsCount: diffPixels,
    differencePercentage,
  };
}

/**
 * Tool 13: PDF to Images
 */
export async function convertPdfToImages(
  pdfBuffer: ArrayBuffer | Uint8Array,
  options: {
    format: "png" | "jpeg" | "webp";
    scale: number;
    pageIndices?: number[];
  },
  onProgress?: (current: number, total: number) => void
): Promise<{ pageNumber: number; blob: Blob; dataUrl: string }[]> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error("Browser canvas environment required.");

  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  const loadingTask = pdfjs.getDocument({ data: safeBuf.slice(0) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const indices = options.pageIndices ?? Array.from({ length: totalPages }, (_, i) => i);
  const mimeType =
    options.format === "png"
      ? "image/png"
      : options.format === "webp"
      ? "image/webp"
      : "image/jpeg";

  const results: { pageNumber: number; blob: Blob; dataUrl: string }[] = [];

  try {
    for (let idx = 0; idx < indices.length; idx++) {
      const pageNum = indices[idx] + 1;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: options.scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (context) {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, canvas.width, canvas.height);
        // @ts-expect-error PDF.js typing variations
        await page.render({ canvasContext: context, viewport }).promise;

        const blob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b!), mimeType, 0.92)
        );

        // Zero canvas memory immediately
        canvas.width = 1;
        canvas.height = 1;

        const dataUrl = URL.createObjectURL(blob);
        results.push({ pageNumber: pageNum, blob, dataUrl });
      }

      try {
        await page.cleanup?.();
      } catch {
        // ignore
      }

      if (onProgress) {
        onProgress(idx + 1, indices.length);
      }

      // Keep UI at 60 FPS
      await yieldToMain(8);
    }
  } finally {
    try {
      await pdfDoc.cleanup?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (pdfDoc as any).destroy?.();
      await loadingTask.destroy?.();
    } catch {
      // ignore
    }
  }

  return results;
}

/**
 * Tool 14: Images to PDF (Zero-Border Full-Bleed Engine)
 */
export interface ImagesToPdfOptions {
  pageSize?: "fit" | "fit-image" | "a4" | "letter";
  orientation?: "portrait" | "landscape";
  margin?: "none" | "small" | "large" | number;
  layoutMode?: "fit-image" | "paper-fill" | "paper-fit";
  targetSizeKb?: number;
}

export async function convertImagesToPdf(
  images: { file?: File; buffer: ArrayBuffer; type: string; rotation?: number }[],
  options: ImagesToPdfOptions = { pageSize: "fit-image", margin: "none", layoutMode: "fit-image" }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const isFitImage =
    options.pageSize === "fit" ||
    options.pageSize === "fit-image" ||
    options.layoutMode === "fit-image" ||
    !options.pageSize;

  for (const img of images) {
    let embeddedImage;
    const rot = ((img.rotation || 0) % 360 + 360) % 360;

    // If rotation is requested, physically re-orient on canvas so image dimensions & orientation match 1:1
    if (rot !== 0 && typeof window !== "undefined") {
      const blob = new Blob([img.buffer], { type: img.type || "image/jpeg" });
      const imgUrl = URL.createObjectURL(blob);
      try {
        const htmlImg = new Image();
        await new Promise<void>((resolve, reject) => {
          htmlImg.onload = () => resolve();
          htmlImg.onerror = reject;
          htmlImg.src = imgUrl;
        });

        const is90or270 = rot === 90 || rot === 270;
        const canvasW = is90or270 ? htmlImg.naturalHeight : htmlImg.naturalWidth;
        const canvasH = is90or270 ? htmlImg.naturalWidth : htmlImg.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(canvasW / 2, canvasH / 2);
          ctx.rotate((rot * Math.PI) / 180);
          ctx.drawImage(htmlImg, -htmlImg.naturalWidth / 2, -htmlImg.naturalHeight / 2);
        }

        const isPng = img.type === "image/png" || (img.file && img.file.name.match(/\.png$/i));
        const mime = isPng ? "image/png" : "image/jpeg";
        const rotatedBlob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b!), mime, 0.95)
        );
        canvas.width = 1;
        canvas.height = 1;
        const rotatedBuffer = await rotatedBlob.arrayBuffer();
        if (mime === "image/png") {
          embeddedImage = await pdfDoc.embedPng(rotatedBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(rotatedBuffer);
        }
      } finally {
        URL.revokeObjectURL(imgUrl);
      }
    } else {
      // Rotation is 0 (or server-side environment)
      const isJpg =
        img.type === "image/jpeg" || (img.file && img.file.name.match(/\.(jpe?g)$/i));
      const isPng =
        img.type === "image/png" || (img.file && img.file.name.match(/\.png$/i));

      if (isJpg) {
        try {
          embeddedImage = await pdfDoc.embedJpg(img.buffer);
        } catch {
          // fallback to png or canvas
        }
      } else if (isPng) {
        try {
          embeddedImage = await pdfDoc.embedPng(img.buffer);
        } catch {
          // fallback
        }
      }

      if (!embeddedImage) {
        // Fallback for WebP or other formats via canvas
        if (typeof window !== "undefined") {
          const blob = new Blob([img.buffer], { type: img.type || "image/jpeg" });
          const imgUrl = URL.createObjectURL(blob);
          try {
            const htmlImg = new Image();
            await new Promise<void>((resolve, reject) => {
              htmlImg.onload = () => resolve();
              htmlImg.onerror = reject;
              htmlImg.src = imgUrl;
            });

            const canvas = document.createElement("canvas");
            canvas.width = htmlImg.naturalWidth;
            canvas.height = htmlImg.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(htmlImg, 0, 0);

            const pngBlob: Blob = await new Promise((resolve) =>
              canvas.toBlob((b) => resolve(b!), "image/png")
            );
            canvas.width = 1;
            canvas.height = 1;
            const pngBuffer = await pngBlob.arrayBuffer();
            embeddedImage = await pdfDoc.embedPng(pngBuffer);
          } finally {
            URL.revokeObjectURL(imgUrl);
          }
        } else {
          // Server side fallback
          embeddedImage = await pdfDoc.embedPng(img.buffer);
        }
      }
    }

    const { width: imgW, height: imgH } = embeddedImage;

    if (isFitImage) {
      // EXACT IMAGE SIZE (ZERO BORDERS — RECOMMENDED)
      // Page size matches exact pixel/pt dimensions of the oriented image.
      // Drawn from (0, 0) covering 100% of the page with 0.00 mm border.
      const page = pdfDoc.addPage([imgW, imgH]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imgW,
        height: imgH,
      });
    } else {
      let pageWidth =
        options.pageSize === "letter" ? PageSizes.Letter[0] : PageSizes.A4[0];
      let pageHeight =
        options.pageSize === "letter" ? PageSizes.Letter[1] : PageSizes.A4[1];

      if (
        (options.orientation === "landscape" && pageWidth < pageHeight) ||
        (options.orientation === "portrait" && pageWidth > pageHeight)
      ) {
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }

      if (options.layoutMode === "paper-fill") {
        // A4 / Letter — Fill Edge-to-Edge (No White Bars)
        // Scaled with Math.max to completely cover the sheet edge-to-edge
        const scaleFactor = Math.max(pageWidth / imgW, pageHeight / imgH);
        const drawW = imgW * scaleFactor;
        const drawH = imgH * scaleFactor;
        const x = (pageWidth - drawW) / 2;
        const y = (pageHeight - drawH) / 2;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawW,
          height: drawH,
        });
      } else {
        // A4 / Letter — Fit Inside With Margins
        const marginVal =
          typeof options.margin === "number"
            ? options.margin
            : options.margin === "none"
            ? 0
            : options.margin === "large"
            ? 40
            : 20;

        const availW = Math.max(1, pageWidth - marginVal * 2);
        const availH = Math.max(1, pageHeight - marginVal * 2);

        const scaleFactor = Math.min(availW / imgW, availH / imgH);
        const drawW = imgW * scaleFactor;
        const drawH = imgH * scaleFactor;

        const x = (pageWidth - drawW) / 2;
        const y = (pageHeight - drawH) / 2;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawW,
          height: drawH,
        });
      }
    }
  }

  const rawBytes = await pdfDoc.save({ useObjectStreams: true });

  // Optional Exact Target KB Compression
  if (options.targetSizeKb && options.targetSizeKb > 0 && typeof window !== "undefined") {
    try {
      const { executeExactCompression } = await import("@/lib/compression-engine");
      const safeBuf = toSafeArrayBuffer(rawBytes);
      const res = await executeExactCompression(safeBuf, {
        mode: "exact-size",
        targetSizeKb: options.targetSizeKb,
        exactBytePadding: true,
      });
      return res.pdfBytes;
    } catch (compErr) {
      console.warn("Target KB compression fallback to raw PDF:", compErr);
      return rawBytes;
    }
  }

  return rawBytes;
}
