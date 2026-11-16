"use client";

import React, { useState } from "react";
import { FileArrangerGrid } from "@/components/common/FileArrangerGrid";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import {
  TocEntry,
  TocOptions,
  insertClickableToc,
  combinePdfsWithClickableToc,
  generateSampleChapterFiles,
} from "@/lib/toc-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import { ProcessingMetrics, UploadedFileItem } from "@/types";
import { PDFDocument } from "pdf-lib";
import {
  UploadSimple,
  Sparkle,
  BookmarkSimple,
  Plus,
  Trash,
  CircleNotch,
} from "@/components/common/icons";

interface ChapterItem {
  id: string;
  name: string;
  file?: File;
  buffer?: ArrayBuffer;
  pageCount: number;
}

export function TocPdfTool() {
  const [mode, setMode] = useState<"batch-files" | "single-multipage">("batch-files");

  // Mode A: Multi-File Chapter Bundle (up to 30 files)
  const [chapters, setChapters] = useState<ChapterItem[]>([]);

  // Mode B: Single PDF with custom chapters
  const [singleFile, setSingleFile] = useState<UploadedFileItem | null>(null);
  const [singleBuffer, setSingleBuffer] = useState<ArrayBuffer | null>(null);
  const [manualEntries, setManualEntries] = useState<TocEntry[]>([
    { title: "Introduction & Scope", targetPageIndex: 0, pageDisplayNumber: 2 },
    { title: "Methodology & Architecture", targetPageIndex: 1, pageDisplayNumber: 3 },
  ]);

  const [tocOptions, setTocOptions] = useState<TocOptions>({
    title: "TABLE OF CONTENTS",
    subtitle: "Laboratory Experiments & Technical Submissions",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load sample 3-chapter bundle
  const handleLoadSample = async () => {
    try {
      setErrorMessage(null);
      setMode("batch-files");
      const sampleFiles = await generateSampleChapterFiles();
      const loadedChapters: ChapterItem[] = [];

      for (const f of sampleFiles) {
        const buf = await f.arrayBuffer();
        const pages = await getPdfPageCount(buf);
        loadedChapters.push({
          id: Math.random().toString(36).substring(7),
          name: f.name,
          file: f,
          buffer: buf,
          pageCount: pages,
        });
      }

      setChapters(loadedChapters);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not load sample chapter bundle.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    setErrorMessage(null);
    const fileArray = Array.from(uploaded);
    // Guarantee indexed loading order with Promise.all to avoid upload race scrambling
    const newItems: ChapterItem[] = await Promise.all(
      fileArray.map(async (f, idx) => {
        const buf = await f.arrayBuffer();
        const pages = await getPdfPageCount(buf);
        return {
          id: Math.random().toString(36).substring(7) + `_${idx}_${Date.now()}`,
          name: f.name,
          file: f,
          buffer: buf,
          pageCount: pages,
        };
      })
    );

    setChapters((prev) => [...prev, ...newItems]);
  };

  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const buf = await f.arrayBuffer();
    const count = await getPdfPageCount(buf);
    setSingleFile({
      id: "single",
      file: f,
      name: f.name,
      size: f.size,
      pageCount: count,
      status: "ready",
    });
    setSingleBuffer(buf);

    // Auto seed entries based on page count
    const seeded: TocEntry[] = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      seeded.push({
        title: `Chapter ${i + 1}`,
        targetPageIndex: i,
        pageDisplayNumber: i + 2,
      });
    }
    setManualEntries(seeded);
  };

  const handleGenerate = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      let pdfBytes: Uint8Array;
      let totalInputSize = 0;
      let totalPages = 0;

      if (mode === "batch-files") {
        if (chapters.length === 0) {
          throw new Error("Please upload at least one chapter PDF.");
        }

        const validFiles = chapters
          .filter((c) => c.buffer)
          .map((c) => ({ name: c.name, buffer: c.buffer! }));

        totalInputSize = chapters.reduce((acc, c) => acc + (c.file?.size || 0), 0);
        totalPages = chapters.reduce((acc, c) => acc + c.pageCount, 1);

        pdfBytes = await combinePdfsWithClickableToc(validFiles, tocOptions);
      } else {
        if (!singleBuffer) {
          throw new Error("Please upload a PDF document.");
        }

        totalInputSize = singleFile?.size || 0;
        totalPages = (singleFile?.pageCount || 1) + 1;

        const doc = await PDFDocument.load(singleBuffer, { ignoreEncryption: true });
        pdfBytes = await insertClickableToc(doc, manualEntries, tocOptions);
      }

      const endTime = performance.now();
      setOutputBytes(pdfBytes);
      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = "document_with_clickable_index.pdf";

      setMetrics({
        originalSize: totalInputSize,
        processedSize: pdfBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs: Math.round(endTime - startTime),
        downloadUrl,
        downloadFilename,
        pageCount: totalPages,
      });

      sessionHistory.recordExecution({
        toolId: "toc-pdf",
        toolName: "Add Clickable Index",
        inputFiles: chapters.map((c) => c.name),
        outputFileName: downloadFilename,
        outputSizeBytes: pdfBytes.byteLength,
        durationMs: Math.round(endTime - startTime),
        outputData: pdfBytes,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate Table of Contents.");
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
        onAdjustSettings={() => setOutputBytes(null)}
        title="Clickable Index PDF Ready"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Sample Action */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            Clickable Index & Table of Contents Builder
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Prepend a styled Table of Contents page with true internal GoTo PDF links that jump directly to chapters
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#FFF5F0] text-[#C2410C] border border-[#FBDCD0] hover:bg-[#FFE8DE] flex items-center gap-1.5 transition-colors"
        >
          <Sparkle className="w-3.5 h-3.5" />
          <span>Load Sample 3-Chapter Bundle</span>
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("batch-files")}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono border transition-colors ${
            mode === "batch-files"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 font-medium"
              : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
          }`}
        >
          Multi-File Chapters (Auto-Link 1 to 30 PDFs)
        </button>
        <button
          onClick={() => setMode("single-multipage")}
          className={`px-3.5 py-2 rounded-lg text-xs font-mono border transition-colors ${
            mode === "single-multipage"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 font-medium"
              : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
          }`}
        >
          Single Multi-Page PDF (Custom Chapters)
        </button>
      </div>

      {/* TOC Header Settings */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1">
            Table of Contents Title
          </label>
          <input
            type="text"
            value={tocOptions.title}
            onChange={(e) => setTocOptions({ ...tocOptions, title: e.target.value })}
            placeholder="e.g., TABLE OF CONTENTS"
            className="w-full px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white outline-none focus:border-[#C2410C] font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1">
            Subtitle / Document Meta
          </label>
          <input
            type="text"
            value={tocOptions.subtitle}
            onChange={(e) => setTocOptions({ ...tocOptions, subtitle: e.target.value })}
            placeholder="e.g., Laboratory Experiments & Project Submissions"
            className="w-full px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white outline-none focus:border-[#C2410C] font-mono"
          />
        </div>
      </div>

      {/* Mode A: Multi-File Chapter List */}
      {mode === "batch-files" && (
        <div className="paper-card p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-900 dark:text-zinc-100">
              Chapter PDF Queue ({chapters.length} Files)
            </h3>
            <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors">
              <UploadSimple className="w-3.5 h-3.5" />
              <span>Add Chapter PDFs</span>
              <input type="file" multiple accept="application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {chapters.length > 0 ? (
            <FileArrangerGrid
              items={chapters.map((ch) => ({
                id: ch.id,
                file: ch.file,
                name: ch.name,
                pageCount: ch.pageCount,
                extraLabel: `${ch.pageCount} Pages`,
                status: "ready" as const,
              }))}
              onReorder={(newItems) => {
                const map = new Map(chapters.map((c) => [c.id, c]));
                setChapters(newItems.map((item) => map.get(item.id)!).filter(Boolean));
              }}
              onRemove={(id) => setChapters((prev) => prev.filter((c) => c.id !== id))}
              onDuplicate={(id) => {
                const idx = chapters.findIndex((c) => c.id === id);
                if (idx !== -1) {
                  const target = chapters[idx];
                  const dup: ChapterItem = {
                    ...target,
                    id: Math.random().toString(36).substring(7) + `_copy_${Date.now()}`,
                    name: `${target.name.replace(/\.pdf$/i, "")}_copy.pdf`,
                  };
                  setChapters((prev) => {
                    const next = [...prev];
                    next.splice(idx + 1, 0, dup);
                    return next;
                  });
                }
              }}
              onAddMore={(newFiles) => {
                (async () => {
                  const newItems: ChapterItem[] = await Promise.all(
                    newFiles.map(async (f, idx) => {
                      const buf = await f.arrayBuffer();
                      const pages = await getPdfPageCount(buf);
                      return {
                        id: Math.random().toString(36).substring(7) + `_${idx}_${Date.now()}`,
                        name: f.name,
                        file: f,
                        buffer: buf,
                        pageCount: pages,
                      };
                    })
                  );
                  setChapters((prev) => [...prev, ...newItems]);
                })();
              }}
              acceptedFileTypes={{ "application/pdf": [".pdf"] }}
              title="Arrange Chapter PDF Order"
              subtitle="Drag cards or use nudge arrows to order chapters. Smart sort naturally orders 1, 2, 10 without scrambling."
              itemTypeLabel="Chapter"
              showRotate={false}
              showDuplicate={true}
            />
          ) : (
            <div className="p-8 border-2 border-dashed border-paper-300 dark:border-charcoal-border rounded-lg text-center space-y-2">
              <BookmarkSimple className="w-7 h-7 text-zinc-400 mx-auto" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                Upload up to 30 chapter PDFs or click &ldquo;Load Sample 3-Chapter Bundle&rdquo; to test.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mode B: Single PDF Manual Chapter Entries */}
      {mode === "single-multipage" && (
        <div className="paper-card p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
          {!singleFile ? (
            <div className="p-8 border-2 border-dashed border-paper-300 dark:border-charcoal-border rounded-lg text-center space-y-3">
              <label className="cursor-pointer px-4 py-2 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-mono inline-flex items-center gap-1.5">
                <UploadSimple className="w-3.5 h-3.5" />
                <span>Upload Target PDF</span>
                <input type="file" accept="application/pdf" onChange={handleSingleFileUpload} className="hidden" />
              </label>
              <p className="text-xs text-zinc-500 font-mono">Upload a document with existing chapters</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-paper-300 dark:border-charcoal-border">
                <span className="text-xs font-mono font-semibold text-zinc-950 dark:text-white">
                  {singleFile.name} ({singleFile.pageCount} Pages)
                </span>
                <button
                  onClick={() => {
                    setSingleFile(null);
                    setSingleBuffer(null);
                  }}
                  className="text-xs font-mono text-zinc-500 hover:text-zinc-900"
                >
                  Change File
                </button>
              </div>

              {/* Chapter Entries List */}
              <div className="space-y-2">
                {manualEntries.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400 w-6">{idx + 1}.</span>
                    <input
                      type="text"
                      value={entry.title}
                      onChange={(e) => {
                        const copy = [...manualEntries];
                        copy[idx].title = e.target.value;
                        setManualEntries(copy);
                      }}
                      placeholder="Chapter Title"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white font-mono"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono text-zinc-500">Target Page:</span>
                      <input
                        type="number"
                        min={1}
                        max={singleFile.pageCount || 100}
                        value={entry.pageDisplayNumber}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const copy = [...manualEntries];
                          copy[idx].pageDisplayNumber = val;
                          copy[idx].targetPageIndex = Math.max(0, val - 1);
                          setManualEntries(copy);
                        }}
                        className="w-16 px-2 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white font-mono text-center"
                      />
                    </div>
                    <button
                      onClick={() => setManualEntries((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-zinc-400 hover:text-rose-600"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  setManualEntries((prev) => [
                    ...prev,
                    {
                      title: `Chapter ${prev.length + 1}`,
                      targetPageIndex: prev.length,
                      pageDisplayNumber: prev.length + 2,
                    },
                  ])
                }
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border border-paper-300 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Chapter Row
              </button>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Primary Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] text-white font-mono text-xs font-medium shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <CircleNotch className="w-4 h-4 animate-spin" />
              <span>Building Clickable Index...</span>
            </>
          ) : (
            <>
              <BookmarkSimple className="w-4 h-4" />
              <span>Compile Master PDF with Clickable TOC</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
