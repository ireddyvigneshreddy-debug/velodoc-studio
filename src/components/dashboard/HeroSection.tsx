"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CommandPalette } from "@/components/common/CommandPalette";
import {
  Sparkles,
  ArrowRight,
  Camera,
  Layers,
  Trash2,
  GitCompare,
  Minimize2,
} from "lucide-react";

const EVERYDAY_INTENT_CHIPS = [
  {
    id: "shrink-200kb",
    label: "Shrink PDF to exact 200 KB",
    icon: Minimize2,
    href: "/tools/compress-pdf?target=200kb",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25 hover:border-emerald-400/50 hover:bg-emerald-500/15",
  },
  {
    id: "camera-scan",
    label: "Scan pages with Camera → PDF",
    icon: Camera,
    href: "/tools/image-to-pdf?scan=true",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25 hover:border-cyan-400/50 hover:bg-cyan-500/15",
  },
  {
    id: "combine-30",
    label: "Combine up to 30 PDFs",
    icon: Layers,
    href: "/tools/merge-pdf",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/25 hover:border-indigo-400/50 hover:bg-indigo-500/15",
  },
  {
    id: "delete-pages",
    label: "Delete unwanted pages",
    icon: Trash2,
    href: "/tools/remove-pages",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/25 hover:border-rose-400/50 hover:bg-rose-500/15",
  },
  {
    id: "compare-docs",
    label: "Compare 2–30 PDFs",
    icon: GitCompare,
    href: "/tools/compare-pdf",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/25 hover:border-violet-400/50 hover:bg-violet-500/15",
  },
];

export function HeroSection() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <section className="relative pt-4 pb-4 sm:pt-7 sm:pb-5 text-center overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 space-y-3.5">
          {/* Top Pill Announcement with Live Telemetry */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-xs text-zinc-300 shadow-inner">
            <span className="p-0.5 rounded-full bg-indigo-500/20 text-cyan-300">
              <Sparkles className="w-3 h-3" />
            </span>
            <span className="font-medium text-[11px] sm:text-xs tracking-tight">
              VeloDoc Pro • <span className="font-mono tabular-nums text-indigo-300">30-Document</span> Zero-Crash Batch Studio • 100% In-Memory
            </span>
          </div>

          {/* Main Hero Headline with Swiss Precision & Metallic Typography */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] leading-tight max-w-4xl mx-auto">
            <span className="text-metallic">Universal Client-Side</span>{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              Document &amp; PDF Studio
            </span>
          </h1>

          {/* Compact Subtitle */}
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-zinc-400 leading-normal font-normal">
            Precision binary-search KB compression, 30-file batch pipelines, visual diff, and lossless format conversions.
            Zero cloud uploads • Zero tracking • Runs 100% in local browser memory.
          </p>

          {/* 1-Click Everyday Intent Chips */}
          <div className="pt-1.5 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
            {EVERYDAY_INTENT_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <Link
                  key={chip.id}
                  href={chip.href}
                  className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 shadow-sm cursor-pointer hover:scale-[1.03] active:scale-[0.98] ${chip.color}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{chip.label}</span>
                  <ArrowRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
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
