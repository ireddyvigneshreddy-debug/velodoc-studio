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
  Eye,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface ComparisonSummaryItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  diffPercentage: number;
  changedPagesCount: number;
  byteDiff: number;
}

export function ComparePdfTool() {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [buffers, setBuffers] = useState<Map<string, ArrayBuffer>>(new Map());
  const [baseDocId, setBaseDocId] = useState<string>("");
  const [selectedCompDocId, setSelectedCompDocId] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Batch comparison summaries
  const [comparisons, setComparisons] = useState<ComparisonSummaryItem[]>([]);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);

  // Live page diff rendering
  const [diffStats, setDiffStats] = useState<{
    diffPercentage: number;
    diffPixels: number;
  } | null>(null);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement>(null);

  const [viewMode, setViewMode] = useState<"side-by-side" | "neon-diff">("side-by-side");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = React.useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setErrorMessage(null);

    const newItems: UploadedFileItem[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
    }));

    setFiles((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const buffer = await item.file.arrayBuffer();
        setBuffers((prev) => new Map(prev).set(item.id, buffer));
        const count = await getPdfPageCount(buffer);
        setFiles((current) =>
          current.map((f) =>
            f.id === item.id ? { ...f, pageCount: count, status: "ready" } : f
          )
        );
      } catch (err: unknown) {
        console.error(err);
        setFiles((current) =>
          current.map((f) =>
            f.id === item.id
              ? { ...f, status: "error", error: "Encrypted or corrupted PDF." }
              : f
          )
        );
      }
    }
  }, []);

  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = new Blob([chained.data as unknown as BlobPart], { type: "application/pdf" });
      const file = new File([blob], chained.filename, { type: "application/pdf" });
      handleFilesAdded([file]);
    }
  }, [handleFilesAdded]);

  // Set default base and comparison doc
  useEffect(() => {
    if (files.length >= 1 && (!baseDocId || !files.some((f) => f.id === baseDocId))) {
      setBaseDocId(files[0].id);
    }
    if (files.length >= 2 && (!selectedCompDocId || !files.some((f) => f.id === selectedCompDocId))) {
      const second = files.find((f) => f.id !== files[0].id);
      if (second) setSelectedCompDocId(second.id);
    }
  }, [files, baseDocId, selectedCompDocId]);

  const baseDoc = files.find((f) => f.id === baseDocId);
  const compDoc = files.find((f) => f.id === selectedCompDocId);
  const baseBuffer = baseDoc ? buffers.get(baseDoc.id) : null;
  const compBuffer = compDoc ? buffers.get(compDoc.id) : null;

  // Run batch summary analysis when baseDoc and other documents change
  useEffect(() => {
    let active = true;
    async function runBatchAnalysis() {
      if (!baseDoc || !baseBuffer || files.length < 2) return;
      setIsBatchAnalyzing(true);

      const items: ComparisonSummaryItem[] = [];
      const comparisonDocs = files.filter((f) => f.id !== baseDoc.id);

      for (const cd of comparisonDocs) {
        const cBuf = buffers.get(cd.id);
        if (!cBuf) continue;

        try {
          // Compare first page as rapid baseline variance metric
          const res = await comparePdfPages(baseBuffer, cBuf, 1);
          if (!active) return;

          const pgsDiff = Math.abs((baseDoc.pageCount || 1) - (cd.pageCount || 1));
          const byteDiff = cd.size - baseDoc.size;

          items.push({
            id: cd.id,
            name: cd.name,
            size: cd.size,
            pageCount: cd.pageCount || 1,
            diffPercentage: res.differencePercentage,
            changedPagesCount: pgsDiff > 0 ? pgsDiff : res.differencePercentage > 0 ? 1 : 0,
            byteDiff,
          });
        } catch (e) {
          console.error("Batch compare error:", e);
        }
      }

      if (active) {
        setComparisons(items);
        setIsBatchAnalyzing(false);
      }
    }

    runBatchAnalysis();
    return () => {
      active = false;
    };
  }, [baseDocId, files, buffers, baseDoc, baseBuffer]);

  // Update totalPages when pair changes
  useEffect(() => {
    if (baseDoc && compDoc) {
      setTotalPages(Math.max(baseDoc.pageCount || 1, compDoc.pageCount || 1));
      setCurrentPage(1);
    }
  }, [baseDoc, compDoc]);

  // Perform visual diff on current page for active pair
  useEffect(() => {
    let active = true;
    async function runDiff() {
      if (!baseBuffer || !compBuffer) return;
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const res = await comparePdfPages(baseBuffer, compBuffer, currentPage);
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
        setErrorMessage("Could not diff selected page.");
      } finally {
        if (active) setIsProcessing(false);
      }
    }

    runDiff();
    return () => {
      active = false;
    };
  }, [baseBuffer, compBuffer, currentPage]);

  const hasPair = baseDoc && compDoc && baseBuffer && compBuffer;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <DropZone
        files={files}
        onFilesAdded={handleFilesAdded}
        onRemoveFile={(id) => {
          setFiles((prev) => prev.filter((f) => f.id !== id));
          setBuffers((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
        }}
        onClearAll={() => {
          setFiles([]);
          setBuffers(new Map());
          setComparisons([]);
        }}
        acceptedFileTypes={{ "application/pdf": [".pdf"] }}
        multiple={true}
        maxFiles={30}
        title="Upload 2 to 30 PDFs for Multi-Document Visual Diff"
        subtitle="Compare a baseline document against up to 29 revisions with pixel-level highlights and variance table"
      />

      {files.length >= 2 && baseDoc && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Base Document Selector Banner */}
          <div className="p-4 rounded-2xl bg-[#12141D] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Base Reference Document:{" "}
                  <span className="text-purple-300 font-mono">{baseDoc.name}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {baseDoc.pageCount || 1} pages • {formatFileSize(baseDoc.size)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Switch Base:</span>
              <select
                value={baseDocId}
                onChange={(e) => setBaseDocId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              >
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch Comparison Summary Table */}
          {comparisons.length > 0 && (
            <div className="p-5 rounded-3xl bg-[#10121A] border border-white/10 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Batch Comparison Summary ({comparisons.length} Revisions vs. Base)
                </h4>
                {isBatchAnalyzing && (
                  <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing diffs...
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-medium text-[11px]">
                      <th className="py-2 px-3">Revision Document</th>
                      <th className="py-2 px-3">Page Count</th>
                      <th className="py-2 px-3">Size Diff</th>
                      <th className="py-2 px-3">Visual Variance</th>
                      <th className="py-2 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {comparisons.map((c) => {
                      const isSelected = c.id === selectedCompDocId;
                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors ${
                            isSelected ? "bg-purple-600/10 text-white" : "hover:bg-white/[0.02] text-slate-300"
                          }`}
                        >
                          <td className="py-2.5 px-3 font-medium truncate max-w-xs">{c.name}</td>
                          <td className="py-2.5 px-3 font-mono">
                            {c.pageCount} pgs{" "}
                            {c.pageCount !== (baseDoc.pageCount || 1) && (
                              <span className="text-amber-400 text-[10px]">
                                (vs {baseDoc.pageCount})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {c.byteDiff > 0 ? `+${formatFileSize(c.byteDiff)}` : formatFileSize(c.byteDiff)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${
                                c.diffPercentage > 0
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {c.diffPercentage > 0 ? `${c.diffPercentage}% Variance` : "Identical"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedCompDocId(c.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ml-auto transition-all ${
                                isSelected
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "bg-white/5 hover:bg-white/10 text-slate-300"
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>{isSelected ? "Viewing" : "Inspect Pair"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Synchronized Live Viewport */}
          {hasPair && (
            <div className="space-y-4">
              {/* Controls Toolbar with Premium Glass Specular Rim Lit Styling */}
              <div className="p-4 sm:p-5 rounded-3xl premium-card flex flex-wrap items-center justify-between gap-4 shadow-xl text-xs">
                <div>
                  <h4 className="font-semibold text-white tracking-tight">
                    Synchronized Viewport: <span className="text-purple-300">{baseDoc.name}</span>{" "}
                    vs. <span className="text-cyan-300">{compDoc.name}</span>
                  </h4>
                  <p className="text-zinc-400 mt-1 text-[11px] flex items-center gap-1.5">
                    {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                    {errorMessage ? (
                      <span className="text-rose-400">{errorMessage}</span>
                    ) : diffStats ? (
                      diffStats.diffPercentage > 0 ? (
                        <span className="text-rose-400 font-mono tabular-nums font-semibold">
                          Page {currentPage}: {diffStats.diffPercentage}% Visual Variance ({diffStats.diffPixels} altered pixels)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-mono font-semibold">Page {currentPage}: 100% Identical</span>
                      )
                    ) : (
                      "Calculating pixel diff..."
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Page Nav */}
                  <div className="flex items-center gap-1.5 text-zinc-300 glass-pill px-2.5 py-1 rounded-xl">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 disabled:opacity-25 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono tabular-nums text-xs px-1">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 disabled:opacity-25 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex rounded-xl glass-pill p-1 text-xs">
                    <button
                      onClick={() => setViewMode("side-by-side")}
                      className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        viewMode === "side-by-side"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Side-by-Side
                    </button>
                    <button
                      onClick={() => setViewMode("neon-diff")}
                      className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        viewMode === "neon-diff"
                          ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Visual Red Diff
                    </button>
                  </div>
                </div>
              </div>

              {/* Canvas Render Area */}
              <div className="p-6 rounded-3xl bg-[#090A0F] border border-white/10 min-h-[400px] flex items-center justify-center shadow-2xl">
                {viewMode === "side-by-side" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase mb-2">
                        Base Reference: {baseDoc.name}
                      </span>
                      <div className="p-2 rounded-xl bg-black/40 border border-white/10 shadow-lg max-w-full overflow-hidden">
                        <canvas ref={canvasARef} className="max-w-full h-auto rounded" />
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-purple-400 uppercase mb-2">
                        Revision: {compDoc.name}
                      </span>
                      <div className="p-2 rounded-xl bg-black/40 border border-purple-500/30 shadow-lg max-w-full overflow-hidden">
                        <canvas ref={canvasBRef} className="max-w-full h-auto rounded" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-xl">
                    <span className="text-[11px] font-bold text-rose-400 uppercase mb-2">
                      Visual Neon Diff Overlay (Red/Magenta = Changed Pixels)
                    </span>
                    <div className="p-2 rounded-2xl bg-black/40 border border-rose-500/40 shadow-[0_0_35px_rgba(244,63,94,0.25)] max-w-full overflow-hidden">
                      <canvas ref={canvasDiffRef} className="max-w-full h-auto rounded-xl" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
