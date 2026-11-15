"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "@/components/common/icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check saved preference; default to archival light
    const saved = localStorage.getItem("velodoc-theme") as "light" | "dark" | null;
    const initialTheme = saved || "light";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("velodoc-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-2 rounded-lg border border-paper-300 dark:border-charcoal-border hover:bg-paper-200 dark:hover:bg-charcoal-700 text-ink-secondary dark:text-paper-400 hover:text-ink-primary dark:hover:text-white transition-colors cursor-pointer"
      title={theme === "light" ? "Switch to Matte Charcoal Dark" : "Switch to Warm Archival Paper Light"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-ink-secondary" />
      )}
    </button>
  );
}
