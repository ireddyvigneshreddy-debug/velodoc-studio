"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { getPdfPageCount } from "@/lib/pdf-engine";
import {
  executeExactCompression,
  ExactCompressionOptions,
} from "@/lib/compression-engine";
import { sessionHistory } from "@/lib/session-history";
import {
  Minimize2,
  Loader2,
  AlertCircle,
  Sliders,
  Target,
  Percent,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";

export function CompressPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  // Compression modes
  const [mode, setMode] = useState<"exact-size" | "percentage" | "manual">(
    "exact-size"
  );
  const [targetKb, setTargetKb] = useState<number>(300);
  const [percentageReduction, setPercentageReduction] = useState<number>(50);

  // Manual Pro settings
  const [manualDpi, setManualDpi] = useState<number>(150);
  const [manualQuality, setManualQuality] = useState<number>(0.7);
  const [colorMode, setColorMode] = useState<"full" | "grayscale">("full");
  const [exactBytePadding, setExactBytePadding] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chained file ingestion
  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = new Blob([chained.data.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const file = new File([blob], chained.filename, {
        type: "application/pdf",
      });
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

    try {
      const buffer = await file.arrayBuffer();
      setOriginalBuffer(buffer);
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      item.status = "ready";
      setFileItem({ ...item });

      // Automatically suggest 50% target size in KB
      const suggestedKb = Math.max(50, Math.round(file.size / 2048));
      setTargetKb(suggestedKb);
    } catch (err: unknown) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not inspect PDF. The file might be encrypted.");
      setFileItem({ ...item });
    }
  };

  const handleCompress = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressMsg("Initializing precision binary-search engine...");
    setProgressPct(5);
    const startTime = performance.now();

    try {
      const options: ExactCompressionOptions = {
        mode,
        targetSizeKb: targetKb,
        percentageReduction,
        manualDpi,
        manualQuality,
        colorMode,
        stripMetadata: true,
        exactBytePadding,
      };

      const result = await executeExactCompression(
        originalBuffer,
        options,
        (msg, pct) => {
          setProgressMsg(msg);
          setProgressPct(pct);
        }
      );

      const endTime = performance.now();
      const durationMs = endTime - startTime;

      const blob = new Blob([result.pdfBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const downloadUrl = URL.createObjectURL(blob);

      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(result.pdfBytes);
      setMetrics({
        originalSize: result.originalSize,
        processedSize: result.finalSize,
        savedBytes: result.savedBytes,
        savedPercentage: result.savedPercentage,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_compressed.pdf`,
        pageCount: fileItem.pageCount || 1,
        targetAccuracy: result.targetAccuracy,
      });
    } catch (err: unknown) {
      console.error("Compression error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Compression failed."
      );
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          title="PDF Compressed to Exact Target!"
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
              title="Upload PDF to compress to exact target size"
              subtitle="Precision binary search lands on your target KB or reduction percentage"
            />
          ) : (
            <div className="space-y-6">
              {/* Document Banner */}
              <div className="p-4 rounded-2xl bg-[#12141D] border border-white/10 flex items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Minimize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      {fileItem.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Original:{" "}
                      <span className="font-mono text-white font-medium">
                        {formatFileSize(fileItem.size)}
                      </span>{" "}
                      • {fileItem.pageCount} pages
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFileItem(null);
                    setOriginalBuffer(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Change PDF
                </button>
              </div>

              {/* Compression Mode Selector */}
              <div className="p-6 rounded-3xl bg-[#12141D] border border-white/10 space-y-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      Compression Control Engine
                    </h4>
                    <p className="text-xs text-slate-400">
                      Select how you want to target and optimize file weight
                    </p>
                  </div>

                  <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setMode("exact-size")}
                      className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                        mode === "exact-size"
                          ? "bg-cyan-500 text-white shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Exact Target Size</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("percentage")}
                      className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                        mode === "percentage"
                          ? "bg-cyan-500 text-white shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>Target Reduction %</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("manual")}
                      className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                        mode === "manual"
                          ? "bg-cyan-500 text-white shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Manual Pro</span>
                    </button>
                  </div>
                </div>

                {/* Mode 1: Exact Target Size in KB/MB */}
                {mode === "exact-size" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          Target File Size (KB)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={20}
                            max={Math.round(fileItem.size / 1024)}
                            value={targetKb}
                            onChange={(e) =>
                              setTargetKb(
                                Math.max(10, parseInt(e.target.value) || 10)
                              )
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-xs text-slate-400 font-mono">
                            KB
                          </span>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          Quick Target Presets
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[100, 250, 500, 1024, 2048].map((kb) => (
                            <button
                              key={kb}
                              type="button"
                              onClick={() => setTargetKb(kb)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all ${
                                targetKb === kb
                                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                              }`}
                            >
                              {kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Exact Byte Padding Toggle */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          Exact Byte Padding (Spec Compliant)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Appends safe PDF comment padding bytes so final size
                          matches requested KB down to the exact byte.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={exactBytePadding}
                        onChange={(e) => setExactBytePadding(e.target.checked)}
                        className="w-4 h-4 accent-cyan-500 rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Mode 2: Percentage Reduction */}
                {mode === "percentage" && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300 uppercase tracking-wider">
                        Percentage Reduction
                      </span>
                      <span className="text-cyan-400 font-mono font-bold text-sm">
                        -{percentageReduction}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={percentageReduction}
                      onChange={(e) =>
                        setPercentageReduction(Number(e.target.value))
                      }
                      className="w-full accent-cyan-500"
                    />
                    <div className="text-[11px] text-slate-400">
                      Estimated output: ~
                      <span className="font-mono text-white">
                        {formatFileSize(
                          fileItem.size * (1 - percentageReduction / 100)
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Mode 3: Manual Pro Controls */}
                {mode === "manual" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Target DPI
                      </label>
                      <select
                        value={manualDpi}
                        onChange={(e) => setManualDpi(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value={72}>72 DPI (Web Screen)</option>
                        <option value={96}>96 DPI (Email Standard)</option>
                        <option value={150}>150 DPI (Balanced)</option>
                        <option value={200}>200 DPI (High Detail)</option>
                        <option value={300}>300 DPI (Print Ready)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        JPEG Quality ({Math.round(manualQuality * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={0.95}
                        step={0.05}
                        value={manualQuality}
                        onChange={(e) =>
                          setManualQuality(Number(e.target.value))
                        }
                        className="w-full accent-cyan-500 mt-2"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Color Mode
                      </label>
                      <select
                        value={colorMode}
                        onChange={(e) =>
                          setColorMode(e.target.value as "full" | "grayscale")
                        }
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="full">Full Color</option>
                        <option value="grayscale">Grayscale (Extra Savings)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Action Trigger Row */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {mode === "exact-size"
                      ? `Targeting ~${targetKb} KB with binary convergence`
                      : mode === "percentage"
                      ? `Targeting -${percentageReduction}% reduction`
                      : "Manual precision execution"}
                  </span>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCompress}
                    className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Compressing...</span>
                      </>
                    ) : (
                      <>
                        <Minimize2 className="w-4 h-4" />
                        <span>Compress to Target</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live iteration progress indicator */}
                {isProcessing && (
                  <div className="space-y-2 p-4 rounded-2xl bg-black/40 border border-white/10 animate-in fade-in duration-150">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{progressMsg}</span>
                      <span className="font-mono">{progressPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-200"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
