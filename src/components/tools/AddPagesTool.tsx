"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ThumbnailGrid } from "@/components/common/ThumbnailGrid";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PageThumbnail, ProcessingMetrics } from "@/types";
import {
  renderAllPagesThumbnails,
  insertPages,
  getPdfPageCount,
  InsertPagesOptions,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import {
  FilePlus,
  Loader2,
  AlertCircle,
  FileCheck,
  PlusCircle,
} from "lucide-react";

export function AddPagesTool() {
  const [baseFile, setBaseFile] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);

  // Insert mode options
  const [insertType, setInsertType] = useState<"blank" | "pdf">("blank");
  const [blankCount, setBlankCount] = useState(1);
  const [blankPageSize, setBlankPageSize] = useState<"a4" | "letter" | "match">("a4");
  const [blankPattern, setBlankPattern] = useState<"blank" | "lined" | "grid" | "dotted">("blank");
  const [paperTint, setPaperTint] = useState<string>("#FFFFFF");
  const [insertPosition, setInsertPosition] = useState<number>(0);

  // Auxiliary PDF for insertion
  const [auxFile, setAuxFile] = useState<UploadedFileItem | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = new Blob([chained.data.buffer as ArrayBuffer], { type: "application/pdf" });
      const file = new File([blob], chained.filename, { type: "application/pdf" });
      handleBaseFileAdded([file]);
    }
  }, []);

  const handleBaseFileAdded = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
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
    setBaseFile(item);
    setIsLoadingThumbnails(true);

    try {
      const buffer = await file.arrayBuffer();
      setOriginalBuffer(buffer);
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      setInsertPosition(count); // Default at the end

      const thumbs = await renderAllPagesThumbnails(buffer, 0.35);
      setThumbnails(thumbs);
      item.status = "ready";
      setBaseFile({ ...item });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Could not read base PDF document.");
      item.status = "error";
      setBaseFile({ ...item });
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const handleAuxFileAdded = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const item: UploadedFileItem = {
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
    };
    setAuxFile(item);

    try {
      const buffer = await file.arrayBuffer();
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      item.status = "ready";
      setAuxFile({ ...item });
    } catch (err) {
      console.error(err);
      item.status = "error";
      item.error = "Invalid or encrypted PDF";
      setAuxFile({ ...item });
    }
  };

  const handleInsert = async () => {
    if (!baseFile || !originalBuffer) return;
    if (insertType === "pdf" && !auxFile) {
      setErrorMessage("Please upload a second PDF to graft pages from.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      let options: InsertPagesOptions;

      if (insertType === "blank") {
        options = {
          type: "blank",
          count: blankCount,
          pattern: blankPattern,
          pageSize: blankPageSize,
          tint: paperTint,
        };
      } else {
        const auxBuffer = await auxFile!.file.arrayBuffer();
        options = {
          type: "pdf",
          sourceBuffer: auxBuffer,
        };
      }

      const newPdfBytes = await insertPages(
        originalBuffer,
        insertPosition,
        options
      );
      const endTime = performance.now();

      const blob = new Blob([newPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const baseName =
        baseFile.name.substring(0, baseFile.name.lastIndexOf(".")) ||
        baseFile.name;

      const pageCount = await getPdfPageCount(newPdfBytes.buffer as ArrayBuffer);

      setOutputBytes(newPdfBytes);
      setMetrics({
        originalSize: baseFile.size + (auxFile ? auxFile.size : 0),
        processedSize: newPdfBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_pages_added.pdf`,
        pageCount,
        targetAccuracy: `Inserted at Page ${insertPosition}`,
      });
    } catch (err: unknown) {
      console.error("Add pages error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to insert pages."
      );
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
          title="Pages Inserted Successfully!"
          onAdjustSettings={() => setMetrics(null)}
        />
      ) : (
        <>
          {!baseFile ? (
            <DropZone
              files={[]}
              onFilesAdded={handleBaseFileAdded}
              onRemoveFile={() => {}}
              acceptedFileTypes={{ "application/pdf": [".pdf"] }}
              multiple={false}
              title="Upload primary PDF to insert pages"
              subtitle="Add blank, lined, or grid pages, or graft pages from an auxiliary document"
            />
          ) : (
            <div className="space-y-6">
              {/* Document Info & Insert Controls */}
              <div className="p-6 rounded-3xl bg-[#12141D] border border-white/10 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {baseFile.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {thumbnails.length} pages currently loaded • Choose insertion settings below
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBaseFile(null);
                      setOriginalBuffer(null);
                      setThumbnails([]);
                      setAuxFile(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Change Base PDF
                  </button>
                </div>

                {/* Configuration Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Page Source */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Page Source
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInsertType("blank")}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                          insertType === "blank"
                            ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md"
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        Blank / Paper
                      </button>
                      <button
                        type="button"
                        onClick={() => setInsertType("pdf")}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                          insertType === "pdf"
                            ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md"
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        Another PDF
                      </button>
                    </div>
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Target Position
                    </label>
                    <select
                      value={insertPosition}
                      onChange={(e) => setInsertPosition(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value={0}>At the Beginning (Before Page 1)</option>
                      {thumbnails.map((_, i) => (
                        <option key={i} value={i + 1}>
                          After Page {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Options details */}
                  {insertType === "blank" ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Count</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={blankCount}
                            onChange={(e) => setBlankCount(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Size</label>
                          <select
                            value={blankPageSize}
                            onChange={(e) => setBlankPageSize(e.target.value as "a4" | "letter" | "match")}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                          >
                            <option value="a4">A4</option>
                            <option value="letter">US Letter</option>
                            <option value="match">Match Document</option>
                          </select>
                        </div>
                      </div>
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Paper Pattern &amp; Tint
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={blankPattern}
                          onChange={(e) => setBlankPattern(e.target.value as "blank" | "lined" | "grid" | "dotted")}
                          className="px-2.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                        >
                          <option value="blank">Plain Blank</option>
                          <option value="lined">Lined Paper</option>
                          <option value="grid">Grid / Graph</option>
                        </select>
                        <select
                          value={paperTint}
                          onChange={(e) => setPaperTint(e.target.value)}
                          className="px-2.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                        >
                          <option value="#FFFFFF">White</option>
                          <option value="#FFFBEB">Cream / Warm</option>
                          <option value="#F8FAFC">Cool Slate</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Secondary PDF
                      </label>
                      {!auxFile ? (
                        <label className="flex items-center justify-center p-2 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer text-xs text-emerald-300 transition-colors">
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                handleAuxFileAdded(Array.from(e.target.files));
                              }
                            }}
                          />
                          <span>+ Upload 2nd PDF</span>
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/10 text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-white truncate">
                              {auxFile.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAuxFile(null)}
                            className="text-slate-400 hover:text-rose-400 text-[10px] ml-2 shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline Insertion Quick Bar */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    <span>Inserting {blankCount} page(s) at position: {insertPosition === 0 ? "Beginning" : `After Page ${insertPosition}`}</span>
                  </span>

                  <button
                    type="button"
                    disabled={isProcessing || (insertType === "pdf" && !auxFile)}
                    onClick={handleInsert}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Inserting...</span>
                      </>
                    ) : (
                      <>
                        <FilePlus className="w-4 h-4" />
                        <span>Insert Pages Now</span>
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

              {/* Base Document Pages Grid */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Current Document Structure ({thumbnails.length} Pages)
                </span>
                <ThumbnailGrid
                  thumbnails={thumbnails}
                  mode="view"
                  isLoading={isLoadingThumbnails}
                  totalPageEstimate={baseFile.pageCount || 0}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
