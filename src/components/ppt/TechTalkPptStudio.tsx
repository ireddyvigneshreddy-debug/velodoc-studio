"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TechTalkPresentation,
  PptThemeId,
  ApiVaultConfig,
  IareAssessmentType,
  IareMetadata,
} from "@/types/ppt";
import { PPT_THEMES } from "@/lib/ppt-themes";
import { generateTechTalkPresentation } from "@/lib/ppt-ai-engine";
import {
  exportToPptx,
  exportToPdfDeck,
  exportToSpeakerCheatSheet,
} from "@/lib/pptx-exporter";
import { ApiKeyVaultModal } from "./ApiKeyVaultModal";
import {
  IareEmblem,
  IARE_ASSESSMENT_TYPES,
  IARE_DEPARTMENTS,
} from "./IareEmblem";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import {
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
  GraduationCap,
  Upload,
  RotateCcw,
  Building2,
  Check,
} from "lucide-react";

const SAMPLE_TOPICS = [
  {
    topic: "Design and Analysis of Quantum-Resistant Cryptographic Algorithms in Post-Quantum TLS 1.3",
    details:
      "IARE AAT-I Tech Talk covering Shor's algorithm threat against RSA/ECC, NIST standardization (ML-KEM, ML-DSA, Falcon), hybrid quantum-safe handshake in TLS 1.3, packet size amplification benchmarks, and real-world banking migration roadmap.",
    presenter: "Vignesh Reddy",
    college: "IARE (Autonomous), Dundigal, Hyderabad",
    event: "AAT-I Tech Talk Presentation",
    assessmentType: "AAT-I Tech Talk" as IareAssessmentType,
    department: "Computer Science and Engineering (CSE)",
    semester: "II B.Tech I Semester (BT24 / BT25)",
    courseName: "Design and Analysis of Algorithms",
    courseCode: "ACSD08",
    rollNo: "24951A0501",
    faculty: "Dr. K. Srinivas Rao, Professor",
  },
  {
    topic: "Low-Latency Microservices Orchestration with Apache Kafka & Distributed Consensus",
    details:
      "IARE AAT-II Tech Talk investigating event-driven distributed streaming architectures, Raft consensus quorums, zero-copy socket buffers, eBPF telemetry, and sub-10ms P99 latency guarantees under extreme load.",
    presenter: "Ananya Sharma",
    college: "IARE (Autonomous), Dundigal, Hyderabad",
    event: "AAT-II Tech Talk Presentation",
    assessmentType: "AAT-II Tech Talk" as IareAssessmentType,
    department: "CSE (Data Science)",
    semester: "III B.Tech I Semester (BT23 / BT24)",
    courseName: "Distributed Systems & Cloud Computing",
    courseCode: "ACSD18",
    rollNo: "23951A6704",
    faculty: "Dr. B. Padmaja, Professor & Head",
  },
  {
    topic: "Autonomous UAV Flight Path Optimization using Deep Reinforcement Learning",
    details:
      "IARE Concept Video Presentation on autonomous collision avoidance in quadcopters using Proximal Policy Optimization (PPO), onboard LiDAR sensor fusion, and real-time PX4 autopilot flight control loops.",
    presenter: "Rahul Verma",
    college: "IARE (Autonomous), Dundigal, Hyderabad",
    event: "Concept Video Presentation",
    assessmentType: "Concept Video Presentation" as IareAssessmentType,
    department: "Aeronautical Engineering (AE)",
    semester: "II B.Tech II Semester (BT24 / BT25)",
    courseName: "Unmanned Aerial Systems & Flight Dynamics",
    courseCode: "AAEB22",
    rollNo: "24951A2108",
    faculty: "Dr. G. Ramanjaneyulu, Assoc. Professor",
  },
];

export function TechTalkPptStudio() {
  // Primary Topic Inputs
  const [topic, setTopic] = useState(SAMPLE_TOPICS[0].topic);
  const [details, setDetails] = useState(SAMPLE_TOPICS[0].details);
  const [slideCount, setSlideCount] = useState<number>(15);
  const [selectedTheme, setSelectedTheme] = useState<PptThemeId>("iare");
  const [presenterName, setPresenterName] = useState(SAMPLE_TOPICS[0].presenter);
  const [collegeName, setCollegeName] = useState(SAMPLE_TOPICS[0].college);
  const [eventName, setEventName] = useState(SAMPLE_TOPICS[0].event);

  // IARE Academic Metadata State (Enabled by Default!)
  const [isIareMode, setIsIareMode] = useState(true);
  const [assessmentType, setAssessmentType] = useState<IareAssessmentType>(SAMPLE_TOPICS[0].assessmentType);
  const [department, setDepartment] = useState<string>(SAMPLE_TOPICS[0].department);
  const [semesterRegulation, setSemesterRegulation] = useState<string>(SAMPLE_TOPICS[0].semester);
  const [courseName, setCourseName] = useState<string>(SAMPLE_TOPICS[0].courseName);
  const [courseCode, setCourseCode] = useState<string>(SAMPLE_TOPICS[0].courseCode);
  const [rollNumber, setRollNumber] = useState<string>(SAMPLE_TOPICS[0].rollNo);
  const [studentName, setStudentName] = useState<string>(SAMPLE_TOPICS[0].presenter);
  const [facultyName, setFacultyName] = useState<string>(SAMPLE_TOPICS[0].faculty);
  const [customLogoBase64, setCustomLogoBase64] = useState<string>("");

  const logoInputRef = useRef<HTMLInputElement>(null);

  // API Key Vault Modal State
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultConfig, setVaultConfig] = useState<ApiVaultConfig>({
    provider: "zero-key",
  });

  // Load vault & IARE logo preferences from localStorage
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
    }
  }, []);

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

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [presentation, setPresentation] = useState<TechTalkPresentation | null>(null);
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
    setAssessmentType(sample.assessmentType);
    setDepartment(sample.department);
    setSemesterRegulation(sample.semester);
    setCourseName(sample.courseName);
    setCourseCode(sample.courseCode);
    setRollNumber(sample.rollNo);
    setStudentName(sample.presenter);
    setFacultyName(sample.faculty);
  };

  // Generate complete deck
  const handleGenerateDeck = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const iareMeta: IareMetadata | undefined = isIareMode
        ? {
            isIareMode: true,
            assessmentType,
            department,
            semesterRegulation,
            courseName,
            courseCode,
            rollNumber,
            studentName: studentName || presenterName,
            facultyName,
            customLogoBase64: customLogoBase64 || undefined,
          }
        : undefined;

      const slides = await generateTechTalkPresentation({
        topic,
        details,
        slideCount,
        presenterName: isIareMode ? studentName : presenterName,
        collegeName: isIareMode ? "IARE (Autonomous), Hyderabad" : collegeName,
        eventName: isIareMode ? assessmentType : eventName,
        config: vaultConfig,
        iareMetadata: iareMeta,
      });

      const newDeck: TechTalkPresentation = {
        topic,
        details,
        presenterName: isIareMode ? studentName : presenterName,
        collegeName: isIareMode ? "IARE (Autonomous), Hyderabad" : collegeName,
        eventName: isIareMode ? assessmentType : eventName,
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
        toolName: isIareMode ? "IARE Tech-Talk Presentation" : "AI Tech-Talk Studio",
        inputFiles: [topic],
        outputFileName: `${topic.slice(0, 32)}.pptx`,
        outputSizeBytes: 1024 * 50,
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
      const safeName = presentation.topic.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 32);
      const downloadFilename = `${safeName}-${isIareMode ? "IARE-AAT" : "SlideDeck"}.pdf`;

      sessionHistory.recordExecution({
        toolId: "tech-talk-ppt-studio",
        toolName: "PDF Presentation Deck",
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
    a.download = `${presentation.topic.replace(/[^a-zA-Z0-9_-]/g, "_")}-Speaker-Script.md`;
    a.click();
  };

  const isCurrentIare = Boolean(
    presentation?.iareMetadata?.isIareMode ||
    presentation?.themeId === "iare" ||
    (selectedTheme === "iare" && isIareMode)
  );

  const currentTheme = isCurrentIare
    ? PPT_THEMES.iare
    : PPT_THEMES[selectedTheme] || PPT_THEMES.neon;

  const currentSlide = presentation?.slides[activeSlideIndex];

  const activeIareMeta: IareMetadata = presentation?.iareMetadata || {
    isIareMode,
    assessmentType,
    department,
    semesterRegulation,
    courseName,
    courseCode,
    rollNumber,
    studentName: studentName || presenterName,
    facultyName,
    customLogoBase64,
  };

  return (
    <section
      id="ai-presentation-studio"
      className="relative rounded-3xl border border-white/[0.12] bg-[#05060B] p-5 sm:p-10 shadow-[0_0_60px_rgba(99,102,241,0.08)] overflow-hidden space-y-8"
    >
      {/* Specular Ambient Glow Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-cyan-600/10 blur-[120px]" />

      {/* Top Banner & Heading Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 relative z-10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>IARE Official Tech-Talk &amp; Concept Video Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] flex items-center gap-2 flex-wrap">
            <span>Topic to 10–15 Slide PPTX &amp; PDF Deck Generator</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold font-mono">
              IARE Autonomous Aligned
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Turn any syllabus, college tech-talk topic, or IEEE abstract into an official, OBE-aligned
            presentation deck with Master Slide headers, footers, student Roll Number, and stage speaker scripts.
          </p>
        </div>

        {/* Engine Vault Trigger */}
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
          <div className="space-y-6">
            {/* 1. IARE Official Template Mode Toggle Card */}
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-zinc-950 to-slate-950 p-5 sm:p-7 space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        IARE Official Tech Talk / AAT &amp; Concept Video Mode
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Default &amp; Recommended
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Formats Master Cover, continuous institutional headers/footers, and 15-slide Course Outcome (CO) mapping.
                    </p>
                  </div>
                </div>

                {/* Toggle Button */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isIareMode;
                      setIsIareMode(next);
                      if (next) setSelectedTheme("iare");
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                      isIareMode
                        ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-white/[0.04] text-zinc-400 border-white/[0.1] hover:text-white"
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isIareMode ? "opacity-100" : "opacity-30"}`} />
                    <span>{isIareMode ? "IARE Template Active" : "Enable IARE Template"}</span>
                  </button>
                </div>
              </div>

              {/* IARE Academic Fields (Visible when IARE Mode is Active) */}
              {isIareMode && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Assessment Type Pills */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-amber-300 uppercase tracking-wider block">
                      Continuous Assessment Type (CIA / AAT)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {IARE_ASSESSMENT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAssessmentType(type)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
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

                  {/* Department Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      Academic Department / Engineering Branch
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/[0.1] rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {IARE_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept} className="bg-zinc-950 text-white">
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Regs & Course Details (3 Columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Semester &amp; Regulation
                      </span>
                      <input
                        type="text"
                        value={semesterRegulation}
                        onChange={(e) => setSemesterRegulation(e.target.value)}
                        placeholder="II B.Tech I Semester (BT24 / BT25)"
                        className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Course Name
                      </span>
                      <input
                        type="text"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        placeholder="Design and Analysis of Algorithms"
                        className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Course Code
                      </span>
                      <input
                        type="text"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        placeholder="ACSD08"
                        className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Student & Faculty Credentials (3 Columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Student Full Name
                      </span>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => {
                          setStudentName(e.target.value);
                          setPresenterName(e.target.value);
                        }}
                        placeholder="Vignesh Reddy"
                        className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Student Roll Number / Hall Ticket
                      </span>
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="24951A0501"
                        className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-semibold placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Course Coordinator / Faculty Guide
                      </span>
                      <input
                        type="text"
                        value={facultyName}
                        onChange={(e) => setFacultyName(e.target.value)}
                        placeholder="Dr. K. Srinivas Rao, Professor"
                        className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Institutional Crest & Custom Logo Uploader */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-3.5">
                      {customLogoBase64 ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={customLogoBase64}
                          alt="Custom College Logo"
                          className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-amber-500/40 shrink-0"
                        />
                      ) : (
                        <IareEmblem className="w-12 h-12 shrink-0" size={48} />
                      )}
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          {customLogoBase64
                            ? "Custom College Logo Active"
                            : "Built-In IARE Autonomous Vector Crest Active"}
                        </span>
                        <span className="text-[11px] text-zinc-400 block">
                          Embeds on Title Cover Banner and exported .pptx &amp; .pdf files.
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
                          title="Reset to default IARE vector crest"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Technical Seminar Topic & Customization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Topic & Abstract */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Presentation Topic Title
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSampleTopic}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Load Sample IARE Topic
                    </button>
                  </div>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Design and Analysis of Quantum-Resistant Cryptographic Algorithms"
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-2xl px-4 py-3 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-medium shadow-inner"
                  />
                </div>

                {/* Reference / Syllabus Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Syllabus Units, Abstract or Presentation Notes
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    placeholder="Paste your seminar syllabus, course outcomes, or IEEE abstract..."
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-2xl p-4 text-xs sm:text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-amber-500 leading-relaxed resize-y shadow-inner"
                  />
                </div>
              </div>

              {/* Right Column: Slide Count & Visual Themes */}
              <div className="lg:col-span-5 space-y-6">
                {/* Exact Slide Count Controls */}
                <div className="premium-card p-5 rounded-3xl space-y-3.5 border border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Exact Slide Count
                    </span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {slideCount} Slides {slideCount === 15 && "(Full IARE OBE Rubric)"}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="8"
                    max="20"
                    step="1"
                    value={slideCount}
                    onChange={(e) => setSlideCount(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[10, 12, 14, 15].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSlideCount(count)}
                        className={`py-1.5 text-xs rounded-xl font-medium border transition-all cursor-pointer ${
                          slideCount === count
                            ? "bg-amber-500 border-amber-400 text-black font-bold shadow-sm"
                            : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {count} Slides
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Slide Palettes */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                    Visual Slide Template
                  </label>
                  <div className="space-y-2">
                    {(Object.keys(PPT_THEMES) as PptThemeId[]).map((themeKey) => {
                      const t = PPT_THEMES[themeKey];
                      const isSelected = selectedTheme === themeKey;
                      const isIareTheme = themeKey === "iare";

                      return (
                        <button
                          key={themeKey}
                          type="button"
                          onClick={() => {
                            setSelectedTheme(themeKey);
                            if (isIareTheme) setIsIareMode(true);
                          }}
                          className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500/60 text-white shadow-md ring-1 ring-amber-500/30"
                              : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.12]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-5 h-5 rounded-full border border-white/20 shrink-0 shadow-sm"
                              style={{ backgroundColor: t.primaryAccentHex }}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-white block">
                                  {t.name}
                                </span>
                                {isIareTheme && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                    Official
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-400 block truncate max-w-xs">
                                {t.tagline}
                              </span>
                            </div>
                          </div>
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
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
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-indigo-600 hover:from-amber-400 hover:via-rose-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-amber-500/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Synthesizing {slideCount}-Slide Academic Presentation...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-200" />
                      <span>Generate {slideCount}-Slide Presentation Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* If presentation IS generated: show 16:9 Interactive Widescreen Studio */}
        {presentation && currentSlide && (
          <div className="space-y-6">
            {/* Action Bar Above Canvas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    SLIDE {activeSlideIndex + 1} OF {presentation.slides.length}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                    Layout: {currentSlide.layout}
                  </span>
                  {isCurrentIare && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      IARE Master Active
                    </span>
                  )}
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
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
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
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-600/20 disabled:opacity-50"
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
                  className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download Speaker Script for your phone"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Speech Notes (.md)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPresentation(null)}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  New Deck
                </button>
              </div>
            </div>

            {/* 16:9 Widescreen Visual Slide Canvas */}
            <div
              className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl border border-white/[0.15] p-5 sm:p-9 flex flex-col justify-between transition-colors select-none"
              style={{
                backgroundColor: currentTheme.bgHex,
                color: currentTheme.textHex,
              }}
            >
              {/* Top Accent Bar */}
              <div
                className="absolute top-0 inset-x-0 h-1.5"
                style={{ backgroundColor: currentTheme.primaryAccentHex }}
              />

              {/* ======================================================== */}
              {/* SLIDE 1: IARE TITLE COVER MASTER SLIDE                   */}
              {/* ======================================================== */}
              {currentSlide.layout === "title" && isCurrentIare ? (
                <div className="flex-1 flex flex-col justify-between relative z-10 space-y-3">
                  {/* Top Institutional Header Banner */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    {activeIareMeta.customLogoBase64 ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activeIareMeta.customLogoBase64}
                        alt="College Logo"
                        className="w-14 h-14 sm:w-20 sm:h-20 object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0"
                      />
                    ) : (
                      <IareEmblem className="w-14 h-14 sm:w-20 sm:h-20 shrink-0" size={76} />
                    )}
                    <div className="space-y-0.5">
                      <h1 className="text-xs sm:text-base md:text-lg font-black text-[#8B0000] tracking-wide uppercase font-serif">
                        INSTITUTE OF AERONAUTICAL ENGINEERING
                      </h1>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-bold text-[#002147] tracking-wider">
                          (Autonomous)
                        </span>
                        <span className="text-[9px] sm:text-[11px] text-slate-500">
                          • Dundigal, Hyderabad - 500 043, Telangana
                        </span>
                      </div>
                      <h2 className="text-[10px] sm:text-xs font-extrabold text-[#8B0000] tracking-widest uppercase">
                        DEPARTMENT OF {activeIareMeta.department.toUpperCase()}
                      </h2>
                    </div>
                  </div>

                  {/* Double Horizontal Accent Rule */}
                  <div className="space-y-0.5">
                    <div className="h-1 bg-[#8B0000] w-full rounded-full" />
                    <div className="h-0.5 bg-[#D97706] w-full rounded-full" />
                  </div>

                  {/* Assessment Pill + Topic Title */}
                  <div className="space-y-1.5 my-auto">
                    <div className="inline-flex items-center px-3 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      [{activeIareMeta.assessmentType.toUpperCase()} PRESENTATION]
                    </div>
                    <h3 className="text-base sm:text-2xl md:text-3xl font-black text-[#002147] tracking-tight leading-tight">
                      {currentSlide.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">
                      Course: {activeIareMeta.courseName} ({activeIareMeta.courseCode}) • {activeIareMeta.semesterRegulation}
                    </p>
                  </div>

                  {/* Bottom 2-Column Metadata Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5 shadow-sm">
                      <span className="text-[10px] sm:text-xs font-bold text-[#8B0000] uppercase tracking-wider block">
                        Presented By
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {activeIareMeta.studentName}
                      </p>
                      <p className="text-[11px] sm:text-xs text-amber-900 font-mono font-semibold">
                        Roll No: {activeIareMeta.rollNumber}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-600 truncate">
                        {activeIareMeta.department}
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5 shadow-sm">
                      <span className="text-[10px] sm:text-xs font-bold text-[#002147] uppercase tracking-wider block">
                        Course Coordinator / Evaluated By
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {activeIareMeta.facultyName || "Course Coordinator"}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-600">
                        Department of {activeIareMeta.department}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-500">
                        IARE (Autonomous), Hyderabad
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ======================================================== */
                /* REGULAR SLIDE OR CONTENT SLIDE                           */
                /* ======================================================== */
                <>
                  {/* SLIDE HEADER */}
                  {isCurrentIare ? (
                    /* IARE Master Header Strip */
                    <div className="space-y-1.5 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-[#8B0000]">
                          <IareEmblem className="w-4 h-4 shrink-0" size={16} />
                          <span>
                            IARE (Autonomous) • Dept. of {activeIareMeta.department.replace(/\s*\(.*\)/, "")}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-500">
                          {activeIareMeta.assessmentType} — {activeIareMeta.courseCode}
                        </span>
                      </div>
                      <div className="h-px bg-slate-200 w-full" />
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="w-1.5 h-6 sm:h-7 bg-[#8B0000] rounded-sm shrink-0" />
                        <h3 className="text-base sm:text-xl md:text-2xl font-black text-[#002147] tracking-tight">
                          {currentSlide.title}
                        </h3>
                      </div>
                      {currentSlide.subtitle && (
                        <p className="text-xs text-slate-600 line-clamp-1 pl-3.5">
                          {currentSlide.subtitle}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Non-IARE General Header */
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
                  )}

                  {/* SLIDE DYNAMIC LAYOUT BODY */}
                  <div className="flex-1 my-3 flex flex-col justify-center relative z-10">
                    {currentSlide.layout === "title" && !isCurrentIare && (
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
                        <p className="text-sm font-semibold" style={{ color: currentTheme.textHex }}>
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
                            className="p-4 rounded-2xl border space-y-1.5 shadow-sm"
                            style={{
                              backgroundColor: currentTheme.cardBgHex,
                              borderColor: currentTheme.borderHex,
                            }}
                          >
                            {card.tag && (
                              <span
                                className="text-[10px] font-mono font-bold tracking-wider uppercase block"
                                style={{ color: currentTheme.primaryAccentHex }}
                              >
                                {card.tag}
                              </span>
                            )}
                            <h4
                              className="text-xs sm:text-sm font-bold"
                              style={{ color: currentTheme.textHex }}
                            >
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
                              className="p-3.5 rounded-2xl border space-y-1.5 relative shadow-sm"
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
                              <h4
                                className="text-xs font-bold"
                                style={{ color: currentTheme.textHex }}
                              >
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
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr
                                style={{
                                  backgroundColor: currentTheme.secondaryAccentHex,
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
                                  className="border-t border-slate-200/80"
                                >
                                  {row.map((cell, cI) => (
                                    <td
                                      key={cI}
                                      className="p-2.5 font-medium"
                                      style={{
                                        color:
                                          cI === 2
                                            ? currentTheme.primaryAccentHex
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
                        <div className="p-4 rounded-2xl bg-[#03060C] border border-indigo-500/30 font-mono text-xs text-zinc-300 space-y-2 overflow-x-auto shadow-inner">
                          <span className="text-[11px] text-amber-400 block font-semibold">
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
                            className="p-5 rounded-2xl border space-y-1.5 shadow-sm"
                            style={{
                              backgroundColor: currentTheme.cardBgHex,
                              borderColor: currentTheme.primaryAccentHex,
                            }}
                          >
                            <span
                              className="text-4xl sm:text-5xl font-black block"
                              style={{ color: currentTheme.primaryAccentHex }}
                            >
                              {currentSlide.metric.value}
                            </span>
                            <h4
                              className="text-sm font-bold"
                              style={{ color: currentTheme.textHex }}
                            >
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
                                  style={{ color: currentTheme.textHex }}
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
                              className="p-4 rounded-2xl border space-y-2 shadow-sm"
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
                                    style={{ color: currentTheme.textHex }}
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
                  {isCurrentIare ? (
                    /* IARE Master Footer Strip */
                    <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
                      <span className="font-medium text-slate-700">
                        {activeIareMeta.rollNumber} — {activeIareMeta.studentName}
                      </span>
                      <span className="truncate max-w-[200px] sm:max-w-xs text-slate-500">
                        {presentation.topic}
                      </span>
                      <span className="font-mono font-bold text-[#002147]">
                        Slide {currentSlide.slideNumber} of {presentation.slides.length}
                      </span>
                    </div>
                  ) : (
                    /* General Footer */
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
                  )}
                </>
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
                    <span className="truncate max-w-[100px] inline-block align-bottom">
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
              {/* Quick Slide Title Editor */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Edit Current Slide Title
                </label>
                <input
                  type="text"
                  value={currentSlide.title}
                  onChange={(e) => handleUpdateSlideTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/[0.1] rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-amber-500"
                />
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
                  rows={3}
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
