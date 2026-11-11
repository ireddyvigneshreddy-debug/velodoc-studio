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
    <div className="w-full bg-[#10121A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl space-y-0 relative animate-in fade-in zoom-in-95 duration-200">
      {/* 1. TOP TELEMETRY & ACCURACY METRICS BAR */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#141622] via-[#10121A] to-[#141622] border-b border-white/10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Title & Editable Filename */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {title}
              </h3>
              {hasMultipleBatch && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {batchItems.length}-Document Batch
                </span>
              )}
              {activeMetrics.targetAccuracy && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
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
                    className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span className="text-xs text-slate-300 font-mono truncate max-w-[280px] sm:max-w-md">
                    {filename}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-slate-500 hover:text-white transition-colors"
                    title="Rename Output File"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
            <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                Original Size
              </span>
              <span className="text-xs sm:text-sm font-semibold text-white font-mono block">
                {formatFileSize(activeMetrics.originalSize)}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                Output Size
              </span>
              <span className="text-xs sm:text-sm font-semibold text-indigo-300 font-mono block">
                {formatFileSize(activeMetrics.processedSize)}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-emerald-400" />
                {isSaving ? "Saved" : "Ratio"}
              </span>
              <span
                className={`text-xs sm:text-sm font-semibold font-mono block ${
                  isSaving ? "text-emerald-400" : "text-slate-300"
                }`}
              >
                {isSaving ? `-${activeMetrics.savedPercentage}%` : "Optimized"}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Speed
              </span>
              <span className="text-xs sm:text-sm font-semibold text-cyan-300 font-mono block">
                {formatTimeMs(activeMetrics.durationMs)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. VIEWER TOOLBAR */}
      <div className="px-4 py-2.5 bg-[#0C0E15] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Page navigation */}
        {isPdf && totalPages > 1 ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">Preview Viewport</span>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-mono text-slate-300 text-[11px]">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white ml-0.5"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Before vs. After Split Toggle */}
        {currentOriginalBytes && isPdf && (
          <button
            type="button"
            onClick={() => setCompareMode(!compareMode)}
            className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all text-xs ${
              compareMode
                ? "bg-indigo-600 text-white shadow-md border border-indigo-500"
                : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{compareMode ? "Single View" : "Split Before/After"}</span>
          </button>
        )}
      </div>

      {/* 3. WORKSPACE CONTAINER (WITH BATCH SWITCHER SIDEBAR) */}
      <div className="flex flex-col md:flex-row bg-[#07080C] min-h-[360px] max-h-[550px]">
        {/* Optional Left Batch Switcher Sidebar */}
        {hasMultipleBatch && (
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-[#0B0D14] flex flex-col max-h-48 md:max-h-[550px] overflow-hidden flex-shrink-0">
            <div className="p-2.5 border-b border-white/5 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Batch Queue ({batchItems.length})</span>
              <span className="text-emerald-400 font-mono">100% Done</span>
            </div>
            <div className="divide-y divide-white/5 overflow-y-auto flex-1">
              {batchItems.map((item, idx) => {
                const isSelected = idx === selectedBatchIdx;
                return (
                  <button
                    key={item.id || idx}
                    onClick={() => setSelectedBatchIdx(idx)}
                    className={`w-full text-left p-2.5 flex items-center gap-2 transition-all ${
                      isSelected
                        ? "bg-indigo-600/20 text-white border-l-2 border-indigo-500"
                        : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                    <div className="truncate flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{formatFileSize(item.originalSize)}</span>
                        <span>→</span>
                        <span className="text-indigo-300">{formatFileSize(item.processedSize)}</span>
                      </div>
                    </div>
                    {item.savedPercentage > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                        -{item.savedPercentage}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Canvas Workspace */}
        <div className="p-4 sm:p-6 flex-1 overflow-auto flex items-center justify-center">
          {isPdf ? (
            compareMode && currentOriginalBytes ? (
              /* Side-by-Side Split View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl">
                {/* Left: Original */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                    Original ({formatFileSize(activeMetrics.originalSize)})
                  </span>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10 shadow-2xl max-w-full overflow-hidden">
                    <canvas
                      ref={originalCanvasRef}
                      className="max-w-full h-auto rounded shadow-lg"
                    />
                  </div>
                </div>

                {/* Right: Output */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] uppercase font-bold text-indigo-400 mb-1.5 tracking-wider">
                    Processed Output ({formatFileSize(activeMetrics.processedSize)})
                  </span>
                  <div className="p-2 rounded-xl bg-black/40 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] max-w-full overflow-hidden">
                    <canvas
                      ref={outputCanvasRef}
                      className="max-w-full h-auto rounded shadow-lg"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Single Output View */
              <div className="p-2 rounded-xl bg-black/40 border border-white/10 shadow-2xl max-w-full overflow-hidden">
                <canvas
                  ref={outputCanvasRef}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            )
          ) : (
            /* Non-PDF outputs (e.g. ZIP or text) */
            <div className="p-6 text-center space-y-2">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-block">
                <Layers className="w-7 h-7" />
              </div>
              <h4 className="text-white font-semibold text-sm">{filename}</h4>
              <p className="text-xs text-slate-400 max-w-md">
                Output packaged successfully. Click below to download or chain into another tool.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. BOTTOM ACTION & CHAINING TOOLBAR */}
      <div className="p-4 bg-[#0E1017] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Adjust Settings & Re-Run */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onAdjustSettings}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
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
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Chain Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {showChainMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowChainMenu(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-2 w-60 max-h-64 overflow-y-auto rounded-xl bg-[#12141D] border border-white/10 shadow-2xl z-40 p-1.5 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Pass Output Directly To:
                    </div>
                    <div className="space-y-0.5 pt-1">
                      {TOOLS.filter(
                        (t) => t.acceptedFileTypes["application/pdf"] !== undefined
                      ).map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => handleChainToTool(tool.path)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <span className="truncate">{tool.name}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
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
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/10"
            >
              <Archive className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isZipping ? "Creating ZIP..." : `Download All (${batchItems.length} ZIP)`}</span>
            </button>
          )}

          {/* Primary Download Current File Button */}
          <button
            type="button"
            onClick={handleDownloadSingle}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.01] active:scale-[0.98] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {filename}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
