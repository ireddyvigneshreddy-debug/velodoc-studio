"use client";

import React, { useState, useEffect, useRef } from "react";
import { DropZone } from "@/components/common/DropZone";
import { UploadedFileItem } from "@/types";
import {
  comparePdfPages,
  getPdfPageCount,
} from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import {
  GitCompare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export function ComparePdfTool() {
  const [docA, setDocA] = useState<UploadedFileItem | null>(null);
  const [docB, setDocB] = useState<UploadedFileItem | null>(null);
  const [bufferA, setBufferA] = useState<ArrayBuffer | null>(null);
  const [bufferB, setBufferB] = useState<ArrayBuffer | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Diff rendering
  const [diffStats, setDiffStats] = useState<{
    diffPercentage: number;
    diffPixels: number;
  } | null>(null);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement>(null);

  const [viewMode, setViewMode] = useState<"side-by-side" | "neon-diff">(
    "side-by-side"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = new Blob([chained.data.buffer as ArrayBuffer], { type: "application/pdf" });
      const file = new File([blob], chained.filename, { type: "application/pdf" });
      handleFileAAdded([file]);
    }
  }, []);

  const handleFileAAdded = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    const count = await getPdfPageCount(buf);
    setBufferA(buf);
    setDocA({
      id: "doc-a",
      file: f,
      name: f.name,
      size: f.size,
      pageCount: count,
      status: "ready",
    });
    setTotalPages(count);
  };

  const handleFileBAdded = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    const buf = await f.arrayBuffer();
    const count = await getPdfPageCount(buf);
    setBufferB(buf);
    setDocB({
      id: "doc-b",
      file: f,
      name: f.name,
      size: f.size,
      pageCount: count,
      status: "ready",
    });
    setTotalPages((prev) => Math.max(prev, count));
  };

  // Perform visual diff on current page
  useEffect(() => {
    let active = true;
    async function runDiff() {
      if (!bufferA || !bufferB) return;
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const res = await comparePdfPages(bufferA, bufferB, currentPage);
        if (!active) return;

        // Render Canvas A
        if (canvasARef.current) {
          canvasARef.current.width = res.canvasA.width;
          canvasARef.current.height = res.canvasA.height;
          canvasARef.current.getContext("2d")?.drawImage(res.canvasA, 0, 0);
        }

        // Render Canvas B
        if (canvasBRef.current) {
          canvasBRef.current.width = res.canvasB.width;
          canvasBRef.current.height = res.canvasB.height;
          canvasBRef.current.getContext("2d")?.drawImage(res.canvasB, 0, 0);
        }

        // Render Diff Canvas
        if (canvasDiffRef.current) {
          canvasDiffRef.current.width = res.diffCanvas.width;
          canvasDiffRef.current.height = res.diffCanvas.height;
          canvasDiffRef.current.getContext("2d")?.drawImage(res.diffCanvas, 0, 0);
        }

        setDiffStats({
          diffPercentage: res.differencePercentage,
          diffPixels: res.differentPixelsCount,
        });
      } catch (err: unknown) {
        console.error("Comparison error:", err);
      } finally {
        if (active) setIsProcessing(false);
      }
    }

    runDiff();
    return () => {
      active = false;
    };
  }, [bufferA, bufferB, currentPage]);

  const bothLoaded = docA && docB && bufferA && bufferB;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {!bothLoaded ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Original PDF */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                1. Original Document
              </span>
              <DropZone
                files={docA ? [docA] : []}
                onFilesAdded={handleFileAAdded}
                onRemoveFile={() => {
                  setDocA(null);
                  setBufferA(null);
                }}
                acceptedFileTypes={{ "application/pdf": [".pdf"] }}
                multiple={false}
                title="Drop Original PDF (Left)"
                subtitle="Baseline reference document"
              />
            </div>

            {/* Upload Revised PDF */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
                2. Revised Document
              </span>
              <DropZone
                files={docB ? [docB] : []}
                onFilesAdded={handleFileBAdded}
                onRemoveFile={() => {
                  setDocB(null);
                  setBufferB(null);
                }}
                acceptedFileTypes={{ "application/pdf": [".pdf"] }}
                multiple={false}
                title="Drop Revised PDF (Right)"
                subtitle="Document to compare against baseline"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Comparison Control Toolbar */}
          <div className="p-5 rounded-3xl bg-[#12141D] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white text-base">
                  Comparing: <span className="text-slate-300">{docA.name}</span>{" "}
                  vs. <span className="text-indigo-400">{docB.name}</span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {diffStats ? (
                  <>
                    Page {currentPage}:{" "}
                    <span
                      className={`font-mono font-semibold ${
                        diffStats.diffPercentage > 0
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {diffStats.diffPercentage > 0
                        ? `${diffStats.diffPercentage}% Visual Variance`
                        : "Identical Pages"}
                    </span>
                  </>
                ) : (
                  "Calculating pixel diff..."
                )}
              </p>
            </div>

            {/* Controls (Page Nav & View Mode) */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                <button
                  onClick={() => setViewMode("side-by-side")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    viewMode === "side-by-side"
                      ? "bg-purple-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setViewMode("neon-diff")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    viewMode === "neon-diff"
                      ? "bg-purple-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-pink-300" />
                  <span>Neon Diff Overlay</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDocA(null);
                  setDocB(null);
                  setBufferA(null);
                  setBufferB(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Change Files
              </button>
            </div>
          </div>

          {/* Comparison Display Area */}
          <div className="p-6 rounded-3xl bg-[#07080C] border border-white/10 min-h-[450px] flex items-center justify-center overflow-auto shadow-2xl">
            {isProcessing ? (
              <div className="text-center space-y-2 py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Rendering visual diff...</p>
              </div>
            ) : viewMode === "side-by-side" ? (
              /* Synchronized Side-by-Side View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] uppercase font-bold text-slate-400 mb-2">
                    Original: {docA.name}
                  </span>
                  <div className="p-2 rounded-2xl bg-black/40 border border-white/10 shadow-2xl max-w-full">
                    <canvas ref={canvasARef} className="max-w-full h-auto rounded-xl" />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[11px] uppercase font-bold text-indigo-400 mb-2">
                    Revised: {docB.name}
                  </span>
                  <div className="p-2 rounded-2xl bg-black/40 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] max-w-full">
                    <canvas ref={canvasBRef} className="max-w-full h-auto rounded-xl" />
                  </div>
                </div>
              </div>
            ) : (
              /* Neon Pixel Diff Mode */
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  <span className="text-pink-400 font-bold uppercase tracking-wider">
                    Neon Highlights Indicate Modified Pixels
                  </span>
                </div>
                <div className="p-2 rounded-2xl bg-black/60 border border-pink-500/40 shadow-[0_0_35px_rgba(236,72,153,0.25)] max-w-full">
                  <canvas ref={canvasDiffRef} className="max-w-full h-auto rounded-xl" />
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
