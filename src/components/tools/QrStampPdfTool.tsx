"use client";

import React, { useState } from "react";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import {
  QrStampOptions,
  stampQrCodeOnPdf,
  generateSampleReportForQr,
} from "@/lib/qr-stamper-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import { ProcessingMetrics, UploadedFileItem } from "@/types";
import {
  QrCode,
  UploadSimple,
  Sparkle,
  CircleNotch,
  FileText,
  Sliders,
  Check,
} from "@/components/common/icons";

export function QrStampPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [options, setOptions] = useState<QrStampOptions>({
    text: "https://velodoc-studio.vercel.app",
    caption: "Scan for Live Demo",
    position: "bottom-right",
    size: "medium",
    fgColor: "#000000",
    bgColor: "#FFFFFF",
    pageScope: "all",
    margin: 25,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileAdded = async (file: File) => {
    setErrorMessage(null);
    setOutputBytes(null);

    const buf = await file.arrayBuffer();
    const count = await getPdfPageCount(buf);

    setFileItem({
      id: "single",
      file,
      name: file.name,
      size: file.size,
      pageCount: count,
      status: "ready",
    });
    setOriginalBuffer(buf);
  };

  const handleLoadSample = async () => {
    try {
      setErrorMessage(null);
      const sample = await generateSampleReportForQr();
      await handleFileAdded(sample);
      setOptions((prev) => ({
        ...prev,
        text: "https://velodoc-studio.vercel.app",
        caption: "Verified Academic Capstone",
        position: "bottom-right",
      }));
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not load sample report.");
    }
  };

  const handleStamp = async () => {
    if (!fileItem || !originalBuffer) {
      setErrorMessage("Please upload a PDF document to stamp.");
      return;
    }
    if (!options.text.trim()) {
      setErrorMessage("Please enter a URL, verification string, or text for the QR code.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const pdfBytes = await stampQrCodeOnPdf(originalBuffer, options);
      const endTime = performance.now();

      setOutputBytes(pdfBytes);
      const originalSize = fileItem.size;
      const processedSize = pdfBytes.byteLength;
      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = "qr_stamped_document.pdf";

      setMetrics({
        originalSize,
        processedSize,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs: Math.round(endTime - startTime),
        downloadUrl,
        downloadFilename,
        pageCount: fileItem.pageCount || 1,
      });

      sessionHistory.recordExecution({
        toolId: "qr-stamp-pdf",
        toolName: "Add QR Code to PDF",
        inputFiles: [fileItem.name],
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs: Math.round(endTime - startTime),
        outputData: pdfBytes,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to stamp QR code on PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (outputBytes && metrics) {
    return (
      <ResultPreviewStudio
        metrics={metrics}
        outputBytes={outputBytes}
        outputMimeType="application/pdf"
        onAdjustSettings={() => setOutputBytes(null)}
        title="QR Stamped PDF Ready"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Sample Action */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            QR Code Document Stamper
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Generate and stamp high-resolution QR codes (URLs, verification keys, portfolios) directly onto document pages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors">
            <UploadSimple className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileAdded(f);
              }}
              className="hidden"
            />
          </label>

          <button
            onClick={handleLoadSample}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#FFF5F0] text-[#C2410C] border border-[#FBDCD0] hover:bg-[#FFE8DE] flex items-center gap-1.5 transition-colors"
          >
            <Sparkle className="w-3.5 h-3.5" />
            <span>Load Sample Report</span>
          </button>
        </div>
      </div>

      {/* Target Document Info */}
      {fileItem && (
        <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-paper-200 dark:bg-charcoal-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-mono font-semibold text-zinc-950 dark:text-white">
                {fileItem.name}
              </p>
              <span className="text-[11px] font-mono text-zinc-500">
                {fileItem.pageCount} Pages • {(fileItem.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setFileItem(null);
              setOriginalBuffer(null);
            }}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900"
          >
            Change
          </button>
        </div>
      )}

      {/* QR Settings Form */}
      <div className="paper-card p-6 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-5">
        <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-900 dark:text-zinc-100 border-b border-paper-300 dark:border-charcoal-border pb-3">
          QR Code Parameters & Positioning
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
              QR Code Payload (URL, Roll No, or Text)
            </label>
            <input
              type="text"
              value={options.text}
              onChange={(e) => setOptions({ ...options, text: e.target.value })}
              placeholder="e.g., https://github.com/my-project or 26951A6701"
              className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white font-mono outline-none focus:border-[#C2410C]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
              Caption Below QR (Optional)
            </label>
            <input
              type="text"
              value={options.caption}
              onChange={(e) => setOptions({ ...options, caption: e.target.value })}
              placeholder="e.g., Scan for Live Demo"
              className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white font-mono outline-none focus:border-[#C2410C]"
            />
          </div>
        </div>

        {/* Position, Size & Scope */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Corner Position */}
          <div>
            <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
              Corner / Position
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "bottom-right", label: "Bottom Right" },
                { id: "bottom-left", label: "Bottom Left" },
                { id: "top-right", label: "Top Right" },
                { id: "top-left", label: "Top Left" },
                { id: "center", label: "Center" },
              ].map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setOptions({ ...options, position: pos.id as any })}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-mono border transition-colors ${
                    options.position === pos.id
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 font-medium"
                      : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
              QR Stamp Size
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "small", label: "Small (65pt)" },
                { id: "medium", label: "Medium (90pt)" },
                { id: "large", label: "Large (125pt)" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setOptions({ ...options, size: s.id as any })}
                  className={`px-2 py-2 rounded text-[11px] font-mono border transition-colors ${
                    options.size === s.id
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 font-medium"
                      : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page Scope */}
          <div>
            <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
              Page Selection
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "all", label: "All Pages" },
                { id: "first", label: "First Only" },
                { id: "last", label: "Last Only" },
              ].map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => setOptions({ ...options, pageScope: scope.id as any })}
                  className={`px-2 py-2 rounded text-[11px] font-mono border transition-colors ${
                    options.pageScope === scope.id
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 font-medium"
                      : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Primary Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleStamp}
          disabled={isProcessing}
          className="px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] text-white font-mono text-xs font-medium shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <CircleNotch className="w-4 h-4 animate-spin" />
              <span>Stamping QR Code...</span>
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4" />
              <span>Stamp QR Code on PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
