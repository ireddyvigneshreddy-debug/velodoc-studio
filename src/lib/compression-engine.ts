import { PDFDocument } from "pdf-lib";
import { getPdfJs } from "@/lib/pdf-engine";
import { yieldToMain, processBatchQueue } from "@/lib/batch-queue-engine";
import { BatchProcessingSummary } from "@/types";

export interface CompressionProgressCallback {
  (message: string, percent: number, currentBytes?: number): void;
}

export interface ExactCompressionOptions {
  mode: "exact-size" | "percentage" | "manual";
  targetSizeKb?: number;
  percentageReduction?: number; // 10 to 90
  manualDpi?: number; // 72, 96, 150, 200, 300
  manualQuality?: number; // 0.01 to 1.0
  colorMode?: "full" | "grayscale";
  stripMetadata?: boolean;
  exactBytePadding?: boolean; // Appends safe comment padding to hit exact byte count
}

export interface CompressionResult {
  pdfBytes: Uint8Array;
  originalSize: number;
  finalSize: number;
  savedBytes: number;
  savedPercentage: number;
  iterationsRun: number;
  targetAccuracy: string;
}

interface CanvasBundle {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  isOffscreen: boolean;
  toBlob: (quality: number) => Promise<Blob>;
  destroy: () => void;
}

/**
 * Creates high-performance OffscreenCanvas with fallback to DOM canvas
 */
function createFastCanvas(width: number, height: number): CanvasBundle {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));

  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const offscreen = new OffscreenCanvas(w, h);
      const ctx = offscreen.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        return {
          canvas: offscreen,
          ctx: ctx as OffscreenCanvasRenderingContext2D,
          isOffscreen: true,
          toBlob: async (quality: number) => {
            return await offscreen.convertToBlob({ type: "image/jpeg", quality });
          },
          destroy: () => {
            offscreen.width = 1;
            offscreen.height = 1;
          },
        };
      }
    } catch {
      // Fallback to DOM canvas
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return {
    canvas,
    ctx,
    isOffscreen: false,
    toBlob: (quality: number) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("Canvas toBlob failed"));
          },
          "image/jpeg",
          quality
        );
      }),
    destroy: () => {
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}

/**
 * Renders a single PDF page to JPEG buffer, immediately releasing internal PDF.js page memory
 */
async function renderPageToJpeg(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scale: number,
  quality: number,
  isGrayscale: boolean
): Promise<{ jpegBuffer: ArrayBuffer; width: number; height: number; byteLength: number }> {
  try {
    let effectiveScale = scale;
    const rawViewport = page.getViewport({ scale: effectiveScale });
    const maxDim = Math.max(rawViewport.width, rawViewport.height);
    // Cap canvas rendering dimensions at 2048px on mobile to prevent memory exhaustion
    if (maxDim > 2048) {
      effectiveScale = effectiveScale * (2048 / maxDim);
    }
    const viewport = page.getViewport({ scale: effectiveScale });
    const canvasBundle = createFastCanvas(viewport.width, viewport.height);

    try {
      canvasBundle.ctx.fillStyle = "#FFFFFF";
      canvasBundle.ctx.fillRect(0, 0, viewport.width, viewport.height);

      await page.render({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvasContext: canvasBundle.ctx as any,
        viewport,
      }).promise;

      if (isGrayscale) {
        const imgData = canvasBundle.ctx.getImageData(0, 0, viewport.width, viewport.height);
        const data = imgData.data;
        for (let p = 0; p < data.length; p += 4) {
          const gray = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
          data[p] = gray;
          data[p + 1] = gray;
          data[p + 2] = gray;
        }
        canvasBundle.ctx.putImageData(imgData, 0, 0);
      }

      const blob = await canvasBundle.toBlob(quality);
      const jpegBuffer = await blob.arrayBuffer();

      const origViewport = page.getViewport({ scale: 1.0 });
      return {
        jpegBuffer,
        width: origViewport.width,
        height: origViewport.height,
        byteLength: jpegBuffer.byteLength,
      };
    } finally {
      canvasBundle.destroy();
    }
  } finally {
    // CRITICAL: Clean up PDF.js internal page decoded buffers to prevent memory leaks
    page.cleanup?.();
  }
}

/**
 * Fast Sampling + Analytical Calibration Precision Compression Engine
 * Eliminates redundant multi-pass binary search renders across the full document.
 */
export async function executeExactCompression(
  pdfBuffer: ArrayBuffer,
  options: ExactCompressionOptions,
  onProgress?: CompressionProgressCallback,
  signal?: AbortSignal
): Promise<CompressionResult> {
  if (signal?.aborted) {
    throw new DOMException("Compression aborted by user.", "AbortError");
  }

  const originalSize = pdfBuffer.byteLength;
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error("Browser canvas environment required for compression.");

  // Determine target bytes based on mode
  let targetBytes = originalSize;
  if (options.mode === "exact-size" && options.targetSizeKb) {
    targetBytes = Math.floor(options.targetSizeKb * 1024);
  } else if (options.mode === "percentage" && options.percentageReduction) {
    const fraction = (100 - options.percentageReduction) / 100;
    targetBytes = Math.floor(originalSize * fraction);
  }

  // Load PDF with PDF.js to inspect pages
  const dataCopy = pdfBuffer.slice(0);
  const loadingTask = pdfjs.getDocument({ data: dataCopy });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  try {
    // 1. MANUAL MODE: single pass with user parameters
    if (options.mode === "manual") {
      onProgress?.("Applying manual Pro compression parameters...", 15);
      const dpi = options.manualDpi || 150;
      const quality = options.manualQuality || 0.7;
      const scale = dpi / 72; // 72 DPI is 1x scale

      const newDoc = await PDFDocument.create();
      if (options.stripMetadata ?? true) {
        newDoc.setTitle("");
        newDoc.setAuthor("");
        newDoc.setSubject("");
        newDoc.setKeywords([]);
        newDoc.setProducer("VeloDoc Pro Engine");
        newDoc.setCreator("VeloDoc Pro");
      }

      for (let i = 1; i <= totalPages; i++) {
        if (signal?.aborted) {
          throw new DOMException("Compression aborted by user.", "AbortError");
        }
        const page = await pdfDoc.getPage(i);
        const rendered = await renderPageToJpeg(
          page,
          scale,
          quality,
          options.colorMode === "grayscale"
        );
        const embeddedImg = await newDoc.embedJpg(rendered.jpegBuffer);
        const newPage = newDoc.addPage([rendered.width, rendered.height]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: rendered.width,
          height: rendered.height,
        });

        const pct = Math.round((i / totalPages) * 90);
        onProgress?.(`Processing page ${i} of ${totalPages}...`, pct);
        await yieldToMain(8);
      }

      const compressedBytes = await newDoc.save({ useObjectStreams: true });
      const finalSize = compressedBytes.byteLength;
      const savedBytes = Math.max(0, originalSize - finalSize);
      const savedPercentage = Math.round((savedBytes / originalSize) * 100);

      return {
        pdfBytes: compressedBytes,
        originalSize,
        finalSize,
        savedBytes,
        savedPercentage,
        iterationsRun: 1,
        targetAccuracy: "Manual Pro Execution",
      };
    }

    // 2. FAST SAMPLING & ANALYTICAL CALIBRATION:
    // Sample 2-3 representative pages (first, middle, last) to measure actual bytes/pixel
    const sampleIndices: number[] = [];
    if (totalPages <= 3) {
      for (let i = 1; i <= totalPages; i++) sampleIndices.push(i);
    } else {
      sampleIndices.push(1);
      sampleIndices.push(Math.floor(totalPages / 2));
      sampleIndices.push(totalPages);
    }

    onProgress?.("Sampling representative pages for analytical calibration...", 10);
    let sampleTotalBytes = 0;
    for (const pageIdx of sampleIndices) {
      if (signal?.aborted) {
        throw new DOMException("Compression aborted by user.", "AbortError");
      }
      const page = await pdfDoc.getPage(pageIdx);
      const sample = await renderPageToJpeg(
        page,
        0.85,
        0.60,
        options.colorMode === "grayscale"
      );
      sampleTotalBytes += sample.byteLength;
      await yieldToMain(4);
    }

    const avgSampleBytesPerPage = sampleTotalBytes / sampleIndices.length;
    // Estimate document overhead (~300 bytes/page + 2KB table catalog overhead)
    const docOverheadBytes = totalPages * 300 + 2048;
    const availableContentBytes = Math.max(totalPages * 1024, targetBytes - docOverheadBytes);
    const estimatedFullDocBytes = avgSampleBytesPerPage * totalPages;
    const ratio = availableContentBytes / Math.max(1, estimatedFullDocBytes);

    // Analytically derive starting scale and quality
    let initialScale = 0.85;
    let initialQuality = 0.60;

    if (ratio >= 1.25) {
      initialScale = Math.min(1.4, 0.85 * Math.sqrt(Math.min(2.0, ratio)));
      initialQuality = Math.min(0.88, 0.60 * Math.pow(ratio, 0.3));
    } else if (ratio < 1.0) {
      const factor = Math.max(0.12, Math.min(0.95, ratio));
      initialScale = Math.max(0.38, Math.min(1.0, 0.85 * Math.sqrt(factor)));
      initialQuality = Math.max(0.08, Math.min(0.75, 0.60 * Math.pow(factor, 0.45)));
    }

    // 3. SINGLE FULL-DOCUMENT PASS WITH CLOSED-LOOP REGULATION:
    onProgress?.("Rendering and assembling optimized PDF in single pass...", 25);
    const newDoc = await PDFDocument.create();
    if (options.stripMetadata ?? true) {
      newDoc.setTitle("");
      newDoc.setAuthor("");
      newDoc.setSubject("");
      newDoc.setKeywords([]);
      newDoc.setProducer("VeloDoc Pro Engine");
      newDoc.setCreator("VeloDoc Pro");
    }

    let remainingBudget = availableContentBytes;
    let currentQuality = initialQuality;
    let currentScale = initialScale;

    for (let i = 1; i <= totalPages; i++) {
      if (signal?.aborted) {
        throw new DOMException("Compression aborted by user.", "AbortError");
      }

      const pagesLeft = totalPages - i + 1;
      const targetForThisPage = remainingBudget / pagesLeft;

      const page = await pdfDoc.getPage(i);
      const rendered = await renderPageToJpeg(
        page,
        currentScale,
        currentQuality,
        options.colorMode === "grayscale"
      );

      remainingBudget -= rendered.byteLength;

      // Closed-loop per-page budget regulation for remaining pages:
      if (pagesLeft > 1) {
        const newTargetPerPage = remainingBudget / (pagesLeft - 1);
        const deviation = newTargetPerPage / Math.max(1, targetForThisPage);
        if (deviation < 0.85) {
          // Running over budget: decrease quality slightly for upcoming pages
          currentQuality = Math.max(0.08, currentQuality * 0.92);
          if (deviation < 0.65) {
            currentScale = Math.max(0.35, currentScale * 0.94);
          }
        } else if (deviation > 1.25 && currentQuality < 0.85) {
          // Running under budget: slight bump to maximize quality
          currentQuality = Math.min(0.88, currentQuality * 1.05);
        }
      }

      const embeddedImg = await newDoc.embedJpg(rendered.jpegBuffer);
      const newPage = newDoc.addPage([rendered.width, rendered.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: rendered.width,
        height: rendered.height,
      });

      const progressPercent = Math.min(96, 25 + Math.round((i / totalPages) * 70));
      onProgress?.(
        `Optimizing page ${i} of ${totalPages} (${Math.round(rendered.byteLength / 1024)} KB)...`,
        progressPercent
      );

      await yieldToMain(8);
    }

    onProgress?.("Packaging optimized PDF stream...", 97);
    const compressedBytes = await newDoc.save({ useObjectStreams: true });
    let finalBytes = compressedBytes;
    const prePadSize = finalBytes.byteLength;

    // Exact Byte Padding Option:
    // Only applied if explicitly requested AND file is smaller than target
    if (options.exactBytePadding && prePadSize < targetBytes) {
      const bytesNeeded = targetBytes - prePadSize;
      if (bytesNeeded > 10) {
        const paddingStr = `\n%VELODOC_EXACT_PAD_${"X".repeat(Math.max(0, bytesNeeded - 25))}\n`;
        const enc = new TextEncoder();
        const padBytes = enc.encode(paddingStr);
        const padded = new Uint8Array(finalBytes.length + padBytes.length);
        padded.set(finalBytes, 0);
        padded.set(padBytes, finalBytes.length);
        finalBytes = padded;
      }
    }

    const finalSize = finalBytes.byteLength;
    const savedBytes = Math.max(0, originalSize - finalSize);
    const savedPercentage = Math.round((savedBytes / originalSize) * 100);

    const diffFromTarget = Math.abs(finalSize - targetBytes);
    const accuracyPct = Math.max(
      0,
      100 - (diffFromTarget / (targetBytes || 1)) * 100
    ).toFixed(1);

    onProgress?.("Compression complete!", 100, finalSize);

    return {
      pdfBytes: finalBytes,
      originalSize,
      finalSize,
      savedBytes,
      savedPercentage,
      iterationsRun: 1, // Single fast calibrated pass!
      targetAccuracy: `Exact Target (${accuracyPct}% Match)`,
    };
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
 * Execute 30-document zero-crash batch compression using the controlled concurrency queue
 */
export async function executeExactCompressionBatch(
  files: { file: File; buffer?: ArrayBuffer }[],
  options: ExactCompressionOptions,
  onItemProgress?: (index: number, pct: number, msg?: string) => void,
  onItemComplete?: (index: number, result: CompressionResult) => void,
  signal?: AbortSignal
): Promise<{
  results: (CompressionResult | null)[];
  summary: BatchProcessingSummary;
}> {
  const startTime = Date.now();
  let totalOriginal = 0;
  let totalProcessed = 0;

  files.forEach((f) => (totalOriginal += f.buffer ? f.buffer.byteLength : f.file.size));

  const results = await processBatchQueue<
    { file: File; buffer?: ArrayBuffer },
    CompressionResult
  >(
    files,
    async (item, idx, reportProgress, batchSignal) => {
      const buf = item.buffer || (await item.file.arrayBuffer());
      const res = await executeExactCompression(
        buf,
        options,
        (msg, pct) => reportProgress(pct, msg),
        batchSignal || signal
      );
      return res;
    },
    {
      concurrency: 2,
      signal,
      onItemProgress,
      onItemComplete: (idx, res) => {
        totalProcessed += res.finalSize;
        onItemComplete?.(idx, res);
      },
    }
  );

  const durationMs = Date.now() - startTime;
  const totalSaved = Math.max(0, totalOriginal - totalProcessed);
  const overallSavedPct = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

  return {
    results,
    summary: {
      totalFiles: files.length,
      completedFiles: results.filter(Boolean).length,
      successfulFiles: results.filter(Boolean).length,
      failedFiles: results.filter((r) => r === null).length,
      totalOriginalSize: totalOriginal,
      totalProcessedSize: totalProcessed,
      totalSavedBytes: totalSaved,
      overallSavedPercentage: overallSavedPct,
      totalDurationMs: durationMs,
      durationMs,
    },
  };
}
