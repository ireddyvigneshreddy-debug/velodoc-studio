"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Download, RefreshCw, Zap, TrendingDown, Clock, ShieldCheck } from "lucide-react";
import { ProcessingMetrics } from "@/types";
import { formatFileSize, formatTimeMs } from "@/lib/utils";

interface MetricsBarProps {
  metrics: ProcessingMetrics;
  onReset: () => void;
  title?: string;
}

export function MetricsBar({
  metrics,
  onReset,
  title = "Processing Complete",
}: MetricsBarProps) {
  useEffect(() => {
    // Trigger celebratory confetti burst
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#6366F1", "#8B5CF6", "#06B6D4", "#10B981"],
      });
    } catch (e) {
      console.warn("Confetti triggered:", e);
    }
  }, []);

  const handleDownload = () => {
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.85 },
      });
    } catch {
      // ignore
    }

    const a = document.createElement("a");
    a.href = metrics.downloadUrl;
    a.download = metrics.downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isSaving = metrics.savedPercentage > 0;

  return (
    <div className="w-full bg-[#12141D] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left: Summary and Metrics Badges */}
        <div className="w-full lg:w-auto space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-base font-semibold text-white tracking-tight">
              {title}
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Ready to download
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Original Size */}
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-slate-400 block font-medium">
                Original Size
              </span>
              <span className="text-sm font-semibold text-white font-mono mt-0.5 block">
                {formatFileSize(metrics.originalSize)}
              </span>
            </div>

            {/* Output Size */}
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-slate-400 block font-medium">
                Output Size
              </span>
              <span className="text-sm font-semibold text-indigo-300 font-mono mt-0.5 block">
                {formatFileSize(metrics.processedSize)}
              </span>
            </div>

            {/* Savings or Change */}
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-slate-400 block font-medium flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-emerald-400" />
                {isSaving ? "Saved" : "Ratio"}
              </span>
              <span
                className={`text-sm font-semibold font-mono mt-0.5 block ${
                  isSaving ? "text-emerald-400" : "text-slate-300"
                }`}
              >
                {isSaving ? `-${metrics.savedPercentage}%` : "Optimized"}
              </span>
            </div>

            {/* Processing Speed */}
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-slate-400 block font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                Execution
              </span>
              <span className="text-sm font-semibold text-cyan-300 font-mono mt-0.5 block">
                {formatTimeMs(metrics.durationMs)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto px-4 py-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Process Another</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Download File</span>
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
        <span className="truncate">File: {metrics.downloadFilename}</span>
        <span className="flex items-center gap-1 text-emerald-400/90 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" /> Generated 100% in local memory
        </span>
      </div>
    </div>
  );
}
