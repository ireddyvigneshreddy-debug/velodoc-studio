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
  FileCheck,
  Sparkles,
  Loader2,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { UploadedFileItem } from "@/types";
import { formatFileSize } from "@/lib/utils";
import { generateSamplePdf, generateSamplePdfBatch, generateSampleImageBatch } from "@/lib/sample-pdf";

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
  subtitle = "or click to browse from your device (accepts up to 30+ files)",
  maxFiles = 35,
  showSampleButton = true,
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

  const isPdfTool =
    acceptedFileTypes["application/pdf"] !== undefined ||
    Object.keys(acceptedFileTypes).length === 0;

  const isImageTool =
    acceptedFileTypes["image/jpeg"] !== undefined ||
    acceptedFileTypes["image/png"] !== undefined;

  return (
    <div className="w-full space-y-4">
      {emptyFilesSkipped && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Skipped 0-byte or unreadable file(s) to prevent processing crashes.</span>
        </div>
      )}
      {/* Drop Zone Box */}
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all duration-200 overflow-hidden ${
          isDragActive
            ? "border-indigo-400 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.25)]"
            : isDragReject
            ? "border-rose-500 bg-rose-500/10"
            : "border-white/10 hover:border-indigo-500/50 bg-[#10121A]/90 hover:bg-[#141622]"
        }`}
      >
        <input {...getInputProps()} />

        {/* Ambient subtle glow background */}
        <div className="absolute inset-0 bg-gradient-radial from-indigo-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
          <div
            className={`p-3.5 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-lg ${
              isDragActive
                ? "bg-indigo-600 text-white"
                : "bg-white/5 border border-white/10 text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-500/20"
            }`}
          >
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
              {isDragActive
                ? "Release files to load instantly"
                : isDragReject
                ? "File type not supported"
                : title}
            </h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
            <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[10px]">
              {Object.values(acceptedFileTypes).flat().join(", ").toUpperCase()}
            </span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% Client-Side Engine (Up to 30+ Files Zero Crash)
            </span>
          </div>

          {/* 1-Click Test Buttons */}
          {showSampleButton && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {isPdfTool && (
                <button
                  type="button"
                  onClick={handleLoadSingleSample}
                  disabled={isGeneratingSample || isGeneratingBatch}
                  className="px-3.5 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {isGeneratingSample ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Load 1 Sample PDF</span>
                    </>
                  )}
                </button>
              )}

              {multiple && (
                <button
                  type="button"
                  onClick={handleLoadBatchSample}
                  disabled={isGeneratingSample || isGeneratingBatch}
                  className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {isGeneratingBatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating 10 Files...</span>
                    </>
                  ) : (
                    <>
                      {isImageTool ? <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>Load 10-File Batch Test</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Uploaded File Queue Strip / Table */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Document Queue ({files.length} {files.length === 1 ? "file" : "files"})
            </span>
            {onClearAll && files.length > 1 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {files.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#12141D] border border-white/10 hover:border-white/20 transition-all shadow-sm text-xs"
              >
                <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                  <span className="text-[11px] font-mono text-slate-500 w-5 text-right flex-shrink-0">
                    #{index + 1}
                  </span>
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>

                  <div className="min-w-0 flex-1 truncate">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate text-xs">
                        {item.name}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatFileSize(item.size)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      {item.pageCount !== undefined && (
                        <span className="text-indigo-400 font-medium">
                          {item.pageCount} {item.pageCount === 1 ? "pg" : "pgs"}
                        </span>
                      )}

                      {/* Status Badges */}
                      {item.status === "loading" && (
                        <span className="text-amber-400 animate-pulse text-[10px]">
                          Reading...
                        </span>
                      )}
                      {item.status === "processing" && (
                        <span className="text-cyan-400 font-mono text-[10px]">
                          Processing {item.progress ? `${Math.round(item.progress)}%` : ""}
                        </span>
                      )}
                      {item.status === "done" && (
                        <span className="text-emerald-400 flex items-center gap-0.5 text-[10px] font-medium">
                          <FileCheck className="w-3 h-3" /> Done
                        </span>
                      )}
                      {item.status === "ready" && (
                        <span className="text-slate-400 text-[10px]">Ready</span>
                      )}
                      {item.status === "error" && (
                        <span className="text-rose-400 flex items-center gap-0.5 text-[10px]">
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Queue Controls */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {onMoveFile && multiple && (
                    <>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMoveFile(index, "up")}
                        aria-label="Move file up"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === files.length - 1}
                        onClick={() => onMoveFile(index, "down")}
                        aria-label="Move file down"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemoveFile(item.id)}
                    aria-label="Remove file"
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
