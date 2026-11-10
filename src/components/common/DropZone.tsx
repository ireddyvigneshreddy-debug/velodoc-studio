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
} from "lucide-react";
import { UploadedFileItem } from "@/types";
import { formatFileSize } from "@/lib/utils";
import { generateSamplePdf } from "@/lib/sample-pdf";

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
  subtitle = "or click to browse from your device",
  maxFiles,
  showSampleButton = true,
}: DropZoneProps) {
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        onFilesAdded(accepted);
      }
    },
    [onFilesAdded]
  );

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: acceptedFileTypes,
    multiple,
    maxFiles: maxFiles || (multiple ? undefined : 1),
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone(dropzoneOptions);

  const handleLoadSample = async (e: React.MouseEvent) => {
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

  const isPdfTool =
    acceptedFileTypes["application/pdf"] !== undefined ||
    Object.keys(acceptedFileTypes).length === 0;

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone Box */}
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 overflow-hidden ${
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
            className={`p-4 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-lg ${
              isDragActive
                ? "bg-indigo-600 text-white"
                : "bg-white/5 border border-white/10 text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-500/20"
            }`}
          >
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              {isDragActive
                ? "Release files to load instantly"
                : isDragReject
                ? "File type not supported"
                : title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-mono">
              {Object.values(acceptedFileTypes).flat().join(", ").toUpperCase()}
            </span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% In-Browser Engine (No Upload Limits)
            </span>
          </div>

          {/* Quick "Try with Sample Multi-Page PDF" Button */}
          {showSampleButton && isPdfTool && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isGeneratingSample}
                className="px-4 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              >
                {isGeneratingSample ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating sample...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Try with Sample Multi-Page PDF</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded File Queue */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Files in Queue ({files.length})
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

          <div className="space-y-2">
            {files.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141D] border border-white/10 hover:border-white/20 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatFileSize(item.size)}</span>
                      {item.pageCount !== undefined && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400 font-medium">
                            {item.pageCount}{" "}
                            {item.pageCount === 1 ? "page" : "pages"}
                          </span>
                        </>
                      )}
                      {item.status === "loading" && (
                        <span className="text-amber-400 animate-pulse">
                          Reading pages...
                        </span>
                      )}
                      {item.status === "ready" && (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <FileCheck className="w-3 h-3" /> Ready
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-rose-400 flex items-center gap-0.5">
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === files.length - 1}
                        onClick={() => onMoveFile(index, "down")}
                        aria-label="Move file down"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemoveFile(item.id)}
                    aria-label="Remove file"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
