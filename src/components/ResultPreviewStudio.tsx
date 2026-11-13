"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  RefreshCw,
  ArrowRight,
  Check,
  Edit2,
  Clock,
  TrendingDown,
  Layers,
  Sparkles,
  Archive,
  FileText,
} from "lucide-react";
import { ProcessingMetrics } from "@/types";
import { formatFileSize, formatTimeMs } from "@/lib/utils";
import { renderPdfPageToCanvas } from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { TOOLS } from "@/lib/constants";
import { createBatchZip, triggerFileDownload } from "@/lib/batch-queue-engine";

export interface ProcessedItemOutput {
  id: string;
  name: string;
  originalSize: number;
  processedSize: number;
  savedPercentage: number;
  outputBytes?: Uint8Array;
  outputBlob?: Blob;
  originalBytes?: ArrayBuffer;
  outputMimeType?: string;
  downloadUrl?: string;
  pageCount?: number;
  targetAccuracy?: string;
}

export interface ResultPreviewStudioProps {
  metrics: ProcessingMetrics;
  outputBytes?: Uint8Array;
  originalBytes?: ArrayBuffer;
  outputMimeType?: string;
  onAdjustSettings: () => void;
  title?: string;
  batchItems?: ProcessedItemOutput[];
  onDownloadAllZip?: () => void;
}

export function ResultPreviewStudio({
  metrics: initialMetrics,
  outputBytes: initialOutputBytes,
  originalBytes: initialOriginalBytes,
  outputMimeType = "application/pdf",
  onAdjustSettings,
  title = "Processing Complete",
  batchItems = [],
  onDownloadAllZip,
}: ResultPreviewStudioProps) {
  const router = useRouter();

  // If batch items are provided, allow user to switch active item
  const [selectedBatchIdx, setSelectedBatchIdx] = useState(0);

  const activeItem = useMemo(() => {
    if (batchItems.length > 0 && batchItems[selectedBatchIdx]) {
      return batchItems[selectedBatchIdx];
    }
    return null;
  }, [batchItems, selectedBatchIdx]);

  const activeMetrics: ProcessingMetrics = useMemo(() => {
    if (activeItem) {
      return {
        ...initialMetrics,
        originalSize: activeItem.originalSize,
        processedSize: activeItem.processedSize,
        savedPercentage: activeItem.savedPercentage,
        pageCount: activeItem.pageCount || initialMetrics.pageCount || 1,
        downloadFilename: activeItem.name,
        targetAccuracy: activeItem.targetAccuracy || initialMetrics.targetAccuracy,
      };
    }
    return initialMetrics;
  }, [activeItem, initialMetrics]);

  const currentOutputBytes = activeItem?.outputBytes || initialOutputBytes;
  const currentOriginalBytes = activeItem?.originalBytes || initialOriginalBytes;

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = activeMetrics.pageCount || 1;
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [compareMode, setCompareMode] = useState(false);
  const [filename, setFilename] = useState(activeMetrics.downloadFilename);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showChainMenu, setShowChainMenu] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Sync filename when switching items
  useEffect(() => {
    setFilename(activeMetrics.downloadFilename);
    setCurrentPage(1);
  }, [activeMetrics.downloadFilename]);

  // Canvas references for output and original
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  // Confetti celebration on completion
  useEffect(() => {
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#6366F1", "#8B5CF6", "#06B6D4", "#10B981"],
      });
    } catch {
      // ignore
    }

    if (currentOutputBytes) {
      const blob = new Blob([currentOutputBytes as unknown as BlobPart], {
        type: outputMimeType,
      });
      sessionHistory.addItem({
        toolId: "studio",
        toolName: title,
        filename: activeMetrics.downloadFilename,
        blob,
        data: currentOutputBytes,
        mimeType: outputMimeType,
        originalSize: activeMetrics.originalSize,
        processedSize: activeMetrics.processedSize,
        pageCount: activeMetrics.pageCount || 1,
      });
    }
  }, [activeMetrics, currentOutputBytes, outputMimeType, title]);

  // Render current page of output PDF onto canvas
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (outputMimeType !== "application/pdf" || !currentOutputBytes) return;

      try {
        const canvas = await renderPdfPageToCanvas(
          currentOutputBytes,
          currentPage,
          zoomLevel * 1.5
        );
        if (isCancelled || !outputCanvasRef.current) return;

        const target = outputCanvasRef.current;
        target.width = canvas.width;
        target.height = canvas.height;
        const ctx = target.getContext("2d");
        ctx?.drawImage(canvas, 0, 0);
      } catch (err) {
        console.warn("Failed to render output page:", err);
      }

      // If comparison mode is on and original buffer is provided, render original too
      if (compareMode && currentOriginalBytes) {
        try {
          const origCanvas = await renderPdfPageToCanvas(
            currentOriginalBytes,
            currentPage,
            zoomLevel * 1.5
          );
          if (isCancelled || !originalCanvasRef.current) return;

          const origTarget = originalCanvasRef.current;
          origTarget.width = origCanvas.width;
          origTarget.height = origCanvas.height;
          const origCtx = origTarget.getContext("2d");
          origCtx?.drawImage(origCanvas, 0, 0);
        } catch (err) {
          console.warn("Failed to render original comparison page:", err);
        }
      }
    }

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [currentPage, zoomLevel, compareMode, currentOutputBytes, currentOriginalBytes, outputMimeType]);

  const handleDownloadSingle = () => {
    if (!currentOutputBytes && !activeItem?.outputBlob) return;
    const blob =
      activeItem?.outputBlob ||
      new Blob([currentOutputBytes! as unknown as BlobPart], { type: outputMimeType });
    triggerFileDownload(blob, filename);
  };

  const handleDownloadAllZip = async () => {
    if (onDownloadAllZip) {
      onDownloadAllZip();
      return;
    }

    if (batchItems.length === 0) {
      handleDownloadSingle();
      return;
    }

    setIsZipping(true);
    try {
      const filesToZip = batchItems.map((item) => ({
        name: item.name,
        blob:
          item.outputBlob ||
          new Blob([item.outputBytes! as unknown as BlobPart], { type: item.outputMimeType || "application/pdf" }),
      }));

      const { zipBlob } = await createBatchZip(filesToZip, "velodoc_processed_bundle.zip");
      triggerFileDownload(zipBlob, "velodoc_processed_bundle.zip");
    } catch (err) {
      console.error("ZIP packaging error:", err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleChainToTool = (targetToolPath: string) => {
    if (!currentOutputBytes) return;
    sessionHistory.setChainedFile(currentOutputBytes, filename, outputMimeType);
    router.push(targetToolPath);
  };

  const isPdf = outputMimeType === "application/pdf";
  const isSaving = activeMetrics.savedPercentage > 0;
  const hasMultipleBatch = batchItems.length > 1;

  return (
    <div className="w-full premium-card rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
      {/* 1. TOP TELEMETRY & ACCURACY METRICS BAR */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border-b border-white/[0.08]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Title & Editable Filename */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-[-0.02em]">
                {title}
              </h3>
              {hasMultipleBatch && (
                <span className="text-[11px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {batchItems.length}-Document Batch
                </span>
              )}
              {activeMetrics.targetAccuracy && (
                <span className="text-[11px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                  {activeMetrics.targetAccuracy}
                </span>
              )}
            </div>

            {/* Editable Filename */}
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="px-2.5 py-0.5 rounded-lg bg-black/60 border border-indigo-500 text-xs text-white font-mono focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span className="text-xs text-zinc-300 font-mono truncate max-w-[280px] sm:max-w-md">
                    {filename}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    title="Rename Output File"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Metric Badges with Monospace Tabular Figures */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
            <div className="px-3.5 py-2 rounded-2xl glass-pill">
              <span className="text-[10px] text-zinc-400 block uppercase font-medium">
                Original Size
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white font-mono tabular-nums block">
                {formatFileSize(activeMetrics.originalSize)}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl glass-pill">
              <span className="text-[10px] text-zinc-400 block uppercase font-medium">
                Output Size
              </span>
              <span className="text-xs sm:text-sm font-semibold text-indigo-300 font-mono tabular-nums block">
                {formatFileSize(activeMetrics.processedSize)}
              </span>
            </div>

            {/* Animated Savings Ring / Badge */}
            <div className="px-3.5 py-2 rounded-2xl glass-pill relative overflow-hidden">
              <span className="text-[10px] text-zinc-400 block uppercase font-medium flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-emerald-400" />
                {isSaving ? "Saved" : "Ratio"}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs sm:text-sm font-bold font-mono tabular-nums block ${
                    isSaving ? "text-emerald-400" : "text-zinc-300"
                  }`}
                >
                  {isSaving ? `-${activeMetrics.savedPercentage}%` : "Optimized"}
                </span>
                {isSaving && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                )}
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl glass-pill">
              <span className="text-[10px] text-zinc-400 block uppercase font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Speed
              </span>
              <span className="text-xs sm:text-sm font-semibold text-cyan-300 font-mono tabular-nums block">
                {formatTimeMs(activeMetrics.durationMs)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CINEMA CANVAS CONTAINER WITH FLOATING HUD CONTROLS */}
      <div className="relative flex flex-col md:flex-row bg-[#05060B] min-h-[380px] max-h-[580px] overflow-hidden">
        {/* Optional Left Batch Switcher Sidebar */}
        {hasMultipleBatch && (
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/[0.08] bg-black/40 flex flex-col max-h-48 md:max-h-[580px] overflow-hidden shrink-0 z-10 backdrop-blur-md">
            <div className="p-3 border-b border-white/[0.06] flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              <span>Batch Queue ({batchItems.length})</span>
              <span className="text-emerald-400">100% Done</span>
            </div>
            <div className="divide-y divide-white/[0.04] overflow-y-auto flex-1">
              {batchItems.map((item, idx) => {
                const isSelected = idx === selectedBatchIdx;
                return (
                  <button
                    key={item.id || idx}
                    onClick={() => setSelectedBatchIdx(idx)}
                    className={`w-full text-left p-3 flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600/20 text-white border-l-2 border-indigo-500 shadow-inner"
                        : "hover:bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <FileText
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? "text-indigo-400" : "text-zinc-500"
                      }`}
                    />
                    <div className="truncate flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono tabular-nums flex items-center gap-1.5 mt-0.5">
                        <span>{formatFileSize(item.originalSize)}</span>
                        <span>→</span>
                        <span className="text-indigo-300">
                          {formatFileSize(item.processedSize)}
                        </span>
                      </div>
                    </div>
                    {item.savedPercentage > 0 && (
                      <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 shrink-0">
                        -{item.savedPercentage}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Floating HUD Zoom & Page Navigation Controls */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill shadow-2xl backdrop-blur-2xl">
          {isPdf && totalPages > 1 && (
            <div className="flex items-center gap-1 pr-2 border-r border-white/10">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono tabular-nums text-zinc-300 text-xs px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zoom Level HUD */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono tabular-nums text-zinc-200 text-xs font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1.0)}
              className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Before vs. After Split Comparison Toggle */}
          {currentOriginalBytes && isPdf && (
            <button
              type="button"
              onClick={() => setCompareMode(!compareMode)}
              className={`ml-1 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 text-[11px] transition-all cursor-pointer ${
                compareMode
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-400/40"
                  : "bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300 hover:text-white"
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>{compareMode ? "Single" : "Split Before/After"}</span>
            </button>
          )}
        </div>

        {/* Main Cinema Canvas Workspace */}
        <div className="p-4 sm:p-8 flex-1 overflow-auto flex items-center justify-center pt-14">
          {isPdf ? (
            compareMode && currentOriginalBytes ? (
              /* Side-by-Side Split View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-5xl">
                {/* Left: Original */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] uppercase font-bold text-zinc-400 mb-2 tracking-wider font-mono tabular-nums">
                    Original ({formatFileSize(activeMetrics.originalSize)})
                  </span>
                  <div className="p-2 rounded-2xl bg-black/60 border border-white/10 shadow-2xl max-w-full overflow-hidden">
                    <canvas
                      ref={originalCanvasRef}
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </div>

                {/* Right: Output */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] uppercase font-bold text-indigo-400 mb-2 tracking-wider font-mono tabular-nums">
                    Processed Output ({formatFileSize(activeMetrics.processedSize)})
                  </span>
                  <div className="p-2 rounded-2xl bg-black/60 border border-indigo-500/40 shadow-[0_0_36px_rgba(99,102,241,0.25)] max-w-full overflow-hidden">
                    <canvas
                      ref={outputCanvasRef}
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Single Output View */
              <div className="p-2.5 rounded-2xl bg-black/60 border border-white/[0.12] shadow-2xl max-w-full overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <canvas
                  ref={outputCanvasRef}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            )
          ) : (
            /* Non-PDF outputs */
            <div className="p-8 text-center space-y-2">
              <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-block shadow-lg">
                <Layers className="w-8 h-8" />
              </div>
              <h4 className="text-white font-semibold text-sm">{filename}</h4>
              <p className="text-xs text-zinc-400 max-w-md">
                Output packaged successfully in local browser memory.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM ACTION & CHAINING TOOLBAR */}
      <div className="p-4 bg-white/[0.02] border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Adjust Settings & Re-Run */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onAdjustSettings}
            className="w-full sm:w-auto px-4 py-2 rounded-xl glass-pill hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Adjust Settings &amp; Re-Run</span>
          </button>
        </div>

        {/* Right: Chaining + Single Download + Master ZIP Export */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
          {/* Tool Chaining Dropdown */}
          {currentOutputBytes && isPdf && (
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowChainMenu(!showChainMenu)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Chain Output to Next Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {showChainMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowChainMenu(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-2 w-64 max-h-64 overflow-y-auto rounded-2xl bg-[#0F111A] border border-white/[0.12] shadow-2xl z-40 p-2 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                      Pass Output Directly To:
                    </div>
                    <div className="space-y-0.5 pt-1">
                      {TOOLS.filter(
                        (t) => t.acceptedFileTypes["application/pdf"] !== undefined
                      ).map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => handleChainToTool(tool.path)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                        >
                          <span className="truncate">{tool.name}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Master ZIP Download (if batch > 1) */}
          {hasMultipleBatch && (
            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isZipping}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/[0.1] cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isZipping ? "Creating ZIP..." : `Download All (${batchItems.length} ZIP)`}</span>
            </button>
          )}

          {/* Primary Download Current File Button */}
          <button
            type="button"
            onClick={handleDownloadSingle}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_0_24px_rgba(99,102,241,0.45)] hover:shadow-[0_0_32px_rgba(99,102,241,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {filename}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
