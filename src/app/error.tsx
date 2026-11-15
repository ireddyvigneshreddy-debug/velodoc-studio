"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, ShieldCheck } from "@/components/common/icons";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VeloDoc App Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-8 rounded-2xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border shadow-paper text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-serif font-bold text-ink-primary dark:text-white tracking-tight">
            Unexpected Client Issue Intercepted
          </h1>
          <p className="text-xs text-ink-muted dark:text-paper-400 max-w-sm mx-auto font-sans">
            VeloDoc Studio prevented a browser freeze. Your local files were not
            compromised and never left your device.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-xs font-mono text-rose-600 dark:text-rose-400 text-left break-all select-all">
          {error.message || "An unexpected error occurred."}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-paper cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 border border-paper-300 dark:border-charcoal-border text-ink-primary dark:text-white font-medium text-xs transition-colors flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5 text-ink-muted" />
            <span>Return to Studio Home</span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#2E5A44] dark:text-[#6ee7b7] font-medium pt-2 font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero Server Uploads • Zero Data Stored</span>
        </div>
      </div>
    </div>
  );
}
