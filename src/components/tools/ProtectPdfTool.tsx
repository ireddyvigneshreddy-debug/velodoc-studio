"use client";

import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { createPdfBlob, formatFileSize } from "@/lib/utils";
import {
  Lock,
  Key,
  Eye,
  EyeSlash,
  Loader2,
  AlertCircle,
} from "@/components/common/icons";

const HEADER_MAGIC = new TextEncoder().encode("VELODOC_ENCRYPTED_PDF_V1");

export function ProtectPdfTool() {
  const { createTrackedUrl, revokeAll } = useObjectUrls();
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [mode, setMode] = useState<"lock" | "unlock">("lock");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    revokeAll();
    setErrorMessage(null);
    setMetrics(null);
    setOutputBytes(null);

    const buf = await file.arrayBuffer();
    setOriginalBuffer(buf);

    // Auto-detect if file is an encrypted VeloDoc package
    const headerSlice = new Uint8Array(buf.slice(0, HEADER_MAGIC.length));
    let isEncryptedPackage = true;
    for (let i = 0; i < HEADER_MAGIC.length; i++) {
      if (headerSlice[i] !== HEADER_MAGIC[i]) {
        isEncryptedPackage = false;
        break;
      }
    }

    if (isEncryptedPackage || file.name.endsWith(".venc.pdf")) {
      setMode("unlock");
    } else {
      setMode("lock");
    }

    setFileItem({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "ready",
    });
  };

  // Derive AES-GCM-256 key via PBKDF2
  const deriveKey = async (pass: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(pass),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as unknown as BufferSource,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  };

  const handleLockPdf = async () => {
    if (!originalBuffer || !fileItem) return;
    if (!password) {
      setErrorMessage("Please enter a password to protect the document.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      // 1. Generate 16-byte random salt and 12-byte IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // 2. Derive 256-bit AES key
      const key = await deriveKey(password, salt);

      // 3. Encrypt PDF data with AES-256-GCM
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as unknown as BufferSource },
        key,
        originalBuffer
      );

      // 4. Combine Magic Header + Salt (16) + IV (12) + Ciphertext
      const cipherBytes = new Uint8Array(encryptedBuffer);
      const totalLen = HEADER_MAGIC.length + salt.length + iv.length + cipherBytes.length;
      const combined = new Uint8Array(totalLen);

      let offset = 0;
      combined.set(HEADER_MAGIC, offset);
      offset += HEADER_MAGIC.length;
      combined.set(salt, offset);
      offset += salt.length;
      combined.set(iv, offset);
      offset += iv.length;
      combined.set(cipherBytes, offset);

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const blob = new Blob([combined], { type: "application/pdf" });
      const downloadUrl = createTrackedUrl(blob);
      const baseName = fileItem.name.replace(/\.pdf$/i, "");
      const downloadFilename = `${baseName}_protected.venc.pdf`;

      setOutputBytes(combined);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: combined.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename,
        pageCount: 1,
        targetAccuracy: "AES-256-GCM Encrypted",
      });
    } catch (err: unknown) {
      console.error("Lock error:", err);
      setErrorMessage("Failed to encrypt document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlockPdf = async () => {
    if (!originalBuffer || !fileItem) return;
    if (!password) {
      setErrorMessage("Please enter the password to unlock the document.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const bytes = new Uint8Array(originalBuffer);

      // Check if it's our AES-GCM package
      let isOurPackage = true;
      if (bytes.length < HEADER_MAGIC.length + 28) {
        isOurPackage = false;
      } else {
        for (let i = 0; i < HEADER_MAGIC.length; i++) {
          if (bytes[i] !== HEADER_MAGIC[i]) {
            isOurPackage = false;
            break;
          }
        }
      }

      let decBytes: Uint8Array;

      if (isOurPackage) {
        let offset = HEADER_MAGIC.length;
        const salt = bytes.slice(offset, offset + 16);
        offset += 16;
        const iv = bytes.slice(offset, offset + 12);
        offset += 12;
        const ciphertext = bytes.slice(offset);

        const key = await deriveKey(password, salt);
        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv as unknown as BufferSource },
          key,
          ciphertext as unknown as BufferSource
        );
        decBytes = new Uint8Array(decryptedBuffer);
      } else {
        // Fallback: standard permission stripping via pdf-lib
        try {
          const doc = await PDFDocument.load(originalBuffer, { ignoreEncryption: true });
          decBytes = await doc.save();
        } catch {
          throw new Error("Invalid password or unsupported encryption format.");
        }
      }

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const blob = createPdfBlob(decBytes);
      const downloadUrl = createTrackedUrl(blob);
      const baseName = fileItem.name.replace(/\.venc\.pdf$/i, "").replace(/\.pdf$/i, "");
      const downloadFilename = `${baseName}_unlocked.pdf`;

      setOutputBytes(decBytes);
      setMetrics({
        originalSize: fileItem.size,
        processedSize: decBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs,
        downloadUrl,
        downloadFilename,
        pageCount: 1,
        targetAccuracy: "Document Unlocked & Decrypted",
      });
    } catch (err: unknown) {
      console.error("Unlock error:", err);
      setErrorMessage("Incorrect password or corrupt encrypted container.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    revokeAll();
    setFileItem(null);
    setOriginalBuffer(null);
    setPassword("");
    setConfirmPassword("");
    setOutputBytes(null);
    setMetrics(null);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          outputMimeType="application/pdf"
          title={mode === "lock" ? "Document Encrypted & Locked!" : "Document Decrypted & Unlocked!"}
          onAdjustSettings={handleReset}
        />
      ) : !fileItem ? (
        <DropZone
          files={[]}
          onFilesAdded={handleFilesAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{
            "application/pdf": [".pdf"],
            "application/octet-stream": [".venc.pdf"],
          }}
          multiple={false}
          title="Upload PDF to Password-Protect or Unlock"
          subtitle="Client-side WebCrypto AES-256-GCM encryption and restriction stripping with zero server uploads"
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* File Header Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-orange-50 text-[#C2410C] dark:bg-emerald-500/10 dark:text-emerald-400 border border-orange-200 dark:border-emerald-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-950 dark:text-white text-sm sm:text-base">
                  {fileItem.name}
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  {formatFileSize(fileItem.size)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-charcoal-border"
            >
              Choose Different File
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-charcoal-700 max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => setMode("lock")}
              className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === "lock"
                  ? "bg-white dark:bg-charcoal-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950"
              }`}
            >
              Lock / Encrypt PDF
            </button>
            <button
              type="button"
              onClick={() => setMode("unlock")}
              className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === "unlock"
                  ? "bg-white dark:bg-charcoal-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950"
              }`}
            >
              Unlock / Decrypt PDF
            </button>
          </div>

          {/* Password Form Box */}
          <div className="p-6 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-4 max-w-md mx-auto">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
              <Key className="w-4 h-4 text-[#C2410C]" />
              <span className="font-semibold uppercase tracking-wider">
                {mode === "lock" ? "Set Document Passphrase" : "Enter Decryption Passphrase"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "lock" ? "Enter strong password..." : "Enter file password..."}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {mode === "lock" && (
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                  />
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={mode === "lock" ? handleLockPdf : handleUnlockPdf}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === "lock" ? "Encrypting Document..." : "Decrypting Document..."}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{mode === "lock" ? "Encrypt & Lock PDF" : "Unlock & Decrypt PDF"}</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-zinc-500 font-mono">
                100% Client-Side WebCrypto • Keys never leave your device
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
