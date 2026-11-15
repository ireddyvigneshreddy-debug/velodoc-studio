"use client";

import React, { useState, useRef, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { getPdfJs, getPdfPageCount } from "@/lib/pdf-engine";
import {
  bakeFormFieldsIntoPdf,
  PlacedFormField,
  FormFieldType,
} from "@/lib/form-filler-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  Type,
  Check,
  X,
  Calendar,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "@/components/common/icons";

export function PdfFormFillerTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTool, setActiveTool] = useState<FormFieldType>("text");

  // Form Fields placed across pages
  const [fields, setFields] = useState<PlacedFormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState(13);
  const textColor = "#0f172a";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Render current PDF page to canvas
  useEffect(() => {
    if (!originalBuffer || !canvasRef.current) return;

    let isMounted = true;
    getPdfJs().then(async (pdfjs) => {
      if (!pdfjs) return;
      try {
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(originalBuffer),
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });

        if (!isMounted || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;
      } catch (err) {
        console.error("Failed to render page:", err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [originalBuffer, currentPage]);

  const handleFileAdded = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setErrorMessage(null);
    setMetrics(null);
    setOutputBytes(null);
    setFields([]);

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
      setTotalPages(count);
      setCurrentPage(1);
      item.pageCount = count;
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    }
  };

  // Click on container to drop field
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    // Don't place new field if clicking on an existing field or button
    if ((e.target as HTMLElement).closest(".form-field-element")) return;

    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    let defaultVal = "";
    if (activeTool === "text") defaultVal = "Click to type";
    else if (activeTool === "check") defaultVal = "✓";
    else if (activeTool === "cross") defaultVal = "✕";
    else if (activeTool === "date") defaultVal = new Date().toISOString().split("T")[0];

    const newField: PlacedFormField = {
      id: Math.random().toString(36).substring(7),
      type: activeTool,
      pageIndex: currentPage - 1,
      xPercent,
      yPercent,
      value: defaultVal,
      fontSize,
      color: textColor,
    };

    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleUpdateFieldValue = (id: string, newVal: string) => {
    setFields(
      fields.map((f) => {
        if (f.id === id) return { ...f, value: newVal };
        return f;
      })
    );
  };

  const handleDeleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleSaveFilledPdf = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const filledBytes = await bakeFormFieldsIntoPdf(originalBuffer, fields);
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      setOutputBytes(filledBytes);
      const originalSize = fileItem.size;
      const processedSize = filledBytes.byteLength;
      const savedBytes = 0;
      const savedPercentage = 0;

      const blob = createPdfBlob(filledBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = fileItem.name.replace(/\.pdf$/i, "-filled.pdf");

      setMetrics({
        originalSize,
        processedSize,
        savedBytes,
        savedPercentage,
        durationMs,
        downloadUrl,
        downloadFilename,
        pageCount: totalPages,
      });

      sessionHistory.recordExecution({
        toolId: "pdf-form-filler",
        toolName: "Universal PDF Form Filler",
        inputFiles: [fileItem.name],
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs,
        outputData: filledBytes,
      });
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to bake filled form fields into PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPageFields = fields.filter((f) => f.pageIndex === currentPage - 1);

  return (
    <div className="space-y-6">
      {!fileItem && (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{ "application/pdf": [".pdf"] }}
          multiple={false}
          title="Drop any PDF Form to Fill Out"
          subtitle="Click anywhere to type text answers, tick checkmarks, add date stamps, and save a clean PDF"
        />
      )}

      {fileItem && !metrics && (
        <div className="space-y-4">
          {/* Top Form Controls Bar */}
          <div className="premium-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-white/[0.08]">
            {/* Tool selectors */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl glass-pill">
              {[
                { id: "text", label: "Text", icon: Type },
                { id: "check", label: "Check (✓)", icon: Check },
                { id: "cross", label: "Cross (✕)", icon: X },
                { id: "date", label: "Date", icon: Calendar },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activeTool === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTool(item.id as FormFieldType)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Font size & Color */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                <span>Font:</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="bg-zinc-900 border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white"
                >
                  <option value={10}>10 pt</option>
                  <option value={12}>12 pt</option>
                  <option value={14}>14 pt</option>
                  <option value={16}>16 pt</option>
                  <option value={20}>20 pt</option>
                </select>
              </div>

              {/* Page Navigator */}
              <div className="flex items-center gap-2 border-l border-white/[0.08] pl-3">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-300 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-zinc-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-300 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Save PDF Button */}
              <button
                type="button"
                onClick={handleSaveFilledPdf}
                disabled={isProcessing}
                className="hidden md:flex px-4 py-2 rounded-xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-xs items-center gap-1.5 shadow-lg transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Filled PDF ({fields.length} fields)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Interactive PDF Sheet & Overlay Container */}
          <div className="premium-card p-4 rounded-3xl flex justify-center border border-white/[0.08] overflow-x-auto">
            <div
              ref={containerRef}
              onClick={handleContainerClick}
              className="relative shadow-2xl rounded-xl overflow-hidden border border-zinc-700 bg-white cursor-crosshair select-none max-w-full"
            >
              <canvas ref={canvasRef} className="block w-full h-auto" />

              {/* Placed Fields Overlay */}
              {currentPageFields.map((field) => {
                const isSelected = selectedFieldId === field.id;

                return (
                  <div
                    key={field.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                    }}
                    style={{
                      left: `${field.xPercent}%`,
                      top: `${field.yPercent}%`,
                    }}
                    className={`form-field-element absolute transform -translate-y-1/2 p-1 rounded transition-all ${
                      isSelected
                        ? "ring-2 ring-indigo-500 bg-indigo-50/90 shadow-md"
                        : "hover:ring-1 hover:ring-indigo-300 bg-white/80"
                    }`}
                  >
                    {field.type === "text" || field.type === "date" ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleUpdateFieldValue(field.id, e.target.value)}
                          style={{
                            fontSize: `${field.fontSize || 13}px`,
                            color: field.color || "#0f172a",
                          }}
                          className="bg-transparent border-none outline-none font-sans font-medium px-1 py-0.5"
                          autoFocus={isSelected}
                        />
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(field.id);
                            }}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-bold text-indigo-700 px-1">
                        <span>{field.value}</span>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(field.id);
                            }}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {metrics && (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          outputMimeType="application/pdf"
          title="Form Filled Successfully"
          onAdjustSettings={() => {
            setMetrics(null);
          }}
        />
      )}

      {/* Mobile Sticky Action Bar */}
      {fileItem && !metrics && (
        <div className="fixed bottom-0 inset-x-0 z-40 pb-safe md:hidden bg-zinc-950/90 backdrop-blur-xl border-t border-white/[0.12] p-3 shadow-2xl">
          <button
            type="button"
            onClick={handleSaveFilledPdf}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Filled PDF ({fields.length} Fields)</span>
          </button>
        </div>
      )}
    </div>
  );
}
