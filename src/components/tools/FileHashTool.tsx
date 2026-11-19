"use client";

import React, { useState } from "react";
import { DropZone } from "@/components/common/DropZone";
import { formatFileSize } from "@/lib/utils";
import {
  Hash,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from "@/components/common/icons";

interface HashResults {
  sha256: string;
  sha512: string;
  sha1: string;
  crc32: string;
  fileSize: number;
  magicSignature: string;
  magicDescription: string;
  hexRows: HexRow[];
}

interface HexRow {
  offset: string;
  hex: string[];
  ascii: string;
}

// CRC-32 implementation
function calculateCrc32(bytes: Uint8Array): string {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return ((crc ^ -1) >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

const CRC_TABLE = (() => {
  let c;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function detectMagicBytes(bytes: Uint8Array): { signature: string; description: string } {
  if (bytes.length < 4) return { signature: "UNKNOWN", description: "File too small" };

  const hex4 = Array.from(bytes.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");

  // PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { signature: "%PDF", description: "Portable Document Format (PDF)" };
  }
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { signature: "PNG", description: "Portable Network Graphics (PNG)" };
  }
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { signature: "JPEG", description: "Joint Photographic Experts Group (JPEG/JFIF)" };
  }
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { signature: "GIF", description: "Graphics Interchange Format (GIF)" };
  }
  // ZIP / Office Open XML / JAR
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
    return { signature: "PK (ZIP)", description: "ZIP Archive / OpenXML Document (.docx, .xlsx, .pptx, .apk)" };
  }
  // WebP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { signature: "RIFF/WEBP", description: "Google WebP Image Format" };
  }
  // WebAssembly
  if (bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d) {
    return { signature: "\\0asm", description: "WebAssembly Binary Module (WASM)" };
  }
  // Windows PE Executable
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
    return { signature: "MZ", description: "DOS/Windows Portable Executable (EXE/DLL)" };
  }
  // ELF Executable
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
    return { signature: "ELF", description: "Executable and Linkable Format (Linux/UNIX)" };
  }

  return { signature: hex4, description: "Raw binary / unstructured file" };
}

function bufferToHexRows(bytes: Uint8Array, maxBytes = 256): HexRow[] {
  const rows: HexRow[] = [];
  const limit = Math.min(bytes.length, maxBytes);

  for (let offset = 0; offset < limit; offset += 16) {
    const chunk = bytes.slice(offset, Math.min(offset + 16, limit));
    const hex: string[] = [];
    let ascii = "";

    for (let i = 0; i < 16; i++) {
      if (i < chunk.length) {
        const b = chunk[i];
        hex.push(b.toString(16).padStart(2, "0").toUpperCase());
        ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : ".";
      } else {
        hex.push("  ");
        ascii += " ";
      }
    }

    rows.push({
      offset: offset.toString(16).padStart(8, "0").toUpperCase(),
      hex,
      ascii,
    });
  }

  return rows;
}

export function FileHashTool() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<HashResults | null>(null);
  const [verifyInput, setVerifyInput] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileAdded = async (files: File[]) => {
    if (files.length === 0) return;
    const f = files[0];
    setFile(f);
    setIsProcessing(true);
    setErrorMessage(null);
    setVerifyInput("");

    try {
      const buffer = await f.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Compute Hashes in parallel using WebCrypto
      const [sha256Buf, sha512Buf, sha1Buf] = await Promise.all([
        crypto.subtle.digest("SHA-256", buffer),
        crypto.subtle.digest("SHA-512", buffer),
        crypto.subtle.digest("SHA-1", buffer),
      ]);

      const toHex = (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

      const sha256 = toHex(sha256Buf);
      const sha512 = toHex(sha512Buf);
      const sha1 = toHex(sha1Buf);
      const crc32 = calculateCrc32(bytes);

      const magic = detectMagicBytes(bytes);
      const hexRows = bufferToHexRows(bytes, 256);

      setResults({
        sha256,
        sha512,
        sha1,
        crc32,
        fileSize: f.size,
        magicSignature: magic.signature,
        magicDescription: magic.description,
        hexRows,
      });
    } catch (err: unknown) {
      console.error("Hashing failed:", err);
      setErrorMessage("Failed to compute file hashes.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isMatched = React.useMemo(() => {
    if (!verifyInput.trim() || !results) return null;
    const clean = verifyInput.trim().toLowerCase();
    return (
      results.sha256 === clean ||
      results.sha512 === clean ||
      results.sha1 === clean ||
      results.crc32.toLowerCase() === clean
    );
  }, [verifyInput, results]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file ? (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{}}
          multiple={false}
          title="Drop Any File to Compute Cryptographic Hashes &amp; Hex"
          subtitle="Computes SHA-256, SHA-512, SHA-1, CRC-32 and inspects magic-byte signatures 100% locally"
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* File Card Header */}
          <div className="p-6 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-orange-50 text-[#C2410C] dark:bg-purple-600/20 dark:text-purple-300 border border-orange-200 dark:border-purple-500/30">
                <Hash className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-950 dark:text-white text-base">
                  {file.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 font-mono">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{file.type || "binary stream"}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setResults(null);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono border border-zinc-200 dark:border-charcoal-border hover:bg-zinc-50 dark:hover:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Analyze Another File
            </button>
          </div>

          {isProcessing && (
            <div className="p-8 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#C2410C]" />
              <p className="text-xs font-mono text-zinc-500">Computing WebCrypto digests...</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {results && (
            <>
              {/* Magic Byte Signature Banner */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
                    Magic Byte Signature:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-xs font-mono font-bold text-zinc-950 dark:text-white">
                    {results.magicSignature}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 font-sans">
                    ({results.magicDescription})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  Verified Format
                </span>
              </div>

              {/* Checksum Verification Box */}
              <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">
                  Verify Checksum Match
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="Paste an expected SHA-256, SHA-512, or SHA-1 hash to verify..."
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                  />
                  {isMatched !== null && (
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 ${
                        isMatched
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-300"
                      }`}
                    >
                      {isMatched ? <Check className="w-3.5 h-3.5" /> : <span>✕</span>}
                      <span>{isMatched ? "MATCH VERIFIED" : "NO MATCH"}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Cryptographic Digests Table */}
              <div className="p-5 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  Cryptographic File Digests
                </h4>

                <div className="space-y-3">
                  {[
                    { key: "sha256", label: "SHA-256", value: results.sha256 },
                    { key: "sha512", label: "SHA-512", value: results.sha512 },
                    { key: "sha1", label: "SHA-1", value: results.sha1 },
                    { key: "crc32", label: "CRC-32", value: results.crc32 },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-charcoal-700/50 border border-zinc-200 dark:border-charcoal-border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-mono font-bold uppercase text-[#C2410C] dark:text-purple-400 block mb-0.5">
                          {item.label}
                        </span>
                        <span className="text-xs font-mono text-zinc-900 dark:text-zinc-200 break-all select-all block">
                          {item.value}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.value, item.key)}
                        className="self-end sm:self-center px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border hover:bg-zinc-100 dark:hover:bg-charcoal-700 transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        {copiedKey === item.key ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hex Dump Inspector (First 256 Bytes) */}
              <div className="p-5 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
                    Magic Byte &amp; Header Hex Dump (First 256 Bytes)
                  </h4>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Offset • Hex Bytes • ASCII
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0F111A] border border-white/[0.08] overflow-x-auto text-[11px] font-mono text-zinc-300 space-y-1 select-all">
                  {results.hexRows.map((row) => (
                    <div key={row.offset} className="flex gap-4">
                      <span className="text-zinc-500 select-none">{row.offset}</span>
                      <span className="text-amber-300 flex-1 whitespace-nowrap">
                        {row.hex.slice(0, 8).join(" ")} &nbsp; {row.hex.slice(8).join(" ")}
                      </span>
                      <span className="text-emerald-400 whitespace-pre border-l border-zinc-800 pl-4 select-none">
                        {row.ascii}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
