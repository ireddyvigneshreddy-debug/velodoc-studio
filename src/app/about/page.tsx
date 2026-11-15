import React from "react";
import Link from "next/link";
import { ShieldCheck, Cpu, ArrowLeft, Lightning, Lock, CheckCircle, GithubIcon } from "@/components/common/icons";

export const metadata = {
  title: "About — Philosophy & Architecture",
  description: "The engineering philosophy and client-side WebAssembly architecture behind VeloDoc Studio.",
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Breadcrumb / Back Link */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-muted hover:text-ink-primary dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Workbench
        </Link>
      </div>

      {/* Header */}
      <header className="border-b border-paper-300 dark:border-charcoal-border pb-8 mb-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono tracking-wider uppercase bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/40 dark:text-[#6ee7b7] border border-[#C4DFD5] dark:border-[#143A2F]">
            Architectural Colophon
          </span>
          <span className="text-xs font-mono text-ink-muted">v2.4.0 • Master Build</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif italic text-ink-primary dark:text-white mb-4 tracking-tight">
          Documents Belong on Your Hardware.
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary dark:text-paper-400 font-sans leading-relaxed">
          VeloDoc Studio is a precision document engineering workbench designed on one absolute premise: your sensitive contracts, medical records, financial statements, and academic research must never traverse an opaque third-party cloud server.
        </p>
      </header>

      {/* Main Narrative */}
      <section className="space-y-12">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif text-ink-primary dark:text-white mb-4">
            The Client-Side Imperative
          </h2>
          <div className="prose prose-neutral dark:prose-invert font-sans text-ink-secondary dark:text-paper-400 leading-relaxed space-y-4">
            <p>
              Most online PDF utilities operate as centralized data sinks. When you click “Compress” or “Merge” on legacy web tools, your unencrypted PDF travels over the wire to a remote server cluster where it is converted, written to temporary disks, and held indefinitely in log streams or cloud buckets.
            </p>
            <p>
              VeloDoc rejects this model completely. By compiling modern document processing engines into WebAssembly and executing them inside isolated browser Web Workers, every byte manipulation—from binary-search compression to digital signatures and presentation generation—happens directly in your device’s volatile memory. When you close the browser tab, your data ceases to exist anywhere in the universe.
            </p>
          </div>
        </div>

        {/* 4 Architectural Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="paper-card p-6 rounded-lg dark:bg-charcoal-800">
            <div className="w-9 h-9 rounded bg-vermilion-light text-vermilion dark:bg-vermilion/20 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-ink-primary dark:text-white mb-1.5">
              100% Zero Server Uploads
            </h3>
            <p className="text-sm text-ink-secondary dark:text-paper-400 leading-relaxed">
              Every cryptographic hash, canvas rasterization, and PDF object stream manipulation executes locally in sandbox memory. Zero cloud storage, zero tracking telemetry.
            </p>
          </div>

          <div className="paper-card p-6 rounded-lg dark:bg-charcoal-800">
            <div className="w-9 h-9 rounded bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/30 dark:text-[#6ee7b7] flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-ink-primary dark:text-white mb-1.5">
              Binary-Search Compression
            </h3>
            <p className="text-sm text-ink-secondary dark:text-paper-400 leading-relaxed">
              Unlike dumb lossy quantizers that guess blindly, our exact target compressor runs a mathematical binary search across JPEG DCT matrices and downsampling resolutions to hit your exact KB/MB threshold.
            </p>
          </div>

          <div className="paper-card p-6 rounded-lg dark:bg-charcoal-800">
            <div className="w-9 h-9 rounded bg-[#FEF3C7] text-[#B45309] dark:bg-[#B45309]/20 dark:text-[#fde68a] flex items-center justify-center mb-4">
              <Lightning className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-ink-primary dark:text-white mb-1.5">
              30-File Zero-Crash Queue
            </h3>
            <p className="text-sm text-ink-secondary dark:text-paper-400 leading-relaxed">
              Chunked batch processing handles up to 30 files concurrently with automated memory recycling, protecting mobile devices and low-spec machines from browser tab termination.
            </p>
          </div>

          <div className="paper-card p-6 rounded-lg dark:bg-charcoal-800">
            <div className="w-9 h-9 rounded bg-paper-200 text-ink-primary dark:bg-charcoal-700 dark:text-white flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-ink-primary dark:text-white mb-1.5">
              Institutional Master Standards
            </h3>
            <p className="text-sm text-ink-secondary dark:text-paper-400 leading-relaxed">
              Our presentation and document engines replicate authentic institutional Master Slide XML geometry, embedded college insignias, and strict academic syllabus structures.
            </p>
          </div>
        </div>

        {/* System Specs Table */}
        <div className="border border-paper-300 dark:border-charcoal-border rounded-lg overflow-hidden bg-white dark:bg-charcoal-800">
          <div className="px-5 py-3.5 bg-paper-100 dark:bg-charcoal-700 border-b border-paper-300 dark:border-charcoal-border flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider font-semibold text-ink-primary dark:text-white">
              Hardware Runtime Specifications
            </span>
            <span className="text-[11px] font-mono text-ink-muted">Wasm / Client-Only</span>
          </div>
          <div className="divide-y divide-paper-200 dark:divide-charcoal-border text-sm">
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-ink-secondary dark:text-paper-400">PDF Core Processing</span>
              <span className="font-mono text-xs font-medium text-ink-primary dark:text-white">pdf-lib 1.17 + pdfjs-dist Wasm</span>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-ink-secondary dark:text-paper-400">Presentation Compiler</span>
              <span className="font-mono text-xs font-medium text-ink-primary dark:text-white">pptxgenjs 3.12 (Isolated Polyfills)</span>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-ink-secondary dark:text-paper-400">Image Optical Pipeline</span>
              <span className="font-mono text-xs font-medium text-ink-primary dark:text-white">HTML5 2D Canvas + Web Workers</span>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-ink-secondary dark:text-paper-400">Data Transmission</span>
              <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> 0.00 KB Ingress / Egress
              </span>
            </div>
          </div>
        </div>

        {/* Team & Open Source */}
        <div className="pt-6 border-t border-paper-300 dark:border-charcoal-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-ink-primary dark:text-white">
              Open Source & Community Driven
            </h4>
            <p className="text-xs text-ink-muted mt-0.5">
              Inspected, verified, and audited by developers worldwide.
            </p>
          </div>
          <a
            href="https://github.com/vigneshreddy-dev/velodoc-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-medium border border-paper-300 dark:border-charcoal-border hover:bg-paper-100 dark:hover:bg-charcoal-700 transition-colors"
          >
            <GithubIcon className="w-4 h-4" />
            Inspect Source on GitHub
          </a>
        </div>
      </section>
    </div>
  );
}
