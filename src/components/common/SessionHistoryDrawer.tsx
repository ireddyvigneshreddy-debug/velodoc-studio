"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { History, X, Download, ArrowRight, Trash2, FileText } from "lucide-react";
import { sessionHistory } from "@/lib/session-history";
import { SessionHistoryItem } from "@/types";
import { formatFileSize } from "@/lib/utils";
import { TOOLS } from "@/lib/constants";

interface SessionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionHistoryDrawer({ isOpen, onClose }: SessionHistoryDrawerProps) {
  const router = useRouter();
  const [items, setItems] = useState<SessionHistoryItem[]>([]);
  const [selectedChainItem, setSelectedChainItem] = useState<string | null>(null);

  useEffect(() => {
    return sessionHistory.subscribe((newItems) => {
      setItems(newItems);
    });
  }, []);

  if (!isOpen) return null;

  const handleDownload = (item: SessionHistoryItem) => {
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleChain = (item: SessionHistoryItem, targetToolPath: string) => {
    sessionHistory.setChainedFile(item.data, item.filename, item.mimeType);
    onClose();
    router.push(targetToolPath);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[#090B12]/95 border-l border-white/[0.1] h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-250 backdrop-blur-2xl">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <History className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Session History Tray</h3>
              <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                In-memory generated files ({items.length})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => sessionHistory.clear()}
                className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Clear History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="py-24 text-center text-zinc-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-zinc-300">No documents processed in this session yet.</p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Any file generated in VeloDoc Pro will appear here for fast re-downloading or chaining into another tool.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl premium-card space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate font-mono">
                      {item.filename}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-mono tabular-nums">
                      <span className="text-indigo-400 font-medium">{item.toolName}</span>
                      <span>•</span>
                      <span>{formatFileSize(item.processedSize)}</span>
                      <span>•</span>
                      <span>{item.pageCount} {item.pageCount === 1 ? "page" : "pages"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(item)}
                    className="p-2 rounded-xl glass-pill hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-all cursor-pointer"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Chain to tool button */}
                <div>
                  <button
                    onClick={() =>
                      setSelectedChainItem(
                        selectedChainItem === item.id ? null : item.id
                      )
                    }
                    className="w-full py-1.5 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 text-[11px] font-medium flex items-center justify-between border border-indigo-500/25 transition-all cursor-pointer"
                  >
                    <span>Chain into another tool</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  {selectedChainItem === item.id && (
                    <div className="mt-2 p-2 rounded-xl bg-black/70 border border-white/[0.08] space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 px-2 py-0.5 block font-mono">
                        Select Destination Tool:
                      </span>
                      {TOOLS.slice(0, 8).map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => handleChain(item, tool.path)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] truncate block transition-colors cursor-pointer"
                        >
                          {tool.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-white/[0.08] bg-black/60 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>In-Memory Volatile RAM</span>
          <span className="text-emerald-400 font-medium">100% Client-Side</span>
        </div>
      </div>
    </div>
  );
}
