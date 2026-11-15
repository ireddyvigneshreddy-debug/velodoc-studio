"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutGrid, Home } from "@/components/common/icons";

export default function ToolPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VeloDoc Tool Route Error]:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-8 rounded-2xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border shadow-paper text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-serif font-bold text-ink-primary dark:text-white tracking-tight">
            Tool Workspace Encountered an Error
          </h2>
          <p className="text-xs text-ink-muted dark:text-paper-400 max-w-sm mx-auto font-sans">
            This tool encountered an unhandled document format or memory exception.
            Your other tools and browser session remain completely healthy.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs font-mono text-rose-600 dark:text-rose-400 text-left break-all select-all">
          {error.message || "An unexpected error occurred in this workspace."}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-paper cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restart Workspace</span>
          </button>
          <Link
            href="/#tools"
            className="px-4 py-2 rounded-lg bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 border border-paper-300 dark:border-charcoal-border text-ink-primary dark:text-white font-medium text-xs transition-colors flex items-center gap-2"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-[#93c5fd]" />
            <span>Switch Tool</span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 border border-paper-300 dark:border-charcoal-border text-ink-primary dark:text-white font-medium text-xs transition-colors flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5 text-ink-muted" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
