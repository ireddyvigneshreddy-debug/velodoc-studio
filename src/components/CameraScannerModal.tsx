"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import NextImage from "next/image";
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  SunMedium,
  Sparkles,
  FileText,
  Layers,
  Crop,
  RotateCw,
  RotateCcw,
  Sliders,
  X,
  Trash2,
  Plus,
  FlipHorizontal,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Video,
  Crosshair,
  SlidersHorizontal,
  FileCheck,
  FileDown,
  ArrowRight,
} from "lucide-react";
import {
  DocumentFilterType,
  CropPreset,
  ScanAdjustments,
  ScannedPageItem,
  DEFAULT_ADJUSTMENTS,
  FILTER_METADATA,
  playCameraShutterSound,
  MotionStabilityDetector,
  initializeCameraStream,
  applyTrackConstraint,
  stopMediaStream,
  processScannedImage,
  getPresetCropBox,
  canvasToBlob,
  createScanFile,
} from "@/lib/scanner-engine";

export interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddScansToQueue: (files: File[]) => void;
  onInstantGeneratePdf?: (files: File[]) => Promise<void> | void;
}

type StudioView = "viewfinder" | "editor";
type CaptureMode = "single" | "batch";
type TimerMode = 0 | 3 | 5;
type AlignmentGuide = "none" | "a4" | "letter" | "grid";
type ResolutionPreset = "720p" | "1080p" | "4k";

export function CameraScannerModal({
  isOpen,
  onClose,
  onAddScansToQueue,
  onInstantGeneratePdf,
}: CameraScannerModalProps) {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<StudioView>("viewfinder");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("batch");
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Scanned Pages Store
  const [scannedPages, setScannedPages] = useState<ScannedPageItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Camera Hardware State
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [resolutionPreset, setResolutionPreset] = useState<ResolutionPreset>("1080p");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(true);

  // Viewfinder Hardware & Digital Features
  const [supportsTorch, setSupportsTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [supportsHardwareZoom, setSupportsHardwareZoom] = useState(false);
  const [hardwareZoomRange, setHardwareZoomRange] = useState<{ min: number; max: number; step: number }>({
    min: 1,
    max: 4,
    step: 0.1,
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isMirrorActive, setIsMirrorActive] = useState(false);
  const [alignmentGuide, setAlignmentGuide] = useState<AlignmentGuide>("a4");
  const [showCrosshair, setShowCrosshair] = useState(true);

  // Automation: Auto-Shutter & Self-Timer
  const [isAutoShutterActive, setIsAutoShutterActive] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState(0); // 0 to 1
  const [timerSeconds, setTimerSeconds] = useState<TimerMode>(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);

  // Screen Flash Visual Feedback
  const [isScreenFlashing, setIsScreenFlashing] = useState(false);

  // Editor Adjustment Controls (for the actively selected page)
  const [editorAdjustments, setEditorAdjustments] = useState<ScanAdjustments>(DEFAULT_ADJUSTMENTS);
  const [viewfinderFilter, setViewfinderFilter] = useState<DocumentFilterType>("magic-color");
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);
  const [activeCropPreset, setActiveCropPreset] = useState<CropPreset>("full");

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stabilityDetectorRef = useRef<MotionStabilityDetector | null>(null);
  const timerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePageRef = useRef<ScannedPageItem | null>(null);

  // Keep activePageRef up to date
  useEffect(() => {
    activePageRef.current = scannedPages[activePageIndex] || null;
    if (scannedPages[activePageIndex]) {
      setEditorAdjustments(scannedPages[activePageIndex].adjustments);
    }
  }, [scannedPages, activePageIndex]);

  // ==========================================================================
  // CAMERA LIFECYCLE & INITIALIZATION
  // ==========================================================================

  // Enumerate all available camera video inputs
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        // Prefer rear camera on mobile if labeled
        const backCamera = videoInputs.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        setSelectedDeviceId(backCamera ? backCamera.deviceId : videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn("Could not enumerate camera devices:", err);
    }
  }, [selectedDeviceId]);

  // Zero-leak camera stream cleanup
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (stabilityDetectorRef.current) {
      stabilityDetectorRef.current.stop();
    }
    setIsTorchOn(false);
    setStabilityProgress(0);
  }, []);

  // Initialize Camera Stream with graceful fallback tiers
  const startCamera = useCallback(async () => {
    if (!isOpen) return;

    setIsCameraLoading(true);
    setCameraError(null);
    stopCurrentStream();

    try {
      const res = await initializeCameraStream({
        deviceId: selectedDeviceId || undefined,
        facingMode,
        resolutionPreset,
      });

      streamRef.current = res.stream;
      setSupportsTorch(res.supportsTorch);
      setSupportsHardwareZoom(res.supportsZoom);
      if (res.zoomRange) {
        setHardwareZoomRange(res.zoomRange);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = res.stream;
        await videoRef.current.play().catch(() => {});
      }

      // Re-enumerate devices so system device labels populate after permission grant
      await refreshDevices();
    } catch (err: unknown) {
      console.error("Camera start failed:", err);
      let message = "Unable to access camera.";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          message = "Camera access denied. Please allow camera permissions in your browser.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          message = "No camera found on this device. You can still upload photos from disk.";
        } else if (err.name === "NotReadableError") {
          message = "Camera is already in use by another application.";
        } else if (err.name === "OverconstrainedError") {
          message = "Camera does not support the requested video constraints.";
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setCameraError(message);
    } finally {
      setIsCameraLoading(false);
    }
  }, [isOpen, selectedDeviceId, facingMode, resolutionPreset, stopCurrentStream, refreshDevices]);

  // Restart camera whenever modal opens or camera hardware parameters change
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCurrentStream();
    }
    const currentTimer = timerTimeoutRef.current;
    return () => {
      stopCurrentStream();
      if (currentTimer) clearTimeout(currentTimer);
    };
  }, [isOpen, startCamera, stopCurrentStream]);

  // ==========================================================================
  // HARDWARE ZOOM & TORCH CONTROLS
  // ==========================================================================

  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom);
    if (supportsHardwareZoom && streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        await applyTrackConstraint(track, { zoom: newZoom });
      }
    }
  };

  const handleToggleTorch = async () => {
    if (!supportsTorch || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const nextTorch = !isTorchOn;
    const success = await applyTrackConstraint(track, { torch: nextTorch });
    if (success) {
      setIsTorchOn(nextTorch);
    }
  };

  const handleFlipCamera = () => {
    if (devices.length > 1) {
      // Cycle to the next device ID
      const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
    } else {
      // Toggle facingMode if on mobile without named devices
      setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    }
  };

  // ==========================================================================
  // SHUTTER & PHOTO CAPTURE
  // ==========================================================================

  const executeCapture = useCallback(async () => {
    if (!videoRef.current || isCapturing) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsCapturing(true);

    // 1. Audio and Screen Flash Feedback
    playCameraShutterSound();
    setIsScreenFlashing(true);
    setTimeout(() => setIsScreenFlashing(false), 140);

    try {
      const vidW = video.videoWidth;
      const vidH = video.videoHeight;

      // 2. Capture native frame to offscreen canvas
      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = vidW;
      snapCanvas.height = vidH;
      const ctx = snapCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not acquire capture canvas context.");

      ctx.save();

      // Mirror flip if enabled
      if (isMirrorActive) {
        ctx.translate(vidW, 0);
        ctx.scale(-1, 1);
      }

      // Digital zoom crop if hardware zoom was not active
      if (!supportsHardwareZoom && zoomLevel > 1.0) {
        const cropW = vidW / zoomLevel;
        const cropH = vidH / zoomLevel;
        const startX = (vidW - cropW) / 2;
        const startY = (vidH - cropH) / 2;
        ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, vidW, vidH);
      } else {
        ctx.drawImage(video, 0, 0, vidW, vidH);
      }

      ctx.restore();

      // 3. Export original snapshot
      const originalBlob = await canvasToBlob(snapCanvas, "image/jpeg", 0.94);
      const originalDataUrl = URL.createObjectURL(originalBlob);

      // 4. Create tiny thumbnail for filmstrip
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 160;
      thumbCanvas.height = Math.round((160 * vidH) / vidW);
      const thumbCtx = thumbCanvas.getContext("2d");
      thumbCtx?.drawImage(snapCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbBlob = await canvasToBlob(thumbCanvas, "image/jpeg", 0.7);
      const thumbnailUrl = URL.createObjectURL(thumbBlob);

      // 5. Apply default enhancement (Magic Color, Crisp B&W, or Clean Grayscale)
      const baseAdjustments: ScanAdjustments = {
        ...DEFAULT_ADJUSTMENTS,
        filter: viewfinderFilter,
        contrast:
          viewfinderFilter === "bw-threshold"
            ? 45
            : viewfinderFilter === "grayscale"
            ? 15
            : DEFAULT_ADJUSTMENTS.contrast,
      };

      const enhancedCanvas = await processScannedImage(
        snapCanvas,
        vidW,
        vidH,
        baseAdjustments
      );
      const processedBlob = await canvasToBlob(enhancedCanvas, "image/jpeg", 0.94);
      const processedDataUrl = URL.createObjectURL(processedBlob);

      const newPage: ScannedPageItem = {
        id: Math.random().toString(36).substring(7),
        originalBlob,
        originalDataUrl,
        processedBlob,
        processedDataUrl,
        thumbnailUrl,
        width: vidW,
        height: vidH,
        adjustments: { ...baseAdjustments },
        createdAt: Date.now(),
      };

      setScannedPages((prev) => {
        const next = [...prev, newPage];
        setActivePageIndex(next.length - 1);
        return next;
      });

      // If Single Shot mode: immediately open the editor
      if (captureMode === "single") {
        setCurrentView("editor");
      }
    } catch (err) {
      console.error("Frame capture error:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, isMirrorActive, supportsHardwareZoom, zoomLevel, captureMode, viewfinderFilter]);

  // Trigger capture with optional countdown timer
  const handleShutterClick = useCallback(() => {
    if (timerSeconds === 0) {
      executeCapture();
    } else {
      setCountdownRemaining(timerSeconds);
      let count = timerSeconds;

      const countdownInterval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdownRemaining(count);
        } else {
          clearInterval(countdownInterval);
          setCountdownRemaining(null);
          executeCapture();
        }
      }, 1000);
    }
  }, [timerSeconds, executeCapture]);

  // ==========================================================================
  // HANDS-FREE AUTO-SHUTTER STABILITY LISTENER
  // ==========================================================================

  useEffect(() => {
    if (!isOpen || currentView !== "viewfinder" || !isAutoShutterActive) {
      if (stabilityDetectorRef.current) {
        stabilityDetectorRef.current.stop();
      }
      setStabilityProgress(0);
      return;
    }

    if (!stabilityDetectorRef.current) {
      stabilityDetectorRef.current = new MotionStabilityDetector({
        threshold: 6.0,
        requiredDurationMs: 1200,
        onStabilityProgress: (prog) => {
          setStabilityProgress(prog);
        },
        onTriggerShutter: () => {
          executeCapture();
        },
      });
    }

    if (videoRef.current) {
      stabilityDetectorRef.current.start(videoRef.current);
    }

    return () => {
      stabilityDetectorRef.current?.stop();
    };
  }, [isOpen, currentView, isAutoShutterActive, executeCapture]);

  // Keyboard shortcut listener (Space/Enter to snap, Escape to exit)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseModal();
      } else if (
        (e.key === " " || e.key === "Enter") &&
        currentView === "viewfinder" &&
        !isCapturing
      ) {
        e.preventDefault();
        handleShutterClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // ==========================================================================
  // SCAN POST-PROCESSOR & FINE-TUNING ENGINE
  // ==========================================================================

  // Re-process the active page whenever its adjustments change
  const applyAdjustmentsToActivePage = useCallback(
    async (adjustmentsToApply: ScanAdjustments) => {
      const activePage = scannedPages[activePageIndex];
      if (!activePage) return;

      setIsApplyingAdjustment(true);
      try {
        // Load original capture into HTML Image
        const img = new window.Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = activePage.originalDataUrl;
        });

        // Run client-side filter and geometric calculations
        const enhancedCanvas = await processScannedImage(
          img,
          activePage.width,
          activePage.height,
          adjustmentsToApply
        );

        // Update editor preview canvas
        if (editorCanvasRef.current) {
          const previewCanvas = editorCanvasRef.current;
          previewCanvas.width = enhancedCanvas.width;
          previewCanvas.height = enhancedCanvas.height;
          const ctx = previewCanvas.getContext("2d");
          ctx?.drawImage(enhancedCanvas, 0, 0);
        }

        const newProcessedBlob = await canvasToBlob(enhancedCanvas, "image/jpeg", 0.94);
        const newProcessedDataUrl = URL.createObjectURL(newProcessedBlob);

        // Update in scannedPages array
        setScannedPages((prev) => {
          const next = [...prev];
          if (next[activePageIndex]) {
            URL.revokeObjectURL(next[activePageIndex].processedDataUrl);
            next[activePageIndex] = {
              ...next[activePageIndex],
              adjustments: adjustmentsToApply,
              processedBlob: newProcessedBlob,
              processedDataUrl: newProcessedDataUrl,
            };
          }
          return next;
        });
      } catch (err) {
        console.error("Adjustment processing error:", err);
      } finally {
        setIsApplyingAdjustment(false);
      }
    },
    [scannedPages, activePageIndex]
  );

  // Set filter preset
  const handleSelectFilter = (filter: DocumentFilterType) => {
    const updated: ScanAdjustments = {
      ...editorAdjustments,
      filter,
    };
    setEditorAdjustments(updated);
    applyAdjustmentsToActivePage(updated);
  };

  // Set crop preset
  const handleSelectCropPreset = (preset: CropPreset) => {
    setActiveCropPreset(preset);
    const activePage = scannedPages[activePageIndex];
    if (!activePage) return;

    const cropBox = getPresetCropBox(preset, activePage.width, activePage.height);
    const updated: ScanAdjustments = {
      ...editorAdjustments,
      crop: cropBox,
    };
    setEditorAdjustments(updated);
    applyAdjustmentsToActivePage(updated);
  };

  // Rotate 90 degrees
  const handleRotate = (direction: "cw" | "ccw") => {
    const delta = direction === "cw" ? 90 : 270;
    const newRot = ((editorAdjustments.rotation + delta) % 360) as 0 | 90 | 180 | 270;
    const updated: ScanAdjustments = {
      ...editorAdjustments,
      rotation: newRot,
    };
    setEditorAdjustments(updated);
    applyAdjustmentsToActivePage(updated);
  };

  // Slider adjustments (brightness, contrast, sharpness)
  const handleSliderChange = (
    key: "brightness" | "contrast" | "sharpness",
    value: number
  ) => {
    const updated = {
      ...editorAdjustments,
      [key]: value,
    };
    setEditorAdjustments(updated);
    applyAdjustmentsToActivePage(updated);
  };

  // "Apply Filter to All Scanned Pages" in 1 click
  const handleApplyFilterToAllPages = async () => {
    if (scannedPages.length === 0 || isProcessingBatch) return;

    setIsProcessingBatch(true);
    try {
      const templateAdjustments = { ...editorAdjustments };
      const updatedPages: ScannedPageItem[] = [];

      for (let i = 0; i < scannedPages.length; i++) {
        const page = scannedPages[i];
        const img = new window.Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = page.originalDataUrl;
        });

        const enhancedCanvas = await processScannedImage(
          img,
          page.width,
          page.height,
          {
            ...templateAdjustments,
            // Keep each individual page's orientation/rotation if set
            rotation: page.adjustments.rotation,
          }
        );

        const newProcessedBlob = await canvasToBlob(enhancedCanvas, "image/jpeg", 0.94);
        const newProcessedDataUrl = URL.createObjectURL(newProcessedBlob);

        updatedPages.push({
          ...page,
          adjustments: {
            ...templateAdjustments,
            rotation: page.adjustments.rotation,
          },
          processedBlob: newProcessedBlob,
          processedDataUrl: newProcessedDataUrl,
        });
      }

      setScannedPages(updatedPages);
    } catch (err) {
      console.error("Batch filter application failed:", err);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // ==========================================================================
  // FILMSTRIP ACTIONS (REORDER, RETAKE, DELETE)
  // ==========================================================================

  const handleDeletePage = (index: number) => {
    setScannedPages((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target.originalDataUrl);
        URL.revokeObjectURL(target.processedDataUrl);
        URL.revokeObjectURL(target.thumbnailUrl);
      }
      const next = prev.filter((_, i) => i !== index);
      if (activePageIndex >= next.length) {
        setActivePageIndex(Math.max(0, next.length - 1));
      }
      return next;
    });

    if (scannedPages.length <= 1) {
      setCurrentView("viewfinder");
    }
  };

  const handleMovePage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scannedPages.length) return;

    setScannedPages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
    setActivePageIndex(targetIndex);
  };

  const handleRetakePage = () => {
    handleDeletePage(activePageIndex);
    setCurrentView("viewfinder");
  };

  // ==========================================================================
  // COMPLETION EXPORT HANDLERS
  // ==========================================================================

  const convertScansToFiles = (): File[] => {
    return scannedPages.map((page, idx) =>
      createScanFile(page.processedBlob, idx)
    );
  };

  const handleAddScansToQueue = () => {
    if (scannedPages.length === 0) return;
    const files = convertScansToFiles();
    onAddScansToQueue(files);
    handleCloseModal();
  };

  const handleInstantGeneratePdf = async () => {
    if (scannedPages.length === 0 || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const files = convertScansToFiles();
      if (onInstantGeneratePdf) {
        await onInstantGeneratePdf(files);
      } else {
        onAddScansToQueue(files);
      }
      handleCloseModal();
    } catch (err) {
      console.error("Instant PDF generation failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCloseModal = () => {
    stopCurrentStream();
    onClose();
  };

  if (!isOpen) return null;

  const activePage = scannedPages[activePageIndex];

  return (
    <div className="fixed inset-0 h-dvh min-h-dvh z-50 bg-[#090A10]/95 backdrop-blur-2xl flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      {/* SCREEN FLASH OVERLAY */}
      <div
        className={`pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-150 ${
          isScreenFlashing ? "opacity-95" : "opacity-0"
        }`}
      />

      {/* TOP STUDIO TOOLBAR */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0D0F17]/90 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Pro Camera &amp; Document Scanner
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% In-Browser Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Crystal-clear 4K document capture with auto-shutter and real-time xerox filters
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Viewfinder vs. Editor) */}
        <div className="flex items-center gap-2">
          {scannedPages.length > 0 && (
            <div className="flex items-center p-1 rounded-xl bg-black/50 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setCurrentView("viewfinder")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  currentView === "viewfinder"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentView("editor")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  currentView === "editor"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Enhance ({scannedPages.length})</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleCloseModal}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close scanner modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN STUDIO VIEWPORT */}
      <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* ================================================================= */}
        {/* VIEW 1: LIVE VIEWFINDER */}
        {/* ================================================================= */}
        {currentView === "viewfinder" && (
          <div className="relative flex-1 flex flex-col items-center justify-center bg-black overflow-hidden">
            {/* Live Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain transition-transform duration-200 ${
                isMirrorActive ? "-scale-x-100" : ""
              }`}
            />

            {/* Camera Loading Overlay */}
            {isCameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-30 space-y-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs font-medium text-slate-300">
                  Initializing camera hardware with crystal-clear optics...
                </p>
              </div>
            )}

            {/* Camera Error Overlay */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-30 space-y-4">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-sm font-bold text-white">Camera Unavailable</h3>
                  <p className="text-xs text-slate-400">{cameraError}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer">
                    <span>Upload Photos Instead</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          onAddScansToQueue(files);
                          handleCloseModal();
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* VIEWFINDER OVERLAY GUIDES */}
            {!isCameraLoading && !cameraError && (
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-6">
                {/* A4 / Letter Alignment Box */}
                {(alignmentGuide === "a4" || alignmentGuide === "letter") && (
                  <div
                    className={`relative border-2 border-dashed border-cyan-400/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] transition-all ${
                      alignmentGuide === "a4"
                        ? "aspect-[1/1.414] max-h-[85%] max-w-[85%]"
                        : "aspect-[8.5/11] max-h-[85%] max-w-[85%]"
                    }`}
                  >
                    {/* Glowing neon corner brackets (Leica/iOS Pro HUD style) */}
                    <div className="absolute -top-2 -left-2 w-7 h-7 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl shadow-[0_0_16px_rgba(6,182,212,0.95)]" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl shadow-[0_0_16px_rgba(6,182,212,0.95)]" />
                    <div className="absolute -bottom-2 -left-2 w-7 h-7 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl shadow-[0_0_16px_rgba(6,182,212,0.95)]" />
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 border-b-4 border-r-4 border-cyan-400 rounded-br-xl shadow-[0_0_16px_rgba(6,182,212,0.95)]" />

                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                      {alignmentGuide.toUpperCase()} DOCUMENT ALIGNMENT
                    </div>
                  </div>
                )}

                {/* 3x3 Rule-of-Thirds Grid */}
                {alignmentGuide === "grid" && (
                  <div className="absolute inset-8 grid grid-cols-3 grid-rows-3 border border-white/20">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>
                )}

                {/* Center Crosshair for Flat-Lay Precision */}
                {showCrosshair && (
                  <div className="absolute flex items-center justify-center opacity-60">
                    <Crosshair className="w-8 h-8 text-cyan-400 animate-pulse" />
                  </div>
                )}

                {/* Hands-Free Auto-Shutter Stability Gauge */}
                {isAutoShutterActive && (
                  <div className="absolute top-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-cyan-500/40 text-xs text-white shadow-xl">
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 relative flex items-center justify-center">
                      <div
                        className="w-full h-full rounded-full bg-cyan-400 transition-all duration-100"
                        style={{
                          transform: `scale(${stabilityProgress})`,
                          opacity: stabilityProgress > 0 ? 1 : 0,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-cyan-300 font-mono">
                      {stabilityProgress >= 1
                        ? "Snapping!"
                        : stabilityProgress > 0
                        ? `Hold Still (${Math.round(stabilityProgress * 100)}%)`
                        : "Hold document steady..."}
                    </span>
                  </div>
                )}

                {/* Self-Timer Countdown Overlay */}
                {countdownRemaining !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-40">
                    <div className="text-8xl font-black text-cyan-400 drop-shadow-[0_0_40px_rgba(6,182,212,0.8)] animate-ping">
                      {countdownRemaining}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TOP VIEWFINDER HARDWARE CONTROLS BAR */}
            <div className="absolute top-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
              {/* Left group: Camera lens & resolution switchers */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
                {/* Camera device picker */}
                {devices.length > 1 ? (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-transparent text-[11px] font-medium text-slate-200 focus:outline-none cursor-pointer max-w-[140px] truncate"
                  >
                    {devices.map((d, idx) => (
                      <option key={d.deviceId || idx} value={d.deviceId} className="bg-[#12141D] text-white">
                        {d.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2 py-1 text-[11px] font-medium text-slate-300">
                    Facetime / Default Lens
                  </span>
                )}

                {/* Flip camera front/back */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  title="Switch to next camera lens"
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Resolution selector */}
                <select
                  value={resolutionPreset}
                  onChange={(e) => setResolutionPreset(e.target.value as ResolutionPreset)}
                  className="px-2 py-1 rounded-xl bg-transparent text-[10px] font-mono font-bold text-cyan-400 focus:outline-none cursor-pointer border-l border-white/10"
                >
                  <option value="720p" className="bg-[#12141D] text-white">
                    720p HD
                  </option>
                  <option value="1080p" className="bg-[#12141D] text-white">
                    1080p FHD
                  </option>
                  <option value="4k" className="bg-[#12141D] text-white">
                    2K/4K Ultra
                  </option>
                </select>
              </div>

              {/* Right group: Viewfinder Tools (Torch, Mirror, Guides, Timer, Auto-shutter) */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
                {/* Torch / Flash */}
                {supportsTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    title={isTorchOn ? "Turn Torch Off" : "Turn Torch On"}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      isTorchOn ? "bg-amber-400 text-black shadow-lg" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}

                {/* Mirror toggle */}
                <button
                  type="button"
                  onClick={() => setIsMirrorActive((prev) => !prev)}
                  title="Mirror / Flip Horizontally (fix reversed text on webcams)"
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isMirrorActive ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                {/* Alignment Guides toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const modes: AlignmentGuide[] = ["none", "a4", "letter", "grid"];
                    const next = modes[(modes.indexOf(alignmentGuide) + 1) % modes.length];
                    setAlignmentGuide(next);
                  }}
                  title={`Alignment Guide: ${alignmentGuide}`}
                  className={`px-2 py-1 rounded-xl text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    alignmentGuide !== "none"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {alignmentGuide === "none" ? "Guide: Off" : alignmentGuide.toUpperCase()}
                </button>

                {/* Crosshair toggle */}
                <button
                  type="button"
                  onClick={() => setShowCrosshair((prev) => !prev)}
                  title="Toggle Center Crosshair"
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    showCrosshair ? "text-cyan-400" : "text-slate-500 hover:text-white"
                  }`}
                >
                  <Crosshair className="w-4 h-4" />
                </button>

                {/* Self-Timer toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const modes: TimerMode[] = [0, 3, 5];
                    const next = modes[(modes.indexOf(timerSeconds) + 1) % modes.length];
                    setTimerSeconds(next);
                  }}
                  title={`Self-Timer: ${timerSeconds === 0 ? "Off" : `${timerSeconds}s`}`}
                  className={`px-2 py-1 rounded-xl text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    timerSeconds > 0
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {timerSeconds === 0 ? "Timer: Off" : `${timerSeconds}s`}
                </button>

                {/* Hands-free Auto-Shutter toggle */}
                <button
                  type="button"
                  onClick={() => setIsAutoShutterActive((prev) => !prev)}
                  title="Hands-Free Auto-Shutter (snaps automatically when document is held steady)"
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isAutoShutterActive
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/20"
                      : "text-slate-300 hover:text-white bg-white/5"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Snap</span>
                </button>
              </div>
            </div>

            {/* BOTTOM VIEWFINDER SHUTTER & ZOOM DOCK (Leica / iOS Pro Camera HUD) */}
            <div className="absolute bottom-4 inset-x-0 z-20 flex flex-col items-center justify-center space-y-2.5 pointer-events-auto">
              {/* Live Filter Preset Switcher Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
                {[
                  { id: "magic-color", label: "Magic Color", icon: Sparkles },
                  { id: "bw-threshold", label: "Crisp B&W", icon: FileText },
                  { id: "grayscale", label: "Clean Grayscale", icon: Layers },
                ].map((f) => {
                  const Icon = f.icon;
                  const isSelected = viewfinderFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setViewfinderFilter(f.id as DocumentFilterType)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25 border border-cyan-400/40"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Zoom Slider Bar */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-zinc-300 shadow-xl">
                <button
                  type="button"
                  onClick={() => handleZoomChange(1.0)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    zoomLevel === 1.0 ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  1.0x
                </button>
                <input
                  type="range"
                  min={supportsHardwareZoom ? hardwareZoomRange.min : 1.0}
                  max={supportsHardwareZoom ? hardwareZoomRange.max : 4.0}
                  step={0.1}
                  value={zoomLevel}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-24 sm:w-32 accent-cyan-400 cursor-pointer h-1 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleZoomChange(2.0)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    zoomLevel === 2.0 ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  2.0x
                </button>
                <span className="text-[10px] font-mono text-cyan-400 min-w-[28px] text-right font-bold">
                  {zoomLevel.toFixed(1)}x
                </span>
              </div>

              {/* Shutter Button & Capture Mode Switcher */}
              <div className="flex items-center gap-5 sm:gap-7">
                {/* Capture Mode Toggle */}
                <div className="p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center text-xs shadow-lg">
                  <button
                    type="button"
                    onClick={() => setCaptureMode("single")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      captureMode === "single"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptureMode("batch")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      captureMode === "batch"
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Rapid Batch
                  </button>
                </div>

                {/* Tactile Leica / iOS Pro Shutter Snap Button */}
                <button
                  type="button"
                  onClick={handleShutterClick}
                  disabled={isCapturing || Boolean(cameraError)}
                  aria-label="Capture Document"
                  className="relative group p-1.5 rounded-full border-4 border-white/90 hover:border-white transition-all transform active:scale-90 shadow-[0_0_35px_rgba(255,255,255,0.45),inset_0_2px_4px_rgba(0,0,0,0.5)] cursor-pointer disabled:opacity-50"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-white/95 group-hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-inner">
                    <Camera className="w-6 h-6 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                  </div>
                  {/* Subtle pulsing ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60 animate-ping pointer-events-none" />
                </button>

                {/* Captured Pages Counter Badge */}
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-zinc-300 shadow-lg">
                  <span className="text-cyan-400 font-bold tabular-nums">{scannedPages.length}</span>{" "}
                  {scannedPages.length === 1 ? "page" : "pages"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: SCAN POST-PROCESSOR & FINE-TUNING STUDIO */}
        {/* ================================================================= */}
        {currentView === "editor" && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#0D0F17]">
            {/* Left: High-Res Interactive Canvas Preview */}
            <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 bg-black/50 overflow-hidden">
              {activePage ? (
                <div className="relative max-h-full max-w-full flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-[#12141D]">
                  <canvas
                    ref={editorCanvasRef}
                    className="max-h-[65vh] sm:max-h-[75vh] w-auto h-auto object-contain rounded-xl"
                  />

                  {/* Processing spinner indicator */}
                  {isApplyingAdjustment && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-10">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-medium border border-white/10">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span>Applying Filter...</span>
                      </div>
                    </div>
                  )}

                  {/* Page indicator pill */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[11px] font-mono font-bold text-white border border-white/10">
                    Page {activePageIndex + 1} of {scannedPages.length}
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm">No page selected to enhance.</p>
                </div>
              )}
            </div>

            {/* Right: Enhancement Controls & Preset Sidebar */}
            <div className="w-full lg:w-96 p-4 sm:p-6 bg-[#12141D] border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto space-y-6 shrink-0">
              {/* Preset Filters Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Document Filter Presets</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleApplyFilterToAllPages}
                    disabled={isProcessingBatch || scannedPages.length <= 1}
                    className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-40 transition-colors"
                  >
                    Apply to All {scannedPages.length} Pages
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {FILTER_METADATA.map((f) => {
                    const isSelected = editorAdjustments.filter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelectFilter(f.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500 text-white shadow-md shadow-cyan-500/10"
                            : "bg-white/[0.02] border-white/5 hover:border-white/20 text-slate-300 hover:text-white"
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            isSelected
                              ? "bg-cyan-500 text-white"
                              : "bg-white/5 text-slate-400"
                          }`}
                        >
                          {f.id === "original" && <Camera className="w-3.5 h-3.5" />}
                          {f.id === "magic-color" && <Sparkles className="w-3.5 h-3.5" />}
                          {f.id === "bw-threshold" && <FileText className="w-3.5 h-3.5" />}
                          {f.id === "grayscale" && <Layers className="w-3.5 h-3.5" />}
                          {f.id === "shadow-reducer" && <SunMedium className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{f.label}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{f.shortDesc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Crop & Perspective Presets */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Crop &amp; Perspective Presets</span>
                </h3>

                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(
                    [
                      { id: "full", label: "Full Frame" },
                      { id: "a4", label: "A4 Fit" },
                      { id: "letter", label: "US Letter" },
                      { id: "receipt", label: "Receipt" },
                      { id: "id-card", label: "ID Card" },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectCropPreset(preset.id)}
                      className={`px-2 py-1.5 rounded-lg font-medium text-[11px] transition-all cursor-pointer ${
                        activeCropPreset === preset.id
                          ? "bg-indigo-600 text-white font-bold"
                          : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Rotation Controls */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleRotate("ccw")}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rotate 90° CCW</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate("cw")}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate 90° CW</span>
                  </button>
                </div>
              </div>

              {/* Fine-Tuning Sliders */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fine-Tune Contrast &amp; Edge Sharpness</span>
                </h3>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Brightness</span>
                    <span className="font-mono text-white text-[11px]">
                      {editorAdjustments.brightness > 0 ? `+${editorAdjustments.brightness}` : editorAdjustments.brightness}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    value={editorAdjustments.brightness}
                    onChange={(e) => handleSliderChange("brightness", parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Contrast</span>
                    <span className="font-mono text-white text-[11px]">
                      {editorAdjustments.contrast > 0 ? `+${editorAdjustments.contrast}` : editorAdjustments.contrast}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    value={editorAdjustments.contrast}
                    onChange={(e) => handleSliderChange("contrast", parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>

                {/* Sharpness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Edge Sharpness (Unsharp Mask)</span>
                    <span className="font-mono text-white text-[11px]">
                      {editorAdjustments.sharpness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editorAdjustments.sharpness}
                    onChange={(e) => handleSliderChange("sharpness", parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                  />
                </div>
              </div>

              {/* Page Actions */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRetakePage}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake This Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePage(activePageIndex)}
                  className="px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* BOTTOM SCANNED PAGES FILMSTRIP TRAY (UP TO 30+ PAGES) */}
      {/* ================================================================= */}
      {scannedPages.length > 0 && (
        <div className="relative z-20 px-4 sm:px-6 py-2.5 backdrop-blur-2xl bg-black/85 border-t border-white/[0.12] shadow-[0_-12px_40px_rgba(0,0,0,0.85)] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>Scanned Pages Tray ({scannedPages.length})</span>
              <span className="text-[10px] font-mono text-cyan-400">
                Click any thumbnail to preview &amp; enhance
              </span>
            </span>

            <button
              type="button"
              onClick={() => setCurrentView("viewfinder")}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Snap Next Page</span>
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            {scannedPages.map((page, index) => {
              const isActive = index === activePageIndex;
              return (
                <div
                  key={page.id}
                  onClick={() => {
                    setActivePageIndex(index);
                    setCurrentView("editor");
                  }}
                  className={`relative group shrink-0 w-20 sm:w-24 rounded-xl border p-1 transition-all cursor-pointer ${
                    isActive
                      ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      : "border-white/10 hover:border-white/30 bg-[#12141D]"
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-black/60">
                    <NextImage
                      src={page.thumbnailUrl}
                      alt={`Page ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/80 text-[9px] font-bold text-white font-mono">
                      #{index + 1}
                    </div>
                  </div>

                  {/* Reorder Left / Right controls on hover */}
                  <div className="flex items-center justify-between pt-1 text-slate-400 text-[10px]">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(index, "left");
                      }}
                      className="p-0.5 hover:text-white disabled:opacity-20"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-[9px]">P.{index + 1}</span>
                    <button
                      type="button"
                      disabled={index === scannedPages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(index, "right");
                      }}
                      className="p-0.5 hover:text-white disabled:opacity-20"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Quick snap another page card */}
            <button
              type="button"
              onClick={() => setCurrentView("viewfinder")}
              className="shrink-0 w-20 sm:w-24 aspect-[3/4] rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-400/60 bg-white/[0.02] hover:bg-cyan-500/10 flex flex-col items-center justify-center text-slate-400 hover:text-cyan-300 transition-all cursor-pointer group"
            >
              <Plus className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold">Add Page</span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* COMPLETION FOOTER ACTIONS */}
      {/* ================================================================= */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 pb-safe bg-[#0D0F17] border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="font-semibold text-white">
            {scannedPages.length} {scannedPages.length === 1 ? "page" : "pages"} captured
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            Resolution: {resolutionPreset.toUpperCase()}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <FileCheck className="w-3.5 h-3.5" />
            Zero-Loss Client Storage
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Action 1: Add Scans to PDF Builder Queue */}
          <button
            type="button"
            onClick={handleAddScansToQueue}
            disabled={scannedPages.length === 0}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add {scannedPages.length} to PDF Builder</span>
          </button>

          {/* Action 2: Instant 1-Click Generate PDF */}
          <button
            type="button"
            onClick={handleInstantGeneratePdf}
            disabled={scannedPages.length === 0 || isGeneratingPdf}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Building PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Instant 1-Click Generate PDF</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
