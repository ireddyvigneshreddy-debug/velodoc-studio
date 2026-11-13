"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import {
  compressImageExact,
  packageImagesToZip,
  ProcessedImageResult,
  ExactImageOptions,
} from "@/lib/image-engine";
import { createSafeFile } from "@/lib/utils";
import {
  Sparkles,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { sessionHistory } from "@/lib/session-history";
import { formatFileSize } from "@/lib/utils";

type SupportedFormat = "image/jpeg" | "image/png" | "image/webp";

const PASSPORT_PRESETS = [
  { label: "20 KB", kb: 20, desc: "Passport / Signature" },
  { label: "50 KB", kb: 50, desc: "Gov Portal / Visa" },
  { label: "100 KB", kb: 100, desc: "Standard Upload" },
  { label: "250 KB", kb: 250, desc: "Web Optimized" },
  { label: "500 KB", kb: 500, desc: "High Definition" },
  { label: "1 MB", kb: 1024, desc: "Max Detail" },
];

export function ImageStudioTool() {
  const [images, setImages] = useState<UploadedFileItem[]>([]);
  const [mode, setMode] = useState<"exact-kb" | "percentage" | "manual">("exact-kb");
  const [targetKb, setTargetKb] = useState<number>(50);
  const [percentageReduction, setPercentageReduction] = useState<number>(50);
  const [format, setFormat] = useState<SupportedFormat>("image/webp");
  const [quality, setQuality] = useState<number>(0.8);
  const [maxWidth, setMaxWidth] = useState<number>(1920);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [results, setResults] = useState<ProcessedImageResult[]>([]);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [originalBytes, setOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setErrorMessage(null);
    setResults([]);
    setMetrics(null);

    const items: UploadedFileItem[] = newFiles.map((f) => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      name: f.name,
      size: f.size,
      status: "ready",
    }));

    setImages((prev) => [...prev, ...items]);
  }, []);

  // Chained file ingestion
  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained) {
      const file = createSafeFile(chained.data, chained.filename, chained.mimeType);
      handleFilesAdded([file]);
    }
  }, [handleFilesAdded]);

  const handleProcess = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setResults([]);
    setMetrics(null);
    const startTime = performance.now();

    const options: ExactImageOptions = {
      mode,
      targetKb: mode === "exact-kb" ? targetKb : undefined,
      percentageReduction: mode === "percentage" ? percentageReduction : undefined,
      format,
      maxWidth: mode === "manual" ? maxWidth : undefined,
      manualQuality: mode === "manual" ? quality : undefined,
    };

    try {
      const processedList: ProcessedImageResult[] = [];

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        const res = await compressImageExact(item.file, options, (msg, pct) => {
          setProgressMsg(`[${i + 1}/${images.length}] ${msg}`);
          setProgressPercent(pct);
        });
        processedList.push(res);
      }

      setResults(processedList);
      const durationMs = performance.now() - startTime;

      if (processedList.length === 1) {
        const p = processedList[0];
        const outBuf = await p.processedBlob.arrayBuffer();
        const origBuf = await p.originalFile.arrayBuffer();
        const url = URL.createObjectURL(p.processedBlob);

        setOutputBytes(new Uint8Array(outBuf));
        setOriginalBytes(origBuf);
        setMetrics({
          originalSize: p.originalSize,
          processedSize: p.processedSize,
          savedBytes: Math.max(0, p.originalSize - p.processedSize),
          savedPercentage: p.savedPercentage,
          durationMs,
          downloadUrl: url,
          downloadFilename: p.name,
          targetAccuracy: "Precision Target Fit",
        });
      } else {
        const zipBlob = await packageImagesToZip(processedList);
        const zipBuf = await zipBlob.arrayBuffer();
        const origBuf = await images[0].file.arrayBuffer();
        const url = URL.createObjectURL(zipBlob);
        const totalOrigSize = processedList.reduce((s, x) => s + x.originalSize, 0);
        const totalProcessedSize = processedList.reduce((s, x) => s + x.processedSize, 0);
        const savedBytes = Math.max(0, totalOrigSize - totalProcessedSize);
        const savedPct = Math.round((savedBytes / totalOrigSize) * 100);

        setOutputBytes(new Uint8Array(zipBuf));
        setOriginalBytes(origBuf);
        setMetrics({
          originalSize: totalOrigSize,
          processedSize: totalProcessedSize,
          savedBytes,
          savedPercentage: savedPct,
          durationMs,
          downloadUrl: url,
          downloadFilename: "optimized_images_bundle.zip",
          targetAccuracy: "Batch Optimization",
        });
      }
    } catch (err: unknown) {
      console.error("Image compression error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to compress images."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {metrics ? (
        <div className="space-y-8">
          <ResultPreviewStudio
            metrics={metrics}
            outputBytes={outputBytes || undefined}
            originalBytes={originalBytes || undefined}
            outputMimeType={results.length === 1 ? format : "application/zip"}
            title="Image Compression Complete!"
            onAdjustSettings={() => setMetrics(null)}
          />

          {/* Multi-result breakdown cards if batch */}
          {results.length > 1 && (
            <div className="max-w-5xl mx-auto space-y-4 pt-6 border-t border-white/10">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Batch Optimization Summary ({results.length} files)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {results.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 rounded-xl bg-[#12141D] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0">
                        <Image
                          src={res.dataUrl}
                          alt={res.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate">
                          {res.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatFileSize(res.originalSize)} →{" "}
                          <span className="text-emerald-400 font-medium">
                            {formatFileSize(res.processedSize)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                      <span className="text-indigo-400 font-medium">
                        -{res.savedPercentage}% saved
                      </span>
                      <a
                        href={res.dataUrl}
                        download={res.name}
                        className="text-slate-300 hover:text-white flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Save</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <DropZone
            files={images}
            onFilesAdded={handleFilesAdded}
            onRemoveFile={(id) => setImages((p) => p.filter((x) => x.id !== id))}
            onClearAll={() => setImages([])}
            acceptedFileTypes={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            multiple={true}
            title="Upload Images to Compress & Convert"
            subtitle="Compress photos to exact KB size (passport / visa portal safe) with binary-search precision"
          />

          {images.length > 0 && (
            <div className="space-y-6">
              {/* Segmented Hardware Mode Switcher */}
              <div className="p-1.5 rounded-2xl glass-pill grid grid-cols-1 sm:grid-cols-3 gap-2 relative">
                {[
                  {
                    id: "exact-kb",
                    label: "Target File Size (KB)",
                    desc: "Passport / Portal safe",
                  },
                  {
                    id: "percentage",
                    label: "Percentage Reduction (%)",
                    desc: "10% to 90% shrink",
                  },
                  {
                    id: "manual",
                    label: "Manual Pro Controls",
                    desc: "Dimensions & quality",
                  },
                ].map((m) => {
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id as "exact-kb" | "percentage" | "manual")}
                      className={`relative py-3 px-3.5 rounded-xl text-left transition-all cursor-pointer z-10 ${
                        isSelected
                          ? "text-white font-semibold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="imageStudioMode"
                          className="absolute inset-0 rounded-xl bg-teal-600/25 border border-teal-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(20,184,166,0.25)] backdrop-blur-md"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <div className="relative z-10 text-xs font-semibold">{m.label}</div>
                      <div className="relative z-10 text-[10px] text-zinc-400 mt-0.5">{m.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Mode-Specific Settings */}
              <div className="p-5 sm:p-6 rounded-3xl premium-card space-y-4">
                {mode === "exact-kb" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-2 block">
                        Quick Passport & Government Portal Presets
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {PASSPORT_PRESETS.map((pst) => (
                          <button
                            key={pst.label}
                            type="button"
                            onClick={() => setTargetKb(pst.kb)}
                            className={`p-2.5 rounded-xl text-left border transition-all ${
                              targetKb === pst.kb
                                ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            <div className="text-xs font-bold text-white">
                              {pst.label}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {pst.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-w-xs">
                      <label className="text-xs font-medium text-slate-300 mb-1 block">
                        Exact Target Size (KB)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={10}
                          max={10000}
                          value={targetKb}
                          onChange={(e) => setTargetKb(Math.max(5, Number(e.target.value)))}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono font-bold"
                        />
                        <span className="text-xs text-slate-400 font-semibold">KB</span>
                      </div>
                    </div>
                  </div>
                )}

                {mode === "percentage" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">
                        Percentage Reduction Target
                      </span>
                      <span className="text-indigo-400 font-bold text-sm">
                        {percentageReduction}% smaller
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={percentageReduction}
                      onChange={(e) => setPercentageReduction(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>10% (Subtle)</span>
                      <span>50% (Standard)</span>
                      <span>90% (Ultra Compact)</span>
                    </div>
                  </div>
                )}

                {mode === "manual" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                        <span>Max Width Constraint</span>
                        <span className="font-mono text-indigo-400">{maxWidth}px</span>
                      </label>
                      <input
                        type="range"
                        min={480}
                        max={3840}
                        step={80}
                        value={maxWidth}
                        onChange={(e) => setMaxWidth(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                        <span>Quality Level</span>
                        <span className="font-mono text-indigo-400">
                          {Math.round(quality * 100)}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Output Format Selector */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-300">
                    Output Image Format
                  </span>
                  <div className="flex items-center gap-2">
                    {[
                      { id: "image/webp", label: "WebP (Optimal)" },
                      { id: "image/jpeg", label: "JPEG (Universal)" },
                      { id: "image/png", label: "PNG (Lossless)" },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setFormat(fmt.id as SupportedFormat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          format === fmt.id
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                            : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress / Status Display */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-300">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{progressMsg || "Processing images..."}</span>
                    </span>
                    <span className="font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Trigger */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Executing Precision Compression...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Compress {images.length} Image{images.length > 1 ? "s" : ""}</span>
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
