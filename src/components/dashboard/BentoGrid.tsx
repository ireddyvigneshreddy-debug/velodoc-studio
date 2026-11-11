"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { TOOL_CATEGORIES, TOOLS, PDF_TOOLS, IMAGE_TOOLS, QUICK_INTENT_PRESETS } from "@/lib/constants";
import { ToolCategory, ToolDefinition, ToolDomain } from "@/types";
import { ToolIcon } from "@/components/common/ToolIcon";
import { Search, ArrowRight, Sparkles, FileText, Image as ImageIcon, LayoutGrid } from "lucide-react";

export function BentoGrid() {
  const [activeDomain, setActiveDomain] = useState<ToolDomain>("all");
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>("All Tools (19)");
  const [searchQuery, setSearchQuery] = useState("");

  // Base domain tools pool
  const domainTools = useMemo(() => {
    if (activeDomain === "pdf") return PDF_TOOLS;
    if (activeDomain === "image") return IMAGE_TOOLS;
    return TOOLS;
  }, [activeDomain]);

  // Filter tools based on category tab, active domain, and search input
  const filteredTools = useMemo(() => {
    return domainTools.filter((tool) => {
      const matchesCategory =
        selectedCategory === "All Tools (19)" || tool.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.shortDesc.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.inputOutputBadge.toLowerCase().includes(q)
      );
    });
  }, [domainTools, selectedCategory, searchQuery]);

  // Separate PDF and Image tools from the filtered set
  const filteredPdfTools = useMemo(() => {
    return filteredTools.filter((t) => t.toolType === "pdf");
  }, [filteredTools]);

  const filteredImageTools = useMemo(() => {
    return filteredTools.filter((t) => t.toolType === "image");
  }, [filteredTools]);

  // Category counts based on current domain
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "All Tools (19)": domainTools.length };
    TOOL_CATEGORIES.forEach((cat) => {
      if (cat !== "All Tools (19)") {
        counts[cat] = domainTools.filter((t) => t.category === cat).length;
      }
    });
    return counts;
  }, [domainTools]);

  const renderToolCard = (tool: ToolDefinition) => {
    const isImage = tool.toolType === "image";

    return (
      <Link
        key={tool.id}
        href={tool.path}
        className={`group relative p-3 sm:p-3.5 rounded-2xl bg-[#12141D] hover:bg-[#151824] border transition-all duration-200 flex flex-col justify-between h-32 overflow-hidden shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 cursor-pointer ${
          isImage
            ? "border-pink-500/20 hover:border-pink-500/50"
            : "border-white/[0.08] hover:border-cyan-500/40"
        }`}
      >
        {/* Subtle top-corner gradient glow */}
        <div
          className={`absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full blur-xl group-hover:scale-125 transition-transform duration-300 pointer-events-none bg-gradient-to-br ${tool.color} opacity-20`}
        />

        {/* TOP ROW: Compact 32x32 color-coded icon + Domain Tag + Input -> Output badge */}
        <div className="flex items-center justify-between gap-1.5 relative z-10">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br ${tool.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0`}
            >
              <ToolIcon name={tool.icon} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                isImage
                  ? "bg-pink-500/10 text-pink-300 border border-pink-500/20"
                  : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
              }`}
            >
              {isImage ? "IMG" : "PDF"}
            </span>
          </div>

          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 truncate max-w-[120px]">
            {tool.inputOutputBadge}
          </span>
        </div>

        {/* MIDDLE: Title + 6-word plain-English description */}
        <div className="relative z-10 space-y-0.5">
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover:text-cyan-200 transition-colors truncate">
            {tool.name}
          </h3>
          <p className="text-[11px] text-zinc-400 line-clamp-1 group-hover:text-slate-300 transition-colors">
            {tool.shortDesc}
          </p>
        </div>

        {/* BOTTOM: Subdued footer strip */}
        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-white/[0.04] pt-1.5">
          <span className="truncate">
            {Object.values(tool.acceptedFileTypes).flat().slice(0, 2).join(", ").toUpperCase()}
          </span>
          <span className="text-emerald-400/80 font-medium">Local Engine</span>
        </div>
      </Link>
    );
  };

  const showSplitSections = activeDomain === "all" && !searchQuery.trim() && selectedCategory === "All Tools (19)";

  return (
    <section id="tools" className="w-full space-y-6 scroll-mt-20">
      {/* 1. PRIMARY DOMAIN SWITCHER (ALL / PDF / IMAGE) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-[#0D0F16] border border-white/10 shadow-2xl">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/60 border border-white/5 sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveDomain("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeDomain === "all"
                ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All Tools</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30">
              19
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomain("pdf")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeDomain === "pdf"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-slate-400 hover:text-cyan-300 hover:bg-white/5"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>PDF Tools</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30">
              16
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDomain("image")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeDomain === "image"
                ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                : "text-slate-400 hover:text-pink-300 hover:bg-white/5"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
            <span>Image Tools</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30">
              3
            </span>
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 19 tools (e.g. compress, merge)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>
      </div>

      {/* 2. SECONDARY CATEGORY FILTER PILLS */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[#12141D]/60 border border-white/5">
        {TOOL_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          const count = categoryCounts[cat] ?? 0;
          if (count === 0 && cat !== "All Tools (19)") return null;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-white/10 text-white border border-white/20 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{cat.replace(/ \(\d+\)/, "")}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. QUICK HELPER PILLS FOR EVERYDAY TASKS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Everyday Tasks:</span>
        </span>
        {QUICK_INTENT_PRESETS.map((preset) => (
          <Link
            key={preset.id}
            href={preset.path}
            className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all shadow-sm group"
          >
            <span>{preset.label}</span>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      {/* 4. SEPARATED TOOL DISPLAY */}
      {showSplitSections ? (
        <div className="space-y-8">
          {/* SECTION A: PDF TOOLS */}
          <div id="pdf-tools" className="space-y-3.5 scroll-mt-24">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>PDF Document Studio</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                      {PDF_TOOLS.length} Dedicated PDF Tools
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Client-side vector merging, Bates stamping, compression, signing, metadata, and page rearrangement
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
              {filteredPdfTools.map(renderToolCard)}
            </div>
          </div>

          {/* SECTION B: IMAGE TOOLS */}
          <div id="image-tools" className="space-y-3.5 scroll-mt-24 pt-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Image Studio &amp; Multi-Format Suite</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300">
                      {IMAGE_TOOLS.length} Dedicated Image Tools
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Exact-target photo resizing, batch format transcoding (WebP/PNG/JPG), and multi-image compiling
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
              {filteredImageTools.map(renderToolCard)}
            </div>
          </div>
        </div>
      ) : (
        /* Single grid when filtered or searched */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing {filteredTools.length} {activeDomain === "pdf" ? "PDF" : activeDomain === "image" ? "Image" : ""} tool{filteredTools.length !== 1 ? "s" : ""}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-cyan-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {filteredTools.map(renderToolCard)}
          </div>
        </div>
      )}

      {filteredTools.length === 0 && (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <p className="text-sm">No tools match &quot;{searchQuery}&quot;</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveDomain("all");
              setSelectedCategory("All Tools (19)");
            }}
            className="text-xs text-cyan-400 underline"
          >
            Reset all filters
          </button>
        </div>
      )}
    </section>
  );
}
