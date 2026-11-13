"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { createNUpPdf, NUpOptions } from "@/lib/nup-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { Grid, LayoutGrid, Scissors, Sparkles, AlertCircle, Loader2 } from "lucide-react";

export function NUpPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [options, setOptions] = useState<NUpOptions>({
    pagesPerSheet: 4,
    pageSize: "a4",
    orientation: "auto",
    direction: "horizontal",
    drawBorders: true,
    drawCutGuides: true,
    margin: 20,
    spacing: 12,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = createPdfBlob(chained.data);
      const file = new File([blob], chained.filename, { type: "application/pdf" });
      handleFileAdded([file]);
    }
  }, []);

  const handleFileAdded = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setErrorMessage(null);
    setMetrics(null);
    setOutputBytes(null);

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
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    }
  };

  const totalPages = fileItem?.pageCount || 1;
  const resultingSheets = Math.ceil(totalPages / options.pagesPerSheet);
  const paperSavedPercent = Math.max(0, Math.round(((totalPages - resultingSheets) / totalPages) * 100));

  const handleProcess = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressMsg("Arranging multi-page imposition layout...");
    const startTime = performance.now();

    try {
      const processed = await createNUpPdf(originalBuffer, options, (_, msg) => {
        setProgressMsg(msg);
      });

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      setOutputBytes(processed);
      const originalSize = fileItem.size;
      const processedSize = processed.byteLength;
      const savedBytes = originalSize - processedSize;
      const savedPercentage = Math.round((savedBytes / originalSize) * 100);

      const blob = createPdfBlob(processed);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = fileItem.name.replace(/\.pdf$/i, `-${options.pagesPerSheet}up.pdf`);

      setMetrics({
        originalSize,
        processedSize,
        savedBytes,
        savedPercentage,
        durationMs,
        downloadUrl,
        downloadFilename,
        pageCount: resultingSheets,
      });

      sessionHistory.recordExecution({
        toolId: "nup-pdf",
        toolName: "N-Up Multi-Page & Booklet Studio",
        inputFiles: [fileItem.name],
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs,
        outputData: processed,
      });
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to generate N-Up imposition PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!fileItem && (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{ "application/pdf": [".pdf"] }}
          multiple={false}
          title="Drop PDF to Combine Multiple Pages Per Sheet"
          subtitle="Create 2-up, 4-up, or 8-up handouts, lecture slides, cuttable booklet sheets & save 75% paper"
        />
      )}

      {fileItem && !metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            <div className="premium-card p-5 sm:p-6 rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">N-Up Multi-Page Layout</h3>
                    <p className="text-xs text-zinc-400">{fileItem.name} ({totalPages} pages)</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFileItem(null);
                    setOriginalBuffer(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  Change File
                </button>
              </div>

              {/* Pages Per Sheet Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Pages Per Sheet
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[2, 4, 6, 8, 9, 16].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setOptions({ ...options, pagesPerSheet: count as NUpOptions["pagesPerSheet"] })}
                      className={`py-3 rounded-2xl border text-center transition-all ${
                        options.pagesPerSheet === count
                          ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-[0_0_16px_rgba(99,102,241,0.3)]"
                          : "bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/[0.14]"
                      }`}
                    >
                      <span className="text-sm block">{count}-Up</span>
                      <span className="text-[10px] text-zinc-400 block font-normal">
                        {count === 2 ? "2x1" : count === 4 ? "2x2" : count === 6 ? "3x2" : count === 8 ? "4x2" : count === 9 ? "3x3" : "4x4"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sheet Paper Size & Orientation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">Sheet Paper Size</label>
                  <select
                    value={options.pageSize}
                    onChange={(e) => setOptions({ ...options, pageSize: e.target.value as NUpOptions["pageSize"] })}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="a4">A4 (Standard 210 x 297 mm)</option>
                    <option value="letter">US Letter (8.5 x 11 in)</option>
                    <option value="a3">A3 (Large 297 x 420 mm)</option>
                    <option value="legal">US Legal (8.5 x 14 in)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">Sheet Orientation</label>
                  <select
                    value={options.orientation}
                    onChange={(e) => setOptions({ ...options, orientation: e.target.value as NUpOptions["orientation"] })}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="auto">Auto (Best Aspect Ratio)</option>
                    <option value="landscape">Landscape (Horizontal)</option>
                    <option value="portrait">Portrait (Vertical)</option>
                  </select>
                </div>
              </div>

              {/* Toggles: Cut Guides & Page Borders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.12] transition-colors">
                  <input
                    type="checkbox"
                    checked={options.drawCutGuides}
                    onChange={(e) => setOptions({ ...options, drawCutGuides: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-white block flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                      Dashed Cut Guides
                    </span>
                    <span className="text-[11px] text-zinc-400 block">Dotted lines between pages for scissor cutting</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.12] transition-colors">
                  <input
                    type="checkbox"
                    checked={options.drawBorders}
                    onChange={(e) => setOptions({ ...options, drawBorders: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-white block flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-indigo-400" />
                      Page Border Outline
                    </span>
                    <span className="text-[11px] text-zinc-400 block">Thin subtle frame around each mini-page</span>
                  </div>
                </label>
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Desktop Button */}
              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(99,102,241,0.35)] transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{progressMsg || "Arranging layout..."}</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid className="w-4 h-4" />
                    <span>Generate {options.pagesPerSheet}-Up PDF ({resultingSheets} Sheets)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Paper Savings Stats Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="premium-card p-6 rounded-3xl space-y-4 border border-indigo-500/20 bg-indigo-500/[0.03]">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Paper & Printing Efficiency</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Original Pages:</span>
                  <span className="font-semibold text-white font-mono">{totalPages} pages</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Printed Sheets Needed:</span>
                  <span className="font-semibold text-emerald-400 font-mono">{resultingSheets} sheets</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Total Paper Reduction:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">{paperSavedPercent}% Saved</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
                Perfect for lecture slide decks, training handouts, legal booklet signatures, pocket manuals, and reducing paper weight when traveling.
              </p>
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
          title={`${options.pagesPerSheet}-Up Handout Complete`}
          onAdjustSettings={() => {
            setMetrics(null);
          }}
        />
      )}

      {fileItem && !metrics && (
        <div className="fixed bottom-0 inset-x-0 z-40 pb-safe md:hidden bg-zinc-950/90 backdrop-blur-xl border-t border-white/[0.12] p-3 shadow-2xl">
          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating {options.pagesPerSheet}-Up...</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span>Generate {options.pagesPerSheet}-Up ({resultingSheets} Sheets)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
