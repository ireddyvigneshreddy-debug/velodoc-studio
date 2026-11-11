"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, ShieldCheck } from "lucide-react";

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
      <div className="w-full max-w-lg p-8 rounded-3xl bg-[#12141D] border border-rose-500/20 shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Unexpected Client Issue Intercepted
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            VeloDoc Studio prevented a browser freeze. Your local files were not
            compromised and never left your device.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-rose-300 text-left break-all select-all">
          {error.message || "An unexpected error occurred."}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span>Return to Studio Home</span>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-medium pt-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero Server Uploads • Zero Data Stored</span>
        </div>
      </div>
    </div>
  );
}
