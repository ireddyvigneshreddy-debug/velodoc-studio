"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PageThumbnail, ProcessingMetrics } from "@/types";
import {
  renderAllPagesThumbnails,
  insertPages,
  getPdfPageCount,
  InsertPagesOptions,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  FilePlus,
  Loader2,
  AlertCircle,
  FileCheck,
  PlusCircle,
  Plus,
} from "@/components/common/icons";

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
  const [insertPosition, setInsertPosition] = useState<number>(0); // 0 = at beginning, 1 = after page 1, etc.

  // Auxiliary PDF for insertion
  const [auxFile, setAuxFile] = useState<UploadedFileItem | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = createPdfBlob(chained.data);
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
      status: "ready",
    };
    setAuxFile(item);
  };

  const handleInsert = async () => {
    if (!baseFile || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      let secondaryBuffer: ArrayBuffer | undefined = undefined;
      if (insertType === "pdf") {
        if (!auxFile) {
          throw new Error("Please select a secondary PDF to insert.");
        }
        secondaryBuffer = await auxFile.file.arrayBuffer();
      }

      const options: InsertPagesOptions =
        insertType === "blank"
          ? {
              type: "blank",
              count: blankCount,
              pattern: blankPattern,
              pageSize: blankPageSize,
              tint: paperTint,
            }
          : {
              type: "pdf",
              sourceBuffer: secondaryBuffer!,
            };

      const resultBytes = await insertPages(
        originalBuffer,
        insertPosition,
        options
      );
      const endTime = performance.now();

      const blob = createPdfBlob(resultBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const baseName =
        baseFile.name.substring(0, baseFile.name.lastIndexOf(".")) ||
        baseFile.name;

      setOutputBytes(resultBytes);
      setMetrics({
        originalSize: baseFile.size,
        processedSize: resultBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_pages_added.pdf`,
        pageCount: thumbnails.length + (insertType === "blank" ? blankCount : 1),
        targetAccuracy: `Added ${insertType === "blank" ? `${blankCount} Blank` : "PDF"} Pages`,
      });
    } catch (err: unknown) {
      console.error(err);
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
              title="Upload Base PDF to add &amp; insert pages"
              subtitle="Insert blank, lined, or grid notebook pages or inject pages from another PDF"
            />
          ) : (
            <div className="space-y-6">
              {/* Configuration Controls Bar */}
              <div className="p-5 sm:p-6 rounded-3xl premium-card space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {baseFile.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                      {thumbnails.length} base pages • Selected insert slot: {insertPosition === 0 ? "Beginning (Before Page 1)" : `After Page ${insertPosition}`}
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
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white glass-pill transition-colors cursor-pointer"
                  >
                    Change PDF
                  </button>
                </div>

                {/* Configuration Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Page Source */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
                      Page Source
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInsertType("blank")}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          insertType === "blank"
                            ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md font-semibold"
                            : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Blank / Paper
                      </button>
                      <button
                        type="button"
                        onClick={() => setInsertType("pdf")}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          insertType === "pdf"
                            ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md font-semibold"
                            : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        From 2nd PDF
                      </button>
                    </div>
                  </div>

                  {/* Position Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
                      Insertion Position
                    </label>
                    <select
                      value={insertPosition}
                      onChange={(e) => setInsertPosition(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
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
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
                        Paper Pattern &amp; Count
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={blankPattern}
                          onChange={(e) =>
                            setBlankPattern(
                              e.target.value as "blank" | "lined" | "grid" | "dotted"
                            )
                          }
                          className="px-2.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                        >
                          <option value="blank">Plain Blank</option>
                          <option value="lined">Lined Paper</option>
                          <option value="grid">Grid / Graph</option>
                          <option value="dotted">Dotted Paper</option>
                        </select>
                        <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-xl text-xs">
                          <span className="text-zinc-400 text-[11px]">Pages:</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={blankCount}
                            onChange={(e) => setBlankCount(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-transparent text-white font-mono text-center focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <select
                          value={blankPageSize}
                          onChange={(e) =>
                            setBlankPageSize(
                              e.target.value as "a4" | "letter" | "match"
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs"
                        >
                          <option value="a4">A4 Standard</option>
                          <option value="letter">US Letter</option>
                          <option value="match">Match Doc</option>
                        </select>
                        <select
                          value={paperTint}
                          onChange={(e) => setPaperTint(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs"
                        >
                          <option value="#FFFFFF">White Paper</option>
                          <option value="#FFFBEB">Warm Cream</option>
                          <option value="#F8FAFC">Cool Slate</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-mono">
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
                        <div className="flex items-center justify-between p-2 rounded-xl bg-black/60 border border-white/10 text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-white truncate">
                              {auxFile.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAuxFile(null)}
                            className="text-zinc-400 hover:text-rose-400 text-[10px] ml-2 shrink-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5 font-mono">
                    <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Inserting {insertType === "blank" ? `${blankCount} ${blankPattern} page(s)` : "pages from 2nd PDF"} {insertPosition === 0 ? "at Beginning" : `after Page ${insertPosition}`}
                    </span>
                  </span>

                  <button
                    type="button"
                    disabled={isProcessing || (insertType === "pdf" && !auxFile)}
                    onClick={handleInsert}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Inserting Pages...</span>
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
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Interactive Visual Page Timeline with "+ Insert Page Here" Slots */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                    Visual Document Timeline ({thumbnails.length} Current Pages)
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Click &ldquo;+ Insert Page Here&rdquo; at any slot
                  </span>
                </div>

                {/* Slot 0: Insert at beginning */}
                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => setInsertPosition(0)}
                    className={`w-full py-2 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs transition-all cursor-pointer font-mono ${
                      insertPosition === 0
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-paper ring-1 ring-emerald-400"
                        : "bg-white/[0.02] border-dashed border-white/15 text-zinc-400 hover:text-white hover:border-emerald-400/50 hover:bg-emerald-500/5"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {insertPosition === 0
                        ? "▲ Active Insert Slot: At the Beginning (Before Page 1)"
                        : "+ Insert Page Here (At the Beginning)"}
                    </span>
                  </button>
                </div>

                {/* Page Cards with in-between insertion slots */}
                <div className="space-y-3">
                  {isLoadingThumbnails && (
                    <div className="p-8 text-center text-zinc-400 font-mono text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Rendering page timeline...</span>
                    </div>
                  )}
                  {thumbnails.map((thumb, index) => {
                    const slotPosition = index + 1;
                    const isSelectedSlot = insertPosition === slotPosition;

                    return (
                      <React.Fragment key={`${thumb.pageNumber}-${index}`}>
                        <div className="p-3 rounded-2xl premium-card border border-white/10 flex items-center gap-4">
                          {/* Mini Thumbnail */}
                          <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10">
                            <Image
                              src={thumb.dataUrl}
                              alt={`Page ${thumb.pageNumber}`}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white font-mono">
                              Page {thumb.pageNumber}
                            </div>
                            <div className="text-xs text-zinc-400">
                              Base document page
                            </div>
                          </div>

                          {/* Fast Slot Selector Button */}
                          <button
                            type="button"
                            onClick={() => setInsertPosition(slotPosition)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                              isSelectedSlot
                                ? "bg-emerald-500 text-white font-semibold shadow-md"
                                : "glass-pill text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                            }`}
                          >
                            {isSelectedSlot ? "Selected Insertion Point" : `Insert After Page ${thumb.pageNumber}`}
                          </button>
                        </div>

                        {/* Interactive Insert Divider between pages */}
                        <div className="w-full">
                          <button
                            type="button"
                            onClick={() => setInsertPosition(slotPosition)}
                            className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs transition-all cursor-pointer font-mono ${
                              isSelectedSlot
                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-paper ring-1 ring-emerald-400"
                                : "bg-white/[0.015] border-dashed border-white/10 text-zinc-500 hover:text-zinc-200 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {isSelectedSlot
                                ? `▲ Active Insert Slot: Between Page ${thumb.pageNumber} and ${thumb.pageNumber + 1}`
                                : `+ Insert Page Here (After Page ${thumb.pageNumber})`}
                            </span>
                          </button>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {baseFile && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono truncate max-w-[120px]">
                {insertPosition === 0 ? "At start" : `After p.${insertPosition}`}
              </div>
              <button
                type="button"
                disabled={isProcessing || (insertType === "pdf" && !auxFile)}
                onClick={handleInsert}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 active:from-emerald-600 active:to-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Inserting...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Insert &amp; Preview PDF</span>
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
