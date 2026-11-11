"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio, ProcessedItemOutput } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { getPdfPageCount } from "@/lib/pdf-engine";
import {
  executeExactCompression,
  executeExactCompressionBatch,
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
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [buffers, setBuffers] = useState<Map<string, ArrayBuffer>>(new Map());

  // Compression modes
  const [mode, setMode] = useState<"exact-size" | "percentage" | "manual">("exact-size");
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
  const [batchResults, setBatchResults] = useState<ProcessedItemOutput[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = React.useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setErrorMessage(null);
    setMetrics(null);
    setOutputBytes(null);
    setBatchResults([]);

    const newItems: UploadedFileItem[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
    }));

    setFiles((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const buffer = await item.file.arrayBuffer();
        setBuffers((prev) => new Map(prev).set(item.id, buffer));
        const count = await getPdfPageCount(buffer);
        setFiles((current) =>
          current.map((f) =>
            f.id === item.id ? { ...f, pageCount: count, status: "ready" } : f
          )
        );
      } catch (err: unknown) {
        console.error(err);
        setFiles((current) =>
          current.map((f) =>
            f.id === item.id
              ? { ...f, status: "error", error: "Encrypted or corrupted PDF." }
              : f
          )
        );
      }
    }

    // Auto-suggest target KB based on first file
    if (newFiles.length > 0) {
      const suggestedKb = Math.max(50, Math.round(newFiles[0].size / 2048));
      setTargetKb(suggestedKb);
    }
  }, []);

  // Chained file ingestion
  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = new Blob([chained.data as unknown as BlobPart], { type: "application/pdf" });
      const file = new File([blob], chained.filename, { type: "application/pdf" });
      handleFilesAdded([file]);
    }
  }, [handleFilesAdded]);

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setBuffers((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleMoveFile = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleCompress = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressMsg("Starting controlled batch compression engine...");
    setProgressPct(5);
    const startTime = performance.now();

    const compressionOptions: ExactCompressionOptions = {
      mode,
      targetSizeKb: targetKb,
      percentageReduction,
      manualDpi,
      manualQuality,
      colorMode,
      stripMetadata: true,
      exactBytePadding,
    };

    try {
      // SINGLE FILE MODE
      if (files.length === 1) {
        const item = files[0];
        const buffer = buffers.get(item.id);
        if (!buffer) throw new Error("File buffer missing.");

        const result = await executeExactCompression(
          buffer,
          compressionOptions,
          (msg, pct) => {
            setProgressMsg(msg);
            setProgressPct(pct);
          }
        );

        const durationMs = performance.now() - startTime;
        const blob = new Blob([result.pdfBytes as unknown as BlobPart], { type: "application/pdf" });
        const downloadUrl = URL.createObjectURL(blob);
        const baseName = item.name.substring(0, item.name.lastIndexOf(".")) || item.name;

        setOutputBytes(result.pdfBytes);
        const itemOutput: ProcessedItemOutput = {
          id: item.id,
          name: `${baseName}_compressed.pdf`,
          originalSize: result.originalSize,
          processedSize: result.finalSize,
          savedPercentage: result.savedPercentage,
          outputBytes: result.pdfBytes,
          outputBlob: blob,
          originalBytes: buffer,
          outputMimeType: "application/pdf",
          downloadUrl,
          pageCount: item.pageCount || 1,
          targetAccuracy: result.targetAccuracy,
        };

        setBatchResults([itemOutput]);
        setMetrics({
          originalSize: result.originalSize,
          processedSize: result.finalSize,
          savedBytes: result.savedBytes,
          savedPercentage: result.savedPercentage,
          durationMs,
          downloadUrl,
          downloadFilename: `${baseName}_compressed.pdf`,
          pageCount: item.pageCount || 1,
          targetAccuracy: result.targetAccuracy,
        });
      } else {
        // MULTI-FILE BATCH MODE (UP TO 30+ FILES)
        const batchInputs = files.map((f) => {
          const buf = buffers.get(f.id);
          if (!buf) throw new Error(`Buffer missing for ${f.name}`);
          return { file: f.file, buffer: buf };
        });

        const { results, summary } = await executeExactCompressionBatch(
          batchInputs,
          compressionOptions,
          (idx, pct, msg) => {
            setFiles((prev) =>
              prev.map((f, i) =>
                i === idx ? { ...f, status: "processing", progress: pct, progressMsg: msg } : f
              )
            );
            const overallPct = Math.round(((idx + pct / 100) / files.length) * 100);
            setProgressPct(overallPct);
            setProgressMsg(msg || `Processing file ${idx + 1} of ${files.length}...`);
          },
          (idx, _res) => {
            setFiles((prev) =>
              prev.map((f, i) =>
                i === idx ? { ...f, status: "done", progress: 100 } : f
              )
            );
          }
        );

        const completedItems: ProcessedItemOutput[] = [];

        results.forEach((res, idx) => {
          if (!res) return;
          const origItem = files[idx];
          const baseName = origItem.name.substring(0, origItem.name.lastIndexOf(".")) || origItem.name;
          const blob = new Blob([res.pdfBytes as unknown as BlobPart], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);

          completedItems.push({
            id: origItem.id,
            name: `${baseName}_compressed.pdf`,
            originalSize: res.originalSize,
            processedSize: res.finalSize,
            savedPercentage: res.savedPercentage,
            outputBytes: res.pdfBytes,
            outputBlob: blob,
            originalBytes: buffers.get(origItem.id),
            outputMimeType: "application/pdf",
            downloadUrl: url,
            pageCount: origItem.pageCount || 1,
            targetAccuracy: res.targetAccuracy,
          });
        });

        if (completedItems.length > 0) {
          const first = completedItems[0];
          setBatchResults(completedItems);
          setOutputBytes(first.outputBytes || null);
          setMetrics({
            originalSize: summary.totalOriginalSize,
            processedSize: summary.totalProcessedSize,
            savedBytes: summary.totalSavedBytes,
            savedPercentage: summary.overallSavedPercentage || 0,
            durationMs: summary.totalDurationMs,
            downloadUrl: first.downloadUrl || "",
            downloadFilename: `${files.length}_PDFs_Compressed.zip`,
            pageCount: files.reduce((s, f) => s + (f.pageCount || 0), 0),
            targetAccuracy: `Batch (${summary.successfulFiles}/${summary.totalFiles} Ready)`,
          });
        }
      }
    } catch (err: unknown) {
      console.error("Batch compression error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Compression failed.");
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
    }
  };

  const totalOriginalBytes = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={files.length === 1 ? buffers.get(files[0].id) : undefined}
          title={files.length > 1 ? `Batch Compressed (${files.length} Files)` : "PDF Compressed to Exact Target!"}
          batchItems={batchResults}
          onAdjustSettings={() => {
            setMetrics(null);
            setBatchResults([]);
          }}
        />
      ) : (
        <>
          <DropZone
            files={files}
            onFilesAdded={handleFilesAdded}
            onRemoveFile={handleRemoveFile}
            onMoveFile={handleMoveFile}
            onClearAll={() => {
              setFiles([]);
              setBuffers(new Map());
            }}
            acceptedFileTypes={{ "application/pdf": [".pdf"] }}
            multiple={true}
            maxFiles={35}
            title="Upload 1 to 30+ PDFs to compress to exact target size"
            subtitle="Hit exact KB sizes, percentage reductions, or custom DPI across single or 30-document batches"
          />

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Document Queue Summary Banner */}
              <div className="p-4 rounded-2xl bg-[#12141D] border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Minimize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      {files.length === 1 ? files[0].name : `${files.length} Documents Loaded for Batch Compression`}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Total Input:{" "}
                      <span className="font-mono text-white font-medium">
                        {formatFileSize(totalOriginalBytes)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    30-Doc Zero-Crash Engine Ready
                  </span>
                </div>
              </div>

              {/* Compression Mode Selector */}
              <div className="p-6 rounded-3xl bg-[#10121A] border border-white/10 space-y-6 shadow-xl">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Select Target Compression Mode
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Mode 1: Exact KB/MB Size */}
                    <button
                      type="button"
                      onClick={() => setMode("exact-size")}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        mode === "exact-size"
                          ? "bg-indigo-600/15 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                          : "bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Target className={`w-4 h-4 ${mode === "exact-size" ? "text-indigo-400" : "text-slate-400"}`} />
                        <span className="font-semibold text-sm">Exact Target Size</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Type exact KB/MB (e.g. 200 KB or 1 MB for portal limits).
                      </p>
                    </button>

                    {/* Mode 2: Percentage Reduction */}
                    <button
                      type="button"
                      onClick={() => setMode("percentage")}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        mode === "percentage"
                          ? "bg-cyan-600/15 border-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                          : "bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Percent className={`w-4 h-4 ${mode === "percentage" ? "text-cyan-400" : "text-slate-400"}`} />
                        <span className="font-semibold text-sm">Exact % Reduction</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Pick exact percentage to shrink (e.g. 50% or 75%).
                      </p>
                    </button>

                    {/* Mode 3: Manual Pro Parameters */}
                    <button
                      type="button"
                      onClick={() => setMode("manual")}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        mode === "manual"
                          ? "bg-purple-600/15 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                          : "bg-white/[0.02] border-white/10 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sliders className={`w-4 h-4 ${mode === "manual" ? "text-purple-400" : "text-slate-400"}`} />
                        <span className="font-semibold text-sm">Manual Pro</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Direct DPI, JPEG quality %, and color controls.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Sub-controls based on mode */}
                {mode === "exact-size" && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <label className="text-xs font-semibold text-white block">
                          Target Maximum File Size (KB)
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Applied across {files.length} document{files.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={20}
                          max={50000}
                          value={targetKb}
                          onChange={(e) => setTargetKb(Math.max(10, parseInt(e.target.value) || 100))}
                          className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-sm w-28 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-xs text-slate-400 font-mono">KB</span>
                      </div>
                    </div>

                    {/* Preset Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-slate-400">Quick Portal Limits:</span>
                      {[100, 200, 300, 500, 1000, 2000].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setTargetKb(kb)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                            targetKb === kb
                              ? "bg-indigo-600 text-white font-semibold shadow-sm"
                              : "bg-white/5 hover:bg-white/10 text-slate-300"
                          }`}
                        >
                          {kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`}
                        </button>
                      ))}
                    </div>

                    {/* Exact Byte Padding Toggle */}
                    <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={exactBytePadding}
                        onChange={(e) => setExactBytePadding(e.target.checked)}
                        className="rounded border-white/20 bg-black/60 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-xs text-slate-300">
                        Exact KB Match Padding (Appends safe comment bytes so file hits requested KB limit)
                      </span>
                    </label>
                  </div>
                )}

                {mode === "percentage" && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white">
                        Percentage Size Reduction
                      </label>
                      <span className="text-sm font-mono text-cyan-400 font-bold">
                        {percentageReduction}% Reduction
                      </span>
                    </div>

                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={percentageReduction}
                      onChange={(e) => setPercentageReduction(parseInt(e.target.value))}
                      className="w-full accent-cyan-500"
                    />

                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>10% (Subtle)</span>
                      <span>50% (Balanced)</span>
                      <span>90% (Maximum Shrink)</span>
                    </div>
                  </div>
                )}

                {mode === "manual" && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-slate-300 block mb-1 font-medium">DPI Resolution</label>
                      <select
                        value={manualDpi}
                        onChange={(e) => setManualDpi(parseInt(e.target.value))}
                        className="w-full p-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono focus:outline-none"
                      >
                        <option value={72}>72 DPI (Web Screen)</option>
                        <option value={96}>96 DPI (Email Fast)</option>
                        <option value={150}>150 DPI (Balanced Standard)</option>
                        <option value={200}>200 DPI (High Clarity)</option>
                        <option value={300}>300 DPI (Print Archival)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-medium">
                        JPEG Quality: {Math.round(manualQuality * 100)}%
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={95}
                        step={5}
                        value={Math.round(manualQuality * 100)}
                        onChange={(e) => setManualQuality(parseInt(e.target.value) / 100)}
                        className="w-full accent-purple-500 mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1 font-medium">Color Palette</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setColorMode("full")}
                          className={`py-1.5 rounded-lg font-medium transition-all ${
                            colorMode === "full"
                              ? "bg-indigo-600 text-white"
                              : "bg-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          Full Color
                        </button>
                        <button
                          type="button"
                          onClick={() => setColorMode("grayscale")}
                          className={`py-1.5 rounded-lg font-medium transition-all ${
                            colorMode === "grayscale"
                              ? "bg-slate-600 text-white"
                              : "bg-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          Grayscale
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button & Live Progress */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#12141D] border border-white/10">
                <div className="text-xs text-slate-400">
                  {isProcessing ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-cyan-400 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{progressMsg || "Compressing documents..."}</span>
                      </div>
                      <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-200"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span>Ready to process {files.length} document{files.length > 1 ? "s" : ""}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCompress}
                  disabled={isProcessing || files.length === 0}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compressing ({progressPct}%)...</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      <span>
                        {files.length > 1
                          ? `Compress All ${files.length} PDFs (Batch 30x)`
                          : "Compress PDF Now"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
