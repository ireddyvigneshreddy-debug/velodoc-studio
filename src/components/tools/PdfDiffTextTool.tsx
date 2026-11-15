"use client";

import React, { useState } from "react";
import { DropZone } from "@/components/common/DropZone";
import {
  comparePdfTexts,
  generateDiffAuditReport,
  DiffComparisonResult,
} from "@/lib/diff-engine";
import { createPdfBlob } from "@/lib/utils";
import {
  GitCompare,
  FileText,
  Download,
  AlertCircle,
  Loader2,
} from "@/components/common/icons";

export function PdfDiffTextTool() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [isComparing, setIsComparing] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffComparisonResult | null>(null);
  const [viewMode, setViewMode] = useState<"unified" | "only-changes">("only-changes");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleCompare = async () => {
    if (!fileA || !fileB) return;
    setIsComparing(true);
    setErrorMessage(null);

    try {
      const [bufferA, bufferB] = await Promise.all([
        fileA.arrayBuffer(),
        fileB.arrayBuffer(),
      ]);

      const result = await comparePdfTexts(bufferA, fileA.name, bufferB, fileB.name);
      setDiffResult(result);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not parse text streams from both PDF documents.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!diffResult) return;
    setIsDownloadingReport(true);
    try {
      const reportBytes = await generateDiffAuditReport(diffResult);
      const blob = createPdfBlob(reportBytes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Diff-Audit-Report-${fileA?.name.replace(".pdf", "")}-vs-${fileB?.name.replace(".pdf", "")}.pdf`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloadingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Dual Documents Card */}
      {!diffResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Document A (Original) */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              1. Original Document (Version A)
            </span>
            {fileA ? (
              <div className="premium-card p-5 rounded-2xl flex items-center justify-between border border-white/[0.1]">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-400" />
                  <div>
                    <span className="text-sm font-semibold text-white block">{fileA.name}</span>
                    <span className="text-xs text-zinc-400">{(fileA.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFileA(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <DropZone
                files={[]}
                onFilesAdded={(files) => files[0] && setFileA(files[0])}
                onRemoveFile={() => {}}
                acceptedFileTypes={{ "application/pdf": [".pdf"] }}
                multiple={false}
                title="Select Original PDF (Version A)"
                subtitle="Upload prior contract, agreement, or first draft"
              />
            )}
          </div>

          {/* Document B (Modified) */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              2. Revised Document (Version B)
            </span>
            {fileB ? (
              <div className="premium-card p-5 rounded-2xl flex items-center justify-between border border-white/[0.1]">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-emerald-400" />
                  <div>
                    <span className="text-sm font-semibold text-white block">{fileB.name}</span>
                    <span className="text-xs text-zinc-400">{(fileB.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFileB(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <DropZone
                files={[]}
                onFilesAdded={(files) => files[0] && setFileB(files[0])}
                onRemoveFile={() => {}}
                acceptedFileTypes={{ "application/pdf": [".pdf"] }}
                multiple={false}
                title="Select Revised PDF (Version B)"
                subtitle="Upload modified draft or newly signed contract"
              />
            )}
          </div>
        </div>
      )}

      {/* Action Trigger Button */}
      {!diffResult && (
        <div className="max-w-md mx-auto pt-2">
          {errorMessage && (
            <div className="p-3.5 mb-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleCompare}
            disabled={!fileA || !fileB || isComparing}
            className="w-full py-4 rounded-2xl bg-vermilion hover:bg-vermilion-hover disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
          >
            {isComparing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Text & Computing Diff...</span>
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                <span>Run In-Depth Contract Diff</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Comparison Results Dashboard */}
      {diffResult && (
        <div className="space-y-6">
          {/* Header Stats Bar */}
          <div className="premium-card p-6 rounded-3xl border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-indigo-400" />
                  Textual Diff Comparison Results
                </h3>
                <p className="text-xs text-zinc-400">
                  {diffResult.docA.filename} vs {diffResult.docB.filename}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={isDownloadingReport}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Audit Report PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiffResult(null);
                    setFileA(null);
                    setFileB(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl hover:bg-white/[0.06]"
                >
                  New Compare
                </button>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                <span className="text-[11px] text-zinc-400 block mb-0.5">Similarity Score</span>
                <span className="text-lg font-bold text-indigo-400 font-mono">
                  {diffResult.stats.similarityPercent}%
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[11px] text-emerald-300 block mb-0.5">Words Added</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  +{diffResult.stats.wordsAdded}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-[11px] text-rose-300 block mb-0.5">Words Removed</span>
                <span className="text-lg font-bold text-rose-400 font-mono">
                  -{diffResult.stats.wordsRemoved}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                <span className="text-[11px] text-zinc-400 block mb-0.5">Unchanged Words</span>
                <span className="text-lg font-bold text-zinc-300 font-mono">
                  {diffResult.stats.wordsUnchanged}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Diff Viewer */}
          <div className="premium-card p-6 rounded-3xl border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Changes Breakdown
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl glass-pill">
                <button
                  type="button"
                  onClick={() => setViewMode("only-changes")}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    viewMode === "only-changes"
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Only Changes
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("unified")}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    viewMode === "unified"
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Full Document Flow
                </button>
              </div>
            </div>

            {/* Scrollable Diff Terminal */}
            <div className="p-4 rounded-2xl bg-zinc-950 font-mono text-xs max-h-[460px] overflow-y-auto space-y-1 border border-white/[0.08]">
              {diffResult.lineChanges
                .filter((change) => viewMode === "unified" || change.added || change.removed)
                .map((change, idx) => {
                  const isAdd = change.added;
                  const isDel = change.removed;

                  const bg = isAdd
                    ? "bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500 pl-2"
                    : isDel
                    ? "bg-rose-500/10 text-rose-300 border-l-2 border-rose-500 pl-2"
                    : "text-zinc-400 pl-2";

                  const prefix = isAdd ? "+ " : isDel ? "- " : "  ";

                  return (
                    <div key={idx} className={`py-1 rounded ${bg} whitespace-pre-wrap break-words leading-relaxed`}>
                      <span className="opacity-50 select-none mr-2">{prefix}</span>
                      {change.value}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
