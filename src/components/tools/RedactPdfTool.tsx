"use client";

import React, { useState, useRef, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, RedactionArea, ProcessingMetrics } from "@/types";
import {
  redactAndSanitizePdf,
  renderPdfPageToCanvas,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  Loader2,
  Trash2,
  AlertCircle,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "@/components/common/icons";

export function RedactPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [redactions, setRedactions] = useState<RedactionArea[]>([]);
  const [redactColor, setRedactColor] = useState<string>("#000000"); // black, white

  // Drawing state on page
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

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
    setRedactions([]);

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

  // Render current page onto canvas
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    const x = Math.min(startPos.x, curX);
    const y = Math.min(startPos.y, curY);
    const w = Math.abs(curX - startPos.x);
    const h = Math.abs(curY - startPos.y);

    setCurrentBox({ x, y, w, h });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos || !currentBox) {
      setIsDrawing(false);
      return;
    }
    setIsDrawing(false);

    const rect = e.currentTarget.getBoundingClientRect();
    if (currentBox.w > 10 && currentBox.h > 10) {
      const xPercent = (currentBox.x / rect.width) * 100;
      const yPercent = (currentBox.y / rect.height) * 100;
      const widthPercent = (currentBox.w / rect.width) * 100;
      const heightPercent = (currentBox.h / rect.height) * 100;

      const newRedaction: RedactionArea = {
        id: Math.random().toString(36).substring(7),
        pageNumber: currentPage,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        color: redactColor,
      };

      setRedactions((prev) => [...prev, newRedaction]);
    }

    setStartPos(null);
    setCurrentBox(null);
  };

  const handleRedactAndSanitize = async () => {
    if (!fileItem || !originalBuffer) return;
    if (redactions.length === 0) {
      setErrorMessage("Please draw at least one redaction box.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const redactedBytes = await redactAndSanitizePdf(
        originalBuffer,
        redactions
      );
      const endTime = performance.now();

      const blob = createPdfBlob(redactedBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(redactedBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: redactedBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_sanitized_redacted.pdf`,
        pageCount: fileItem.pageCount || 1,
        targetAccuracy: "True Flatten Security (0 Recoverable Text)",
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to flatten and redact PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageRedactions = redactions.filter(
    (r) => r.pageNumber === currentPage
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          title="PDF Redacted &amp; Flattened!"
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
              title="Upload PDF to permanently redact text &amp; sanitize"
              subtitle="Draw redaction rectangles directly across sensitive text with true rasterized bitmap flattening"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Security Redaction Controls */}
              <div className="lg:col-span-5 space-y-5">
                <div className="p-5 sm:p-6 rounded-3xl premium-card space-y-5 shadow-xl">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {fileItem.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                      Page {currentPage} of {totalPages} • {redactions.length} Total Redactions Active
                    </p>
                  </div>

                  {/* Redaction Style Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
                      Redaction Mask Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRedactColor("#000000")}
                        className={`p-3 rounded-2xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          redactColor === "#000000"
                            ? "bg-black text-white border-zinc-500 shadow-lg ring-2 ring-indigo-500"
                            : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded bg-black border border-white/30" />
                        <span>Blackout Box</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRedactColor("#FFFFFF")}
                        className={`p-3 rounded-2xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          redactColor === "#FFFFFF"
                            ? "bg-white text-black border-white shadow-lg ring-2 ring-indigo-500"
                            : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded bg-white border border-black/30" />
                        <span>Whiteout Box</span>
                      </button>
                    </div>
                  </div>

                  {/* Security Guarantee Pill */}
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>True Bitmap Raster Flattening</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Redacted pages are rasterized into flat pixel bitmaps. All underlying text, vector curves, and search streams are irrevocably erased.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={currentPageRedactions.length === 0}
                        onClick={() =>
                          setRedactions((prev) =>
                            prev.filter((r) => r.pageNumber !== currentPage)
                          )
                        }
                        className="flex-1 py-2 rounded-xl glass-pill text-xs text-zinc-400 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                      >
                        Clear Current Page
                      </button>
                      <button
                        type="button"
                        disabled={redactions.length === 0}
                        onClick={() => setRedactions([])}
                        className="flex-1 py-2 rounded-xl glass-pill text-xs text-zinc-400 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                      >
                        Clear All ({redactions.length})
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing || redactions.length === 0}
                      onClick={handleRedactAndSanitize}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sanitizing &amp; Flattening...</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>Flatten &amp; Redact PDF ({redactions.length})</span>
                        </>
                      )}
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive Canvas Stage */}
              <div className="lg:col-span-7 space-y-3 flex flex-col items-center">
                <div className="flex items-center justify-between w-full text-xs text-zinc-400 px-2 font-mono">
                  <span>Page {currentPage} of {totalPages}</span>
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

                {/* Interactive Redaction Drawing Stage */}
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative border border-white/15 rounded-2xl overflow-hidden bg-black/60 shadow-2xl max-w-full cursor-crosshair select-none touch-none"
                >
                  <canvas ref={pageCanvasRef} className="max-w-full h-auto block pointer-events-none" />

                  {/* Live dragging box preview */}
                  {isDrawing && currentBox && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${currentBox.x}px`,
                        top: `${currentBox.y}px`,
                        width: `${currentBox.w}px`,
                        height: `${currentBox.h}px`,
                        backgroundColor: redactColor === "#000000" ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.75)",
                      }}
                      className="border-2 border-dashed border-rose-500 shadow-lg pointer-events-none"
                    />
                  )}

                  {/* Render saved redaction areas */}
                  {currentPageRedactions.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        position: "absolute",
                        left: `${r.xPercent}%`,
                        top: `${r.yPercent}%`,
                        width: `${r.widthPercent}%`,
                        height: `${r.heightPercent}%`,
                        backgroundColor: r.color,
                      }}
                      className={`group border ${
                        r.color === "#000000" ? "border-white/20" : "border-black/30"
                      } flex items-center justify-center shadow-md`}
                    >
                      {/* Delete this redaction */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRedactions((prev) => prev.filter((item) => item.id !== r.id));
                        }}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-full bg-rose-600 text-white transition-opacity shadow-lg cursor-pointer"
                        title="Delete redaction box"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <span className="text-[11px] text-zinc-500 text-center font-mono">
                  Click and drag across sensitive text on the page to draw redaction blocks
                </span>
              </div>
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {redactions.length > 0 && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono">
                <span className="font-semibold text-rose-400">{redactions.length}</span> redacted box{redactions.length > 1 ? "es" : ""}
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRedactAndSanitize}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 active:from-rose-700 active:to-red-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Flattening...</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Flatten &amp; Redact PDF</span>
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
