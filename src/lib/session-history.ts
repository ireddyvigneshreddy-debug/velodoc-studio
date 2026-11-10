"use client";

import { SessionHistoryItem } from "@/types";

// In-memory session store (persists across page navigations in current browser session)
class SessionHistoryManager {
  private items: SessionHistoryItem[] = [];
  private listeners: Set<(items: SessionHistoryItem[]) => void> = new Set();
  private chainedFile: { data: Uint8Array; filename: string; mimeType: string } | null = null;

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

  getItems(): SessionHistoryItem[] {
    return [...this.items];
  }

  clear() {
    this.items = [];
    this.notify();
  }

  setChainedFile(data: Uint8Array, filename: string, mimeType: string) {
    this.chainedFile = { data, filename, mimeType };
  }

  consumeChainedFile(): { data: Uint8Array; filename: string; mimeType: string } | null {
    const file = this.chainedFile;
    this.chainedFile = null;
    return file;
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
  const file = new File([chained.data.buffer as ArrayBuffer], chained.filename, {
    type: chained.mimeType,
  });
  return { file, name: chained.filename };
}
