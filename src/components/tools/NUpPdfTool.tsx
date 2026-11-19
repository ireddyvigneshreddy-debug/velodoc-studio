"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { createNUpPdf, NUpOptions } from "@/lib/nup-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob, createSafeFile } from "@/lib/utils";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import {
  Scissors,
  Sparkle,
  CircleNotch,
  FileText,
  Sliders,
  Check,
  LayoutGrid,
} from "@/components/common/icons";

export function NUpPdfTool() {
  const { createTrackedUrl, revokeAll } = useObjectUrls();
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

  const [marginPreset, setMarginPreset] = useState<"none" | "compact" | "wide">("compact");

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

  // Generate 12-page presentation PDF for 1-click test
  const handleLoadSample = async () => {
    try {
      setErrorMessage(null);
      const doc = await PDFDocument.create();
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontReg = await doc.embedFont(StandardFonts.Helvetica);

      for (let i = 1; i <= 12; i++) {
        // Landscape 16:9 slide
        const page = doc.addPage([841.89, 473.56]);
        const { width: pW, height: pH } = page.getSize();

        // Top bar
        page.drawRectangle({
          x: 0,
          y: pH - 50,
          width: pW,
          height: 50,
          color: rgb(0.08, 0.15, 0.28),
        });

        page.drawText(`INSTITUTE OF AERONAUTICAL ENGINEERING • TECH TALK SLIDE ${i}/12`, {
          x: 40,
          y: pH - 32,
          size: 14,
          font: fontBold,
          color: rgb(1, 1, 1),
        });

        page.drawText(`TOPIC: BAGGING AND BOOSTING FINE-TUNING (SECTION ${i})`, {
          x: 50,
          y: pH - 120,
          size: 24,
          font: fontBold,
          color: rgb(0.1, 0.15, 0.25),
        });

        page.drawText(
          `This slide demonstrates automated 4-Up handout imposition layout with cutting guides and margins for handwritten notes.\nKey insight: Ensemble weighting reduces model variance across heterogeneous test distributions.\nPresenter: K. Vignesh Reddy (26951A6701)`,
          {
            x: 50,
            y: pH - 180,
            size: 13,
            font: fontReg,
            color: rgb(0.3, 0.35, 0.45),
            lineHeight: 22,
          }
        );
      }

      const bytes = await doc.save();
      const sampleFile = createSafeFile(bytes, "sample_12page_techtalk_slides.pdf", "application/pdf");
      await handleFileAdded([sampleFile]);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not generate sample presentation slides.");
    }
  };

  const totalPages = fileItem?.pageCount || 1;
  const resultingSheets = Math.ceil(totalPages / options.pagesPerSheet);
  const paperSavedPercent = Math.max(
    0,
    Math.round(((totalPages - resultingSheets) / totalPages) * 100)
  );

  const handleProcess = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressMsg("Arranging multi-page imposition layout...");
    const startTime = performance.now();

    try {
      // Apply margin preset to options
      let marginVal = 18;
      if (marginPreset === "none") marginVal = 4;
      if (marginPreset === "wide") marginVal = 45; // Space for lecture notes

      const currentOpts: NUpOptions = {
        ...options,
        margin: marginVal,
      };

      const processed = await createNUpPdf(originalBuffer, currentOpts, (_, msg) => {
        setProgressMsg(msg);
      });

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      setOutputBytes(processed);
      const originalSize = fileItem.size;
      const processedSize = processed.byteLength;
      const blob = createPdfBlob(processed);
      const downloadUrl = createTrackedUrl(blob);
      const downloadFilename = fileItem.name.replace(/\.pdf$/i, `-${options.pagesPerSheet}up.pdf`);

      setMetrics({
        originalSize,
        processedSize,
        savedBytes: Math.max(0, originalSize - processedSize),
        savedPercentage: Math.max(0, Math.round(((originalSize - processedSize) / originalSize) * 100)),
        durationMs,
        downloadUrl,
        downloadFilename,
        pageCount: resultingSheets,
      });

      sessionHistory.recordExecution({
        toolId: "nup-pdf",
        toolName: "Multiple Pages per Sheet",
        inputFiles: [fileItem.name],
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs,
        outputData: processed,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate N-Up imposition PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (outputBytes && metrics) {
    return (
      <ResultPreviewStudio
        metrics={metrics}
        outputBytes={outputBytes}
        outputMimeType="application/pdf"
        onAdjustSettings={() => {
          revokeAll();
          setOutputBytes(null);
        }}
        title="N-Up Handout Ready"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Sample Action */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            2-Up / 4-Up Slide Handout & Booklet Imposition
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Combine 2, 4, or 6 slides per sheet with cut lines and margins for student lecture notes (Save up to 75% paper)
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#FFF5F0] text-[#C2410C] border border-[#FBDCD0] hover:bg-[#FFE8DE] flex items-center gap-1.5 transition-colors"
        >
          <Sparkle className="w-3.5 h-3.5" />
          <span>Load Sample 12-Slide Deck</span>
        </button>
      </div>

      {!fileItem && (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{ "application/pdf": [".pdf"] }}
          multiple={false}
          title="Drop Slide Deck or Document to Create Handouts"
          subtitle="Supports up to 300 pages — Instant 2-Up, 4-Up, or 6-Up print imposition"
        />
      )}

      {fileItem && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-8 space-y-5">
            <div className="paper-card p-6 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-6">
              <div className="flex items-center justify-between border-b border-paper-300 dark:border-charcoal-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-paper-200 dark:bg-charcoal-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {fileItem.name}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                      {totalPages} Pages • Results in {resultingSheets} sheets ({paperSavedPercent}% paper saved)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFileItem(null);
                    setOriginalBuffer(null);
                  }}
                  className="text-xs font-mono text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white px-2.5 py-1 rounded border border-paper-300 dark:border-charcoal-border"
                >
                  Change File
                </button>
              </div>

              {/* Pages Per Sheet Selector */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                  Pages Per Sheet
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() =>
                        setOptions({ ...options, pagesPerSheet: count as NUpOptions["pagesPerSheet"] })
                      }
                      className={`py-2.5 px-3 rounded-lg border text-center transition-all ${
                        options.pagesPerSheet === count
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 font-bold"
                          : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
                      }`}
                    >
                      <span className="text-sm font-mono block">{count}-Up</span>
                      <span className="text-[10px] font-mono opacity-70 block">
                        {count === 2 ? "2x1 Grid" : count === 4 ? "2x2 Handout" : count === 6 ? "3x2 Grid" : "4x2 Grid"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation & Reading Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Sheet Orientation
                  </label>
                  <select
                    value={options.orientation}
                    onChange={(e) => setOptions({ ...options, orientation: e.target.value as any })}
                    className="w-full bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border rounded-lg px-3 py-2 text-xs font-mono text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                  >
                    <option value="auto">Auto (Best Ratio)</option>
                    <option value="landscape">Landscape (Horizontal)</option>
                    <option value="portrait">Portrait (Vertical)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Reading Order Flow
                  </label>
                  <select
                    value={options.direction}
                    onChange={(e) => setOptions({ ...options, direction: e.target.value as any })}
                    className="w-full bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border rounded-lg px-3 py-2 text-xs font-mono text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                  >
                    <option value="horizontal">Horizontal (Left to Right, Z-Order)</option>
                    <option value="vertical">Vertical (Top to Bottom, N-Order)</option>
                  </select>
                </div>
              </div>

              {/* Margin Spacing for Notes */}
              <div>
                <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Handout Margin Spacing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "none", label: "None (Max Slide Size)" },
                    { id: "compact", label: "Compact Standard" },
                    { id: "wide", label: "Wide (Space for Notes)" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMarginPreset(m.id as any)}
                      className={`px-3 py-2 rounded-lg text-xs font-mono border transition-colors ${
                        marginPreset === m.id
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 font-medium"
                          : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles: Cut Guides & Borders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-paper-300 dark:border-charcoal-border">
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.drawCutGuides}
                    onChange={(e) => setOptions({ ...options, drawCutGuides: e.target.checked })}
                    className="rounded border-zinc-300 text-[#C2410C] focus:ring-[#C2410C]"
                  />
                  <span>Dashed Cut Guides Between Slides</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.drawBorders}
                    onChange={(e) => setOptions({ ...options, drawBorders: e.target.checked })}
                    className="rounded border-zinc-300 text-[#C2410C] focus:ring-[#C2410C]"
                  />
                  <span>Thin Vector Border Around Each Slide</span>
                </label>
              </div>
            </div>
          </div>

          {/* Summary Telemetry Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="paper-card p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-900 dark:text-zinc-100">
                Imposition Metrics
              </h4>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-paper-300 dark:border-charcoal-border">
                  <span className="text-zinc-600 dark:text-zinc-400">Original Pages:</span>
                  <span className="text-zinc-950 dark:text-white font-semibold">{totalPages}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-paper-300 dark:border-charcoal-border">
                  <span className="text-zinc-600 dark:text-zinc-400">Pages Per Sheet:</span>
                  <span className="text-zinc-950 dark:text-white font-semibold">{options.pagesPerSheet}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-paper-300 dark:border-charcoal-border">
                  <span className="text-zinc-600 dark:text-zinc-400">Resulting Sheets:</span>
                  <span className="text-zinc-950 dark:text-white font-semibold">{resultingSheets}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-600 dark:text-zinc-400">Paper Reduction:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{paperSavedPercent}% Saved</span>
                </div>
              </div>

              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full py-3 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] text-white font-mono text-xs font-medium shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <CircleNotch className="w-4 h-4 animate-spin" />
                    <span>{progressMsg || "Arranging Pages..."}</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Generate {options.pagesPerSheet}-Up Handouts</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 text-xs font-mono">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
