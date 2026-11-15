import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { TOOLS } from "@/lib/constants";
import { ShieldCheck, Cpu, Lock, GithubIcon } from "@/components/common/icons";

export function Footer() {
  return (
    <footer className="w-full bg-[#F6F5F1] dark:bg-[#161615] border-t border-paper-300 dark:border-charcoal-border text-ink-secondary dark:text-paper-400 text-sm mt-auto relative z-10 transition-colors">
      {/* 3 Core Architecture Guarantees */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-paper-300 dark:border-charcoal-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800">
            <div className="w-8 h-8 rounded bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/30 dark:text-[#6ee7b7] flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-ink-primary dark:text-white font-semibold text-sm">
              Zero Server Uploads
            </h4>
            <p className="text-xs text-ink-secondary dark:text-paper-400 mt-1 leading-relaxed">
              Your confidential documents never leave your device. All PDF, image, and presentation compilation executes entirely in local WebAssembly memory.
            </p>
          </div>

          <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800">
            <div className="w-8 h-8 rounded bg-vermilion-light text-vermilion dark:bg-vermilion/20 flex items-center justify-center mb-3">
              <Cpu className="w-4 h-4" />
            </div>
            <h4 className="text-ink-primary dark:text-white font-semibold text-sm">
              Exact Target Binary Search
            </h4>
            <p className="text-xs text-ink-secondary dark:text-paper-400 mt-1 leading-relaxed">
              Target exact KB/MB bounds for passport, visa, and exam portal thresholds using mathematical DCT and resolution convergence.
            </p>
          </div>

          <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800">
            <div className="w-8 h-8 rounded bg-[#FEF3C7] text-[#B45309] dark:bg-[#B45309]/20 dark:text-[#fde68a] flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-ink-primary dark:text-white font-semibold text-sm">
              Institutional Academic Standards
            </h4>
            <p className="text-xs text-ink-secondary dark:text-paper-400 mt-1 leading-relaxed">
              Official IARE Tech Talk &amp; Concept Video presentation studio with authentic Master Slide geometry, institutional crests, and native PPTX generation.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Sitemap */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Info & Colophon */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo className="w-7 h-7" />
              <span className="font-sans font-bold text-base text-ink-primary dark:text-white tracking-tight">
                VeloDoc <span className="text-vermilion">Studio</span>
              </span>
            </Link>
            <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed font-sans max-w-sm">
              Swiss-precision, on-device document and presentation workbench. Built with WebAssembly, Canvas, and zero cloud dependencies.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://github.com/vigneshreddy-dev/velodoc-studio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border border-paper-300 dark:border-charcoal-border hover:bg-paper-200 dark:hover:bg-charcoal-700 text-ink-primary dark:text-white transition-colors"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                GitHub Repository
              </a>
            </div>
          </div>

          {/* Documentation & Institutional */}
          <div>
            <h5 className="text-xs font-semibold text-ink-primary dark:text-white uppercase tracking-wider mb-3 font-mono">
              Documentation
            </h5>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/about" className="hover:text-vermilion transition-colors">
                  About Architecture
                </Link>
              </li>
              <li>
                <Link href="/guide" className="hover:text-vermilion transition-colors">
                  Operations Manual
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-vermilion transition-colors">
                  Zero-Server Privacy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-vermilion transition-colors">
                  Contact &amp; Support
                </Link>
              </li>
              <li>
                <Link href="/#tech-talk-ppt-studio" className="hover:text-vermilion transition-colors">
                  IARE Tech Talk Studio
                </Link>
              </li>
            </ul>
          </div>

          {/* Merge & Edit Tools */}
          <div>
            <h5 className="text-xs font-semibold text-ink-primary dark:text-white uppercase tracking-wider mb-3 font-mono">
              Precision Tools
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link href={t.path} className="hover:text-vermilion transition-colors">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compress & Convert */}
          <div>
            <h5 className="text-xs font-semibold text-ink-primary dark:text-white uppercase tracking-wider mb-3 font-mono">
              Compress &amp; Convert
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.slice(5, 10).map((t) => (
                <li key={t.id}>
                  <Link href={t.path} className="hover:text-vermilion transition-colors">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Colophon Bar */}
        <div className="mt-12 pt-8 border-t border-paper-300 dark:border-charcoal-border flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-4 font-mono">
          <p>© {new Date().getFullYear()} VeloDoc Studio. Open source client-side architecture.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink-primary dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/guide" className="hover:text-ink-primary dark:hover:text-white transition-colors">
              User Guide
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-ink-primary dark:hover:text-white transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
