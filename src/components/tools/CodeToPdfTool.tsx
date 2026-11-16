"use client";

import React, { useState } from "react";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import {
  CodeFileEntry,
  LabRecordMetadata,
  createCodeLabPdf,
  detectLanguageFromFilename,
  generateSampleLabPrograms,
} from "@/lib/code-to-pdf-engine";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import { ProcessingMetrics } from "@/types";
import {
  Code,
  UploadSimple,
  Sparkle,
  Plus,
  CircleNotch,
  FileCode,
} from "@/components/common/icons";

export function CodeToPdfTool() {
  const [files, setFiles] = useState<CodeFileEntry[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Global Academic Lab Metadata (Blank by default with placeholders)
  const [metadata, setMetadata] = useState<LabRecordMetadata>({
    studentName: "",
    rollNo: "",
    subject: "",
    experimentNo: "",
    experimentTitle: "",
    date: "",
    colorTheme: "clean-light",
    includeOutputBox: true,
    outputObservation: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load sample on click
  const handleLoadSample = () => {
    setErrorMessage(null);
    const sample = generateSampleLabPrograms();
    setFiles(sample);
    setActiveFileIndex(0);
    setMetadata({
      studentName: "K. Vignesh Reddy",
      rollNo: "26951A6701",
      subject: "Data Structures & Machine Learning Lab",
      experimentNo: "03 & 04",
      experimentTitle: "Binary Search Tree & K-Means Clustering",
      date: "15/11/2026",
      colorTheme: "clean-light",
      includeOutputBox: true,
      outputObservation: "All unit test assertions passed. Execution time verified.",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setErrorMessage(null);
    const fileArray = Array.from(uploadedFiles);
    // Guarantee indexed loading order with Promise.all to avoid async race scrambling
    const newEntries: CodeFileEntry[] = await Promise.all(
      fileArray.map(async (file) => {
        const text = await file.text();
        return {
          filename: file.name,
          code: text,
          language: detectLanguageFromFilename(file.name),
        };
      })
    );

    setFiles((prev) => [...prev, ...newEntries]);
    if (files.length === 0 && newEntries.length > 0) {
      setActiveFileIndex(0);
    }
  };

  const handleSortNatural = () => {
    setFiles((prev) =>
      [...prev].sort((a, b) =>
        a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: "base" })
      )
    );
  };

  const handleReverse = () => {
    setFiles((prev) => [...prev].reverse());
  };

  const handleMoveProgram = (idx: number, dir: "left" | "right") => {
    const target = dir === "left" ? idx - 1 : idx + 1;
    if (target < 0 || target >= files.length) return;
    setFiles((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return next;
    });
    setActiveFileIndex(target);
  };

  const handleDuplicateProgram = (idx: number) => {
    if (idx < 0 || idx >= files.length) return;
    const target = files[idx];
    const dup: CodeFileEntry = {
      filename: `${target.filename.replace(/\.([^.]+)$/, "")}_copy.$1`,
      code: target.code,
      language: target.language,
    };
    setFiles((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  };

  const handleAddNewBlankFile = () => {
    const count = files.length + 1;
    const newFile: CodeFileEntry = {
      filename: `program_${count}.py`,
      code: "# Enter or paste your source code here\nprint('Hello VeloDoc Lab!')\n",
      language: "python",
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileIndex(files.length);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex((prev) => prev - 1);
    }
  };

  const handleGeneratePdf = async () => {
    if (files.length === 0) {
      setErrorMessage("Please upload or paste at least one code program.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const pdfBytes = await createCodeLabPdf(files, metadata);
      const endTime = performance.now();

      setOutputBytes(pdfBytes);
      const totalRawCodeBytes = files.reduce((acc, f) => acc + new Blob([f.code]).size, 0);
      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = "lab_record_submission.pdf";

      setMetrics({
        originalSize: totalRawCodeBytes,
        processedSize: pdfBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs: Math.round(endTime - startTime),
        downloadUrl,
        downloadFilename,
        pageCount: Math.ceil(files.length * 1.5),
      });

      sessionHistory.recordExecution({
        toolId: "code-to-pdf",
        toolName: "Code to PDF",
        inputFiles: files.map((f) => f.filename),
        outputFileName: downloadFilename,
        outputSizeBytes: pdfBytes.byteLength,
        durationMs: Math.round(endTime - startTime),
        outputData: pdfBytes,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to render Code Lab Record PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (outputBytes && metrics) {
    return (
      <ResultPreviewStudio
        metrics={metrics}
        outputBytes={outputBytes}
        outputMimeType="application/pdf"
        onAdjustSettings={() => setOutputBytes(null)}
        title="Lab Record PDF Generated"
      />
    );
  }

  const currentFile = files[activeFileIndex];

  return (
    <div className="space-y-6">
      {/* Top Controls & Sample Action */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            Code & Academic Lab Record Compiler
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Convert up to 30 source files (.java, .py, .cpp, .c, .js, .ts, .sql) with syntax highlighting into submission-ready PDFs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors">
            <UploadSimple className="w-3.5 h-3.5" />
            <span>Upload Code Files</span>
            <input
              type="file"
              multiple
              accept=".java,.py,.c,.cpp,.cc,.h,.js,.ts,.tsx,.jsx,.html,.css,.sql,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleAddNewBlankFile}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add File Tab</span>
          </button>

          <button
            onClick={handleLoadSample}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[#FFF5F0] text-[#C2410C] border border-[#FBDCD0] hover:bg-[#FFE8DE] flex items-center gap-1.5 transition-colors"
          >
            <Sparkle className="w-3.5 h-3.5" />
            <span>Load Sample Test File</span>
          </button>
        </div>
      </div>

      {/* Academic Lab Metadata Form (Blank with clean placeholders) */}
      <div className="paper-card p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
        <div className="flex items-center justify-between border-b border-paper-300 dark:border-charcoal-border pb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-900 dark:text-zinc-100">
            Institutional Lab Record Header (Optional)
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">PDF Theme:</span>
            <button
              onClick={() => setMetadata((prev) => ({ ...prev, colorTheme: "clean-light" }))}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                metadata.colorTheme === "clean-light"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900"
                  : "bg-paper-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 border-paper-300"
              }`}
            >
              Clean Print Light
            </button>
            <button
              onClick={() => setMetadata((prev) => ({ ...prev, colorTheme: "dark-ide" }))}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                metadata.colorTheme === "dark-ide"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900"
                  : "bg-paper-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 border-paper-300"
              }`}
            >
              Dark IDE Mode
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              value={metadata.studentName}
              onChange={(e) => setMetadata({ ...metadata, studentName: e.target.value })}
              placeholder="e.g., K. Vignesh Reddy"
              className="w-full px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-[#C2410C]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mb-1">
              Roll / Hall Ticket No
            </label>
            <input
              type="text"
              value={metadata.rollNo}
              onChange={(e) => setMetadata({ ...metadata, rollNo: e.target.value })}
              placeholder="e.g., 26951A6701"
              className="w-full px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-[#C2410C]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mb-1">
              Subject / Lab Course
            </label>
            <input
              type="text"
              value={metadata.subject}
              onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
              placeholder="e.g., Essentials of Problem Solving"
              className="w-full px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-[#C2410C]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mb-1">
              Experiment Number
            </label>
            <input
              type="text"
              value={metadata.experimentNo}
              onChange={(e) => setMetadata({ ...metadata, experimentNo: e.target.value })}
              placeholder="e.g., 04"
              className="w-full px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-[#C2410C]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mb-1">
              Experiment Title
            </label>
            <input
              type="text"
              value={metadata.experimentTitle}
              onChange={(e) => setMetadata({ ...metadata, experimentTitle: e.target.value })}
              placeholder="e.g., Binary Search Tree Traversal"
              className="w-full px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-[#C2410C]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mb-1">
              Submission Date
            </label>
            <input
              type="text"
              value={metadata.date}
              onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
              placeholder="e.g., 15/11/2026"
              className="w-full px-3 py-1.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-[#C2410C]"
            />
          </div>
        </div>

        {/* Output Observation Box Toggle */}
        <div className="pt-2 border-t border-paper-300 dark:border-charcoal-border space-y-2">
          <label className="flex items-center gap-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={metadata.includeOutputBox}
              onChange={(e) => setMetadata({ ...metadata, includeOutputBox: e.target.checked })}
              className="rounded border-zinc-300 text-[#C2410C] focus:ring-[#C2410C]"
            />
            <span>Include Output / Execution Observation Box at Bottom</span>
          </label>

          {metadata.includeOutputBox && (
            <textarea
              rows={2}
              value={metadata.outputObservation}
              onChange={(e) => setMetadata({ ...metadata, outputObservation: e.target.value })}
              placeholder="Enter program output or teacher evaluation remarks..."
              className="w-full p-2.5 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white placeholder-zinc-400 outline-none focus:border-[#C2410C] font-mono"
            />
          )}
        </div>
      </div>

      {/* Multi-File Tab Editor & Smart Reordering Toolbar */}
      {files.length > 0 && currentFile ? (
        <div className="paper-card rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border overflow-hidden">
          {/* Smart Sort & Sequence Toolbar */}
          <div className="p-3 bg-paper-50 dark:bg-charcoal-900 border-b border-paper-300 dark:border-charcoal-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Programs ({files.length}):
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Active: #{activeFileIndex + 1} of {files.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSortNatural}
                className="px-2 py-1 rounded-md text-[11px] font-mono bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors cursor-pointer"
                title="Sort natural numeric (e.g. 1, 2, 10)"
              >
                Smart Name (1, 2, 10)
              </button>
              <button
                type="button"
                onClick={handleReverse}
                className="px-2 py-1 rounded-md text-[11px] font-mono bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors cursor-pointer"
              >
                Reverse
              </button>
              <button
                type="button"
                disabled={activeFileIndex === 0}
                onClick={() => handleMoveProgram(activeFileIndex, "left")}
                className="px-2 py-1 rounded-md text-[11px] font-mono bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border disabled:opacity-30 transition-colors cursor-pointer"
                title="Move current program left"
              >
                ← Left
              </button>
              <button
                type="button"
                disabled={activeFileIndex === files.length - 1}
                onClick={() => handleMoveProgram(activeFileIndex, "right")}
                className="px-2 py-1 rounded-md text-[11px] font-mono bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border disabled:opacity-30 transition-colors cursor-pointer"
                title="Move current program right"
              >
                Right →
              </button>
              <button
                type="button"
                onClick={() => handleDuplicateProgram(activeFileIndex)}
                className="px-2 py-1 rounded-md text-[11px] font-mono bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 text-zinc-800 dark:text-zinc-200 border border-paper-300 dark:border-charcoal-border transition-colors cursor-pointer"
                title="Duplicate this program"
              >
                Duplicate
              </button>
            </div>
          </div>

          {/* Tab Strip */}
          <div className="flex items-center gap-1.5 p-2 bg-paper-100 dark:bg-charcoal-900 border-b border-paper-300 dark:border-charcoal-border overflow-x-auto no-scrollbar">
            {files.map((file, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-colors shrink-0 ${
                  activeFileIndex === idx
                    ? "bg-white dark:bg-charcoal-800 text-zinc-950 dark:text-white font-semibold shadow-sm border border-paper-300 dark:border-charcoal-border"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 hover:bg-paper-200"
                }`}
              >
                <span className="text-[10px] text-[#C2410C] font-bold tabular-nums">#{idx + 1}</span>
                <button onClick={() => setActiveFileIndex(idx)} className="cursor-pointer">
                  {file.filename}
                </button>
                <button
                  onClick={() => handleRemoveFile(idx)}
                  className="text-zinc-400 hover:text-rose-600 transition-colors ml-1"
                  title="Remove program"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Current File Metadata Header */}
          <div className="p-3 bg-paper-50 dark:bg-charcoal-800/80 border-b border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={currentFile.filename}
                onChange={(e) => {
                  const updated = [...files];
                  updated[activeFileIndex].filename = e.target.value;
                  updated[activeFileIndex].language = detectLanguageFromFilename(e.target.value);
                  setFiles(updated);
                }}
                className="px-2 py-1 rounded bg-white dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs font-mono font-semibold text-zinc-950 dark:text-white outline-none w-48"
              />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 uppercase">
                {currentFile.language}
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {currentFile.code.split("\n").length} Lines
            </span>
          </div>

          {/* Code Textarea Editor */}
          <textarea
            rows={14}
            value={currentFile.code}
            onChange={(e) => {
              const updated = [...files];
              updated[activeFileIndex].code = e.target.value;
              setFiles(updated);
            }}
            placeholder="Type or paste source code..."
            className="w-full p-4 font-mono text-xs text-zinc-950 dark:text-zinc-100 bg-white dark:bg-charcoal-950 outline-none leading-relaxed resize-y border-none"
          />
        </div>
      ) : (
        <div className="paper-card p-10 rounded-xl bg-white dark:bg-charcoal-800 border-2 border-dashed border-paper-300 dark:border-charcoal-border text-center space-y-3">
          <FileCode className="w-8 h-8 text-zinc-400 mx-auto" />
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No source code files loaded
          </h4>
          <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">
            Upload .java, .py, .cpp, or .c files, add a blank file tab, or click &ldquo;Load Sample Test File&rdquo; to test instantly.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Primary Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGeneratePdf}
          disabled={isProcessing || files.length === 0}
          className="px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] text-white font-mono text-xs font-medium shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <CircleNotch className="w-4 h-4 animate-spin" />
              <span>Rendering Syntax & Pages...</span>
            </>
          ) : (
            <>
              <Code className="w-4 h-4" />
              <span>
                Compile {files.length > 0 ? `${files.length} Program${files.length > 1 ? "s" : ""}` : ""} to Lab Record PDF
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
