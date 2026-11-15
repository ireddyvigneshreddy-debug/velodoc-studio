"use client";

import React, { useState } from "react";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { CameraScannerModal } from "@/components/CameraScannerModal";
import {
  IdCardOptions,
  create2In1IdPdf,
  createPassportSheetPdf,
  generateSampleIdCardPair,
} from "@/lib/id-card-engine";
import { createPdfBlob } from "@/lib/utils";
import { sessionHistory } from "@/lib/session-history";
import { ProcessingMetrics } from "@/types";
import {
  Camera,
  UploadSimple,
  Sparkle,
  Scissors,
  CircleNotch,
  FileText,
  Sliders,
  ArrowsClockwise,
} from "@/components/common/icons";

export function IdCardStudioTool() {
  const [activeMode, setActiveMode] = useState<"2in1-id" | "passport-sheet">("2in1-id");

  // Mode A: 2-in-1 ID Card state
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [frontRotation, setFrontRotation] = useState<number>(0);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [backRotation, setBackRotation] = useState<number>(0);

  // Mode B: Passport Photo state
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);

  const handleSwapCards = () => {
    const tempF = frontFile;
    const tempP = frontPreview;
    const tempR = frontRotation;
    setFrontFile(backFile);
    setFrontPreview(backPreview);
    setFrontRotation(backRotation);
    setBackFile(tempF);
    setBackPreview(tempP);
    setBackRotation(tempR);
  };

  // Common Options
  const [options, setOptions] = useState<IdCardOptions>({
    mode: "2in1-id",
    paperSize: "a4",
    orientation: "portrait",
    filter: "original",
    drawCutGuides: true,
    passportPreset: "indian-uk-35x45",
    photoCount: 8,
  });

  // Camera Scanner Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"front" | "back" | "passport">("front");

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load sample on click
  const handleLoadSample = async () => {
    try {
      setErrorMessage(null);
      if (activeMode === "2in1-id") {
        const { front, back } = await generateSampleIdCardPair();
        setFrontFile(front);
        setFrontPreview(URL.createObjectURL(front));
        setBackFile(back);
        setBackPreview(URL.createObjectURL(back));
      } else {
        const { front } = await generateSampleIdCardPair();
        setPassportPhoto(front);
        setPassportPreview(URL.createObjectURL(front));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not load sample data.");
    }
  };

  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handlePassportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPassportPhoto(file);
      setPassportPreview(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const openCameraFor = (target: "front" | "back" | "passport") => {
    setCameraTarget(target);
    setIsCameraOpen(true);
  };

  const handleCameraScans = (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    if (cameraTarget === "front") {
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
    } else if (cameraTarget === "back") {
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
    } else {
      setPassportPhoto(file);
      setPassportPreview(URL.createObjectURL(file));
    }
    setIsCameraOpen(false);
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressMsg("Rendering precision print layout...");
    const startTime = performance.now();

    try {
      let pdfBytes: Uint8Array;
      let totalInputSize = 0;

      if (activeMode === "2in1-id") {
        if (!frontFile) {
          throw new Error("Please upload or scan the Front of your ID card.");
        }
        totalInputSize = frontFile.size + (backFile ? backFile.size : 0);
        pdfBytes = await create2In1IdPdf(frontFile, backFile, options);
      } else {
        if (!passportPhoto) {
          throw new Error("Please upload or scan a photo for the passport sheet.");
        }
        totalInputSize = passportPhoto.size;
        pdfBytes = await createPassportSheetPdf(passportPhoto, options);
      }

      const endTime = performance.now();
      setOutputBytes(pdfBytes);
      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = activeMode === "2in1-id" ? "2in1_id_card_sheet.pdf" : "passport_photo_sheet.pdf";

      setMetrics({
        originalSize: totalInputSize,
        processedSize: pdfBytes.byteLength,
        savedBytes: 0,
        savedPercentage: 0,
        durationMs: Math.round(endTime - startTime),
        downloadUrl,
        downloadFilename,
        pageCount: 1,
      });

      sessionHistory.recordExecution({
        toolId: "id-card-studio",
        toolName: "2-in-1 ID & Passport Photo Sheet",
        inputFiles: [frontFile?.name || "card_front.jpg"],
        outputFileName: downloadFilename,
        outputSizeBytes: pdfBytes.byteLength,
        durationMs: Math.round(endTime - startTime),
        outputData: pdfBytes,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate print sheet.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (outputBytes && metrics) {
    return (
      <ResultPreviewStudio
        metrics={metrics}
        outputBytes={outputBytes}
        outputMimeType="application/pdf"
        onAdjustSettings={() => setOutputBytes(null)}
        title={activeMode === "2in1-id" ? "2-in-1 ID Card Sheet Ready" : "Passport Photo Sheet Ready"}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode Selector Tabs */}
      <div className="paper-card p-2 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setActiveMode("2in1-id");
              setOptions((prev) => ({ ...prev, mode: "2in1-id" }));
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-2 ${
              activeMode === "2in1-id"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 hover:bg-paper-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2-in-1 Front & Back ID Card (A4)</span>
          </button>

          <button
            onClick={() => {
              setActiveMode("passport-sheet");
              setOptions((prev) => ({ ...prev, mode: "passport-sheet" }));
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-2 ${
              activeMode === "passport-sheet"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 hover:bg-paper-200"
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Passport Photo Print Sheet</span>
          </button>
        </div>

        {/* 1-Click Sample Button */}
        <button
          onClick={handleLoadSample}
          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border hover:border-zinc-400 flex items-center gap-1.5 transition-colors"
        >
          <Sparkle className="w-3.5 h-3.5 text-[#C2410C]" />
          <span>Load Sample Test File</span>
        </button>
      </div>

      {/* MODE A: 2-IN-1 ID CARD (FRONT & BACK) */}
      {activeMode === "2in1-id" ? (
        <div className="space-y-3">
          {(frontFile || backFile) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSwapCards}
                disabled={!frontFile || !backFile}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 text-zinc-900 dark:text-zinc-100 border border-paper-300 dark:border-charcoal-border flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ArrowsClockwise className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Swap Front ⇄ Back Position</span>
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Front Uploader */}
          <div className="paper-card p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  1. Front of ID Card
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  College ID, Aadhaar, PAN, or License
                </p>
              </div>
              {frontFile && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                  Ready
                </span>
              )}
            </div>

            {frontPreview ? (
              <div className="relative aspect-[85/54] rounded-lg overflow-hidden border border-paper-300 dark:border-charcoal-border bg-paper-100 dark:bg-charcoal-900 flex items-center justify-center">
                <img
                  src={frontPreview}
                  alt="Front Preview"
                  className="w-full h-full object-contain transition-transform duration-200"
                  style={{ transform: `rotate(${frontRotation}deg)` }}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <button
                    onClick={() => setFrontRotation((r) => (r + 90) % 360)}
                    className="px-2 py-1 rounded bg-black/75 hover:bg-black text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                    title="Rotate 90 degrees"
                  >
                    <ArrowsClockwise className="w-3 h-3" /> Rotate
                  </button>
                  <button
                    onClick={() => openCameraFor("front")}
                    className="px-2 py-1 rounded bg-black/75 hover:bg-black text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" /> Rescan
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-paper-300 dark:border-charcoal-border rounded-lg p-6 text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <label className="cursor-pointer px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-charcoal-700 text-xs font-mono text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-charcoal-border inline-flex items-center gap-1.5 transition-colors">
                    <UploadSimple className="w-3.5 h-3.5" />
                    <span>Upload Front Photo</span>
                    <input type="file" accept="image/*" onChange={handleFrontUpload} className="hidden" />
                  </label>
                  <button
                    onClick={() => openCameraFor("front")}
                    className="px-3.5 py-2 rounded-lg bg-[#FFF5F0] hover:bg-[#FFE8DE] text-xs font-mono text-[#C2410C] border border-[#FBDCD0] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan with Camera</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">Accepts JPG, PNG, WebP up to 30 MB</p>
              </div>
            )}
          </div>

          {/* Card Back Uploader */}
          <div className="paper-card p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  2. Back of ID Card (Optional)
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Address, emergency contacts, or terms
                </p>
              </div>
              {backFile && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                  Ready
                </span>
              )}
            </div>

            {backPreview ? (
              <div className="relative aspect-[85/54] rounded-lg overflow-hidden border border-paper-300 dark:border-charcoal-border bg-paper-100 dark:bg-charcoal-900 flex items-center justify-center">
                <img
                  src={backPreview}
                  alt="Back Preview"
                  className="w-full h-full object-contain transition-transform duration-200"
                  style={{ transform: `rotate(${backRotation}deg)` }}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <button
                    onClick={() => setBackRotation((r) => (r + 90) % 360)}
                    className="px-2 py-1 rounded bg-black/75 hover:bg-black text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                    title="Rotate 90 degrees"
                  >
                    <ArrowsClockwise className="w-3 h-3" /> Rotate
                  </button>
                  <button
                    onClick={() => openCameraFor("back")}
                    className="px-2 py-1 rounded bg-black/75 hover:bg-black text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" /> Rescan
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-paper-300 dark:border-charcoal-border rounded-lg p-6 text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <label className="cursor-pointer px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-charcoal-700 text-xs font-mono text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-charcoal-border inline-flex items-center gap-1.5 transition-colors">
                    <UploadSimple className="w-3.5 h-3.5" />
                    <span>Upload Back Photo</span>
                    <input type="file" accept="image/*" onChange={handleBackUpload} className="hidden" />
                  </label>
                  <button
                    onClick={() => openCameraFor("back")}
                    className="px-3.5 py-2 rounded-lg bg-[#FFF5F0] hover:bg-[#FFE8DE] text-xs font-mono text-[#C2410C] border border-[#FBDCD0] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan with Camera</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">Leave blank for single-sided ID sheet</p>
              </div>
            )}
          </div>
        </div>
        </div>
      ) : (
        /* MODE B: PASSPORT PHOTO SHEET */
        <div className="paper-card p-6 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {passportPreview ? (
              <div className="relative aspect-[35/45] max-w-[220px] mx-auto rounded-lg overflow-hidden border border-paper-300 dark:border-charcoal-border bg-paper-100 dark:bg-charcoal-900">
                <img src={passportPreview} alt="Passport Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => openCameraFor("passport")}
                  className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-black/75 hover:bg-black text-white text-xs font-mono flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" /> Rescan
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-paper-300 dark:border-charcoal-border rounded-lg p-8 text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <label className="cursor-pointer px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-charcoal-700 text-xs font-mono text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-charcoal-border inline-flex items-center gap-1.5 transition-colors">
                    <UploadSimple className="w-3.5 h-3.5" />
                    <span>Upload Passport Photo</span>
                    <input type="file" accept="image/*" onChange={handlePassportUpload} className="hidden" />
                  </label>
                  <button
                    onClick={() => openCameraFor("passport")}
                    className="px-4 py-2 rounded-lg bg-[#FFF5F0] hover:bg-[#FFE8DE] text-xs font-mono text-[#C2410C] border border-[#FBDCD0] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan with Camera</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">Upload high-res portrait with plain background</p>
              </div>
            )}

            {/* Passport Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Standard Photo Size Preset
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: "indian-uk-35x45", label: "35 x 45 mm (Indian / UK / Singapore)" },
                    { id: "us-visa-2x2", label: "2 x 2 inch / 51x51 mm (US / Visa / Schengen)" },
                    { id: "stamp-25x30", label: "25 x 30 mm (Exam / Stamp Size)" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setOptions((prev) => ({ ...prev, passportPreset: p.id as any }))}
                      className={`px-3 py-2 text-left rounded-lg text-xs font-mono border transition-colors ${
                        options.passportPreset === p.id
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950"
                          : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Copies per Sheet
                </label>
                <div className="flex items-center gap-2">
                  {[4, 6, 8, 12, 16].map((count) => (
                    <button
                      key={count}
                      onClick={() => setOptions((prev) => ({ ...prev, photoCount: count as any }))}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                        options.photoCount === count
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950"
                          : "bg-paper-100 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300"
                      }`}
                    >
                      {count}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sheet Settings & Filters Bar */}
      <div className="paper-card p-4 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Sliders className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">
            Image Filter:
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { id: "original", label: "Full Color" },
              { id: "magic-scan", label: "Magic Scan B&W" },
              { id: "grayscale", label: "Grayscale" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setOptions((prev) => ({ ...prev, filter: f.id as any }))}
                className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                  options.filter === f.id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900"
                    : "bg-paper-100 dark:bg-charcoal-700 text-zinc-700 dark:text-zinc-300 border-paper-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 cursor-pointer">
          <input
            type="checkbox"
            checked={options.drawCutGuides}
            onChange={(e) => setOptions((prev) => ({ ...prev, drawCutGuides: e.target.checked }))}
            className="rounded border-zinc-300 text-[#C2410C] focus:ring-[#C2410C]"
          />
          <span>Dotted Cut Guides & Fold Line</span>
        </label>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-900 border border-rose-300 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Primary Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] text-white font-mono text-xs font-medium shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <CircleNotch className="w-4 h-4 animate-spin" />
              <span>{progressMsg || "Generating Print Sheet..."}</span>
            </>
          ) : (
            <>
              <Scissors className="w-4 h-4" />
              <span>
                {activeMode === "2in1-id"
                  ? "Generate 2-in-1 ID Print Sheet (A4 PDF)"
                  : `Generate ${options.photoCount}x Passport Photo Sheet (PDF)`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Camera Scanner Modal Integration */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onAddScansToQueue={handleCameraScans}
      />
    </div>
  );
}
