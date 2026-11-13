"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PdfMetadataInfo, ProcessingMetrics } from "@/types";
import {
  readPdfMetadata,
  updatePdfMetadata,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  FileSearch,
  ShieldCheck,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";

export function MetadataPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadataInfo | null>(null);

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
      const meta = await readPdfMetadata(buffer);
      setMetadata(meta);
      item.pageCount = meta.pageCount;
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not inspect PDF metadata.");
      setFileItem({ ...item });
    }
  };

  const handleSave = async (sanitizeAll: boolean = false) => {
    if (!fileItem || !originalBuffer || !metadata) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const updatedBytes = await updatePdfMetadata(
        originalBuffer,
        metadata,
        sanitizeAll
      );
      const endTime = performance.now();

      const blob = createPdfBlob(updatedBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(updatedBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: updatedBytes.byteLength,
        savedBytes: Math.max(0, fileItem.size - updatedBytes.byteLength),
        savedPercentage: Math.round(
          (Math.max(0, fileItem.size - updatedBytes.byteLength) / fileItem.size) * 100
        ),
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_${sanitizeAll ? "sanitized" : "updated"}.pdf`,
        pageCount: fileItem.pageCount || 1,
        targetAccuracy: sanitizeAll
          ? "All Metadata Wiped (100% Clean)"
          : "Metadata Fields Updated",
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to update PDF metadata.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          title="Metadata Updated &amp; Inspected!"
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
              title="Upload PDF to inspect &amp; edit metadata"
              subtitle="View hidden dictionary tags, author info, software signatures, or sanitize in 1 click"
            />
          ) : (
            metadata && (
              <div className="space-y-6">
                {/* File Header */}
                <div className="p-5 rounded-3xl bg-[#12141D] border border-white/10 flex items-center justify-between gap-4 shadow-xl">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {fileItem.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {metadata.pageCount} pages • Dimensions: {metadata.pageSizeSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Sanitize &amp; Wipe All</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFileItem(null);
                        setOriginalBuffer(null);
                        setMetadata(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Change PDF
                    </button>
                  </div>
                </div>

                {/* Form Editor */}
                <div className="p-6 rounded-3xl bg-[#12141D] border border-white/10 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <FileSearch className="w-4 h-4 text-teal-400" />
                      <span className="text-sm font-bold text-white">
                        Internal Document Dictionary Fields
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Edit fields below and click save
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Title
                      </label>
                      <input
                        type="text"
                        value={metadata.title || ""}
                        onChange={(e) =>
                          setMetadata({ ...metadata, title: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Author
                      </label>
                      <input
                        type="text"
                        value={metadata.author || ""}
                        onChange={(e) =>
                          setMetadata({ ...metadata, author: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={metadata.subject || ""}
                        onChange={(e) =>
                          setMetadata({ ...metadata, subject: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500 font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Producer / Software Tool
                      </label>
                      <input
                        type="text"
                        value={metadata.producer || ""}
                        onChange={(e) =>
                          setMetadata({ ...metadata, producer: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Readonly audit values */}
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Created On</span>
                      <span className="text-slate-300 font-mono">
                        {metadata.creationDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Modified On</span>
                      <span className="text-slate-300 font-mono">
                        {metadata.modificationDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Creator Engine</span>
                      <span className="text-slate-300 font-mono truncate block">
                        {metadata.creator}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSave(false)}
                      className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(20,184,166,0.35)] transition-all"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save &amp; Preview PDF</span>
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
              </div>
            )
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {fileItem && metadata && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono truncate max-w-[130px]">
                {metadata.title || fileItem.name}
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSave(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 active:from-teal-600 active:to-cyan-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save &amp; Preview</span>
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
