"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToolDefinition } from "@/types";
import { TOOLS } from "@/lib/constants";
import * as Icons from "lucide-react";
import {
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  LayoutGrid,
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

  // @ts-expect-error Dynamic icon lookup
  const ToolIcon = Icons[tool.icon] || Icons.FileText;

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
          <div className="p-8 text-center text-slate-400">
            Tool workspace &ldquo;{tool.name}&rdquo; not found.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10">
        {/* Navigation Breadcrumb Bar & Quick Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <Link
              href="/"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <Link
              href="/#tools"
              className="hover:text-white transition-colors"
            >
              Tools
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-medium">{tool.name}</span>
          </nav>

          {/* Quick Tool Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12141D] hover:bg-[#181B26] border border-white/10 hover:border-white/20 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch Tool</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {switcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setSwitcherOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-[#12141D] border border-white/10 shadow-2xl z-40 p-2 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Quick Tool Switcher (19 Tools)
                  </div>
                  <div className="space-y-1 pt-1">
                    {TOOLS.map((t) => {
                      // @ts-expect-error Dynamic icon lookup
                      const Icon = Icons[t.icon] || Icons.FileText;
                      const isCurrent = t.id === tool.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSwitcherOpen(false);
                            router.push(t.path);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${
                            isCurrent
                              ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30"
                              : "text-slate-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-lg bg-gradient-to-br ${t.color} text-white shrink-0`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tool Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-[#12141D]/90 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`p-4 rounded-2xl bg-gradient-to-br ${tool.color} text-white shadow-xl shrink-0`}
            >
              <ToolIcon className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {tool.name}
                </h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                  {tool.category}
                </span>
                {tool.badge && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    {tool.badge}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                {tool.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">100% In-Browser Engine</span>
            <span className="sm:hidden">100% Private</span>
          </div>
        </div>

        {/* Dynamic Tool Interactive Workspace */}
        <div className="pt-2">{renderToolComponent()}</div>
      </div>
    </div>
  );
}
