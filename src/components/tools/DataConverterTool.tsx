"use client";

import React, { useState, useEffect, useCallback } from "react";
import { triggerFileDownload } from "@/lib/batch-queue-engine";
import {
  Copy,
  Check,
  Download,
  ArrowsClockwise,
  AlertCircle,
  Sparkle,
} from "@/components/common/icons";

type DataFormat = "json" | "csv" | "markdown";

const SAMPLE_DATA = [
  { id: 1, name: "Ada Lovelace", role: "Computing Pioneer", status: "Active", score: 98 },
  { id: 2, name: "Alan Turing", role: "Cryptanalyst & Logic", status: "Active", score: 99 },
  { id: 3, name: "Grace Hopper", role: "Compiler Architect", status: "Active", score: 95 },
  { id: 4, name: "Claude Shannon", role: "Information Theory", status: "Active", score: 96 },
];

export function DataConverterTool() {
  const [sourceFormat, setSourceFormat] = useState<DataFormat>("json");
  const [targetFormat, setTargetFormat] = useState<DataFormat>("csv");

  const [inputText, setInputText] = useState(() => JSON.stringify(SAMPLE_DATA, null, 2));
  const [outputText, setOutputText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Parsing helpers
  const parseJsonToRows = (text: string): Record<string, unknown>[] => {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => (typeof item === "object" && item !== null ? item : { value: item }));
    }
    if (typeof parsed === "object" && parsed !== null) {
      return [parsed as Record<string, unknown>];
    }
    throw new Error("JSON must be an array of objects or an object.");
  };

  const parseCsvToRows = (text: string): Record<string, unknown>[] => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];

    // Simple delimiter detection
    const firstLine = lines[0];
    const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

    // Header row
    const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, "").trim());
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map((v) => v.replace(/^["']|["']$/g, "").trim());
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        const val = values[idx] ?? "";
        // Auto convert numbers or booleans
        if (!isNaN(Number(val)) && val !== "") {
          obj[h] = Number(val);
        } else if (val.toLowerCase() === "true") {
          obj[h] = true;
        } else if (val.toLowerCase() === "false") {
          obj[h] = false;
        } else {
          obj[h] = val;
        }
      });
      rows.push(obj);
    }
    return rows;
  };

  const parseMarkdownToRows = (text: string): Record<string, unknown>[] => {
    const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("|"));
    if (lines.length < 2) throw new Error("Markdown table must have at least a header row and data rows.");

    const parseCells = (line: string) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());

    const headers = parseCells(lines[0]);
    // Skip separator line if present (e.g. |---|---|)
    const startIndex = lines[1].includes("---") ? 2 : 1;

    const rows: Record<string, unknown>[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const cells = parseCells(lines[i]);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] ?? "";
      });
      rows.push(obj);
    }
    return rows;
  };

  // Formatting helpers
  const rowsToCsv = (rows: Record<string, unknown>[]): string => {
    if (rows.length === 0) return "";
    const headers = Array.from(new Set(rows.flatMap(Object.keys)));
    const headerLine = headers.map((h) => (h.includes(",") ? `"${h}"` : h)).join(",");

    const lines = rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h] !== undefined ? String(r[h]) : "";
          return val.includes(",") || val.includes("\n") ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(",")
    );

    return [headerLine, ...lines].join("\n");
  };

  const rowsToMarkdown = (rows: Record<string, unknown>[]): string => {
    if (rows.length === 0) return "";
    const headers = Array.from(new Set(rows.flatMap(Object.keys)));
    const headerLine = `| ${headers.join(" | ")} |`;
    const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
    const bodyLines = rows.map(
      (r) => `| ${headers.map((h) => (r[h] !== undefined ? String(r[h]) : "")).join(" | ")} |`
    );
    return [headerLine, separatorLine, ...bodyLines].join("\n");
  };

  const handleConvert = useCallback(() => {
    if (!inputText.trim()) {
      setOutputText("");
      setErrorMessage(null);
      return;
    }

    try {
      setErrorMessage(null);
      let rows: Record<string, unknown>[] = [];

      if (sourceFormat === "json") {
        rows = parseJsonToRows(inputText);
      } else if (sourceFormat === "csv") {
        rows = parseCsvToRows(inputText);
      } else if (sourceFormat === "markdown") {
        rows = parseMarkdownToRows(inputText);
      }

      let result = "";
      if (targetFormat === "json") {
        result = JSON.stringify(rows, null, 2);
      } else if (targetFormat === "csv") {
        result = rowsToCsv(rows);
      } else if (targetFormat === "markdown") {
        result = rowsToMarkdown(rows);
      }

      setOutputText(result);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to parse input data.");
    }
  }, [inputText, sourceFormat, targetFormat]);

  useEffect(() => {
    handleConvert();
  }, [handleConvert]);

  const handleSwap = () => {
    if (!outputText) return;
    setInputText(outputText);
    const prevSource = sourceFormat;
    setSourceFormat(targetFormat);
    setTargetFormat(prevSource);
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!outputText) return;
    const extensions = { json: "json", csv: "csv", markdown: "md" };
    const mimes = {
      json: "application/json",
      csv: "text/csv",
      markdown: "text/markdown",
    };

    const ext = extensions[targetFormat];
    const mime = mimes[targetFormat];
    const blob = new Blob([outputText], { type: mime });
    triggerFileDownload(blob, `converted_dataset.${ext}`);
  };

  const handleLoadSample = () => {
    setSourceFormat("json");
    setTargetFormat("csv");
    setInputText(JSON.stringify(SAMPLE_DATA, null, 2));
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner & Sample Action */}
      <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            JSON ↔ CSV ↔ Markdown Table Converter
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Convert structured data instantly with bidirectional syntax mapping and 1-click downloads.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="px-3 py-1.5 rounded-xl text-xs font-mono bg-orange-50 text-[#C2410C] border border-orange-200 dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkle className="w-3.5 h-3.5" />
          <span>Load Sample Data</span>
        </button>
      </div>

      {/* Format Selectors Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border">
        {/* Source Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono font-semibold uppercase text-zinc-500">From:</span>
          <div className="grid grid-cols-3 gap-1 bg-white dark:bg-charcoal-700 p-1 rounded-xl border border-zinc-200 dark:border-charcoal-border">
            {[
              { id: "json", label: "JSON" },
              { id: "csv", label: "CSV" },
              { id: "markdown", label: "Markdown" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSourceFormat(f.id as DataFormat)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                  sourceFormat === f.id
                    ? "bg-[#C2410C] text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={handleSwap}
          className="p-2 rounded-xl bg-white dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border hover:bg-zinc-100 dark:hover:bg-charcoal-600 text-zinc-600 dark:text-zinc-300 transition-colors"
          title="Swap Source and Target"
        >
          <ArrowsClockwise className="w-4 h-4" />
        </button>

        {/* Target Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono font-semibold uppercase text-zinc-500">To:</span>
          <div className="grid grid-cols-3 gap-1 bg-white dark:bg-charcoal-700 p-1 rounded-xl border border-zinc-200 dark:border-charcoal-border">
            {[
              { id: "json", label: "JSON" },
              { id: "csv", label: "CSV" },
              { id: "markdown", label: "Markdown" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTargetFormat(f.id as DataFormat)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                  targetFormat === f.id
                    ? "bg-[#C2410C] text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Split Code View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input Textarea */}
        <div className="p-4 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-zinc-500">
              Input ({sourceFormat.toUpperCase()})
            </span>
            <button
              type="button"
              onClick={() => setInputText("")}
              className="text-[11px] font-mono text-zinc-400 hover:text-rose-500 transition-colors"
            >
              Clear
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste raw data here..."
            rows={16}
            className="w-full p-3.5 rounded-xl font-mono text-xs bg-zinc-50 dark:bg-[#0F111A] border border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-zinc-200 outline-none focus:border-[#C2410C] resize-y"
          />
        </div>

        {/* Output Textarea */}
        <div className="p-4 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-[#C2410C]">
              Converted Output ({targetFormat.toUpperCase()})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!outputText}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-100 dark:bg-charcoal-700 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!outputText}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#C2410C] text-white hover:bg-[#9A3412] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={outputText}
            placeholder="Converted output will appear here..."
            rows={16}
            className="w-full p-3.5 rounded-xl font-mono text-xs bg-zinc-50 dark:bg-[#0F111A] border border-zinc-200 dark:border-white/10 text-zinc-950 dark:text-emerald-400 outline-none resize-y select-all"
          />
        </div>
      </div>
    </div>
  );
}
