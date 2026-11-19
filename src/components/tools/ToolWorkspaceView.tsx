"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToolDefinition } from "@/types";
import { PDF_TOOLS, IMAGE_TOOLS, FILE_TOOLS } from "@/lib/constants";
import { ToolIcon } from "@/components/common/ToolIcon";
import { ToolErrorBoundary } from "@/components/common/ErrorBoundary";
import {
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  LayoutGrid,
  ArrowLeft,
} from "@/components/common/icons";

// Tool components
import { MergePdfTool } from "./MergePdfTool";
import { RemovePagesTool } from "./RemovePagesTool";
import { AddPagesTool } from "./AddPagesTool";
import { SplitPdfTool } from "./SplitPdfTool";
import { OrganizePdfTool } from "./OrganizePdfTool";
import { CompressPdfTool } from "./CompressPdfTool";
import { PdfToImageTool } from "./PdfToImageTool";
import { ImageToPdfTool } from "./ImageToPdfTool";
import { CameraToPdfTool } from "./CameraToPdfTool";
import { WatermarkPdfTool } from "./WatermarkPdfTool";
import { ImageStudioTool } from "./ImageStudioTool";
import { SignPdfTool } from "./SignPdfTool";
import { RedactPdfTool } from "./RedactPdfTool";
import { PageNumbersTool } from "./PageNumbersTool";
import { CropPdfTool } from "./CropPdfTool";
import { GrayscalePdfTool } from "./GrayscalePdfTool";
import { PdfToTextTool } from "./PdfToTextTool";
import { MarkdownToPdfTool } from "./MarkdownToPdfTool";
import { MetadataPdfTool } from "./MetadataPdfTool";
import { ComparePdfTool } from "./ComparePdfTool";
import { FlattenPdfTool } from "./FlattenPdfTool";
import { NUpPdfTool } from "./NUpPdfTool";
import { PassportPhotoTool } from "./PassportPhotoTool";
import { QrBarcodePdfTool } from "./QrBarcodePdfTool";
import { InvoiceGeneratorTool } from "./InvoiceGeneratorTool";
import { CertificateGeneratorTool } from "./CertificateGeneratorTool";
import { PdfDiffTextTool } from "./PdfDiffTextTool";
import { HtmlToPdfTool } from "./HtmlToPdfTool";
import { PdfFormFillerTool } from "./PdfFormFillerTool";
import { PresentationPdfTool } from "./PresentationPdfTool";
import { IdCardStudioTool } from "./IdCardStudioTool";
import { CodeToPdfTool } from "./CodeToPdfTool";
import { OcrPdfTool } from "./OcrPdfTool";
import { TocPdfTool } from "./TocPdfTool";
import { QrStampPdfTool } from "./QrStampPdfTool";
import { FillFormPdfTool } from "./FillFormPdfTool";
import { LinksPdfTool } from "./LinksPdfTool";
import { CreateZipTool } from "./CreateZipTool";
import { UnzipTool } from "./UnzipTool";
import { ProtectPdfTool } from "./ProtectPdfTool";
import { FileHashTool } from "./FileHashTool";
import { DataConverterTool } from "./DataConverterTool";
import { QrStudioTool } from "./QrStudioTool";
import { TextDiffTool } from "./TextDiffTool";

interface ToolWorkspaceViewProps {
  tool: ToolDefinition;
}

export function ToolWorkspaceView({ tool }: ToolWorkspaceViewProps) {
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const renderToolComponent = () => {
    switch (tool.id) {
      case "merge-pdf":
        return <MergePdfTool />;
      case "compress-pdf":
        return <CompressPdfTool />;
      case "split-pdf":
        return <SplitPdfTool />;
      case "remove-pages":
        return <RemovePagesTool />;
      case "add-pages":
        return <AddPagesTool />;
      case "organize-pdf":
        return <OrganizePdfTool />;
      case "sign-pdf":
        return <SignPdfTool />;
      case "redact-pdf":
        return <RedactPdfTool />;
      case "page-numbers":
        return <PageNumbersTool />;
      case "crop-pdf":
        return <CropPdfTool />;
      case "grayscale-pdf":
        return <GrayscalePdfTool />;
      case "watermark-pdf":
        return <WatermarkPdfTool />;
      case "pdf-to-text":
        return <PdfToTextTool />;
      case "markdown-to-pdf":
        return <MarkdownToPdfTool />;
      case "metadata-pdf":
        return <MetadataPdfTool />;
      case "compare-pdf":
        return <ComparePdfTool />;
      case "pdf-to-image":
        return <PdfToImageTool />;
      case "image-to-pdf":
        return <ImageToPdfTool />;
      case "camera-to-pdf":
        return <CameraToPdfTool />;
      case "image-studio":
        return <ImageStudioTool />;
      case "flatten-pdf":
        return <FlattenPdfTool />;
      case "nup-pdf":
        return <NUpPdfTool />;
      case "passport-photo":
        return <PassportPhotoTool />;
      case "qr-barcode-pdf":
        return <QrBarcodePdfTool />;
      case "invoice-generator":
        return <InvoiceGeneratorTool />;
      case "certificate-generator":
        return <CertificateGeneratorTool />;
      case "pdf-diff-text":
        return <PdfDiffTextTool />;
      case "html-to-pdf":
        return <HtmlToPdfTool />;
      case "pdf-form-filler":
        return <PdfFormFillerTool />;
      case "presentation-pdf":
        return <PresentationPdfTool />;
      case "id-card-studio":
        return <IdCardStudioTool />;
      case "code-to-pdf":
        return <CodeToPdfTool />;
      case "ocr-pdf":
        return <OcrPdfTool />;
      case "toc-pdf":
        return <TocPdfTool />;
      case "qr-stamp-pdf":
        return <QrStampPdfTool />;
      case "fill-form-pdf":
        return <FillFormPdfTool />;
      case "links-pdf":
        return <LinksPdfTool />;
      case "create-zip":
        return <CreateZipTool />;
      case "unzip-files":
        return <UnzipTool />;
      case "protect-pdf":
        return <ProtectPdfTool />;
      case "file-hash":
        return <FileHashTool />;
      case "data-converter":
        return <DataConverterTool />;
      case "qr-studio":
        return <QrStudioTool />;
      case "text-diff":
        return <TextDiffTool />;
      default:
        return (
          <div className="p-8 text-center text-zinc-700 dark:text-zinc-400 font-sans">
            Tool workspace &ldquo;{tool.name}&rdquo; not found.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen pb-20 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 relative z-10">
        {/* Navigation Breadcrumb Bar & Quick Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-300 dark:border-charcoal-border pb-4">
          <nav className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Studio Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
            <Link
              href="/#tools"
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              Catalog
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
            <span className="text-zinc-950 dark:text-white font-semibold">{tool.name}</span>
          </nav>

          {/* Quick Tool Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((prev) => !prev)}
              className="bg-white dark:bg-charcoal-800 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-charcoal-border hover:bg-zinc-100 dark:hover:bg-charcoal-700 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-paper cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#1E3A5F] dark:text-indigo-400" />
              <span>Switch Tool</span>
              <ChevronDown className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
            </button>

            {switcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setSwitcherOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white dark:bg-[#0F111A] border border-zinc-200 dark:border-white/[0.12] shadow-paper-modal z-40 p-2 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  {/* PDF Tools Section */}
                  <div>
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-700 dark:text-cyan-400 uppercase tracking-wider flex items-center justify-between font-mono">
                      <span>PDF Tools</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-900 dark:bg-cyan-500/10 dark:text-cyan-300 font-semibold border border-slate-200 dark:border-transparent">
                        {PDF_TOOLS.length}
                      </span>
                    </div>
                    <div className="space-y-0.5 pt-1">
                      {PDF_TOOLS.map((t) => {
                        const isCurrent = t.id === tool.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSwitcherOpen(false);
                              router.push(t.path);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-orange-50 text-orange-950 font-semibold border border-orange-200 dark:bg-indigo-600/25 dark:text-indigo-200 dark:border-indigo-500/40"
                                : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06]"
                            }`}
                          >
                            <div className="p-1 rounded-lg bg-zinc-100 dark:bg-charcoal-700 text-zinc-800 dark:text-white shrink-0 shadow-sm border border-zinc-200 dark:border-transparent">
                              <ToolIcon name={t.icon} className="w-3 h-3" />
                            </div>
                            <span className="truncate">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Image Tools Section */}
                  <div className="border-t border-zinc-200 dark:border-white/5 pt-2">
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-700 dark:text-pink-400 uppercase tracking-wider flex items-center justify-between font-mono">
                      <span>Image Tools &amp; Converters</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-900 dark:bg-pink-500/10 dark:text-pink-300 font-semibold border border-slate-200 dark:border-transparent">
                        {IMAGE_TOOLS.length}
                      </span>
                    </div>
                    <div className="space-y-0.5 pt-1">
                      {IMAGE_TOOLS.map((t) => {
                        const isCurrent = t.id === tool.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSwitcherOpen(false);
                              router.push(t.path);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-orange-50 text-orange-950 font-semibold border border-orange-200 dark:bg-pink-600/25 dark:text-pink-200 dark:border-pink-500/40"
                                : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06]"
                            }`}
                          >
                            <div className="p-1 rounded-lg bg-zinc-100 dark:bg-charcoal-700 text-zinc-800 dark:text-white shrink-0 shadow-sm border border-zinc-200 dark:border-transparent">
                              <ToolIcon name={t.icon} className="w-3 h-3" />
                            </div>
                            <span className="truncate">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* File & Data Tools Section */}
                  {FILE_TOOLS.length > 0 && (
                    <div className="border-t border-zinc-200 dark:border-white/5 pt-2">
                      <div className="px-3 py-1 text-[10px] font-bold text-zinc-700 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between font-mono">
                        <span>Archives, Data &amp; Security</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-900 dark:bg-amber-500/10 dark:text-amber-300 font-semibold border border-slate-200 dark:border-transparent">
                          {FILE_TOOLS.length}
                        </span>
                      </div>
                      <div className="space-y-0.5 pt-1">
                        {FILE_TOOLS.map((t) => {
                          const isCurrent = t.id === tool.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSwitcherOpen(false);
                                router.push(t.path);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                                isCurrent
                                  ? "bg-orange-50 text-orange-950 font-semibold border border-orange-200 dark:bg-amber-600/25 dark:text-amber-200 dark:border-amber-500/40"
                                  : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06]"
                              }`}
                            >
                              <div className="p-1 rounded-lg bg-zinc-100 dark:bg-charcoal-700 text-zinc-800 dark:text-white shrink-0 shadow-sm border border-zinc-200 dark:border-transparent">
                                <ToolIcon name={t.icon} className="w-3 h-3" />
                              </div>
                              <span className="truncate">{t.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tool Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-7 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper relative overflow-hidden">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`p-3.5 rounded-xl bg-orange-50 text-[#C2410C] border border-orange-200 dark:bg-gradient-to-br ${tool.color} dark:text-white shrink-0`}
            >
              <ToolIcon name={tool.icon} className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-[-0.03em]">
                  {tool.name}
                </h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-300 dark:border-white/[0.09] text-slate-900 dark:text-zinc-300 font-mono">
                  {tool.category}
                </span>
                {tool.badge && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/15 border border-orange-300 dark:border-orange-500/30 text-orange-950 dark:text-orange-300 font-mono">
                    {tool.badge}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 max-w-2xl leading-normal font-sans">
                {tool.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300 text-xs font-medium font-mono tabular-nums">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#2E5A44] dark:text-emerald-400" />
            <span className="hidden sm:inline">100% In-Browser Sandbox</span>
            <span className="sm:hidden">100% Private</span>
          </div>
        </div>

        {/* Visual 1 -> 2 -> 3 Step Guide Bar */}
        <div className="flex items-center justify-between max-w-xl mx-auto px-4 py-2 rounded-xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border text-xs shadow-paper">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
            <span className="w-5 h-5 rounded-full bg-[#EDF5F2] dark:bg-[#143A2F]/40 border border-[#C4DFD5] dark:border-[#143A2F] text-[#2E5A44] dark:text-[#6ee7b7] flex items-center justify-center text-[10px] font-bold font-mono">1</span>
            <span className="hidden sm:inline">Select or Scan Files</span>
            <span className="sm:hidden">1. Select</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
          <div className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
            <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-charcoal-700 border border-zinc-300 dark:border-charcoal-border text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-bold font-mono">2</span>
            <span className="hidden sm:inline">Pick Your Option</span>
            <span className="sm:hidden">2. Options</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
          <div className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
            <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-charcoal-700 border border-zinc-300 dark:border-charcoal-border text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-bold font-mono">3</span>
            <span className="hidden sm:inline">Preview &amp; Save</span>
            <span className="sm:hidden">3. Save</span>
          </div>
        </div>

        {/* Dynamic Tool Interactive Workspace */}
        <div className="pt-1">
          <ToolErrorBoundary key={tool.id} fallbackTitle={`${tool.name} Recovered`}>
            {renderToolComponent()}
          </ToolErrorBoundary>
        </div>
      </div>
    </div>
  );
}
