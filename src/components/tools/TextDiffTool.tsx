"use client";

import React, { useState, useMemo } from "react";
import * as Diff from "diff";
import { triggerFileDownload } from "@/lib/batch-queue-engine";
import {
  GitCompare,
  Copy,
  Check,
  Download,
  ArrowsClockwise,
  Sparkle,
} from "@/components/common/icons";

const SAMPLE_ORIGINAL = `function calculateTotal(items, discountRate) {
  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    subtotal += items[i].price * items[i].quantity;
  }
  const tax = subtotal * 0.08;
  const discount = subtotal * discountRate;
  return subtotal + tax - discount;
}`;

const SAMPLE_MODIFIED = `function calculateTotal(items, discountRate = 0) {
  // Use modern Array.reduce for cleaner summation
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.085; // Updated 2026 tax rate
  const discount = subtotal * Math.min(1, Math.max(0, discountRate));
  const finalTotal = subtotal + tax - discount;
  return Math.round(finalTotal * 100) / 100;
}`;

export function TextDiffTool() {
  const [originalText, setOriginalText] = useState(SAMPLE_ORIGINAL);
  const [modifiedText, setModifiedText] = useState(SAMPLE_MODIFIED);

  const [granularity, setGranularity] = useState<"lines" | "words" | "chars">("lines");
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");
  const [copied, setCopied] = useState(false);

  // Compute diffs
  const diffChunks = useMemo(() => {
    if (granularity === "lines") {
      return Diff.diffLines(originalText, modifiedText);
    } else if (granularity === "words") {
      return Diff.diffWords(originalText, modifiedText);
    } else {
      return Diff.diffChars(originalText, modifiedText);
    }
  }, [originalText, modifiedText, granularity]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diffChunks.forEach((chunk) => {
      const count = chunk.count || 1;
      if (chunk.added) added += count;
      else if (chunk.removed) removed += count;
      else unchanged += count;
    });

    const total = added + removed + unchanged;
    const similarity = total > 0 ? Math.round(((unchanged * 2) / (total + unchanged)) * 100) : 100;

    return { added, removed, unchanged, similarity };
  }, [diffChunks]);

  const handleSwap = () => {
    const temp = originalText;
    setOriginalText(modifiedText);
    setModifiedText(temp);
  };

  const handleDownloadPatch = () => {
    const patch = Diff.createPatch("file.txt", originalText, modifiedText, "Original", "Modified");
    const blob = new Blob([patch], { type: "text/plain" });
    triggerFileDownload(blob, "changes.patch");
  };

  const handleCopyUnified = () => {
    const patch = Diff.createPatch("file.txt", originalText, modifiedText, "Original", "Modified");
    navigator.clipboard.writeText(patch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Sample Action */}
      <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Text &amp; Code Difference Checker
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Inspect line, word, and character additions and deletions side-by-side or unified with patch export.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setOriginalText(SAMPLE_ORIGINAL);
            setModifiedText(SAMPLE_MODIFIED);
          }}
          className="px-3 py-1.5 rounded-xl text-xs font-mono bg-orange-50 text-[#C2410C] border border-orange-200 dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkle className="w-3.5 h-3.5" />
          <span>Load Sample Diff</span>
        </button>
      </div>

      {/* Control Bar & Stats */}
      <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Granularity & View Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-charcoal-700 p-1 rounded-xl text-xs font-mono">
            {(["lines", "words", "chars"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`px-3 py-1 rounded-lg transition-colors capitalize ${
                  granularity === g
                    ? "bg-[#C2410C] text-white font-bold"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-950"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-charcoal-700 p-1 rounded-xl text-xs font-mono">
            {(["split", "unified"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded-lg transition-colors capitalize ${
                  viewMode === v
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-950"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Diff Metrics */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            +{stats.added} Added
          </span>
          <span className="text-rose-600 dark:text-rose-400 font-bold">
            -{stats.removed} Removed
          </span>
          <span className="text-zinc-500">
            {stats.similarity}% Similar
          </span>

          <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-charcoal-border pl-3">
            <button
              type="button"
              onClick={handleCopyUnified}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-charcoal-border text-xs font-mono hover:bg-zinc-50 dark:hover:bg-charcoal-700 flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>Patch</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPatch}
              className="px-2.5 py-1 rounded-lg bg-[#C2410C] text-white text-xs font-mono hover:bg-[#9A3412] flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>.patch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editable Input Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Original */}
        <div className="p-4 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-rose-600 dark:text-rose-400">
              Original Text / Baseline
            </span>
            <button
              type="button"
              onClick={handleSwap}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1"
            >
              <ArrowsClockwise className="w-3 h-3" />
              <span>Swap</span>
            </button>
          </div>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            rows={10}
            className="w-full p-3 rounded-xl font-mono text-xs bg-zinc-50 dark:bg-[#0F111A] border border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-zinc-200 outline-none focus:border-rose-500 resize-y"
          />
        </div>

        {/* Right: Modified */}
        <div className="p-4 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
              Revised / Modified Version
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {modifiedText.split("\n").length} Lines
            </span>
          </div>
          <textarea
            value={modifiedText}
            onChange={(e) => setModifiedText(e.target.value)}
            rows={10}
            className="w-full p-3 rounded-xl font-mono text-xs bg-zinc-50 dark:bg-[#0F111A] border border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-zinc-200 outline-none focus:border-emerald-500 resize-y"
          />
        </div>
      </div>

      {/* Rendered Diff View Output */}
      <div className="p-5 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-charcoal-border pb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
            Computed {granularity.toUpperCase()} Difference Output ({viewMode.toUpperCase()})
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Green = Added • Red = Removed
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F111A] border border-white/[0.08] font-mono text-xs overflow-x-auto select-all max-h-96">
          {viewMode === "unified" ? (
            <div className="space-y-0.5">
              {diffChunks.map((chunk, idx) => {
                const colorClass = chunk.added
                  ? "bg-emerald-500/15 text-emerald-300"
                  : chunk.removed
                  ? "bg-rose-500/15 text-rose-300 line-through"
                  : "text-zinc-300";

                const prefix = chunk.added ? "+ " : chunk.removed ? "- " : "  ";

                return (
                  <span key={idx} className={`${colorClass} px-0.5 py-0.2 rounded whitespace-pre-wrap`}>
                    {granularity === "lines"
                      ? chunk.value
                          .split("\n")
                          .filter((l, i, arr) => i < arr.length - 1 || l.length > 0)
                          .map((l) => `${prefix}${l}\n`)
                          .join("")
                      : chunk.value}
                  </span>
                );
              })}
            </div>
          ) : (
            /* Split View */
            <div className="grid grid-cols-2 gap-4">
              <div className="border-r border-zinc-800 pr-3 space-y-0.5">
                <span className="text-[10px] text-zinc-500 uppercase block mb-1">Left (Original)</span>
                {diffChunks.map((chunk, idx) => {
                  if (chunk.added) return null;
                  return (
                    <span
                      key={idx}
                      className={`whitespace-pre-wrap ${
                        chunk.removed
                          ? "bg-rose-500/20 text-rose-300 px-0.5 rounded block"
                          : "text-zinc-300 block"
                      }`}
                    >
                      {chunk.value}
                    </span>
                  );
                })}
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 uppercase block mb-1">Right (Modified)</span>
                {diffChunks.map((chunk, idx) => {
                  if (chunk.removed) return null;
                  return (
                    <span
                      key={idx}
                      className={`whitespace-pre-wrap ${
                        chunk.added
                          ? "bg-emerald-500/20 text-emerald-300 px-0.5 rounded block"
                          : "text-zinc-300 block"
                      }`}
                    >
                      {chunk.value}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
