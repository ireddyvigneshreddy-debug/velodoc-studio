"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { FileArrangerGrid, ArrangerItem } from "@/components/common/FileArrangerGrid";
import { ProcessingMetrics } from "@/types";
import { convertImagesToPdf, ImagesToPdfOptions } from "@/lib/pdf-engine";
import {
  DocumentFilterType,
  FILTER_METADATA,
  DEFAULT_ADJUSTMENTS,
  ScanAdjustments,
  playCameraShutterSound,
  MotionStabilityDetector,
  initializeCameraStream,
  applyTrackConstraint,
  stopMediaStream,
  processScannedImage,
  canvasToBlob,
} from "@/lib/scanner-engine";
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Sparkles,
  FileText,
  Layers,
  SunMedium,
  FlipHorizontal,
  CircleNotch,
  AlertCircle,
  Crosshair,
  Maximize2,
  FileDown,
  Check,
} from "@/components/common/icons";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";

interface ScannedRecord {
  id: string;
  originalBlob: Blob;
  currentBlob: Blob;
  filter: DocumentFilterType;
}

export function CameraToPdfTool() {
  // Scanned pages store
  const [items, setItems] = useState<ArrangerItem[]>([]);
  const scannedRecordsRef = useRef<Map<string, ScannedRecord>>(new Map());

  // Camera stream and hardware state
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const resolutionPreset = "1080p";
  const [isMirrorActive, setIsMirrorActive] = useState(false);

  // Optical & hardware controls
  const [supportsTorch, setSupportsTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [supportsHardwareZoom, setSupportsHardwareZoom] = useState(false);
  const [hardwareZoomRange, setHardwareZoomRange] = useState({ min: 1, max: 4, step: 0.1 });
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [alignmentGuide, setAlignmentGuide] = useState<"none" | "a4" | "letter" | "grid">("a4");
  const showCrosshair = true;

  // Auto-Shutter & Self-Timer
  const [isAutoShutterActive, setIsAutoShutterActive] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState(0); // 0 to 1
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isScreenFlashing, setIsScreenFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Active default filter for new shots
  const [activeFilter, setActiveFilter] = useState<DocumentFilterType>("magic-color");
  const [isApplyingBatchFilter, setIsApplyingBatchFilter] = useState(false);

  // Page geometry and output options
  const [layoutMode, setLayoutMode] = useState<"fit-image" | "paper-fill" | "paper-fit">("fit-image");
  const [paperFormat, setPaperFormat] = useState<"a4" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState<"none" | "small" | "large">("none");
  const [targetKbEnabled, setTargetKbEnabled] = useState(false);
  const [targetKb, setTargetKb] = useState(200);

  // Conversion execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [originalBytes, setOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const stabilityDetectorRef = useRef<MotionStabilityDetector | null>(null);

  // Detect mobile vs desktop for default facing mode on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768;
      setFacingMode(isMobile ? "environment" : "user");
    }
  }, []);

  // Enumerate camera devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = all.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        const rear = videoInputs.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        setSelectedDeviceId(rear ? rear.deviceId : videoInputs[0].deviceId);
      }
    } catch {
      // ignore
    }
  }, [selectedDeviceId]);

  // Clean stream shutdown
  const stopStream = useCallback(() => {
    if (activeStreamRef.current) {
      stopMediaStream(activeStreamRef.current);
      activeStreamRef.current = null;
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

  // Progressive Camera Stream Initializer
  const startCamera = useCallback(async () => {
    setIsCameraLoading(true);
    setCameraError(null);

    // Stop previous stream with 100ms hardware release buffer
    if (activeStreamRef.current) {
      stopMediaStream(activeStreamRef.current);
      activeStreamRef.current = null;
      await new Promise((r) => setTimeout(r, 100));
    }

    try {
      const res = await initializeCameraStream({
        deviceId: selectedDeviceId || undefined,
        facingMode,
        resolutionPreset,
      });

      activeStreamRef.current = res.stream;
      setSupportsTorch(res.supportsTorch);
      setSupportsHardwareZoom(res.supportsZoom);
      if (res.zoomRange) {
        setHardwareZoomRange(res.zoomRange);
      }

      // Automatically mirror front/user facing cameras, unmirror rear document cameras
      const isUserFacing = facingMode === "user";
      setIsMirrorActive(isUserFacing);

      if (videoRef.current) {
        videoRef.current.srcObject = res.stream;
        try {
          await videoRef.current.play();
        } catch {
          // ignore auto-play promise rejection
        }
      }

      await refreshDevices();
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error("Camera start failed:", err);
      let msg = "Unable to access camera.";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          msg = "Camera access denied. Please allow camera permissions in your browser.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          msg = "No camera found on this device. You can upload photos or documents directly.";
        } else if (err.name === "NotReadableError") {
          msg = "Camera sensor is currently in use by another application or tab.";
        } else if (err.name === "OverconstrainedError") {
          msg = "Requested camera resolution is not supported by your hardware.";
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setCameraError(msg);
      setIsCameraActive(false);
    } finally {
      setIsCameraLoading(false);
    }
  }, [selectedDeviceId, facingMode, resolutionPreset, refreshDevices]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  // Flip front/rear camera
  const handleFlipCamera = async () => {
    if (activeStreamRef.current) {
      stopMediaStream(activeStreamRef.current);
      activeStreamRef.current = null;
      await new Promise((r) => setTimeout(r, 100));
    }

    if (devices.length > 1) {
      const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextDev = devices[nextIndex];
      setSelectedDeviceId(nextDev.deviceId);

      const isFront =
        nextDev.label.toLowerCase().includes("front") ||
        nextDev.label.toLowerCase().includes("user") ||
        nextDev.label.toLowerCase().includes("facetime");
      setFacingMode(isFront ? "user" : "environment");
    } else {
      setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    }
  };

  const handleToggleTorch = async () => {
    if (!supportsTorch || !activeStreamRef.current) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    const nextTorch = !isTorchOn;
    const ok = await applyTrackConstraint(track, { torch: nextTorch });
    if (ok) setIsTorchOn(nextTorch);
  };

  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom);
    if (supportsHardwareZoom && activeStreamRef.current) {
      const track = activeStreamRef.current.getVideoTracks()[0];
      if (track) {
        await applyTrackConstraint(track, { zoom: newZoom });
      }
    }
  };

  // Full-sensor capture execution
  const executeCapture = useCallback(async () => {
    if (!videoRef.current || isCapturing) return;

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    setIsCapturing(true);

    playCameraShutterSound();
    setIsScreenFlashing(true);
    setTimeout(() => setIsScreenFlashing(false), 140);

    try {
      const vidW = video.videoWidth;
      const vidH = video.videoHeight;

      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = vidW;
      snapCanvas.height = vidH;
      const ctx = snapCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Could not acquire capture canvas context.");

      ctx.save();

      // Mirror flip if enabled so saved scan matches what user saw on screen with forward-facing text
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

      const originalBlob = await canvasToBlob(snapCanvas, "image/jpeg", 0.95);

      // Apply default enhancement filter
      const adjustments: ScanAdjustments = {
        ...DEFAULT_ADJUSTMENTS,
        filter: activeFilter,
        contrast:
          activeFilter === "bw-threshold"
            ? 45
            : activeFilter === "grayscale"
            ? 15
            : DEFAULT_ADJUSTMENTS.contrast,
      };

      const enhancedCanvas = await processScannedImage(snapCanvas, vidW, vidH, adjustments);
      const processedBlob = await canvasToBlob(enhancedCanvas, "image/jpeg", 0.95);
      const previewUrl = URL.createObjectURL(processedBlob);

      const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const filename = `Scan_${String(items.length + 1).padStart(2, "0")}.jpg`;
      const file = new File([processedBlob], filename, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      scannedRecordsRef.current.set(id, {
        id,
        originalBlob,
        currentBlob: processedBlob,
        filter: activeFilter,
      });

      const newItem: ArrangerItem = {
        id,
        file,
        name: filename,
        size: processedBlob.size,
        previewUrl,
        width: vidW,
        height: vidH,
        rotation: 0,
        status: "ready",
      };

      setItems((prev) => [...prev, newItem]);
    } catch (err) {
      console.error("Camera capture failed:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, isMirrorActive, supportsHardwareZoom, zoomLevel, activeFilter, items.length]);

  const handleShutterClick = useCallback(() => {
    if (timerSeconds === 0) {
      executeCapture();
    } else {
      setCountdownRemaining(timerSeconds);
      let count = timerSeconds;
      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdownRemaining(count);
        } else {
          clearInterval(interval);
          setCountdownRemaining(null);
          executeCapture();
        }
      }, 1000);
    }
  }, [timerSeconds, executeCapture]);

  // Hands-Free Auto-Shutter stability listener
  useEffect(() => {
    if (!isCameraActive || !isAutoShutterActive) {
      stabilityDetectorRef.current?.stop();
      setStabilityProgress(0);
      return;
    }

    if (!stabilityDetectorRef.current) {
      stabilityDetectorRef.current = new MotionStabilityDetector({
        threshold: 5.5,
        requiredSteadyFrames: 4, // 4 * 250ms = 1.0s
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
  }, [isCameraActive, isAutoShutterActive, executeCapture]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && isCameraActive && !isCapturing) {
        e.preventDefault();
        handleShutterClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCameraActive, isCapturing, handleShutterClick]);

  // Native File Upload Fallback
  const handleSystemCameraUpload = (files: File[]) => {
    files.forEach(async (file, idx) => {
      const previewUrl = URL.createObjectURL(file);
      const id = `${Date.now()}-${idx}-${Math.random().toString(36).substring(7)}`;
      const filename = `Scan_${String(items.length + idx + 1).padStart(2, "0")}.jpg`;

      scannedRecordsRef.current.set(id, {
        id,
        originalBlob: file,
        currentBlob: file,
        filter: "original",
      });

      setItems((prev) => [
        ...prev,
        {
          id,
          file,
          name: filename,
          size: file.size,
          previewUrl,
          rotation: 0,
          status: "ready",
        },
      ]);
    });
  };

  // Re-process all scans with a new document filter preset
  const handleApplyFilterToAll = async (newFilter: DocumentFilterType) => {
    if (items.length === 0 || isApplyingBatchFilter) return;

    setActiveFilter(newFilter);
    setIsApplyingBatchFilter(true);

    try {
      const updatedItems = await Promise.all(
        items.map(async (item) => {
          const record = scannedRecordsRef.current.get(item.id);
          if (!record) return item;

          const origUrl = URL.createObjectURL(record.originalBlob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = origUrl;
          });
          URL.revokeObjectURL(origUrl);

          const adjustments: ScanAdjustments = {
            ...DEFAULT_ADJUSTMENTS,
            filter: newFilter,
            contrast:
              newFilter === "bw-threshold"
                ? 45
                : newFilter === "grayscale"
                ? 15
                : DEFAULT_ADJUSTMENTS.contrast,
          };

          const enhancedCanvas = await processScannedImage(
            img,
            img.naturalWidth,
            img.naturalHeight,
            adjustments
          );
          const processedBlob = await canvasToBlob(enhancedCanvas, "image/jpeg", 0.95);
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          const newPreviewUrl = URL.createObjectURL(processedBlob);

          const newFile = new File([processedBlob], item.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          scannedRecordsRef.current.set(item.id, {
            ...record,
            currentBlob: processedBlob,
            filter: newFilter,
          });

          return {
            ...item,
            file: newFile,
            size: processedBlob.size,
            previewUrl: newPreviewUrl,
          };
        })
      );

      setItems(updatedItems);
    } catch (err) {
      console.error("Batch filter application failed:", err);
    } finally {
      setIsApplyingBatchFilter(false);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    scannedRecordsRef.current.delete(id);
  };

  const handleRotateItem = (id: string, newRotation: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, rotation: newRotation } : i))
    );
  };

  // Compile scans into PDF
  const handleCompilePdf = async () => {
    if (items.length === 0) {
      setErrorMessage("Please scan at least one page.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const imageInputs = [];
      let totalOriginalSize = 0;

      for (const item of items) {
        if (!item.file) continue;
        totalOriginalSize += item.size || item.file.size;
        const buf = await item.file.arrayBuffer();
        imageInputs.push({
          file: item.file,
          buffer: buf,
          type: "image/jpeg",
          rotation: item.rotation || 0,
        });
      }

      const options: ImagesToPdfOptions = {
        pageSize: layoutMode === "fit-image" ? "fit-image" : paperFormat,
        layoutMode: layoutMode,
        orientation: orientation,
        margin: layoutMode === "paper-fit" ? margin : "none",
        targetSizeKb: targetKbEnabled && targetKb > 0 ? targetKb : undefined,
      };

      const pdfBytes = await convertImagesToPdf(imageInputs, options);
      const endTime = performance.now();
      const durationMs = endTime - startTime;

      const blob = createPdfBlob(pdfBytes);
      const downloadUrl = URL.createObjectURL(blob);
      const filename = `Camera_Scan_${new Date().toISOString().slice(0, 10)}.pdf`;

      setOutputBytes(pdfBytes);
      if (imageInputs.length > 0) {
        setOriginalBytes(imageInputs[0].buffer);
      }

      setMetrics({
        originalSize: totalOriginalSize,
        processedSize: pdfBytes.byteLength,
        savedBytes: Math.max(0, totalOriginalSize - pdfBytes.byteLength),
        savedPercentage:
          totalOriginalSize > 0
            ? Math.round((Math.max(0, totalOriginalSize - pdfBytes.byteLength) / totalOriginalSize) * 100)
            : 0,
        durationMs: Math.round(durationMs),
        downloadUrl,
        downloadFilename: filename,
        pageCount: items.length,
        targetAccuracy:
          targetKbEnabled && targetKb > 0
            ? `Exact Target (${targetKb} KB)`
            : layoutMode === "fit-image"
            ? "Zero-Border Full Bleed"
            : layoutMode === "paper-fill"
            ? "Edge-to-Edge Sheet Fill"
            : "Paper Sheet Fit",
      });

      sessionHistory.recordExecution({
        toolId: "camera-to-pdf",
        toolName: "Camera to PDF",
        inputFiles: items.map((i) => i.name),
        outputFileName: filename,
        outputSizeBytes: pdfBytes.byteLength,
        durationMs: Math.round(durationMs),
        outputData: pdfBytes,
      });
    } catch (err: unknown) {
      console.error("PDF generation error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to generate PDF from scans."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {metrics ? (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBytes || undefined}
          title="Scanned Document PDF Ready!"
          onAdjustSettings={() => setMetrics(null)}
        />
      ) : (
        <>
          {/* ================================================================= */}
          {/* STEP 1: INSTANT LIVE CAMERA VIEWFINDER PANEL */}
          {/* ================================================================= */}
          <div className="paper-card rounded-2xl bg-[#0D0F17] border border-paper-300 dark:border-charcoal-border overflow-hidden shadow-sm">
            {/* Viewfinder Header Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-[#12141D] border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C2410C] text-white flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      Live Document Scanner
                    </h2>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                      4K Optics
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 hidden sm:block">
                    Full-sensor WebRTC capture with hands-free auto-shutter and real-time contrast filters
                  </p>
                </div>
              </div>

              {/* Viewfinder Hardware Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Camera device picker */}
                {devices.length > 1 ? (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-black/50 text-[11px] font-mono text-zinc-200 border border-white/10 focus:outline-none cursor-pointer max-w-[130px] truncate"
                  >
                    {devices.map((d, idx) => (
                      <option key={d.deviceId || idx} value={d.deviceId} className="bg-[#12141D] text-white">
                        {d.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2 py-1 rounded bg-black/40 text-[10px] font-mono text-zinc-400 border border-white/5">
                    {facingMode === "environment" ? "Rear Lens" : "Front Camera"}
                  </span>
                )}

                {/* Flip camera */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  title="Switch camera lens"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Mirror toggle */}
                <button
                  type="button"
                  onClick={() => setIsMirrorActive((prev) => !prev)}
                  title="Mirror / Flip Horizontally (fix reversed text on laptop webcams)"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                    isMirrorActive
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-white/5 hover:bg-white/15 text-zinc-300 border-white/10"
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Torch */}
                {supportsTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    title={isTorchOn ? "Torch Off" : "Torch On"}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                      isTorchOn
                        ? "bg-amber-400 text-black border-amber-300"
                        : "bg-white/5 text-zinc-300 border-white/10"
                    }`}
                  >
                    {isTorchOn ? <Zap className="w-3.5 h-3.5 fill-current" /> : <ZapOff className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Guides */}
                <button
                  type="button"
                  onClick={() => {
                    const modes: ("none" | "a4" | "letter" | "grid")[] = ["none", "a4", "letter", "grid"];
                    const next = modes[(modes.indexOf(alignmentGuide) + 1) % modes.length];
                    setAlignmentGuide(next);
                  }}
                  title={`Alignment Guide: ${alignmentGuide}`}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                    alignmentGuide !== "none"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                  }`}
                >
                  {alignmentGuide === "none" ? "Guide: Off" : alignmentGuide.toUpperCase()}
                </button>

                {/* Auto-Snap toggle */}
                <button
                  type="button"
                  onClick={() => setIsAutoShutterActive((prev) => !prev)}
                  title="Hands-Free Auto-Shutter: snaps automatically when document is held steady"
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    isAutoShutterActive
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                      : "bg-white/5 text-zinc-300 hover:text-white border-white/10"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Snap</span>
                </button>

                {/* Self-Timer toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const timers = [0, 3, 5];
                    const next = timers[(timers.indexOf(timerSeconds) + 1) % timers.length];
                    setTimerSeconds(next);
                  }}
                  title={`Self-Timer: ${timerSeconds === 0 ? "Off" : `${timerSeconds}s`}`}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                    timerSeconds > 0
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                  }`}
                >
                  {timerSeconds === 0 ? "Timer: Off" : `${timerSeconds}s`}
                </button>

                {/* Stop / Start toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCameraActive) {
                      stopStream();
                      setIsCameraActive(false);
                    } else {
                      startCamera();
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-bold transition-colors cursor-pointer border border-white/10"
                >
                  {isCameraActive ? "Pause" : "Start"}
                </button>
              </div>
            </div>

            {/* Live Camera Viewfinder Box */}
            <div className="relative aspect-[4/3] sm:aspect-[16/9] max-h-[500px] w-full bg-black flex items-center justify-center overflow-hidden">
              {/* Screen Flash Visual Feedback */}
              <div
                className={`pointer-events-none absolute inset-0 z-40 bg-white transition-opacity duration-150 ${
                  isScreenFlashing ? "opacity-95" : "opacity-0"
                }`}
              />

              {/* Always-Mounted Live Video */}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-30 space-y-3">
                  <CircleNotch className="w-8 h-8 text-[#C2410C] animate-spin" />
                  <p className="text-xs font-mono text-zinc-300">
                    Connecting camera sensor &amp; auto-focus...
                  </p>
                </div>
              )}

              {/* Camera Error / Permission Recovery Overlay */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 text-center z-30 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h3 className="text-sm font-bold text-white">Camera Access Restricted</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">{cameraError}</p>
                    <p className="text-[11px] text-zinc-400 pt-1">
                      Check your browser address bar permissions or use the native phone camera button below.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#A8370A] text-white text-xs font-mono font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors">
                      <Camera className="w-4 h-4" />
                      <span>Take Photo via System Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) handleSystemCameraUpload(files);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-semibold flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Viewfinder Alignment Box */}
              {!isCameraLoading && !cameraError && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-6">
                  {(alignmentGuide === "a4" || alignmentGuide === "letter") && (
                    <div
                      className={`relative border-2 border-dashed border-white/40 rounded-lg transition-all ${
                        alignmentGuide === "a4"
                          ? "aspect-[1/1.414] max-h-[85%] max-w-[85%]"
                          : "aspect-[8.5/11] max-h-[85%] max-w-[85%]"
                      }`}
                    >
                      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                      <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />

                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono font-bold text-white border border-white/20">
                        {alignmentGuide.toUpperCase()} DOCUMENT ALIGNMENT
                      </div>
                    </div>
                  )}

                  {/* Rule of Thirds SVG Grid */}
                  {alignmentGuide === "grid" && (
                    <svg
                      className="absolute inset-6 w-[calc(100%-48px)] h-[calc(100%-48px)] pointer-events-none"
                      viewBox="0 0 300 300"
                      preserveAspectRatio="none"
                    >
                      <line x1="100" y1="0" x2="100" y2="300" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="200" y1="0" x2="200" y2="300" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="200" x2="300" y2="200" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="4 4" />
                    </svg>
                  )}

                  {/* Center Crosshair */}
                  {showCrosshair && (
                    <div className="absolute flex items-center justify-center opacity-60">
                      <Crosshair className="w-8 h-8 text-[#C2410C] animate-pulse" />
                    </div>
                  )}

                  {/* Auto-Shutter Stability Gauge */}
                  {isAutoShutterActive && (
                    <div className="absolute top-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-emerald-500/40 text-xs text-white shadow-xl">
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20 relative flex items-center justify-center">
                        <div
                          className="w-full h-full rounded-full bg-emerald-400 transition-all duration-150"
                          style={{
                            transform: `scale(${stabilityProgress})`,
                            opacity: stabilityProgress > 0 ? 1 : 0,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-medium text-emerald-300">
                        {stabilityProgress >= 1
                          ? "Snapping!"
                          : stabilityProgress > 0
                          ? `Hold Steady (${Math.round(stabilityProgress * 100)}%)`
                          : "Hold document steady..."}
                      </span>
                    </div>
                  )}

                  {/* Self-Timer Countdown Overlay */}
                  {countdownRemaining !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-40">
                      <div className="text-8xl font-black text-[#C2410C] animate-ping">
                        {countdownRemaining}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom In-Viewfinder Dock: Filter, Zoom, and Shutter Snap */}
              <div className="absolute bottom-3 inset-x-0 z-20 flex flex-col items-center justify-center space-y-2 pointer-events-auto">
                {/* Zoom Level Selector */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-zinc-300 shadow-xl">
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
                    className="w-20 sm:w-28 accent-[#C2410C] cursor-pointer h-1 rounded-lg"
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
                  <span className="text-[10px] font-mono text-[#F97316] min-w-[24px] text-right font-bold">
                    {zoomLevel.toFixed(1)}x
                  </span>
                </div>

                {/* Shutter Snap Button with Auto-Shutter Progress Ring */}
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    {isAutoShutterActive && (
                      <svg
                        className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90 pointer-events-none z-10"
                        viewBox="0 0 100 100"
                      >
                        <circle cx="50" cy="50" r="44" className="stroke-white/20 fill-none" strokeWidth="4" />
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          className="stroke-emerald-400 fill-none transition-all duration-150"
                          strokeWidth="4"
                          strokeDasharray={2 * Math.PI * 44}
                          strokeDashoffset={(1 - stabilityProgress) * (2 * Math.PI * 44)}
                          strokeLinecap="round"
                        />
                      </svg>
                    )}

                    <button
                      type="button"
                      onClick={handleShutterClick}
                      disabled={isCapturing || Boolean(cameraError) || !isCameraActive}
                      aria-label="Capture Document Page"
                      className="relative group p-1.5 rounded-full border-4 border-white/90 hover:border-white transition-all transform active:scale-90 shadow-2xl cursor-pointer disabled:opacity-50"
                    >
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#C2410C] hover:bg-[#A8370A] group-hover:scale-105 active:scale-95 transition-transform flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar: System Camera Fallback Button */}
            <div className="p-3 bg-[#12141D] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="text-zinc-200 font-semibold font-mono">
                  {items.length} {items.length === 1 ? "page" : "pages"} captured
                </span>
                <span>•</span>
                <span>Press Space or Enter to snap</span>
              </div>

              <label className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono font-medium flex items-center gap-2 cursor-pointer transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>Upload or Snap via Native Phone Camera</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) handleSystemCameraUpload(files);
                  }}
                />
              </label>
            </div>
          </div>

          {/* ================================================================= */}
          {/* STEP 2: SCANNED PAGES ARRANGER & ENHANCEMENT STRIP */}
          {/* ================================================================= */}
          {items.length > 0 && (
            <div className="space-y-6">
              {/* Document Filters Bar with 1-Click "Apply to All" */}
              <div className="paper-card p-4 sm:p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-mono font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Document Enhancement Filters</span>
                  </label>
                  <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                    Click any preset to enhance all {items.length} scanned pages
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {FILTER_METADATA.map((f) => {
                    const isSelected = activeFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleApplyFilterToAll(f.id)}
                        disabled={isApplyingBatchFilter}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-50/70 dark:bg-amber-950/20 border-[#C2410C] ring-1 ring-[#C2410C]"
                            : "bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300 dark:border-charcoal-border"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {f.id === "original" && <Camera className="w-3.5 h-3.5 text-zinc-500" />}
                          {f.id === "magic-color" && <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />}
                          {f.id === "bw-threshold" && <FileText className="w-3.5 h-3.5 text-emerald-600" />}
                          {f.id === "grayscale" && <Layers className="w-3.5 h-3.5 text-zinc-600" />}
                          {f.id === "shadow-reducer" && <SunMedium className="w-3.5 h-3.5 text-amber-600" />}
                          <span className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                            {f.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-1">
                          {f.shortDesc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Layout & Margin Settings Bar */}
              <div className="paper-card p-4 sm:p-5 rounded-xl bg-white dark:bg-charcoal-800 border border-paper-300 dark:border-charcoal-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-mono font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-[#C2410C]" />
                    <span>Page Geometry &amp; Border Mode</span>
                  </label>
                  <span className="text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded self-start sm:self-auto">
                    Zero-Border Full-Bleed Default
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option 1: Exact Scan Size */}
                  <button
                    type="button"
                    onClick={() => setLayoutMode("fit-image")}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      layoutMode === "fit-image"
                        ? "bg-amber-50/70 dark:bg-amber-950/20 border-[#C2410C] ring-1 ring-[#C2410C]"
                        : "bg-white dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        {layoutMode === "fit-image" && <Check className="w-3.5 h-3.5 text-[#C2410C]" />}
                        Exact Scan Size
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-[#C2410C] text-white px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                      Zero borders. Each page matches the exact oriented dimensions of the scanned page with 0.00 mm margin.
                    </p>
                  </button>

                  {/* Option 2: A4 / Letter Fill */}
                  <button
                    type="button"
                    onClick={() => setLayoutMode("paper-fill")}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      layoutMode === "paper-fill"
                        ? "bg-amber-50/70 dark:bg-amber-950/20 border-[#C2410C] ring-1 ring-[#C2410C]"
                        : "bg-white dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        {layoutMode === "paper-fill" && <Check className="w-3.5 h-3.5 text-[#C2410C]" />}
                        A4/Letter — Fill Sheet
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                        No White Bars
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                      Scales each scan to 100% cover standard sheet edge-to-edge. Completely eliminates white borders.
                    </p>
                  </button>

                  {/* Option 3: A4 / Letter Fit */}
                  <button
                    type="button"
                    onClick={() => setLayoutMode("paper-fit")}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      layoutMode === "paper-fit"
                        ? "bg-amber-50/70 dark:bg-amber-950/20 border-[#C2410C] ring-1 ring-[#C2410C]"
                        : "bg-white dark:bg-charcoal-800 border-paper-300 dark:border-charcoal-border hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        {layoutMode === "paper-fit" && <Check className="w-3.5 h-3.5 text-[#C2410C]" />}
                        A4/Letter — Fit Inside
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                        With Margins
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                      Fits entire scan inside sheet with customizable margins (Small or Large document borders).
                    </p>
                  </button>
                </div>

                {/* Secondary controls shown when standard paper is selected */}
                {layoutMode !== "fit-image" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-paper-300 dark:border-charcoal-border">
                    <div className="space-y-1">
                      <label className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        Paper Standard
                      </label>
                      <select
                        value={paperFormat}
                        onChange={(e) => setPaperFormat(e.target.value as "a4" | "letter")}
                        className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C]"
                      >
                        <option value="a4">A4 (210 × 297 mm)</option>
                        <option value="letter">US Letter (8.5 × 11 in)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        Orientation
                      </label>
                      <select
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")}
                        className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C]"
                      >
                        <option value="portrait">Portrait (Vertical)</option>
                        <option value="landscape">Landscape (Horizontal)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        Document Margin
                      </label>
                      {layoutMode === "paper-fill" ? (
                        <div className="px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-emerald-800 dark:text-emerald-300 text-xs font-mono">
                          0 px (Full Bleed Cover)
                        </div>
                      ) : (
                        <select
                          value={margin}
                          onChange={(e) => setMargin(e.target.value as "none" | "small" | "large")}
                          className="w-full px-3 py-2 rounded-lg bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border text-zinc-950 dark:text-white text-xs font-mono outline-none focus:border-[#C2410C]"
                        >
                          <option value="none">None (0 px)</option>
                          <option value="small">Small (20 pt border)</option>
                          <option value="large">Large (40 pt margin)</option>
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* Target KB Compression Toggle */}
                <div className="pt-3 border-t border-paper-300 dark:border-charcoal-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetKbEnabled}
                        onChange={(e) => setTargetKbEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C2410C]"></div>
                    </label>
                    <div>
                      <span className="text-xs font-bold text-zinc-950 dark:text-white">
                        Target File Size (KB Precision Compression)
                      </span>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Strict size limit for upload portals (TSPSC, UPSC, SSC, Visa). Zero canvas padding added.
                      </p>
                    </div>
                  </div>

                  {targetKbEnabled && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {[100, 200, 500, 1024].map((kb) => (
                        <button
                          key={kb}
                          type="button"
                          onClick={() => setTargetKb(kb)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors cursor-pointer ${
                            targetKb === kb
                              ? "bg-[#C2410C] text-white border-[#C2410C]"
                              : "bg-paper-100 hover:bg-paper-200 dark:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 border-paper-300 dark:border-charcoal-border"
                          }`}
                        >
                          {kb >= 1024 ? `${kb / 1024}MB` : `${kb}KB`}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 bg-paper-100 dark:bg-charcoal-900 border border-paper-300 dark:border-charcoal-border rounded px-2 py-1">
                        <input
                          type="number"
                          min={10}
                          max={50000}
                          value={targetKb}
                          onChange={(e) => setTargetKb(Math.max(10, parseInt(e.target.value) || 100))}
                          className="w-16 bg-transparent text-xs font-mono font-bold text-zinc-950 dark:text-white outline-none"
                        />
                        <span className="text-[11px] font-mono text-zinc-500">KB</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Scanned Pages Arranger Grid */}
              <FileArrangerGrid
                items={items}
                onReorder={setItems}
                onRotate={handleRotateItem}
                onRemove={handleRemoveItem}
                onAddMore={handleSystemCameraUpload}
                acceptedFileTypes={{
                  "image/jpeg": [".jpg", ".jpeg"],
                  "image/png": [".png"],
                  "image/webp": [".webp"],
                }}
                itemTypeLabel="Scan"
                subtitle="Rearrange pages, rotate sideways scans, or snap more pages with the camera above."
              />

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Trigger Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCompilePdf}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-lg bg-[#C2410C] hover:bg-[#A8370A] disabled:opacity-50 text-white font-mono text-xs font-medium shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <CircleNotch className="w-4 h-4 animate-spin" />
                      <span>Compiling {items.length} Scans into Clean PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span>Create PDF from {items.length} {items.length === 1 ? "Scan" : "Scans"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}