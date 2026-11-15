"use client";

import React, { useCallback, useState } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import {
  UploadCloud,
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Sparkles,
  Loader2,
  Layers,
  Image as ImageIcon,
  Camera,
  FolderOpen,
  CheckCircle2,
} from "@/components/common/icons";
import { UploadedFileItem } from "@/types";
import { formatFileSize } from "@/lib/utils";
import {
  generateSamplePdf,
  generateSamplePdfBatch,
  generateSampleImageBatch,
} from "@/lib/sample-pdf";

interface DropZoneProps {
  files: UploadedFileItem[];
  onFilesAdded: (newFiles: File[]) => void;
  onRemoveFile: (id: string) => void;
  onMoveFile?: (index: number, direction: "up" | "down") => void;
  onReorderFiles?: (newFiles: UploadedFileItem[]) => void;
  onClearAll?: () => void;
  acceptedFileTypes?: { [key: string]: string[] };
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  maxFiles?: number;
  showSampleButton?: boolean;
  onOpenScanner?: () => void;
}

export function DropZone({
  files,
  onFilesAdded,
  onRemoveFile,
  onMoveFile,
  onReorderFiles,
  onClearAll,
  acceptedFileTypes = { "application/pdf": [".pdf"] },
  multiple = true,
  title = "Drop your files here",
  subtitle = "or click to browse from your device (accepts up to 30+ files with zero memory crash)",
  maxFiles = 35,
  showSampleButton = true,
  onOpenScanner,
}: DropZoneProps) {
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [emptyFilesSkipped, setEmptyFilesSkipped] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const valid = accepted.filter((f) => f.size > 0);
      if (valid.length < accepted.length) {
        setEmptyFilesSkipped(true);
        setTimeout(() => setEmptyFilesSkipped(false), 3500);
      }
      if (valid.length > 0) {
        onFilesAdded(valid);
      }
    },
    [onFilesAdded]
  );

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: acceptedFileTypes,
    multiple,
    maxFiles: maxFiles || (multiple ? 35 : 1),
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone(dropzoneOptions);

  const isPdfTool =
    acceptedFileTypes["application/pdf"] !== undefined ||
    Object.keys(acceptedFileTypes).length === 0;

  const isImageTool =
    acceptedFileTypes["image/jpeg"] !== undefined ||
    acceptedFileTypes["image/png"] !== undefined;

  const handleLoadSingleSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingSample(true);
    try {
      const sampleFile = await generateSamplePdf();
      onFilesAdded([sampleFile]);
    } catch (err) {
      console.error("Failed to generate sample PDF:", err);
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const handleLoadBatchSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingBatch(true);
    try {
      if (isImageTool) {
        const sampleImages = await generateSampleImageBatch(10);
        onFilesAdded(sampleImages);
      } else {
        const sampleBatch = await generateSamplePdfBatch(10);
        onFilesAdded(sampleBatch);
      }
    } catch (err) {
      console.error("Failed to generate sample batch:", err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {emptyFilesSkipped && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Skipped 0-byte or unreadable file(s) to protect in-memory pipeline.</span>
        </div>
      )}

      {/* Swiss Editorial Tactile Dropzone */}
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer rounded-xl p-6 sm:p-10 text-center transition-all duration-200 overflow-hidden paper-card ${
          isDragActive
            ? "border-vermilion bg-vermilion-light/40 dark:bg-vermilion/10 scale-[1.01]"
            : isDragReject
            ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20"
            : "bg-white dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border hover:border-vermilion/60"
        }`}
      >
        <input {...getInputProps()} />

        {/* Layered Floating Document Illustration */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-3.5">
          <div className="relative">
            {/* Background layered ghost pages */}
            <div className="absolute -top-1 -left-2 w-12 h-14 rounded-md bg-paper-200 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border -rotate-6 transition-transform group-hover:-rotate-12 duration-200 pointer-events-none" />
            <div className="absolute -top-1 -right-2 w-12 h-14 rounded-md bg-paper-200 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border rotate-6 transition-transform group-hover:rotate-12 duration-200 pointer-events-none" />

            {/* Central icon container */}
            <div
              className={`relative z-10 p-4 rounded-lg shadow-paper transition-all duration-200 ${
                isDragActive
                  ? "scale-[1.06] bg-vermilion text-white"
                  : "bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border text-vermilion group-hover:scale-105"
              }`}
            >
              <UploadCloud className="w-7 h-7" />
            </div>
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm sm:text-base font-semibold text-ink-primary dark:text-white tracking-tight font-sans">
              {isDragActive
                ? "Release files to load into memory instantly"
                : isDragReject
                ? "File type not supported for this studio tool"
                : title}
            </h3>
            <p className="text-xs text-ink-secondary dark:text-paper-400 leading-normal font-sans">{subtitle}</p>
          </div>

          {/* Supported Types & Telemetry Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded bg-paper-100 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border font-mono text-[10px] text-ink-secondary dark:text-paper-400 tracking-wider uppercase">
              {Object.values(acceptedFileTypes).flat().join(", ")}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF5F2] dark:bg-[#143A2F]/40 border border-[#C4DFD5] dark:border-[#143A2F] text-[#1B4D3E] dark:text-[#6ee7b7] font-mono tabular-nums text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              100% In-Memory • 30-Doc Queue Safe
            </span>
          </div>

          {/* Prominent Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              className="keycap-btn px-4 py-2 rounded-lg text-ink-primary dark:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer hover:border-vermilion"
            >
              <FolderOpen className="w-3.5 h-3.5 text-vermilion" />
              <span>Select up to 30 Files</span>
            </button>

            {onOpenScanner && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenScanner();
                }}
                className="px-4 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 dark:hover:bg-charcoal-600 border border-paper-300 dark:border-charcoal-border text-ink-primary dark:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-paper"
              >
                <Camera className="w-3.5 h-3.5 text-vermilion" />
                <span>Scan with Camera</span>
              </button>
            )}

            {showSampleButton && isPdfTool && (
              <button
                type="button"
                onClick={handleLoadSingleSample}
                disabled={isGeneratingSample || isGeneratingBatch}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-900 dark:text-white border border-zinc-300 dark:border-charcoal-border text-xs font-medium flex items-center gap-1.5 transition-all shadow-paper cursor-pointer disabled:opacity-50"
              >
                {isGeneratingSample ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#C2410C] dark:text-cyan-400" />
                    <span>Load Instant Sample PDF (1x)</span>
                  </>
                )}
              </button>
            )}

            {multiple && (
              <button
                type="button"
                onClick={handleLoadBatchSample}
                disabled={isGeneratingSample || isGeneratingBatch}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-900 dark:text-white border border-zinc-300 dark:border-charcoal-border text-xs font-medium flex items-center gap-1.5 transition-all shadow-paper cursor-pointer disabled:opacity-50"
              >
                {isGeneratingBatch ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating 10x Batch...</span>
                  </>
                ) : (
                  <>
                    {isImageTool ? (
                      <ImageIcon className="w-3.5 h-3.5 text-[#2E5A44] dark:text-emerald-400" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-cyan-400" />
                    )}
                    <span>Load 10x Batch Sample</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 30-Document Batch Queue Strip / Glass Table */}
      {files.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-mono">
                Document Queue
              </span>
              <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 border border-slate-300 dark:bg-white/[0.06] dark:border-white/[0.09] dark:text-zinc-300">
                {files.length} {files.length === 1 ? "document" : "documents"} (Max 35)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {onReorderFiles && files.length > 1 && (
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const sorted = [...files].sort((a, b) =>
                        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
                      );
                      onReorderFiles(sorted);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors cursor-pointer"
                    title="Sort natural numeric (e.g. 1, 2, 10)"
                  >
                    1, 2, 10
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sorted = [...files].sort((a, b) =>
                        b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" })
                      );
                      onReorderFiles(sorted);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors cursor-pointer"
                  >
                    Z → A
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorderFiles([...files].reverse())}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors cursor-pointer"
                  >
                    Reverse
                  </button>
                </div>
              )}

              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="text-xs text-[#1E3A5F] dark:text-cyan-400 hover:text-[#C2410C] dark:hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>+ Scan More</span>
                </button>
              )}
              {onClearAll && files.length > 1 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {files.map((item, index) => {
              const hasProcessedMetrics =
                item.processedSize !== undefined && item.processedSize > 0;
              const savedPct =
                hasProcessedMetrics && item.size > 0
                  ? Math.round(((item.size - item.processedSize!) / item.size) * 100)
                  : null;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border text-xs transition-all hover:border-zinc-400 dark:hover:border-white/[0.18] shadow-paper"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                    <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-500 w-5 text-right shrink-0">
                      #{index + 1}
                    </span>
                    <div className="p-2 rounded-xl bg-orange-50 dark:bg-indigo-500/10 text-[#C2410C] dark:text-indigo-400 border border-orange-200 dark:border-indigo-500/20 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1 truncate">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-950 dark:text-white truncate text-xs font-sans">
                          {item.name}
                        </p>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
                          {formatFileSize(item.size)}
                        </span>

                        {/* Live Before / After Byte Savings Pill */}
                        {hasProcessedMetrics && savedPct !== null && savedPct > 0 && (
                          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-950 dark:bg-emerald-500/15 dark:border-emerald-500/25 dark:text-emerald-300 font-mono tabular-nums text-[10px] font-semibold">
                            -{savedPct}% ({formatFileSize(item.processedSize!)})
                          </span>
                        )}
                      </div>

                      {/* Memory & Progress Status */}
                      <div className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {item.pageCount !== undefined && (
                          <span className="text-zinc-800 dark:text-indigo-300 font-medium font-mono tabular-nums">
                            {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
                          </span>
                        )}

                        {item.status === "queued" && (
                          <span className="text-zinc-600 dark:text-zinc-500 font-mono text-[10px]">
                            Queued
                          </span>
                        )}
                        {item.status === "loading" && (
                          <span className="text-amber-700 dark:text-amber-400 animate-pulse text-[10px] font-mono font-medium">
                            Reading memory...
                          </span>
                        )}
                        {item.status === "processing" && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-800 dark:text-cyan-400 font-mono tabular-nums text-[10px] font-medium">
                              {item.progressMsg || `Optimizing ${item.progress ? `${Math.round(item.progress)}%` : "..."}`}
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-white/[0.08] overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-200"
                                style={{ width: `${Math.max(item.progress || 15, 8)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {item.status === "done" && (
                          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 text-[10px] font-medium font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Done
                          </span>
                        )}
                        {item.status === "ready" && (
                          <span className="text-zinc-700 dark:text-zinc-400 text-[10px] font-mono">Ready</span>
                        )}
                        {item.status === "error" && (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5 text-[10px] font-mono">
                            <AlertCircle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Queue Reorder & Delete Controls */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {onMoveFile && multiple && (
                      <>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => onMoveFile(index, "up")}
                          aria-label="Move file up"
                          className="p-1 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === files.length - 1}
                          onClick={() => onMoveFile(index, "down")}
                          aria-label="Move file down"
                          className="p-1 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveFile(item.id)}
                      aria-label="Remove file"
                      className="p-1 rounded-lg text-zinc-600 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/15 transition-colors ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
