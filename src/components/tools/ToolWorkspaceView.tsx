"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToolDefinition } from "@/types";
import { PDF_TOOLS, IMAGE_TOOLS } from "@/lib/constants";
import { ToolIcon } from "@/components/common/ToolIcon";
import { ToolErrorBoundary } from "@/components/common/ErrorBoundary";
import {
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  LayoutGrid,
  ArrowLeft,
} from "lucide-react";

// Tool components (All 19 native tools)
import { MergePdfTool } from "./MergePdfTool";
import { RemovePagesTool } from "./RemovePagesTool";
import { AddPagesTool } from "./AddPagesTool";
import { SplitPdfTool } from "./SplitPdfTool";
import { OrganizePdfTool } from "./OrganizePdfTool";
import { CompressPdfTool } from "./CompressPdfTool";
import { PdfToImageTool } from "./PdfToImageTool";
import { ImageToPdfTool } from "./ImageToPdfTool";
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
      case "image-studio":
        return <ImageStudioTool />;
      default:
        return (
          <div className="p-8 text-center text-zinc-400">
            Tool workspace &ldquo;{tool.name}&rdquo; not found.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen pb-20 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 relative z-10">
        {/* Navigation Breadcrumb Bar & Quick Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <nav className="flex items-center gap-2 text-xs text-zinc-400">
            <Link
              href="/"
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Studio Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <Link
              href="/#all-tools"
              className="hover:text-white transition-colors"
            >
              Catalog
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-white font-medium">{tool.name}</span>
          </nav>

          {/* Quick Tool Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((prev) => !prev)}
              className="glass-pill flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all shadow-sm cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch Tool</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {switcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setSwitcherOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-[#0F111A] border border-white/[0.12] shadow-2xl z-40 p-2 space-y-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
                  {/* PDF Tools Section */}
                  <div>
                    <div className="px-3 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between font-mono">
                      <span>PDF Tools</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300">
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
                                ? "bg-indigo-600/25 text-indigo-200 font-semibold border border-indigo-500/40"
                                : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                            }`}
                          >
                            <div
                              className={`p-1 rounded-lg bg-gradient-to-br ${t.color} text-white shrink-0 shadow-sm`}
                            >
                              <ToolIcon name={t.icon} className="w-3 h-3" />
                            </div>
                            <span className="truncate">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Image Tools Section */}
                  <div className="border-t border-white/5 pt-2">
                    <div className="px-3 py-1 text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center justify-between font-mono">
                      <span>Image Tools &amp; Converters</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/10 text-pink-300">
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
                                ? "bg-pink-600/25 text-pink-200 font-semibold border border-pink-500/40"
                                : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                            }`}
                          >
                            <div
                              className={`p-1 rounded-lg bg-gradient-to-br ${t.color} text-white shrink-0 shadow-sm`}
                            >
                              <ToolIcon name={t.icon} className="w-3 h-3" />
                            </div>
                            <span className="truncate">{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tool Header Banner with Specular Rim Lighting */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-7 rounded-3xl premium-card shadow-2xl relative overflow-hidden">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`p-3.5 rounded-2xl bg-gradient-to-br ${tool.color} text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_20px_rgba(99,102,241,0.35)] shrink-0`}
            >
              <ToolIcon name={tool.icon} className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-[-0.03em]">
                  {tool.name}
                </h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.09] text-zinc-400 font-mono">
                  {tool.category}
                </span>
                {tool.badge && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono">
                    {tool.badge}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-normal">
                {tool.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium font-mono tabular-nums">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="hidden sm:inline">100% In-Browser Sandbox</span>
            <span className="sm:hidden">100% Private</span>
          </div>
        </div>

        {/* Visual 1 -> 2 -> 3 Step Guide Bar */}
        <div className="flex items-center justify-between max-w-xl mx-auto px-4 py-2 rounded-2xl glass-pill text-xs shadow-inner">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold font-mono">1</span>
            <span className="hidden sm:inline">Select or Scan Files</span>
            <span className="sm:hidden">1. Select</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold font-mono">2</span>
            <span className="hidden sm:inline">Pick Your Option</span>
            <span className="sm:hidden">2. Options</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold font-mono">3</span>
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
