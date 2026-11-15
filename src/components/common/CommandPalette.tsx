"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TOOLS } from "@/lib/constants";
import { ToolIcon } from "@/components/common/ToolIcon";
import { X, CornerDownLeft, Sparkles, Command } from "@/components/common/icons";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tools by name, description, tags, keywords
  const filteredTools = React.useMemo(() => {
    if (!query.trim()) return TOOLS;
    const q = query.toLowerCase();
    return TOOLS.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.shortDesc.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.inputOutputBadge.toLowerCase().includes(q)
    );
  }, [query]);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = React.useCallback((path: string) => {
    onClose();
    router.push(path);
  }, [onClose, router]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredTools.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredTools.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredTools[selectedIndex]) {
          handleSelect(filteredTools[selectedIndex].path);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredTools, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 pb-4 animate-in fade-in duration-150"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Palette Modal (Swiss Editorial tactile card) */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#161615] border border-paper-300 dark:border-charcoal-border rounded-xl shadow-paper-modal overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 sm:px-5 py-3.5 border-b border-paper-300 dark:border-charcoal-border gap-3">
          <div className="p-1.5 rounded-md bg-paper-200 dark:bg-charcoal-700 text-vermilion border border-paper-300 dark:border-charcoal-border">
            <Command className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a tool command or press ↵ to jump..."
            className="w-full bg-transparent text-ink-primary dark:text-white placeholder-ink-muted text-sm sm:text-base focus:outline-none tracking-tight font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-ink-muted hover:text-ink-primary dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex text-[10px] font-mono font-medium text-ink-muted bg-paper-200 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredTools.length === 0 ? (
            <div className="py-12 text-center text-ink-muted space-y-2">
              <Sparkles className="w-7 h-7 mx-auto text-vermilion/50" />
              <p className="text-sm font-medium text-ink-primary dark:text-white">No tools match &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-ink-muted font-sans">
                Try searching for compress, merge, camera, sign, watermark, or split
              </p>
            </div>
          ) : (
            filteredTools.map((tool, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={tool.id}
                  onClick={() => handleSelect(tool.path)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-paper-100 dark:bg-charcoal-700 text-ink-primary dark:text-white border-l-2 border-vermilion"
                      : "hover:bg-paper-100/60 dark:hover:bg-charcoal-700/50 text-ink-secondary dark:text-paper-400"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="p-2 rounded-md bg-paper-200 dark:bg-charcoal-800 text-ink-primary dark:text-white border border-paper-300 dark:border-charcoal-border shrink-0"
                    >
                      <ToolIcon name={tool.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-ink-primary dark:text-white truncate">
                          {tool.name}
                        </span>
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-paper-200 dark:bg-charcoal-800 text-ink-secondary dark:text-paper-400 border border-paper-300 dark:border-charcoal-border"
                        >
                          {tool.inputOutputBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted line-clamp-1 mt-0.5 font-sans">
                        {tool.shortDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-vermilion bg-vermilion-light dark:bg-vermilion/20 px-2 py-0.5 rounded border border-vermilion/30">
                        <span>Open</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hardware Info */}
        <div className="px-4 py-2.5 bg-paper-100 dark:bg-charcoal-900 border-t border-paper-300 dark:border-charcoal-border flex items-center justify-between text-[11px] text-ink-muted font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border rounded text-ink-secondary dark:text-paper-400 text-[10px]">↑</kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border rounded text-ink-secondary dark:text-paper-400 text-[10px]">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border rounded text-ink-secondary dark:text-paper-400 text-[10px]">↵</kbd> select
            </span>
          </div>
          <span className="text-[#1B4D3E] dark:text-[#6ee7b7] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100% In-Memory Sandbox
          </span>
        </div>
      </div>
    </div>
  );
}
