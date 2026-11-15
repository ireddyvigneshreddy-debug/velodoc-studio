"use client";

import React, { useState, useRef, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { PDFDocument } from "pdf-lib";
import { createPdfBlob } from "@/lib/utils";
import { Camera, Download, RefreshCw, Sparkles, ZoomIn, ZoomOut, Move } from "@/components/common/icons";

interface CountryPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  aspectRatio: number;
  description: string;
  maxKb?: number;
}

const PRESETS: CountryPreset[] = [
  {
    id: "us-passport",
    name: "US Passport & Visa",
    widthMm: 51,
    heightMm: 51,
    aspectRatio: 1,
    description: "2x2 inches (51x51 mm) • White background",
    maxKb: 240,
  },
  {
    id: "schengen-uk-india",
    name: "Schengen, UK & India OVI",
    widthMm: 35,
    heightMm: 45,
    aspectRatio: 35 / 45,
    description: "35x45 mm • 70-80% face coverage",
    maxKb: 100,
  },
  {
    id: "canada-passport",
    name: "Canada Passport",
    widthMm: 50,
    heightMm: 70,
    aspectRatio: 50 / 70,
    description: "50x70 mm • Plain white or light background",
    maxKb: 300,
  },
  {
    id: "australia-passport",
    name: "Australia Passport",
    widthMm: 35,
    heightMm: 45,
    aspectRatio: 35 / 45,
    description: "35x45 mm • Neutral light grey/white",
    maxKb: 150,
  },
  {
    id: "green-card",
    name: "Diversity Visa / Green Card",
    widthMm: 51,
    heightMm: 51,
    aspectRatio: 1,
    description: "600x600 px • Official lottery compliant",
    maxKb: 240,
  },
];

export function PassportPhotoTool() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<CountryPreset>(PRESETS[0]);
  const [bgTint, setBgTint] = useState<"white" | "offwhite" | "blue" | "grey" | "original">("white");
  const [showGuidelines, setShowGuidelines] = useState(true);

  // Pan & Zoom
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFilesAdded = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setImageFile(file);
    const url = URL.createObjectURL(file);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgElement(img);
      setZoom(1.0);
      setPanX(0);
      setPanY(0);
    };
    img.src = url;
  };

  // Render on preview canvas whenever parameters change
  useEffect(() => {
    if (!imgElement || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const targetW = 600;
    const targetH = Math.round(targetW / selectedPreset.aspectRatio);

    canvas.width = targetW;
    canvas.height = targetH;

    // Background tint
    if (bgTint === "white") {
      ctx.fillStyle = "#ffffff";
    } else if (bgTint === "offwhite") {
      ctx.fillStyle = "#faf9f6";
    } else if (bgTint === "blue") {
      ctx.fillStyle = "#dbeafe";
    } else if (bgTint === "grey") {
      ctx.fillStyle = "#f3f4f6";
    } else {
      ctx.fillStyle = "#ffffff";
    }
    ctx.fillRect(0, 0, targetW, targetH);

    // Draw user image transformed with pan & zoom
    ctx.save();
    ctx.translate(targetW / 2 + panX, targetH / 2 + panY);
    ctx.scale(zoom, zoom);

    // Draw image centered
    const imgAspect = imgElement.naturalWidth / imgElement.naturalHeight;
    let drawW = targetW;
    let drawH = targetW / imgAspect;
    if (drawH < targetH) {
      drawH = targetH;
      drawW = targetH * imgAspect;
    }

    ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Guidelines overlay
    if (showGuidelines) {
      ctx.save();
      ctx.strokeStyle = "rgba(99, 102, 241, 0.75)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);

      // Oval head outline (ICAO ~70-80% height)
      const headCenterX = targetW / 2;
      const headCenterY = targetH * 0.44;
      const radiusX = targetW * 0.28;
      const radiusY = targetH * 0.32;

      ctx.beginPath();
      ctx.ellipse(headCenterX, headCenterY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Eye-level line (standard ~56% from bottom, 44% from top)
      ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
      ctx.beginPath();
      ctx.moveTo(targetW * 0.2, targetH * 0.42);
      ctx.lineTo(targetW * 0.8, targetH * 0.42);
      ctx.stroke();

      // Chin line
      ctx.strokeStyle = "rgba(244, 63, 94, 0.75)";
      ctx.beginPath();
      ctx.moveTo(targetW * 0.28, targetH * 0.76);
      ctx.lineTo(targetW * 0.72, targetH * 0.76);
      ctx.stroke();

      ctx.restore();
    }
  }, [imgElement, selectedPreset, bgTint, showGuidelines, zoom, panX, panY]);

  // Pointer drag events for canvas
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panX,
      startPanY: panY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanX(dragStartRef.current.startPanX + dx);
    setPanY(dragStartRef.current.startPanY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Export Single Photo
  const handleDownloadSingle = () => {
    if (!previewCanvasRef.current) return;
    // Hide guidelines before final export
    setShowGuidelines(false);
    setTimeout(() => {
      const canvas = previewCanvasRef.current!;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `passport-photo-${selectedPreset.id}.jpg`;
      a.click();
      setShowGuidelines(true);
    }, 50);
  };

  // Export 4x6" Printable Sheet (8 photos grid) PDF
  const handleDownloadPrintSheetPdf = async () => {
    if (!previewCanvasRef.current) return;
    setShowGuidelines(false);

    setTimeout(async () => {
      const canvas = previewCanvasRef.current!;
      const imgDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const res = await fetch(imgDataUrl);
      const imgBytes = await res.arrayBuffer();

      // 4 x 6 inches in PDF points (72 pt per inch) -> 288 x 432 pt
      const sheetW = 432; // landscape 6x4
      const sheetH = 288;

      const pdfDoc = await PDFDocument.create();
      const sheet = pdfDoc.addPage([sheetW, sheetH]);
      const embedded = await pdfDoc.embedJpg(imgBytes);

      // Arrange 2 rows of 3 or 4 photos
      const cols = 3;
      const rows = 2;
      const margin = 20;
      const spacing = 12;

      const photoW = (sheetW - margin * 2 - spacing * (cols - 1)) / cols;
      const photoH = photoW / selectedPreset.aspectRatio;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = margin + c * (photoW + spacing);
          const y = sheetH - margin - (r + 1) * photoH - r * spacing;

          sheet.drawImage(embedded, {
            x,
            y,
            width: photoW,
            height: photoH,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = createPdfBlob(pdfBytes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passport-sheet-4x6-${selectedPreset.id}.pdf`;
      a.click();
      setShowGuidelines(true);
    }, 60);
  };

  return (
    <div className="space-y-6">
      {!imageFile && (
        <DropZone
          files={[]}
          onFilesAdded={handleFilesAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"],
          }}
          multiple={false}
          title="Drop any Portrait Photo or Selfie"
          subtitle="Create official biometric passport & visa photos (US, Schengen, India, UK) with guidelines and 4x6 print sheets"
        />
      )}

      {imageFile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-5">
            <div className="premium-card p-5 sm:p-6 rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Passport Photo Studio</h3>
                    <p className="text-xs text-zinc-400">Biometric standard crop</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImgElement(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  Change Photo
                </button>
              </div>

              {/* Country Standard Presets */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Select Country / Standard
                </label>
                <div className="space-y-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPreset(preset)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        selectedPreset.id === preset.id
                          ? "bg-indigo-600/15 border-indigo-500/50 text-white"
                          : "bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/[0.12]"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold text-white block">{preset.name}</span>
                        <span className="text-[11px] text-zinc-400 block">{preset.description}</span>
                      </div>
                      <span className="text-xs font-mono font-medium text-indigo-400">
                        {preset.widthMm}x{preset.heightMm}mm
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zoom & Positioning Sliders */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                    Face Zoom Scale
                  </span>
                  <span className="text-xs font-mono text-indigo-400 font-semibold">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-zinc-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Move className="w-3 h-3" /> Drag canvas to align head inside oval
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1.0);
                      setPanX(0);
                      setPanY(0);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Reset Position
                  </button>
                </div>
              </div>

              {/* Background Tint */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs font-semibold text-zinc-300">Background Tint</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "white", label: "Pure White" },
                    { id: "offwhite", label: "Off-White" },
                    { id: "blue", label: "Embassy Blue" },
                    { id: "grey", label: "Neutral Grey" },
                  ].map((tint) => (
                    <button
                      key={tint.id}
                      type="button"
                      onClick={() => setBgTint(tint.id as typeof bgTint)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                        bgTint === tint.id
                          ? "bg-indigo-600 border-indigo-500 text-white font-semibold"
                          : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {tint.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guidelines Toggle */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-white block">Official Biometric Guidelines</span>
                  <span className="text-[11px] text-zinc-400 block">Head oval, eye line (green) & chin guide (red)</span>
                </div>
                <input
                  type="checkbox"
                  checked={showGuidelines}
                  onChange={(e) => setShowGuidelines(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadSingle}
                  className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Single Photo ({selectedPreset.widthMm}x{selectedPreset.heightMm}mm)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPrintSheetPdf}
                  className="w-full py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download 4x6&quot; Photo Paper Sheet PDF (6 Photos)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Preview Canvas */}
          <div className="lg:col-span-7 space-y-4">
            <div className="premium-card p-6 rounded-3xl flex flex-col items-center justify-center min-h-[460px] border border-white/[0.08] relative overflow-hidden">
              <span className="text-xs text-zinc-400 mb-3 block">
                Live Biometric Alignment Preview (Touch / Drag to reposition)
              </span>

              <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-white/[0.2] bg-white">
                <canvas
                  ref={previewCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="touch-none cursor-grab active:cursor-grabbing max-h-[360px] w-auto block"
                />
              </div>

              <div className="flex items-center gap-4 text-[11px] text-zinc-400 mt-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  Head Oval (70-80%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Eye Level
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Chin Base
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bar */}
      {imageFile && (
        <div className="fixed bottom-0 inset-x-0 z-40 pb-safe md:hidden bg-zinc-950/90 backdrop-blur-xl border-t border-white/[0.12] p-3 shadow-2xl">
          <button
            type="button"
            onClick={handleDownloadSingle}
            className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Save Passport Photo</span>
          </button>
        </div>
      )}
    </div>
  );
}
