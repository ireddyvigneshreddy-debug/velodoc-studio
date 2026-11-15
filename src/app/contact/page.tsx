"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, GithubIcon } from "@/components/common/icons";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message) return;
    setSubmitted(true);
  };

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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono tracking-wider uppercase bg-paper-200 text-ink-primary dark:bg-charcoal-700 dark:text-white border border-paper-300 dark:border-charcoal-border">
            Direct Dispatch
          </span>
          <span className="text-xs font-mono text-ink-muted">Developer Inquiries</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif italic text-ink-primary dark:text-white mb-4 tracking-tight">
          Direct Developer Support.
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary dark:text-paper-400 font-sans leading-relaxed">
          Questions regarding client-side WebAssembly integration, institutional Tech Talk slide templates, or bug reports? Reach out directly.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left column: Direct channels */}
        <div className="md:col-span-2 space-y-6">
          <div className="paper-card p-6 rounded-lg dark:bg-charcoal-800">
            <h2 className="text-sm font-semibold text-ink-primary dark:text-white mb-2">
              GitHub Repository
            </h2>
            <p className="text-xs text-ink-secondary dark:text-paper-400 mb-4 leading-relaxed font-sans">
              For bug reports, feature requests, or code contributions, please open an issue on our public tracker:
            </p>
            <a
              href="https://github.com/vigneshreddy-dev/velodoc-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded text-xs font-mono font-medium border border-paper-300 dark:border-charcoal-border hover:bg-paper-100 dark:hover:bg-charcoal-700 transition-colors w-full justify-center"
            >
              <GithubIcon className="w-4 h-4" />
              vigneshreddy-dev/velodoc-studio
            </a>
          </div>

          <div className="paper-card p-6 rounded-lg dark:bg-charcoal-800">
            <h2 className="text-sm font-semibold text-ink-primary dark:text-white mb-2">
              Institutional Tech Talk Inquiries
            </h2>
            <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
              If your department or college requires custom Master Slide XML styling or customized syllabus outline presets, file a template request on GitHub.
            </p>
          </div>
        </div>

        {/* Right column: Dispatch form */}
        <div className="md:col-span-3">
          <div className="paper-card p-6 sm:p-8 rounded-lg dark:bg-charcoal-800">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif text-ink-primary dark:text-white">
                  Message Dispatched
                </h3>
                <p className="text-xs text-ink-secondary dark:text-paper-400 max-w-sm mx-auto">
                  Thank you for your inquiry. Our engineering team reviews dispatches regularly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-4 py-2 text-xs font-mono rounded bg-paper-200 dark:bg-charcoal-700 hover:bg-paper-300 dark:hover:bg-charcoal-600 transition-colors"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-base font-semibold text-ink-primary dark:text-white mb-1">
                  Dispatch a Note to the Team
                </h2>
                <p className="text-xs text-ink-muted mb-4 font-sans">
                  All communications remain confidential and are handled directly by developers.
                </p>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 rounded text-sm bg-white dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border focus:outline-none focus:border-vermilion transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@institution.edu"
                    className="w-full px-3.5 py-2.5 rounded text-sm bg-white dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border focus:outline-none focus:border-vermilion transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
                    Subject / Topic
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Feature suggestion or bug in compression"
                    className="w-full px-3.5 py-2.5 rounded text-sm bg-white dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border focus:outline-none focus:border-vermilion transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Provide details regarding your question or report..."
                    className="w-full px-3.5 py-2.5 rounded text-sm bg-white dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border focus:outline-none focus:border-vermilion transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-vermilion text-white hover:bg-vermilion-hover transition-colors shadow-paper"
                >
                  Transmit Dispatch
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
