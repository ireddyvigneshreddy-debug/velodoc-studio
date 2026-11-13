"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, CornerDownLeft, Sparkles, Command } from "lucide-react";
import { TOOLS } from "@/lib/constants";
import { ToolIcon } from "@/components/common/ToolIcon";

const SEARCHABLE_TOOLS = [
  ...TOOLS,
  {
    id: "tech-talk-ppt-studio",
    name: "AI Tech-Talk & PPTX Studio (10–15 Slides)",
    category: "Extreme & Smart Pro",
    toolType: "presentation",
    description: "Generate 10–15 slide college seminar PowerPoint (.pptx) & PDF decks with speaker notes",
    shortDesc: "Topic to 10–15 slide PPTX & PDF with speaker notes",
    inputOutputBadge: "Topic → 15-Slide PPTX",
    icon: "Presentation",
    color: "from-amber-500 to-indigo-600",
    badge: "AI 10–15 Slides",
    path: "/#tech-talk-ppt-studio",
    acceptedFileTypes: {},
    multipleFiles: false,
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTools = SEARCHABLE_TOOLS.filter((tool) => {
    const q = query.toLowerCase();
    return (
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.shortDesc.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = React.useCallback(
    (path: string) => {
      onClose();
      router.push(path);
    },
    [onClose, router]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }

      if (!isOpen) return;

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
      } else if (e.key === "Enter" && filteredTools[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredTools[selectedIndex].path);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredTools, selectedIndex, onClose, handleSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xl transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Palette Modal (Raycast / Linear style hardware glass card) */}
      <div className="relative w-full max-w-2xl bg-[#0B0D14]/95 border border-white/[0.12] rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.2)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 sm:px-5 py-4 border-b border-white/[0.08] gap-3">
          <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
            <Command className="w-4 h-4 text-cyan-300" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a tool command or press ↵ to jump..."
            className="w-full bg-transparent text-white placeholder-zinc-500 text-sm sm:text-base focus:outline-none tracking-tight"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex text-[10px] font-mono font-medium text-zinc-400 bg-white/[0.06] border border-white/[0.1] px-2 py-0.5 rounded-md">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredTools.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-400/50" />
              <p className="text-sm font-medium text-white">No tools match &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-zinc-500">
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
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-600/25 border border-indigo-500/40 text-white shadow-md shadow-indigo-600/10"
                      : "hover:bg-white/[0.04] text-zinc-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl bg-gradient-to-br ${tool.color} text-white shadow-md shrink-0`}
                    >
                      <ToolIcon name={tool.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-white truncate">
                          {tool.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            tool.toolType === "image"
                              ? "bg-pink-500/15 text-pink-300 border border-pink-500/25"
                              : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                          }`}
                        >
                          {tool.inputOutputBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {tool.shortDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-400/30">
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
        <div className="px-4 py-2.5 bg-black/50 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-white/[0.1] rounded text-zinc-300 text-[10px]">↑</kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-white/[0.1] rounded text-zinc-300 text-[10px]">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-white/[0.1] rounded text-zinc-300 text-[10px]">↵</kbd> select
            </span>
          </div>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            100% In-Memory Sandbox
          </span>
        </div>
      </div>
    </div>
  );
}
