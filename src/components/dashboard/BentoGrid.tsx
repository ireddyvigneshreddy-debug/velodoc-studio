"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TOOL_CATEGORIES, TOOLS } from "@/lib/constants";
import { ToolCategory, ToolDefinition } from "@/types";
import { ToolIcon } from "@/components/common/ToolIcon";
import { SpotlightCard } from "@/components/SpotlightCard";
import {
  Search,
  ChevronRight,
  Filter,
} from "lucide-react";

// Helper to determine jewel-tone styling family
function getToolFamilyTheme(tool: ToolDefinition) {
  if (tool.id === "compress-pdf" || tool.id === "image-studio") {
    return {
      family: "emerald",
      iconBg:
        "bg-gradient-to-br from-emerald-500/90 to-teal-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(16,185,129,0.3)]",
      badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      spotlightColor: "rgba(16, 185, 129, 0.14)",
      borderGlowColor: "rgba(20, 184, 166, 0.45)",
    };
  }

  if (
    tool.id === "image-to-pdf" ||
    tool.id === "pdf-to-image" ||
    tool.id === "pdf-to-text" ||
    tool.id === "markdown-to-pdf"
  ) {
    return {
      family: "cyan",
      iconBg:
        "bg-gradient-to-br from-cyan-500/90 to-sky-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(6,182,212,0.3)]",
      badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
      spotlightColor: "rgba(6, 182, 212, 0.14)",
      borderGlowColor: "rgba(56, 189, 248, 0.45)",
    };
  }

  if (
    tool.id === "sign-pdf" ||
    tool.id === "redact-pdf" ||
    tool.id === "compare-pdf" ||
    tool.id === "watermark-pdf" ||
    tool.id === "page-numbers" ||
    tool.id === "grayscale-pdf" ||
    tool.id === "metadata-pdf"
  ) {
    return {
      family: "amber",
      iconBg:
        "bg-gradient-to-br from-amber-500/90 via-rose-500/80 to-purple-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(244,63,94,0.3)]",
      badgeColor: "bg-rose-500/10 text-rose-300 border-rose-500/20",
      spotlightColor: "rgba(244, 63, 94, 0.13)",
      borderGlowColor: "rgba(251, 146, 60, 0.45)",
    };
  }

  if (tool.category === "Extreme & Smart Pro") {
    return {
      family: "fuchsia",
      iconBg:
        "bg-gradient-to-br from-fuchsia-500/90 via-purple-600/90 to-indigo-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(217,70,239,0.35)]",
      badgeColor: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
      spotlightColor: "rgba(217, 70, 239, 0.15)",
      borderGlowColor: "rgba(192, 38, 211, 0.45)",
    };
  }

  // Default: Indigo / Violet family
  return {
    family: "indigo",
    iconBg:
      "bg-gradient-to-br from-indigo-500/90 to-violet-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(99,102,241,0.3)]",
    badgeColor: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
    spotlightColor: "rgba(99, 102, 241, 0.14)",
    borderGlowColor: "rgba(139, 92, 246, 0.45)",
  };
}

export function BentoGrid() {
  const defaultCategory = TOOL_CATEGORIES[0];
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>(defaultCategory);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tools based on category tab and search input
  const filteredTools = useMemo(() => {
    return TOOLS.filter((tool) => {
      const matchesCategory =
        selectedCategory === defaultCategory ||
        tool.category === selectedCategory;

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
  }, [selectedCategory, searchQuery, defaultCategory]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [defaultCategory]: TOOLS.length,
    };
    TOOL_CATEGORIES.forEach((cat) => {
      if (cat !== defaultCategory) {
        counts[cat] = TOOLS.filter((t) => t.category === cat).length;
      }
    });
    return counts;
  }, [defaultCategory]);

  return (
    <div id="all-tools" className="space-y-4">
      {/* Category Tabs & Search Bar Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-2">
        {/* Sliding Pill Category Filter (Swipeable on Mobile) */}
        <div className="relative flex items-center gap-1 p-1 rounded-full glass-pill overflow-x-auto no-scrollbar snap-x snap-mandatory max-w-full pb-1">
          {TOOL_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            const count = categoryCounts[category] || 0;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 snap-start flex items-center gap-1.5 cursor-pointer z-10 ${
                  isSelected
                    ? "text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.16] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-md"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                    }}
                  />
                )}
                <span className="relative z-10 whitespace-nowrap">{category}</span>
                <span
                  className={`relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                    isSelected
                      ? "bg-indigo-500/20 text-indigo-300 font-bold"
                      : "bg-white/[0.05] text-zinc-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Filter Search Input */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${TOOLS.length} precision tools...`}
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.09] focus:border-indigo-500/60 focus:bg-white/[0.07] text-xs text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* High-Density 5-Column Responsive Spotlight Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
        {filteredTools.map((tool) => {
          const theme = getToolFamilyTheme(tool);

          return (
            <Link
              key={tool.id}
              href={tool.path}
              className="block group focus:outline-none"
            >
              <SpotlightCard
                spotlightColor={theme.spotlightColor}
                borderGlowColor={theme.borderGlowColor}
                spotlightRadius={280}
                className="premium-card p-3.5 flex flex-col justify-between h-[134px] hover:-translate-y-0.5 active:translate-y-0"
              >
                {/* TOP ROW: 34x34 glowing glass icon + Input -> Output micro-badge */}
                <div className="flex items-center justify-between gap-1.5">
                  <div
                    className={`w-[34px] h-[34px] rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}
                  >
                    <ToolIcon
                      name={tool.icon}
                      className="w-4 h-4 text-white"
                    />
                  </div>

                  <span
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border tracking-tight truncate max-w-[130px] ${theme.badgeColor}`}
                  >
                    {tool.inputOutputBadge}
                  </span>
                </div>

                {/* MIDDLE ROW: Bold tool title + subtle hover chevron arrow */}
                <div className="pt-2 flex items-center justify-between gap-1">
                  <h3 className="text-[13px] sm:text-[14px] font-semibold text-white tracking-[-0.02em] group-hover:text-indigo-200 transition-colors truncate">
                    {tool.name}
                  </h3>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* BOTTOM ROW: Plain-English 1-line explanation */}
                <p className="text-[11.5px] text-zinc-400 leading-snug line-clamp-1 group-hover:text-zinc-300 transition-colors">
                  {tool.shortDesc}
                </p>
              </SpotlightCard>
            </Link>
          );
        })}
      </div>

      {/* Empty Search Fallback */}
      {filteredTools.length === 0 && (
        <div className="premium-card p-8 text-center space-y-3 rounded-2xl">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
            <Filter className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-white">
            No tools matched &ldquo;{searchQuery}&rdquo;
          </h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try adjusting your search terms or select another category from the
            filter bar above.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory(defaultCategory);
            }}
            className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
