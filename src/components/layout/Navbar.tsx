"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { CommandPalette } from "@/components/common/CommandPalette";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SessionHistoryDrawer } from "@/components/common/SessionHistoryDrawer";
import { sessionHistory } from "@/lib/session-history";
import { ShieldCheck, Search, History, GithubIcon } from "@/components/common/icons";

export function Navbar() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        navigator.platform.toUpperCase().indexOf("MAC") >= 0
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return sessionHistory.subscribe((items) => {
      setHistoryCount(items.length);
    });
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#F6F5F1]/90 dark:bg-[#161615]/90 border-b border-paper-300 dark:border-charcoal-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-4">
          {/* Left: Brand Logo + Wordmark */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0 focus:outline-none"
            >
              <BrandLogo className="w-7 h-7" />
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-base sm:text-lg tracking-tight text-ink-primary dark:text-white">
                  VeloDoc <span className="text-vermilion">Studio</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-paper-200 dark:bg-charcoal-700 text-ink-secondary dark:text-paper-400 border border-paper-300 dark:border-charcoal-border">
                  v2.4
                </span>
              </div>
            </Link>

            {/* Nav Links for Multi-Page Navigation */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-mono font-medium text-ink-secondary dark:text-paper-400">
              <Link
                href="/#tools"
                className="hover:text-ink-primary dark:hover:text-white transition-colors"
              >
                Tools
              </Link>
              <Link
                href="/#tech-talk-ppt-studio"
                className="hover:text-ink-primary dark:hover:text-white transition-colors"
              >
                IARE PPT
              </Link>
              <Link
                href="/about"
                className="hover:text-ink-primary dark:hover:text-white transition-colors"
              >
                About
              </Link>
              <Link
                href="/guide"
                className="hover:text-ink-primary dark:hover:text-white transition-colors"
              >
                Guide
              </Link>
              <Link
                href="/privacy"
                className="hover:text-ink-primary dark:hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/contact"
                className="hover:text-ink-primary dark:hover:text-white transition-colors"
              >
                Contact
              </Link>
            </nav>
          </div>

          {/* Center: Live Privacy Telemetry Pill */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDF5F2] dark:bg-[#143A2F]/30 border border-[#C4DFD5] dark:border-[#143A2F] text-[#1B4D3E] dark:text-[#6ee7b7] text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="tabular-nums text-[11px]">
              100% On-Device Wasm • 0 Bytes Uploaded
            </span>
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* ⌘K Command Palette Button */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="keycap-btn flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-ink-secondary dark:text-paper-400 hover:text-ink-primary dark:hover:text-white text-xs font-medium cursor-pointer"
              title="Open command palette"
            >
              <Search className="w-3.5 h-3.5 text-vermilion" />
              <span className="hidden sm:inline font-sans text-xs">Search Tools</span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-paper-200 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border rounded text-ink-secondary dark:text-paper-400">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>

            {/* Session History Tray Button */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2 rounded-lg border border-paper-300 dark:border-charcoal-border hover:bg-paper-200 dark:hover:bg-charcoal-700 text-ink-secondary dark:text-paper-400 hover:text-ink-primary dark:hover:text-white transition-colors relative cursor-pointer"
              title="Recent processed files"
            >
              <History className="w-4 h-4" />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-vermilion text-[9px] font-mono font-bold text-white flex items-center justify-center">
                  {historyCount}
                </span>
              )}
            </button>

            {/* GitHub Link */}
            <a
              href="https://github.com/vigneshreddy-dev/velodoc-studio"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              className="p-2 rounded-lg border border-paper-300 dark:border-charcoal-border hover:bg-paper-200 dark:hover:bg-charcoal-700 text-ink-secondary dark:text-paper-400 hover:text-ink-primary dark:hover:text-white transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
            </a>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Telemetry Strip */}
        <div className="xl:hidden flex items-center justify-center gap-2 py-1 bg-[#EDF5F2] dark:bg-[#143A2F]/30 border-t border-[#C4DFD5] dark:border-[#143A2F] text-[#1B4D3E] dark:text-[#6ee7b7] text-[10px] font-mono tabular-nums px-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="truncate">100% On-Device WebAssembly • 0 Bytes Uploaded</span>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      {/* Session History Drawer */}
      <SessionHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
