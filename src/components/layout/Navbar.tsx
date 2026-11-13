"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { CommandPalette } from "@/components/common/CommandPalette";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SessionHistoryDrawer } from "@/components/common/SessionHistoryDrawer";
import { sessionHistory } from "@/lib/session-history";
import { ShieldCheck, Search, LayoutGrid, History } from "lucide-react";

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
      <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-[#05060B]/80 border-b border-white/[0.08] transition-colors shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo + Wordmark + Version Pill */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0 focus:outline-none"
            >
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-indigo-500/20 blur-sm group-hover:bg-indigo-500/40 transition-all duration-300" />
                <BrandLogo className="w-8 h-8 relative z-10 transition-transform group-hover:scale-105" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-[-0.03em] text-white">
                  VeloDoc <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent font-extrabold">Pro</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/[0.05] border border-white/[0.1] text-zinc-400">
                  v2.4 Local Engine
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Live Privacy Telemetry Pill with pulsing emerald dot */}
          <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full glass-pill text-emerald-400 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span className="font-mono tabular-nums text-[11px] sm:text-xs tracking-tight">
              100% On-Device WebAssembly/Canvas • 0 Bytes Uploaded
            </span>
          </div>

          {/* Right: Hardware Keycap Command Palette Button + History + Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* ⌘K Command Palette Hardware Keycap Button */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="keycap-btn flex items-center gap-2 px-3 py-1.5 rounded-xl text-zinc-300 hover:text-white text-xs font-medium group cursor-pointer"
              title="Open command palette"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
              <span className="hidden sm:inline text-zinc-300 font-medium">Search 29 Tools</span>
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white/[0.08] border border-white/[0.14] rounded-md text-zinc-200 shadow-inner">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>

            {/* Session History Tray Button */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="relative p-2 rounded-xl border border-white/[0.08] hover:border-white/[0.16] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 hover:text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Recent processed files tray"
            >
              <History className="w-4 h-4 text-cyan-400" />
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-[10px] font-mono font-bold text-white shadow-sm">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Tools Catalog Link */}
            <Link
              href="/#all-tools"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
              <span>Catalog</span>
            </Link>

            {/* Dark / Light Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Privacy Telemetry Strip */}
        <div className="md:hidden flex items-center justify-center gap-2 py-1 bg-emerald-950/30 border-t border-emerald-500/20 text-emerald-400 text-[11px] font-mono tabular-nums px-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
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
