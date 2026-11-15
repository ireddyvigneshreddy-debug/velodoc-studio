import React from "react";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { BentoGrid } from "@/components/dashboard/BentoGrid";
import { TechTalkPptStudio } from "@/components/ppt/TechTalkPptStudio";
import {
  CheckCircle,
  XCircle,
  Question,
  Lock,
} from "@/components/common/icons";

export default function HomePage() {
  return (
    <div className="space-y-12 pb-20">
      {/* 1. Asymmetric Editorial Workbench Split Header */}
      <HeroSection />

      {/* 2. 5-Column Precision Tool Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BentoGrid />
      </div>

      {/* 3. The Client-Side Advantage (Comparison Matrix) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="text-center space-y-2 mb-8">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#1B4D3E] dark:text-[#6ee7b7] px-2.5 py-0.5 rounded bg-[#EDF5F2] dark:bg-[#143A2F]/40 border border-[#C4DFD5] dark:border-[#143A2F]">
            <Lock className="w-3 h-3" />
            Air-Gapped Privacy Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary dark:text-white tracking-tight">
            Why In-Memory Processing Matters
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary dark:text-paper-400 max-w-xl mx-auto font-sans">
            Traditional online PDF converters upload confidential tax returns, contracts, and student records to remote servers. VeloDoc Studio executes 100% inside your browser sandbox.
          </p>
        </div>

        <div className="border border-paper-300 dark:border-charcoal-border rounded-lg overflow-hidden shadow-paper bg-white dark:bg-charcoal-800">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-paper-300 dark:divide-charcoal-border">
            {/* Cloud PDF Sites Column */}
            <div className="p-6 sm:p-8 space-y-5 bg-paper-100/60 dark:bg-charcoal-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-ink-primary dark:text-white text-sm">
                    Traditional Cloud Converters
                  </h3>
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-mono">
                    Uploads files to remote servers
                  </span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-ink-secondary dark:text-paper-400 font-sans">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Uploads your private documents to third-party databases and log streams</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Strict file size limits (e.g., 25 MB paywalls and subscription gates)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Network bandwidth latency, upload bottlenecks, and remote queue lag</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>Mandatory account registration and aggressive recurring marketing</span>
                </li>
              </ul>
            </div>

            {/* VeloDoc Studio Column */}
            <div className="p-6 sm:p-8 space-y-5 bg-white dark:bg-charcoal-800 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/40 dark:text-[#6ee7b7] flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-sans font-semibold text-ink-primary dark:text-white text-sm">
                      VeloDoc Local Engine
                    </h3>
                    <span className="text-xs text-[#1B4D3E] dark:text-[#6ee7b7] font-mono">
                      100% Local In-Memory WebAssembly
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold text-[#1B4D3E] bg-[#EDF5F2] dark:bg-[#143A2F]/50 dark:text-[#6ee7b7] px-2 py-0.5 rounded border border-[#C4DFD5] dark:border-[#143A2F]">
                  100% Private
                </span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-ink-primary dark:text-white font-sans">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Zero server uploads: Files never leave your local browser RAM</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span>No artificial file size caps: Hardware-accelerated typed ArrayBuffers</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Instant processing: Zero network latency, queue waits, or server downtime</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span>Completely open-source, free, and unrestricted for academic &amp; personal use</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
        <div className="text-center space-y-1.5 mb-6">
          <h2 className="text-xl sm:text-2xl font-serif text-ink-primary dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted font-sans">
            Clear facts regarding client-side WebAssembly document processing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800 space-y-2">
            <h4 className="text-sm font-semibold text-ink-primary dark:text-white flex items-center gap-2">
              <Question className="w-4 h-4 text-vermilion shrink-0" />
              Are my documents uploaded to any server?
            </h4>
            <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
              No. Not a single byte is sent over the internet. VeloDoc Studio uses HTML5 Canvas, typed arrays, and WebAssembly compiled modules to execute operations entirely inside your browser memory.
            </p>
          </div>

          <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800 space-y-2">
            <h4 className="text-sm font-semibold text-ink-primary dark:text-white flex items-center gap-2">
              <Question className="w-4 h-4 text-vermilion shrink-0" />
              What is the maximum file size limit?
            </h4>
            <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
              There is no artificial cap. As long as your device has enough RAM to hold the document buffer, you can manipulate files of hundreds of megabytes without paywalls or limitations.
            </p>
          </div>

          <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800 space-y-2">
            <h4 className="text-sm font-semibold text-ink-primary dark:text-white flex items-center gap-2">
              <Question className="w-4 h-4 text-vermilion shrink-0" />
              Can I operate VeloDoc Studio offline?
            </h4>
            <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
              Yes. Once loaded in your browser tab, all engine routines, WebAssembly binaries, and presentation generators are cached locally, allowing complete offline use on airplanes or remote sites.
            </p>
          </div>

          <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800 space-y-2">
            <h4 className="text-sm font-semibold text-ink-primary dark:text-white flex items-center gap-2">
              <Question className="w-4 h-4 text-vermilion shrink-0" />
              Is VeloDoc Studio free for educational use?
            </h4>
            <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
              Yes, 100%. VeloDoc Studio is open source under permissive licensing. Students and faculty can generate IARE Tech Talks and format research papers freely without subscriptions or watermarks.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Flagship AI Tech-Talk & Academic Presentation Studio */}
      <section id="tech-talk-ppt-studio" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <TechTalkPptStudio />
      </section>
    </div>
  );
}
