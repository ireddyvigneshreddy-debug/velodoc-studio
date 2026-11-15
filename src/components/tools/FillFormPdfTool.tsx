"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import {
  ParsedFormField,
  parsePdfFormFields,
  fillAndFlattenPdfForm,
  generateSampleFillableFormPdf,
} from "@/lib/form-filler-pdf-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import { ProcessingMetrics, UploadedFileItem } from "@/types";
import {
  Check,
  UploadSimple,
  Sparkle,
  CircleNotch,
  FileText,
  Lock,
  ArrowRight,
  ShieldCheck,
  WarningCircle,
} from "@/components/common/icons";

export function FillFormPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [hasForm, setHasForm] = useState(true);
  const [fields, setFields] = useState<ParsedFormField[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(false);

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

    // Parse form fields
    const parsed = await parsePdfFormFields(buf);
    setHasForm(parsed.hasForm);
    setFields(parsed.fields);

    const initVals: Record<string, string | boolean> = {};
    parsed.fields.forEach((f) => {
      initVals[f.name] = f.currentValue;
    });
    setValues(initVals);
  };

  const handleLoadSample = async () => {
    try {
      setErrorMessage(null);
      const sample = await generateSampleFillableFormPdf();
      await handleFileAdded(sample);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not load sample fillable AcroForm.");
    }
  };

  const handleSaveAndFill = async () => {
    if (!fileItem || !originalBuffer) {
      setErrorMessage("Please upload a fillable PDF first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const pdfBytes = await fillAndFlattenPdfForm(originalBuffer, values, flatten);
      const endTime = performance.now();

      setOutputBytes(pdfBytes);
      const originalSize = fileItem.size;
      const processedSize = pdfBytes.byteLength;
      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = "filled_form_document.pdf";

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
        toolId: "fill-form-pdf",
        toolName: "Interactive Form Filler & Flattener",
        inputFiles: [fileItem.name],
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs: Math.round(endTime - startTime),
        outputData: pdfBytes,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to fill and save PDF form.");
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
        title={flatten ? "Locked & Flattened Form Ready" : "Interactive Filled PDF Ready"}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Sample Action */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            Interactive PDF Form Filler & Flattener
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Parse AcroForm fields dynamically, fill out applications, and lock fields into permanent vector paths
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors">
            <UploadSimple className="w-3.5 h-3.5" />
            <span>Upload Form PDF</span>
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
            <span>Load Sample Fillable Form</span>
          </button>
        </div>
      </div>

      {/* Target Document Banner */}
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
                {fileItem.pageCount} Pages • {fields.length} Interactive Fields Detected
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setFileItem(null);
              setOriginalBuffer(null);
              setFields([]);
            }}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900"
          >
            Change
          </button>
        </div>
      )}

      {/* Non-Interactive Alert */}
      {fileItem && !hasForm && (
        <div className="paper-card p-6 rounded-xl bg-amber-50/70 border border-amber-300 text-zinc-900 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs font-mono">
            <WarningCircle className="w-4 h-4 text-amber-700" />
            <span>No Interactive AcroForm Fields Detected</span>
          </div>
          <p className="text-xs text-amber-950/80 leading-relaxed font-sans">
            This PDF is a flat or scanned document without embedded interactive AcroForm text inputs or checkboxes. You can open it in our Sign & Annotate Studio to click and type anywhere!
          </p>
          <div>
            <Link
              href="/tools/sign-pdf"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-mono hover:bg-zinc-800 transition-colors"
            >
              <span>Open in Sign & Annotate Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Dynamic Field Form List */}
      {fileItem && hasForm && fields.length > 0 && (
        <div className="paper-card p-6 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-5">
          <div className="flex items-center justify-between border-b border-paper-300 dark:border-charcoal-border pb-3">
            <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-900 dark:text-zinc-100">
              Fillable Document Fields ({fields.length})
            </h3>

            {/* Flatten & Lock Form Toggle */}
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(e) => setFlatten(e.target.checked)}
                className="rounded border-zinc-300 text-[#C2410C] focus:ring-[#C2410C]"
              />
              <span className="font-semibold flex items-center gap-1 text-[#C2410C]">
                <Lock className="w-3.5 h-3.5" />
                Flatten & Lock Form (Make Non-Editable)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300">
                  {field.name}
                </label>

                {field.type === "text" && (
                  <input
                    type="text"
                    value={String(values[field.name] ?? "")}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white font-mono outline-none focus:border-[#C2410C]"
                  />
                )}

                {field.type === "checkbox" && (
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.name])}
                      onChange={(e) => setValues({ ...values, [field.name]: e.target.checked })}
                      className="rounded border-zinc-300 text-[#C2410C] focus:ring-[#C2410C]"
                    />
                    <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200">
                      {Boolean(values[field.name]) ? "Checked" : "Unchecked"}
                    </span>
                  </label>
                )}

                {field.type === "dropdown" && (
                  <select
                    value={String(values[field.name] ?? "")}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs text-zinc-950 dark:text-white font-mono outline-none focus:border-[#C2410C]"
                  >
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Primary Action Button */}
      {fileItem && hasForm && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveAndFill}
            disabled={isProcessing}
            className="px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] text-white font-mono text-xs font-medium shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <CircleNotch className="w-4 h-4 animate-spin" />
                <span>Applying Form Fields...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{flatten ? "Save & Lock Permanent Form" : "Save Filled Interactive PDF"}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
