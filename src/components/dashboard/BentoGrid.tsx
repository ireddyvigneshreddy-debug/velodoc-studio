"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { TOOL_CATEGORIES, TOOLS } from "@/lib/constants";
import { ToolCategory, ToolDefinition } from "@/types";
import { ToolIcon } from "@/components/common/ToolIcon";
import { SpotlightCard } from "@/components/SpotlightCard";
import {
  Search,
  CaretRight,
  Funnel,
} from "@/components/common/icons";

// Clean Swiss Editorial accent palette
function getToolFamilyTheme(tool: ToolDefinition) {
  if (tool.id === "compress-pdf" || tool.id === "image-studio" || tool.id === "flatten-pdf") {
    return {
      iconBg: "bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/40 dark:text-[#6ee7b7] border border-[#C4DFD5] dark:border-[#143A2F]",
      badgeColor: "bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/30 dark:text-[#6ee7b7] border-[#C4DFD5] dark:border-[#143A2F]",
      spotlightColor: "rgba(27, 77, 62, 0.04)",
      borderGlowColor: "rgba(27, 77, 62, 0.2)",
    };
  }

  if (
    tool.id === "sign-pdf" ||
    tool.id === "redact-pdf" ||
    tool.id === "compare-pdf" ||
    tool.id === "remove-pages" ||
    tool.id === "crop-pdf"
  ) {
    return {
      iconBg: "bg-vermilion-light text-vermilion dark:bg-vermilion/20 dark:text-vermilion-hover border border-vermilion/20",
      badgeColor: "bg-vermilion-light text-vermilion dark:bg-vermilion/20 dark:text-vermilion-hover border-vermilion/20",
      spotlightColor: "rgba(217, 78, 40, 0.04)",
      borderGlowColor: "rgba(217, 78, 40, 0.25)",
    };
  }

  if (
    tool.id === "image-to-pdf" ||
    tool.id === "pdf-to-image" ||
    tool.id === "presentation-pdf" ||
    tool.id === "passport-photo"
  ) {
    return {
      iconBg: "bg-[#FEF3C7] text-[#B45309] dark:bg-[#B45309]/20 dark:text-[#fde68a] border border-[#FDE68A] dark:border-[#B45309]/30",
      badgeColor: "bg-[#FEF3C7] text-[#B45309] dark:bg-[#B45309]/20 dark:text-[#fde68a] border-[#FDE68A] dark:border-[#B45309]/30",
      spotlightColor: "rgba(180, 83, 9, 0.04)",
      borderGlowColor: "rgba(180, 83, 9, 0.25)",
    };
  }

  // Default: Archival neutral
  return {
    iconBg: "bg-paper-200 text-ink-primary dark:bg-charcoal-700 dark:text-white border border-paper-300 dark:border-charcoal-border",
    badgeColor: "bg-paper-100 text-ink-secondary dark:bg-charcoal-700 dark:text-paper-400 border-paper-300 dark:border-charcoal-border",
    spotlightColor: "rgba(20, 20, 19, 0.03)",
    borderGlowColor: "rgba(20, 20, 19, 0.15)",
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
    <div id="tools" className="space-y-6 pt-2">
      {/* Directory Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-paper-300 dark:border-charcoal-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
              Directory Index
            </span>
            <span className="text-xs font-mono text-ink-secondary dark:text-paper-400">
              ({TOOLS.length} Wasm Modules)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary dark:text-white tracking-tight">
            Precision Document Catalog
          </h2>
        </div>

        {/* Live Filter Search Input */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${TOOLS.length} precision tools...`}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border focus:border-vermilion text-xs text-ink-primary dark:text-white placeholder-ink-muted outline-none transition-colors shadow-paper"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary dark:hover:text-white text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {TOOL_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category;
          const count = categoryCounts[category] || 0;

          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? "bg-ink-primary dark:bg-white text-white dark:text-ink-primary border-ink-primary dark:border-white font-medium"
                  : "bg-white dark:bg-charcoal-800 text-ink-secondary dark:text-paper-400 border-paper-300 dark:border-charcoal-border hover:border-ink-muted hover:text-ink-primary dark:hover:text-white"
              }`}
            >
              <span className="whitespace-nowrap">{category}</span>
              <span
                className={`text-[10px] font-mono px-1 rounded tabular-nums ${
                  isSelected
                    ? "bg-white/20 dark:bg-black/20 text-inherit font-bold"
                    : "bg-paper-200 dark:bg-charcoal-700 text-ink-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5-Column Responsive Tool Directory Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                spotlightRadius={220}
                className="paper-card p-3.5 flex flex-col justify-between h-[138px] rounded-lg bg-white dark:bg-charcoal-800 hover:-translate-y-0.5 active:translate-y-0 transition-transform"
              >
                {/* TOP ROW: Icon + Badge */}
                <div className="flex items-center justify-between gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-md ${theme.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-150`}
                  >
                    <ToolIcon
                      name={tool.icon}
                      className="w-4 h-4"
                    />
                  </div>

                  <span
                    className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border tracking-tight truncate max-w-[120px] ${theme.badgeColor}`}
                  >
                    {tool.inputOutputBadge}
                  </span>
                </div>

                {/* MIDDLE ROW: Name + Caret */}
                <div className="pt-2 flex items-center justify-between gap-1">
                  <h3 className="text-xs sm:text-[13px] font-sans font-semibold text-ink-primary dark:text-white tracking-tight group-hover:text-vermilion transition-colors truncate">
                    {tool.name}
                  </h3>
                  <CaretRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-vermilion group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* BOTTOM ROW: Description */}
                <p className="text-[11px] text-ink-muted dark:text-paper-500 leading-snug line-clamp-1 group-hover:text-ink-secondary dark:group-hover:text-paper-400 transition-colors">
                  {tool.shortDesc}
                </p>
              </SpotlightCard>
            </Link>
          );
        })}
      </div>

      {/* Empty Search Fallback */}
      {filteredTools.length === 0 && (
        <div className="paper-card p-8 text-center space-y-3 rounded-lg dark:bg-charcoal-800">
          <div className="w-10 h-10 rounded-lg bg-paper-200 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border flex items-center justify-center mx-auto text-ink-muted">
            <Funnel className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-ink-primary dark:text-white">
            No tools matched &ldquo;{searchQuery}&rdquo;
          </h4>
          <p className="text-xs text-ink-muted max-w-sm mx-auto font-sans">
            Try adjusting your search terms or select another category from the filter bar above.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory(defaultCategory);
            }}
            className="px-4 py-1.5 rounded text-xs font-mono font-medium bg-vermilion text-white hover:bg-vermilion-hover transition-colors shadow-paper cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
