"use client";

import React, { useState } from "react";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { CameraScannerModal } from "@/components/CameraScannerModal";
import { FileArrangerGrid, ArrangerItem } from "@/components/common/FileArrangerGrid";
import {
  OcrPageResult,
  runOcrOnImage,
  renderPdfPageToCanvas,
  createSearchableHybridPdf,
  generateSampleScannedPdf,
} from "@/lib/ocr-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import { ProcessingMetrics } from "@/types";
import {
  Camera,
  UploadSimple,
  Sparkle,
  Copy,
  Check,
  CircleNotch,
  FileText,
  FileArrowDown,
  DownloadSimple,
} from "@/components/common/icons";

export function OcrPdfTool() {
  const [scanItems, setScanItems] = useState<ArrangerItem[]>([]);

  // Camera Modal
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // OCR Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);

  // OCR Results
  const [ocrResults, setOcrResults] = useState<OcrPageResult[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Result Preview Studio
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = async (newFiles: File[]) => {
    setErrorMessage(null);
    setOcrResults([]);
    setOutputBytes(null);

    const indexedItems: ArrangerItem[] = await Promise.all(
      newFiles.map(async (file, idx) => {
        const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
        let previewUrl: string | undefined = undefined;
        let pageCount: number | undefined = undefined;

        if (isPdf) {
          try {
            const buf = await file.arrayBuffer();
            pageCount = await getPdfPageCount(buf);
          } catch {
            // ignore
          }
        } else {
          previewUrl = URL.createObjectURL(file);
        }

        return {
          id: Math.random().toString(36).substring(7) + `_${idx}_${Date.now()}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
          pageCount,
          rotation: 0,
          status: "ready" as const,
        };
      })
    );

    setScanItems((prev) => [...prev, ...indexedItems]);
  };

  const handleCameraScans = (files: File[]) => {
    if (files.length > 0) {
      handleFilesAdded(files);
    }
    setIsCameraOpen(false);
  };

  const handleLoadSample = async () => {
    try {
      setErrorMessage(null);
      const sample = await generateSampleScannedPdf();
      await handleFilesAdded([sample]);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not generate sample scanned document.");
    }
  };

  const handleRunOcr = async () => {
    if (scanItems.length === 0) {
      setErrorMessage("Please upload or scan at least one document or photo first.");
      return;
    }

    setIsProcessing(true);
    setProgressPercent(5);
    setProgressMsg("Preparing document pages for WebAssembly OCR...");
    setErrorMessage(null);

    try {
      const results: OcrPageResult[] = [];
      const totalSteps = scanItems.length;

      for (let i = 0; i < scanItems.length; i++) {
        const item = scanItems[i];
        if (!item.file) continue;

        const isPdf = item.file.type === "application/pdf" || item.name.endsWith(".pdf");

        if (isPdf) {
          const buf = await item.file.arrayBuffer();
          const totalPages = await getPdfPageCount(buf);
          for (let p = 0; p < totalPages; p++) {
            setProgressPercent(Math.round(((i + (p + 1) / totalPages) / totalSteps) * 80));
            setProgressMsg(`Extracting text from ${item.name} (page ${p + 1} of ${totalPages})...`);
            const canvas = await renderPdfPageToCanvas(buf, p);
            const pageRes = await runOcrOnImage(canvas, results.length + 1, (prog, msg) => {
              setProgressMsg(msg);
            });
            results.push(pageRes);
          }
        } else {
          setProgressPercent(Math.round(((i + 1) / totalSteps) * 80));
          setProgressMsg(`Recognizing printed text from ${item.name}...`);

          // Apply rotation if needed
          let imageSource: HTMLCanvasElement | File = item.file;
          if (item.rotation && item.rotation !== 0) {
            const img = new Image();
            img.src = item.previewUrl || URL.createObjectURL(item.file);
            await new Promise((res) => { img.onload = res; });
            const offscreen = document.createElement("canvas");
            if (item.rotation === 90 || item.rotation === 270) {
              offscreen.width = img.naturalHeight;
              offscreen.height = img.naturalWidth;
            } else {
              offscreen.width = img.naturalWidth;
              offscreen.height = img.naturalHeight;
            }
            const ctx = offscreen.getContext("2d");
            if (ctx) {
              ctx.translate(offscreen.width / 2, offscreen.height / 2);
              ctx.rotate((item.rotation * Math.PI) / 180);
              ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
              imageSource = offscreen;
            }
          }

          const pageRes = await runOcrOnImage(imageSource, results.length + 1, (prog, msg) => {
            setProgressMsg(msg);
          });
          results.push(pageRes);
        }
      }

      setOcrResults(results);
      setActivePageIndex(0);
      setProgressPercent(100);
      setProgressMsg("OCR completed successfully!");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "OCR recognition failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportHybridPdf = async () => {
    if (ocrResults.length === 0) return;
    setIsProcessing(true);
    setProgressMsg("Compiling Searchable Hybrid PDF with invisible text layer...");
    const startTime = performance.now();

    try {
      const pdfBytes = await createSearchableHybridPdf(ocrResults, (prog, msg) => {
        setProgressMsg(msg);
      });
      const endTime = performance.now();
      setOutputBytes(pdfBytes);
      const originalSize = scanItems.reduce((acc, it) => acc + (it.size || 0), 0) || 10000;
      const processedSize = pdfBytes.byteLength;
      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = "searchable_ocr_document.pdf";

      setMetrics({
        originalSize,
        processedSize,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs: Math.round(endTime - startTime),
        downloadUrl,
        downloadFilename,
        pageCount: ocrResults.length,
        targetAccuracy: "OCR Text Layer Embedded",
      });

      sessionHistory.recordExecution({
        toolId: "ocr-pdf",
        toolName: "OCR Scanned PDF & Image to Searchable PDF",
        inputFiles: scanItems.map((s) => s.name),
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs: Math.round(endTime - startTime),
        outputData: pdfBytes,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to create searchable hybrid PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportText = (format: "txt" | "md") => {
    if (ocrResults.length === 0) return;
    const separator = "\n\n--- Page Break ---\n\n";
    const fullText = ocrResults.map((p) => p.text).join(separator);
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted_ocr_text.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    if (ocrResults.length === 0 || !ocrResults[activePageIndex]) return;
    navigator.clipboard.writeText(ocrResults[activePageIndex].text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (outputBytes && metrics) {
    return (
      <ResultPreviewStudio
        metrics={metrics}
        outputBytes={outputBytes}
        outputMimeType="application/pdf"
        onAdjustSettings={() => setOutputBytes(null)}
        title="Searchable Hybrid PDF Ready"
      />
    );
  }

  const activePage = ocrResults[activePageIndex];

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions Bar */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3 flex-wrap shadow-paper">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            Client-Side Offline OCR (Tesseract.js WebAssembly)
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Extract text from scanned PDFs, photos, or camera captures locally with zero cloud upload
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors">
            <UploadSimple className="w-3.5 h-3.5" />
            <span>Upload Documents/Photos</span>
            <input
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesAdded(Array.from(e.target.files));
                }
              }}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setIsCameraOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#FFF5F0] text-[#C2410C] border border-[#FBDCD0] hover:bg-[#FFE8DE] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan with Camera</span>
          </button>

          <button
            onClick={handleLoadSample}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkle className="w-3.5 h-3.5 text-[#C2410C]" />
            <span>Load Sample Test File</span>
          </button>
        </div>
      </div>

      {/* Visual Interactive Arranger Grid for Queued Scans */}
      {scanItems.length > 0 && (
        <div className="space-y-4">
          <FileArrangerGrid
            items={scanItems}
            onReorder={setScanItems}
            onRotate={(id, newRot) =>
              setScanItems((prev) =>
                prev.map((it) => (it.id === id ? { ...it, rotation: newRot } : it))
              )
            }
            onRemove={(id) => setScanItems((prev) => prev.filter((it) => it.id !== id))}
            onDuplicate={(id) => {
              const idx = scanItems.findIndex((it) => it.id === id);
              if (idx !== -1) {
                const target = scanItems[idx];
                const dup: ArrangerItem = {
                  ...target,
                  id: Math.random().toString(36).substring(7) + `_copy_${Date.now()}`,
                  name: `${target.name.replace(/\.([^.]+)$/, "")}_copy.$1`,
                };
                setScanItems((prev) => {
                  const next = [...prev];
                  next.splice(idx + 1, 0, dup);
                  return next;
                });
              }
            }}
            onAddMore={handleFilesAdded}
            acceptedFileTypes={{
              "application/pdf": [".pdf"],
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            title="Arrange Scanned Document Sequence"
            subtitle="Drag cards or use nudge arrows to order pages. Rotate sideways photos 90° before running OCR."
            itemTypeLabel="Scan"
            showRotate={true}
            showDuplicate={true}
          />

          <div className="flex items-center justify-end">
            <button
              onClick={handleRunOcr}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#A8370A] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-paper active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <CircleNotch className="w-4 h-4 animate-spin" />
                  <span>Running OCR ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Start OCR Extraction ({scanItems.length} Pages/Photos)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* OCR In-Progress Telemetry */}
      {isProcessing && (
        <div className="paper-card p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-2 shadow-paper">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-700 dark:text-zinc-300">{progressMsg}</span>
            <span className="text-zinc-900 dark:text-white font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-paper-200 dark:bg-charcoal-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#C2410C] h-2 transition-all duration-200 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Side-by-Side OCR Viewer */}
      {ocrResults.length > 0 && activePage && (
        <div className="paper-card rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border overflow-hidden space-y-0 shadow-paper">
          {/* Header Bar with Export Options */}
          <div className="p-3 bg-paper-100 dark:bg-charcoal-900 border-b border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white">
                Page {activePageIndex + 1} of {ocrResults.length}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                {activePage.confidence}% Confidence
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyText}
                className="px-2.5 py-1 rounded text-xs font-mono bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Page Text"}</span>
              </button>

              <button
                onClick={() => handleExportText("txt")}
                className="px-2.5 py-1 rounded text-xs font-mono bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 flex items-center gap-1.5 cursor-pointer"
              >
                <DownloadSimple className="w-3.5 h-3.5" />
                <span>Export .TXT</span>
              </button>

              <button
                onClick={() => handleExportText("md")}
                className="px-2.5 py-1 rounded text-xs font-mono bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 flex items-center gap-1.5 cursor-pointer"
              >
                <DownloadSimple className="w-3.5 h-3.5" />
                <span>Export .MD</span>
              </button>

              <button
                onClick={handleExportHybridPdf}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#C2410C] hover:bg-[#A8370A] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileArrowDown className="w-3.5 h-3.5" />
                <span>Export Searchable PDF</span>
              </button>
            </div>
          </div>

          {/* Page Selector Strip */}
          {ocrResults.length > 1 && (
            <div className="p-2 bg-paper-50 dark:bg-charcoal-900 border-b border-paper-300 dark:border-charcoal-border flex items-center gap-1 overflow-x-auto no-scrollbar">
              {ocrResults.map((res, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePageIndex(idx)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activePageIndex === idx
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold"
                      : "bg-paper-100 dark:bg-charcoal-800 text-zinc-700 dark:text-zinc-300 border border-paper-300 dark:border-charcoal-border"
                  }`}
                >
                  Page {idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-paper-300 dark:divide-charcoal-border">
            {/* Scanned Image Preview */}
            <div className="p-4 bg-paper-50 dark:bg-charcoal-900 flex flex-col items-center justify-center min-h-[350px]">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
                Original Scanned Image
              </span>
              <div className="relative max-h-[480px] w-full flex items-center justify-center overflow-hidden rounded border border-paper-300 dark:border-charcoal-border bg-white dark:bg-black p-2">
                <img
                  src={activePage.imageDataUrl || ""}
                  alt={`Scanned Page ${activePageIndex + 1}`}
                  className="max-h-[450px] object-contain"
                />
              </div>
            </div>

            {/* Extracted Text Pane */}
            <div className="p-4 bg-white dark:bg-charcoal-800 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  Extracted Searchable Text ({activePage.text.split(/\s+/).filter(Boolean).length} Words)
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  Ready for Copy / Search
                </span>
              </div>
              <textarea
                readOnly
                value={activePage.text}
                rows={16}
                className="w-full flex-1 p-3 rounded-lg bg-paper-50 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border font-mono text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed outline-none resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Pro Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onAddScansToQueue={handleCameraScans}
      />
    </div>
  );
}