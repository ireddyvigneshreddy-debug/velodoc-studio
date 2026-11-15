"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { UploadedFileItem } from "@/types";
import { extractPdfTextContent } from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  Copy,
  Download,
  Search,
  Check,
  Loader2,
  AlertCircle,
} from "@/components/common/icons";

export function PdfToTextTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [extractedData, setExtractedData] = useState<{
    fullText: string;
    markdown: string;
    json: { page: number; text: string; wordCount: number }[];
    totalWords: number;
    totalChars: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"text" | "markdown" | "json">("text");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const chained = sessionHistory.consumeChainedFile();
    if (chained && chained.mimeType === "application/pdf") {
      const blob = createPdfBlob(chained.data);
      const file = new File([blob], chained.filename, { type: "application/pdf" });
      handleFileAdded([file]);
    }
  }, []);

  const handleFileAdded = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setErrorMessage(null);
    setExtractedData(null);

    const item: UploadedFileItem = {
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
    };
    setFileItem(item);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const res = await extractPdfTextContent(buffer);
      setExtractedData(res);
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage("Failed to extract text from PDF.");
      item.status = "error";
      setFileItem({ ...item });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!extractedData) return;
    const content =
      activeTab === "text"
        ? extractedData.fullText
        : activeTab === "markdown"
        ? extractedData.markdown
        : JSON.stringify(extractedData.json, null, 2);

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: "txt" | "md" | "json") => {
    if (!extractedData || !fileItem) return;

    let content = "";
    let mime = "text/plain";
    if (format === "txt") content = extractedData.fullText;
    if (format === "md") {
      content = extractedData.markdown;
      mime = "text/markdown";
    }
    if (format === "json") {
      content = JSON.stringify(extractedData.json, null, 2);
      mime = "application/json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const baseName =
      fileItem.name.substring(0, fileItem.name.lastIndexOf(".")) || "document";

    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {!fileItem ? (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{ "application/pdf": [".pdf"] }}
          multiple={false}
          title="Upload PDF to extract Text, Markdown &amp; JSON"
          subtitle="Extract structured paragraphs, word metrics, and formatted markdown page-by-page"
        />
      ) : (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#12141D] border border-zinc-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-semibold text-zinc-950 dark:text-white text-base">
                {fileItem.name}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-slate-400 mt-0.5">
                {extractedData ? (
                  <>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                      {extractedData.totalWords.toLocaleString()} words
                    </span>{" "}
                    • {extractedData.totalChars.toLocaleString()} characters •{" "}
                    {extractedData.json.length} pages
                  </>
                ) : (
                  "Extracting structured text..."
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFileItem(null);
                  setExtractedData(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 hover:text-zinc-950 dark:text-slate-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
              >
                Change PDF
              </button>

              {extractedData && (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-800 hover:text-zinc-950 dark:text-slate-300 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 border border-zinc-200 dark:border-white/10 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleDownload("txt")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.TXT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload("md")}
                      className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 dark:text-indigo-300 border border-orange-300 dark:border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.MD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload("json")}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-cyan-600/20 dark:hover:bg-cyan-600/30 dark:text-cyan-300 border border-slate-300 dark:border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.JSON</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {isProcessing ? (
            <div className="p-16 rounded-3xl bg-white dark:bg-[#12141D] border border-zinc-200 dark:border-white/10 text-center space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 text-[#C2410C] dark:text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm text-zinc-950 dark:text-white font-medium">Extracting layout streams...</p>
            </div>
          ) : extractedData ? (
            <div className="rounded-3xl bg-white dark:bg-[#12141D] border border-zinc-200 dark:border-white/10 overflow-hidden shadow-sm space-y-0">
              {/* Tabs & Search */}
              <div className="p-3 bg-zinc-50 dark:bg-[#0E1017] border-b border-zinc-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex rounded-xl bg-zinc-100 dark:bg-white/5 p-1 border border-zinc-200 dark:border-white/10">
                  <button
                    onClick={() => setActiveTab("text")}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      activeTab === "text"
                        ? "bg-[#C2410C] text-white shadow-sm font-semibold"
                        : "text-zinc-700 hover:text-zinc-950 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    Raw Text
                  </button>
                  <button
                    onClick={() => setActiveTab("markdown")}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      activeTab === "markdown"
                        ? "bg-[#C2410C] text-white shadow-sm font-semibold"
                        : "text-zinc-700 hover:text-zinc-950 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => setActiveTab("json")}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      activeTab === "json"
                        ? "bg-[#C2410C] text-white shadow-sm font-semibold"
                        : "text-zinc-700 hover:text-zinc-950 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    JSON Stream
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inside text..."
                    className="w-full bg-transparent text-zinc-950 dark:text-white placeholder-zinc-500 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Text viewer */}
              <div className="p-6 max-h-[500px] overflow-auto font-mono text-xs text-zinc-900 dark:text-slate-300 leading-relaxed bg-white dark:bg-[#07080C] whitespace-pre-wrap selection:bg-orange-500/20 dark:selection:bg-emerald-500/30">
                {activeTab === "text" && extractedData.fullText}
                {activeTab === "markdown" && extractedData.markdown}
                {activeTab === "json" && JSON.stringify(extractedData.json, null, 2)}
              </div>
            </div>
          ) : null}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mobile Sticky Thumb-Zone Action Bar */}
          {extractedData && (
            <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-safe bg-white/95 dark:bg-[#05060B]/90 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 md:hidden flex items-center justify-between gap-3 shadow-lg">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-3 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-transparent"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload("txt")}
                className="flex-1 py-3 px-3 rounded-xl bg-[#C2410C] active:bg-[#A8370A] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .TXT</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
