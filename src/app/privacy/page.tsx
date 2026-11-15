import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, CheckCircle, ArrowLeft, EyeOff, Globe } from "@/components/common/icons";

export const metadata = {
  title: "Privacy — Zero-Server Security Policy",
  description: "The zero-server, zero-upload cryptographic security and privacy policy of VeloDoc Studio.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-muted hover:text-ink-primary dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Workbench
        </Link>
      </div>

      {/* Header */}
      <header className="border-b border-paper-300 dark:border-charcoal-border pb-8 mb-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono tracking-wider uppercase bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/40 dark:text-[#6ee7b7] border border-[#C4DFD5] dark:border-[#143A2F]">
            Strict Zero-Server Policy
          </span>
          <span className="text-xs font-mono text-ink-muted">Cryptographic Guarantee</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif italic text-ink-primary dark:text-white mb-4 tracking-tight">
          Your Files Never Leave Your Browser.
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary dark:text-paper-400 font-sans leading-relaxed">
          We believe privacy policies are meaningless without mathematical and architectural guarantees. Here is exactly how VeloDoc Studio guarantees absolute confidentiality for every document you process.
        </p>
      </header>

      {/* Main Content */}
      <div className="space-y-10">
        {/* Verification Box */}
        <div className="p-6 rounded-lg bg-vermilion-light/50 border border-vermilion/20 dark:bg-vermilion/10 dark:border-vermilion/30">
          <h2 className="text-base font-semibold text-vermilion dark:text-vermilion-hover flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5" />
            How to Independently Verify This Guarantee
          </h2>
          <p className="text-sm text-ink-secondary dark:text-paper-400 leading-relaxed font-sans mb-3">
            Do not take our word for it. You can prove that zero bytes leave your machine in under ten seconds:
          </p>
          <ol className="list-decimal pl-5 text-xs sm:text-sm text-ink-secondary dark:text-paper-400 space-y-1.5 font-mono">
            <li>Open your browser’s Developer Tools (<kbd className="px-1 py-0.5 rounded bg-white dark:bg-charcoal-700">F12</kbd> or <kbd className="px-1 py-0.5 rounded bg-white dark:bg-charcoal-700">Cmd+Option+I</kbd>).</li>
            <li>Switch to the <strong>Network</strong> tab and filter by <strong>Fetch / XHR</strong>.</li>
            <li>Drop a confidential PDF into any VeloDoc tool, compress it, sign it, or convert it.</li>
            <li>Observe the network log: <strong>Zero outbound requests occur.</strong> The entire operation is handled in local WebAssembly memory.</li>
          </ol>
        </div>

        {/* 4 Pillars */}
        <div className="space-y-6">
          <h2 className="text-xl font-serif text-ink-primary dark:text-white">
            Core Security Principles
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800">
              <div className="flex items-center gap-2 text-ink-primary dark:text-white font-semibold mb-2">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Zero Cloud Storage
              </div>
              <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed">
                VeloDoc Studio owns no database of user files, runs no document conversion server, and maintains zero cloud storage buckets. We cannot view your files even if compelled by law, because we do not have them.
              </p>
            </div>

            <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800">
              <div className="flex items-center gap-2 text-ink-primary dark:text-white font-semibold mb-2">
                <EyeOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                No Tracking Telemetry
              </div>
              <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed">
                We do not inject third-party ad pixels, session recording replay scripts (e.g., FullStory, Hotjar), or behavioral trackers that could capture form data or document text.
              </p>
            </div>

            <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800">
              <div className="flex items-center gap-2 text-ink-primary dark:text-white font-semibold mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Ephemeral Volatile RAM
              </div>
              <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed">
                Document data is loaded as typed arrays (<code>Uint8Array</code>) inside browser memory and released via JavaScript garbage collection as soon as the workspace or tab is closed.
              </p>
            </div>

            <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800">
              <div className="flex items-center gap-2 text-ink-primary dark:text-white font-semibold mb-2">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                GDPR &amp; HIPAA Friendly
              </div>
              <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed">
                Because no personal data leaves the data subject’s device, organizations processing healthcare records (HIPAA) or European personal data (GDPR) retain full jurisdictional sovereignty.
              </p>
            </div>
          </div>
        </div>

        {/* Local Storage Statement */}
        <section className="paper-card p-6 rounded-lg dark:bg-charcoal-800">
          <h3 className="text-sm font-semibold text-ink-primary dark:text-white mb-2">
            Local Browser Storage Policy
          </h3>
          <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
            The only information persisted by VeloDoc Studio is stored locally in your own browser’s <code>localStorage</code> sandbox: (1) your UI theme preference (Light / Dark mode), and (2) user-configured API keys if you explicitly choose to save an AI key into your client-side ApiKeyVault. These strings are never transmitted to our servers.
          </p>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="mt-12 pt-8 border-t border-paper-300 dark:border-charcoal-border flex items-center justify-between">
        <Link
          href="/guide"
          className="text-xs font-mono uppercase tracking-wider text-ink-muted hover:text-ink-primary dark:hover:text-white"
        >
          ← Operations Manual
        </Link>
        <Link
          href="/contact"
          className="text-xs font-mono uppercase tracking-wider text-vermilion hover:underline flex items-center gap-1"
        >
          Contact &amp; Support →
        </Link>
      </div>
    </div>
  );
}
