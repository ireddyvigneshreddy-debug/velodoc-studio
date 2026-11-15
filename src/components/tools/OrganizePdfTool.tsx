"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { FileArrangerGrid, ArrangerItem } from "@/components/common/FileArrangerGrid";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PageThumbnail, ProcessingMetrics } from "@/types";
import {
  renderAllPagesThumbnails,
  organizePdfPagesExtended,
  getPdfPageCount,
  OrganizePageItem,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { RotateCw, Loader2, AlertCircle, Undo2, Check } from "@/components/common/icons";

interface InternalPageItem extends PageThumbnail {
  id: string;
  originalIndex: number;
  rotationDelta: number;
}

export function OrganizePdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<InternalPageItem[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      const thumbs = await renderAllPagesThumbnails(buffer, 0.4);
      const internalItems: InternalPageItem[] = thumbs.map((th, idx) => ({
        ...th,
        id: `page_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(5)}`,
        originalIndex: idx,
        rotationDelta: 0,
      }));
      setPages(internalItems);
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to load PDF pages. The file may be password-protected or corrupted.");
      item.status = "error";
      setFileItem({ ...item });
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const handleRotateAll = (delta: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotationDelta: (p.rotationDelta + delta) % 360,
        rotation: ((p.rotation || 0) + delta) % 360,
      }))
    );
  };

  const handleReverseAll = () => {
    setPages((prev) => [...prev].reverse());
  };

  const handleReorder = (newItems: ArrangerItem[]) => {
    const map = new Map(pages.map((p) => [p.id, p]));
    const reordered = newItems.map((item) => map.get(item.id)!).filter(Boolean);
    setPages(reordered);
  };

  const handleRotatePage = (id: string, newRotation: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              rotationDelta: newRotation,
              rotation: newRotation,
            }
          : p
      )
    );
  };

  const handleRemovePage = (id: string) => {
    if (pages.length <= 1) {
      setErrorMessage("The document must retain at least 1 page.");
      return;
    }
    setErrorMessage(null);
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDuplicatePage = (id: string) => {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const target = pages[idx];
      const dup: InternalPageItem = {
        ...target,
        id: `page_dup_${Date.now()}_${Math.random().toString(36).substring(5)}`,
        pageNumber: pages.length + 1,
      };
      setPages((prev) => {
        const next = [...prev];
        next.splice(idx + 1, 0, dup);
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!fileItem || !originalBuffer || pages.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const pageItems: OrganizePageItem[] = pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotationDelta: p.rotationDelta,
      }));

      const newPdfBytes = await organizePdfPagesExtended(originalBuffer, pageItems);
      const endTime = performance.now();

      const blob = createPdfBlob(newPdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(newPdfBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: newPdfBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_organized.pdf`,
        pageCount: pages.length,
        targetAccuracy: "Sequence & Rotation Applied",
      });
    } catch (err: unknown) {
      console.error("Organize PDF error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to apply changes to PDF pages."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          title="Pages Reordered and Rotated!"
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
              title="Upload PDF to organize, rotate & reorder"
              subtitle="Reorder sequence, rotate 90°/180°, reverse page order, and duplicate pages"
            />
          ) : (
            <div className="space-y-6">
              {/* Document Status & Quick Actions Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-paper">
                <div>
                  <h3 className="font-semibold text-zinc-950 dark:text-white text-sm sm:text-base font-sans">
                    {fileItem.name}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-mono">
                    {pages.length} pages in current sequence • Drag cards, use arrows, or pick jump numbers
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotateAll(90)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-charcoal-border flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#C2410C] dark:text-orange-400" />
                    <span>Rotate All 90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReverseAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-charcoal-border flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-cyan-400" />
                    <span>Reverse Order</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing || pages.length === 0}
                    onClick={handleSave}
                    className="px-5 py-2 rounded-xl bg-[#C2410C] hover:bg-[#A8370A] disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-paper active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save & Preview PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Visual Interactive Arranger Grid for PDF Pages */}
              {isLoadingThumbnails ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#C2410C] mx-auto" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 font-sans">
                    Rendering high-resolution page thumbnails...
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">
                    Extracting all {fileItem.pageCount || 0} pages in parallel
                  </p>
                </div>
              ) : (
                <FileArrangerGrid
                  items={pages.map((p, idx) => ({
                    id: p.id,
                    name: `Page ${p.originalIndex + 1}`,
                    previewUrl: p.dataUrl,
                    rotation: p.rotationDelta,
                    extraLabel: `Source #${p.originalIndex + 1}`,
                    status: "ready" as const,
                  }))}
                  onReorder={handleReorder}
                  onRotate={handleRotatePage}
                  onRemove={handleRemovePage}
                  onDuplicate={handleDuplicatePage}
                  title="Interactive Page Arranger"
                  subtitle="Drag cards to reorder, use left/right nudge arrows, rotate individual pages 90°, or pick jump numbers."
                  itemTypeLabel="Page"
                  showRotate={true}
                  showDuplicate={true}
                />
              )}
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {fileItem && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-xl border-t border-paper-300 dark:border-charcoal-border md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-800 dark:text-zinc-300 font-mono">
                <span className="font-semibold text-[#C2410C]">{pages.length}</span> pages
              </div>
              <button
                type="button"
                disabled={isProcessing || pages.length === 0}
                onClick={handleSave}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#C2410C] active:bg-[#A8370A] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-paper disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Preview PDF</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}