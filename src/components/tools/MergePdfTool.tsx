"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { mergePdfsPro, getPdfPageCount } from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { Layers, Loader2, Shuffle } from "lucide-react";

export function MergePdfTool() {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interleave, setInterleave] = useState(false);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if chained file was passed from another tool
  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = createPdfBlob(chained.data);
      const file = new File([blob], chained.filename, { type: "application/pdf" });
      handleFilesAdded([file]);
    }
  }, []);

  const handleFilesAdded = async (newFiles: File[]) => {
    setErrorMessage(null);
    const newItems: UploadedFileItem[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
      customPageRange: "",
    }));

    setFiles((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const buffer = await item.file.arrayBuffer();
        const pageCount = await getPdfPageCount(buffer);
        setFiles((current) =>
          current.map((f) =>
            f.id === item.id ? { ...f, pageCount, status: "ready" } : f
          )
        );
      } catch (err: unknown) {
        console.error("Failed to read PDF pages:", err);
        setFiles((current) =>
          current.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "error",
                  error: "Password encrypted or corrupted",
                }
              : f
          )
        );
      }
    }
  };

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

  const handleMerge = async () => {
    if (files.length < 2) {
      setErrorMessage("Please upload at least 2 PDF files to merge.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const items = [];
      let totalOriginalSize = 0;

      for (const item of files) {
        totalOriginalSize += item.size;
        const buf = await item.file.arrayBuffer();
        items.push({
          buffer: buf,
          pageRanges: item.customPageRange,
        });
      }

      const mergedBytes = await mergePdfsPro(items, interleave);
      const endTime = performance.now();

      const blob = createPdfBlob(mergedBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const pageCount = await getPdfPageCount(mergedBytes);
      const savedBytes = Math.max(0, totalOriginalSize - mergedBytes.byteLength);
      const savedPercentage = Math.round(
        (savedBytes / (totalOriginalSize || 1)) * 100
      );

      setOutputBytes(mergedBytes);
      setMetrics({
        originalSize: totalOriginalSize,
        processedSize: mergedBytes.byteLength,
        savedBytes,
        savedPercentage,
        durationMs,
        downloadUrl,
        downloadFilename: "merged_document.pdf",
        pageCount,
        targetAccuracy: "Lossless Merge",
      });
    } catch (err: unknown) {
      console.error("Merge error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while merging PDFs."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          title="PDFs Merged Successfully!"
          onAdjustSettings={() => setMetrics(null)}
        />
      ) : (
        <>
          <DropZone
            files={files}
            onFilesAdded={handleFilesAdded}
            onRemoveFile={handleRemoveFile}
            onMoveFile={handleMoveFile}
            onClearAll={() => setFiles([])}
            acceptedFileTypes={{ "application/pdf": [".pdf"] }}
            multiple={true}
            title="Drop 2 or more PDF files to merge"
            subtitle="Combine documents, extract page ranges per file, or interleave front/back scans"
          />

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              {errorMessage}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-4">
              {/* Per-file custom page range inputs */}
              <div className="p-5 sm:p-6 rounded-3xl premium-card space-y-3 shadow-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block font-mono">
                  Fine-Tune Page Ranges Per File (Optional)
                </span>
                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div
                      key={file.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl glass-pill text-xs"
                    >
                      <div className="truncate flex items-center gap-2">
                        <span className="font-mono text-indigo-400 font-bold tabular-nums">
                          #{idx + 1}
                        </span>
                        <span className="text-white truncate font-medium">{file.name}</span>
                        <span className="text-zinc-500 font-mono tabular-nums">
                          ({file.pageCount || 0} pages)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-[11px] shrink-0 font-mono">
                          Pages:
                        </span>
                        <input
                          type="text"
                          value={file.customPageRange || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFiles((prev) =>
                              prev.map((f) =>
                                f.id === file.id ? { ...f, customPageRange: val } : f
                              )
                            );
                          }}
                          placeholder={`All (e.g. 1-${file.pageCount || 5})`}
                          className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono tabular-nums text-xs w-36 focus:outline-none focus:border-indigo-500 shadow-inner"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Merge Actions & Interleave Toggle */}
              <div className="p-4 sm:p-5 rounded-3xl premium-card flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  {files.length === 2 && (
                    <button
                      type="button"
                      onClick={() => setInterleave(!interleave)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                        interleave
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30"
                          : "glass-pill text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Interleave Duplex Scans</span>
                    </button>
                  )}
                  <span className="text-xs text-zinc-400 font-mono tabular-nums">
                    {files.length} documents • {totalPages} pages queued
                  </span>
                </div>

                <button
                  type="button"
                  disabled={files.length < 2 || isProcessing}
                  onClick={handleMerge}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(99,102,241,0.45)] hover:shadow-[0_0_32px_rgba(99,102,241,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Merging Documents...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Merge {files.length} PDFs</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {files.length >= 2 && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono">
                <span className="font-semibold text-indigo-400">{files.length}</span> PDFs ({totalPages} p)
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleMerge}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 active:from-indigo-600 active:to-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Merging...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    <span>Merge {files.length} PDFs</span>
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
