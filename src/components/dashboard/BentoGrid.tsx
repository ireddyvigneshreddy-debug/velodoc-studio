"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TOOL_CATEGORIES, TOOLS } from "@/lib/constants";
import { ToolCategory } from "@/types";
import * as Icons from "lucide-react";
import { ArrowUpRight } from "lucide-react";

export function BentoGrid() {
  const [selectedCategory, setSelectedCategory] =
    useState<ToolCategory>("All Tools");

  const filteredTools =
    selectedCategory === "All Tools"
      ? TOOLS
      : TOOLS.filter((t) => t.category === selectedCategory);

  return (
    <section id="tools" className="w-full space-y-8 scroll-mt-24">
      {/* Category Filter Pills */}
      <div className="flex items-center justify-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-[#12141D] border border-white/10 shadow-lg backdrop-blur-xl">
          {TOOL_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.map((tool, index) => {
          // @ts-expect-error Lucide dynamic icon lookup
          const IconComponent = Icons[tool.icon] || Icons.FileText;
          const isFeatured = index === 0 && selectedCategory === "All Tools";

          return (
            <Link
              key={tool.id}
              href={tool.path}
              className={`glow-card group relative p-6 rounded-2xl bg-[#12141D] border border-white/[0.08] hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${
                isFeatured ? "md:col-span-2 lg:col-span-2 bg-gradient-to-br from-[#12141D] via-[#151824] to-[#12141D]" : ""
              }`}
            >
              {/* Subtle radiant background highlight */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <div>
                {/* Header row: Icon, Category & Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className={`p-3.5 rounded-xl bg-gradient-to-br ${tool.color} text-white shadow-md group-hover:scale-105 transition-transform duration-200`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-2">
                    {tool.badge && (
                      <span className="text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-indigo-300">
                        {tool.badge}
                      </span>
                    )}
                    <span className="p-1 rounded-lg text-slate-500 group-hover:text-white transition-colors">
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-2 group-hover:text-indigo-200 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  {tool.description}
                </p>
              </div>

              {/* Bottom footer: Supported file types and privacy check */}
              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">
                  {Object.values(tool.acceptedFileTypes)
                    .flat()
                    .slice(0, 3)
                    .join(", ")
                    .toUpperCase()}
                </span>
                <span className="text-emerald-400/80 font-medium group-hover:text-emerald-400 transition-colors">
                  Zero upload • Local RAM
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
