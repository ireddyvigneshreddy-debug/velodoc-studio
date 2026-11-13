"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { DropZone } from "@/components/common/DropZone";
import { UploadedFileItem } from "@/types";
import { getPdfJs, getPdfPageCount } from "@/lib/pdf-engine";
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export function PresentationPdfTool() {
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);

  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Presenter Tools
  const [laserActive, setLaserActive] = useState(false);
  const [penActive, setPenActive] = useState(false);
  const [screenCurtain, setScreenCurtain] = useState<"none" | "black" | "white">("none");

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Laser position
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });

  // Canvases
  const slideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const penCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const presentationContainerRef = useRef<HTMLDivElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  // Presentation stopwatch
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Render current slide
  useEffect(() => {
    if (!originalBuffer || !slideCanvasRef.current) return;

    let isMounted = true;
    getPdfJs().then(async (pdfjs) => {
      if (!pdfjs) return;
      try {
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(originalBuffer),
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(currentSlide);
        const viewport = page.getViewport({ scale: 2.0 });

        if (!isMounted || !slideCanvasRef.current) return;
        const canvas = slideCanvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;

        // Also size pen canvas to match
        if (penCanvasRef.current) {
          penCanvasRef.current.width = viewport.width;
          penCanvasRef.current.height = viewport.height;
        }
      } catch (err) {
        console.error("Failed to render slide:", err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [originalBuffer, currentSlide]);

  const handleNextSlide = useCallback(() => {
    setCurrentSlide((curr) => Math.min(totalSlides, curr + 1));
    clearPenCanvas();
  }, [totalSlides]);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlide((curr) => Math.max(1, curr - 1));
    clearPenCanvas();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fileItem) return;

      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "b" || e.key === "B") {
        setScreenCurtain((c) => (c === "black" ? "none" : "black"));
      } else if (e.key === "w" || e.key === "W") {
        setScreenCurtain((c) => (c === "white" ? "none" : "white"));
      } else if (e.key === "l" || e.key === "L") {
        setLaserActive((l) => !l);
      } else if (e.key === "p" || e.key === "P") {
        setPenActive((p) => !p);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fileItem, handleNextSlide, handlePrevSlide]);

  const toggleFullscreen = () => {
    if (!presentationContainerRef.current) return;
    if (!document.fullscreenElement) {
      presentationContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimerRunning(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const clearPenCanvas = () => {
    if (!penCanvasRef.current) return;
    const ctx = penCanvasRef.current.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, penCanvasRef.current.width, penCanvasRef.current.height);
    }
  };

  const handleFileAdded = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    const item: UploadedFileItem = {
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
    };
    setFileItem(item);

    try {
      const buffer = await file.arrayBuffer();
      setOriginalBuffer(buffer);
      const count = await getPdfPageCount(buffer);
      setTotalSlides(count);
      setCurrentSlide(1);
      setTimerSeconds(0);
      setTimerRunning(false);
      item.pageCount = count;
      item.status = "ready";
      setFileItem({ ...item });
    } catch {
      item.status = "error";
      setFileItem({ ...item });
    }
  };

  // Drawing logic for pen canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!penActive || !penCanvasRef.current) return;
    setIsDrawing(true);
    const rect = penCanvasRef.current.getBoundingClientRect();
    const scaleX = penCanvasRef.current.width / rect.width;
    const scaleY = penCanvasRef.current.height / rect.height;

    const ctx = penCanvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#f43f5e"; // Rose pen
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Update laser pointer position
    if (laserActive && presentationContainerRef.current) {
      const rect = presentationContainerRef.current.getBoundingClientRect();
      setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!isDrawing || !penActive || !penCanvasRef.current) return;
    const rect = penCanvasRef.current.getBoundingClientRect();
    const scaleX = penCanvasRef.current.width / rect.width;
    const scaleY = penCanvasRef.current.height / rect.height;

    const ctx = penCanvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="space-y-6">
      {!fileItem && (
        <DropZone
          files={[]}
          onFilesAdded={handleFileAdded}
          onRemoveFile={() => {}}
          acceptedFileTypes={{ "application/pdf": [".pdf"] }}
          multiple={false}
          title="Drop any PDF Slide Deck to Present"
          subtitle="Fullscreen presentation mode with glowing laser pointer, live pen drawing, speaker timer, and keyboard shortcuts"
        />
      )}

      {fileItem && (
        <div className="space-y-4">
          {/* Main Presenter Stage */}
          <div
            ref={presentationContainerRef}
            className={`relative rounded-3xl overflow-hidden border border-white/[0.12] bg-zinc-950 flex flex-col items-center justify-center select-none ${
              isFullscreen ? "w-screen h-screen rounded-none border-none p-0" : "min-h-[520px] p-4"
            }`}
          >
            {/* Curtain Overlays (Black / White screen toggle) */}
            {screenCurtain === "black" && (
              <div
                onClick={() => setScreenCurtain("none")}
                className="absolute inset-0 z-50 bg-black flex items-center justify-center cursor-pointer text-zinc-600 text-xs font-mono"
              >
                Press &lsquo;B&rsquo; or tap anywhere to resume slides
              </div>
            )}
            {screenCurtain === "white" && (
              <div
                onClick={() => setScreenCurtain("none")}
                className="absolute inset-0 z-50 bg-white flex items-center justify-center cursor-pointer text-zinc-400 text-xs font-mono"
              >
                Press &lsquo;W&rsquo; or tap anywhere to resume slides
              </div>
            )}

            {/* Glowing Virtual Laser Pointer */}
            {laserActive && (
              <div
                style={{
                  left: `${laserPos.x}px`,
                  top: `${laserPos.y}px`,
                }}
                className="pointer-events-none absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-red-500 shadow-[0_0_16px_6px_rgba(239,68,68,0.85)] z-40 transition-transform duration-75 ease-out"
              />
            )}

            {/* Slide & Pen Canvas Stack */}
            <div className="relative max-h-[82vh] max-w-full shadow-2xl rounded-2xl overflow-hidden bg-white">
              <canvas ref={slideCanvasRef} className="block max-h-[80vh] w-auto h-auto object-contain" />
              <canvas
                ref={penCanvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`absolute inset-0 z-30 touch-none ${
                  penActive ? "cursor-crosshair" : "pointer-events-none"
                }`}
              />
            </div>

            {/* Bottom Presenter Toolbar */}
            <div className="absolute bottom-4 inset-x-4 z-40 flex items-center justify-between pointer-events-none">
              {/* Left: Stopwatch */}
              <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-white/[0.1] text-xs font-mono text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{formatTimer(timerSeconds)}</span>
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300"
                >
                  {timerRunning ? "Pause" : "Start"}
                </button>
              </div>

              {/* Center: Slide Nav & Tools */}
              <div className="pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/[0.12] shadow-2xl">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  disabled={currentSlide <= 1}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-semibold text-white px-2 font-mono">
                  {currentSlide} / {totalSlides}
                </span>

                <button
                  type="button"
                  onClick={handleNextSlide}
                  disabled={currentSlide >= totalSlides}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-4 bg-white/[0.15] mx-1"></div>

                {/* Laser Toggle */}
                <button
                  type="button"
                  onClick={() => setLaserActive(!laserActive)}
                  className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-colors ${
                    laserActive ? "bg-red-500/20 text-red-400 border border-red-500/40" : "text-zinc-400 hover:text-white"
                  }`}
                  title="Toggle Virtual Laser Pointer (Key: L)"
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                {/* Pen Toggle */}
                <button
                  type="button"
                  onClick={() => setPenActive(!penActive)}
                  className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-colors ${
                    penActive ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40" : "text-zinc-400 hover:text-white"
                  }`}
                  title="Toggle Pen Markup (Key: P)"
                >
                  <PenTool className="w-4 h-4" />
                </button>

                {penActive && (
                  <button
                    type="button"
                    onClick={clearPenCanvas}
                    className="p-1.5 text-zinc-400 hover:text-white text-xs"
                    title="Clear drawings"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                  title="Toggle Fullscreen (Key: F)"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Right: Keyboard Shortcuts Hint */}
              <div className="hidden sm:flex pointer-events-auto items-center gap-2 text-[11px] text-zinc-500">
                <span>F: Fullscreen</span>
                <span>•</span>
                <span>B: Blackout</span>
                <span>•</span>
                <span>L: Laser</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
