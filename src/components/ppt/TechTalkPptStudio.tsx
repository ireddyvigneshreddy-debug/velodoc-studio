"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TechTalkPresentation,
  PptThemeId,
  ApiVaultConfig,
  IareAssessmentType,
  IareMetadata,
} from "@/types/ppt";
import { generateTechTalkPresentation } from "@/lib/ppt-ai-engine";
import {
  exportToPptx,
  exportToPdfDeck,
  exportToSpeakerCheatSheet,
  getPresentationExportFilename,
} from "@/lib/pptx-exporter";
import { getIareLogoPngBase64 } from "@/lib/iare-logo";
import {
  IARE_HEADER_BANNER_BASE64,
  IARE_CORNER_LOGO_BASE64,
  IARE_EXACT_COLORS,
} from "@/lib/iare-template-assets";
import { ApiKeyVaultModal } from "./ApiKeyVaultModal";
import {
  IareEmblem,
  IARE_ASSESSMENT_TYPES,
  BRANCH_QUICK_CHIPS,
} from "./IareEmblem";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import {
  Sparkles,
  Download,
  Key,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Copy,
  Loader2,
  GraduationCap,
  Upload,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "@/components/common/icons";

export function TechTalkPptStudio() {
  // STRICT BLANK INPUT FORM — ALL FIELDS START EMPTY (ZERO SAMPLE DATA)
  const [topic, setTopic] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [rollNumber, setRollNumber] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [assessmentType, setAssessmentType] =
    useState<IareAssessmentType>("AAT - TECH TALK");
  const [slideCount, setSlideCount] = useState<number>(13);
  const selectedTheme: PptThemeId = "iare";
  const [customLogoBase64, setCustomLogoBase64] = useState<string>("");
  const [defaultLogoBase64, setDefaultLogoBase64] = useState<string>("");

  // Validation state
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);

  // API Key Vault Modal State
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultConfig, setVaultConfig] = useState<ApiVaultConfig>({
    provider: "zero-key",
  });

  // Load vault & IARE logo preferences from localStorage + initialize high-DPI IARE PNG logo
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("velodoc_ppt_vault");
        if (stored) {
          setVaultConfig(JSON.parse(stored));
        }
      } catch {
        // Fallback
      }

      try {
        const storedLogo = localStorage.getItem("iare_custom_logo");
        if (storedLogo) {
          setCustomLogoBase64(storedLogo);
        }
      } catch {
        // Fallback
      }

      try {
        const b64 = getIareLogoPngBase64();
        if (b64) {
          setDefaultLogoBase64(b64);
        }
      } catch {
        // Fallback
      }
    }
  }, []);

  const activeLogo =
    customLogoBase64 || defaultLogoBase64 || getIareLogoPngBase64();

  const handleSaveVaultConfig = (newConfig: ApiVaultConfig) => {
    setVaultConfig(newConfig);
    if (typeof window !== "undefined") {
      localStorage.setItem("velodoc_ppt_vault", JSON.stringify(newConfig));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (b64) {
        setCustomLogoBase64(b64);
        if (typeof window !== "undefined") {
          localStorage.setItem("iare_custom_logo", b64);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setCustomLogoBase64("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("iare_custom_logo");
    }
  };

  // Generation & Active Presentation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [presentation, setPresentation] = useState<TechTalkPresentation | null>(
    null
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Export State
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);

  // Validation Checks
  const isTopicMissing = hasAttemptedSubmit && !topic.trim();
  const isNameMissing = hasAttemptedSubmit && !studentName.trim();
  const isRollMissing = hasAttemptedSubmit && !rollNumber.trim();
  const isBranchMissing = hasAttemptedSubmit && !branch.trim();
  const isSubjectMissing = hasAttemptedSubmit && !subject.trim();
  const hasValidationErrors =
    !topic.trim() ||
    !studentName.trim() ||
    !rollNumber.trim() ||
    !branch.trim() ||
    !subject.trim();

  // Generate complete deck
  const handleGenerateDeck = async () => {
    setHasAttemptedSubmit(true);
    if (hasValidationErrors) {
      return;
    }

    setIsGenerating(true);
    try {
      const iareMeta: IareMetadata = {
        isIareMode: true,
        assessmentType,
        department: branch.trim(),
        subject: subject.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        studentName: studentName.trim(),
        customLogoBase64: customLogoBase64 || activeLogo || undefined,
      };

      const slides = await generateTechTalkPresentation({
        topic: topic.trim(),
        details: details.trim(),
        slideCount,
        presenterName: studentName.trim(),
        collegeName: "IARE (Autonomous), Dundigal, Hyderabad",
        eventName: assessmentType,
        config: vaultConfig,
        iareMetadata: iareMeta,
      });

      const newDeck: TechTalkPresentation = {
        topic: topic.trim(),
        details: details.trim(),
        presenterName: studentName.trim(),
        collegeName: "IARE (Autonomous), Dundigal, Hyderabad",
        eventName: assessmentType,
        slideCount: slides.length,
        themeId: selectedTheme,
        slides,
        createdAt: Date.now(),
        iareMetadata: iareMeta,
      };

      setPresentation(newDeck);
      setActiveSlideIndex(0);

      // Record to persistent history
      sessionHistory.recordExecution({
        toolId: "tech-talk-ppt-studio",
        toolName: "IARE Tech-Talk Presentation",
        inputFiles: [topic.trim()],
        outputFileName: getPresentationExportFilename(newDeck, "pptx"),
        outputSizeBytes: 1024 * 60,
        durationMs: 1200,
      });
    } catch (err) {
      console.error("Presentation generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update slide text in-memory
  const handleUpdateSlideTitle = (newTitle: string) => {
    if (!presentation) return;
    const updated = [...presentation.slides];
    updated[activeSlideIndex] = {
      ...updated[activeSlideIndex],
      title: newTitle,
    };
    setPresentation({ ...presentation, slides: updated });
  };

  const handleUpdateSlideParagraph = (newParagraph: string) => {
    if (!presentation) return;
    const updated = [...presentation.slides];
    updated[activeSlideIndex] = {
      ...updated[activeSlideIndex],
      paragraph: newParagraph,
    };
    setPresentation({ ...presentation, slides: updated });
  };

  const handleUpdateSlideBullets = (newBulletsText: string) => {
    if (!presentation) return;
    const lines = newBulletsText
      .split("\n")
      .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean);
    const updated = [...presentation.slides];
    updated[activeSlideIndex] = {
      ...updated[activeSlideIndex],
      bulletPoints: lines,
    };
    setPresentation({ ...presentation, slides: updated });
  };

  const handleUpdateSlideNotes = (newNotes: string) => {
    if (!presentation) return;
    const updated = [...presentation.slides];
    updated[activeSlideIndex] = {
      ...updated[activeSlideIndex],
      speakerNotes: newNotes,
    };
    setPresentation({ ...presentation, slides: updated });
  };

  // Download PPTX
  const handleExportPptx = async () => {
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

  // Download PDF Slide Deck
  const handleExportPdf = async () => {
    if (!presentation) return;
    setIsExportingPdf(true);
    try {
      const pdfBytes = await exportToPdfDeck(presentation);
      const blob = createPdfBlob(pdfBytes);
      const url = URL.createObjectURL(blob);
      const downloadFilename = getPresentationExportFilename(
        presentation,
        "pdf"
      );

      sessionHistory.recordExecution({
        toolId: "tech-talk-ppt-studio",
        toolName: "IARE PDF Presentation Deck",
        inputFiles: [presentation.topic],
        outputFileName: downloadFilename,
        outputSizeBytes: pdfBytes.length,
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
    a.download = getPresentationExportFilename(presentation, "md");
    a.click();
  };

  const currentSlide = presentation?.slides[activeSlideIndex];

  return (
    <section
      id="ai-presentation-studio"
      className="relative rounded-xl border border-paper-300 dark:border-charcoal-border bg-white dark:bg-charcoal-800 p-5 sm:p-8 shadow-paper overflow-hidden space-y-8"
    >
      {/* Top Banner & Heading Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-300 dark:border-charcoal-border pb-6 relative z-10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper-100 dark:bg-charcoal-700 border border-paper-300 dark:border-charcoal-border text-ink-primary dark:text-white text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-vermilion" />
            <span>IARE Official Tech-Talk &amp; Concept Video Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-ink-primary dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>IARE Official 13-Slide AAT Tech Talk Generator</span>
            <span className="text-xs px-2.5 py-0.5 rounded text-[11px] font-mono bg-[#EDF5F2] text-[#1B4D3E] dark:bg-[#143A2F]/40 dark:text-[#6ee7b7] border border-[#C4DFD5] dark:border-[#143A2F]">
              OBE Rubric Aligned
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary dark:text-paper-400 max-w-2xl leading-relaxed font-sans">
            Generate authentic Institute of Aeronautical Engineering (Autonomous)
            AAT presentations matching the exact 13-slide institutional layout
            (Cover, INDEX, INTRODUCTION, 8 ALL CAPS Core Slides, CONCLUSION, and
            THANK YOU) with embedded teleprompter speech notes.
          </p>
        </div>

        {/* Engine Vault Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsVaultOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-700 hover:bg-paper-200 dark:hover:bg-charcoal-600 border border-paper-300 dark:border-charcoal-border text-xs text-ink-secondary dark:text-paper-400 hover:text-ink-primary dark:hover:text-white transition-colors cursor-pointer shadow-paper"
          >
            <Key className="w-3.5 h-3.5 text-vermilion" />
            <span className="font-mono text-xs">
              Engine:{" "}
              <strong className="text-ink-primary dark:text-white capitalize">
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
        {/* Validation Warning Alert (if user tried to submit with empty required fields) */}
        {hasAttemptedSubmit && hasValidationErrors && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">
                Please complete all required fields before generating:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-300/90 font-medium">
                {isTopicMissing && <li>Topic Title</li>}
                {isNameMissing && <li>Student Full Name</li>}
                {isRollMissing && <li>Student Roll Number (e.g. 26951A67XX)</li>}
                {isBranchMissing && <li>Department / Branch (e.g. CSD, CSE)</li>}
                {isSubjectMissing && <li>Subject Name</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Input Form — Strictly Blank On Initial Load */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-zinc-950 to-slate-950 p-5 sm:p-7 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    IARE Assessment &amp; Student Credentials
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Mandatory Authentic Data
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  All fields must be filled with your authentic college credentials.
                </p>
              </div>
            </div>

            {/* Assessment Type Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              {IARE_ASSESSMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAssessmentType(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    assessmentType === type
                      ? "bg-amber-500 text-black border-amber-400 shadow-md font-bold"
                      : "bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-amber-500/40 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="space-y-5">
            {/* Row 1: Student Credentials (Name, Roll No, Subject) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Student Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Student Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                  className={`w-full bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                    isNameMissing
                      ? "border-rose-500 ring-1 ring-rose-500"
                      : "border-white/[0.1] focus:border-amber-500"
                  }`}
                />
                {isNameMissing && (
                  <span className="text-[11px] text-rose-400 block font-medium">
                    Name is required.
                  </span>
                )}
              </div>

              {/* Roll Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Student Roll Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., 26951A67XX"
                  className={`w-full bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-semibold uppercase text-amber-300 placeholder-zinc-500 focus:outline-none transition-colors ${
                    isRollMissing
                      ? "border-rose-500 ring-1 ring-rose-500"
                      : "border-white/[0.1] focus:border-amber-500"
                  }`}
                />
                {isRollMissing && (
                  <span className="text-[11px] text-rose-400 block font-medium">
                    Roll number is required.
                  </span>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Subject / Course Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Essentials of Problem Solving"
                  className={`w-full bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                    isSubjectMissing
                      ? "border-rose-500 ring-1 ring-rose-500"
                      : "border-white/[0.1] focus:border-amber-500"
                  }`}
                />
                {isSubjectMissing && (
                  <span className="text-[11px] text-rose-400 block font-medium">
                    Subject is required.
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Branch Selection (Input + Quick Select Chips) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                Engineering Branch / Department{" "}
                <span className="text-rose-400">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g., CSE (Data Science) or CSD"
                  className={`flex-1 bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                    isBranchMissing
                      ? "border-rose-500 ring-1 ring-rose-500"
                      : "border-white/[0.1] focus:border-amber-500"
                  }`}
                />
                {/* Branch Quick Select Chips (None Pre-selected) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-zinc-400 font-medium mr-1">
                    Quick Chips:
                  </span>
                  {BRANCH_QUICK_CHIPS.map((chip) => {
                    const isSelected = branch.trim().toUpperCase() === chip;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setBranch(chip)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-black border-amber-400 font-bold shadow-sm"
                            : "bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:border-amber-500/40 hover:text-white"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
              {isBranchMissing && (
                <span className="text-[11px] text-rose-400 block font-medium">
                  Branch is required.
                </span>
              )}
            </div>

            {/* Row 3: Topic Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                Presentation Topic Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Bagging and Boosting Fine-Tuning for Ensemble Learning"
                className={`w-full bg-zinc-950 border rounded-2xl px-4 py-3 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none font-medium shadow-inner transition-colors ${
                  isTopicMissing
                    ? "border-rose-500 ring-1 ring-rose-500"
                    : "border-white/[0.1] focus:border-amber-500"
                }`}
              />
              {isTopicMissing && (
                <span className="text-[11px] text-rose-400 block font-medium">
                  Topic title is required.
                </span>
              )}
            </div>

            {/* Row 4: Topic Details / Syllabus / Abstract */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                Topic Syllabus, Subtopics or Abstract (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Paste your topic syllabus, subtopics, or abstract here..."
                className="w-full bg-zinc-950 border border-white/[0.1] rounded-2xl p-4 text-xs sm:text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-amber-500 leading-relaxed resize-y shadow-inner"
              />
            </div>

            {/* Row 5: Institutional Crest & Custom Logo Uploader */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3.5">
                {activeLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activeLogo}
                    alt="IARE College Logo"
                    className="w-14 h-14 rounded-full object-contain bg-white p-1 border-2 border-[#C59B27] shrink-0 shadow-md"
                  />
                ) : (
                  <IareEmblem className="w-14 h-14 shrink-0" size={56} />
                )}
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {customLogoBase64
                      ? "Custom College Logo Active"
                      : "Official High-DPI IARE Circular Emblem Active"}
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    Rendered in pure high resolution onto Title Cover and exported
                    .pptx &amp; .pdf files.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload Custom Logo</span>
                </button>

                {customLogoBase64 && (
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                    title="Reset to default IARE circular crest"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 6: Slide Count & Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Slide Count:
                </span>
                <div className="flex items-center gap-1.5">
                  {[10, 12, 13, 14, 15].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setSlideCount(cnt)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        slideCount === cnt
                          ? "bg-amber-500 text-black border-amber-400 font-bold shadow-sm"
                          : "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white"
                      }`}
                    >
                      {cnt} {cnt === 13 && "(IARE Default)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateDeck}
                disabled={isGenerating}
                className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-vermilion hover:bg-vermilion-hover text-white font-mono uppercase tracking-wider font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors shadow-paper cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Synthesizing Exact {slideCount}-Slide Presentation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Generate Presentation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* EMPTY STATE (Visible until user generates presentation) */}
        {!presentation && (
          <div className="rounded-lg border border-paper-300 dark:border-charcoal-border bg-paper-100/50 dark:bg-charcoal-900/50 p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-lg bg-[#FEF3C7] dark:bg-[#B45309]/20 border border-[#FDE68A] dark:border-[#B45309]/30 text-[#B45309] dark:text-[#fde68a] mx-auto flex items-center justify-center">
              <IareEmblem size={40} className="w-10 h-10" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="text-lg font-serif text-ink-primary dark:text-white tracking-tight">
                No Presentation Generated Yet
              </h3>
              <p className="text-xs sm:text-sm text-ink-secondary dark:text-paper-400 leading-relaxed font-sans">
                Enter your authentic topic, full name, roll number, engineering
                branch, and subject above, then click{" "}
                <strong className="text-vermilion">
                  &ldquo;Generate Presentation&rdquo;
                </strong>{" "}
                to build your OBE-compliant 13-slide IARE deck with speaker notes.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-6 text-xs text-ink-muted flex-wrap font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-vermilion" />
                13 Official Master Slides
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-vermilion" />
                Cover + INDEX + 8 ALL CAPS Core
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-vermilion" />
                Embedded Verbal Speaker Notes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-vermilion" />
                Direct .PPTX &amp; .PDF Download
              </span>
            </div>
          </div>
        )}

        {/* 16:9 INTERACTIVE WIDESCREEN SLIDE STUDIO (Visible once generated) */}
        {presentation && currentSlide && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Action Bar Above Canvas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    SLIDE {activeSlideIndex + 1} OF {presentation.slides.length}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                    Layout: {currentSlide.layout}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    IARE Master Active
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-xl">
                  {presentation.topic}
                </h3>
              </div>

              {/* Export Suite Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={isExportingPptx}
                  className="px-4 py-2 rounded-lg bg-vermilion hover:bg-vermilion-hover text-white font-mono uppercase tracking-wider font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-paper disabled:opacity-50"
                  title="Export PowerPoint (.pptx) with speaker notes"
                >
                  {isExportingPptx ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Export .PPTX</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="px-4 py-2 rounded-lg bg-ink-primary hover:bg-black text-white dark:bg-charcoal-700 dark:hover:bg-charcoal-600 font-mono uppercase tracking-wider font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-paper disabled:opacity-50"
                  title="Export 16:9 PDF Presentation Deck"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>Export .PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCheatSheet}
                  className="px-3.5 py-2 rounded-lg bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 border border-paper-300 dark:border-charcoal-border text-ink-primary dark:text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-paper"
                  title="Download Speaker Script for your phone"
                >
                  <Copy className="w-3.5 h-3.5 text-vermilion" />
                  <span>Speech Notes (.md)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPresentation(null);
                    setHasAttemptedSubmit(false);
                  }}
                  className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  New Deck
                </button>
              </div>
            </div>

            {/* 16:9 Widescreen Visual Slide Canvas (1:1 Match with PowerPoint Template) */}
            <div
              className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-slate-300 flex flex-col justify-between transition-colors select-none"
              style={{
                backgroundColor: `#${IARE_EXACT_COLORS.slideBg}`,
                color: `#${IARE_EXACT_COLORS.bodyText}`,
                fontFamily: 'Calibri, Candara, "Segoe UI", Arial, sans-serif',
              }}
            >
              {/* SLIDE 1: EXACT COVER SLIDE (slideLayout2.xml TITLE_MASTER) */}
              {currentSlide.layout === "title" ? (
                <div className="flex-1 flex flex-col justify-between relative z-10">
                  {/* Top Header Banner Image across 100% width */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={IARE_HEADER_BANNER_BASE64}
                    alt="IARE Header Banner"
                    className="w-full h-auto max-h-[26%] object-cover object-top select-none pointer-events-none"
                  />

                  {/* Main Content Area */}
                  <div className="flex-1 flex flex-col justify-between px-6 sm:px-12 py-3 sm:py-5">
                    {/* Shape 'Text 0': Assessment Title (Centered, 28pt Arial Bold, #004170) */}
                    <div className="text-center">
                      <h2
                        className="text-base sm:text-xl md:text-2xl font-bold tracking-tight uppercase"
                        style={{
                          color: `#${IARE_EXACT_COLORS.headerBannerBg}`,
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {presentation.iareMetadata?.assessmentType || "AAT - TECH TALK"}
                      </h2>
                    </div>

                    {/* Shape 'Text 1': Topic - [Topic] (Left-aligned, Arial 28pt Bold + Calibri 24pt, #004170) */}
                    <div className="text-left pt-1 sm:pt-2">
                      <h3
                        className="text-base sm:text-xl md:text-2xl font-bold tracking-tight leading-snug"
                        style={{ color: `#${IARE_EXACT_COLORS.headerBannerBg}` }}
                      >
                        <span style={{ fontFamily: "Arial, sans-serif" }}>Topic - </span>
                        <span
                          className="font-normal"
                          style={{ fontFamily: "Calibri, sans-serif" }}
                        >
                          {currentSlide.title.replace(/^Topic\s*-\s*/i, "").trim()}
                        </span>
                      </h3>
                    </div>

                    {/* Shapes 'Text 2-5': Stacked Student Metadata (Name, Roll No, Branch, Subject) */}
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm md:text-base text-left pt-1 sm:pt-2 pb-2">
                      <p className="flex items-center">
                        <strong
                          className="w-20 sm:w-24 font-bold"
                          style={{ color: `#${IARE_EXACT_COLORS.headerBannerBg}` }}
                        >
                          Name:{" "}
                        </strong>
                        <span style={{ color: `#${IARE_EXACT_COLORS.bodyText}` }}>
                          {presentation.iareMetadata?.studentName}
                        </span>
                      </p>
                      <p className="flex items-center">
                        <strong
                          className="w-20 sm:w-24 font-bold"
                          style={{ color: `#${IARE_EXACT_COLORS.headerBannerBg}` }}
                        >
                          Roll No:{" "}
                        </strong>
                        <span style={{ color: `#${IARE_EXACT_COLORS.bodyText}` }}>
                          {presentation.iareMetadata?.rollNumber}
                        </span>
                      </p>
                      <p className="flex items-center">
                        <strong
                          className="w-20 sm:w-24 font-bold"
                          style={{ color: `#${IARE_EXACT_COLORS.headerBannerBg}` }}
                        >
                          Branch:{" "}
                        </strong>
                        <span style={{ color: `#${IARE_EXACT_COLORS.bodyText}` }}>
                          {presentation.iareMetadata?.department}
                        </span>
                      </p>
                      <p className="flex items-center">
                        <strong
                          className="w-20 sm:w-24 font-bold"
                          style={{ color: `#${IARE_EXACT_COLORS.headerBannerBg}` }}
                        >
                          Subject:{" "}
                        </strong>
                        <span style={{ color: `#${IARE_EXACT_COLORS.bodyText}` }}>
                          {presentation.iareMetadata?.subject}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : currentSlide.layout === "thank-you" ? (
                /* SLIDE 13: EXACT THANK YOU SLIDE (slideLayout2.xml TITLE_MASTER) */
                <div className="flex-1 flex flex-col justify-between relative z-10">
                  {/* Top Header Banner Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={IARE_HEADER_BANNER_BASE64}
                    alt="IARE Header Banner"
                    className="w-full h-auto max-h-[26%] object-cover object-top select-none pointer-events-none"
                  />

                  {/* Centered THANK YOU: 48pt Arial Bold in #51237F */}
                  <div className="flex-1 flex flex-col justify-center items-center text-center my-auto pb-6">
                    <h2
                      className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight"
                      style={{
                        color: `#${IARE_EXACT_COLORS.thankYouText}`,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      THANK YOU
                    </h2>
                  </div>
                </div>
              ) : (
                /* SLIDES 2 TO 12: EXACT CONTENT SLIDES (slideLayout3.xml CONTENT_MASTER) */
                <div className="flex-1 flex flex-col justify-between relative z-10">
                  {/* Top Row: Left Side-Heading + Right Corner Logo */}
                  <div className="flex items-start justify-between px-6 sm:px-10 pt-4 sm:pt-6">
                    {/* Shape 'Text 0': Side-Heading in ALL CAPS (#003366, 22pt Calibri Bold) */}
                    <h3
                      className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-left uppercase max-w-[80%]"
                      style={{
                        color: `#${IARE_EXACT_COLORS.sideHeading}`,
                        fontFamily: "Calibri, sans-serif",
                      }}
                    >
                      {currentSlide.title}
                    </h3>

                    {/* Top-Right Corner Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={IARE_CORNER_LOGO_BASE64}
                      alt="IARE Corner Logo"
                      className="w-12 sm:w-16 h-auto object-contain shrink-0 select-none pointer-events-none mt-[-4px]"
                    />
                  </div>

                  {/* Body Content Area (Shape 'Text 1') */}
                  <div className="flex-1 flex flex-col justify-start px-6 sm:px-10 py-3 sm:py-5">
                    {/* INDEX LAYOUT */}
                    {currentSlide.layout === "index" && (
                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm md:text-base text-left text-black font-normal leading-relaxed">
                        {(currentSlide.bulletPoints || []).map((item, idx) => (
                          <div key={idx} className="text-left">
                            {item}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* PARAGRAPH LAYOUT (INTRODUCTION / CONCLUSION) */}
                    {currentSlide.layout === "paragraph" && (
                      <div className="py-1">
                        <p className="text-xs sm:text-sm md:text-base text-black leading-relaxed sm:leading-[1.7] text-left font-normal">
                          {currentSlide.paragraph || currentSlide.bulletPoints?.join(" ")}
                        </p>
                      </div>
                    )}

                    {/* BULLETS LAYOUT (8 CORE TECHNICAL SLIDES) */}
                    {(currentSlide.layout === "bullets" ||
                      (!["index", "paragraph"].includes(currentSlide.layout) &&
                        currentSlide.bulletPoints)) && (
                      <div className="space-y-2 sm:space-y-3 py-1">
                        {(currentSlide.bulletPoints || [])
                          .slice(0, 5)
                          .map((bullet, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2.5 text-xs sm:text-sm md:text-base text-black leading-relaxed text-left font-normal"
                            >
                              <span className="text-black font-bold text-sm sm:text-base select-none shrink-0 mt-[-1px]">
                                •
                              </span>
                              <span>{bullet}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer Bar: Shape 0 (x=0, y=5.3438", w=10.0", h=0.4", fill=#003366) */}
                  <div
                    className="w-full h-4 sm:h-5 shrink-0"
                    style={{ backgroundColor: `#${IARE_EXACT_COLORS.footerBar}` }}
                  />
                </div>
              )}
            </div>

            {/* Thumbnail Filmstrip & Navigation Controls */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                disabled={activeSlideIndex <= 0}
                onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 disabled:opacity-30 shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
                {presentation.slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
                      activeSlideIndex === idx
                        ? "bg-amber-500 border-amber-400 text-black font-bold shadow-lg"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                    }`}
                  >
                    <span>{idx + 1}. </span>
                    <span className="truncate max-w-[110px] inline-block align-bottom">
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
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 disabled:opacity-30 shrink-0 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slide Editor & Verbal Stage Speaker Script Notes Drawer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Slide Content Editor */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                    Edit Slide Title
                  </label>
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => handleUpdateSlideTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                {currentSlide.layout === "paragraph" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                      Edit Paragraph Text
                    </label>
                    <textarea
                      value={
                        currentSlide.paragraph ||
                        currentSlide.bulletPoints?.join(" ") ||
                        ""
                      }
                      onChange={(e) =>
                        handleUpdateSlideParagraph(e.target.value)
                      }
                      rows={4}
                      className="w-full bg-zinc-950 border border-white/[0.1] rounded-xl p-3 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed resize-y"
                    />
                  </div>
                )}

                {(currentSlide.layout === "bullets" ||
                  currentSlide.layout === "index") && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                      Edit Slide Points (One per line)
                    </label>
                    <textarea
                      value={(currentSlide.bulletPoints || []).join("\n")}
                      onChange={(e) => handleUpdateSlideBullets(e.target.value)}
                      rows={5}
                      className="w-full bg-zinc-950 border border-white/[0.1] rounded-xl p-3 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed resize-y font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Speaker Notes Script Panel (Stage Teleprompter) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/20 to-zinc-900 border border-amber-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    What to Say on Stage (Verbal Speaker Script)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentSlide.speakerNotes);
                      setCopiedNotes(true);
                      setTimeout(() => setCopiedNotes(false), 2000);
                    }}
                    className="text-[11px] text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedNotes ? "Copied!" : "Copy Notes"}
                  </button>
                </div>
                <textarea
                  value={currentSlide.speakerNotes}
                  onChange={(e) => handleUpdateSlideNotes(e.target.value)}
                  rows={5}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-3 text-xs sm:text-sm text-amber-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 leading-relaxed resize-y font-normal"
                />
              </div>
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
