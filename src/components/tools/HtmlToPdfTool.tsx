"use client";

import React, { useState, useRef, useEffect } from "react";
import { sessionHistory } from "@/lib/session-history";
import {
  Code,
  Printer,
  Eye,
  RefreshCw,
} from "@/components/common/icons";

const TEMPLATES = [
  {
    id: "resume",
    name: "Modern Executive Resume",
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 32px; color: #1e293b; background: #fff; line-height: 1.5; font-size: 13px; }
    h1 { margin: 0; font-size: 24px; color: #0f172a; font-weight: 700; letter-spacing: -0.5px; }
    .title { color: #6366f1; font-weight: 600; font-size: 13px; margin-top: 2px; }
    .contact { font-size: 11px; color: #64748b; margin-top: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-top: 20px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; }
    .job { margin-top: 12px; }
    .job-header { display: flex; justify-content: space-between; font-weight: 600; color: #0f172a; }
    .job-sub { font-size: 11px; color: #64748b; margin-bottom: 6px; }
    ul { margin: 4px 0 0 16px; padding: 0; }
    li { margin-bottom: 4px; color: #334155; }
    .skills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 11px; color: #334155; font-weight: 500; }
  </style>
</head>
<body>
  <h1>Sarah Jenkins, M.Sc.</h1>
  <div class="title">Staff Cloud Architect & Distributed Systems Engineer</div>
  <div class="contact">San Francisco, CA • sarah.jenkins@example.com • +1 (555) 234-8901 • github.com/sjenkins</div>

  <div class="section-title">Executive Summary</div>
  <p style="margin-top: 8px; color: #334155;">Accomplished Systems Architect with 10+ years specializing in high-throughput distributed microservices, low-latency document processing, and zero-trust cloud architectures across AWS and GCP.</p>

  <div class="section-title">Work Experience</div>
  <div class="job">
    <div class="job-header"><span>Principal Infrastructure Architect — Nexus Systems</span><span>2021 – Present</span></div>
    <div class="job-sub">San Francisco, CA</div>
    <ul>
      <li>Led core architectural overhaul processing 45M daily PDF transformations with sub-200ms latency.</li>
      <li>Architected client-side WebAssembly sandbox saving $180,000 in monthly compute infrastructure.</li>
    </ul>
  </div>

  <div class="job">
    <div class="job-header"><span>Senior Backend Engineer — CloudFlow Inc.</span><span>2018 – 2021</span></div>
    <div class="job-sub">Austin, TX</div>
    <ul>
      <li>Designed end-to-end encrypted document storage layer compliant with HIPAA and SOC2 Type II.</li>
      <li>Optimized Redis and Postgres query pipelines improving throughput by 42%.</li>
    </ul>
  </div>

  <div class="section-title">Core Competencies</div>
  <div class="skills">
    <span class="badge">TypeScript / Node.js</span>
    <span class="badge">Next.js & React</span>
    <span class="badge">Rust / WebAssembly</span>
    <span class="badge">Kubernetes & Docker</span>
    <span class="badge">PostgreSQL & Redis</span>
    <span class="badge">Distributed Systems</span>
  </div>
</body>
</html>`,
  },
  {
    id: "tech-spec",
    name: "Engineering Tech Spec",
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1e293b; line-height: 1.6; font-size: 13px; }
    h1 { font-size: 22px; color: #0f172a; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
    h2 { font-size: 15px; color: #334155; margin-top: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
    code { font-family: monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 12px; color: #4338ca; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; color: #334155; }
  </style>
</head>
<body>
  <h1>RFC-2026: Zero-Knowledge Client Document Sandbox</h1>
  <div class="meta">Author: Platform Engineering • Status: Approved • Version: 2.4.0</div>

  <h2>1. Problem Statement</h2>
  <p>Enterprise users handling confidential medical, legal, and financial records require absolute certainty that document bytes never egress the local browser execution context.</p>

  <h2>2. Architectural Boundary</h2>
  <table>
    <tr><th>Component</th><th>Execution Boundary</th><th>Security Guarantee</th></tr>
    <tr><td>PDF.js Canvas Engine</td><td>Browser Memory (RAM)</td><td>No network requests permitted</td></tr>
    <tr><td>pdf-lib Imposition</td><td>Web Worker Sandbox</td><td>Isolated origin, ephemeral buffers</td></tr>
    <tr><td>IndexedDB Cache</td><td>Local Storage</td><td>Encrypted at rest, cleared on session close</td></tr>
  </table>
</body>
</html>`,
  },
];

export function HtmlToPdfTool() {
  const [htmlContent, setHtmlContent] = useState(TEMPLATES[0].html);
  const [pageSize, setPageSize] = useState<"A4" | "Letter">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Update iframe preview whenever html content changes
  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
    }
  }, [htmlContent]);

  const handlePrintPdf = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    iframeRef.current.contentWindow.focus();
    iframeRef.current.contentWindow.print();

    sessionHistory.recordExecution({
      toolId: "html-to-pdf",
      toolName: "HTML & Web Code to PDF Studio",
      inputFiles: ["HTML Template"],
      outputFileName: "rendered-document.pdf",
      outputSizeBytes: 120000,
      durationMs: 80,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Template Selector Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-semibold text-white">Starter Templates:</span>
          <div className="flex items-center gap-1.5">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setHtmlContent(tmpl.html)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-colors"
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Paper controls */}
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value as typeof pageSize)}
            className="bg-zinc-900 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="A4">A4 Paper</option>
            <option value="Letter">US Letter</option>
          </select>
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as typeof orientation)}
            className="bg-zinc-900 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-white"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>

      {/* Dual Column Layout: Editor & Iframe Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* HTML Editor Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="premium-card p-5 rounded-3xl space-y-3 border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-4 h-4 text-indigo-400" />
                HTML & CSS Editor
              </span>
              <button
                type="button"
                onClick={() => setHtmlContent(TEMPLATES[0].html)}
                className="text-xs text-zinc-500 hover:text-indigo-400 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset Code
              </button>
            </div>

            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={18}
              className="w-full bg-zinc-950 font-mono text-xs text-zinc-300 border border-white/[0.08] rounded-2xl p-4 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
              spellCheck={false}
            />

            <button
              type="button"
              onClick={handlePrintPdf}
              className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print to PDF / Save Clean Document</span>
            </button>
          </div>
        </div>

        {/* Live Rendered Iframe Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="premium-card p-5 rounded-3xl space-y-3 border border-white/[0.08]">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              Live Document Render Preview
            </span>

            <div className="w-full rounded-2xl overflow-hidden border border-zinc-300 bg-white shadow-2xl min-h-[460px]">
              <iframe
                ref={iframeRef}
                title="HTML Preview"
                className="w-full h-[460px] border-none bg-white block"
                sandbox="allow-same-origin allow-modals"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 pb-safe md:hidden bg-zinc-950/90 backdrop-blur-xl border-t border-white/[0.12] p-3 shadow-2xl">
        <button
          type="button"
          onClick={handlePrintPdf}
          className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Save Document as PDF</span>
        </button>
      </div>
    </div>
  );
}
