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

/**
 * Precision binary-search compression engine for PDFs
 */
export async function executeExactCompression(
  pdfBuffer: ArrayBuffer,
  options: ExactCompressionOptions,
  onProgress?: CompressionProgressCallback
): Promise<CompressionResult> {
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
    // If manual mode, run a single direct pass
    if (options.mode === "manual") {
      onProgress?.("Applying manual Pro compression parameters...", 40);
      const dpi = options.manualDpi || 150;
      const quality = options.manualQuality || 0.7;
      const scale = dpi / 72; // 72 DPI is 1x scale

      const compressedBytes = await renderPdfPagesToCompressedDocument(
        pdfDoc,
        totalPages,
        scale,
        quality,
        options.colorMode === "grayscale",
        options.stripMetadata ?? true
      );

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

    // Check physical minimum floor (e.g. 5 KB per page)
    const minimumFloorBytes = totalPages * 5120;
    if (targetBytes < minimumFloorBytes) {
      onProgress?.(
        `Target size is below minimum physical floor (${Math.round(minimumFloorBytes / 1024)} KB). Converging to maximum compression...`,
        10
      );
    }

    // Binary search over composite quality factor q in [0.05, 0.98]
    let lowQ = 0.05;
    let highQ = 0.98;
    let bestBytes: Uint8Array | null = null;
    let bestSize = Infinity;
    let iterations = 0;
    const maxIterations = 6;

    while (iterations < maxIterations && lowQ <= highQ) {
      iterations++;
      const midQ = (lowQ + highQ) / 2;

      // Map q to render scale (0.4 to 1.8) and JPEG quality (0.1 to 0.92)
      const scale = 0.4 + midQ * 1.4;
      const quality = Math.max(0.08, Math.min(0.92, 0.1 + midQ * 0.82));

      const progressMsg = `Iteration ${iterations}/${maxIterations}: Testing scale ${scale.toFixed(
        2
      )}, quality ${Math.round(quality * 100)}%...`;
      onProgress?.(progressMsg, Math.round((iterations / maxIterations) * 85));

      const candidateBytes = await renderPdfPagesToCompressedDocument(
        pdfDoc,
        totalPages,
        scale,
        quality,
        options.colorMode === "grayscale",
        true
      );

      const currentLen = candidateBytes.byteLength;

      if (currentLen <= targetBytes) {
        // Valid candidate within target budget! Save and try to improve quality (higher q)
        bestBytes = candidateBytes;
        bestSize = currentLen;
        lowQ = midQ + 0.05;
      } else {
        // Too large, decrease quality (lower q)
        highQ = midQ - 0.05;
        if (!bestBytes) {
          bestBytes = candidateBytes;
          bestSize = currentLen;
        }
      }
    }

    // If no run met the target, fallback to the lowest possible quality run
    if (!bestBytes) {
      bestBytes = await renderPdfPagesToCompressedDocument(
        pdfDoc,
        totalPages,
        0.4,
        0.1,
        true,
        true
      );
      bestSize = bestBytes.byteLength;
    }

    // Exact Byte Padding Option:
    // If enabled and bestSize is below targetBytes, append harmless PDF comment bytes (%...)
    // right before EOF to match the exact target byte count
    let finalBytes = bestBytes;
    if (options.exactBytePadding && bestSize < targetBytes) {
      const bytesNeeded = targetBytes - bestSize;
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

    onProgress?.("Finalizing optimized PDF stream...", 100, finalSize);

    return {
      pdfBytes: finalBytes,
      originalSize,
      finalSize,
      savedBytes,
      savedPercentage,
      iterationsRun: iterations,
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
 * Internal worker: renders pages to canvas and embeds into a clean PDF document
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderPdfPagesToCompressedDocument(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  totalPages: number,
  scale: number,
  quality: number,
  isGrayscale: boolean,
  stripMetadata: boolean
): Promise<Uint8Array> {
  const newDoc = await PDFDocument.create();

  if (stripMetadata) {
    newDoc.setTitle("");
    newDoc.setAuthor("");
    newDoc.setSubject("");
    newDoc.setKeywords([]);
    newDoc.setProducer("VeloDoc Pro Engine");
    newDoc.setCreator("VeloDoc Pro");
  }

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;

    // Fill white background for JPEG encoding
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Apply Grayscale filter if selected
    if (isGrayscale) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let p = 0; p < data.length; p += 4) {
        const gray = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        data[p] = gray;
        data[p + 1] = gray;
        data[p + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const jpegBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", quality)
    );
    // Explicitly zero canvas backing memory
    canvas.width = 1;
    canvas.height = 1;

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

    await yieldToMain(12);
  }

  return await newDoc.save({ useObjectStreams: true });
}

/**
 * Execute 30-document zero-crash batch compression using the controlled concurrency queue
 */
export async function executeExactCompressionBatch(
  files: { file: File; buffer: ArrayBuffer }[],
  options: ExactCompressionOptions,
  onItemProgress?: (index: number, pct: number, msg?: string) => void,
  onItemComplete?: (index: number, result: CompressionResult) => void
): Promise<{
  results: (CompressionResult | null)[];
  summary: BatchProcessingSummary;
}> {
  const startTime = Date.now();
  let totalOriginal = 0;
  let totalProcessed = 0;

  files.forEach((f) => (totalOriginal += f.buffer.byteLength));

  const results = await processBatchQueue<
    { file: File; buffer: ArrayBuffer },
    CompressionResult
  >(
    files,
    async (item, idx, reportProgress) => {
      const res = await executeExactCompression(
        item.buffer,
        options,
        (msg, pct) => reportProgress(pct, msg)
      );
      return res;
    },
    {
      concurrency: 2,
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
