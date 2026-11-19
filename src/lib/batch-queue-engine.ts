import {
  BlobReader,
  BlobWriter,
  ZipWriter,
  configure,
} from "@zip.js/zip.js";

configure({
  useWebWorkers: false,
});

/**
 * Universal Offscreen Canvas Recycler to eliminate RAM bloat across 30+ files
 */
class CanvasRecycler {
  private canvasPool: HTMLCanvasElement[] = [];

  acquire(minWidth = 1, minHeight = 1): HTMLCanvasElement {
    if (typeof document === "undefined") {
      throw new Error("Canvas operations are only supported in browser client-side environments.");
    }
    const canvas = this.canvasPool.pop() || document.createElement("canvas");
    canvas.width = minWidth;
    canvas.height = minHeight;
    return canvas;
  }

  release(canvas: HTMLCanvasElement | null | undefined): void {
    if (!canvas) return;
    try {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      // Zero canvas dimension memory
      canvas.width = 1;
      canvas.height = 1;
      if (this.canvasPool.length < 3) {
        this.canvasPool.push(canvas);
      }
    } catch {
      // Ignored if canvas context is lost
    }
  }

  clearPool(): void {
    this.canvasPool.forEach((c) => {
      c.width = 1;
      c.height = 1;
    });
    this.canvasPool = [];
  }
}

export const canvasRecycler = new CanvasRecycler();

/**
 * Object URL lifecycle tracker for safe disposal
 */
const trackedObjectUrls = new Set<string>();

export function trackObjectUrl(url: string): string {
  trackedObjectUrls.add(url);
  return url;
}

export function revokeObjectUrl(url: string): void {
  if (trackedObjectUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    trackedObjectUrls.delete(url);
  }
}

export function revokeAllObjectUrls(): void {
  trackedObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  });
  trackedObjectUrls.clear();
}

export function createSafeObjectUrl(blob: Blob | MediaSource): string {
  const url = URL.createObjectURL(blob);
  return trackObjectUrl(url);
}

/**
 * Event-loop cooperative yield to ensure smooth 60 FPS UI during heavy PDF/image work
 */
export async function yieldToMain(ms = 16): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface BatchQueueOptions<TResult> {
  concurrency?: number;
  onItemProgress?: (index: number, progressPct: number, message?: string) => void;
  onItemComplete?: (index: number, result: TResult) => void;
  onItemError?: (index: number, error: Error) => void;
  signal?: AbortSignal;
}

/**
 * Process up to 30+ items with controlled concurrency pool (default 2)
 * and cooperative event-loop yields between items/chunks.
 */
export async function processBatchQueue<TItem, TResult>(
  items: TItem[],
  task: (
    item: TItem,
    index: number,
    reportProgress: (pct: number, msg?: string) => void,
    signal?: AbortSignal
  ) => Promise<TResult>,
  options: BatchQueueOptions<TResult> = {}
): Promise<(TResult | null)[]> {
  const defaultConcurrency =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ? Math.min(4, Math.max(2, Math.floor(navigator.hardwareConcurrency / 2)))
      : 2;
  const concurrency = Math.max(1, Math.min(options.concurrency ?? defaultConcurrency, 6));
  const results: (TResult | null)[] = new Array(items.length).fill(null);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      if (options.signal?.aborted) {
        throw new DOMException("Batch processing aborted by user.", "AbortError");
      }

      const itemIdx = currentIndex++;
      const item = items[itemIdx];

      try {
        const report = (pct: number, msg?: string) => {
          options.onItemProgress?.(itemIdx, pct, msg);
        };
        report(5, "Starting processing...");
        await yieldToMain(16);

        const res = await task(item, itemIdx, report, options.signal);
        results[itemIdx] = res;
        options.onItemComplete?.(itemIdx, res);
      } catch (err: unknown) {
        if (options.signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          throw err;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`Error processing batch item #${itemIdx}:`, error);
        options.onItemError?.(itemIdx, error);
      } finally {
        await yieldToMain(16);
      }
    }
  }

  const workerPromises: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workerPromises.push(worker());
  }

  await Promise.all(workerPromises);
  return results;
}

/**
 * Bundle multiple output files into a master ZIP archive using @zip.js/zip.js streaming
 */
export async function createBatchZip(
  files: { name: string; blob: Blob }[],
  zipFilename = "velodoc-batch-export.zip",
  onProgress?: (percent: number) => void
): Promise<{ zipBlob: Blob; zipFilename: string }> {
  const blobWriter = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(blobWriter);

  // Deduplicate file names in the zip archive
  const nameCounts = new Map<string, number>();

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let finalName = f.name || "document.pdf";
    const count = nameCounts.get(finalName) || 0;
    if (count > 0) {
      const extDot = finalName.lastIndexOf(".");
      if (extDot !== -1) {
        finalName = `${finalName.slice(0, extDot)}_${count}${finalName.slice(extDot)}`;
      } else {
        finalName = `${finalName}_${count}`;
      }
    }
    nameCounts.set(f.name, count + 1);

    const ext = finalName.split(".").pop()?.toLowerCase() || "";
    const isPreCompressed = ["jpg", "jpeg", "png", "webp", "pdf", "zip", "mp4", "mp3"].includes(ext);

    await zipWriter.add(finalName, new BlobReader(f.blob), {
      level: isPreCompressed ? 0 : 6,
    });

    onProgress?.(Math.round(((i + 1) / files.length) * 100));
  }

  const zipBlob = await zipWriter.close();
  return { zipBlob, zipFilename };
}

/**
 * Checks if File System Access API (direct-to-disk streaming) is available in current browser
 */
export function canStreamDirectToDisk(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

/**
 * Triggers a direct browser file download for a Blob
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
