import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { TOOLS } from "@/lib/constants";
import { ShieldCheck, Cpu, Zap, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#05060B]/90 border-t border-white/[0.08] text-zinc-400 text-sm mt-auto relative z-10 backdrop-blur-xl">
      {/* Feature highlights bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-white/[0.06]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl premium-card">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">
                100% Zero-Cloud Privacy
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-normal">
                Your confidential documents never touch any server. All PDF and
                image operations execute locally in your browser memory.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl premium-card">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">
                Instant Zero-Latency Engine
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-normal">
                No upload queues, network bottlenecks, or server wait times.
                Operations execute at hardware speed using Canvas and ArrayBuffers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl premium-card">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">
                30-Document Zero-Crash Batch
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-normal">
                Say goodbye to arbitrary 25MB limits. Manipulate huge batches
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
          <div className="md:col-span-1 space-y-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo className="w-8 h-8" />
              <span className="font-bold text-base text-white tracking-[-0.03em]">
                VeloDoc <span className="text-cyan-400 font-extrabold">Pro</span>
              </span>
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Award-winning, ultra-premium client-side document &amp; PDF studio.
              Engineered with Raycast, Linear &amp; Apple precision.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium font-mono">
              <Lock className="w-3.5 h-3.5" />
              <span>Air-gapped &amp; Serverless-safe</span>
            </div>
          </div>

          {/* Merge & Edit */}
          <div>
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 font-mono">
              Merge &amp; Edit
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.filter(
                (t) =>
                  t.category === "Merge & Split" ||
                  t.category === "Edit & Organize Pages" ||
                  t.category === "Edit Pages"
              ).slice(0, 6).map((t) => (
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

          {/* Shrink & Exact KB */}
          <div>
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 font-mono">
              Shrink &amp; Exact KB
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.filter(
                (t) =>
                  t.category === "Shrink & Exact KB" ||
                  t.category === "Shrink & Compress"
              ).map((t) => (
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

          {/* Convert & Camera Scan */}
          <div>
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 font-mono">
              Convert &amp; Scan
            </h5>
            <ul className="space-y-2 text-xs">
              {TOOLS.filter(
                (t) =>
                  t.category === "Convert & Camera Scan" ||
                  t.category === "Convert Formats"
              ).map((t) => (
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
            <h5 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 font-mono">
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
              <li className="pt-2 text-zinc-500 font-mono text-[11px]">
                19 Core Native Tools
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4 font-mono">
          <p>© {new Date().getFullYear()} VeloDoc Pro Studio. Open source MIT License.</p>
          <p className="text-center sm:text-right">
            Zero telemetry. Zero cookies. 100% Private In-Memory Sandbox.
          </p>
        </div>
      </div>
    </footer>
  );
}
