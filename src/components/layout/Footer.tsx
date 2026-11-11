import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { TOOLS } from "@/lib/constants";
import { ShieldCheck, Cpu, Zap, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#07080C] border-t border-white/[0.08] text-slate-400 text-sm mt-auto relative z-10">
      {/* Feature highlights bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-white/[0.06]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">
                100% Zero-Cloud Privacy
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Your confidential documents never touch any server. All PDF and
                image operations execute locally in your browser memory.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">
                Instant Zero-Latency Engine
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                No upload queues, network bottlenecks, or server wait times.
                Operations execute at hardware speed using Canvas and ArrayBuffers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">
                Unlimited File Sizes
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Say goodbye to arbitrary 25MB limits. Manipulate huge documents
                freely with no paywalls, accounts, or rate limits.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo className="w-8 h-8" />
              <span className="font-bold text-base text-white tracking-tight">
                VeloDoc <span className="text-cyan-400">Pro</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Next-generation client-side PDF, image, and document manipulation studio.
              Designed with Raycast &amp; Linear precision.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Offline-capable &amp; Serverless-safe</span>
            </div>
          </div>

          {/* Merge & Edit */}
          <div>
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Merge &amp; Edit
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.filter((t) => t.category === "Merge & Split" || t.category === "Edit Pages").slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.path}
                    className="hover:text-indigo-400 transition-colors"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Shrink & Compress */}
          <div>
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Shrink &amp; Compress
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.filter((t) => t.category === "Shrink & Compress").map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.path}
                    className="hover:text-indigo-400 transition-colors"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Convert Formats */}
          <div>
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Convert Formats
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.filter((t) => t.category === "Convert Formats").map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.path}
                    className="hover:text-indigo-400 transition-colors"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sign & Compare */}
          <div>
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Sign &amp; Compare
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.filter((t) => t.category === "Sign, Redact & Compare").map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.path}
                    className="hover:text-indigo-400 transition-colors"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
              <li className="pt-2 text-slate-500">
                19 Core Native Tools
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} VeloDoc Pro Studio. Open source MIT License.</p>
          <p className="text-center sm:text-right">
            Zero telemetry. Zero cookies. 100% Private In-Memory Execution.
          </p>
        </div>
      </div>
    </footer>
  );
}
