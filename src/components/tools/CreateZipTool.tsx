"use client";

import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { formatFileSize } from "@/lib/utils";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { ProcessingMetrics } from "@/types";
import {
  Archive,
  FolderOpen,
  FileText,
  FileImage,
  FileCode,
  Trash2,
  Loader2,
  Plus,
  Sliders,
  AlertCircle,
} from "@/components/common/icons";

interface ZipItem {
  id: string;
  file: File;
  relativePath: string;
  size: number;
}

// Extensions of already-compressed formats
const PRE_COMPRESSED_EXTS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "avif",
  "mp4", "mov", "m4v", "mkv", "webm", "mp3", "aac", "ogg", "flac",
  "zip", "gz", "bz2", "xz", "7z", "rar", "pdf", "docx", "xlsx", "pptx"
]);

export function CreateZipTool() {
  const { createTrackedUrl, revokeAll } = useObjectUrls();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ZipItem[]>([]);
  const [zipName, setZipName] = useState("archive.zip");
  const [compressionLevel, setCompressionLevel] = useState<"store" | "fast" | "balanced" | "max">("balanced");
  const [smartBypass, setSmartBypass] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const isCancelledRef = useRef(false);

  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Traverse dropped file system entries recursively
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traverseEntry = async (entry: any, basePath = ""): Promise<ZipItem[]> => {
    const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file: File = await new Promise((resolve, reject) =>
        entry.file(resolve, reject)
      );
      return [
        {
          id: `${Math.random().toString(36).substring(7)}_${Date.now()}`,
          file,
          relativePath: currentPath,
          size: file.size,
        },
      ];
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries: any[] = [];
      await new Promise<void>((resolve, reject) => {
        function readBatch() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dirReader.readEntries((batch: any[]) => {
            if (batch.length === 0) {
              resolve();
            } else {
              entries.push(...batch);
              readBatch();
            }
          }, reject);
        }
        readBatch();
      });

      const subPromises = entries.map((sub) => traverseEntry(sub, currentPath));
      const subResults = await Promise.all(subPromises);
      return subResults.flat();
    }
    return [];
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const dtItems = e.dataTransfer.items;
    if (!dtItems || dtItems.length === 0) return;

    try {
      const queue: Promise<ZipItem[]>[] = [];
      for (let i = 0; i < dtItems.length; i++) {
        const it = dtItems[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entry = (it as any).webkitGetAsEntry?.();
        if (entry) {
          queue.push(traverseEntry(entry, ""));
        } else {
          const f = it.getAsFile();
          if (f) {
            queue.push(
              Promise.resolve([
                {
                  id: `${Math.random().toString(36).substring(7)}_${Date.now()}`,
                  file: f,
                  relativePath: f.name,
                  size: f.size,
                },
              ])
            );
          }
        }
      }

      const results = await Promise.all(queue);
      const newItems = results.flat();
      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems]);
        if (!zipName || zipName === "archive.zip") {
          const firstPart = newItems[0].relativePath.split("/")[0];
          setZipName(`${firstPart || "bundle"}.zip`);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to parse dropped directory:", err);
      setErrorMessage("Could not traverse dropped directory structure.");
    }
  };

  // Folder input handler (<input webkitdirectory>)
  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const newItems: ZipItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      // webkitRelativePath contains e.g. "MyFolder/sub/file.txt"
      const path = f.webkitRelativePath || f.name;
      newItems.push({
        id: `${Math.random().toString(36).substring(7)}_${Date.now()}_${i}`,
        file: f,
        relativePath: path,
        size: f.size,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    if (newItems.length > 0) {
      const rootFolder = newItems[0].relativePath.split("/")[0];
      setZipName(`${rootFolder}.zip`);
    }
    // reset input
    e.target.value = "";
  };

  // Individual files selection
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const newItems: ZipItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newItems.push({
        id: `${Math.random().toString(36).substring(7)}_${Date.now()}_${i}`,
        file: f,
        relativePath: f.name,
        size: f.size,
      });
    }
    setItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveFolder = (folderPrefix: string) => {
    setItems((prev) => prev.filter((item) => !item.relativePath.startsWith(folderPrefix)));
  };

  const handleClearAll = () => {
    revokeAll();
    setItems([]);
    setOutputBytes(null);
    setMetrics(null);
    setProgress(0);
    setProgressMsg("");
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setProgressMsg("Cancelled by user.");
  };

  const handleCreateZip = async () => {
    if (items.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setProgressMsg("Scanning and staging files for archive...");
    isCancelledRef.current = false;
    const startTime = performance.now();

    try {
      const zip = new JSZip();

      // Compression settings map
      const levelMap = {
        store: 0,
        fast: 1,
        balanced: 6,
        max: 9,
      };

      for (let i = 0; i < items.length; i++) {
        if (isCancelledRef.current) {
          throw new DOMException("Archive creation cancelled by user.", "AbortError");
        }
        const item = items[i];
        const ext = item.relativePath.split(".").pop()?.toLowerCase() || "";
        const isPreCompressed = PRE_COMPRESSED_EXTS.has(ext);

        // Smart bypass: if file is already compressed media and smart bypass is active, use STORE
        const useStore = compressionLevel === "store" || (smartBypass && isPreCompressed);

        zip.file(item.relativePath, item.file, {
          compression: useStore ? "STORE" : "DEFLATE",
          compressionOptions: useStore ? undefined : { level: levelMap[compressionLevel] },
        });

        if (i % 20 === 0) {
          setProgress(Math.round((i / items.length) * 20));
          setProgressMsg(`Staged ${i + 1} of ${items.length} files...`);
        }
      }

      setProgress(25);
      setProgressMsg("Compressing and generating ZIP binary streams...");

      const zipBlob = await zip.generateAsync(
        {
          type: "blob",
          compression: compressionLevel === "store" ? "STORE" : "DEFLATE",
          compressionOptions: {
            level: levelMap[compressionLevel],
          },
        },
        (metadata) => {
          if (isCancelledRef.current) return;
          const pct = Math.round(25 + (metadata.percent / 100) * 72);
          setProgress(pct);
          setProgressMsg(`Generating ZIP archive... ${Math.round(metadata.percent)}%`);
        }
      );

      if (isCancelledRef.current) {
        throw new DOMException("Archive creation cancelled by user.", "AbortError");
      }

      const durationMs = performance.now() - startTime;
      const arrayBuf = await zipBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      const downloadUrl = createTrackedUrl(zipBlob);

      const totalUncompressed = items.reduce((acc, it) => acc + it.size, 0);
      const savedBytes = Math.max(0, totalUncompressed - bytes.byteLength);
      const savedPct = totalUncompressed > 0 ? Math.round((savedBytes / totalUncompressed) * 100) : 0;

      const finalName = zipName.trim() ? (zipName.endsWith(".zip") ? zipName : `${zipName}.zip`) : "archive.zip";

      setOutputBytes(bytes);
      setMetrics({
        originalSize: totalUncompressed,
        processedSize: bytes.byteLength,
        savedBytes,
        savedPercentage: savedPct,
        durationMs,
        downloadUrl,
        downloadFilename: finalName,
        pageCount: items.length,
        targetAccuracy: `ZIP Package (${items.length} Files)`,
      });

      setProgress(100);
      setProgressMsg("ZIP archive created successfully!");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setErrorMessage("ZIP creation cancelled.");
      } else {
        console.error("ZIP Generation error:", err);
        setErrorMessage(err instanceof Error ? err.message : "Failed to create ZIP archive.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const totalBytes = items.reduce((acc, it) => acc + it.size, 0);

  // Group paths by top-level directory for structure breakdown
  const directoryCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => {
      const parts = it.relativePath.split("/");
      if (parts.length > 1) {
        const topDir = parts[0];
        map.set(topDir, (map.get(topDir) || 0) + 1);
      } else {
        map.set("(Root Files)", (map.get("(Root Files)") || 0) + 1);
      }
    });
    return map;
  }, [items]);

  const filteredItems = React.useMemo(() => {
    if (!searchFilter.trim()) return items;
    const q = searchFilter.toLowerCase();
    return items.filter((it) => it.relativePath.toLowerCase().includes(q));
  }, [items, searchFilter]);

  const getItemIcon = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext && PRE_COMPRESSED_EXTS.has(ext)) {
      if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return FileImage;
      if (["zip", "gz", "7z", "rar"].includes(ext)) return Archive;
    }
    if (ext && ["js", "ts", "json", "html", "css", "py", "java", "cpp", "c", "sql"].includes(ext)) return FileCode;
    return FileText;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          outputMimeType="application/zip"
          title="ZIP Archive Packaged Successfully!"
          onAdjustSettings={() => {
            revokeAll();
            setMetrics(null);
            setOutputBytes(null);
          }}
        />
      ) : (
        <>
          {/* Top Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-paper-300 dark:border-charcoal-border hover:border-[#C2410C] dark:hover:border-indigo-500 rounded-3xl p-8 sm:p-12 text-center transition-all bg-white dark:bg-charcoal-800 shadow-sm"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#FFF5F0] dark:bg-[#C2410C]/20 border border-[#FBDCD0] dark:border-[#C2410C]/30 flex items-center justify-center text-[#C2410C] dark:text-[#ffedd5]">
              <Archive className="w-7 h-7" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white mb-1.5">
              Drag & Drop Entire Folders or Files Here
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-5">
              Preserves nested relative folder paths (folder/subfolder/file.ext) with 100% in-browser client compression.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Folder Selector */}
              <input
                ref={folderInputRef}
                type="file"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                onChange={handleFolderSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#C2410C] text-white hover:bg-[#9A3412] transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select Folder</span>
              </button>

              {/* Individual Files Selector */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-charcoal-border hover:bg-zinc-50 dark:hover:bg-charcoal-600 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Files</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Summary and Configuration Bar */}
              <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-50 text-[#C2410C] dark:bg-indigo-600/20 dark:text-indigo-300 border border-orange-200 dark:border-indigo-500/30">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-950 dark:text-white">
                        {items.length} Files Staged
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300">
                        {formatFileSize(totalBytes)}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Across {directoryCounts.size} directory branches
                    </span>
                  </div>
                </div>

                {/* ZIP Name & Clear */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-56">
                    <input
                      type="text"
                      value={zipName}
                      onChange={(e) => setZipName(e.target.value)}
                      placeholder="archive.zip"
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-900 dark:text-white outline-none focus:border-[#C2410C]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Compression Options Box */}
              <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#C2410C]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono">
                      Compression Engine Profile
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Client WebWorker • In-Memory
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "store", label: "Store (0%)", desc: "No DEFLATE, fastest packaging" },
                    { id: "fast", label: "Fast (L1)", desc: "Light compression, rapid speed" },
                    { id: "balanced", label: "Balanced (L6)", desc: "Optimal balance (Standard)" },
                    { id: "max", label: "Maximum (L9)", desc: "Smallest archive, highest ratio" },
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setCompressionLevel(level.id as typeof compressionLevel)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        compressionLevel === level.id
                          ? "bg-orange-50 border-orange-300 text-orange-950 dark:bg-indigo-600/20 dark:border-indigo-500 dark:text-white shadow-sm ring-1 ring-orange-300 dark:ring-indigo-500"
                          : "bg-zinc-50 dark:bg-charcoal-700/50 border-zinc-200 dark:border-charcoal-border text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="text-xs font-bold block">{level.label}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight block mt-0.5">
                        {level.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Smart Bypass Checkbox */}
                <label className="flex items-center gap-2 pt-1 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smartBypass}
                    onChange={(e) => setSmartBypass(e.target.checked)}
                    className="rounded border-zinc-300 text-[#C2410C] focus:ring-0"
                  />
                  <span>
                    <strong>Smart Media Bypass:</strong> Store pre-compressed media (.jpg, .mp4, .zip, .pdf) as STORE to eliminate wasted CPU passes.
                  </span>
                </label>
              </div>

              {/* Directory Filter & Interactive File Tree */}
              <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from(directoryCounts.entries()).map(([dir, count]) => (
                      <span
                        key={dir}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-charcoal-border flex items-center gap-1.5"
                      >
                        <FolderOpen className="w-3 h-3 text-[#C2410C]" />
                        <span>{dir}</span>
                        <span className="font-bold">({count})</span>
                        {dir !== "(Root Files)" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFolder(`${dir}/`)}
                            className="text-zinc-400 hover:text-rose-500 ml-1 text-xs"
                            title={`Remove folder ${dir}`}
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter staged paths..."
                    className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-900 dark:text-white outline-none w-full sm:w-48"
                  />
                </div>

                {/* Staged Files List (scrollable) */}
                <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200 dark:border-charcoal-border divide-y divide-zinc-100 dark:divide-charcoal-border">
                  {filteredItems.map((item) => {
                    const IconComp = getItemIcon(item.relativePath);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-charcoal-700/50 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IconComp className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="font-mono text-zinc-900 dark:text-white truncate">
                            {item.relativePath}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px] tabular-nums">
                            {formatFileSize(item.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div className="p-4 text-center text-xs text-zinc-500 font-mono">
                      No files matched &ldquo;{searchFilter}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm">
                <div className="text-xs text-zinc-700 dark:text-zinc-400">
                  {isProcessing ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[#C2410C] font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{progressMsg || "Generating ZIP..."}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-48 h-1.5 rounded-full bg-zinc-200 dark:bg-charcoal-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-200"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-2 py-0.5 rounded text-[10px] font-mono border border-rose-300 text-rose-600 hover:bg-rose-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span>Ready to create ZIP archive with {items.length} files ({formatFileSize(totalBytes)})</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCreateZip}
                  disabled={isProcessing || items.length === 0}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#C2410C] hover:bg-[#A8370A] disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating ZIP ({progress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      <span>Create ZIP Archive Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
