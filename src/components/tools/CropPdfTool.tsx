"use client";

import React, { useState, useEffect, useRef } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, CropMargins, ProcessingMetrics } from "@/types";
import {
  cropPdfMargins,
  renderPdfPageToCanvas,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import {
  Crop,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "@/components/common/icons";

const CROP_PRESETS = [
  { label: "Standard Trim (5%)", top: 5, bottom: 5, left: 5, right: 5 },
  { label: "Header & Footer (12%)", top: 12, bottom: 12, left: 4, right: 4 },
  { label: "Binding Gutter (Left 10%)", top: 4, bottom: 4, left: 10, right: 4 },
  { label: "Full Bleed (0%)", top: 0, bottom: 0, left: 0, right: 0 },
];

export function CropPdfTool() {
  const { createTrackedUrl, revokeAll } = useObjectUrls();
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [margins, setMargins] = useState<CropMargins>({
    topPercent: 5,
    bottomPercent: 5,
    leftPercent: 5,
    rightPercent: 5,
    applyToAll: true,
  });

  const pageCanvasRef = useRef<HTMLCanvasElement>(null);

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
      setTotalPages(count);
      setCurrentPage(1);
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    }
  };

  useEffect(() => {
    let active = true;
    async function loadPage() {
      if (!originalBuffer) return;
      try {
        const canvas = await renderPdfPageToCanvas(originalBuffer, currentPage, 1.4);
        if (active && pageCanvasRef.current) {
          const target = pageCanvasRef.current;
          target.width = canvas.width;
          target.height = canvas.height;
          const ctx = target.getContext("2d");
          ctx?.drawImage(canvas, 0, 0);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    loadPage();
    return () => {
      active = false;
    };
  }, [originalBuffer, currentPage]);

  const handleCrop = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const croppedBytes = await cropPdfMargins(originalBuffer, margins);
      const endTime = performance.now();

      const blob = createPdfBlob(croppedBytes);
      const downloadUrl = createTrackedUrl(blob);
      const durationMs = endTime - startTime;

      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(croppedBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: croppedBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_cropped.pdf`,
        pageCount: fileItem.pageCount || 1,
        targetAccuracy: `Trimmed Margins (${margins.leftPercent}% L, ${margins.rightPercent}% R)`,
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to crop PDF margins.");
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
          title="PDF Margins Cropped &amp; Resized!"
          onAdjustSettings={() => {
            revokeAll();
            setMetrics(null);
          }}
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
              title="Upload PDF to crop &amp; trim margins"
              subtitle="Visually trim header, footer, or side borders and standardize paper dimensions"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Margin Sliders */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-6 rounded-3xl premium-card space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-semibold text-white text-base">
                      {fileItem.name}
                    </h3>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Page {currentPage}/{totalPages}
                    </span>
                  </div>

                  {/* Preset Chips */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block font-mono">
                      Margin Presets
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CROP_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() =>
                            setMargins({
                              ...margins,
                              topPercent: p.top,
                              bottomPercent: p.bottom,
                              leftPercent: p.left,
                              rightPercent: p.right,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl glass-pill text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all text-left truncate cursor-pointer font-mono"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Range Sliders */}
                  <div className="space-y-4 pt-1">
                    {/* Top */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Top Margin Trim</span>
                        <span className="font-mono text-amber-400 font-semibold tabular-nums">
                          {margins.topPercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={margins.topPercent}
                        onChange={(e) =>
                          setMargins({
                            ...margins,
                            topPercent: Number(e.target.value),
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Bottom */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Bottom Margin Trim</span>
                        <span className="font-mono text-amber-400 font-semibold tabular-nums">
                          {margins.bottomPercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={margins.bottomPercent}
                        onChange={(e) =>
                          setMargins({
                            ...margins,
                            bottomPercent: Number(e.target.value),
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Left */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Left Margin Trim</span>
                        <span className="font-mono text-amber-400 font-semibold tabular-nums">
                          {margins.leftPercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={margins.leftPercent}
                        onChange={(e) =>
                          setMargins({
                            ...margins,
                            leftPercent: Number(e.target.value),
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Right */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Right Margin Trim</span>
                        <span className="font-mono text-amber-400 font-semibold tabular-nums">
                          {margins.rightPercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={margins.rightPercent}
                        onChange={(e) =>
                          setMargins({
                            ...margins,
                            rightPercent: Number(e.target.value),
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleCrop}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Cropping Pages...</span>
                        </>
                      ) : (
                        <>
                          <Crop className="w-4 h-4" />
                          <span>Crop &amp; Preview PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Live Visual Crop Box Overlay */}
              <div className="lg:col-span-7 flex flex-col items-center space-y-3">
                <div className="flex items-center justify-between w-full text-xs text-zinc-400 px-2 font-mono">
                  <span>Live Visual Crop Overlay</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded-lg glass-pill text-zinc-300 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1 text-zinc-300">{currentPage}/{totalPages}</span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded-lg glass-pill text-zinc-300 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative border border-white/15 rounded-2xl overflow-hidden bg-black/60 shadow-2xl max-w-full select-none">
                  <canvas ref={pageCanvasRef} className="max-w-full h-auto block" />

                  {/* Active crop frame overlay with dimmed exterior */}
                  <div
                    style={{
                      position: "absolute",
                      top: `${margins.topPercent}%`,
                      bottom: `${margins.bottomPercent}%`,
                      left: `${margins.leftPercent}%`,
                      right: `${margins.rightPercent}%`,
                    }}
                    className="border-2 border-dashed border-amber-400 shadow-paper pointer-events-none transition-all duration-100 flex items-center justify-center"
                  >
                    <span className="text-[10px] font-mono text-amber-300/80 bg-black/60 px-2 py-0.5 rounded border border-amber-400/40">
                      Crop Area
                    </span>
                  </div>
                </div>

                <span className="text-[11px] text-zinc-500 text-center font-mono">
                  Adjust sliders on the left to trim margins. The highlighted area represents the final page.
                </span>
              </div>
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {fileItem && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono">
                <span className="font-semibold text-amber-400">T:{margins.topPercent}% B:{margins.bottomPercent}%</span>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCrop}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 active:from-amber-700 active:to-yellow-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cropping...</span>
                  </>
                ) : (
                  <>
                    <Crop className="w-3.5 h-3.5" />
                    <span>Crop &amp; Preview PDF</span>
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
