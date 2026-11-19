"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  BlobReader,
  BlobWriter,
  ZipReader,
  configure,
} from "@zip.js/zip.js";
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
  Lock,
  Key,
  Eye,
  EyeSlash,
  CheckCircle,
  Check,
} from "@/components/common/icons";

// Configure @zip.js/zip.js for pure client-side in-browser operation with 0 external network calls
configure({
  useWebWorkers: false,
});

interface ExtractedEntry {
  path: string;
  name: string;
  directory: string;
  isDirectory: boolean;
  uncompressedSize: number;
  compressedSize: number;
  ratio: number;
  encrypted: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawEntry: any;
}

export function UnzipTool() {
  const { revokeAll } = useObjectUrls();
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<ExtractedEntry[]>([]);
  const [hasEncryptedEntries, setHasEncryptedEntries] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(150);

  const [isLoading, setIsLoading] = useState(false);
  const [extractingPath, setExtractingPath] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const zipReaderRef = useRef<ZipReader<Blob> | null>(null);

  const handleZipLoaded = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setZipFile(file);
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword("");
    revokeAll();

    try {
      if (zipReaderRef.current) {
        try {
          await zipReaderRef.current.close();
        } catch {
          // ignore
        }
      }

      const reader = new ZipReader(new BlobReader(file));
      zipReaderRef.current = reader;

      const rawEntries = await reader.getEntries();
      const parsed: ExtractedEntry[] = [];
      let foundEncrypted = false;

      for (const item of rawEntries) {
        if (item.encrypted) {
          foundEncrypted = true;
        }

        const isDir = Boolean(item.directory);
        const uncompressed = item.uncompressedSize || 0;
        const compressed = item.compressedSize || uncompressed;
        const ratio = uncompressed > 0 ? Math.round(((uncompressed - compressed) / uncompressed) * 100) : 0;

        const parts = item.filename.split("/");
        const fileName = isDir
          ? parts[parts.length - 2] || item.filename
          : parts[parts.length - 1] || item.filename;
        const dirName = parts.length > 1 ? parts.slice(0, parts.length - 1).join("/") : "(root)";

        parsed.push({
          path: item.filename,
          name: fileName,
          directory: dirName,
          isDirectory: isDir,
          uncompressedSize: uncompressed,
          compressedSize: compressed,
          ratio: Math.max(0, ratio),
          encrypted: Boolean(item.encrypted),
          rawEntry: item,
        });
      }

      setHasEncryptedEntries(foundEncrypted);
      setEntries(parsed);
    } catch (err: unknown) {
      console.error("Failed to inspect ZIP archive:", err);
      setErrorMessage("Corrupted, invalid, or unsupported ZIP archive format.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSingle = async (entry: ExtractedEntry) => {
    if (entry.isDirectory) return;
    setExtractingPath(entry.path);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (entry.encrypted && !password.trim()) {
        setErrorMessage(`"${entry.name}" is password-protected. Please enter the password above to extract.`);
        setExtractingPath(null);
        return;
      }

      const writer = new BlobWriter();
      const options = entry.encrypted ? { password } : undefined;
      const blob = await entry.rawEntry.getData(writer, options);

      triggerFileDownload(blob, entry.name);
      setSuccessMessage(`Successfully extracted "${entry.name}"`);
    } catch (err: unknown) {
      console.error("Extraction error:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypted")) {
        setErrorMessage(`Incorrect password for "${entry.name}". Please check the password and try again.`);
      } else {
        setErrorMessage(`Failed to extract "${entry.name}": ${msg || "Unknown extraction error"}`);
      }
    } finally {
      setExtractingPath(null);
    }
  };

  const handleDownloadAll = async () => {
    const filesOnly = entries.filter((e) => !e.isDirectory);
    if (filesOnly.length === 0) return;

    if (hasEncryptedEntries && !password.trim()) {
      setErrorMessage("This archive contains password-protected files. Please enter the password above before extracting.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setExtractProgress({ current: 0, total: filesOnly.length });

    try {
      let successCount = 0;
      for (let i = 0; i < filesOnly.length; i++) {
        const entry = filesOnly[i];
        setExtractProgress({ current: i + 1, total: filesOnly.length });

        const writer = new BlobWriter();
        const options = entry.encrypted ? { password } : undefined;
        const blob = await entry.rawEntry.getData(writer, options);

        triggerFileDownload(blob, entry.name);
        successCount++;

        // Stagger browser downloads smoothly
        await new Promise((r) => setTimeout(r, 120));
      }

      setSuccessMessage(`Successfully extracted and saved all ${successCount} files!`);
    } catch (err: unknown) {
      console.error("Batch extraction error:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypted")) {
        setErrorMessage("Extraction failed: Incorrect password provided for encrypted archive files.");
      } else {
        setErrorMessage(`Batch extraction failed: ${msg || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
      setExtractProgress(null);
    }
  };

  const handleReset = async () => {
    if (zipReaderRef.current) {
      try {
        await zipReaderRef.current.close();
      } catch {
        // ignore
      }
      zipReaderRef.current = null;
    }
    revokeAll();
    setZipFile(null);
    setEntries([]);
    setPassword("");
    setHasEncryptedEntries(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSearchQuery("");
    setSelectedFolder("all");
  };

  // Directory groupings for filter tabs
  const folderList = useMemo(() => {
    const folders = new Set<string>();
    entries.forEach((e) => {
      if (e.directory && e.directory !== "(root)") {
        folders.add(e.directory);
      }
    });
    return Array.from(folders).sort();
  }, [entries]);

  // Filtered view items
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesFolder =
        selectedFolder === "all" ||
        (selectedFolder === "(root)" ? e.directory === "(root)" : e.directory.startsWith(selectedFolder));

      if (!matchesFolder) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return e.path.toLowerCase().includes(q) || e.name.toLowerCase().includes(q);
    });
  }, [entries, selectedFolder, searchQuery]);

  const displayedEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount]);

  // Aggregate metrics
  const totals = useMemo(() => {
    let uncompressed = 0;
    let compressed = 0;
    let fileCount = 0;
    let dirCount = 0;
    let encryptedCount = 0;

    entries.forEach((e) => {
      if (e.isDirectory) {
        dirCount++;
      } else {
        fileCount++;
        uncompressed += e.uncompressedSize;
        compressed += e.compressedSize;
        if (e.encrypted) encryptedCount++;
      }
    });

    const overallRatio = uncompressed > 0 ? Math.round(((uncompressed - compressed) / uncompressed) * 100) : 0;

    return { uncompressed, compressed, fileCount, dirCount, encryptedCount, overallRatio };
  }, [entries]);

  const getItemIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) return FolderOpen;
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext && ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext)) return FileImage;
    if (ext && ["js", "ts", "json", "html", "css", "py", "java", "c", "cpp", "md"].includes(ext)) return FileCode;
    if (ext && ["zip", "gz", "tar", "7z", "rar"].includes(ext)) return Archive;
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
          title="Upload or Drag & Drop ZIP Archive"
          subtitle="Inspect contents, folder tree, and extract standard or password-protected AES-256 archives with 0 server uploads."
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Archive Summary Banner */}
          <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-50 text-[#C2410C] dark:bg-indigo-600/20 dark:text-indigo-300 border border-orange-200 dark:border-indigo-500/30">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-zinc-950 dark:text-white text-base">
                    {zipFile.name}
                  </h3>
                  {hasEncryptedEntries && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Encrypted</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  <span>{formatFileSize(zipFile.size)}</span>
                  <span>•</span>
                  <span>{totals.fileCount} Files</span>
                  {totals.dirCount > 0 && <span>({totals.dirCount} Folders)</span>}
                  <span>•</span>
                  <span>{totals.overallRatio}% Space Saved</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isLoading || totals.fileCount === 0}
                className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold bg-[#C2410C] text-white hover:bg-[#A8370A] disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isLoading && extractProgress ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting {extractProgress.current}/{extractProgress.total}...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Extract All Files</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl text-xs font-mono border border-zinc-200 dark:border-charcoal-border hover:bg-zinc-50 dark:hover:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Inspect Another ZIP
              </button>
            </div>
          </div>

          {/* Password Prompt Banner for Encrypted Archives */}
          {hasEncryptedEntries && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-950 dark:text-amber-200 text-xs sm:text-sm">
                      Password-Protected ZIP Archive
                    </h4>
                    <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                      This archive contains encrypted files ({totals.encryptedCount} locked items). Enter the archive password to decrypt and extract.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="Enter archive password..."
                    className="w-full pl-9 pr-10 py-2 rounded-xl text-xs font-mono bg-white dark:bg-charcoal-800 border border-amber-500/40 text-zinc-950 dark:text-white outline-none focus:border-amber-600"
                  />
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-600" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password && (
                  <span className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center justify-center gap-1.5 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    <span>Password Ready</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error and Success Feedback */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Metrics Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Total Files
              </span>
              <span className="text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                {totals.fileCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Uncompressed Size
              </span>
              <span className="text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                {formatFileSize(totals.uncompressed)}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Compressed Size
              </span>
              <span className="text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                {formatFileSize(totals.compressed)}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Compression Ratio
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {totals.overallRatio}%
              </span>
            </div>
          </div>

          {/* Interactive Inspection Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Folder Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolder("all");
                    setVisibleCount(150);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                    selectedFolder === "all"
                      ? "bg-[#C2410C] text-white font-medium"
                      : "bg-zinc-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                  }`}
                >
                  All ({entries.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolder("(root)");
                    setVisibleCount(150);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors shrink-0 cursor-pointer ${
                    selectedFolder === "(root)"
                      ? "bg-[#C2410C] text-white font-medium"
                      : "bg-zinc-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                  }`}
                >
                  Root Files
                </button>
                {folderList.map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => {
                      setSelectedFolder(folder);
                      setVisibleCount(150);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors shrink-0 flex items-center gap-1 cursor-pointer ${
                      selectedFolder === folder
                        ? "bg-[#C2410C] text-white font-medium"
                        : "bg-zinc-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                    }`}
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>{folder}</span>
                  </button>
                ))}
              </div>

              {/* Live Search Input */}
              <div className="relative w-full sm:w-60 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(150);
                  }}
                  placeholder="Filter archive paths..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                />
              </div>
            </div>

            {/* Entries Table */}
            <div className="rounded-xl border border-zinc-200 dark:border-charcoal-border overflow-hidden">
              <div className="max-h-[460px] overflow-y-auto divide-y divide-zinc-100 dark:divide-charcoal-border">
                {displayedEntries.map((entry) => {
                  const IconComp = getItemIcon(entry.name, entry.isDirectory);
                  const isExtracting = extractingPath === entry.path;

                  return (
                    <div
                      key={entry.path}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-charcoal-700/50 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconComp
                          className={`w-4 h-4 shrink-0 ${
                            entry.isDirectory ? "text-[#C2410C]" : "text-zinc-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-zinc-950 dark:text-white font-medium truncate">
                              {entry.path}
                            </span>
                            {entry.encrypted && (
                              <span className="p-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300" title="Password-Protected (Encrypted)">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {!entry.isDirectory ? (
                          <>
                            <div className="text-right font-mono text-[11px] tabular-nums hidden sm:block">
                              <span className="text-zinc-900 dark:text-white font-medium block">
                                {formatFileSize(entry.uncompressedSize)}
                              </span>
                              <span className="text-zinc-400 text-[10px]">
                                {formatFileSize(entry.compressedSize)} ({entry.ratio}% saved)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(entry)}
                              disabled={isExtracting}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-zinc-100 dark:bg-charcoal-700 hover:bg-[#C2410C] hover:text-white text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                              title={`Download ${entry.name}`}
                            >
                              {isExtracting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : entry.encrypted ? (
                                <>
                                  <Key className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Decrypt</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Extract</span>
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-mono text-zinc-400">Folder</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredEntries.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                    No files found matching filter criteria.
                  </div>
                )}
              </div>

              {filteredEntries.length > visibleCount && (
                <div className="p-3 bg-zinc-50 dark:bg-charcoal-700/50 border-t border-zinc-200 dark:border-charcoal-border flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">
                    Showing {displayedEntries.length} of {filteredEntries.length} entries
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((v) => v + 250)}
                      className="px-3 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-charcoal-600 dark:hover:bg-charcoal-500 text-zinc-800 dark:text-zinc-200 font-medium text-[11px] transition-colors cursor-pointer"
                    >
                      Show More (+250)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleCount(filteredEntries.length)}
                      className="px-3 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-charcoal-600 dark:hover:bg-charcoal-500 text-zinc-800 dark:text-zinc-200 font-medium text-[11px] transition-colors cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
