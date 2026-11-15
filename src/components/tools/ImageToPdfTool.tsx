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
  Check,
} from "@/components/common/icons";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob, createSafeFile } from "@/lib/utils";

export function ImageToPdfTool() {
  const [images, setImages] = useState<ArrangerItem[]>([]);

  // 3 Page Layout Options:
  // 1. "fit-image": Exact Image Size (Zero Borders — Recommended, Default)
  // 2. "paper-fill": A4 / Letter — Fill Edge-to-Edge (No White Bars)
  // 3. "paper-fit": A4 / Letter — Fit Inside With Margins
  const [layoutMode, setLayoutMode] = useState<"fit-image" | "paper-fill" | "paper-fit">("fit-image");
  const [paperFormat, setPaperFormat] = useState<"a4" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState<"none" | "small" | "large">("none");

  // Optional Exact Target KB Compression
  const [targetKbEnabled, setTargetKbEnabled] = useState(false);
  const [targetKb, setTargetKb] = useState(200);

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
        pageSize: layoutMode === "fit-image" ? "fit-image" : paperFormat,
        layoutMode: layoutMode,
        orientation: orientation,
        margin: layoutMode === "paper-fit" ? margin : "none",
        targetSizeKb: targetKbEnabled && targetKb > 0 ? targetKb : undefined,
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

      const savedBytes = Math.max(0, totalOriginalSize - pdfBytes.byteLength);
      const savedPct =
        totalOriginalSize > 0 ? Math.round((savedBytes / totalOriginalSize) * 100) : 0;

      setMetrics({
        originalSize: totalOriginalSize,
        processedSize: pdfBytes.byteLength,
        savedBytes: savedBytes,
        savedPercentage: savedPct,
        durationMs: Math.round(durationMs),
        downloadUrl,
        downloadFilename: filename,
        pageCount: images.length,
        targetAccuracy:
          targetKbEnabled && targetKb > 0
            ? `Exact Target (${targetKb} KB)`
            : layoutMode === "fit-image"
            ? "Zero-Border Full Bleed"
            : layoutMode === "paper-fill"
            ? "Edge-to-Edge Sheet Fill"
            : "Paper Sheet Fit",
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
              subtitle="Zero white borders default • Order is preserved automatically • Instant Smart Arranger"
            />
          )}

          {images.length > 0 && (
            <div className="space-y-6">
              {/* Layout & Margin Settings Bar */}
              <div className="paper-card p-4 sm:p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
                {/* 3 Page Layout Options Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-mono font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Page Geometry &amp; Border Mode</span>
                  </label>
                  <span className="text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded self-start sm:self-auto">
                    Zero-Border Full-Bleed Default
                  </span>
                </div>

                {/* 3 Interactive Layout Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option 1: Exact Image Size (Zero Borders — Recommended) */}
                  <button
                    type="button"
                    onClick={() => setLayoutMode("fit-image")}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      layoutMode === "fit-image"
                        ? "bg-amber-50/70 dark:bg-amber-950/20 border-[#C2410C] ring-1 ring-[#C2410C]"
                        : "bg-white dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        {layoutMode === "fit-image" && <Check className="w-3.5 h-3.5 text-[#C2410C]" />}
                        Exact Image Size
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-[#C2410C] text-white px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                      Zero borders. Each page matches the exact oriented dimensions of the photo with 0.00 mm margin.
                    </p>
                  </button>

                  {/* Option 2: A4 / Letter — Fill Edge-to-Edge */}
                  <button
                    type="button"
                    onClick={() => setLayoutMode("paper-fill")}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      layoutMode === "paper-fill"
                        ? "bg-amber-50/70 dark:bg-amber-950/20 border-[#C2410C] ring-1 ring-[#C2410C]"
                        : "bg-white dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        {layoutMode === "paper-fill" && <Check className="w-3.5 h-3.5 text-[#C2410C]" />}
                        A4/Letter — Fill Sheet
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                        No White Bars
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                      Scales each photo to 100% cover standard sheet edge-to-edge. Completely eliminates white borders.
                    </p>
                  </button>

                  {/* Option 3: A4 / Letter — Fit Inside With Margins */}
                  <button
                    type="button"
                    onClick={() => setLayoutMode("paper-fit")}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      layoutMode === "paper-fit"
                        ? "bg-amber-50/70 dark:bg-amber-950/20 border-[#C2410C] ring-1 ring-[#C2410C]"
                        : "bg-white dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        {layoutMode === "paper-fit" && <Check className="w-3.5 h-3.5 text-[#C2410C]" />}
                        A4/Letter — Fit Inside
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                        With Margins
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                      Fits entire photo inside sheet with customizable margins (Small or Large document borders).
                    </p>
                  </button>
                </div>

                {/* Secondary controls shown when standard paper is selected */}
                {layoutMode !== "fit-image" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-paper-300 dark:border-charcoal-border">
                    {/* Paper Format */}
                    <div className="space-y-1">
                      <label className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-[#C2410C]" />
                        <span>Paper Standard</span>
                      </label>
                      <select
                        value={paperFormat}
                        onChange={(e) => setPaperFormat(e.target.value as "a4" | "letter")}
                        className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C]"
                      >
                        <option value="a4">A4 (210 × 297 mm)</option>
                        <option value="letter">US Letter (8.5 × 11 in)</option>
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
                        onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")}
                        className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C]"
                      >
                        <option value="portrait">Portrait (Vertical)</option>
                        <option value="landscape">Landscape (Horizontal)</option>
                      </select>
                    </div>

                    {/* Margin (Only for paper-fit) */}
                    <div className="space-y-1">
                      <label className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        Document Margin
                      </label>
                      {layoutMode === "paper-fill" ? (
                        <div className="px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-emerald-800 dark:text-emerald-300 text-xs font-mono">
                          0 px (Full Bleed Cover)
                        </div>
                      ) : (
                        <select
                          value={margin}
                          onChange={(e) => setMargin(e.target.value as "none" | "small" | "large")}
                          className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C]"
                        >
                          <option value="none">None (0 px)</option>
                          <option value="small">Small (20 pt border)</option>
                          <option value="large">Large (40 pt margin)</option>
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Optional Target KB Compression Toggle */}
                <div className="pt-3 border-t border-paper-300 dark:border-charcoal-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetKbEnabled}
                        onChange={(e) => setTargetKbEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C2410C]"></div>
                    </label>
                    <div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white">
                        Target File Size (KB Precision Compression)
                      </span>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Strict size limit for online portals (UPSC, SSC, US Visa, TSPSC). Zero canvas padding added.
                      </p>
                    </div>
                  </div>

                  {targetKbEnabled && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {[100, 200, 500, 1024].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setTargetKb(kb)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors cursor-pointer ${
                            targetKb === kb
                              ? "bg-[#C2410C] text-white border-[#C2410C]"
                              : "bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300 dark:border-charcoal-border"
                          }`}
                        >
                          {kb >= 1024 ? `${kb / 1024}MB` : `${kb}KB`}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border rounded px-2 py-1">
                        <input
                          type="number"
                          min={10}
                          max={50000}
                          value={targetKb}
                          onChange={(e) => setTargetKb(Math.max(10, parseInt(e.target.value) || 100))}
                          className="w-16 bg-transparent text-xs font-mono font-bold text-zinc-950 dark:text-white outline-none"
                        />
                        <span className="text-[11px] font-mono text-zinc-500">KB</span>
                      </div>
                    </div>
                  )}
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