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
  ShieldAlert,
  Loader2,
  Trash2,
  AlertCircle,
  EyeOff,
} from "lucide-react";

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
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
        targetAccuracy: "True Flatten Security (0 Text Recoverable)",
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
              title="Upload PDF to redact sensitive text &amp; sanitize"
              subtitle="Draw blackout boxes with true rasterization flattening to permanently destroy text streams"
            />
          ) : (
            <div className="space-y-6">
              {/* Header Configuration Banner */}
              <div className="p-5 rounded-3xl bg-[#12141D] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <h3 className="font-semibold text-white text-base">
                    {fileItem.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {redactions.length} redaction area(s) marked • Drag boxes over sensitive numbers, names, or addresses
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Redaction Color:</span>
                    <button
                      type="button"
                      onClick={() => setRedactColor("#000000")}
                      className={`w-6 h-6 rounded-full bg-black border-2 ${
                        redactColor === "#000000"
                          ? "border-rose-500 scale-110 shadow"
                          : "border-white/20"
                      }`}
                      title="Blackout"
                    />
                    <button
                      type="button"
                      onClick={() => setRedactColor("#FFFFFF")}
                      className={`w-6 h-6 rounded-full bg-white border-2 ${
                        redactColor === "#FFFFFF"
                          ? "border-rose-500 scale-110 shadow"
                          : "border-white/20"
                      }`}
                      title="Whiteout"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing || redactions.length === 0}
                    onClick={handleRedactAndSanitize}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Flattening...</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Apply Redactions &amp; Flatten PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stage Container */}
              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center justify-between w-full text-xs text-slate-400 px-2">
                  <span>Page {currentPage} of {totalPages}</span>
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

                {/* Interactive Drawing Stage */}
                <div
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="relative border border-white/15 rounded-2xl overflow-hidden bg-black/60 shadow-2xl cursor-crosshair max-w-full select-none"
                >
                  <canvas ref={pageCanvasRef} className="max-w-full h-auto block pointer-events-none" />

                  {/* Active drawing rubber band */}
                  {currentBox && currentBox.w > 0 && currentBox.h > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${currentBox.x}px`,
                        top: `${currentBox.y}px`,
                        width: `${currentBox.w}px`,
                        height: `${currentBox.h}px`,
                        backgroundColor: redactColor,
                        opacity: 0.85,
                      }}
                      className="border-2 border-rose-500 pointer-events-none"
                    />
                  )}

                  {/* Render saved redaction rectangles */}
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
                      className="group border border-dashed border-rose-500 shadow-md"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRedactions((prev) =>
                            prev.filter((item) => item.id !== r.id)
                          );
                        }}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Redaction"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>
                    True Security Flatten: Pages will be rasterized to guarantee no underlying text or vector streams remain
                  </span>
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
        </>
      )}
    </div>
  );
}
