"use client";

import React, { useState } from "react";
import { CommandPalette } from "@/components/common/CommandPalette";
import {
  Sparkles,
  Search,
  ShieldCheck,
  Cpu,
  Lock,
} from "lucide-react";

export function HeroSection() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <section className="relative pt-6 pb-6 sm:pt-10 sm:pb-8 text-center overflow-hidden">
        {/* Subtle radial ambient mesh glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[250px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 space-y-3.5">
          {/* Top Pill Announcement */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300 shadow-inner backdrop-blur-sm">
            <span className="p-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
              <Sparkles className="w-3 h-3" />
            </span>
            <span className="font-medium text-[11px] sm:text-xs">
              VeloDoc Pro • 30-Document Zero-Crash Batch Studio • 100% Client-Side
            </span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            High-Performance Client-Side{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              PDF &amp; Image Studio
            </span>
          </h1>

          {/* Compact Subtitle */}
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-400 leading-normal">
            Precision binary-search KB compression, 30-file batch pipelines, visual diff, and lossless format conversions.
            Zero cloud uploads • Zero tracking • Runs 100% in local browser memory.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instant Search (19 Tools)</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>

            <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero Upload
              </span>
              <span className="flex items-center gap-1 text-indigo-400">
                <Cpu className="w-3.5 h-3.5" />
                60 FPS Engine
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <Lock className="w-3.5 h-3.5" />
                Air-Gapped Privacy
              </span>
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
