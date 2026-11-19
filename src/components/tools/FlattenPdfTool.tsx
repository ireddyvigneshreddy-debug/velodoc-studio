"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { flattenPdf, FlattenOptions } from "@/lib/flatten-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { ShieldCheck, Lock, Sparkles, Layers, AlertCircle, Loader2 } from "@/components/common/icons";

export function FlattenPdfTool() {
  const { createTrackedUrl, revokeAll } = useObjectUrls();
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [options, setOptions] = useState<FlattenOptions>({
    mode: "vector",
    dpi: 300,
    quality: 0.95,
    purgeAnnotations: true,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
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
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    }
  };

  const handleProcess = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgress(5);
    setProgressMsg("Starting flatten process...");
    const startTime = performance.now();

    try {
      const flattened = await flattenPdf(originalBuffer, options, (p, msg) => {
        setProgress(p);
        setProgressMsg(msg);
      });

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      setOutputBytes(flattened);
      const originalSize = fileItem.size;
      const processedSize = flattened.byteLength;
      const savedBytes = originalSize - processedSize;
      const savedPercentage = Math.round((savedBytes / originalSize) * 100);

      const blob = createPdfBlob(flattened);
      const downloadUrl = createTrackedUrl(blob);
      const downloadFilename = fileItem.name.replace(/\.pdf$/i, "-flattened.pdf");

      setMetrics({
        originalSize,
        processedSize,
        savedBytes,
        savedPercentage,
        durationMs,
        downloadUrl,
        downloadFilename,
        pageCount: fileItem.pageCount,
      });

      sessionHistory.recordExecution({
        toolId: "flatten-pdf",
        toolName: "PDF Flatten & Form Purge",
        inputFiles: [fileItem.name],
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs,
        outputData: flattened,
      });
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to flatten PDF. Please try vector mode or check file permissions.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload DropZone */}
      {!fileItem && (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{ "application/pdf": [".pdf"] }}
          multiple={false}
          title="Drop any PDF to Flatten & Tamper-Proof"
          subtitle="Permanently lock fillable forms, merge comments & signatures into static vector/raster graphics"
        />
      )}

      {/* Main Workspace */}
      {fileItem && !metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-6 space-y-5">
            <div className="premium-card p-5 sm:p-6 rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Flatten & Lock PDF</h3>
                    <p className="text-xs text-zinc-400">{fileItem.name} ({fileItem.pageCount || 1} pages)</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFileItem(null);
                    setOriginalBuffer(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  Change File
                </button>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Flattening Strategy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOptions({ ...options, mode: "vector" })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      options.mode === "vector"
                        ? "bg-indigo-500/10 border-indigo-500/40 shadow-paper"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-semibold text-white">Vector Flatten</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Freezes interactive form fields into permanent vector text. Super crisp at any zoom level with zero file size bloat.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOptions({ ...options, mode: "raster" })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      options.mode === "raster"
                        ? "bg-indigo-500/10 border-indigo-500/40 shadow-paper"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.14]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-white">Ultra-Secure Raster</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Renders all pages to pure high-res images. Completely destroys hidden OCR text, invisible layers, and redaction overlays.
                    </p>
                  </button>
                </div>
              </div>

              {/* Raster Specific Options */}
              {options.mode === "raster" && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-300">Raster Resolution (DPI)</span>
                    <span className="text-xs font-mono font-semibold text-indigo-400">{options.dpi} DPI</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[150, 300, 600].map((dpiVal) => (
                      <button
                        key={dpiVal}
                        type="button"
                        onClick={() => setOptions({ ...options, dpi: dpiVal })}
                        className={`py-2 text-xs rounded-xl font-medium transition-all ${
                          options.dpi === dpiVal
                            ? "bg-indigo-600 text-white font-semibold"
                            : "bg-white/[0.04] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {dpiVal} DPI {dpiVal === 300 ? "(Official)" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Purge Toggles */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Security Options
                </label>
                <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.12] transition-colors">
                  <input
                    type="checkbox"
                    checked={options.purgeAnnotations}
                    onChange={(e) => setOptions({ ...options, purgeAnnotations: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-white block">Purge Comments & Sticky Notes</span>
                    <span className="text-[11px] text-zinc-400 block">Remove review comments, stamps, and pop-up author notes</span>
                  </div>
                </label>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Desktop Action Button */}
              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{progressMsg || `Processing (${progress}%)...`}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Flatten & Lock PDF Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Info Card */}
          <div className="lg:col-span-6 space-y-4">
            <div className="premium-card p-6 rounded-3xl space-y-4 border border-white/[0.08]">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Why Flatten Your PDF?
              </h4>
              <ul className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Prevent Unauthorized Changes:</strong> Freezes all filled inputs in leases, tax forms, and contracts so recipients cannot edit your data.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Universal Printer Compatibility:</strong> Fixes missing signature stamps and invisible form answers when sending to government portals or legacy printers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Wipe Annotation History:</strong> Removes internal team comments, sticky notes, and revision markup before client delivery.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Result Studio */}
      {metrics && (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          outputMimeType="application/pdf"
          title="PDF Flattening Complete"
          onAdjustSettings={() => {
            revokeAll();
            setMetrics(null);
          }}
        />
      )}

      {/* Thumb-Zone Sticky Bottom Action Bar on Mobile */}
      {fileItem && !metrics && (
        <div className="fixed bottom-0 inset-x-0 z-40 pb-safe md:hidden bg-zinc-950/90 backdrop-blur-xl border-t border-white/[0.12] p-3 shadow-2xl">
          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Flattening ({progress}%)...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Flatten & Lock PDF</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
