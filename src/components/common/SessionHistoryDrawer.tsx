"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sessionHistory } from "@/lib/session-history";
import { SessionHistoryItem } from "@/types";
import { TOOLS } from "@/lib/constants";
import { formatFileSize } from "@/lib/utils";
import { History, X, Download, ArrowRight, Trash2, FileText } from "@/components/common/icons";

interface SessionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionHistoryDrawer({
  isOpen,
  onClose,
}: SessionHistoryDrawerProps) {
  const router = useRouter();
  const [items, setItems] = useState<SessionHistoryItem[]>([]);
  const [selectedChainItem, setSelectedChainItem] = useState<string | null>(null);

  useEffect(() => {
    return sessionHistory.subscribe((newItems) => {
      setItems(newItems);
    });
  }, []);

  const handleDownload = (item: SessionHistoryItem) => {
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleChain = (item: SessionHistoryItem, targetPath: string) => {
    sessionHistory.setChainedFile(item.data, item.filename, item.mimeType);
    setSelectedChainItem(null);
    onClose();
    router.push(targetPath);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#161615] border-l border-paper-300 dark:border-charcoal-border h-full flex flex-col z-10 shadow-paper-modal animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-paper-300 dark:border-charcoal-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-paper-200 dark:bg-charcoal-700 text-vermilion border border-paper-300 dark:border-charcoal-border">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-ink-primary dark:text-white text-sm tracking-tight font-sans">
                Session History Tray
              </h3>
              <p className="text-[11px] text-ink-muted font-mono tabular-nums">
                In-memory generated files ({items.length})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => sessionHistory.clear()}
                className="text-xs text-rose-600 dark:text-rose-400 p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Clear History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-ink-muted hover:text-ink-primary dark:hover:text-white p-1.5 rounded hover:bg-paper-200 dark:hover:bg-charcoal-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="py-24 text-center text-ink-muted space-y-3 font-sans">
              <div className="w-12 h-12 rounded-lg bg-paper-200 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border flex items-center justify-center mx-auto text-ink-muted">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-ink-primary dark:text-white">
                No documents processed in this session yet.
              </p>
              <p className="text-[11px] text-ink-muted max-w-xs mx-auto">
                Any file generated in VeloDoc Studio will appear here for fast re-downloading or chaining into another tool.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg paper-card bg-paper-50 dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border space-y-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-primary dark:text-white truncate font-mono">
                      {item.filename}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-ink-muted mt-1 font-mono tabular-nums">
                      <span className="text-vermilion font-medium">{item.toolName}</span>
                      <span>•</span>
                      <span>{formatFileSize(item.processedSize)}</span>
                      <span>•</span>
                      <span>{item.pageCount} {item.pageCount === 1 ? "page" : "pages"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(item)}
                    className="p-2 rounded-md border border-paper-300 dark:border-charcoal-border hover:bg-paper-200 dark:hover:bg-charcoal-700 text-ink-primary dark:text-white transition-colors cursor-pointer"
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
                    className="w-full py-1.5 px-3 rounded text-xs font-mono font-medium flex items-center justify-between border border-paper-300 dark:border-charcoal-border bg-white dark:bg-charcoal-700 hover:bg-paper-100 dark:hover:bg-charcoal-600 text-ink-secondary dark:text-paper-400 hover:text-ink-primary dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Chain into another tool</span>
                    <ArrowRight className="w-3 h-3 text-vermilion" />
                  </button>

                  {selectedChainItem === item.id && (
                    <div className="mt-2 p-2 rounded-lg bg-white dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                      <span className="text-[10px] uppercase font-mono font-semibold text-ink-muted px-2 py-0.5 block">
                        Select Destination Tool:
                      </span>
                      {TOOLS.slice(0, 8).map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => handleChain(item, tool.path)}
                          className="w-full text-left px-2.5 py-1.5 rounded text-xs text-ink-secondary dark:text-paper-400 hover:text-ink-primary dark:hover:text-white hover:bg-paper-100 dark:hover:bg-charcoal-800 truncate block transition-colors cursor-pointer font-sans"
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
        <div className="p-4 border-t border-paper-300 dark:border-charcoal-border bg-paper-100 dark:bg-charcoal-900 text-[11px] text-ink-muted font-mono flex items-center justify-between">
          <span>In-Memory Volatile RAM</span>
          <span className="text-[#1B4D3E] dark:text-[#6ee7b7] font-medium">100% Client-Side</span>
        </div>
      </div>
    </div>
  );
}
