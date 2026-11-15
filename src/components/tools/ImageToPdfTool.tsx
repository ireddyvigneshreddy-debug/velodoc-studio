"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { CameraScannerModal } from "@/components/CameraScannerModal";
import { FileArrangerGrid, ArrangerItem } from "@/components/common/FileArrangerGrid";
import { ProcessingMetrics } from "@/types";
import { convertImagesToPdf, ImagesToPdfOptions } from "@/lib/pdf-engine";
import {
  FileImage,
  CircleNotch,
  AlertCircle,
  Camera,
  Maximize2,
  Layers,
  Sparkle,
} from "@/components/common/icons";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob, createSafeFile } from "@/lib/utils";

export function ImageToPdfTool() {
  const [images, setImages] = useState<ArrangerItem[]>([]);
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState<"none" | "small" | "large">("small");

  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [originalBytes, setOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pro Camera Scanner Studio State
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Eliminate Async Race-Condition Scrambling using Promise.all over indexed promises
  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    setErrorMessage(null);
    setMetrics(null);

    const indexedItems: ArrangerItem[] = await Promise.all(
      newFiles.map(async (file, idx) => {
        const previewUrl = URL.createObjectURL(file);
        let width = 0;
        let height = 0;

        try {
          const img = new window.Image();
          await new Promise((resolve) => {
            img.onload = () => {
              width = img.naturalWidth;
              height = img.naturalHeight;
              resolve(null);
            };
            img.onerror = () => resolve(null);
            img.src = previewUrl;
          });
        } catch {
          // ignore
        }

        return {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(7)}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
          width,
          height,
          rotation: 0,
          status: "ready" as const,
        };
      })
    );

    setImages((prev) => [...prev, ...indexedItems]);
  }, []);

  // Check for chained file or URL query param on mount
  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained) {
      const file = createSafeFile(chained.data, chained.filename, chained.mimeType);
      handleFilesAdded([file]);
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("scan") === "true" || params.get("camera") === "true") {
        setIsScannerOpen(true);
      }
    }
  }, [handleFilesAdded]);

  const handleRemove = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleRotate = (id: string, newRotation: number) => {
    setImages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rotation: newRotation } : item))
    );
  };

  const handleDuplicate = (id: string) => {
    setImages((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const original = prev[idx];
      const clone: ArrangerItem = {
        ...original,
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: `${original.name.replace(/\.[^/.]+$/, "")}_copy.${original.name.split(".").pop()}`,
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      setErrorMessage("Please upload or scan at least one image.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const imageInputs = [];
      let totalOriginalSize = 0;

      // Follow exact arranged sequence from images state
      for (const item of images) {
        if (!item.file) continue;
        totalOriginalSize += item.size || item.file.size;
        const buf = await item.file.arrayBuffer();
        imageInputs.push({
          file: item.file,
          buffer: buf,
          type: item.file.type || "image/jpeg",
          rotation: item.rotation || 0,
        });
      }

      const options: ImagesToPdfOptions = {
        pageSize,
        orientation,
        margin,
      };

      const pdfBytes = await convertImagesToPdf(imageInputs, options);
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const firstBase = images[0]?.name.replace(/\.[^/.]+$/, "") || "images";
      const filename = `${firstBase}_combined.pdf`;

      setOutputBytes(pdfBytes);
      if (imageInputs.length > 0) {
        setOriginalBytes(imageInputs[0].buffer);
      }

      setMetrics({
        originalSize: totalOriginalSize,
        processedSize: pdfBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs: Math.round(durationMs),
        downloadUrl,
        downloadFilename: filename,
        pageCount: images.length,
        targetAccuracy: "Lossless PDF Generation",
      });

      sessionHistory.recordExecution({
        toolId: "image-to-pdf",
        toolName: "Images & Camera to PDF",
        inputFiles: images.map((i) => i.name),
        outputFileName: filename,
        outputSizeBytes: pdfBytes.byteLength,
        durationMs: Math.round(durationMs),
        outputData: pdfBytes,
      });
    } catch (err: unknown) {
      console.error("Image to PDF error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to generate PDF from images."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstantGeneratePdf = async (scannedFiles: File[]) => {
    if (scannedFiles.length === 0) return;
    await handleFilesAdded(scannedFiles);
  };

  return (
    <div className="space-y-6">
      {/* Pro Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddScansToQueue={handleFilesAdded}
        onInstantGeneratePdf={handleInstantGeneratePdf}
      />

      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBytes || undefined}
          title="PDF Generated from Images!"
          onAdjustSettings={() => setMetrics(null)}
        />
      ) : (
        <>
          {/* Pro Camera Banner */}
          <div className="paper-card p-4 sm:p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] dark:bg-[#B45309]/20 text-[#B45309] dark:text-[#fde68a] border border-[#FDE68A] dark:border-[#B45309]/30 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                    4K Pro Camera &amp; Document Scanner
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 uppercase">
                    Rapid Batch
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md">
                  Snap documents, ID cards, and homework pages with automatic boundary cropping, contrast filters, and multi-shot batching.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] text-white font-mono text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Scan with Camera</span>
            </button>
          </div>

          {/* Dropzone only shown when queue is empty */}
          {images.length === 0 && (
            <DropZone
              files={[]}
              onFilesAdded={handleFilesAdded}
              onRemoveFile={() => {}}
              onOpenScanner={() => setIsScannerOpen(true)}
              acceptedFileTypes={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
                "image/webp": [".webp"],
              }}
              multiple={true}
              title="Drop JPG, PNG, or WebP Photos (Up to 30 Files)"
              subtitle="Order is preserved automatically • Instant Smart Alphanumeric & Timestamp Sorting"
            />
          )}

          {images.length > 0 && (
            <div className="space-y-6">
              {/* Layout & Margin Settings Bar */}
              <div className="paper-card p-4 sm:p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Page Size */}
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-[#C2410C]" />
                      <span>Page Format</span>
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as "fit" | "a4" | "letter")}
                      className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C]"
                    >
                      <option value="a4">A4 (Standard 210 × 297 mm)</option>
                      <option value="letter">US Letter (8.5 × 11 in)</option>
                      <option value="fit">Fit to Image Natural Dimensions</option>
                    </select>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#C2410C]" />
                      <span>Orientation</span>
                    </label>
                    <select
                      value={orientation}
                      disabled={pageSize === "fit"}
                      onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")}
                      className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C] disabled:opacity-40"
                    >
                      <option value="portrait">Portrait (Vertical)</option>
                      <option value="landscape">Landscape (Horizontal)</option>
                    </select>
                  </div>

                  {/* Margin */}
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                      Page Margin
                    </label>
                    <select
                      value={margin}
                      disabled={pageSize === "fit"}
                      onChange={(e) => setMargin(e.target.value as "none" | "small" | "large")}
                      className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C] disabled:opacity-40"
                    >
                      <option value="none">None (Full Bleed Edge-to-Edge)</option>
                      <option value="small">Small (20pt Border)</option>
                      <option value="large">Large (40pt Document Margin)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* UNIVERSAL VISUAL PHOTO & FILE ARRANGER GRID */}
              <FileArrangerGrid
                items={images}
                onReorder={setImages}
                onRotate={handleRotate}
                onRemove={handleRemove}
                onDuplicate={handleDuplicate}
                onAddMore={handleFilesAdded}
                itemTypeLabel="Photo"
                subtitle="Drag cards to rearrange, use Smart Sort pills (1, 2, 10 or capture time), or rotate sideways camera photos."
              />

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Trigger Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] disabled:opacity-50 text-white font-mono text-xs font-medium shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <CircleNotch className="w-4 h-4 animate-spin" />
                      <span>Compiling {images.length} Photos into PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="w-4 h-4" />
                      <span>Compile {images.length} Photos into Clean PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
