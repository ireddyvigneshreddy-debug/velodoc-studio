"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, GrayscaleSettings, ProcessingMetrics } from "@/types";
import {
  enhancePdfGrayscale,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { SunMedium, Loader2, AlertCircle, Sparkles } from "lucide-react";

export function GrayscalePdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [settings, setSettings] = useState<GrayscaleSettings>({
    mode: "grayscale",
    brightness: 0,
    contrast: 15,
    threshold: 160,
  });

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

    try {
      const buffer = await file.arrayBuffer();
      setOriginalBuffer(buffer);
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    }
  };

  const handleEnhance = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const enhancedBytes = await enhancePdfGrayscale(originalBuffer, settings);
      const endTime = performance.now();

      const blob = createPdfBlob(enhancedBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(enhancedBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: enhancedBytes.byteLength,
        savedBytes: Math.max(0, fileItem.size - enhancedBytes.byteLength),
        savedPercentage: Math.round(
          (Math.max(0, fileItem.size - enhancedBytes.byteLength) / fileItem.size) * 100
        ),
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_${settings.mode}.pdf`,
        pageCount: fileItem.pageCount || 1,
        targetAccuracy:
          settings.mode === "clean-scan"
            ? "High-Contrast B&W Clean Scan"
            : "Pure Grayscale Transcoded",
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to convert PDF colors.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          title={
            settings.mode === "clean-scan"
              ? "Clean Scan Mode Generated!"
              : "Converted to True Grayscale!"
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
              title="Upload PDF to convert to Grayscale or Clean Scan"
              subtitle="Filter out color ink or enhance faded scanned documents with contrast thresholding"
            />
          ) : (
            <div className="space-y-6">
              {/* Controls Container */}
              <div className="p-6 rounded-3xl bg-[#12141D] border border-white/10 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {fileItem.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fileItem.pageCount} pages • Choose grayscale mode and contrast enhancements
                    </p>
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

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setSettings({ ...settings, mode: "grayscale" })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      settings.mode === "grayscale"
                        ? "bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500/50"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">
                      True Grayscale
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Smooth tonal balance converting all color channels to gray shades.
                    </span>
                  </div>

                  <div
                    onClick={() => setSettings({ ...settings, mode: "clean-scan" })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      settings.mode === "clean-scan"
                        ? "bg-cyan-600/20 border-cyan-500 shadow-md ring-1 ring-cyan-500/50"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">
                        Clean Scan (High Contrast)
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Turns murky paper backgrounds pure white and faded text razor-sharp black.
                    </span>
                  </div>
                </div>

                {/* Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Contrast ({settings.contrast})</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={100}
                      value={settings.contrast}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contrast: Number(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500"
                    />
                  </div>

                  {settings.mode === "clean-scan" && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">
                          B&amp;W Threshold ({settings.threshold})
                        </span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={230}
                        value={settings.threshold}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            threshold: Number(e.target.value),
                          })
                        }
                        className="w-full accent-cyan-500"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-end">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleEnhance}
                    className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-slate-600 to-zinc-700 hover:from-slate-700 hover:to-zinc-800 disabled:opacity-40 text-white font-semibold text-sm flex items-center gap-2 shadow-lg transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enhancing Pages...</span>
                      </>
                    ) : (
                      <>
                        <SunMedium className="w-4 h-4" />
                        <span>Apply Filter &amp; Preview</span>
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
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {fileItem && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono">
                <span className="font-semibold text-cyan-400 capitalize">{settings.mode}</span>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleEnhance}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-slate-600 to-zinc-700 active:from-slate-700 active:to-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enhancing...</span>
                  </>
                ) : (
                  <>
                    <SunMedium className="w-3.5 h-3.5" />
                    <span>Apply Filter</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
