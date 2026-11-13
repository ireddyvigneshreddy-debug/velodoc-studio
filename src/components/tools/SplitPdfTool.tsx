"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PageThumbnail, ProcessingMetrics } from "@/types";
import {
  renderAllPagesThumbnails,
  splitPdfBurst,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  Scissors,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function SplitPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);

  // 5 Modes: visual-scissors, extract, burst-all, every-n, custom-ranges
  const [splitMode, setSplitMode] = useState<
    "visual-scissors" | "extract" | "burst-all" | "every-n" | "custom-ranges"
  >("visual-scissors");

  // Visual Scissors Cut Points (set of 0-based page indices after which a cut occurs)
  // e.g. {1} means cut between page 2 and page 3 -> [1-2], [3-N]
  const [splitPoints, setSplitPoints] = useState<Set<number>>(new Set());

  // Extract mode selection
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
    setSplitPoints(new Set());
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

  const toggleSplitPoint = (pageIndex: number) => {
    setSplitPoints((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
      } else {
        next.add(pageIndex);
      }
      return next;
    });
  };

  const handleToggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Convert visual split points into readable ranges (e.g. 1-2; 3-5; 6-8)
  const getVisualScissorsRanges = (): string => {
    if (thumbnails.length === 0) return "";
    const sortedCuts = Array.from(splitPoints).sort((a, b) => a - b);
    const ranges: string[] = [];
    let startPage = 1;

    for (const cutIndex of sortedCuts) {
      const endPage = cutIndex + 1;
      if (endPage >= startPage) {
        ranges.push(startPage === endPage ? `${startPage}` : `${startPage}-${endPage}`);
        startPage = endPage + 1;
      }
    }

    if (startPage <= thumbnails.length) {
      const endPage = thumbnails.length;
      ranges.push(startPage === endPage ? `${startPage}` : `${startPage}-${endPage}`);
    }

    return ranges.join("; ");
  };

  const handleProcess = async () => {
    if (!fileItem || !originalBuffer) return;

    if (splitMode === "extract" && selectedIndices.size === 0) {
      setErrorMessage("Please select at least one page to extract.");
      return;
    }

    if (splitMode === "visual-scissors" && splitPoints.size === 0) {
      setErrorMessage("Click at least one scissors divider between pages to set a cut point.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);

      let effectiveMode: "extract" | "burst-all" | "every-n" | "custom-ranges" = splitMode as "extract" | "burst-all" | "every-n" | "custom-ranges";
      let rangesToUse = customRangeText;

      if (splitMode === "visual-scissors") {
        effectiveMode = "custom-ranges";
        rangesToUse = getVisualScissorsRanges();
      }

      const res = await splitPdfBurst(originalBuffer, effectiveMode, {
        selectedIndices: sortedIndices,
        nPages: everyNCount,
        customRanges: rangesToUse,
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
        targetAccuracy:
          splitMode === "visual-scissors"
            ? `${splitPoints.size + 1} Segments Split`
            : "Precision Split",
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

  const visualRanges = getVisualScissorsRanges();

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
              : "Split Segments Packaged Successfully!"
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
              subtitle="Interactive visual scissors cut points, burst every page to ZIP, or custom ranges"
            />
          ) : (
            <div className="space-y-6">
              {/* Header Configuration Panel */}
              <div className="p-5 sm:p-6 rounded-3xl premium-card space-y-4 shadow-xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {fileItem.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                      {thumbnails.length} total pages • {splitMode === "visual-scissors" ? `${splitPoints.size} cut dividers active (${splitPoints.size + 1} segments)` : "Choose split mode"}
                    </p>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex flex-wrap rounded-2xl glass-pill p-1 text-xs">
                    {[
                      { id: "visual-scissors", label: "✂️ Visual Scissors" },
                      { id: "extract", label: "Extract Pages" },
                      { id: "burst-all", label: "Burst All (ZIP)" },
                      { id: "every-n", label: "Every N Pages" },
                      { id: "custom-ranges", label: "Custom Ranges" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setSplitMode(
                            m.id as
                              | "visual-scissors"
                              | "extract"
                              | "burst-all"
                              | "every-n"
                              | "custom-ranges"
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                          splitMode === m.id
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md font-semibold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-mode parameters */}
                {splitMode === "visual-scissors" && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-amber-200">
                        Click any glowing divider between pages below to place or remove a split cut.
                      </span>
                    </div>
                    {splitPoints.size > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-zinc-300 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
                          {visualRanges}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSplitPoints(new Set())}
                          className="text-[11px] text-zinc-400 hover:text-rose-400 underline cursor-pointer"
                        >
                          Clear Cuts
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {splitMode === "every-n" && (
                  <div className="flex items-center gap-3 text-xs text-zinc-300">
                    <span>Split document into chunks of:</span>
                    <input
                      type="number"
                      min={1}
                      max={thumbnails.length}
                      value={everyNCount}
                      onChange={(e) =>
                        setEveryNCount(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-20 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-center focus:outline-none focus:border-amber-500"
                    />
                    <span>pages per file</span>
                  </div>
                )}

                {splitMode === "custom-ranges" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Custom Page Ranges (semicolon or comma separated)
                    </label>
                    <input
                      type="text"
                      value={customRangeText}
                      onChange={(e) => setCustomRangeText(e.target.value)}
                      placeholder="e.g. 1-3; 4-6; 7-10"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="merge-ranges"
                        checked={mergeRanges}
                        onChange={(e) => setMergeRanges(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <label htmlFor="merge-ranges" className="text-xs text-zinc-400 cursor-pointer">
                        Merge all specified ranges into a single continuous PDF (instead of separate ZIP files)
                      </label>
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                  <span className="text-xs text-zinc-400 font-mono">
                    {splitMode === "visual-scissors" && `${splitPoints.size + 1} output documents will be packaged in ZIP`}
                    {splitMode === "burst-all" && `Every page (${thumbnails.length}) extracted as individual PDF in ZIP`}
                    {splitMode === "extract" && `${selectedIndices.size} pages selected for extraction`}
                    {splitMode === "every-n" && `Chunks of ${everyNCount} pages packaged into ZIP`}
                    {splitMode === "custom-ranges" && "Custom ranges packaged to download"}
                  </span>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleProcess}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Split...</span>
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        <span>Split &amp; Package PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Interactive Visual Page Cards Grid with Scissors Dividers */}
              <div className="space-y-4">
                {isLoadingThumbnails && (
                  <div className="p-8 text-center text-zinc-400 font-mono text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Rendering page cards...</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                    Visual Page Cards ({thumbnails.length} Pages)
                  </h4>
                  {splitMode === "visual-scissors" && (
                    <span className="text-[11px] text-amber-400 font-mono">
                      ✂️ Click the divider between cards to cut
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {thumbnails.map((thumb, index) => {
                    const isSelected = selectedIndices.has(index);
                    const isCutAfter = splitPoints.has(index);
                    const isLast = index === thumbnails.length - 1;

                    return (
                      <React.Fragment key={`${thumb.pageNumber}-${index}`}>
                        <div
                          onClick={() => {
                            if (splitMode === "extract") handleToggleSelect(index);
                          }}
                          className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 premium-card flex flex-col ${
                            splitMode === "extract"
                              ? isSelected
                                ? "border-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/50 cursor-pointer"
                                : "border-white/10 hover:border-white/25 cursor-pointer"
                              : "border-white/10 hover:border-white/20 cursor-default"
                          }`}
                        >
                          {/* Header Badge */}
                          <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/40 border-b border-white/5 text-[11px] font-medium text-zinc-300">
                            <span className="font-mono">Page {thumb.pageNumber}</span>
                            {splitMode === "extract" && isSelected && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                <CheckCircle2 className="w-3 h-3" /> Selected
                              </span>
                            )}
                          </div>

                          {/* Thumbnail */}
                          <div className="relative aspect-[1/1.35] w-full bg-[#05060B] p-2 flex items-center justify-center overflow-hidden">
                            <Image
                              src={thumb.dataUrl}
                              alt={`Page ${thumb.pageNumber}`}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                              className="object-contain shadow-sm pointer-events-none"
                              unoptimized
                            />
                          </div>
                        </div>

                        {/* Visual Scissors Divider Between Cards (when in visual-scissors mode) */}
                        {splitMode === "visual-scissors" && !isLast && (
                          <div className="col-span-full py-1">
                            <button
                              type="button"
                              onClick={() => toggleSplitPoint(index)}
                              className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs transition-all cursor-pointer font-mono ${
                                isCutAfter
                                  ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-1 ring-amber-400"
                                  : "bg-white/[0.02] border-dashed border-white/15 text-zinc-400 hover:text-white hover:border-amber-400/50 hover:bg-amber-500/5"
                              }`}
                            >
                              <Scissors className={`w-3.5 h-3.5 ${isCutAfter ? "text-amber-400 animate-pulse" : ""}`} />
                              <span>
                                {isCutAfter
                                  ? `✂️ Split Breakpoint: End of Segment (Page ${thumb.pageNumber} | Page ${thumb.pageNumber + 1})`
                                  : `Click to insert Scissors Cut after Page ${thumb.pageNumber}`}
                              </span>
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
