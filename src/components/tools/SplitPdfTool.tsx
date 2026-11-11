"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ThumbnailGrid } from "@/components/common/ThumbnailGrid";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PageThumbnail, ProcessingMetrics } from "@/types";
import {
  renderAllPagesThumbnails,
  splitPdfBurst,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { Scissors, Loader2, AlertCircle } from "lucide-react";

export function SplitPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);

  // 4 Modes: extract, burst-all, every-n, custom-ranges
  const [splitMode, setSplitMode] = useState<
    "extract" | "burst-all" | "every-n" | "custom-ranges"
  >("extract");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [everyNCount, setEveryNCount] = useState<number>(2);
  const [customRangeText, setCustomRangeText] = useState<string>("1-2; 3-4");
  const [mergeRanges, setMergeRanges] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [outputMimeType, setOutputMimeType] = useState<string>("application/pdf");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chained file ingestion
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
    setSelectedIndices(new Set());
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
      setThumbnails(thumbs);
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error("Error reading PDF thumbnails:", err);
      setErrorMessage("Failed to read PDF pages.");
      item.status = "error";
      setFileItem({ ...item });
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApplyRange = (rangeStr: string) => {
    const next = new Set(selectedIndices);
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
    setSelectedIndices(next);
  };

  const handleProcess = async () => {
    if (!fileItem || !originalBuffer) return;

    if (splitMode === "extract" && selectedIndices.size === 0) {
      setErrorMessage("Please select at least one page to extract.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
      const res = await splitPdfBurst(originalBuffer, splitMode, {
        selectedIndices: sortedIndices,
        nPages: everyNCount,
        customRanges: customRangeText,
        mergeRangesIntoOne: mergeRanges,
      });

      const endTime = performance.now();
      const durationMs = endTime - startTime;
      const downloadUrl = URL.createObjectURL(res.blob);
      const buf = await res.blob.arrayBuffer();
      const bytes = new Uint8Array(buf);

      setOutputBytes(bytes);
      setOutputMimeType(res.mimeType);

      let pageCount = fileItem.pageCount || 1;
      if (splitMode === "extract") pageCount = sortedIndices.length;

      setMetrics({
        originalSize: fileItem.size,
        processedSize: res.blob.size,
        savedBytes: Math.max(0, fileItem.size - res.blob.size),
        savedPercentage: Math.round(
          (Math.max(0, fileItem.size - res.blob.size) / fileItem.size) * 100
        ),
        durationMs,
        downloadUrl,
        downloadFilename: res.filename,
        pageCount,
        targetAccuracy: "Precision Split",
      });
    } catch (err: unknown) {
      console.error("Split error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to split PDF."
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
          outputMimeType={outputMimeType}
          title={
            splitMode === "extract"
              ? "Pages Extracted to PDF!"
              : "Split Bundle Packaged Successfully!"
          }
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
              title="Upload PDF to split, burst, or extract pages"
              subtitle="Extract selections, burst every page to ZIP, or split every N pages"
            />
          ) : (
            <div className="space-y-6">
              {/* Header Configuration Panel */}
              <div className="p-5 rounded-3xl bg-[#12141D] border border-white/10 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {fileItem.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {thumbnails.length} total pages rendered • Choose mode below
                    </p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex flex-wrap rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                    {[
                      { id: "extract", label: "Extract Selection" },
                      { id: "burst-all", label: "Burst All to ZIP" },
                      { id: "every-n", label: "Split Every N Pages" },
                      { id: "custom-ranges", label: "Custom Ranges" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSplitMode(m.id as "extract" | "burst-all" | "every-n" | "custom-ranges")}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          splitMode === m.id
                            ? "bg-amber-500 text-white shadow-md"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-mode option parameters */}
                {splitMode === "every-n" && (
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <span>Split document into chunks of:</span>
                    <input
                      type="number"
                      min={1}
                      max={thumbnails.length}
                      value={everyNCount}
                      onChange={(e) =>
                        setEveryNCount(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-20 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white font-mono text-center focus:outline-none focus:border-amber-500"
                    />
                    <span>pages per file</span>
                  </div>
                )}

                {splitMode === "custom-ranges" && (
                  <div className="space-y-2 text-xs">
                    <label className="text-slate-300 font-medium">
                      Enter Range Groups separated by semicolons (e.g. 1-2; 3-4; 5):
                    </label>
                    <input
                      type="text"
                      value={customRangeText}
                      onChange={(e) => setCustomRangeText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={mergeRanges}
                        onChange={(e) => setMergeRanges(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span className="text-slate-400">
                        Merge all specified ranges into one single PDF (instead of separate ZIP files)
                      </span>
                    </label>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={
                      isProcessing ||
                      (splitMode === "extract" && selectedIndices.size === 0)
                    }
                    onClick={handleProcess}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        <span>Execute Split &amp; Preview</span>
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

              {/* Thumbnails */}
              <ThumbnailGrid
                thumbnails={thumbnails}
                mode={splitMode === "extract" ? "select" : "view"}
                selectedIndices={selectedIndices}
                onToggleSelect={handleToggleSelect}
                onApplyRange={splitMode === "extract" ? handleApplyRange : undefined}
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
