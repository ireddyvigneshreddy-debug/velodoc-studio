import React from "react";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { BentoGrid } from "@/components/dashboard/BentoGrid";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lock,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-8 pb-16">
      {/* 1. Compact Hero Section */}
      <HeroSection />

      {/* 2. Bento Grid Interactive Tool Catalog */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BentoGrid />
      </div>

      {/* 3. The Client-Side Advantage (Comparison Table) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="text-center space-y-2.5 mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 font-mono">
            <Lock className="w-3 h-3 text-cyan-400" />
            Air-Gapped Privacy Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-[-0.03em]">
            Why Local In-Memory Processing Matters
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Traditional online PDF converters upload confidential tax
            returns, contracts, and medical records to remote cloud servers.
            VeloDoc Pro executes 100% inside your browser sandbox.
          </p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] premium-card overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
            {/* Cloud PDF Sites Column */}
            <div className="p-6 sm:p-8 space-y-5 bg-rose-950/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base tracking-tight">
                    Traditional Cloud Tools
                  </h3>
                  <span className="text-xs text-rose-400 font-medium">
                    Uploads files to remote servers
                  </span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-zinc-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>
                    Uploads your private documents to third-party databases
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>
                    Strict file size limits (e.g., 25MB - 50MB paywalls)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>
                    Network bandwidth lag &amp; slow remote server queues
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold shrink-0">✕</span>
                  <span>
                    Requires account sign-up and aggressive recurring upselling
                  </span>
                </li>
              </ul>
            </div>

            {/* VeloDoc Pro Column */}
            <div className="p-6 sm:p-8 space-y-5 bg-indigo-950/15 relative">
              <div className="absolute top-4 right-4">
                <span className="text-[11px] font-mono font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  100% Private
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base tracking-tight">
                    VeloDoc Pro Engine
                  </h3>
                  <span className="text-xs text-emerald-400 font-medium">
                    100% Local In-Memory WebAssembly
                  </span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>
                    Zero server uploads: Files never leave your local device
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>
                    No file size caps: Hardware-accelerated ArrayBuffers
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>
                    Instant processing: No network wait times or queues
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>
                    Completely free &amp; permissive open-source IP
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-[-0.03em]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Everything you need to know about client-side document processing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="premium-card p-5 rounded-2xl space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              Are my files uploaded anywhere?
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No. Not even a single byte is sent over the internet. VeloDoc
              Pro uses Web Workers, HTML5 Canvas, and WebAssembly to process
              files in your browser memory.
            </p>
          </div>

          <div className="premium-card p-5 rounded-2xl space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              What is the maximum file size?
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              There is no artificial limit. As long as your device has sufficient
              RAM to hold the document, you can manipulate files of hundreds of
              megabytes without restrictions.
            </p>
          </div>

          <div className="premium-card p-5 rounded-2xl space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              Can I use VeloDoc Pro offline?
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Yes! Once loaded in your browser tab, all engine routines,
              renderers, and scripts are cached locally, allowing seamless
              offline manipulation.
            </p>
          </div>

          <div className="premium-card p-5 rounded-2xl space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-pink-400 shrink-0" />
              Is VeloDoc Pro free for commercial use?
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Yes, 100%. VeloDoc Pro is built with permissive open-source
              licenses (MIT/Apache 2.0). There are no subscriptions, ads, or
              watermark paywalls.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
