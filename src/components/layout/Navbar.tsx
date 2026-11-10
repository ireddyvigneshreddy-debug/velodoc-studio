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
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#07080C]/85 border-b border-white/[0.08] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Title */}
          <Link
            href="/"
            className="flex items-center gap-3 group shrink-0 focus:outline-none"
          >
            <BrandLogo className="w-9 h-9 transition-transform group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent group-hover:opacity-90">
                VeloDoc <span className="text-cyan-400 font-extrabold">Pro</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 -mt-1 hidden sm:block">
                Universal Document &amp; PDF Studio
              </span>
            </div>
          </Link>

          {/* Center: Persistent Privacy Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>100% Local Browser Engine — Files Never Leave Your Device</span>
          </div>

          {/* Right: Actions (Search, History, Palette, Theme Toggle) */}
          <div className="flex items-center gap-2.5">
            {/* Quick Command Palette Button */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-darkCard/80 hover:bg-darkCardHover text-slate-300 hover:text-white text-xs font-medium transition-all shadow-sm group"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
              <span className="hidden sm:inline">Search 19 Tools...</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-slate-400">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>

            {/* Session History Tray Button */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="relative p-2 rounded-xl border border-white/10 hover:border-white/20 bg-darkCard/80 hover:bg-darkCardHover text-slate-300 hover:text-white text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
              title="Recent Files Tray"
            >
              <History className="w-4 h-4 text-cyan-400" />
              {historyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {historyCount}
                </span>
              )}
            </button>

            {/* All Tools quick link */}
            <Link
              href="/#tools"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
              <span>Catalog</span>
            </Link>

            {/* Dark / Light Mode Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Privacy Sub-Bar */}
        <div className="lg:hidden flex items-center justify-center gap-1.5 py-1 bg-emerald-950/40 border-t border-emerald-500/20 text-emerald-400 text-[11px] font-medium text-center px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <span className="truncate">100% Client-Side: Zero server uploads &amp; complete privacy</span>
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
