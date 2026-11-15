import React from "react";
import Link from "next/link";
import { ArrowLeft } from "@/components/common/icons";

export const metadata = {
  title: "Guide — Precision Operations Manual",
  description: "Comprehensive step-by-step operational guide for VeloDoc Studio's 27 document tools and academic presentation studio.",
};

export default function GuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Breadcrumb */}
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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono tracking-wider uppercase bg-paper-200 text-ink-primary dark:bg-charcoal-700 dark:text-white border border-paper-300 dark:border-charcoal-border">
            Operations Manual
          </span>
          <span className="text-xs font-mono text-ink-muted">Field Protocols</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif italic text-ink-primary dark:text-white mb-4 tracking-tight">
          Mastering the VeloDoc Workbench.
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary dark:text-paper-400 font-sans leading-relaxed">
          Detailed operational instructions for binary-search compression, multi-document batch pipelines, Pro camera scanning, and institutional academic presentation generation.
        </p>
      </header>

      {/* Chapters */}
      <div className="space-y-12">
        {/* Chapter 1: Exact Size Compression */}
        <section className="paper-card p-6 sm:p-8 rounded-lg dark:bg-charcoal-800">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded bg-vermilion-light text-vermilion dark:bg-vermilion/20 flex items-center justify-center font-mono text-sm font-bold">
              01
            </span>
            <h2 className="text-xl font-serif text-ink-primary dark:text-white">
              Hitting Exact File Size Thresholds (KB / MB Target Compression)
            </h2>
          </div>
          <div className="space-y-3 text-sm text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
            <p>
              Government portals, visa submission forms, and university entrance portals often enforce strict ceiling limits (e.g., “File must be under 200 KB” or “Exactly 500 KB”).
            </p>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>
                <strong>Select “Compress PDF”</strong> from the main tool grid or press <kbd className="font-mono text-xs px-1.5 py-0.5 rounded bg-paper-200 dark:bg-charcoal-700">Cmd+K</kbd> to open the Command Palette.
              </li>
              <li>
                <strong>Choose “Target Size Mode”</strong> rather than simple preset percentage sliders.
              </li>
              <li>
                <strong>Specify your target limit in KB or MB</strong> (e.g., 200 KB). Our engine executes a binary search over resolution downsampling and JPEG quality matrices until the output file fits precisely under your threshold while maximizing visual clarity.
              </li>
              <li>
                Inspect the real-time live preview before saving to ensure text and stamps remain legible.
              </li>
            </ol>
          </div>
        </section>

        {/* Chapter 2: 30-File Batch Queue */}
        <section className="paper-card p-6 sm:p-8 rounded-lg dark:bg-charcoal-800">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/30 dark:text-[#6ee7b7] flex items-center justify-center font-mono text-sm font-bold">
              02
            </span>
            <h2 className="text-xl font-serif text-ink-primary dark:text-white">
              Multi-Document Batch Processing (Up to 30 Files)
            </h2>
          </div>
          <div className="space-y-3 text-sm text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
            <p>
              Need to compress or format an entire semester of assignments or corporate receipts at once?
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                Drop up to <strong>30 PDF or image files</strong> simultaneously into the Workbench Drop Zone.
              </li>
              <li>
                The system automatically buffers the documents into an asynchronous FIFO queue, applying throttling to prevent memory spikes on mobile browsers.
              </li>
              <li>
                Apply uniform operations (e.g., batch watermark, uniform grayscale conversion, or identical DPI compression) or configure parameters per document.
              </li>
              <li>
                Download all processed assets in a single bundle or as individual documents.
              </li>
            </ul>
          </div>
        </section>

        {/* Chapter 3: Pro Camera Document Scanner */}
        <section className="paper-card p-6 sm:p-8 rounded-lg dark:bg-charcoal-800">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded bg-[#FEF3C7] text-[#B45309] dark:bg-[#B45309]/20 dark:text-[#fde68a] flex items-center justify-center font-mono text-sm font-bold">
              03
            </span>
            <h2 className="text-xl font-serif text-ink-primary dark:text-white">
              Physical Document Capture with Pro Camera Scanner
            </h2>
          </div>
          <div className="space-y-3 text-sm text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
            <p>
              Transform your laptop webcam or smartphone browser into an archival document scanner without installing native apps:
            </p>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>
                Click the <strong>“Camera Scanner”</strong> button in the Workbench Quick-Action Dock.
              </li>
              <li>
                Grant browser video permission. The viewfinder displays real-time alignment grids to assist with positioning.
              </li>
              <li>
                Capture individual or multiple pages. Use the built-in filters (e.g., <em>Archival Document B&amp;W</em>, <em>Enhanced Contrast</em>, or <em>Color Photo</em>) to remove shadows and desk glare.
              </li>
              <li>
                Export the scanned sequence directly as an optimized, multi-page PDF.
              </li>
            </ol>
          </div>
        </section>

        {/* Chapter 4: Academic Presentation Studio */}
        <section className="paper-card p-6 sm:p-8 rounded-lg dark:bg-charcoal-800">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded bg-paper-200 text-ink-primary dark:bg-charcoal-700 dark:text-white flex items-center justify-center font-mono text-sm font-bold">
              04
            </span>
            <h2 className="text-xl font-serif text-ink-primary dark:text-white">
              IARE AAT Tech Talk &amp; Concept Video Studio
            </h2>
          </div>
          <div className="space-y-3 text-sm text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
            <p>
              Generate an official, 13-slide PowerPoint presentation matching the exact XML layout, fonts, insignias, and syllabus guidelines mandated by the Institute of Aeronautical Engineering:
            </p>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>
                Scroll to the <strong>“AI Tech-Talk &amp; Academic Presentation Studio”</strong> at the bottom of the Workbench.
              </li>
              <li>
                Input your <strong>Assessment Type</strong> (e.g., <code>AAT - TECH TALK</code>), <strong>Topic Title</strong>, <strong>Full Name</strong>, <strong>Roll Number</strong>, <strong>Branch</strong>, and <strong>Subject Name</strong>. All fields start blank for academic honesty.
              </li>
              <li>
                Optionally paste your syllabus notes or subtopics for AI-assisted technical slide curation.
              </li>
              <li>
                Click <strong>“Generate 13-Slide Presentation”</strong>. Review every slide in the live 16:9 interactive preview studio.
              </li>
              <li>
                Export the presentation as a true native <code>.pptx</code> file with fully editable text boxes and shapes, ready for projection in lecture halls.
              </li>
            </ol>
          </div>
        </section>

        {/* Chapter 5: Advanced Academic & Utility Suites */}
        <section className="paper-card p-6 sm:p-8 rounded-lg dark:bg-charcoal-800">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded bg-[#FFF5F0] text-[#C2410C] dark:bg-[#C2410C]/20 dark:text-[#ffedd5] flex items-center justify-center font-mono text-sm font-bold">
              05
            </span>
            <h2 className="text-xl font-serif text-ink-primary dark:text-white">
              Advanced Academic &amp; Institutional Document Suites
            </h2>
          </div>
          <div className="space-y-4 text-sm text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border">
                <h3 className="font-semibold text-zinc-950 dark:text-white mb-1">
                  2-in-1 ID &amp; Passport Sheet Maker
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Align front and back cards onto single A4 sheets or generate 35x45mm / 2x2&quot; passport photo grids with cut lines and target KB compression.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border">
                <h3 className="font-semibold text-zinc-950 dark:text-white mb-1">
                  Code &amp; Lab Record to PDF
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Compile .java, .py, .c, .cpp, .sql source code with Prism syntax highlighting, student metadata headers, and evaluation observation boxes.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border">
                <h3 className="font-semibold text-zinc-950 dark:text-white mb-1">
                  Offline WebAssembly OCR
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Extract text from scanned PDFs or photos in-memory, edit text side-by-side, and synthesize searchable hybrid PDFs.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border">
                <h3 className="font-semibold text-zinc-950 dark:text-white mb-1">
                  Clickable Index / Table of Contents
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Combine up to 30 chapters with true GoTo internal PDF links that jump directly to designated pages in any PDF viewer.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="mt-12 pt-8 border-t border-paper-300 dark:border-charcoal-border flex items-center justify-between">
        <Link
          href="/about"
          className="text-xs font-mono uppercase tracking-wider text-ink-muted hover:text-ink-primary dark:hover:text-white"
        >
          ← About Architecture
        </Link>
        <Link
          href="/privacy"
          className="text-xs font-mono uppercase tracking-wider text-vermilion hover:underline flex items-center gap-1"
        >
          Privacy Guarantee →
        </Link>
      </div>
    </div>
  );
}
