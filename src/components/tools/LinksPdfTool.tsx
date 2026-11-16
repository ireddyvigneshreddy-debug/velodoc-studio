"use client";

import React, { useState } from "react";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import {
  ExtractedLink,
  auditPdfLinks,
  stripAllLinksFromPdf,
  exportLinksToCsv,
  generateSampleLinkedPdf,
} from "@/lib/link-auditor-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import { ProcessingMetrics, UploadedFileItem } from "@/types";
import {
  UploadSimple,
  Sparkle,
  CircleNotch,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  DownloadSimple,
  MagnifyingGlass,
  ShareNetwork,
} from "@/components/common/icons";

export function LinksPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [activeTab, setActiveTab] = useState<"audit" | "strip">("audit");
  const [links, setLinks] = useState<ExtractedLink[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileAdded = async (file: File) => {
    setErrorMessage(null);
    setOutputBytes(null);

    const buf = await file.arrayBuffer();
    const count = await getPdfPageCount(buf);

    setFileItem({
      id: "single",
      file,
      name: file.name,
      size: file.size,
      pageCount: count,
      status: "ready",
    });
    setOriginalBuffer(buf);

    // Run audit immediately
    setIsProcessing(true);
    try {
      const res = await auditPdfLinks(buf);
      setLinks(res.links);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Could not parse PDF hyperlink annotations.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = async () => {
    try {
      setErrorMessage(null);
      const sample = await generateSampleLinkedPdf();
      await handleFileAdded(sample);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not load sample linked document.");
    }
  };

  const handleStripLinks = async () => {
    if (!fileItem || !originalBuffer) {
      setErrorMessage("Please upload a PDF document first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const { strippedCount, pdfBytes } = await stripAllLinksFromPdf(originalBuffer);
      const endTime = performance.now();

      setOutputBytes(pdfBytes);
      const originalSize = fileItem.size;
      const processedSize = pdfBytes.byteLength;
      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = "sanitized_clean_links.pdf";

      setMetrics({
        originalSize,
        processedSize,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs: Math.round(endTime - startTime),
        downloadUrl,
        downloadFilename,
        pageCount: fileItem.pageCount || 1,
      });

      sessionHistory.recordExecution({
        toolId: "links-pdf",
        toolName: "View or Remove Links",
        inputFiles: [fileItem.name],
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs: Math.round(endTime - startTime),
        outputData: pdfBytes,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to strip hyperlinks from PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyAll = () => {
    const urls = filteredLinks.map((l) => l.url).join("\n");
    navigator.clipboard.writeText(urls);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportLinksToCsv(filteredLinks);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted_pdf_hyperlinks.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLinks = links.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return l.url.toLowerCase().includes(q) || l.domain.toLowerCase().includes(q);
  });

  if (outputBytes && metrics) {
    return (
      <ResultPreviewStudio
        metrics={metrics}
        outputBytes={outputBytes}
        outputMimeType="application/pdf"
        onAdjustSettings={() => setOutputBytes(null)}
        title="Sanitized PDF Ready (All Links Removed)"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Sample Action */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            Link Auditor & Hyperlink Stripper
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Audit, extract, or sanitize hidden external URL tracking annotations from PDF documents
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors">
            <UploadSimple className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileAdded(f);
              }}
              className="hidden"
            />
          </label>

          <button
            onClick={handleLoadSample}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#FFF5F0] text-[#C2410C] border border-[#FBDCD0] hover:bg-[#FFE8DE] flex items-center gap-1.5 transition-colors"
          >
            <Sparkle className="w-3.5 h-3.5" />
            <span>Load Sample Hyperlinked PDF</span>
          </button>
        </div>
      </div>

      {/* Target Document Info */}
      {fileItem && (
        <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-paper-200 dark:bg-charcoal-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-mono font-semibold text-zinc-950 dark:text-white">
                {fileItem.name}
              </p>
              <span className="text-[11px] font-mono text-zinc-500">
                {fileItem.pageCount} Pages • {links.length} Embedded Links Found
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setFileItem(null);
              setOriginalBuffer(null);
              setLinks([]);
            }}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900"
          >
            Change
          </button>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="paper-card p-2 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center gap-2">
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
            activeTab === "audit"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200"
          }`}
        >
          Audit & Export Table ({links.length})
        </button>
        <button
          onClick={() => setActiveTab("strip")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
            activeTab === "strip"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200"
          }`}
        >
          Strip & Sanitize External Links
        </button>
      </div>

      {/* TAB 1: AUDIT TABLE */}
      {activeTab === "audit" && (
        <div className="paper-card p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative w-full sm:w-64">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter domains or URLs..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white font-mono outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAll}
                disabled={filteredLinks.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border border-paper-300 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied All!" : "Copy URLs"}</span>
              </button>

              <button
                onClick={handleDownloadCsv}
                disabled={filteredLinks.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border border-paper-300 flex items-center gap-1.5"
              >
                <DownloadSimple className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {filteredLinks.length > 0 ? (
            <div className="border border-paper-300 dark:border-charcoal-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-paper-100 dark:bg-charcoal-900 border-b border-paper-300 dark:border-charcoal-border text-zinc-700 dark:text-zinc-300">
                  <tr>
                    <th className="py-2 px-3">Page</th>
                    <th className="py-2 px-3">Domain</th>
                    <th className="py-2 px-3">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-300 dark:divide-charcoal-border">
                  {filteredLinks.map((l) => (
                    <tr key={l.id} className="hover:bg-paper-50 dark:hover:bg-charcoal-700/50">
                      <td className="py-2 px-3 font-semibold text-zinc-950 dark:text-white">
                        Page {l.pageNumber}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 text-[10px] border border-paper-300">
                          {l.domain}
                        </span>
                      </td>
                      <td className="py-2 px-3 max-w-xs truncate text-blue-600 dark:text-blue-400">
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {l.url}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-paper-300 dark:border-charcoal-border rounded-lg text-center space-y-2">
              <ShareNetwork className="w-6 h-6 text-zinc-400 mx-auto" />
              <p className="text-xs text-zinc-500 font-mono">
                {fileItem ? "No links found in document." : "Upload a PDF or click Load Sample to audit links."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STRIP LINKS */}
      {activeTab === "strip" && (
        <div className="paper-card p-6 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Strip All External Hyperlinks & Tracking</span>
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              Removing link annotations deletes invisible `URI` tracking actions while keeping all underlying text and graphics visually intact. This prevents accidental outbound clicks and cleans up confidential document distributions.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200">
              Active Links to Strip: <strong>{links.length}</strong>
            </span>
            <button
              onClick={handleStripLinks}
              disabled={isProcessing || links.length === 0}
              className="px-5 py-2.5 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] text-white font-mono text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <CircleNotch className="w-4 h-4 animate-spin" />
                  <span>Sanitizing Document...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Strip All {links.length} Links & Download</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 text-xs font-mono">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
