import { PDFDocument } from "pdf-lib";
import { getPdfJs } from "@/lib/pdf-engine";
import { yieldToMain } from "@/lib/batch-queue-engine";
import { toSafeArrayBuffer } from "@/lib/utils";

export interface FlattenOptions {
  mode: "vector" | "raster";
  dpi: number; // e.g. 150, 300, 600
  quality: number; // 0.7 to 1.0 for jpeg compression if raster
  purgeAnnotations: boolean;
}

/**
 * 100% In-Browser PDF Flattening Engine
 * Mode 'vector': Freezes fillable form fields and widget layers into permanent vector paths.
 * Mode 'raster': Renders all pages to high-res bitmaps at 150/300/600 DPI, obliterating hidden text and vector layers.
 */
export async function flattenPdf(
  pdfBuffer: ArrayBuffer,
  options: FlattenOptions,
  onProgress?: (progress: number, msg: string) => void
): Promise<Uint8Array> {
  const safeBuffer = toSafeArrayBuffer(pdfBuffer);

  if (options.mode === "vector") {
    onProgress?.(20, "Loading PDF document structure...");
    const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });

    onProgress?.(50, "Freezing interactive form fields and signatures...");
    try {
      const form = pdfDoc.getForm();
      form.flatten();
    } catch {
      // Document might not have any interactive form, which is fine
    }

    if (options.purgeAnnotations) {
      onProgress?.(75, "Purging comments and annotation layers...");
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        try {
          const pageDict = page.node;
          // Clear Annots array if present
          if (pageDict.has(pageDict.context.obj("Annots"))) {
            pageDict.delete(pageDict.context.obj("Annots"));
          }
        } catch {
          // Continue if page dictionary format is varied
        }
      }
    }

    onProgress?.(95, "Compiling tamper-proof document...");
    return await pdfDoc.save({ useObjectStreams: true });
  }

  // Raster mode: high security tamper-proof flat render
  const pdfjs = await getPdfJs();
  if (!pdfjs) {
    throw new Error("PDF renderer could not be initialized.");
  }

  onProgress?.(10, "Initializing high-DPI rasterizer...");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(safeBuffer),
    cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const targetDoc = await PDFDocument.create();
  const scale = options.dpi / 72; // 72 DPI is standard 1.0

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(
      Math.round(15 + ((i - 1) / numPages) * 75),
      `Rasterizing page ${i} of ${numPages} at ${options.dpi} DPI...`
    );

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext("2d", { willReadFrequently: true, alpha: false });
    if (!ctx) throw new Error("Could not acquire 2D canvas context");

    // Fill pure white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport,
    };

    // Render page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page.render(renderContext as any) as any).promise;

    // Convert to image
    const isHighQuality = options.quality >= 0.95;
    const mime = isHighQuality ? "image/png" : "image/jpeg";
    const quality = options.quality;

    const imgBlob: Blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b!), mime, quality);
    });

    // Cleanup canvas
    canvas.width = 1;
    canvas.height = 1;

    const imgBuffer = await imgBlob.arrayBuffer();
    const embeddedImg =
      mime === "image/png"
        ? await targetDoc.embedPng(imgBuffer)
        : await targetDoc.embedJpg(imgBuffer);

    // Points in PDF (72 points per inch)
    const ptWidth = viewport.width / scale;
    const ptHeight = viewport.height / scale;

    const newPage = targetDoc.addPage([ptWidth, ptHeight]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: ptWidth,
      height: ptHeight,
    });

    await yieldToMain();
  }

  onProgress?.(95, "Compiling final rasterized PDF...");
  return await targetDoc.save({ useObjectStreams: true });
}
