import { createWorker, Worker } from "tesseract.js";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { getPdfJs } from "@/lib/pdf-engine";

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  lines: Array<{
    text: string;
    confidence: number;
    bbox?: { x0: number; y0: number; x1: number; y1: number };
  }>;
  imageDataUrl?: string;
}

let workerInstance: Worker | null = null;

/**
 * Initializes or returns an existing Vercel-safe Tesseract.js Worker instance
 */
export async function getTesseractWorker(
  onStatusUpdate?: (status: string, progress: number) => void
): Promise<Worker> {
  if (workerInstance) {
    return workerInstance;
  }

  onStatusUpdate?.("Initializing WebAssembly OCR engine...", 5);

  // Vercel-Safe Client-Side Tesseract.js CDN Configuration
  const worker = await createWorker("eng", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
    langPath: "https://tessdata.projectnaptha.com/4.0.0",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
    logger: (m) => {
      if (m.status && typeof m.progress === "number") {
        onStatusUpdate?.(m.status, Math.round(m.progress * 100));
      }
    },
  });

  workerInstance = worker;
  return worker;
}

/**
 * Renders a PDF page to an HTML Canvas element
 */
export async function renderPdfPageToCanvas(
  pdfBuffer: ArrayBuffer,
  pageIndex: number,
  scale = 1.8
): Promise<HTMLCanvasElement> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) {
    throw new Error("PDF.js engine failed to initialize");
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;
  return canvas;
}

/**
 * Performs OCR on an image file or canvas
 */
export async function runOcrOnImage(
  imageSource: File | HTMLCanvasElement | string,
  pageNumber = 1,
  onProgress?: (progress: number, msg: string) => void
): Promise<OcrPageResult> {
  const worker = await getTesseractWorker((status, prog) => {
    onProgress?.(prog, `Page ${pageNumber}: ${status}`);
  });

  let input: any = imageSource;
  let previewDataUrl: string | undefined;

  if (imageSource instanceof HTMLCanvasElement) {
    previewDataUrl = imageSource.toDataURL("image/jpeg", 0.85);
    input = imageSource;
  } else if (imageSource instanceof File) {
    previewDataUrl = URL.createObjectURL(imageSource);
    input = imageSource;
  } else {
    previewDataUrl = imageSource;
    input = imageSource;
  }

  onProgress?.(50, `Recognizing text on page ${pageNumber}...`);
  const ret = await worker.recognize(input);

  const rawLines = (ret.data as any).lines || [];
  const lines = rawLines.map((l: any) => ({
    text: (l.text || "").trim(),
    confidence: l.confidence || 0,
    bbox: l.bbox,
  }));

  return {
    pageNumber,
    text: ret.data.text.trim(),
    confidence: Math.round(ret.data.confidence),
    lines,
    imageDataUrl: previewDataUrl,
  };
}

/**
 * Creates a Searchable Hybrid PDF by embedding an invisible text layer on top of scanned images
 */
export async function createSearchableHybridPdf(
  pages: OcrPageResult[],
  onProgress?: (progress: number, msg: string) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pages.length; i++) {
    const pageData = pages[i];
    onProgress?.(
      Math.round(((i + 1) / pages.length) * 100),
      `Synthesizing searchable layer for page ${i + 1}...`
    );

    // Standard A4 default
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width: pW, height: pH } = page.getSize();

    if (pageData.imageDataUrl) {
      try {
        const imgBytes = await (await fetch(pageData.imageDataUrl)).arrayBuffer();
        const embeddedImg = await pdfDoc.embedJpg(imgBytes);
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: pW,
          height: pH,
        });
      } catch (err) {
        console.warn("Could not embed page image, falling back to clean text page:", err);
      }
    }

    // Embed invisible selectable text layer
    // In pdf-lib, we can render text with opacity 0 (invisible but selectable in PDF readers!)
    const cleanLines = pageData.text.split("\n").filter((l) => l.trim().length > 0);
    const lineSpacing = 14;
    const startY = pH - 40;

    cleanLines.forEach((line, lineIdx) => {
      const y = startY - lineIdx * lineSpacing;
      if (y > 30) {
        page.drawText(line, {
          x: 40,
          y,
          size: 10,
          font: fontRegular,
          color: rgb(0, 0, 0),
          opacity: 0.001, // Invisible selectable text layer
        });
      }
    });
  }

  return await pdfDoc.save();
}

/**
 * Generates a sample scanned-image PDF document for 1-click OCR testing
 */
export async function generateSampleScannedPdf(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d")!;

  // Aged paper tint
  ctx.fillStyle = "#FDFBF7";
  ctx.fillRect(0, 0, 1200, 1600);

  // Subtle scan noise / paper vignette
  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 32px serif";
  ctx.fillText("AFFIDAVIT & ACADEMIC DECLARATION", 100, 140);

  ctx.font = "18px serif";
  ctx.fillStyle = "#334155";
  ctx.fillText("DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING", 100, 180);
  ctx.fillText("INSTITUTE OF AERONAUTICAL ENGINEERING", 100, 210);

  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 230);
  ctx.lineTo(1100, 230);
  ctx.stroke();

  const sampleParagraphs = [
    "I, K. Vignesh Reddy, bearing Hall Ticket Number 26951A6701, hereby declare that the research work entitled 'Bagging and Boosting Fine-Tuning for Ensemble Learning' submitted in partial fulfillment of the requirements for the Degree of Bachelor of Technology is a bonafide record of independent work carried out by me.",
    "The analytical results and machine learning benchmarks presented in this document have not been submitted to any other University or Institute for the award of any degree or diploma.",
    "I further affirm that all third-party citations, open-source libraries, and academic datasets have been duly acknowledged in compliance with institutional integrity regulations.",
    "Date of Verification: 15th November 2026",
    "Place: Hyderabad, Telangana, India",
    "Signature of Candidate: [VERIFIED DIGITAL SUBMISSION]",
  ];

  ctx.font = "20px serif";
  let currentY = 320;
  sampleParagraphs.forEach((p) => {
    // Word wrap
    const words = p.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 1000 && n > 0) {
        ctx.fillText(line, 100, currentY);
        line = words[n] + " ";
        currentY += 36;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 100, currentY);
    currentY += 60;
  });

  // Simulated official stamp
  ctx.strokeStyle = "#1E40AF";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(950, 1200, 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#1E40AF";
  ctx.textAlign = "center";
  ctx.fillText("IARE HYDERABAD", 950, 1180);
  ctx.fillText("ACADEMIC AUDIT", 950, 1205);
  ctx.fillText("VERIFIED", 950, 1230);
  ctx.textAlign = "left";

  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
  return new File([blob], "sample_scanned_affidavit.jpg", { type: "image/jpeg" });
}
