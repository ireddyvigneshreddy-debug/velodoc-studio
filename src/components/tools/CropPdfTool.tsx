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
import { Crop, Loader2, AlertCircle } from "lucide-react";

export function CropPdfTool() {
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
        const canvas = await renderPdfPageToCanvas(originalBuffer, currentPage, 1.2);
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
      const downloadUrl = URL.createObjectURL(blob);
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
              title="Upload PDF to crop &amp; trim margins"
              subtitle="Visually trim header, footer, or side borders and standardize paper dimensions"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Margin Sliders */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-6 rounded-3xl bg-[#12141D] border border-white/10 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-semibold text-white text-sm">
                      Margin Trim Controls (%)
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Page {currentPage}/{totalPages}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Top */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Top Margin Trim</span>
                        <span className="font-mono text-cyan-400 font-semibold">
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
                        className="w-full accent-amber-500"
                      />
                    </div>

                    {/* Bottom */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Bottom Margin Trim</span>
                        <span className="font-mono text-cyan-400 font-semibold">
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
                        className="w-full accent-amber-500"
                      />
                    </div>

                    {/* Left */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Left Margin Trim</span>
                        <span className="font-mono text-cyan-400 font-semibold">
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
                        className="w-full accent-amber-500"
                      />
                    </div>

                    {/* Right */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Right Margin Trim</span>
                        <span className="font-mono text-cyan-400 font-semibold">
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
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleCrop}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(217,119,6,0.35)] transition-all"
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
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Live Visual Crop Box Overlay */}
              <div className="lg:col-span-7 flex flex-col items-center space-y-3">
                <div className="flex items-center justify-between w-full text-xs text-slate-400 px-2">
                  <span>Visual Trim Preview</span>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="relative border border-white/15 rounded-2xl overflow-hidden bg-black/60 shadow-2xl max-w-full">
                  <canvas ref={pageCanvasRef} className="max-w-full h-auto block" />

                  {/* Active crop frame overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: `${margins.topPercent}%`,
                      bottom: `${margins.bottomPercent}%`,
                      left: `${margins.leftPercent}%`,
                      right: `${margins.rightPercent}%`,
                    }}
                    className="border-2 border-dashed border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] pointer-events-none"
                  />
                </div>

                <span className="text-[11px] text-slate-500 text-center">
                  Adjust sliders on the left to set custom crop bounds across all pages
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
