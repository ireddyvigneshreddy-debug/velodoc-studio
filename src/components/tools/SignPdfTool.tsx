"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, SignatureAnnotation, ProcessingMetrics } from "@/types";
import {
  signAndAnnotatePdf,
  renderPdfPageToCanvas,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  PenTool,
  Type,
  Image as ImageIcon,
  Check,
  Calendar,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Move,
} from "@/components/common/icons";

export function SignPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Active annotations on current document
  const [annotations, setAnnotations] = useState<SignatureAnnotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initX: number; initY: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Signature creation mode: draw, type, upload
  const [sigMode, setSigMode] = useState<"draw" | "type" | "upload">("draw");
  const [typedName, setTypedName] = useState("John Doe");
  const [typedFont, setTypedFont] = useState<"cursive" | "script" | "italic">(
    "cursive"
  );
  const [penColor, setPenColor] = useState("#000000");
  const [penThickness, setPenThickness] = useState(3);

  // Drawing canvas
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Background PDF Page canvas
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = createPdfBlob(chained.data);
      const file = new File([blob], chained.filename, {
        type: "application/pdf",
      });
      handleFileAdded([file]);
    }
  }, []);

  const handleFileAdded = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setErrorMessage(null);
    setMetrics(null);
    setOutputBytes(null);
    setAnnotations([]);
    setSelectedAnnotationId(null);

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
      setTotalPages(count);
      setCurrentPage(1);
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    }
  };

  // Render current page onto stage canvas
  useEffect(() => {
    let active = true;
    async function loadPage() {
      if (!originalBuffer) return;
      try {
        const canvas = await renderPdfPageToCanvas(originalBuffer, currentPage, 1.4);
        if (active && pageCanvasRef.current) {
          const target = pageCanvasRef.current;
          target.width = canvas.width;
          target.height = canvas.height;
          const ctx = target.getContext("2d");
          ctx?.drawImage(canvas, 0, 0);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    loadPage();
    return () => {
      active = false;
    };
  }, [originalBuffer, currentPage]);

  // Drawing Pad Handlers (Pointer Events with Touch-Action: None)
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penThickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Helper: create typed signature data URL
  const getTypedSignatureDataUrl = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = penColor;
    ctx.font =
      typedFont === "cursive"
        ? "italic bold 64px 'Brush Script MT', cursive, sans-serif"
        : typedFont === "script"
        ? "italic 56px 'Segoe Script', cursive, sans-serif"
        : "italic 58px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName || "Signature", canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
  };

  // Place Signature Annotation
  const handleAddSignature = () => {
    let dataUrl = "";
    if (sigMode === "draw") {
      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      dataUrl = canvas.toDataURL("image/png");
    } else if (sigMode === "type") {
      dataUrl = getTypedSignatureDataUrl();
    }

    if (!dataUrl) return;

    const newAnn: SignatureAnnotation = {
      id: Math.random().toString(36).substring(7),
      type: "signature",
      content: dataUrl,
      pageNumber: currentPage,
      xPercent: 35,
      yPercent: 75,
      widthPercent: 28,
      heightPercent: 12,
    };

    setAnnotations((prev) => [...prev, newAnn]);
    setSelectedAnnotationId(newAnn.id);
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const newAnn: SignatureAnnotation = {
        id: Math.random().toString(36).substring(7),
        type: "signature",
        content: dataUrl,
        pageNumber: currentPage,
        xPercent: 35,
        yPercent: 75,
        widthPercent: 28,
        heightPercent: 12,
      };

      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedAnnotationId(newAnn.id);
    };
    reader.readAsDataURL(file);
  };

  const handleAddTextOrStamp = (type: "date" | "text" | "checkmark") => {
    let content = "";
    let width = 20;
    let height = 6;

    if (type === "date") {
      content = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      width = 22;
      height = 5;
    } else if (type === "text") {
      content = "Approved & Verified";
      width = 26;
      height = 5;
    } else if (type === "checkmark") {
      content = "✓";
      width = 8;
      height = 6;
    }

    const newAnn: SignatureAnnotation = {
      id: Math.random().toString(36).substring(7),
      type: type,
      content,
      pageNumber: currentPage,
      xPercent: 40,
      yPercent: 65,
      widthPercent: width,
      heightPercent: height,
      color: penColor,
      fontSize: 16,
    };

    setAnnotations((prev) => [...prev, newAnn]);
    setSelectedAnnotationId(newAnn.id);
  };

  // Interactive Drag & Drop Handlers on Canvas Overlays (Unified Pointer & Touch)
  const handleAnnotationPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    annId: string
  ) => {
    e.stopPropagation();
    setSelectedAnnotationId(annId);
    setDraggingId(annId);

    const targetAnn = annotations.find((a) => a.id === annId);
    if (!targetAnn) return;

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initX: targetAnn.xPercent,
      initY: targetAnn.yPercent,
    };
  };

  const handleStagePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingId || !dragStartRef.current || !stageRef.current) return;

      const rect = stageRef.current.getBoundingClientRect();
      const deltaXPixels = e.clientX - dragStartRef.current.mouseX;
      const deltaYPixels = e.clientY - dragStartRef.current.mouseY;

      const deltaXPercent = (deltaXPixels / rect.width) * 100;
      const deltaYPercent = (deltaYPixels / rect.height) * 100;

      setAnnotations((prev) =>
        prev.map((ann) => {
          if (ann.id !== draggingId) return ann;

          const newX = Math.max(
            0,
            Math.min(100 - ann.widthPercent, dragStartRef.current!.initX + deltaXPercent)
          );
          const newY = Math.max(
            0,
            Math.min(100 - ann.heightPercent, dragStartRef.current!.initY + deltaYPercent)
          );

          return {
            ...ann,
            xPercent: Math.round(newX * 10) / 10,
            yPercent: Math.round(newY * 10) / 10,
          };
        })
      );
    },
    [draggingId]
  );

  const handleStagePointerUp = useCallback(() => {
    setDraggingId(null);
    dragStartRef.current = null;
  }, []);

  // Scale adjustment for active annotation
  const handleScaleAnnotation = (annId: string, factor: number) => {
    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.id !== annId) return ann;
        const newW = Math.max(8, Math.min(80, ann.widthPercent * factor));
        const newH = Math.max(4, Math.min(60, ann.heightPercent * factor));
        return {
          ...ann,
          widthPercent: Math.round(newW * 10) / 10,
          heightPercent: Math.round(newH * 10) / 10,
        };
      })
    );
  };

  // Bake & Save Document
  const handleSaveDocument = async () => {
    if (!fileItem || !originalBuffer || annotations.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const signedBytes = await signAndAnnotatePdf(originalBuffer, annotations);
      const endTime = performance.now();

      const blob = createPdfBlob(signedBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(signedBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: signedBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_signed.pdf`,
        pageCount: fileItem.pageCount || 1,
        targetAccuracy: `${annotations.length} Annotations Stamped`,
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to bake signatures into PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageAnnotations = annotations.filter(
    (a) => a.pageNumber === currentPage
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          title="Signatures &amp; Stamps Applied!"
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
              title="Upload PDF to sign &amp; annotate"
              subtitle="Draw smooth signatures, type cursive scripts, or stamp dates and text boxes directly over pages"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Signature Generator Controls */}
              <div className="lg:col-span-5 space-y-5">
                <div className="p-5 rounded-3xl premium-card space-y-4 shadow-xl">
                  {/* Signature Mode tabs */}
                  <div className="flex rounded-xl glass-pill p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSigMode("draw")}
                      className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        sigMode === "draw"
                          ? "bg-indigo-600 text-white shadow font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <PenTool className="w-3 h-3" />
                      <span>Draw</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode("type")}
                      className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        sigMode === "type"
                          ? "bg-indigo-600 text-white shadow font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Type className="w-3 h-3" />
                      <span>Type</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode("upload")}
                      className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        sigMode === "upload"
                          ? "bg-indigo-600 text-white shadow font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                  </div>

                  {/* Mode 1: Drawing Pad */}
                  {sigMode === "draw" && (
                    <div className="space-y-3">
                      <div className="border border-white/10 rounded-2xl bg-white overflow-hidden shadow-inner">
                        <canvas
                          ref={drawCanvasRef}
                          width={340}
                          height={120}
                          onPointerDown={startDrawing}
                          onPointerMove={draw}
                          onPointerUp={stopDrawing}
                          onPointerLeave={stopDrawing}
                          className="w-full h-28 cursor-crosshair block touch-none"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {["#000000", "#1D4ED8", "#DC2626"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setPenColor(c)}
                              className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all ${
                                penColor === c
                                  ? "border-white scale-110 shadow"
                                  : "border-transparent opacity-80"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <div className="flex items-center gap-1 ml-2 text-[11px] text-zinc-400 font-mono">
                            <span>Width:</span>
                            <input
                              type="range"
                              min={1}
                              max={6}
                              value={penThickness}
                              onChange={(e) => setPenThickness(Number(e.target.value))}
                              className="w-16 accent-indigo-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearDrawing}
                          className="text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer text-xs"
                        >
                          Clear Pad
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSignature}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Place Signature on Page</span>
                      </button>
                    </div>
                  )}

                  {/* Mode 2: Typed Cursive Signature */}
                  {sigMode === "type" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        placeholder="Type your name..."
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />

                      <div className="p-3 rounded-xl bg-white text-black text-center min-h-[60px] flex items-center justify-center font-bold">
                        <span
                          style={{
                            fontFamily:
                              typedFont === "cursive"
                                ? "'Brush Script MT', cursive"
                                : "serif",
                            fontSize: "26px",
                            color: penColor,
                          }}
                        >
                          {typedName || "Your Signature"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-2">
                          {["#000000", "#1D4ED8", "#DC2626"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setPenColor(c)}
                              className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                                penColor === c
                                  ? "border-white scale-110"
                                  : "border-transparent opacity-80"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1">
                          {(["cursive", "script", "italic"] as const).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setTypedFont(f)}
                              className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors cursor-pointer ${
                                typedFont === f
                                  ? "bg-indigo-600 text-white font-semibold"
                                  : "bg-white/5 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSignature}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Place Typed Signature</span>
                      </button>
                    </div>
                  )}

                  {/* Mode 3: Upload Transparent PNG Stamp */}
                  {sigMode === "upload" && (
                    <div className="space-y-3">
                      <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 bg-white/[0.02] cursor-pointer text-xs text-zinc-400 transition-colors">
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handleUploadSignature}
                          className="hidden"
                        />
                        <ImageIcon className="w-6 h-6 text-indigo-400 mb-1" />
                        <span>Click to upload PNG signature or transparent stamp</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Additional Quick Stamps: Date, Text, Checkmark */}
                <div className="p-4 rounded-3xl premium-card space-y-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block font-mono">
                    Quick Annotations &amp; Stamps
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddTextOrStamp("date")}
                      className="py-2 px-2.5 rounded-xl glass-pill hover:bg-white/[0.08] text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Date</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTextOrStamp("text")}
                      className="py-2 px-2.5 rounded-xl glass-pill hover:bg-white/[0.08] text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Type className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTextOrStamp("checkmark")}
                      className="py-2 px-2.5 rounded-xl glass-pill hover:bg-white/[0.08] text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Checkmark</span>
                    </button>
                  </div>
                </div>

                {/* Selected Annotation Scale & Controls */}
                {selectedAnnotationId && (
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-xs">
                    <span className="text-indigo-300 font-mono text-[11px] flex items-center gap-1">
                      <Move className="w-3.5 h-3.5" />
                      <span>Drag to move • Scale:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleScaleAnnotation(selectedAnnotationId, 0.85)}
                        className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-zinc-200 border border-white/10 cursor-pointer flex items-center gap-1"
                      >
                        <ZoomOut className="w-3 h-3" /> Smaller
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleAnnotation(selectedAnnotationId, 1.15)}
                        className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-zinc-200 border border-white/10 cursor-pointer flex items-center gap-1"
                      >
                        <ZoomIn className="w-3 h-3" /> Larger
                      </button>
                    </div>
                  </div>
                )}

                {/* Bake & Save Document */}
                <button
                  type="button"
                  disabled={isProcessing || annotations.length === 0}
                  onClick={handleSaveDocument}
                  className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Baking Annotations into PDF...</span>
                    </>
                  ) : (
                    <>
                      <PenTool className="w-4 h-4" />
                      <span>Bake &amp; Preview Signed PDF ({annotations.length})</span>
                    </>
                  )}
                </button>

                {errorMessage && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Placement Canvas */}
              <div className="lg:col-span-7 space-y-3 flex flex-col items-center">
                <div className="flex items-center justify-between w-full text-xs text-zinc-400 px-2 font-mono">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded-lg glass-pill text-zinc-300 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1 text-zinc-300">{currentPage}/{totalPages}</span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded-lg glass-pill text-zinc-300 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Document Placement Stage */}
                <div
                  ref={stageRef}
                  onPointerMove={handleStagePointerMove}
                  onPointerUp={handleStagePointerUp}
                  className="relative border border-white/15 rounded-2xl overflow-hidden bg-black/60 shadow-2xl max-w-full select-none touch-none"
                >
                  <canvas ref={pageCanvasRef} className="max-w-full h-auto block" />

                  {/* Render positioned annotations over current page */}
                  {currentPageAnnotations.map((ann) => {
                    const isSelected = selectedAnnotationId === ann.id;
                    return (
                      <div
                        key={ann.id}
                        onPointerDown={(e) => handleAnnotationPointerDown(e, ann.id)}
                        style={{
                          position: "absolute",
                          left: `${ann.xPercent}%`,
                          top: `${ann.yPercent}%`,
                          width: `${ann.widthPercent}%`,
                          height: `${ann.heightPercent}%`,
                        }}
                        className={`group rounded flex items-center justify-center cursor-move select-none p-1 transition-shadow ${
                          isSelected
                            ? "border-2 border-indigo-400 bg-indigo-500/20 shadow-paper ring-1 ring-indigo-400"
                            : "border border-dashed border-indigo-400/70 bg-indigo-500/10 hover:border-indigo-400"
                        }`}
                      >
                        {ann.type === "signature" ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={ann.content}
                            alt="Signature"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <span
                            className="font-bold text-center pointer-events-none truncate"
                            style={{
                              color: ann.color || "#000000",
                              fontSize: `${ann.fontSize || 14}px`,
                            }}
                          >
                            {ann.content}
                          </span>
                        )}

                        {/* Remove annotation button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnnotations((prev) =>
                              prev.filter((a) => a.id !== ann.id)
                            );
                            if (selectedAnnotationId === ann.id) {
                              setSelectedAnnotationId(null);
                            }
                          }}
                          className="absolute -top-2.5 -right-2.5 p-1 rounded-full bg-rose-600 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md hover:bg-rose-500 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <span className="text-[11px] text-zinc-500 text-center font-mono">
                  Click and drag annotations anywhere across the page. Use the controls on the left to scale.
                </span>
              </div>
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {annotations.length > 0 && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono">
                <span className="font-semibold text-white">{annotations.length}</span> annotation{annotations.length > 1 ? "s" : ""}
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSaveDocument}
                className="flex-1 py-3 px-4 rounded-xl bg-vermilion active:bg-vermilion-hover text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Baking...</span>
                  </>
                ) : (
                  <>
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Bake & Preview Signed PDF</span>
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
