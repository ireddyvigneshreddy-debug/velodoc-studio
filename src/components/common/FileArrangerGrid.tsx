"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { formatFileSize } from "@/lib/utils";
import { renderPdfPageToCanvas } from "@/lib/pdf-engine";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Trash2,
  Copy,
  Plus,
  SlidersHorizontal,
  Clock,
  TextT,
  FileText,
  FileImage,
} from "@/components/common/icons";

export interface ArrangerItem {
  id: string;
  file?: File;
  name: string;
  size?: number;
  previewUrl?: string; // image object url or rendered canvas url
  width?: number; // image width
  height?: number; // image height
  rotation?: number; // 0, 90, 180, 270
  pageCount?: number; // for PDFs
  status?: "loading" | "ready" | "error";
  extraLabel?: string;
}

export interface FileArrangerGridProps {
  items: ArrangerItem[];
  onReorder: (newItems: ArrangerItem[]) => void;
  onRotate?: (id: string, newRotation: number) => void;
  onRemove?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onAddMore?: (files: File[]) => void;
  acceptedFileTypes?: Record<string, string[]>;
  title?: string;
  subtitle?: string;
  showRotate?: boolean;
  showDuplicate?: boolean;
  itemTypeLabel?: string; // "Photo" | "Page" | "Document" | "File"
}

export function FileArrangerGrid({
  items,
  onReorder,
  onRotate,
  onRemove,
  onDuplicate,
  onAddMore,
  acceptedFileTypes,
  title,
  subtitle,
  showRotate = true,
  showDuplicate = true,
  itemTypeLabel = "Item",
}: FileArrangerGridProps) {
  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Track initial order for Reset
  const initialItemsRef = useRef<ArrangerItem[]>([]);
  useEffect(() => {
    if (initialItemsRef.current.length === 0 && items.length > 0) {
      initialItemsRef.current = [...items];
    }
  }, [items]);

  // Hidden file input ref for "Add More"
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  // Lazy Thumbnail generation for PDFs that don't have previewUrl yet
  const [pdfThumbnails, setPdfThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    items.forEach(async (item) => {
      if (item.file && item.file.type === "application/pdf" && !item.previewUrl && !pdfThumbnails[item.id]) {
        try {
          const buf = await item.file.arrayBuffer();
          const canvas = await renderPdfPageToCanvas(buf, 1, 0.6);
          const thumbUrl = canvas.toDataURL("image/jpeg", 0.8);
          setPdfThumbnails((prev) => ({ ...prev, [item.id]: thumbUrl }));
        } catch {
          // ignore error for encrypted or corrupted PDFs
        }
      }
    });
  }, [items, pdfThumbnails]);

  // SMART AUTO-SORT HANDLERS
  const handleSortNaturalName = () => {
    const sorted = [...items].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    onReorder(sorted);
  };

  const handleSortNameDesc = () => {
    const sorted = [...items].sort((a, b) =>
      b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" })
    );
    onReorder(sorted);
  };

  const handleSortOldestFirst = () => {
    const sorted = [...items].sort((a, b) => {
      const timeA = a.file?.lastModified || 0;
      const timeB = b.file?.lastModified || 0;
      return timeA - timeB;
    });
    onReorder(sorted);
  };

  const handleSortNewestFirst = () => {
    const sorted = [...items].sort((a, b) => {
      const timeA = a.file?.lastModified || 0;
      const timeB = b.file?.lastModified || 0;
      return timeB - timeA;
    });
    onReorder(sorted);
  };

  const handleReverseOrder = () => {
    const reversed = [...items].reverse();
    onReorder(reversed);
  };

  const handleResetOrder = () => {
    if (initialItemsRef.current.length > 0) {
      onReorder([...initialItemsRef.current]);
    }
  };

  // REORDERING LOGIC
  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
      const updated = [...items];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      onReorder(updated);
    },
    [items, onReorder]
  );

  // DRAG & DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveItem(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onAddMore) {
      onAddMore(Array.from(files));
    }
    if (e.target) e.target.value = "";
  };

  const totalBytes = items.reduce((acc, i) => acc + (i.size || i.file?.size || 0), 0);

  return (
    <div className="space-y-4">
      {/* 1. SMART SORT TOOLBAR */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {title || "Visual Sequence Arranger"}
              </span>
              <span className="text-xs font-mono font-semibold text-zinc-950 dark:text-white">
                ({items.length} {itemTypeLabel}s • {formatFileSize(totalBytes)})
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {subtitle || "Drag cards or use arrows & direct jump dropdowns to arrange exact final sequence."}
            </p>
          </div>

          {/* Quick Sort Actions Bar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Smart Sort:</span>
            </span>

            <button
              onClick={handleSortNaturalName}
              title="Natural alphanumeric order (1, 2, 10, 20)"
              className="px-2.5 py-1 rounded text-xs font-mono bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors flex items-center gap-1"
            >
              <TextT className="w-3 h-3 text-[#C2410C]" />
              <span>Smart Name (1, 2, 10)</span>
            </button>

            <button
              onClick={handleSortNameDesc}
              title="Reverse alphabetical order (Z to A)"
              className="px-2 py-1 rounded text-xs font-mono bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors"
            >
              Z → A
            </button>

            <button
              onClick={handleSortOldestFirst}
              title="Sort by capture timestamp (chronological camera order)"
              className="px-2 py-1 rounded text-xs font-mono bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>Oldest First</span>
            </button>

            <button
              onClick={handleSortNewestFirst}
              title="Sort newest camera shots first"
              className="px-2 py-1 rounded text-xs font-mono bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors"
            >
              Newest
            </button>

            <button
              onClick={handleReverseOrder}
              title="Reverse current sequence"
              className="px-2 py-1 rounded text-xs font-mono bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors"
            >
              ⇄ Reverse
            </button>

            <button
              onClick={handleResetOrder}
              title="Reset to original uploaded order"
              className="px-2 py-1 rounded text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 2. UNIFORM 4-COLUMN RESPONSIVE ARRANGER GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item, idx) => {
          const rotation = item.rotation || 0;
          const isDragTarget = dragOverIndex === idx;
          const isBeingDragged = draggedIndex === idx;
          const thumbSrc = item.previewUrl || pdfThumbnails[item.id];
          const isPdf = item.file?.type === "application/pdf" || item.name.toLowerCase().endsWith(".pdf");

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              className={`paper-card rounded-xl p-3 bg-white dark:bg-charcoal-800 border transition-all duration-150 flex flex-col justify-between select-none relative group ${
                isDragTarget
                  ? "border-[#C2410C] ring-2 ring-[#C2410C]/20 bg-[#FFF5F0] dark:bg-[#C2410C]/10 scale-[1.02]"
                  : "border-paper-300 dark:border-charcoal-border hover:border-zinc-400"
              } ${isBeingDragged ? "opacity-40" : "opacity-100"}`}
            >
              {/* TOP HEADER ON CARD: #Sequence Badge + Resolution/Page Badge */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="px-2 py-0.5 rounded bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-mono font-bold shadow-sm">
                  #{idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  {item.pageCount && (
                    <span className="px-1.5 py-0.5 rounded bg-paper-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono border border-paper-300 dark:border-charcoal-border">
                      {item.pageCount} Pages
                    </span>
                  )}
                  {item.width && item.height && (
                    <span className="px-1.5 py-0.5 rounded bg-paper-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono border border-paper-300 dark:border-charcoal-border">
                      {item.width}×{item.height}
                    </span>
                  )}
                  {rotation > 0 && (
                    <span className="px-1 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] text-[10px] font-mono font-bold">
                      {rotation}°
                    </span>
                  )}
                </div>
              </div>

              {/* LIVE THUMBNAIL PREVIEW MAT */}
              <div className="w-full aspect-[4/3] rounded-lg bg-[#F6F5F1] dark:bg-charcoal-900 border border-paper-200 dark:border-charcoal-border/50 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing mb-2.5">
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={item.name}
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className="w-full h-full object-contain transition-transform duration-200"
                  />
                ) : isPdf ? (
                  <div className="text-center p-3">
                    <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-1" />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">PDF Document</span>
                  </div>
                ) : (
                  <div className="text-center p-3">
                    <FileImage className="w-8 h-8 text-zinc-400 mx-auto mb-1" />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Image File</span>
                  </div>
                )}
              </div>

              {/* FILENAME & METADATA */}
              <div className="mb-3">
                <p className="text-xs font-mono font-semibold text-zinc-950 dark:text-white truncate" title={item.name}>
                  {item.name}
                </p>
                <span className="text-[10px] font-mono text-zinc-500">
                  {formatFileSize(item.size || item.file?.size || 0)}
                  {item.extraLabel ? ` • ${item.extraLabel}` : ""}
                </span>
              </div>

              {/* ALWAYS-VISIBLE TOUCH & MOUSE REORDER CONTROLS */}
              <div className="pt-2 border-t border-paper-200 dark:border-charcoal-border/60 flex items-center justify-between gap-1.5">
                {/* Nudge Left / Right Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(idx, idx - 1)}
                    disabled={idx === 0}
                    title="Move Earlier"
                    className="w-7 h-7 rounded bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 disabled:opacity-30 disabled:pointer-events-none text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveItem(idx, idx + 1)}
                    disabled={idx === items.length - 1}
                    title="Move Later"
                    className="w-7 h-7 rounded bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 disabled:opacity-30 disabled:pointer-events-none text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border flex items-center justify-center transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Direct Position Jump Selector (Move to #) */}
                  <select
                    value={idx + 1}
                    onChange={(e) => {
                      const targetPos = parseInt(e.target.value) - 1;
                      moveItem(idx, targetPos);
                    }}
                    title="Direct Position Jump"
                    className="h-7 px-1.5 rounded bg-paper-100 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border text-[11px] font-mono text-zinc-950 dark:text-white outline-none cursor-pointer"
                  >
                    {items.map((_, pIdx) => (
                      <option key={pIdx} value={pIdx + 1}>
                        #{pIdx + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Per-Card Quick Actions: Rotate, Duplicate, Remove */}
                <div className="flex items-center gap-1">
                  {showRotate && onRotate && (
                    <button
                      type="button"
                      onClick={() => onRotate(item.id, (rotation + 90) % 360)}
                      title="Rotate 90° Clockwise"
                      className="w-7 h-7 rounded bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-700 dark:text-zinc-300 border border-paper-300 dark:border-charcoal-border flex items-center justify-center transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {showDuplicate && onDuplicate && (
                    <button
                      type="button"
                      onClick={() => onDuplicate(item.id)}
                      title="Duplicate Card"
                      className="w-7 h-7 rounded bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-700 dark:text-zinc-300 border border-paper-300 dark:border-charcoal-border flex items-center justify-center transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      title="Remove"
                      className="w-7 h-7 rounded bg-paper-100 hover:bg-rose-50 dark:bg-charcoal-700 dark:hover:bg-rose-950/30 text-zinc-600 hover:text-rose-600 border border-paper-300 dark:border-charcoal-border flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 3. "+ ADD MORE PHOTOS / FILES HERE" CARD AT END OF GRID */}
        {onAddMore && (
          <div
            onClick={() => addMoreInputRef.current?.click()}
            className="paper-card rounded-xl p-4 bg-paper-50/70 hover:bg-paper-100 dark:bg-charcoal-800/40 dark:hover:bg-charcoal-800 border-2 border-dashed border-paper-300 dark:border-charcoal-border hover:border-[#C2410C] dark:hover:border-[#C2410C] transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[200px] space-y-2 group"
          >
            <div className="w-10 h-10 rounded-full bg-paper-200 dark:bg-charcoal-700 group-hover:bg-[#FFF5F0] dark:group-hover:bg-[#C2410C]/20 text-zinc-600 group-hover:text-[#C2410C] flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-mono font-semibold text-zinc-950 dark:text-white group-hover:text-[#C2410C]">
                + Add More {itemTypeLabel}s
              </p>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                Append to end of sequence
              </p>
            </div>
            <input
              ref={addMoreInputRef}
              type="file"
              multiple
              accept={acceptedFileTypes ? Object.values(acceptedFileTypes).flat().join(",") : undefined}
              onChange={handleAddMoreFiles}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}
