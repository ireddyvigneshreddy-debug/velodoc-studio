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
} from "lucide-react";
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

      {/* Magnetic Animated Smoked Glass Dropzone */}
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer rounded-3xl p-6 sm:p-10 text-center transition-all duration-300 overflow-hidden premium-card ${
          isDragActive
            ? "border-indigo-400 bg-indigo-500/15 shadow-[0_0_40px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] scale-[1.01]"
            : isDragReject
            ? "border-rose-500 bg-rose-500/15 shadow-[0_0_35px_rgba(244,63,94,0.3)]"
            : "border-white/[0.08] hover:border-indigo-500/40 hover:shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
        }`}
      >
        <input {...getInputProps()} />

        {/* Dynamic neon edge glow when drag active */}
        <div
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
            isDragActive
              ? "opacity-100 bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent"
              : "opacity-0"
          }`}
        />

        {/* Layered Floating Document Illustration */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-3.5">
          <div className="relative">
            {/* Background layered ghost pages */}
            <div className="absolute -top-1 -left-2 w-12 h-14 rounded-xl bg-white/[0.03] border border-white/[0.08] -rotate-6 transition-transform group-hover:-rotate-12 duration-300 pointer-events-none" />
            <div className="absolute -top-1 -right-2 w-12 h-14 rounded-xl bg-white/[0.03] border border-white/[0.08] rotate-6 transition-transform group-hover:rotate-12 duration-300 pointer-events-none" />

            {/* Central glowing icon container with spring bounce */}
            <div
              className={`relative z-10 p-4 rounded-2xl shadow-xl transition-all duration-300 ${
                isDragActive
                  ? "scale-[1.08] bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-[0_0_24px_rgba(99,102,241,0.6)]"
                  : "bg-white/[0.05] border border-white/[0.12] text-indigo-400 group-hover:text-cyan-300 group-hover:scale-105 group-hover:bg-white/[0.08] group-hover:border-white/[0.2] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              }`}
            >
              <UploadCloud className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
              {isDragActive
                ? "Release files to load into memory instantly"
                : isDragReject
                ? "File type not supported for this studio tool"
                : title}
            </h3>
            <p className="text-xs text-zinc-400 leading-normal">{subtitle}</p>
          </div>

          {/* Supported Types & Telemetry Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] font-mono text-[10px] text-zinc-300 tracking-wider uppercase">
              {Object.values(acceptedFileTypes).flat().join(", ")}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono tabular-nums text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% In-Memory • Zero-Crash 30-Doc Queue
            </span>
          </div>

          {/* Prominent Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              className="keycap-btn px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:border-indigo-400/40"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Select up to 30 Files</span>
            </button>

            {onOpenScanner && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenScanner();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-500/40 text-cyan-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scan with Camera</span>
              </button>
            )}

            {showSampleButton && isPdfTool && (
              <button
                type="button"
                onClick={handleLoadSingleSample}
                disabled={isGeneratingSample || isGeneratingBatch}
                className="px-3.5 py-2 rounded-xl glass-pill hover:bg-white/[0.08] text-indigo-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isGeneratingSample ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
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
                className="px-3.5 py-2 rounded-xl glass-pill hover:bg-white/[0.08] text-cyan-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isGeneratingBatch ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating 10x Batch...</span>
                  </>
                ) : (
                  <>
                    {isImageTool ? (
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
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
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Document Queue
              </span>
              <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.09] text-zinc-300">
                {files.length} {files.length === 1 ? "document" : "documents"} (Max 35)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>+ Scan More</span>
                </button>
              )}
              {onClearAll && files.length > 1 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
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
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl premium-card text-xs transition-all hover:border-white/[0.18]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                    <span className="text-[11px] font-mono tabular-nums text-zinc-500 w-5 text-right shrink-0">
                      #{index + 1}
                    </span>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1 truncate">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate text-xs">
                          {item.name}
                        </p>
                        <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                          {formatFileSize(item.size)}
                        </span>

                        {/* Live Before / After Byte Savings Pill */}
                        {hasProcessedMetrics && savedPct !== null && savedPct > 0 && (
                          <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-mono tabular-nums text-[10px]">
                            -{savedPct}% ({formatFileSize(item.processedSize!)})
                          </span>
                        )}
                      </div>

                      {/* Memory & Progress Status */}
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        {item.pageCount !== undefined && (
                          <span className="text-indigo-400 font-medium font-mono tabular-nums">
                            {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
                          </span>
                        )}

                        {item.status === "queued" && (
                          <span className="text-zinc-500 font-mono text-[10px]">
                            Queued
                          </span>
                        )}
                        {item.status === "loading" && (
                          <span className="text-amber-400 animate-pulse text-[10px] font-mono">
                            Reading memory...
                          </span>
                        )}
                        {item.status === "processing" && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-cyan-400 font-mono tabular-nums text-[10px]">
                              {item.progressMsg || `Optimizing ${item.progress ? `${Math.round(item.progress)}%` : "..."}`}
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all duration-200"
                                style={{ width: `${Math.max(item.progress || 15, 8)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {item.status === "done" && (
                          <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-medium font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Done
                          </span>
                        )}
                        {item.status === "ready" && (
                          <span className="text-zinc-400 text-[10px] font-mono">Ready</span>
                        )}
                        {item.status === "error" && (
                          <span className="text-rose-400 flex items-center gap-0.5 text-[10px] font-mono">
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
                          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === files.length - 1}
                          onClick={() => onMoveFile(index, "down")}
                          aria-label="Move file down"
                          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveFile(item.id)}
                      aria-label="Remove file"
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors ml-1"
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
