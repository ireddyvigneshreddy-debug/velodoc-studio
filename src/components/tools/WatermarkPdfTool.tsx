"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PageThumbnail, WatermarkSettings, ProcessingMetrics } from "@/types";
import {
  renderAllPagesThumbnails,
  addWatermarkPro,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import {
  Stamp,
  Image as ImageIcon,
  Loader2,
  Grid,
  RotateCw,
  Sliders,
  Type,
  AlertCircle,
  Upload,
} from "@/components/common/icons";
import { sessionHistory } from "@/lib/session-history";
import { formatFileSize, createPdfBlob, createSafeFile } from "@/lib/utils";

const STAMP_PRESETS = [
  { label: "CONFIDENTIAL", color: "#EF4444" },
  { label: "DRAFT", color: "#F59E0B" },
  { label: "SAMPLE", color: "#6366F1" },
  { label: "APPROVED", color: "#10B981" },
  { label: "COPY", color: "#64748B" },
  { label: "TOP SECRET", color: "#DC2626" },
];

export function WatermarkPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<PageThumbnail | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  // Settings
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    enabled: true,
    type: "text",
    text: "CONFIDENTIAL",
    fontSize: 42,
    opacity: 0.3,
    color: "#EF4444",
    diagonal: true,
    tiledGrid: false,
    rotationAngle: 45,
    position: "center",
    pageFilter: "all",
  });

  const [customRange, setCustomRange] = useState("1-3");
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [logoDimensions, setLogoDimensions] = useState({ width: 140, height: 140 });

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [originalBytes, setOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileAdded = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setErrorMessage(null);
    setMetrics(null);

    const item: UploadedFileItem = {
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
    };
    setFileItem(item);
    setIsLoadingThumbnail(true);

    try {
      const buffer = await file.arrayBuffer();
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      setOriginalBytes(buffer);

      // Render first page for live watermark overlay
      const thumbs = await renderAllPagesThumbnails(buffer, 0.45);
      if (thumbs.length > 0) {
        setPreviewThumbnail(thumbs[0]);
      }
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    } finally {
      setIsLoadingThumbnail(false);
    }
  }, []);

  // Check for chained file on mount
  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained) {
      const file = createSafeFile(chained.data, chained.filename, chained.mimeType);
      handleFileAdded([file]);
    }
  }, [handleFileAdded]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadedLogoUrl(dataUrl);
      setWatermark((prev) => ({
        ...prev,
        type: "image",
        imageDataUrl: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Draw Live Preview Overlay on First Page Thumbnail
  useEffect(() => {
    if (!previewThumbnail || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.src = previewThumbnail.dataUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Render watermark overlay
      const w = canvas.width;
      const h = canvas.height;
      ctx.save();
      ctx.globalAlpha = watermark.opacity;

      if (watermark.type === "text" && watermark.text) {
        ctx.fillStyle = watermark.color;
        const scaledFont = Math.max(12, watermark.fontSize * (w / 600));
        ctx.font = `bold ${scaledFont}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (watermark.tiledGrid) {
          const stepX = w / 3;
          const stepY = h / 4;
          for (let tx = stepX / 2; tx < w; tx += stepX) {
            for (let ty = stepY / 2; ty < h; ty += stepY) {
              ctx.save();
              ctx.translate(tx, ty);
              ctx.rotate((watermark.rotationAngle * Math.PI) / 180);
              ctx.fillText(watermark.text, 0, 0);
              ctx.restore();
            }
          }
        } else {
          let x = w / 2;
          let y = h / 2;
          if (watermark.position.includes("left")) x = w * 0.2;
          if (watermark.position.includes("right")) x = w * 0.8;
          if (watermark.position.includes("top")) y = h * 0.2;
          if (watermark.position.includes("bottom")) y = h * 0.8;

          ctx.translate(x, y);
          ctx.rotate((watermark.rotationAngle * Math.PI) / 180);
          ctx.fillText(watermark.text, 0, 0);
        }
      } else if (watermark.type === "image" && uploadedLogoUrl) {
        const logo = new window.Image();
        logo.src = uploadedLogoUrl;
        logo.onload = () => {
          ctx.save();
          ctx.globalAlpha = watermark.opacity;
          const scaledW = logoDimensions.width * (w / 600);
          const scaledH = logoDimensions.height * (w / 600);
          ctx.translate(w / 2, h / 2);
          ctx.rotate((watermark.rotationAngle * Math.PI) / 180);
          ctx.drawImage(logo, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
          ctx.restore();
        };
      }

      ctx.restore();
    };
  }, [previewThumbnail, watermark, uploadedLogoUrl, logoDimensions]);

  const handleApply = async () => {
    if (!fileItem) return;
    if (watermark.type === "text" && !watermark.text.trim()) {
      setErrorMessage("Please enter watermark text.");
      return;
    }
    if (watermark.type === "image" && !uploadedLogoUrl) {
      setErrorMessage("Please upload a logo image.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const buffer = await fileItem.file.arrayBuffer();
      const settingsPayload: WatermarkSettings = {
        ...watermark,
        imageDataUrl: uploadedLogoUrl || undefined,
        imageWidth: logoDimensions.width,
        imageHeight: logoDimensions.height,
        customPages: watermark.pageFilter === "custom" ? customRange : undefined,
      };

      const stampedBytes = await addWatermarkPro(buffer, settingsPayload);
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      const blob = createPdfBlob(stampedBytes);
      const baseName = fileItem.name.replace(/\.pdf$/i, "");
      const downloadUrl = URL.createObjectURL(blob);

      setOutputBytes(stampedBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: stampedBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_watermarked.pdf`,
        pageCount: fileItem.pageCount,
        targetAccuracy: "Watermark Applied",
      });
    } catch (err: unknown) {
      console.error("Watermark error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to apply watermark stamp."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBytes || undefined}
          title="Watermark & Stamp Applied!"
          onAdjustSettings={() => setMetrics(null)}
        />
      ) : !fileItem ? (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{ "application/pdf": [".pdf"] }}
          multiple={false}
          title="Upload PDF to Stamp Watermark & Logos"
          subtitle="Add diagonal text, repeating full-page tiled grids, or transparent PNG logos with live preview"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* File info banner */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12141D] border border-zinc-200 dark:border-white/10 flex items-center justify-between shadow-sm">
              <div>
                <h3 className="font-semibold text-zinc-950 dark:text-white text-sm">{fileItem.name}</h3>
                <p className="text-xs text-zinc-600 dark:text-slate-400">
                  {formatFileSize(fileItem.size)} • {fileItem.pageCount} pages
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFileItem(null);
                  setPreviewThumbnail(null);
                }}
                className="text-xs text-zinc-700 hover:text-zinc-950 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 border border-zinc-200 dark:border-white/10 transition-colors"
              >
                Change PDF
              </button>
            </div>

            {/* Mode Switch: Text vs Image Logo */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#12141D] border border-zinc-200 dark:border-white/10 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-white/10 pb-4">
                <button
                  type="button"
                  onClick={() => setWatermark((p) => ({ ...p, type: "text" }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    watermark.type === "text"
                      ? "bg-[#C2410C] text-white border-orange-600 shadow-sm"
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-800 dark:text-slate-300 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <span>Text Watermark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWatermark((p) => ({ ...p, type: "image" }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    watermark.type === "image"
                      ? "bg-[#C2410C] text-white border-orange-600 shadow-sm"
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-800 dark:text-slate-300 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>PNG Logo Stamp</span>
                </button>
              </div>

              {watermark.type === "text" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-slate-300 mb-1.5 block">
                      Quick Preset Stamps
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STAMP_PRESETS.map((pst) => (
                        <button
                          key={pst.label}
                          type="button"
                          onClick={() =>
                            setWatermark((p) => ({
                              ...p,
                              text: pst.label,
                              color: pst.color,
                            }))
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            watermark.text === pst.label
                              ? "bg-[#C2410C] text-white shadow-sm"
                              : "bg-white hover:bg-zinc-100 dark:bg-white/5 text-zinc-800 dark:text-slate-300 border border-zinc-200 dark:border-white/10"
                          }`}
                        >
                          {pst.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-800 dark:text-slate-300 mb-1.5 block">
                      Custom Watermark Text
                    </label>
                    <input
                      type="text"
                      value={watermark.text}
                      onChange={(e) =>
                        setWatermark((p) => ({ ...p, text: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 text-zinc-950 dark:text-white text-xs focus:outline-none focus:border-orange-500 font-semibold"
                      placeholder="e.g. STRICTLY CONFIDENTIAL"
                    />
                  </div>

                  {/* Grid Layout Options */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 block">
                        Font Size: {watermark.fontSize}px
                      </label>
                      <input
                        type="range"
                        min={18}
                        max={72}
                        value={watermark.fontSize}
                        onChange={(e) =>
                          setWatermark((p) => ({
                            ...p,
                            fontSize: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 block">
                        Color: {watermark.color}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={watermark.color}
                          onChange={(e) =>
                            setWatermark((p) => ({ ...p, color: e.target.value }))
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/10"
                        />
                        <span className="text-xs font-mono text-slate-400">
                          {watermark.color}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-2 block">
                      Upload Logo Image (PNG / JPEG)
                    </label>
                    <label className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      {uploadedLogoUrl ? (
                        <div className="flex items-center gap-3">
                          <Image
                            src={uploadedLogoUrl}
                            alt="Logo preview"
                            width={48}
                            height={48}
                            className="w-12 h-12 object-contain rounded-lg border border-white/20 bg-black/40 p-1"
                            unoptimized
                          />
                          <span className="text-xs font-medium text-indigo-400">
                            Logo Loaded (Click to replace)
                          </span>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-xs text-white font-medium">
                            Choose PNG or JPEG Logo
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Transparent PNGs look best
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1 block">
                        Logo Width: {logoDimensions.width}px
                      </label>
                      <input
                        type="range"
                        min={50}
                        max={350}
                        value={logoDimensions.width}
                        onChange={(e) =>
                          setLogoDimensions((p) => ({
                            ...p,
                            width: Number(e.target.value),
                            height: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Shared Parameters: Tiled, Angle, Opacity, Placement */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                {/* Tiled diagonal grid toggle */}
                {watermark.type === "text" && (
                  <label className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Grid className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Full-Page Tiled Grid
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Repeat watermark diagonally across entire page
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={watermark.tiledGrid}
                      onChange={(e) =>
                        setWatermark((p) => ({ ...p, tiledGrid: e.target.checked }))
                      }
                      className="w-4 h-4 accent-indigo-600 rounded"
                    />
                  </label>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                        Rotation Angle
                      </span>
                      <span className="font-mono text-indigo-300">
                        {watermark.rotationAngle}°
                      </span>
                    </label>
                    <input
                      type="range"
                      min={-90}
                      max={90}
                      value={watermark.rotationAngle}
                      onChange={(e) =>
                        setWatermark((p) => ({
                          ...p,
                          rotationAngle: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        Opacity
                      </span>
                      <span className="font-mono text-indigo-300">
                        {Math.round(watermark.opacity * 100)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min={0.05}
                      max={1.0}
                      step={0.05}
                      value={watermark.opacity}
                      onChange={(e) =>
                        setWatermark((p) => ({
                          ...p,
                          opacity: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>

                {/* 9-Box Position Selector when not in full-page tiled grid */}
                {!watermark.tiledGrid && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300 block font-mono">
                        Watermark Placement
                      </label>
                      <span className="text-[11px] text-indigo-400 font-mono capitalize">
                        {watermark.position.replace("-", " ")}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-black/40 border border-white/10 rounded-xl max-w-[220px]">
                      <button
                        type="button"
                        onClick={() => setWatermark((prev) => ({ ...prev, position: "top-left" }))}
                        className={`py-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                          watermark.position === "top-left"
                            ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-400"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        TL
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatermark((prev) => ({ ...prev, position: "top-center" }))}
                        className={`py-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                          watermark.position === "top-center"
                            ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-400"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        Top
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatermark((prev) => ({ ...prev, position: "top-right" }))}
                        className={`py-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                          watermark.position === "top-right"
                            ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-400"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        TR
                      </button>

                      <button
                        type="button"
                        onClick={() => setWatermark((prev) => ({ ...prev, position: "center" }))}
                        className={`col-span-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                          watermark.position === "center"
                            ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-400"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        Center
                      </button>

                      <button
                        type="button"
                        onClick={() => setWatermark((prev) => ({ ...prev, position: "bottom-left" }))}
                        className={`py-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                          watermark.position === "bottom-left"
                            ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-400"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        BL
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatermark((prev) => ({ ...prev, position: "bottom-center" }))}
                        className={`py-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                          watermark.position === "bottom-center"
                            ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-400"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        Bottom
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatermark((prev) => ({ ...prev, position: "bottom-right" }))}
                        className={`py-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                          watermark.position === "bottom-right"
                            ? "bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-400"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        BR
                      </button>
                    </div>
                  </div>
                )}

                {/* Page Filter Scope */}
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                    Apply To Pages
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "all", label: "All Pages" },
                      { id: "all-except-first", label: "Skip Cover (P1)" },
                      { id: "custom", label: "Custom Range" },
                    ].map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() =>
                          setWatermark((p) => ({
                            ...p,
                            pageFilter: scope.id as "all" | "all-except-first" | "custom",
                          }))
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                          watermark.pageFilter === scope.id
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                            : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>

                  {watermark.pageFilter === "custom" && (
                    <div className="mt-2.5">
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
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl bg-[#C2410C] hover:bg-[#A8370A] disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Stamping Watermark...</span>
                </>
              ) : (
                <>
                  <Stamp className="w-4 h-4" />
                  <span>Apply Watermark to PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Live Interactive First-Page Watermark Canvas */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-slate-400 px-1">
              <span className="font-medium text-zinc-900 dark:text-slate-300">Live Visual Preview (Page 1)</span>
              <span>Updates instantly</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#12141D] border border-zinc-200 dark:border-white/10 flex items-center justify-center min-h-[440px] relative overflow-hidden shadow-sm">
              {isLoadingThumbnail ? (
                <div className="flex flex-col items-center gap-2 text-zinc-600 dark:text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C2410C] dark:text-indigo-400" />
                  <span>Rendering preview canvas...</span>
                </div>
              ) : previewThumbnail ? (
                <div className="relative shadow-sm rounded-lg overflow-hidden border border-zinc-200 dark:border-white/20">
                  <canvas
                    ref={previewCanvasRef}
                    className="max-h-[500px] w-auto max-w-full rounded"
                  />
                </div>
              ) : (
                <div className="text-center text-xs text-zinc-500 space-y-2">
                  <Stamp className="w-8 h-8 mx-auto opacity-30 text-[#C2410C] dark:text-indigo-400" />
                  <p>Upload a PDF to view live interactive watermark preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {fileItem && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-white/95 dark:bg-[#05060B]/90 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 md:hidden flex items-center justify-between gap-3 shadow-lg">
              <div className="text-xs text-zinc-800 dark:text-zinc-300 font-mono truncate max-w-[120px]">
                {watermark.text || "Watermark"}
              </div>
              <button
                type="button"
                onClick={handleApply}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-xl bg-[#C2410C] active:bg-[#A8370A] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Stamping...</span>
                  </>
                ) : (
                  <>
                    <Stamp className="w-3.5 h-3.5" />
                    <span>Apply Watermark</span>
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
