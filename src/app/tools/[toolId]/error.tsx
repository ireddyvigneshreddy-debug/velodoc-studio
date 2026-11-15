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
      <div className="w-full max-w-lg p-8 rounded-3xl bg-[#12141D] border border-rose-500/20 shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Tool Workspace Encountered an Error
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            This tool encountered an unhandled document format or memory exception.
            Your other tools and browser session remain completely healthy.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-rose-300 text-left break-all select-all">
          {error.message || "An unexpected error occurred in this workspace."}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restart Workspace</span>
          </button>
          <Link
            href="/#tools"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center gap-2"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span>Switch Tool</span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
