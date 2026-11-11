"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { convertImagesToPdf, ImagesToPdfOptions } from "@/lib/pdf-engine";
import {
  FileImage,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Maximize2,
  Layers,
} from "lucide-react";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob, createSafeFile } from "@/lib/utils";

interface ImagePreviewItem extends UploadedFileItem {
  previewUrl: string;
}

export function ImageToPdfTool() {
  const [images, setImages] = useState<ImagePreviewItem[]>([]);
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );
  const [margin, setMargin] = useState<"none" | "small" | "large">("small");

  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [originalBytes, setOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setErrorMessage(null);
    setMetrics(null);

    const newItems: ImagePreviewItem[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "ready",
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newItems]);
  }, []);

  // Check for chained file on mount
  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained) {
      const file = createSafeFile(chained.data, chained.filename, chained.mimeType);
      handleFilesAdded([file]);
    }
  }, [handleFilesAdded]);

  const handleRemove = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    setImages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      setErrorMessage("Please upload at least one image.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const imageInputs = [];
      let totalOriginalSize = 0;

      for (const item of images) {
        totalOriginalSize += item.size;
        const buf = await item.file.arrayBuffer();
        imageInputs.push({
          file: item.file,
          buffer: buf,
          type: item.file.type,
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
        durationMs,
        downloadUrl,
        downloadFilename: filename,
        pageCount: images.length,
        targetAccuracy: "Lossless PDF Generation",
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
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
          <DropZone
            files={images}
            onFilesAdded={handleFilesAdded}
            onRemoveFile={handleRemove}
            onMoveFile={handleMove}
            onClearAll={() => setImages([])}
            acceptedFileTypes={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            multiple={true}
            title="Drop JPG, PNG, or WebP Images"
            subtitle="Arrange photos and convert into a beautifully styled multi-page PDF document"
          />

          {images.length > 0 && (
            <div className="space-y-6">
              {/* Settings Controls */}
              <div className="p-5 rounded-2xl bg-[#12141D] border border-white/10 space-y-4 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Page Size */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Page Size</span>
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) =>
                        setPageSize(e.target.value as "fit" | "a4" | "letter")
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="a4">A4 (Standard Document)</option>
                      <option value="letter">US Letter</option>
                      <option value="fit">Fit to Image Dimensions</option>
                    </select>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Orientation</span>
                    </label>
                    <select
                      value={orientation}
                      disabled={pageSize === "fit"}
                      onChange={(e) =>
                        setOrientation(e.target.value as "portrait" | "landscape")
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium disabled:opacity-40 cursor-pointer"
                    >
                      <option value="portrait">Portrait (Vertical)</option>
                      <option value="landscape">Landscape (Horizontal)</option>
                    </select>
                  </div>

                  {/* Margin */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Page Margin
                    </label>
                    <select
                      value={margin}
                      disabled={pageSize === "fit"}
                      onChange={(e) =>
                        setMargin(e.target.value as "none" | "small" | "large")
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 font-medium disabled:opacity-40 cursor-pointer"
                    >
                      <option value="none">None (Full Bleed)</option>
                      <option value="small">Small (20pt)</option>
                      <option value="large">Large (40pt)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Queue List of Uploaded Images */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Image Sequence ({images.length} images)</span>
                  <span>Drag or use arrows to adjust order</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((item, index) => (
                    <div
                      key={item.id}
                      className="relative group rounded-xl bg-[#12141D] border border-white/10 p-2 overflow-hidden flex flex-col justify-between"
                    >
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-black/40 mb-2">
                        <Image
                          src={item.previewUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
                          #{index + 1}
                        </div>
                      </div>

                      <div className="text-[11px] font-medium text-slate-300 truncate mb-2">
                        {item.name}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMove(index, "up")}
                            disabled={index === 0}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(index, "down")}
                            disabled={index === images.length - 1}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Trigger */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compiling PDF Document...</span>
                    </>
                  ) : (
                    <>
                      <FileImage className="w-4 h-4" />
                      <span>Convert {images.length} Images to PDF</span>
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
