"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ThumbnailGrid, PageControlAction } from "@/components/common/ThumbnailGrid";
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
import { RotateCw, Loader2, AlertCircle, Undo2 } from "lucide-react";

interface InternalPageItem extends PageThumbnail {
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

      const thumbs = await renderAllPagesThumbnails(buffer, 0.35);
      const internalItems: InternalPageItem[] = thumbs.map((th, idx) => ({
        ...th,
        originalIndex: idx,
        rotationDelta: 0,
      }));
      setPages(internalItems);
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to load PDF pages.");
      item.status = "error";
      setFileItem({ ...item });
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const handlePageAction = (action: PageControlAction) => {
    const { type, index } = action;

    setPages((prev) => {
      const next = [...prev];
      if (type === "move-left" && index > 0) {
        const temp = next[index];
        next[index] = next[index - 1];
        next[index - 1] = temp;
      } else if (type === "move-right" && index < next.length - 1) {
        const temp = next[index];
        next[index] = next[index + 1];
        next[index + 1] = temp;
      } else if (type === "rotate-cw") {
        next[index] = {
          ...next[index],
          rotationDelta: (next[index].rotationDelta + 90) % 360,
          rotation: ((next[index].rotation || 0) + 90) % 360,
        };
      } else if (type === "rotate-ccw") {
        next[index] = {
          ...next[index],
          rotationDelta: (next[index].rotationDelta + 270) % 360,
          rotation: ((next[index].rotation || 0) + 270) % 360,
        };
      } else if (type === "duplicate") {
        const target = next[index];
        const duplicated: InternalPageItem = {
          ...target,
          pageNumber: next.length + 1,
        };
        next.splice(index + 1, 0, duplicated);
      } else if (type === "delete") {
        if (next.length > 1) {
          next.splice(index, 1);
        }
      }
      return next;
    });
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
              title="Upload PDF to organize, rotate &amp; reorder"
              subtitle="Reorder sequence, rotate 90°/180°, reverse page order, and duplicate pages"
            />
          ) : (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="p-5 rounded-3xl bg-[#12141D] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <h3 className="font-semibold text-white text-base">
                    {fileItem.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {pages.length} pages in current layout • Reorder and rotate visually
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotateAll(90)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Rotate All 90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReverseAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reverse Order</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing || pages.length === 0}
                    onClick={handleSave}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-4 h-4" />
                        <span>Save &amp; Preview PDF</span>
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

              {/* Thumbnails with Organize Controls */}
              <ThumbnailGrid
                thumbnails={pages}
                mode="organize"
                onPageAction={handlePageAction}
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
