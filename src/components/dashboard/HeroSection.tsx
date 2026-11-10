"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CommandPalette } from "@/components/common/CommandPalette";
import {
  Sparkles,
  Search,
  Zap,
  HardDrive,
  ArrowRight,
  ShieldCheck,
  Minimize2,
  Layers,
  FileImage,
  Image as ImageIcon,
} from "lucide-react";

export function HeroSection() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 text-center overflow-hidden">
        {/* Subtle radial ambient mesh glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[320px] h-[220px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Top Pill Announcement */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300 shadow-inner backdrop-blur-sm">
            <span className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-3 h-3" />
            </span>
            <span className="font-medium">
              VeloDoc Pro v2.0 • 19 Native Client-Side Document Tools
            </span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Next-Gen Client-Side{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Document, PDF &amp; Image Studio
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
            Compress to exact target KB sizes, merge documents with scan interleaving, and convert between PDF, images, and text right in your browser.
            Powered by WebAssembly, Web Workers and Canvas — zero server uploads, zero file limits, 100% private.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="#tools"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold text-sm shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Explore All 19 Tools</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-sm transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <span>Command Palette</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-white/5 border border-white/10 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Priority Quick Launchers */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Priority Tools:</span>
            </span>
            <Link
              href="/tools/compress-pdf"
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exact Compress</span>
            </Link>
            <Link
              href="/tools/merge-pdf"
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Merge PDFs</span>
            </Link>
            <Link
              href="/tools/image-to-pdf"
              className="px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Images &rarr; PDF</span>
            </Link>
            <Link
              href="/tools/pdf-to-image"
              className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>PDF &rarr; Images</span>
            </Link>
            <Link
              href="/tools/image-studio"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Passport KB Studio</span>
            </Link>
          </div>

          {/* Value Props Pills */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.02] border border-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% In-Memory Processing</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.02] border border-white/5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Zero File Size Limits</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.02] border border-white/5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hardware-Accelerated Speed</span>
            </div>
          </div>
        </div>
      </section>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
