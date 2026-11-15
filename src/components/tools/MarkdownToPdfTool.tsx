"use client";

import React, { useState } from "react";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { ProcessingMetrics } from "@/types";
import { generatePdfFromMarkdown, getPdfPageCount } from "@/lib/pdf-engine";
import { createPdfBlob } from "@/lib/utils";
import {
  FileText,
  Loader2,
  AlertCircle,
  Upload,
} from "@/components/common/icons";

const DEFAULT_MARKDOWN = `# Project Genesis: Technical Architecture Specification

## 1. Executive Summary
This document outlines the zero-trust client-side architectural paradigm. By removing remote server serialization layers, enterprise document processing guarantees 100% cryptographic data sovereignty.

## 2. Core Technical Tenets
- Zero Cloud Transmissions: Operations execute in local volatile memory.
- Hardware-Accelerated ArrayBuffers: Direct memory manipulation prevents thread starvation.
- Real-Time Convergence: Precision binary search guarantees exact output payloads.

## 3. Engineering Implementation Details
All operations utilize sandboxed WebAssembly kernels. Standard HTML5 canvas pipelines transcode multi-resolution assets with hardware acceleration.

- Phase 1: Ingestion & Metadata Sanitization
- Phase 2: Vector Path Geometry Computation
- Phase 3: Final Stream Packaging & Direct Download

---
*Authorized by VeloDoc Pro Architecture Team*
`;

export function MarkdownToPdfTool() {
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  const [title, setTitle] = useState("Technical Architecture Specification");
  const [fontFamily, setFontFamily] = useState<"Helvetica" | "TimesRoman" | "Courier">("Helvetica");
  const [fontSize, setFontSize] = useState<number>(11);

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setMarkdown(text);
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!markdown.trim()) {
      setErrorMessage("Please enter or upload markdown content.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const pdfBytes = await generatePdfFromMarkdown(markdown, {
        fontFamily,
        fontSize,
        title,
      });
      const endTime = performance.now();

      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;
      const count = await getPdfPageCount(pdfBytes);

      setOutputBytes(pdfBytes);
      setMetrics({
        originalSize: new Blob([markdown]).size,
        processedSize: pdfBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${title.toLowerCase().replace(/\s+/g, "_")}.pdf`,
        pageCount: count,
        targetAccuracy: `${count} Pages Rendered from Markdown`,
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to generate PDF from Markdown.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          title="PDF Generated from Markdown!"
          onAdjustSettings={() => setMetrics(null)}
        />
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-5 rounded-3xl bg-[#12141D] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Document Title
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 w-60 font-medium"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Typography
                </span>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as "Helvetica" | "TimesRoman" | "Courier")}
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Helvetica">Modern Sans (Helvetica)</option>
                  <option value="TimesRoman">Editorial Serif (Times)</option>
                  <option value="Courier">Code Monospace (Courier)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Size ({fontSize}pt)
                </span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value={9}>9pt</option>
                  <option value={10}>10pt</option>
                  <option value={11}>11pt (Standard)</option>
                  <option value={12}>12pt</option>
                  <option value={14}>14pt (Large)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <label className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium cursor-pointer border border-white/10 transition-colors flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .md / .txt</span>
                <input
                  type="file"
                  accept=".md,.txt,text/markdown,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleGenerate}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-paper transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Render PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Split-Screen Markdown Editor & Live Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Raw Markdown Editor */}
            <div className="rounded-3xl bg-[#12141D] border border-white/10 p-4 space-y-2 flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/5 pb-2">
                <span className="font-semibold uppercase tracking-wider text-indigo-400">
                  Markdown Source Editor
                </span>
                <span>Supports # Headers, - Lists, Tables &amp; Quotes</span>
              </div>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Type Markdown or plain text here..."
                rows={18}
                className="w-full h-full min-h-[360px] bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500/50 leading-relaxed resize-y selection:bg-indigo-500/30"
              />
            </div>

            {/* Right: Live Simulated Layout Preview */}
            <div className="rounded-3xl bg-[#12141D] border border-white/10 p-4 space-y-2 flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/5 pb-2">
                <span className="font-semibold uppercase tracking-wider text-cyan-400">
                  Visual Layout Preview
                </span>
                <span>Page Layout Simulator</span>
              </div>
              <div className="w-full h-full min-h-[360px] bg-white rounded-2xl p-6 text-slate-900 shadow-inner overflow-auto font-sans text-xs space-y-3">
                <h1 className="text-xl font-bold border-b pb-2 text-slate-900">
                  {title}
                </h1>
                <div className="space-y-2 whitespace-pre-wrap leading-relaxed text-[11px] text-slate-700">
                  {markdown}
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {!metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono truncate max-w-[120px]">
                {fontFamily} • {fontSize}pt
              </div>
              <button
                type="button"
                disabled={isProcessing || !markdown.trim()}
                onClick={handleGenerate}
                className="flex-1 py-3 px-4 rounded-xl bg-vermilion active:bg-vermilion-hover text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Compile PDF</span>
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
