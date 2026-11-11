"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

export function SignPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Active annotations on current document
  const [annotations, setAnnotations] = useState<SignatureAnnotation[]>([]);

  // Signature creation mode: draw, type, upload
  const [sigMode, setSigMode] = useState<"draw" | "type" | "upload">("draw");
  const [typedName, setTypedName] = useState("John Doe");
  const [typedFont, setTypedFont] = useState<"cursive" | "script" | "italic">(
    "cursive"
  );
  const [penColor, setPenColor] = useState("#000000"); // black, blue, red
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

  // Render current page background on canvas
  useEffect(() => {
    let active = true;
    async function loadPage() {
      if (!originalBuffer) return;
      try {
        const canvas = await renderPdfPageToCanvas(originalBuffer, currentPage, 1.2);
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

  // Drawing Pad Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penThickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Add signature annotation to current page
  const handleAddSignature = () => {
    let dataUrl = "";

    if (sigMode === "draw") {
      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      dataUrl = canvas.toDataURL("image/png");
    } else if (sigMode === "type") {
      // Create offscreen canvas for cursive typed font
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 140;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = penColor;
      ctx.font =
        typedFont === "cursive"
          ? "italic 44px 'Brush Script MT', 'Segoe Script', cursive"
          : "italic 38px 'Georgia', serif";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, 20, 70);
      dataUrl = canvas.toDataURL("image/png");
    }

    if (!dataUrl) return;

    const newAnn: SignatureAnnotation = {
      id: Math.random().toString(36).substring(7),
      type: "signature",
      pageNumber: currentPage,
      xPercent: 35,
      yPercent: 45,
      widthPercent: 30,
      heightPercent: 12,
      content: dataUrl,
    };

    setAnnotations((prev) => [...prev, newAnn]);
  };

  const handleAddTextOrStamp = (type: "text" | "date" | "checkmark") => {
    let content = "Sample Note";
    if (type === "date") content = new Date().toLocaleDateString();
    if (type === "checkmark") content = "✓";

    const newAnn: SignatureAnnotation = {
      id: Math.random().toString(36).substring(7),
      type,
      pageNumber: currentPage,
      xPercent: 40,
      yPercent: 40,
      widthPercent: type === "checkmark" ? 8 : 25,
      heightPercent: type === "checkmark" ? 8 : 6,
      content,
      color: type === "checkmark" ? "#16A34A" : "#000000",
      fontSize: 14,
    };
    setAnnotations((prev) => [...prev, newAnn]);
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newAnn: SignatureAnnotation = {
        id: Math.random().toString(36).substring(7),
        type: "signature",
        pageNumber: currentPage,
        xPercent: 35,
        yPercent: 45,
        widthPercent: 28,
        heightPercent: 14,
        content: dataUrl,
      };
      setAnnotations((prev) => [...prev, newAnn]);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocument = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const signedBytes = await signAndAnnotatePdf(
        originalBuffer,
        annotations
      );
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
              subtitle="Draw smooth signatures, type cursive scripts, or stamp dates and text boxes"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Signature Generator Controls */}
              <div className="lg:col-span-5 space-y-5">
                <div className="p-5 rounded-3xl bg-[#12141D] border border-white/10 space-y-4 shadow-xl">
                  {/* Signature Mode tabs */}
                  <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setSigMode("draw")}
                      className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                        sigMode === "draw"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <PenTool className="w-3 h-3" />
                      <span>Draw</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode("type")}
                      className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                        sigMode === "type"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Type className="w-3 h-3" />
                      <span>Type</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode("upload")}
                      className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                        sigMode === "upload"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
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
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          className="w-full h-28 cursor-crosshair block"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {["#000000", "#1D4ED8", "#DC2626"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setPenColor(c)}
                              className={`w-6 h-6 rounded-full border-2 ${
                                penColor === c
                                  ? "border-white scale-110 shadow"
                                  : "border-transparent opacity-80"
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <div className="flex items-center gap-1 ml-2 text-[11px] text-slate-400">
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
                          className="text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          Clear
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSignature}
                        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
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
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
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
                              className={`w-6 h-6 rounded-full border-2 ${
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
                              className={`px-2 py-0.5 rounded text-[10px] capitalize transition-colors ${
                                typedFont === f
                                  ? "bg-indigo-600 text-white"
                                  : "bg-white/5 text-slate-400 hover:text-white"
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
                        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Place Typed Signature</span>
                      </button>
                    </div>
                  )}

                  {/* Mode 3: Upload Transparent PNG Stamp */}
                  {sigMode === "upload" && (
                    <div className="space-y-3">
                      <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 bg-white/[0.02] cursor-pointer text-xs text-slate-400">
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handleUploadSignature}
                          className="hidden"
                        />
                        <ImageIcon className="w-6 h-6 text-indigo-400 mb-1" />
                        <span>Click to upload PNG signature or stamp</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Additional Quick Stamps: Date, Text, Checkmark */}
                <div className="p-4 rounded-3xl bg-[#12141D] border border-white/10 space-y-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Quick Annotations &amp; Stamps
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddTextOrStamp("date")}
                      className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 border border-white/5"
                    >
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Date</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTextOrStamp("text")}
                      className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 border border-white/5"
                    >
                      <Type className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTextOrStamp("checkmark")}
                      className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 border border-white/5"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Checkmark</span>
                    </button>
                  </div>
                </div>

                {/* Bake & Save Document */}
                <button
                  type="button"
                  disabled={isProcessing || annotations.length === 0}
                  onClick={handleSaveDocument}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Baking Annotations...</span>
                    </>
                  ) : (
                    <>
                      <PenTool className="w-4 h-4" />
                      <span>Bake &amp; Preview Signed PDF ({annotations.length})</span>
                    </>
                  )}
                </button>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Interactive Placement Canvas */}
              <div className="lg:col-span-7 space-y-3 flex flex-col items-center">
                <div className="flex items-center justify-between w-full text-xs text-slate-400 px-2">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {/* Document Placement Stage */}
                <div className="relative border border-white/15 rounded-2xl overflow-hidden bg-black/60 shadow-2xl max-w-full">
                  <canvas ref={pageCanvasRef} className="max-w-full h-auto block" />

                  {/* Render positioned annotations over current page */}
                  {currentPageAnnotations.map((ann) => (
                    <div
                      key={ann.id}
                      style={{
                        position: "absolute",
                        left: `${ann.xPercent}%`,
                        top: `${ann.yPercent}%`,
                        width: `${ann.widthPercent}%`,
                        height: `${ann.heightPercent}%`,
                      }}
                      className="group border border-dashed border-indigo-400 bg-indigo-500/10 rounded flex items-center justify-center cursor-move select-none p-1"
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
                        onClick={() =>
                          setAnnotations((prev) =>
                            prev.filter((a) => a.id !== ann.id)
                          )
                        }
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <span className="text-[11px] text-slate-500 text-center">
                  Click and position stamps directly onto the target page
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
