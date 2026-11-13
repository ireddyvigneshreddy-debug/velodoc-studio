"use client";

import React, { useState, useEffect } from "react";
import {
  TechTalkPresentation,
  TechTalkSlide,
  PptThemeId,
  ApiVaultConfig,
} from "@/types/ppt";
import { PPT_THEMES } from "@/lib/ppt-themes";
import { generateTechTalkPresentation } from "@/lib/ppt-ai-engine";
import {
  exportToPptx,
  exportToPdfDeck,
  exportToSpeakerCheatSheet,
} from "@/lib/pptx-exporter";
import { ApiKeyVaultModal } from "./ApiKeyVaultModal";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import {
  Presentation,
  Sparkles,
  Download,
  Key,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  Layers,
  Copy,
  Loader2,
} from "lucide-react";

const SAMPLE_TOPICS = [
  {
    topic: "Post-Quantum Cryptography & Lattice-Based TLS 1.3",
    details:
      "IEEE seminar topic covering Shor's algorithm threat against RSA/ECC, NIST post-quantum standardization (ML-KEM, ML-DSA, Falcon), hybrid quantum-safe handshake in TLS 1.3, packet size amplification benchmarks, and real-world banking migration roadmap.",
    presenter: "Vignesh Reddy",
    college: "Dept. of Computer Science & Engineering",
    event: "National Level Technical Symposium 2026",
  },
  {
    topic: "Autonomous Multi-Agent AI Orchestration & Durable Execution",
    details:
      "Architecture of autonomous multi-agent systems using ReAct loops, deterministic state replay, eBPF telemetry, distributed vector indexing, LangGraph workflows, and zero-knowledge model attestation in high-frequency production clusters.",
    presenter: "Ananya Sharma",
    college: "School of Artificial Intelligence & Data Science",
    event: "Advanced Computing Colloquium 2026",
  },
  {
    topic: "Zero-Knowledge Rollups & High-Throughput Layer-2 Scaling",
    details:
      "Deep dive into zk-SNARKs and zk-STARKs mathematical proof systems, arithmetic circuit compilation, data availability sampling (EIP-4844), recursive proof aggregation, and comparative benchmark against optimistic rollups.",
    presenter: "Rahul Verma",
    college: "Center for Cryptography & Blockchain Studies",
    event: "College Tech Seminar 2026",
  },
];

export function TechTalkPptStudio() {
  // Inputs
  const [topic, setTopic] = useState(
    "Post-Quantum Cryptography & Lattice-Based TLS 1.3"
  );
  const [details, setDetails] = useState(SAMPLE_TOPICS[0].details);
  const [slideCount, setSlideCount] = useState<number>(12);
  const [selectedTheme, setSelectedTheme] = useState<PptThemeId>("neon");
  const [presenterName, setPresenterName] = useState(SAMPLE_TOPICS[0].presenter);
  const [collegeName, setCollegeName] = useState(SAMPLE_TOPICS[0].college);
  const [eventName, setEventName] = useState(SAMPLE_TOPICS[0].event);

  // API Key Vault Modal State
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultConfig, setVaultConfig] = useState<ApiVaultConfig>({
    provider: "zero-key",
  });

  // Load vault preferences from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("velodoc_ppt_vault");
        if (stored) {
          setVaultConfig(JSON.parse(stored));
        }
      } catch {
        // Fallback to zero-key
      }
    }
  }, []);

  const handleSaveVaultConfig = (newConfig: ApiVaultConfig) => {
    setVaultConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem("velodoc_ppt_vault", JSON.stringify(newConfig));
    }
  };

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [presentation, setPresentation] = useState<TechTalkPresentation | null>(
    null
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Export State
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);

  // Cycling sample topics
  const [sampleIdx, setSampleIdx] = useState(0);
  const handleLoadSampleTopic = () => {
    const nextIdx = (sampleIdx + 1) % SAMPLE_TOPICS.length;
    setSampleIdx(nextIdx);
    const sample = SAMPLE_TOPICS[nextIdx];
    setTopic(sample.topic);
    setDetails(sample.details);
    setPresenterName(sample.presenter);
    setCollegeName(sample.college);
    setEventName(sample.event);
  };

  // Generate complete deck
  const handleGenerateDeck = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const slides = await generateTechTalkPresentation({
        topic,
        details,
        slideCount,
        presenterName,
        collegeName,
        eventName,
        config: vaultConfig,
      });

      const newDeck: TechTalkPresentation = {
        topic,
        details,
        presenterName,
        collegeName,
        eventName,
        slideCount: slides.length,
        themeId: selectedTheme,
        slides,
        createdAt: Date.now(),
      };

      setPresentation(newDeck);
      setActiveSlideIndex(0);
    } catch (err) {
      console.error("Failed to generate presentation:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Live Inline Slide Editing
  const handleUpdateActiveSlide = (updatedSlide: TechTalkSlide) => {
    if (!presentation) return;
    const newSlides = [...presentation.slides];
    newSlides[activeSlideIndex] = updatedSlide;
    setPresentation({ ...presentation, slides: newSlides });
  };

  // Download PPTX
  const handleDownloadPptx = async () => {
    if (!presentation) return;
    setIsExportingPptx(true);
    try {
      await exportToPptx(presentation);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPptx(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!presentation) return;
    setIsExportingPdf(true);
    try {
      const pdfBytes = await exportToPdfDeck(presentation);
      const blob = createPdfBlob(pdfBytes);
      const url = URL.createObjectURL(blob);
      const downloadFilename = `${presentation.topic.replace(/[^a-zA-Z0-9_-]/g, "_")}-TechTalk.pdf`;

      // Log to session history so users can chain with Compress PDF or Presentation mode!
      sessionHistory.recordExecution({
        toolId: "presentation-pdf",
        toolName: "AI Tech-Talk Slide Deck",
        inputFiles: [presentation.topic],
        outputFileName: downloadFilename,
        outputSizeBytes: pdfBytes.byteLength,
        durationMs: 250,
        outputData: pdfBytes,
      });

      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download Speaker Script Markdown
  const handleDownloadCheatSheet = () => {
    if (!presentation) return;
    const mdContent = exportToSpeakerCheatSheet(presentation);
    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${presentation.topic.replace(/[^a-zA-Z0-9_-]/g, "_")}-Speaker-Script.md`;
    a.click();
  };

  const currentTheme = PPT_THEMES[selectedTheme] || PPT_THEMES.neon;
  const currentSlide = presentation?.slides[activeSlideIndex];

  return (
    <section
      id="ai-presentation-studio"
      className="relative rounded-3xl border border-white/[0.12] bg-[#05060B] p-6 sm:p-10 shadow-[0_0_60px_rgba(99,102,241,0.08)] overflow-hidden space-y-8"
    >
      {/* Specular Ambient Glow Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-cyan-600/10 blur-[120px]" />

      {/* Top Banner & Heading Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 relative z-10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Tech-Talk &amp; Seminar Presentation Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em]">
            Topic to 10–15 Slide PPTX &amp; PDF Deck Generator
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Turn any college tech-talk topic, syllabus, or IEEE abstract into an
            academic-grade presentation with architectural diagrams, real
            benchmarks, comparison tables, and full on-stage speaker scripts.
          </p>
        </div>

        {/* API Key Vault Trigger Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsVaultOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition-all cursor-pointer shadow-inner"
          >
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium">
              Engine:{" "}
              <strong className="text-white capitalize">
                {vaultConfig.provider === "zero-key"
                  ? "Zero-Key (Free)"
                  : vaultConfig.provider}
              </strong>
            </span>
          </button>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="space-y-8 relative z-10">
        {/* If NO presentation generated yet: show Generator Config Form */}
        {!presentation && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Topic, Syllabus & Customization */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Tech-Talk Seminar Topic
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSampleTopic}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Load Sample Topic
                  </button>
                </div>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Post-Quantum Cryptography & Lattice-based TLS 1.3"
                  className="w-full bg-zinc-950 border border-white/[0.1] rounded-2xl px-4 py-3 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-medium shadow-inner"
                />
              </div>

              {/* Reference / Syllabus Textarea */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Syllabus, Abstract or Reference Notes
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  placeholder="Paste your seminar syllabus, IEEE paper abstract, or bullet requirements..."
                  className="w-full bg-zinc-950 border border-white/[0.1] rounded-2xl p-4 text-xs sm:text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y shadow-inner"
                />
              </div>

              {/* Presenter & Institution Meta Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Presenter Name
                  </span>
                  <input
                    type="text"
                    value={presenterName}
                    onChange={(e) => setPresenterName(e.target.value)}
                    placeholder="Vignesh Reddy"
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Department / College
                  </span>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="Dept. of CSE"
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Event / Seminar
                  </span>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Tech Colloquium 2026"
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Slide Count & Visual Themes */}
            <div className="lg:col-span-5 space-y-6">
              {/* Exact Slide Count Controls */}
              <div className="premium-card p-5 rounded-3xl space-y-3.5 border border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Exact Slide Count
                  </span>
                  <span className="text-sm font-mono font-bold text-indigo-400">
                    {slideCount} Slides
                  </span>
                </div>

                <input
                  type="range"
                  min="8"
                  max="20"
                  step="1"
                  value={slideCount}
                  onChange={(e) => setSlideCount(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[10, 12, 14, 15].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSlideCount(count)}
                      className={`py-1.5 text-xs rounded-xl font-medium border transition-all ${
                        slideCount === count
                          ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-sm"
                          : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {count} Slides
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Visual Themes */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Select Visual Slide Palette
                </label>
                <div className="space-y-2">
                  {(Object.keys(PPT_THEMES) as PptThemeId[]).map((themeKey) => {
                    const t = PPT_THEMES[themeKey];
                    const isSelected = selectedTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => setSelectedTheme(themeKey)}
                        className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-500/60 text-white shadow-md"
                            : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-5 h-5 rounded-full border border-white/20 shrink-0 shadow-sm"
                            style={{ backgroundColor: t.primaryAccentHex }}
                          />
                          <div>
                            <span className="text-xs font-semibold text-white block">
                              {t.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 block truncate max-w-xs">
                              {t.tagline}
                            </span>
                          </div>
                        </div>
                        <span
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: t.bgHex }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleGenerateDeck}
                disabled={isGenerating || !topic.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 hover:from-indigo-600 hover:via-purple-700 hover:to-cyan-600 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Synthesizing {slideCount} Technical Slides...</span>
                  </>
                ) : (
                  <>
                    <Presentation className="w-5 h-5" />
                    <span>
                      Generate {slideCount}-Slide Tech Talk Presentation
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Once GENERATED: Interactive 16:9 Live Slide Studio & Editor */}
        {presentation && currentSlide && (
          <div className="space-y-6">
            {/* Studio Navigation & Export Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  SLIDE {activeSlideIndex + 1} OF {presentation.slides.length}
                </span>
                <span className="text-xs text-zinc-400 hidden sm:inline">
                  Layout:{" "}
                  <strong className="text-white capitalize">
                    {currentSlide.layout}
                  </strong>
                </span>
              </div>

              {/* 3 One-Click Export Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPptx}
                  disabled={isExportingPptx}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  {isExportingPptx ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download .PPTX (with Notes)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>Save 16:9 PDF Deck</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCheatSheet}
                  className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download Speaker Script for your phone"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Speech Notes (.md)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPresentation(null)}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  New Deck
                </button>
              </div>
            </div>

            {/* 16:9 Widescreen Visual Slide Canvas */}
            <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl border border-white/[0.15] p-6 sm:p-10 flex flex-col justify-between transition-colors select-none"
              style={{
                backgroundColor: currentTheme.bgHex,
                color: currentTheme.textHex,
              }}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 inset-x-0 h-1.5"
                style={{ backgroundColor: currentTheme.primaryAccentHex }}
              />

              {/* SLIDE HEADER */}
              <div className="space-y-1 relative z-10">
                <span
                  className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase block"
                  style={{ color: currentTheme.secondaryAccentHex }}
                >
                  {currentSlide.category || "TECH TALK"}
                </span>
                <h3
                  className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight"
                  style={{ color: currentTheme.textHex }}
                >
                  {currentSlide.title}
                </h3>
                {currentSlide.subtitle && (
                  <p
                    className="text-xs sm:text-sm line-clamp-1"
                    style={{ color: currentTheme.subtextHex }}
                  >
                    {currentSlide.subtitle}
                  </p>
                )}
              </div>

              {/* SLIDE DYNAMIC LAYOUT BODY */}
              <div className="flex-1 my-4 flex flex-col justify-center relative z-10">
                {currentSlide.layout === "title" && (
                  <div
                    className="p-4 sm:p-6 rounded-2xl border space-y-2 max-w-xl"
                    style={{
                      backgroundColor: currentTheme.cardBgHex,
                      borderColor: currentTheme.borderHex,
                    }}
                  >
                    <span
                      className="text-xs font-bold font-mono block"
                      style={{ color: currentTheme.primaryAccentHex }}
                    >
                      PRESENTER INFORMATION
                    </span>
                    <p className="text-sm font-semibold text-white">
                      {presentation.presenterName}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: currentTheme.subtextHex }}
                    >
                      {presentation.collegeName} • {presentation.eventName}
                    </p>
                  </div>
                )}

                {currentSlide.layout === "three-card" && currentSlide.cards && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {currentSlide.cards.slice(0, 3).map((card, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl border space-y-1.5"
                        style={{
                          backgroundColor: currentTheme.cardBgHex,
                          borderColor: currentTheme.borderHex,
                        }}
                      >
                        {card.tag && (
                          <span
                            className="text-[10px] font-mono font-bold tracking-wider uppercase block"
                            style={{ color: currentTheme.secondaryAccentHex }}
                          >
                            {card.tag}
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-white">
                          {card.title}
                        </h4>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: currentTheme.subtextHex }}
                        >
                          {card.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {currentSlide.layout === "process-flow" &&
                  currentSlide.processSteps && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {currentSlide.processSteps.slice(0, 4).map((step, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-2xl border space-y-1.5 relative"
                          style={{
                            backgroundColor: currentTheme.cardBgHex,
                            borderColor: currentTheme.borderHex,
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                            style={{
                              backgroundColor: currentTheme.primaryAccentHex,
                            }}
                          >
                            {step.step}
                          </div>
                          <h4 className="text-xs font-bold text-white">
                            {step.title}
                          </h4>
                          <p
                            className="text-[11px] leading-snug line-clamp-3"
                            style={{ color: currentTheme.subtextHex }}
                          >
                            {step.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                {currentSlide.layout === "comparison-table" &&
                  currentSlide.table && (
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr
                            style={{
                              backgroundColor: currentTheme.primaryAccentHex,
                              color: "#FFFFFF",
                            }}
                          >
                            {currentSlide.table.headers.map((h, i) => (
                              <th key={i} className="p-2.5 font-bold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody
                          style={{ backgroundColor: currentTheme.cardBgHex }}
                        >
                          {currentSlide.table.rows.map((row, rI) => (
                            <tr
                              key={rI}
                              className="border-t border-white/[0.06]"
                            >
                              {row.map((cell, cI) => (
                                <td
                                  key={cI}
                                  className="p-2.5 font-medium"
                                  style={{
                                    color:
                                      cI === 2
                                        ? currentTheme.secondaryAccentHex
                                        : currentTheme.textHex,
                                  }}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {currentSlide.layout === "code-algorithm" &&
                  currentSlide.codeSnippet && (
                    <div className="p-4 rounded-2xl bg-[#03060C] border border-indigo-500/30 font-mono text-xs text-zinc-300 space-y-2 overflow-x-auto">
                      <span className="text-[11px] text-indigo-400 block font-semibold">
                        {"// "}{currentSlide.codeSnippet.caption || "Algorithm Flow"}
                      </span>
                      <pre className="text-[11.5px] leading-relaxed text-indigo-200">
                        {currentSlide.codeSnippet.code}
                      </pre>
                    </div>
                  )}

                {currentSlide.layout === "metric-highlight" &&
                  currentSlide.metric && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div
                        className="p-5 rounded-2xl border space-y-1.5"
                        style={{
                          backgroundColor: currentTheme.cardBgHex,
                          borderColor: currentTheme.primaryAccentHex,
                        }}
                      >
                        <span
                          className="text-4xl sm:text-5xl font-black block"
                          style={{ color: currentTheme.secondaryAccentHex }}
                        >
                          {currentSlide.metric.value}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {currentSlide.metric.label}
                        </h4>
                        <p
                          className="text-xs"
                          style={{ color: currentTheme.subtextHex }}
                        >
                          {currentSlide.metric.context}
                        </p>
                      </div>

                      {currentSlide.bulletPoints && (
                        <div className="space-y-2">
                          {currentSlide.bulletPoints.map((b, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span
                                className="font-bold"
                                style={{
                                  color: currentTheme.primaryAccentHex,
                                }}
                              >
                                •
                              </span>
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                {currentSlide.layout === "two-column" &&
                  currentSlide.columns && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {currentSlide.columns.slice(0, 2).map((col, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-2xl border space-y-2"
                          style={{
                            backgroundColor: currentTheme.cardBgHex,
                            borderColor: currentTheme.borderHex,
                          }}
                        >
                          <h4
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: currentTheme.primaryAccentHex }}
                          >
                            {col.title}
                          </h4>
                          <div className="space-y-1.5">
                            {col.bullets.map((b, bI) => (
                              <div
                                key={bI}
                                className="flex items-start gap-2 text-xs leading-relaxed"
                              >
                                <span
                                  style={{
                                    color: currentTheme.secondaryAccentHex,
                                  }}
                                >
                                  •
                                </span>
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* SLIDE FOOTER */}
              <div
                className="flex items-center justify-between text-[11px] pt-2 border-t relative z-10"
                style={{
                  borderColor: currentTheme.borderHex,
                  color: currentTheme.subtextHex,
                }}
              >
                <span>
                  {presentation.presenterName} • {presentation.collegeName}
                </span>
                <span className="font-mono font-bold">
                  {currentSlide.slideNumber} / {presentation.slides.length}
                </span>
              </div>
            </div>

            {/* Thumbnail Filmstrip & Navigation Controls */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                disabled={activeSlideIndex <= 0}
                onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 disabled:opacity-30 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
                {presentation.slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                      activeSlideIndex === idx
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                    }`}
                  >
                    <span>{idx + 1}. </span>
                    <span className="truncate max-w-[90px] inline-block align-bottom">
                      {s.title}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={activeSlideIndex >= presentation.slides.length - 1}
                onClick={() =>
                  setActiveSlideIndex((i) =>
                    Math.min(presentation.slides.length - 1, i + 1)
                  )
                }
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 disabled:opacity-30 shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Built-in Presenter Speaker Notes ("What to Say on Stage") */}
            <div className="premium-card p-5 rounded-3xl border border-amber-500/20 bg-amber-500/[0.03] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                  <span>🎙️</span>
                  <span className="uppercase tracking-wider">
                    Stage Speaker Notes (What to say out loud on this slide)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    (~45 sec verbal delivery)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentSlide.speakerNotes);
                    setCopiedNotes(true);
                    setTimeout(() => setCopiedNotes(false), 1500);
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedNotes ? "Copied!" : "Copy Script"}</span>
                </button>
              </div>

              <textarea
                value={currentSlide.speakerNotes}
                onChange={(e) =>
                  handleUpdateActiveSlide({
                    ...currentSlide,
                    speakerNotes: e.target.value,
                  })
                }
                rows={3}
                className="w-full bg-zinc-950/80 border border-amber-500/20 rounded-2xl p-3.5 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed resize-y font-sans"
              />
            </div>
          </div>
        )}
      </div>

      {/* API Key Vault Modal */}
      <ApiKeyVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        config={vaultConfig}
        onSaveConfig={handleSaveVaultConfig}
      />
    </section>
  );
}
