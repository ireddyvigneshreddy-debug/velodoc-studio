"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ThumbnailGrid } from "@/components/common/ThumbnailGrid";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PageThumbnail, ProcessingMetrics } from "@/types";
import {
  renderAllPagesThumbnails,
  removePages,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { Trash2, Loader2, AlertCircle } from "lucide-react";

export function RemovePagesTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [deleteIndices, setDeleteIndices] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = createPdfBlob(chained.data);
      const file = new File([blob], chained.filename, { type: "application/pdf" });
      handleFileAdded([file]);
    }
  }, []);

  const handleFileAdded = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setErrorMessage(null);
    setDeleteIndices(new Set());
    setMetrics(null);
    setOutputBytes(null);

    const item: UploadedFileItem = {
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
    };
    setFileItem(item);
    setIsLoadingThumbnails(true);

    try {
      const buffer = await file.arrayBuffer();
      setOriginalBuffer(buffer);
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      setRenderProgress({ current: 0, total: count });

      const thumbs = await renderAllPagesThumbnails(
        buffer,
        0.35,
        (current, total) => setRenderProgress({ current, total })
      );
      setThumbnails(thumbs);
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error("Error reading PDF thumbnails:", err);
      setErrorMessage("Failed to render PDF page thumbnails.");
      item.status = "error";
      setFileItem({ ...item });
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const handleToggleDelete = (index: number) => {
    setDeleteIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSelectOdd = () => {
    const next = new Set<number>();
    thumbnails.forEach((_, idx) => {
      if (idx % 2 === 0) next.add(idx); // 0-based: pages 1, 3, 5...
    });
    setDeleteIndices(next);
  };

  const handleSelectEven = () => {
    const next = new Set<number>();
    thumbnails.forEach((_, idx) => {
      if (idx % 2 === 1) next.add(idx); // 0-based: pages 2, 4, 6...
    });
    setDeleteIndices(next);
  };

  const handleInvert = () => {
    const next = new Set<number>();
    thumbnails.forEach((_, idx) => {
      if (!deleteIndices.has(idx)) next.add(idx);
    });
    setDeleteIndices(next);
  };

  const handleApplyRange = (rangeStr: string) => {
    const next = new Set(deleteIndices);
    const parts = rangeStr.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
            if (p >= 1 && p <= thumbnails.length) next.add(p - 1);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= thumbnails.length) next.add(p - 1);
      }
    }
    setDeleteIndices(next);
  };

  const handleRemovePages = async () => {
    if (!fileItem || !originalBuffer) return;
    if (deleteIndices.size === 0) {
      setErrorMessage("Please select at least one page to delete.");
      return;
    }
    if (deleteIndices.size >= thumbnails.length) {
      setErrorMessage("Cannot delete all pages from the PDF document.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const newPdfBytes = await removePages(originalBuffer, Array.from(deleteIndices));
      const endTime = performance.now();

      const blob = createPdfBlob(newPdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const savedBytes = Math.max(0, fileItem.size - newPdfBytes.byteLength);
      const savedPercentage = Math.round((savedBytes / fileItem.size) * 100);
      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(newPdfBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: newPdfBytes.byteLength,
        savedBytes,
        savedPercentage,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_pages_removed.pdf`,
        pageCount: thumbnails.length - deleteIndices.size,
        targetAccuracy: `${thumbnails.length - deleteIndices.size} Pages Retained`,
      });
    } catch (err: unknown) {
      console.error("Remove pages error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to remove pages from PDF."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const remainingPagesCount = thumbnails.length - deleteIndices.size;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          title="Pages Removed Successfully!"
          onAdjustSettings={() => setMetrics(null)}
        />
      ) : (
        <>
          {!fileItem ? (
            <DropZone
              files={[]}
              onFilesAdded={handleFileAdded}
              onRemoveFile={() => {}}
              acceptedFileTypes={{ "application/pdf": [".pdf"] }}
              multiple={false}
              title="Drop PDF to inspect and remove pages"
              subtitle="Click any page thumbnail to mark for instant removal, or use batch filters"
            />
          ) : (
            <div className="space-y-6">
              {/* Document Banner & Batch Actions */}
              <div className="p-5 sm:p-6 rounded-3xl premium-card flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <h3 className="font-semibold text-white text-base">
                    {fileItem.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                    {isLoadingThumbnails
                      ? `Generating visual thumbnails (${renderProgress.current}/${renderProgress.total})...`
                      : `${thumbnails.length} total pages • ${deleteIndices.size} marked for removal • ${remainingPagesCount} pages remaining`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectOdd}
                    className="px-3 py-1.5 rounded-xl text-xs glass-pill hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Select Odd
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectEven}
                    className="px-3 py-1.5 rounded-xl text-xs glass-pill hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Select Even
                  </button>
                  <button
                    type="button"
                    onClick={handleInvert}
                    className="px-3 py-1.5 rounded-xl text-xs glass-pill hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Invert
                  </button>

                  <button
                    type="button"
                    disabled={
                      deleteIndices.size === 0 ||
                      deleteIndices.size >= thumbnails.length ||
                      isProcessing
                    }
                    onClick={handleRemovePages}
                    className="ml-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_24px_rgba(244,63,94,0.4)] hover:shadow-[0_0_32px_rgba(244,63,94,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>
                          Remove {deleteIndices.size}{" "}
                          {deleteIndices.size === 1 ? "Page" : "Pages"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Visual Thumbnail Grid */}
              <ThumbnailGrid
                thumbnails={thumbnails}
                mode="remove"
                selectedIndices={deleteIndices}
                onToggleSelect={handleToggleDelete}
                onApplyRange={handleApplyRange}
                isLoading={isLoadingThumbnails}
                totalPageEstimate={fileItem.pageCount || 0}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
