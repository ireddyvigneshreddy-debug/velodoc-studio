"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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
import { useObjectUrls } from "@/hooks/useObjectUrls";
import {
  Minimize2,
  Loader2,
  AlertCircle,
  Sliders,
  Target,
  Percent,
} from "@/components/common/icons";
import { formatFileSize } from "@/lib/utils";

export function CompressPdfTool() {
  const { createTrackedUrl, revokeAll } = useObjectUrls();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [files, setFiles] = useState<UploadedFileItem[]>([]);

  // Compression modes
  const [mode, setMode] = useState<"exact-size" | "percentage" | "manual">("exact-size");
  const [targetKb, setTargetKb] = useState<number>(300);
  const [percentageReduction, setPercentageReduction] = useState<number>(50);

  // Manual Pro settings
  const [manualDpi, setManualDpi] = useState<number>(150);
  const [manualQuality, setManualQuality] = useState<number>(0.7);
  const [colorMode, setColorMode] = useState<"full" | "grayscale">("full");
  const [exactBytePadding, setExactBytePadding] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [batchResults, setBatchResults] = useState<ProcessedItemOutput[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setProgressMsg("Cancelling compression...");
    }
  }, []);

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    revokeAll();
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
        const count = await getPdfPageCount(await item.file.arrayBuffer());
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
  }, [revokeAll]);

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

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // SINGLE FILE MODE
      if (files.length === 1) {
        const item = files[0];
        const buffer = await item.file.arrayBuffer();

        const result = await executeExactCompression(
          buffer,
          compressionOptions,
          (msg, pct) => {
            setProgressMsg(msg);
            setProgressPct(pct);
          },
          abortController.signal
        );

        const durationMs = performance.now() - startTime;
        const blob = new Blob([result.pdfBytes as unknown as BlobPart], { type: "application/pdf" });
        const downloadUrl = createTrackedUrl(blob);
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
          originalBytes: item.size <= 25 * 1024 * 1024 ? buffer : undefined,
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
        // MULTI-FILE BATCH MODE (UP TO 30+ FILES) - Lazy buffer loading per file
        const batchInputs = files.map((f) => ({ file: f.file }));

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
          },
          abortController.signal
        );

        const completedItems: ProcessedItemOutput[] = [];

        results.forEach((res, idx) => {
          if (!res) return;
          const origItem = files[idx];
          const baseName = origItem.name.substring(0, origItem.name.lastIndexOf(".")) || origItem.name;
          const blob = new Blob([res.pdfBytes as unknown as BlobPart], { type: "application/pdf" });
          const url = createTrackedUrl(blob);

          completedItems.push({
            id: origItem.id,
            name: `${baseName}_compressed.pdf`,
            originalSize: res.originalSize,
            processedSize: res.finalSize,
            savedPercentage: res.savedPercentage,
            outputBytes: res.pdfBytes,
            outputBlob: blob,
            originalBytes: undefined,
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
      if (err instanceof DOMException && err.name === "AbortError") {
        setProgressMsg("Compression cancelled by user.");
        setErrorMessage(null);
      } else {
        console.error("Batch compression error:", err);
        setErrorMessage(err instanceof Error ? err.message : "Compression failed.");
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const totalOriginalBytes = files.reduce((acc, f) => acc + f.size, 0);

  // Beginner-Friendly Plain-English Presets
  const EVERYDAY_COMPRESS_PRESETS = [
    {
      id: "preset-100kb",
      title: "Portal / Exam Upload",
      badge: "Under 100 KB",
      desc: "Perfect for government, university & job portal caps",
      action: () => {
        setMode("exact-size");
        setTargetKb(95);
      },
      isActive: mode === "exact-size" && targetKb <= 100,
    },
    {
      id: "preset-200kb",
      title: "Standard Form Size",
      badge: "Under 200 KB",
      desc: "Widely accepted size for official PDF documents",
      action: () => {
        setMode("exact-size");
        setTargetKb(195);
      },
      isActive: mode === "exact-size" && targetKb > 100 && targetKb <= 250,
    },
    {
      id: "preset-500kb",
      title: "WhatsApp & Email Friendly",
      badge: "Under 500 KB",
      desc: "Fast sharing across phones without quality loss",
      action: () => {
        setMode("exact-size");
        setTargetKb(480);
      },
      isActive: mode === "exact-size" && targetKb > 250 && targetKb <= 500,
    },
    {
      id: "preset-50pct",
      title: "High Clarity Reduce",
      badge: "50% Smaller",
      desc: "Halves file weight while preserving crisp vector text",
      action: () => {
        setMode("percentage");
        setPercentageReduction(50);
      },
      isActive: mode === "percentage" && percentageReduction === 50,
    },
    {
      id: "preset-custom",
      title: "Custom Exact Size",
      badge: `${targetKb} KB`,
      desc: "Enter any exact target size limit you need",
      action: () => {
        setMode("exact-size");
      },
      isActive: mode === "exact-size" && targetKb !== 95 && targetKb !== 195 && targetKb !== 480,
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={files.length === 1 && files[0].size <= 25 * 1024 * 1024 ? batchResults[0]?.originalBytes : undefined}
          title={files.length > 1 ? `Batch Compressed (${files.length} Files)` : "PDF Compressed to Exact Target!"}
          batchItems={batchResults}
          onAdjustSettings={() => {
            revokeAll();
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
              revokeAll();
              setFiles([]);
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
              <div className="p-4 rounded-2xl bg-white dark:bg-[#12141D] border border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-50 text-[#C2410C] dark:bg-cyan-500/10 dark:text-cyan-400 border border-orange-200 dark:border-cyan-500/20">
                    <Minimize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-950 dark:text-white text-sm">
                      {files.length === 1 ? files[0].name : `${files.length} Documents Loaded for Batch Compression`}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-slate-400">
                      Total Input:{" "}
                      <span className="font-mono text-zinc-900 dark:text-white font-semibold">
                        {formatFileSize(totalOriginalBytes)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-800 dark:text-cyan-400 px-3 py-1 rounded-full bg-zinc-100 dark:bg-cyan-500/10 border border-zinc-200 dark:border-cyan-500/20 font-medium">
                    30-Doc Zero-Crash Engine Ready
                  </span>
                </div>
              </div>

              {/* Beginner-Friendly 1-Tap Everyday Presets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase tracking-wider block font-mono">
                  ⚡ 1-Tap Everyday Presets
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {EVERYDAY_COMPRESS_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={preset.action}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        preset.isActive
                          ? "bg-orange-50 border-orange-400 text-orange-950 dark:bg-indigo-600/20 dark:border-indigo-500 dark:text-white shadow-sm ring-1 ring-orange-400 dark:ring-indigo-500"
                          : "bg-white dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-zinc-950 dark:text-white truncate">{preset.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-orange-700 dark:text-cyan-300 font-semibold mb-1 block">
                        {preset.badge}
                      </span>
                      <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-tight">
                        {preset.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Visual Feedback Box */}
              <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/20 text-xs text-cyan-950 dark:text-cyan-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-700 dark:text-cyan-400">✨</span>
                  <span className="font-medium">
                    {mode === "exact-size"
                      ? `Ready: Will compress ${files.length} PDF${files.length > 1 ? "s" : ""} to exact ~${targetKb} KB max cap while keeping text sharp.`
                      : mode === "percentage"
                      ? `Ready: Will reduce file weight by ${percentageReduction}% across ${files.length} PDF${files.length > 1 ? "s" : ""}.`
                      : `Ready: Will apply manual ${manualDpi} DPI & ${Math.round(manualQuality * 100)}% quality.`}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-cyan-400/20 text-slate-900 dark:text-cyan-300 border border-slate-300 dark:border-transparent shrink-0">
                  Zero Upload • 100% In-Memory
                </span>
              </div>

              {/* Compression Mode Selector */}
              <div className="p-6 rounded-3xl premium-card space-y-6 shadow-xl">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-400 uppercase tracking-wider mb-3">
                    Select Target Compression Mode
                  </h4>
                  <div className="relative grid grid-cols-1 md:grid-cols-3 gap-2.5 p-1.5 rounded-2xl glass-pill">
                    {/* Mode 1: Exact KB/MB Size */}
                    <button
                      type="button"
                      onClick={() => setMode("exact-size")}
                      className={`relative p-3.5 rounded-xl text-left transition-all cursor-pointer z-10 ${
                        mode === "exact-size"
                          ? "text-zinc-950 dark:text-white font-semibold"
                          : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {mode === "exact-size" && (
                        <motion.div
                          layoutId="compressMode"
                          className="absolute inset-0 rounded-xl bg-white border border-zinc-300 shadow-sm dark:bg-indigo-600/25 dark:border-indigo-500/40"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2 mb-1">
                        <Target className={`w-4 h-4 ${mode === "exact-size" ? "text-orange-600 dark:text-indigo-400" : "text-zinc-500 dark:text-zinc-400"}`} />
                        <span className="font-semibold text-sm">Exact Target Size</span>
                      </div>
                      <p className="relative z-10 text-[11.5px] text-zinc-600 dark:text-zinc-400 leading-snug">
                        Type exact KB/MB (e.g. 200 KB or 1 MB for portal limits).
                      </p>
                    </button>

                    {/* Mode 2: Percentage Reduction */}
                    <button
                      type="button"
                      onClick={() => setMode("percentage")}
                      className={`relative p-3.5 rounded-xl text-left transition-all cursor-pointer z-10 ${
                        mode === "percentage"
                          ? "text-zinc-950 dark:text-white font-semibold"
                          : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {mode === "percentage" && (
                        <motion.div
                          layoutId="compressMode"
                          className="absolute inset-0 rounded-xl bg-white border border-zinc-300 shadow-sm dark:bg-cyan-600/25 dark:border-cyan-500/40"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2 mb-1">
                        <Percent className={`w-4 h-4 ${mode === "percentage" ? "text-orange-600 dark:text-cyan-400" : "text-zinc-500 dark:text-zinc-400"}`} />
                        <span className="font-semibold text-sm">Exact % Reduction</span>
                      </div>
                      <p className="relative z-10 text-[11.5px] text-zinc-600 dark:text-zinc-400 leading-snug">
                        Pick exact percentage to shrink (e.g. 50% or 75%).
                      </p>
                    </button>

                    {/* Mode 3: Manual Pro Parameters */}
                    <button
                      type="button"
                      onClick={() => setMode("manual")}
                      className={`relative p-3.5 rounded-xl text-left transition-all cursor-pointer z-10 ${
                        mode === "manual"
                          ? "text-zinc-950 dark:text-white font-semibold"
                          : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {mode === "manual" && (
                        <motion.div
                          layoutId="compressMode"
                          className="absolute inset-0 rounded-xl bg-white border border-zinc-300 shadow-sm dark:bg-purple-600/25 dark:border-purple-500/40"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center gap-2 mb-1">
                        <Sliders className={`w-4 h-4 ${mode === "manual" ? "text-orange-600 dark:text-purple-400" : "text-zinc-500 dark:text-zinc-400"}`} />
                        <span className="font-semibold text-sm">Manual Pro</span>
                      </div>
                      <p className="relative z-10 text-[11.5px] text-zinc-600 dark:text-zinc-400 leading-snug">
                        Direct DPI, JPEG quality %, and color controls.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Sub-controls based on mode */}
                {mode === "exact-size" && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-950 dark:text-white block">
                          Target Maximum File Size (KB)
                        </label>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
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
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/60 border border-zinc-300 dark:border-white/10 text-zinc-950 dark:text-white font-mono tabular-nums text-sm w-28 focus:outline-none focus:border-orange-500 shadow-inner"
                        />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">KB</span>
                      </div>
                    </div>

                    {/* Preset Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-zinc-700 dark:text-zinc-400">Quick Portal Limits:</span>
                      {[100, 200, 300, 500, 1000, 2000].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setTargetKb(kb)}
                          className={`px-3 py-1 rounded-xl text-xs font-mono tabular-nums transition-all cursor-pointer ${
                            targetKb === kb
                              ? "bg-[#C2410C] text-white font-semibold shadow-sm border border-orange-600"
                              : "bg-white hover:bg-zinc-100 dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-white/10"
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
                        className="rounded border-zinc-300 dark:border-white/20 bg-white dark:bg-black/60 text-[#C2410C] focus:ring-0"
                      />
                      <span className="text-xs text-zinc-700 dark:text-zinc-300">
                        Exact KB Match Padding (Appends safe comment bytes so file hits requested KB limit)
                      </span>
                    </label>
                  </div>
                )}

                {mode === "percentage" && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-950 dark:text-white">
                        Percentage Size Reduction
                      </label>
                      <span className="text-sm font-mono text-[#C2410C] dark:text-cyan-400 font-bold">
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
                      className="w-full accent-[#C2410C]"
                    />

                    <div className="flex justify-between text-[11px] text-zinc-600 dark:text-slate-400 font-mono">
                      <span>10% (Subtle)</span>
                      <span>50% (Balanced)</span>
                      <span>90% (Maximum Shrink)</span>
                    </div>
                  </div>
                )}

                {mode === "manual" && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-zinc-800 dark:text-slate-300 block mb-1 font-medium">DPI Resolution</label>
                      <select
                        value={manualDpi}
                        onChange={(e) => setManualDpi(parseInt(e.target.value))}
                        className="w-full p-2 rounded-xl bg-white dark:bg-black/60 border border-zinc-300 dark:border-white/10 text-zinc-950 dark:text-white font-mono focus:outline-none"
                      >
                        <option value={72}>72 DPI (Web Screen)</option>
                        <option value={96}>96 DPI (Email Fast)</option>
                        <option value={150}>150 DPI (Balanced Standard)</option>
                        <option value={200}>200 DPI (High Clarity)</option>
                        <option value={300}>300 DPI (Print Archival)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-zinc-800 dark:text-slate-300 block mb-1 font-medium">
                        JPEG Quality: {Math.round(manualQuality * 100)}%
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={95}
                        step={5}
                        value={Math.round(manualQuality * 100)}
                        onChange={(e) => setManualQuality(parseInt(e.target.value) / 100)}
                        className="w-full accent-[#C2410C] mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-800 dark:text-slate-300 block mb-1 font-medium">Color Palette</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setColorMode("full")}
                          className={`py-1.5 rounded-lg font-medium transition-all ${
                            colorMode === "full"
                              ? "bg-[#C2410C] text-white"
                              : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-700 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-transparent"
                          }`}
                        >
                          Full Color
                        </button>
                        <button
                          type="button"
                          onClick={() => setColorMode("grayscale")}
                          className={`py-1.5 rounded-lg font-medium transition-all ${
                            colorMode === "grayscale"
                              ? "bg-zinc-800 text-white"
                              : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-700 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white border border-zinc-200 dark:border-transparent"
                          }`}
                        >
                          Grayscale
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Action Button & Live Progress */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#12141D] border border-zinc-200 dark:border-white/10 shadow-sm">
                <div className="text-xs text-zinc-700 dark:text-slate-400">
                  {isProcessing ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[#C2410C] dark:text-cyan-400 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{progressMsg || "Compressing documents..."}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-48 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-200"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-2.5 py-0.5 rounded-lg border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span>Ready to process {files.length} document{files.length > 1 ? "s" : ""}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {isProcessing && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-3 rounded-xl border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold font-mono transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCompress}
                    disabled={isProcessing || files.length === 0}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#C2410C] hover:bg-[#A8370A] disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
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

              {/* Mobile Thumb-Zone Sticky Action Bar */}
              <div className="fixed bottom-0 inset-x-0 z-40 pb-safe md:hidden p-3 bg-white/95 dark:bg-[#05060B]/95 backdrop-blur-2xl border-t border-zinc-200 dark:border-white/15 shadow-lg">
                <div className="flex items-center gap-2">
                  {isProcessing && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="py-3.5 px-4 rounded-2xl border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-bold font-mono transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCompress}
                    disabled={isProcessing || files.length === 0}
                    className="flex-1 py-3.5 rounded-2xl bg-[#C2410C] hover:bg-[#A8370A] disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
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
                            ? `Compress ${files.length} PDFs`
                            : `Compress PDF (${mode === "exact-size" ? `${targetKb} KB` : `${percentageReduction}%`})`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
