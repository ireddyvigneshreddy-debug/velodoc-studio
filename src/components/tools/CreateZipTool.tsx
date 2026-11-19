"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  BlobReader,
  BlobWriter,
  ZipWriter,
  configure,
} from "@zip.js/zip.js";
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
  Lock,
  Key,
  Eye,
  EyeSlash,
  ShieldCheck,
  Check,
} from "@/components/common/icons";

// Configure @zip.js/zip.js for pure client-side in-browser operation with 0 external network calls
configure({
  useWebWorkers: false,
});

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const [items, setItems] = useState<ZipItem[]>([]);
  const [zipName, setZipName] = useState("archive.zip");
  const [compressionLevel, setCompressionLevel] = useState<"store" | "fast" | "balanced" | "max">("balanced");
  const [smartBypass, setSmartBypass] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");

  // Password Lock state
  const [lockWithPassword, setLockWithPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [encryptionStandard, setEncryptionStandard] = useState<"aes" | "zipCrypto">("aes");

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const isCancelledRef = useRef(false);

  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "Empty", color: "bg-zinc-200 dark:bg-charcoal-700", text: "text-zinc-400" };
    let s = 0;
    if (password.length >= 8) s += 1;
    if (password.length >= 12) s += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s += 1;
    if (/\d/.test(password)) s += 1;
    if (/[^a-zA-Z0-9]/.test(password)) s += 1;

    if (s <= 1) return { score: 1, label: "Weak", color: "bg-red-500", text: "text-red-500" };
    if (s <= 2) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-500" };
    if (s <= 4) return { score: 3, label: "Good", color: "bg-blue-500", text: "text-blue-500" };
    return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
  }, [password]);

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
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    setProgressMsg("Cancelled by user.");
  };

  const handleCreateZip = async () => {
    if (items.length === 0) return;

    if (lockWithPassword) {
      if (!password.trim()) {
        setErrorMessage("Please enter a password to lock the ZIP archive.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match. Please verify both password fields.");
        return;
      }
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressMsg("Scanning and staging files for archive...");
    setErrorMessage(null);
    isCancelledRef.current = false;
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;
    const startTime = performance.now();

    try {
      const levelMap: Record<string, number> = {
        store: 0,
        fast: 1,
        balanced: 6,
        max: 9,
      };

      const blobWriter = new BlobWriter("application/zip");

      // Configure writer options
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const writerOptions: any = {
        signal: abortCtrl.signal,
      };

      if (lockWithPassword) {
        writerOptions.password = password;
        if (encryptionStandard === "zipCrypto") {
          writerOptions.zipCrypto = true;
        } else {
          writerOptions.encryptionStrength = 3; // AES-256
          writerOptions.zipCrypto = false;
        }
      }

      const zipWriter = new ZipWriter(blobWriter, writerOptions);

      for (let i = 0; i < items.length; i++) {
        if (isCancelledRef.current || abortCtrl.signal.aborted) {
          throw new DOMException("Archive creation cancelled by user.", "AbortError");
        }

        const item = items[i];
        const ext = item.relativePath.split(".").pop()?.toLowerCase() || "";
        const isPreCompressed = PRE_COMPRESSED_EXTS.has(ext);

        // Smart bypass: if file is already compressed media and smart bypass is active, use STORE (0)
        const useStore = compressionLevel === "store" || (smartBypass && isPreCompressed);
        const fileLevel = useStore ? 0 : levelMap[compressionLevel];

        await zipWriter.add(item.relativePath, new BlobReader(item.file), {
          level: fileLevel,
        });

        const currentPct = Math.round(((i + 1) / items.length) * 88);
        setProgress(currentPct);
        setProgressMsg(`Compressed ${i + 1} of ${items.length} files...`);
      }

      if (isCancelledRef.current || abortCtrl.signal.aborted) {
        throw new DOMException("Archive creation cancelled by user.", "AbortError");
      }

      setProgress(92);
      setProgressMsg("Finalizing central directory and security headers...");

      const zipBlob = await zipWriter.close();

      if (isCancelledRef.current || abortCtrl.signal.aborted) {
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
        targetAccuracy: lockWithPassword
          ? `🔒 ${encryptionStandard === "aes" ? "AES-256" : "ZipCrypto"} Encrypted (${items.length} Files)`
          : `Standard ZIP (${items.length} Files)`,
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
      abortControllerRef.current = null;
    }
  };

  const totalBytes = items.reduce((acc, it) => acc + it.size, 0);

  // Group paths by top-level directory for structure breakdown
  const directoryCounts = useMemo(() => {
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

  const filteredItems = useMemo(() => {
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
        <div className="space-y-4">
          {lockWithPassword && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">
                    Password-Protected Archive Created
                  </h4>
                  <p className="text-amber-800/80 dark:text-amber-300/80 text-[11px] font-mono">
                    Encrypted with {encryptionStandard === "aes" ? "WinZip AES-256" : "ZipCrypto Legacy"}. Requires your password to extract.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[10px] uppercase font-bold shrink-0">
                Encrypted
              </span>
            </div>
          )}

          <ResultPreviewStudio
            metrics={metrics}
            outputBytes={outputBytes || undefined}
            outputMimeType="application/zip"
            title={lockWithPassword ? "Encrypted ZIP Archive Packaged!" : "ZIP Archive Packaged Successfully!"}
            onAdjustSettings={() => {
              revokeAll();
              setMetrics(null);
              setOutputBytes(null);
            }}
          />
        </div>
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
              Preserves nested relative folder paths (folder/subfolder/file.ext) with optional AES-256 password encryption. 100% in-browser client compression.
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
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
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
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Password Encryption Panel */}
              <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-charcoal-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${lockWithPassword ? "bg-amber-500 text-white" : "bg-zinc-100 dark:bg-charcoal-700 text-zinc-500"}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Lock ZIP with Password
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Encrypt ZIP archive contents natively (compatible with Windows Explorer, macOS Archive Utility, 7-Zip & WinRAR)
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockWithPassword}
                      onChange={(e) => setLockWithPassword(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-charcoal-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C2410C]"></div>
                  </label>
                </div>

                {lockWithPassword && (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Password Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-between">
                          <span>Archive Password</span>
                          {password && (
                            <span className={`text-[10px] font-bold ${passwordStrength.text}`}>
                              {passwordStrength.label}
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password..."
                            className="w-full pl-9 pr-10 py-2 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                          />
                          <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {password && (
                          <div className="w-full h-1 bg-zinc-100 dark:bg-charcoal-700 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full ${passwordStrength.color} transition-all duration-300`}
                              style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Confirm Password Field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-between">
                          <span>Confirm Password</span>
                          {confirmPassword && (
                            <span className={`text-[10px] font-bold ${password === confirmPassword ? "text-emerald-500" : "text-red-500"}`}>
                              {password === confirmPassword ? "Matches" : "Mismatch"}
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password..."
                            className={`w-full pl-9 pr-10 py-2 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border text-zinc-950 dark:text-white outline-none ${
                              confirmPassword && password !== confirmPassword
                                ? "border-red-400 focus:border-red-500"
                                : "border-zinc-200 dark:border-charcoal-border focus:border-[#C2410C]"
                            }`}
                          />
                          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          {confirmPassword && password === confirmPassword && (
                            <Check className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Encryption Standard Selector */}
                    <div className="pt-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block mb-2 font-semibold">
                        Encryption Standard
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEncryptionStandard("aes")}
                          className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                            encryptionStandard === "aes"
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200 shadow-sm ring-1 ring-amber-500/30"
                              : "bg-zinc-50 dark:bg-charcoal-700/50 border-zinc-200 dark:border-charcoal-border text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              <span>AES-256 Encryption (Recommended)</span>
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                              Secure
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block">
                            Strong cryptographic security. Supported natively by modern macOS, Windows 11, 7-Zip, WinRAR, and Linux.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEncryptionStandard("zipCrypto")}
                          className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                            encryptionStandard === "zipCrypto"
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200 shadow-sm ring-1 ring-amber-500/30"
                              : "bg-zinc-50 dark:bg-charcoal-700/50 border-zinc-200 dark:border-charcoal-border text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold">ZipCrypto (Legacy Compatibility)</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-charcoal-600 text-zinc-700 dark:text-zinc-300">
                              Legacy
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight block">
                            Traditional ZIP encryption. Compatible with legacy Windows XP/7/10 built-in zip utilities and older extractors.
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                    Client In-Memory • @zip.js Streams
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
                    <strong>Smart Media Bypass:</strong> Store pre-compressed media (.jpg, .png, .mp4, .zip, .pdf) as STORE to eliminate wasted CPU passes.
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
                            className="text-zinc-400 hover:text-rose-500 ml-1 text-xs cursor-pointer"
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
                            className="text-zinc-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
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
                          className="px-2 py-0.5 rounded text-[10px] font-mono border border-rose-300 text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span>
                      Ready to {lockWithPassword ? "encrypt & package" : "package"} {items.length} files ({formatFileSize(totalBytes)})
                    </span>
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
                      <span>Packaging ZIP ({progress}%)...</span>
                    </>
                  ) : lockWithPassword ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Lock & Create Encrypted ZIP</span>
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
