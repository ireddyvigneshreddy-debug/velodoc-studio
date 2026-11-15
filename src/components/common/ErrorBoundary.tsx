"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Copy, Check, ShieldCheck } from "@/components/common/icons";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ToolErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[VeloDoc ToolErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn("Error in onReset:", e);
      }
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    });
  };

  private handleCopyDiagnostics = () => {
    const diag = [
      `VeloDoc Studio Diagnostic Report`,
      `Time: ${new Date().toISOString()}`,
      `Error: ${this.state.error?.name}: ${this.state.error?.message}`,
      `Stack: ${this.state.error?.stack || "N/A"}`,
      `Component Stack: ${this.state.errorInfo?.componentStack || "N/A"}`,
    ].join("\n");

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(diag);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg =
        this.state.error?.message ||
        "An unexpected error occurred while processing document data.";

      return (
        <div className="w-full max-w-2xl mx-auto my-8 p-6 sm:p-8 rounded-lg paper-card bg-white dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border shadow-paper relative overflow-hidden text-center space-y-6">
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="p-3.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-serif text-ink-primary dark:text-white tracking-tight">
                {this.props.fallbackTitle || "Workspace Recovered Safely"}
              </h2>
              <p className="text-xs sm:text-sm text-ink-secondary dark:text-paper-400 max-w-md mx-auto font-sans">
                A localized processing error was intercepted. Your session and device
                RAM have been protected from crashing.
              </p>
            </div>

            <div className="w-full p-3 rounded-md bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-left text-xs font-mono text-rose-600 dark:text-rose-400 break-all select-all">
              {errorMsg}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset This Workspace</span>
              </button>

              <button
                type="button"
                onClick={this.handleCopyDiagnostics}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center gap-1.5"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Report</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Diagnostics</span>
                  </>
                )}
              </button>

              <Link
                href="/#tools"
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>All Tools</span>
              </Link>
            </div>

            <div className="pt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero data lost — all processing remains 100% private on your device.</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export class GlobalErrorBoundary extends Component<{ children: ReactNode }, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[VeloDoc GlobalErrorBoundary] Fatal UI error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#090A0F] text-white">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#12141D] border border-white/10 text-center space-y-6 shadow-2xl">
            <div className="p-4 mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold">Studio Interface Restored</h1>
              <p className="text-xs text-slate-400">
                An interface error occurred. You can reload the application safely.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg"
            >
              Reload Studio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
