"use client";

import React, { useState, useMemo } from "react";
import JSZip from "jszip";
import { formatFileSize } from "@/lib/utils";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { DropZone } from "@/components/common/DropZone";
import { triggerFileDownload } from "@/lib/batch-queue-engine";
import {
  Archive,
  FolderOpen,
  FileText,
  FileImage,
  FileCode,
  Download,
  Loader2,
  Search,
  AlertCircle,
} from "@/components/common/icons";

interface ExtractedEntry {
  path: string;
  name: string;
  directory: string;
  isDirectory: boolean;
  uncompressedSize: number;
  compressedSize: number;
  ratio: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zipObject: any;
}

export function UnzipTool() {
  const { revokeAll } = useObjectUrls();
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<ExtractedEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");

  const [isLoading, setIsLoading] = useState(false);
  const [extractingPath, setExtractingPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleZipLoaded = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setZipFile(file);
    setIsLoading(true);
    setErrorMessage(null);
    revokeAll();

    try {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      const parsed: ExtractedEntry[] = [];
      const keys = Object.keys(zip.files);

      for (const key of keys) {
        const item = zip.files[key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData = (item as any)._data;
        const uncompressed = rawData?.uncompressedSize || 0;
        const compressed = rawData?.compressedSize || uncompressed;
        const ratio = uncompressed > 0 ? Math.round(((uncompressed - compressed) / uncompressed) * 100) : 0;

        const parts = key.split("/");
        const isDir = item.dir || key.endsWith("/");
        const fileName = isDir ? parts[parts.length - 2] || key : parts[parts.length - 1] || key;
        const dirName = parts.length > 1 ? parts.slice(0, parts.length - 1).join("/") : "(root)";

        parsed.push({
          path: key,
          name: fileName,
          directory: dirName,
          isDirectory: isDir,
          uncompressedSize: uncompressed,
          compressedSize: compressed,
          ratio: Math.max(0, ratio),
          zipObject: item,
        });
      }

      setEntries(parsed);
    } catch (err: unknown) {
      console.error("Failed to inspect ZIP:", err);
      setErrorMessage("Corrupted or unsupported ZIP archive file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSingle = async (entry: ExtractedEntry) => {
    if (entry.isDirectory) return;
    setExtractingPath(entry.path);

    try {
      const blob = await entry.zipObject.async("blob");
      triggerFileDownload(blob, entry.name);
    } catch (err: unknown) {
      console.error("Extraction failed:", err);
      setErrorMessage(`Failed to extract ${entry.name}`);
    } finally {
      setExtractingPath(null);
    }
  };

  const handleDownloadAll = async () => {
    if (entries.length === 0) return;
    setIsLoading(true);

    try {
      const filesOnly = entries.filter((e) => !e.isDirectory);
      for (const entry of filesOnly) {
        const blob = await entry.zipObject.async("blob");
        triggerFileDownload(blob, entry.name);
        // Small delay so browser handles downloads smoothly
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch (err: unknown) {
      console.error("Batch extraction error:", err);
      setErrorMessage("Failed to extract all files.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    revokeAll();
    setZipFile(null);
    setEntries([]);
    setSearchQuery("");
    setSelectedFolder("all");
    setErrorMessage(null);
  };

  // Directory groupings
  const directories = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.directory) set.add(e.directory);
    });
    return Array.from(set).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (e.isDirectory) return false;
      const matchesFolder = selectedFolder === "all" || e.directory === selectedFolder;
      if (!matchesFolder) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return e.path.toLowerCase().includes(q) || e.name.toLowerCase().includes(q);
    });
  }, [entries, selectedFolder, searchQuery]);

  const stats = useMemo(() => {
    const files = entries.filter((e) => !e.isDirectory);
    const totalUncompressed = files.reduce((acc, f) => acc + f.uncompressedSize, 0);
    const totalCompressed = zipFile ? zipFile.size : files.reduce((acc, f) => acc + f.compressedSize, 0);
    const saved = Math.max(0, totalUncompressed - totalCompressed);
    const ratio = totalUncompressed > 0 ? Math.round((saved / totalUncompressed) * 100) : 0;

    return {
      fileCount: files.length,
      folderCount: entries.filter((e) => e.isDirectory).length,
      totalUncompressed,
      totalCompressed,
      savedBytes: saved,
      compressionRatio: ratio,
    };
  }, [entries, zipFile]);

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return FileImage;
    if (["js", "ts", "json", "html", "css", "py", "java", "cpp", "c", "sql"].includes(ext)) return FileCode;
    return FileText;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {!zipFile ? (
        <DropZone
          files={[]}
          onFilesAdded={handleZipLoaded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{
            "application/zip": [".zip"],
            "application/x-zip-compressed": [".zip"],
          }}
          multiple={false}
          title="Upload Any ZIP Archive to Inspect &amp; Extract"
          subtitle="Explore nested folder trees, review compression ratios, and download individual files in-memory"
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Metrics Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-[#FFF5F0] dark:bg-indigo-600/20 text-[#C2410C] dark:text-indigo-300 border border-[#FBDCD0] dark:border-indigo-500/30">
                <Archive className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
                  {zipFile.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-charcoal-border">
                    {stats.fileCount} Files • {stats.folderCount} Folders
                  </span>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {stats.compressionRatio}% Space Saved
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isLoading}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Extract All Files</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-charcoal-border hover:bg-zinc-100 dark:hover:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Upload Another
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm">
              <span className="text-[11px] font-mono uppercase text-zinc-500 block">Archive Size</span>
              <span className="text-base font-bold font-mono text-zinc-900 dark:text-white mt-0.5 block">
                {formatFileSize(stats.totalCompressed)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm">
              <span className="text-[11px] font-mono uppercase text-zinc-500 block">Uncompressed Size</span>
              <span className="text-base font-bold font-mono text-zinc-900 dark:text-white mt-0.5 block">
                {formatFileSize(stats.totalUncompressed)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm">
              <span className="text-[11px] font-mono uppercase text-zinc-500 block">Saved Space</span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {formatFileSize(stats.savedBytes)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm">
              <span className="text-[11px] font-mono uppercase text-zinc-500 block">Ratio</span>
              <span className="text-base font-bold font-mono text-[#C2410C] mt-0.5 block">
                {stats.compressionRatio}% DEFLATE
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Directory Filter & Search Filter */}
          <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedFolder("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors shrink-0 ${
                    selectedFolder === "all"
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold"
                      : "bg-zinc-100 dark:bg-charcoal-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                  }`}
                >
                  All ({entries.filter((e) => !e.isDirectory).length})
                </button>
                {directories.map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setSelectedFolder(dir)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors shrink-0 flex items-center gap-1.5 ${
                      selectedFolder === dir
                        ? "bg-[#C2410C] text-white font-bold"
                        : "bg-zinc-100 dark:bg-charcoal-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                    }`}
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>{dir}</span>
                  </button>
                ))}
              </div>

              <div className="relative sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter files by name..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-900 dark:text-white outline-none focus:border-[#C2410C]"
                />
              </div>
            </div>

            {/* Archive Content Table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-charcoal-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-charcoal-700/60 font-mono text-[11px] text-zinc-500 uppercase border-b border-zinc-200 dark:border-charcoal-border">
                  <tr>
                    <th className="px-4 py-2.5">File Name &amp; Path</th>
                    <th className="px-3 py-2.5 text-right">Original Size</th>
                    <th className="px-3 py-2.5 text-right">Compressed</th>
                    <th className="px-3 py-2.5 text-right">Savings</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-charcoal-border">
                  {filteredEntries.map((entry) => {
                    const IconComp = getFileIcon(entry.name);
                    const isExtracting = extractingPath === entry.path;

                    return (
                      <tr
                        key={entry.path}
                        className="hover:bg-zinc-50 dark:hover:bg-charcoal-700/40 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <IconComp className="w-4 h-4 text-zinc-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium text-zinc-900 dark:text-white block truncate">
                                {entry.name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 block truncate">
                                {entry.path}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-zinc-700 dark:text-zinc-300 tabular-nums">
                          {formatFileSize(entry.uncompressedSize)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-zinc-500 tabular-nums">
                          {formatFileSize(entry.compressedSize)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                          {entry.ratio}%
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(entry)}
                            disabled={isExtracting}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-zinc-800 dark:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            {isExtracting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span>Extract</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-zinc-500 font-mono text-xs">
                        No files matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
