"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { ProcessingMetrics } from "@/types";
import { formatFileSize, formatTimeMs } from "@/lib/utils";
import { renderPdfPageToCanvas } from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { TOOLS } from "@/lib/constants";

interface ResultPreviewStudioProps {
  metrics: ProcessingMetrics;
  outputBytes?: Uint8Array;
  originalBytes?: ArrayBuffer;
  outputMimeType?: string;
  onAdjustSettings: () => void;
  title?: string;
}

export function ResultPreviewStudio({
  metrics,
  outputBytes,
  originalBytes,
  outputMimeType = "application/pdf",
  onAdjustSettings,
  title = "Processing Complete",
}: ResultPreviewStudioProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = metrics.pageCount || 1;
  const [zoomLevel, setZoomLevel] = useState(1.0); // 0.5, 1.0, 1.5, 2.0
  const [compareMode, setCompareMode] = useState(false);
  const [filename, setFilename] = useState(metrics.downloadFilename);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showChainMenu, setShowChainMenu] = useState(false);

  // Canvas references for output and original
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  // Record item in session history tray
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#6366F1", "#8B5CF6", "#06B6D4", "#10B981"],
      });
    } catch {
      // ignore
    }

    if (outputBytes) {
      const blob = new Blob([outputBytes.buffer as ArrayBuffer], {
        type: outputMimeType,
      });
      sessionHistory.addItem({
        toolId: "studio",
        toolName: title,
        filename: metrics.downloadFilename,
        blob,
        data: outputBytes,
        mimeType: outputMimeType,
        originalSize: metrics.originalSize,
        processedSize: metrics.processedSize,
        pageCount: metrics.pageCount || 1,
      });
    }
  }, [metrics, outputBytes, outputMimeType, title]);

  // Render current page of output PDF onto canvas
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (outputMimeType !== "application/pdf" || !outputBytes) return;

      try {
        const canvas = await renderPdfPageToCanvas(
          outputBytes.buffer as ArrayBuffer,
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
      if (compareMode && originalBytes) {
        try {
          const origCanvas = await renderPdfPageToCanvas(
            originalBytes,
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
  }, [currentPage, zoomLevel, compareMode, outputBytes, originalBytes, outputMimeType]);

  const handleDownload = () => {
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.85 } });
    } catch {
      // ignore
    }

    const a = document.createElement("a");
    a.href = metrics.downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleChainToTool = (targetToolPath: string) => {
    if (!outputBytes) return;
    sessionHistory.setChainedFile(outputBytes, filename, outputMimeType);
    router.push(targetToolPath);
  };

  const isPdf = outputMimeType === "application/pdf";
  const isSaving = metrics.savedPercentage > 0;

  return (
    <div className="w-full bg-[#10121A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl space-y-0 relative animate-in fade-in zoom-in-95 duration-200">
      {/* 1. TOP TELEMETRY & ACCURACY METRICS BAR */}
      <div className="p-6 bg-gradient-to-r from-[#141622] via-[#10121A] to-[#141622] border-b border-white/10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Title & Editable Filename */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                {title}
              </h3>
              {metrics.targetAccuracy && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {metrics.targetAccuracy}
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
                    className="px-2.5 py-1 rounded-lg bg-black/60 border border-indigo-500 text-xs text-white font-mono focus:outline-none"
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
                  <span className="text-xs text-slate-300 font-mono">
                    {filename}
                  </span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                Original Size
              </span>
              <span className="text-sm font-semibold text-white font-mono mt-0.5 block">
                {formatFileSize(metrics.originalSize)}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                Output Size
              </span>
              <span className="text-sm font-semibold text-indigo-300 font-mono mt-0.5 block">
                {formatFileSize(metrics.processedSize)}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-emerald-400" />
                {isSaving ? "Reduction" : "Ratio"}
              </span>
              <span
                className={`text-sm font-semibold font-mono mt-0.5 block ${
                  isSaving ? "text-emerald-400" : "text-slate-300"
                }`}
              >
                {isSaving ? `-${metrics.savedPercentage}%` : "Optimized"}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-400 block uppercase font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Speed
              </span>
              <span className="text-sm font-semibold text-cyan-300 font-mono mt-0.5 block">
                {formatTimeMs(metrics.durationMs)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. VIEWER TOOLBAR */}
      <div className="px-6 py-3 bg-[#0C0E15] border-b border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Page navigation */}
        {isPdf && totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-slate-400">Preview Viewport</span>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono text-slate-300 text-xs">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white ml-1"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Before vs. After Split Toggle */}
        {originalBytes && isPdf && (
          <button
            type="button"
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
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

      {/* 3. MULTI-PAGE CANVAS PREVIEW WORKSPACE */}
      <div className="p-6 bg-[#07080C] min-h-[380px] max-h-[600px] overflow-auto flex items-center justify-center">
        {isPdf ? (
          compareMode && originalBytes ? (
            /* Side-by-Side Split View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
              {/* Left: Original */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] uppercase font-bold text-slate-400 mb-2 tracking-wider">
                  Original Document ({formatFileSize(metrics.originalSize)})
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
                <span className="text-[11px] uppercase font-bold text-indigo-400 mb-2 tracking-wider">
                  Processed Output ({formatFileSize(metrics.processedSize)})
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
            <div className="p-2 rounded-2xl bg-black/40 border border-white/10 shadow-2xl max-w-full overflow-hidden">
              <canvas
                ref={outputCanvasRef}
                className="max-w-full h-auto rounded-xl shadow-lg"
              />
            </div>
          )
        ) : (
          /* Non-PDF outputs (e.g. ZIP or text) */
          <div className="p-8 text-center space-y-3">
            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-block">
              <Layers className="w-8 h-8" />
            </div>
            <h4 className="text-white font-semibold text-base">{filename}</h4>
            <p className="text-xs text-slate-400 max-w-md">
              Output bundle packaged successfully. Click below to download or
              inspect files.
            </p>
          </div>
        )}
      </div>

      {/* 4. BOTTOM ACTION & CHAINING TOOLBAR */}
      <div className="p-6 bg-[#0E1017] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Adjust Settings & Re-Run */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onAdjustSettings}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Adjust Settings &amp; Re-Run</span>
          </button>
        </div>

        {/* Right: Pipeline Chaining & Download Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tool Chaining Dropdown */}
          {outputBytes && isPdf && (
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowChainMenu(!showChainMenu)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <span>Chain into Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {showChainMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowChainMenu(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-2 w-64 max-h-72 overflow-y-auto rounded-2xl bg-[#12141D] border border-white/10 shadow-2xl z-40 p-2 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Pass Output Directly To:
                    </div>
                    <div className="space-y-1 pt-1">
                      {TOOLS.filter(
                        (t) =>
                          t.acceptedFileTypes["application/pdf"] !== undefined
                      ).map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => handleChainToTool(tool.path)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all"
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

          {/* Primary Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download {filename}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
