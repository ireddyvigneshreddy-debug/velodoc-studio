"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CameraScannerModal } from "@/components/CameraScannerModal";
import { sessionHistory } from "@/lib/session-history";
import {
  Camera,
  Layers,
  Trash2,
  GitCompare,
  Minimize2,
  PresentationChart,
  ShieldCheck,
  UploadSimple,
} from "@/components/common/icons";

const INTENT_CHIPS = [
  {
    id: "shrink-200kb",
    label: "Shrink to exact 200 KB",
    icon: Minimize2,
    href: "/tools/compress-pdf?target=200kb",
    badge: "Binary Search",
  },
  {
    id: "tech-talk-ppt",
    label: "IARE Tech-Talk PPT Studio",
    icon: PresentationChart,
    href: "#tech-talk-ppt-studio",
    badge: "13 Slides",
  },
  {
    id: "combine-30",
    label: "Combine up to 30 PDFs",
    icon: Layers,
    href: "/tools/merge-pdf",
    badge: "Batch",
  },
  {
    id: "delete-pages",
    label: "Remove unwanted pages",
    icon: Trash2,
    href: "/tools/remove-pages",
    badge: "Visual",
  },
  {
    id: "compare-docs",
    label: "Compare 2–30 PDFs",
    icon: GitCompare,
    href: "/tools/compare-pdf",
    badge: "Diff",
  },
];

export function HeroSection() {
  const router = useRouter();
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleCameraScanned = async (files: File[]) => {
    if (files.length > 0) {
      try {
        const buffer = await files[0].arrayBuffer();
        sessionHistory.setChainedFile(new Uint8Array(buffer), files[0].name, files[0].type);
      } catch (err) {
        console.error("Camera scan chain error:", err);
      }
      setCameraModalOpen(false);
      router.push("/tools/image-to-pdf");
    }
  };

  const handleBatchDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      try {
        const first = droppedFiles[0];
        const buffer = await first.arrayBuffer();
        sessionHistory.setChainedFile(new Uint8Array(buffer), first.name, first.type);
        router.push("/tools/merge-pdf");
      } catch (err) {
        console.error("Drop error:", err);
      }
    }
  };

  return (
    <>
      <section className="pt-6 sm:pt-10 pb-6 border-b border-paper-300 dark:border-charcoal-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Asymmetric Editorial Workbench Split Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column (7 cols): Editorial Headline & Telemetry */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono tracking-wider uppercase bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/40 dark:text-[#6ee7b7] border border-[#C4DFD5] dark:border-[#143A2F]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Air-Gapped Client Engine
                </span>
                <span className="text-xs font-mono text-ink-muted">v2.4.0 • Zero Cloud Storage</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-bold tracking-tight text-ink-primary dark:text-white leading-[1.08]">
                Private Document Studio,{" "}
                <span className="font-serif italic font-normal text-vermilion">
                  Direct on Your Hardware.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-ink-secondary dark:text-paper-400 font-sans leading-relaxed max-w-2xl">
                Exact KB/MB binary-search compression, 30-document zero-crash batch pipelines, and official academic presentation generation. Zero server uploads, zero accounts, zero tracking.
              </p>

              {/* Local Hardware Telemetry Bar */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 py-3 px-4 rounded-lg bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border text-xs">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Wasm Sandbox</div>
                  <div className="font-mono font-medium text-ink-primary dark:text-white flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Isolated RAM
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Network Ingress</div>
                  <div className="font-mono font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                    0.00 KB Outbound
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Batch Concurrency</div>
                  <div className="font-mono font-medium text-ink-primary dark:text-white mt-0.5">
                    30 Files Safe
                  </div>
                </div>
              </div>

              {/* 1-Click Everyday Intent Chips */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Quick Actions:
                </div>
                <div className="flex flex-wrap gap-2">
                  {INTENT_CHIPS.map((chip) => {
                    const Icon = chip.icon;
                    return (
                      <Link
                        key={chip.id}
                        href={chip.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border hover:border-vermilion hover:text-vermilion text-ink-secondary dark:text-paper-400 transition-colors shadow-paper group"
                      >
                        <Icon className="w-3.5 h-3.5 text-vermilion group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{chip.label}</span>
                        <span className="text-[10px] text-ink-muted">({chip.badge})</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Tactile Quick-Action Dock */}
            <div className="lg:col-span-5 space-y-4">
              {/* Camera Scanner Trigger Card */}
              <div className="paper-card p-5 rounded-lg dark:bg-charcoal-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-vermilion-light text-vermilion dark:bg-vermilion/20 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-ink-primary dark:text-white">
                        Pro Camera Scanner
                      </h2>
                      <p className="text-[11px] text-ink-muted font-mono">
                        Hardware Webcam / Phone Camera → PDF
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-paper-200 dark:bg-charcoal-700 text-ink-primary dark:text-white border border-paper-300 dark:border-charcoal-border">
                    1-Click
                  </span>
                </div>
                <p className="text-xs text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
                  Capture physical paper notes or IDs with real-time perspective alignment and automatic archival contrast filtering.
                </p>
                <button
                  type="button"
                  onClick={() => setCameraModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-ink-primary dark:bg-white text-white dark:text-ink-primary hover:bg-black dark:hover:bg-paper-100 transition-colors flex items-center justify-center gap-2 shadow-paper cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Launch Camera Scanner
                </button>
              </div>

              {/* 30-File Batch Drop Target Dock */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleBatchDrop}
                className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
                  isDragging
                    ? "border-vermilion bg-vermilion-light/40 dark:bg-vermilion/10"
                    : "border-paper-300 dark:border-charcoal-border bg-white/60 dark:bg-charcoal-800/60 hover:border-vermilion/60"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-paper-200 dark:bg-charcoal-700 flex items-center justify-center mx-auto text-ink-secondary dark:text-paper-400 mb-2">
                  <UploadSimple className="w-5 h-5 text-vermilion" />
                </div>
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-primary dark:text-white">
                  30-Document Fast Drop Target
                </h2>
                <p className="text-[11px] text-ink-muted font-sans mt-1">
                  Drag and drop up to 30 PDFs or images here to instantly open the Batch Workbench.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-mono text-ink-secondary dark:text-paper-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Zero Cloud Upload
                  </span>
                  <span>•</span>
                  <span>No Size Limits</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1-Click Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onAddScansToQueue={handleCameraScanned}
        onInstantGeneratePdf={handleCameraScanned}
      />
    </>
  );
}
