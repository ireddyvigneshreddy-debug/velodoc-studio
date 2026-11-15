"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, PageNumberSettings, ProcessingMetrics } from "@/types";
import {
  addPageNumbersAndBates,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import { Hash, Loader2, AlertCircle } from "@/components/common/icons";

export function PageNumbersTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [settings, setSettings] = useState<PageNumberSettings>({
    enabled: true,
    format: "page_x_of_y",
    batesPrefix: "DOC-",
    batesDigits: 5,
    position: "bottom-center",
    fontSize: 10,
    color: "#475569",
    margin: 25,
    startPageOffset: 0,
    startNumber: 1,
  });

  const [isProcessing, setIsProcessing] = useState(false);
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
    } catch (err: unknown) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    }
  };

  const handleApply = async () => {
    if (!fileItem || !originalBuffer) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const resultBytes = await addPageNumbersAndBates(originalBuffer, settings);
      const endTime = performance.now();

      const blob = createPdfBlob(resultBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const durationMs = endTime - startTime;

      const baseName =
        fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) ||
        fileItem.name;

      setOutputBytes(resultBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: resultBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename: `${baseName}_numbered.pdf`,
        pageCount: fileItem.pageCount || 1,
        targetAccuracy:
          settings.format === "bates"
            ? `Bates Stamped (${settings.batesPrefix}...)`
            : "Page Numbering Applied",
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to stamp page numbers onto PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          title="Page Numbers &amp; Bates Stamped!"
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
              title="Upload PDF to add page numbers or Bates stamping"
              subtitle="Custom format templates, legal Bates numbers, and alternating book margins"
            />
          ) : (
            <div className="space-y-6">
              {/* Settings Configuration Box */}
              <div className="p-6 rounded-3xl bg-[#12141D] border border-white/10 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {fileItem.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fileItem.pageCount} pages total • Configure numbering style below
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFileItem(null);
                      setOriginalBuffer(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Change PDF
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Format Template */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Numbering Format
                    </label>
                    <select
                      value={settings.format}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          format: e.target.value as PageNumberSettings["format"],
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="page_x_of_y">Page X of Y</option>
                      <option value="page_x">Page X</option>
                      <option value="x_slash_y">X / Y</option>
                      <option value="dash_x_dash">- X -</option>
                      <option value="x">X (Simple number)</option>
                      <option value="bates">Legal Bates Stamping (e.g. DOC-00001)</option>
                    </select>
                  </div>

                  {/* Position Alignment & Visual 9-Box Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block font-mono">
                        Position Alignment
                      </label>
                      <span className="text-[11px] text-cyan-400 font-mono capitalize">
                        {settings.position.replace("-", " ")}
                      </span>
                    </div>

                    {/* Visual 9-Box Page Simulator Grid */}
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                      <div className="grid grid-cols-3 gap-1.5 aspect-[1.4/1] max-w-[220px] mx-auto p-2 bg-[#05060B] rounded-xl border border-white/10">
                        {/* Top row */}
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, position: "top-left" })}
                          className={`rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                            settings.position === "top-left"
                              ? "bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400"
                              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          TL
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, position: "top-center" })}
                          className={`rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                            settings.position === "top-center"
                              ? "bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400"
                              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          Top
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, position: "top-right" })}
                          className={`rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                            settings.position === "top-right"
                              ? "bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400"
                              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          TR
                        </button>

                        {/* Middle row (Page Body Placeholder) */}
                        <div className="rounded-lg bg-white/[0.02] border border-dashed border-white/5 flex items-center justify-center text-[9px] text-zinc-600 font-mono col-span-3">
                          Document Page Area
                        </div>

                        {/* Bottom row */}
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, position: "bottom-left" })}
                          className={`rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                            settings.position === "bottom-left"
                              ? "bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400"
                              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          BL
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, position: "bottom-center" })}
                          className={`rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                            settings.position === "bottom-center"
                              ? "bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400"
                              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          Bottom
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, position: "bottom-right" })}
                          className={`rounded-lg text-[10px] font-mono transition-all flex items-center justify-center cursor-pointer ${
                            settings.position === "bottom-right"
                              ? "bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-400"
                              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          BR
                        </button>
                      </div>

                      {/* Alternating Margins Pill */}
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, position: "alternating-margins" })}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          settings.position === "alternating-margins"
                            ? "bg-blue-600 text-white font-semibold shadow-md ring-2 ring-blue-400"
                            : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
                        }`}
                      >
                        <span>📖 Alternating Book Margins (Odd Right, Even Left)</span>
                      </button>
                    </div>
                  </div>

                  {/* Bates specific inputs */}
                  {settings.format === "bates" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          Bates Prefix
                        </label>
                        <input
                          type="text"
                          value={settings.batesPrefix}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              batesPrefix: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                          placeholder="DOC-"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          Number of Zero-Padded Digits
                        </label>
                        <input
                          type="number"
                          min={3}
                          max={8}
                          value={settings.batesDigits}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              batesDigits: parseInt(e.target.value) || 5,
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Skip Cover & Start number */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Skip Cover Page (Offset)
                    </label>
                    <select
                      value={settings.startPageOffset}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          startPageOffset: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value={0}>Start on Page 1 (No skip)</option>
                      <option value={1}>Skip Page 1 (Start on Page 2)</option>
                      <option value={2}>Skip Pages 1 &amp; 2</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Starting Number
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={settings.startNumber}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          startNumber: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Submit Row */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-end">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleApply}
                    className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center gap-2 shadow-paper transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Stamping...</span>
                      </>
                    ) : (
                      <>
                        <Hash className="w-4 h-4" />
                        <span>Stamp Page Numbers &amp; Preview</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {fileItem && !metrics && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-[#05060B]/90 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-between gap-3 shadow-2xl">
              <div className="text-xs text-zinc-300 font-mono">
                <span className="font-semibold text-cyan-400 capitalize">{settings.position.replace("-", " ")}</span>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApply}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 active:from-blue-700 active:to-cyan-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Stamping...</span>
                  </>
                ) : (
                  <>
                    <Hash className="w-3.5 h-3.5" />
                    <span>Stamp Numbers</span>
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
