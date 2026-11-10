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
            Merge, split, redact, sign, Bates stamp, crop, compare, and compress to exact KB targets right in your browser.
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

          {/* Value Props Pills */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
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
