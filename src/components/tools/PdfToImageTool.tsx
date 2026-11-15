"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import JSZip from "jszip";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import {
  convertPdfToImages,
  getPdfPageCount,
  parsePageRanges,
} from "@/lib/pdf-engine";
import {
  Image as ImageIcon,
  Download,
  Loader2,
  AlertCircle,
  FileCheck,
  Layers,
  Sparkles,
} from "@/components/common/icons";
import { sessionHistory } from "@/lib/session-history";
import { formatFileSize, createSafeFile } from "@/lib/utils";

type ImageFormat = "png" | "jpeg" | "webp";

interface ConvertedImage {
  pageNumber: number;
  blob: Blob;
  dataUrl: string;
}

const DPI_OPTIONS = [
  { label: "72 DPI", desc: "Web & Fast", scale: 1.0 },
  { label: "150 DPI", desc: "Balanced Standard", scale: 2.0 },
  { label: "300 DPI", desc: "Crisp Print Quality", scale: 4.0 },
  { label: "600 DPI", desc: "Ultra HD Archival", scale: 8.0 },
];

export function PdfToImageTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [scale, setScale] = useState<number>(2.0); // 150 DPI default
  const [pageScope, setPageScope] = useState<"all" | "first" | "custom">("all");
  const [customRange, setCustomRange] = useState("1-3");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [originalBytes, setOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileAdded = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setErrorMessage(null);
    setConvertedImages([]);
    setMetrics(null);

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
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      item.status = "ready";
      setOriginalBytes(buffer);
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Could not read PDF. File may be password protected.");
      item.status = "error";
      setFileItem({ ...item });
    }
  }, []);

  // Chained file handling
  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained) {
      const file = createSafeFile(chained.data, chained.filename, chained.mimeType);
      handleFileAdded([file]);
    }
  }, [handleFileAdded]);

  const handleConvert = async () => {
    if (!fileItem) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setConvertedImages([]);
    setMetrics(null);
    const startTime = performance.now();

    try {
      const buffer = await fileItem.file.arrayBuffer();
      const totalPages = fileItem.pageCount || 1;

      let targetIndices: number[] | undefined;
      if (pageScope === "first") {
        targetIndices = [0];
      } else if (pageScope === "custom") {
        targetIndices = parsePageRanges(customRange, totalPages);
        if (targetIndices.length === 0) {
          throw new Error("Invalid custom page range specified.");
        }
      }

      setProgress({ current: 0, total: targetIndices ? targetIndices.length : totalPages });

      const results = await convertPdfToImages(
        buffer,
        { format, scale, pageIndices: targetIndices },
        (current, total) => setProgress({ current, total })
      );

      setConvertedImages(results);

      const baseName = fileItem.name.replace(/\.pdf$/i, "");
      const ext = format === "jpeg" ? "jpg" : format;
      const durationMs = performance.now() - startTime;

      if (results.length === 1) {
        // Single image result
        const blob = results[0].blob;
        const outName = `${baseName}_page_${results[0].pageNumber}.${ext}`;
        const outBuf = await blob.arrayBuffer();
        const url = URL.createObjectURL(blob);

        setOutputBytes(new Uint8Array(outBuf));
        setMetrics({
          originalSize: fileItem.size,
          processedSize: blob.size,
          savedBytes: 0,
          savedPercentage: 0,
          durationMs,
          downloadUrl: url,
          downloadFilename: outName,
          pageCount: 1,
          targetAccuracy: "High-Res Image Render",
        });
      } else {
        // Multi-image ZIP bundle
        const zip = new JSZip();
        results.forEach((img) => {
          const pageStr = String(img.pageNumber).padStart(3, "0");
          zip.file(`${baseName}_page_${pageStr}.${ext}`, img.blob);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipBuf = await zipBlob.arrayBuffer();
        const url = URL.createObjectURL(zipBlob);

        setOutputBytes(new Uint8Array(zipBuf));
        setMetrics({
          originalSize: fileItem.size,
          processedSize: zipBlob.size,
          savedBytes: 0,
          savedPercentage: 0,
          durationMs,
          downloadUrl: url,
          downloadFilename: `${baseName}_images.zip`,
          pageCount: results.length,
          targetAccuracy: `${results.length} Pages Zipped`,
        });
      }
    } catch (err: unknown) {
      console.error("PDF to image error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to convert PDF to images."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (img: ConvertedImage) => {
    const ext = format === "jpeg" ? "jpg" : format;
    const baseName = fileItem?.name.replace(/\.pdf$/i, "") || "page";
    const filename = `${baseName}_page_${String(img.pageNumber).padStart(3, "0")}.${ext}`;

    const a = document.createElement("a");
    a.href = img.dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <div className="space-y-8">
          <ResultPreviewStudio
            metrics={metrics}
            outputBytes={outputBytes || undefined}
            originalBytes={originalBytes || undefined}
            outputMimeType={convertedImages.length === 1 ? `image/${format}` : "application/zip"}
            title="PDF Converted to Images!"
            onAdjustSettings={() => setMetrics(null)}
          />

          {/* Gallery of rendered page images */}
          {convertedImages.length > 0 && (
            <div className="max-w-5xl mx-auto space-y-4 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <span>Extracted Image Gallery ({convertedImages.length} images)</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Click any image to download individually
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {convertedImages.map((img) => (
                  <div
                    key={img.pageNumber}
                    className="group relative rounded-2xl bg-[#12141D] border border-white/10 overflow-hidden hover:border-indigo-500/50 transition-all shadow-lg flex flex-col"
                  >
                    <div className="relative aspect-[3/4] bg-black/40 flex items-center justify-center p-2">
                      <Image
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="p-3 bg-black/30 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">
                        Page {img.pageNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(img)}
                        className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                        title="Download image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !fileItem ? (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{ "application/pdf": [".pdf"] }}
          multiple={false}
          title="Upload PDF to Convert into High-Res Images"
          subtitle="Export all or selected pages as crisp PNG, JPG, or WebP with up to 600 DPI archival quality"
        />
      ) : (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="p-5 rounded-2xl bg-[#12141D] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{fileItem.name}</h3>
                <p className="text-xs text-slate-400">
                  {formatFileSize(fileItem.size)} • {fileItem.pageCount} pages detected
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFileItem(null);
                setConvertedImages([]);
              }}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 transition-colors"
            >
              Change PDF
            </button>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Format Card */}
            <div className="p-5 rounded-2xl bg-[#12141D] border border-white/10 space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Export Format</span>
              </label>
              <div className="space-y-2">
                {[
                  { id: "png", name: "PNG", desc: "Lossless, crisp text" },
                  { id: "jpeg", name: "JPEG", desc: "Small size, balanced photos" },
                  { id: "webp", name: "WebP", desc: "Next-gen maximum compression" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id as ImageFormat)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs border transition-all flex items-center justify-between ${
                      format === fmt.id
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{fmt.name}</span>
                    <span className="text-[10px] text-slate-400">{fmt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution / DPI */}
            <div className="p-5 rounded-2xl bg-[#12141D] border border-white/10 space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Resolution / DPI</span>
              </label>
              <div className="space-y-2">
                {DPI_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setScale(opt.scale)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs border transition-all flex items-center justify-between ${
                      scale === opt.scale
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] text-slate-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Scope */}
            <div className="p-5 rounded-2xl bg-[#12141D] border border-white/10 space-y-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Pages to Convert</span>
              </label>
              <div className="space-y-2">
                {[
                  { id: "all", label: "All Pages in Document" },
                  { id: "first", label: "Cover Only (Page 1)" },
                  { id: "custom", label: "Custom Page Range" },
                ].map((scp) => (
                  <button
                    key={scp.id}
                    type="button"
                    onClick={() => setPageScope(scp.id as "all" | "first" | "custom")}
                    className={`w-full p-2.5 rounded-xl text-left text-xs border transition-all ${
                      pageScope === scp.id
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {scp.label}
                  </button>
                ))}
              </div>

              {pageScope === "custom" && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={customRange}
                    onChange={(e) => setCustomRange(e.target.value)}
                    placeholder="e.g. 1, 3-5, 8"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
              )}
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
                  <span>
                    Converting ({progress.current}/{progress.total})...
                  </span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>Convert to {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {fileItem && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono">
                <span className="font-semibold text-indigo-400">{format.toUpperCase()}</span> ({scale * 72} DPI)
              </div>
              <button
                type="button"
                onClick={handleConvert}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl bg-vermilion active:bg-vermilion-hover text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Convert to {format.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
