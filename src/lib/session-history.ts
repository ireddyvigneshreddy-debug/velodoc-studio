"use client";

import { SessionHistoryItem } from "@/types";
import { createSafeFile, createPdfBlob } from "@/lib/utils";

// In-memory session store (persists across page navigations in current browser session)
class SessionHistoryManager {
  private items: SessionHistoryItem[] = [];
  private listeners: Set<(items: SessionHistoryItem[]) => void> = new Set();
  private chainedFile: { data: Uint8Array; filename: string; mimeType: string } | null = null;
  private chainedFiles: { data: Uint8Array; filename: string; mimeType: string }[] = [];

  addItem(item: Omit<SessionHistoryItem, "id" | "timestamp">): SessionHistoryItem {
    const newItem: SessionHistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    this.items.unshift(newItem);
    if (this.items.length > 20) {
      this.items.pop();
    }
    this.notify();
    return newItem;
  }

  recordExecution(params: {
    toolId: string;
    toolName: string;
    inputFiles: string[];
    outputFileName: string;
    outputSizeBytes: number;
    durationMs: number;
    outputData?: Uint8Array;
  }): SessionHistoryItem {
    const data = params.outputData || new Uint8Array();
    const blob = createPdfBlob(data);
    return this.addItem({
      toolId: params.toolId,
      toolName: params.toolName,
      filename: params.outputFileName,
      blob,
      data,
      mimeType: "application/pdf",
      originalSize: params.outputSizeBytes,
      processedSize: params.outputSizeBytes,
      pageCount: 1,
    });
  }

  getItems(): SessionHistoryItem[] {
    return [...this.items];
  }

  clear() {
    this.items = [];
    this.notify();
  }

  setChainedFile(data: Uint8Array, filename: string, mimeType: string) {
    this.chainedFile = { data, filename, mimeType };
    this.chainedFiles = [{ data, filename, mimeType }];
  }

  setChainedFiles(files: { data: Uint8Array; filename: string; mimeType: string }[]) {
    this.chainedFiles = files;
    if (files.length > 0) {
      this.chainedFile = files[0];
    }
  }

  consumeChainedFile(): { data: Uint8Array; filename: string; mimeType: string } | null {
    const file = this.chainedFile;
    this.chainedFile = null;
    return file;
  }

  consumeChainedFiles(): { data: Uint8Array; filename: string; mimeType: string }[] {
    const files =
      this.chainedFiles.length > 0
        ? [...this.chainedFiles]
        : this.chainedFile
        ? [this.chainedFile]
        : [];
    this.chainedFiles = [];
    this.chainedFile = null;
    return files;
  }

  subscribe(listener: (items: SessionHistoryItem[]) => void) {
    this.listeners.add(listener);
    listener([...this.items]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.items]));
  }
}

export const sessionHistory = new SessionHistoryManager();

export function setChainedFile(data: Uint8Array, filename: string, mimeType: string) {
  sessionHistory.setChainedFile(data, filename, mimeType);
}

export function consumeChainedFile(): { file: File; name: string } | null {
  const chained = sessionHistory.consumeChainedFile();
  if (!chained) return null;
  const file = createSafeFile(chained.data, chained.filename, chained.mimeType);
  return { file, name: chained.filename };
}
