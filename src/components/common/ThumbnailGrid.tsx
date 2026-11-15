"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Check,
} from "@/components/common/icons";
import { PageThumbnail } from "@/types";

export interface PageControlAction {
  type: "rotate-cw" | "rotate-ccw" | "duplicate" | "delete" | "move-left" | "move-right";
  index: number;
}

interface ThumbnailGridProps {
  thumbnails: PageThumbnail[];
  mode?: "remove" | "select" | "organize" | "view";
  selectedIndices?: Set<number>;
  onToggleSelect?: (index: number) => void;
  onPageAction?: (action: PageControlAction) => void;
  isLoading?: boolean;
  totalPageEstimate?: number;
  onApplyRange?: (rangeStr: string) => void;
}

export function ThumbnailGrid({
  thumbnails,
  mode = "view",
  selectedIndices = new Set(),
  onToggleSelect,
  onPageAction,
  isLoading = false,
  totalPageEstimate = 0,
  onApplyRange,
}: ThumbnailGridProps) {
  const [rangeInput, setRangeInput] = useState("");

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rangeInput.trim() || !onApplyRange) return;
    onApplyRange(rangeInput.trim());
  };

  const selectAll = () => {
    if (!onToggleSelect) return;
    thumbnails.forEach((_, idx) => {
      if (!selectedIndices.has(idx)) onToggleSelect(idx);
    });
  };

  const deselectAll = () => {
    if (!onToggleSelect) return;
    thumbnails.forEach((_, idx) => {
      if (selectedIndices.has(idx)) onToggleSelect(idx);
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Helper Toolbar (Select/Deselect/Range selection for Remove & Split) */}
      {(mode === "remove" || mode === "select") && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl premium-card text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono tabular-nums">
              {mode === "remove"
                ? `${selectedIndices.size} of ${thumbnails.length} pages marked for removal`
                : `${selectedIndices.size} of ${thumbnails.length} pages selected`}
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 rounded-xl glass-pill hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2.5 py-1 rounded-xl glass-pill hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          {onApplyRange && (
            <form onSubmit={handleApplyRange} className="flex items-center gap-2">
              <span className="text-zinc-400 hidden md:inline font-mono text-[11px]">Select range:</span>
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="e.g. 1, 3-5, 8"
                className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs w-32 font-mono tabular-nums shadow-inner"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer"
              >
                Apply
              </button>
            </form>
          )}
        </div>
      )}

      {/* Grid of Pages (Mobile 2-cols with large touch targets) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {thumbnails.map((thumb, index) => {
          const isSelected = selectedIndices.has(index);

          return (
            <div
              key={`${thumb.pageNumber}-${index}`}
              onClick={() => {
                if (mode === "remove" || mode === "select") {
                  onToggleSelect?.(index);
                }
              }}
              className={`group relative rounded-lg overflow-hidden border transition-all duration-150 paper-card flex flex-col ${
                mode === "remove" && isSelected
                  ? "border-rose-500 shadow-paper ring-2 ring-rose-500/50"
                  : mode === "select" && isSelected
                  ? "border-vermilion shadow-paper ring-2 ring-vermilion/50"
                  : "border-paper-300 dark:border-charcoal-border hover:border-vermilion/40"
              } ${
                mode === "remove" || mode === "select"
                  ? "cursor-pointer"
                  : "cursor-default"
              }`}
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/40 border-b border-white/5 text-[11px] font-medium text-slate-300">
                <span className="font-mono">Page {thumb.pageNumber}</span>
                {mode === "remove" && isSelected && (
                  <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                    <Trash2 className="w-3 h-3" /> Remove
                  </span>
                )}
                {mode === "select" && isSelected && (
                  <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" /> Selected
                  </span>
                )}
              </div>

              {/* Thumbnail Container */}
              <div className="relative aspect-[1/1.35] w-full bg-[#090A0F] p-2 flex items-center justify-center overflow-hidden">
                <div
                  className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
                  style={{
                    transform: `rotate(${thumb.rotation || 0}deg)`,
                  }}
                >
                  <Image
                    src={thumb.dataUrl}
                    alt={`Page ${thumb.pageNumber}`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-contain shadow-sm pointer-events-none"
                    unoptimized
                  />
                </div>

                {/* Remove Mode Red Overlay */}
                {mode === "remove" && isSelected && (
                  <div className="absolute inset-0 bg-rose-950/70 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center transition-opacity">
                    <div className="p-2 rounded-full bg-rose-600 text-white shadow-lg mb-1">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                      Delete Page
                    </span>
                  </div>
                )}

                {/* Select Mode Checkbox Overlay */}
                {mode === "select" && (
                  <div
                    className={`absolute top-2 right-2 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                        : "bg-black/60 border-white/30 text-transparent group-hover:border-white/60"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Organize Mode Control Bar */}
              {mode === "organize" && onPageAction && (
                <div className="grid grid-cols-6 p-1 bg-black/60 border-t border-white/5 divide-x divide-white/5 text-slate-400">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      onPageAction({ type: "move-left", index })
                    }
                    title="Move Left"
                    className="p-1.5 flex justify-center items-center hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    disabled={index === thumbnails.length - 1}
                    onClick={() =>
                      onPageAction({ type: "move-right", index })
                    }
                    title="Move Right"
                    className="p-1.5 flex justify-center items-center hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onPageAction({ type: "rotate-ccw", index })
                    }
                    title="Rotate 90° CCW"
                    className="p-1.5 flex justify-center items-center hover:text-cyan-400 hover:bg-white/10 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onPageAction({ type: "rotate-cw", index })
                    }
                    title="Rotate 90° CW"
                    className="p-1.5 flex justify-center items-center hover:text-indigo-400 hover:bg-white/10 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onPageAction({ type: "duplicate", index })
                    }
                    title="Duplicate Page"
                    className="p-1.5 flex justify-center items-center hover:text-emerald-400 hover:bg-white/10 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    disabled={thumbnails.length <= 1}
                    onClick={() =>
                      onPageAction({ type: "delete", index })
                    }
                    title="Delete Page"
                    className="p-1.5 flex justify-center items-center hover:text-rose-400 hover:bg-rose-500/20 disabled:opacity-20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Skeletons */}
        {isLoading &&
          Array.from({
            length: Math.max(1, totalPageEstimate - thumbnails.length),
          }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="rounded-xl overflow-hidden border border-white/5 bg-[#12141D] flex flex-col animate-pulse"
            >
              <div className="h-7 bg-white/5" />
              <div className="aspect-[1/1.35] w-full bg-[#090A0F] flex items-center justify-center">
                <span className="text-[10px] text-slate-600">Rendering...</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
