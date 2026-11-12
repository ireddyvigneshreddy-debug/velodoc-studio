/**
 * VeloDoc Studio — High-Performance Client-Side Document Scanner Engine
 * 100% in-browser image enhancement, adaptive thresholding, shadow removal,
 * perspective crop calculations, motion stability detection, and Web Audio shutter feedback.
 */

export type DocumentFilterType =
  | "original"
  | "magic-color"
  | "bw-threshold"
  | "grayscale"
  | "shadow-reducer";

export type CropPreset = "full" | "a4" | "letter" | "receipt" | "id-card";

export interface CropBox {
  x: number; // 0 to 1 (normalized left)
  y: number; // 0 to 1 (normalized top)
  width: number; // 0 to 1 (normalized width)
  height: number; // 0 to 1 (normalized height)
}

export interface ScanAdjustments {
  filter: DocumentFilterType;
  brightness: number; // -100 to 100 (0 is default)
  contrast: number; // -100 to 100 (0 is default)
  sharpness: number; // 0 to 100 (0 is default)
  rotation: number; // 0, 90, 180, 270 degrees
  crop: CropBox;
}

export interface ScannedPageItem {
  id: string;
  originalBlob: Blob;
  originalDataUrl: string;
  processedBlob: Blob;
  processedDataUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  adjustments: ScanAdjustments;
  createdAt: number;
}

export const DEFAULT_ADJUSTMENTS: ScanAdjustments = {
  filter: "magic-color",
  brightness: 0,
  contrast: 10,
  sharpness: 25,
  rotation: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 },
};

export const FILTER_METADATA: {
  id: DocumentFilterType;
  label: string;
  shortDesc: string;
  iconName: string;
}[] = [
  {
    id: "original",
    label: "Original Photo",
    shortDesc: "Unmodified camera capture",
    iconName: "Camera",
  },
  {
    id: "magic-color",
    label: "Magic Color Scan",
    shortDesc: "Whitens paper, keeps color ink & stamps vibrant",
    iconName: "Sparkles",
  },
  {
    id: "bw-threshold",
    label: "Crisp B&W (Adaptive)",
    shortDesc: "High-contrast text on white for receipts & forms",
    iconName: "FileText",
  },
  {
    id: "grayscale",
    label: "Clean Grayscale",
    shortDesc: "Smooth office scanner document tone",
    iconName: "Layers",
  },
  {
    id: "shadow-reducer",
    label: "Shadow & Glare Reducer",
    shortDesc: "Normalizes uneven lighting & phone shadows",
    iconName: "SunMedium",
  },
];

// ============================================================================
// 1. WEB AUDIO API CAMERA SHUTTER SOUND SYNTHESIZER (ZERO ASSET DEPENDENCY)
// ============================================================================

/**
 * Synthesizes an authentic mechanical dual-blade camera shutter sound
 * using the Web Audio API. 100% offline, guaranteed zero network requests.
 */
export function playCameraShutterSound(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // 1. Shutter Blade Opening: Bandpass filtered white noise burst (30ms)
    const noiseDuration = 0.035;
    const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(3.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + noiseDuration);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);

    // 2. Mirror Flap & Shutter Closing Click: Low-mid frequency click (40ms later)
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.09);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.setValueAtTime(0.85, now + 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.095);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now + 0.04);
    osc.stop(now + 0.1);

    // Clean up AudioContext after sound finishes
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 250);
  } catch {
    // Gracefully handle browser autoplay or security restrictions
  }
}

// ============================================================================
// 2. HANDS-FREE AUTO-SHUTTER MOTION STABILITY DETECTOR
// ============================================================================

export interface StabilityDetectorOptions {
  threshold?: number; // Mean absolute difference threshold (default 6.5)
  requiredDurationMs?: number; // Time held steady to trigger (default 1200ms)
  onStabilityProgress: (progress: number) => void; // 0 to 1
  onTriggerShutter: () => void;
}

/**
 * Real-time frame stability detector. Analyzes video frames on a tiny 48x48
 * canvas to detect when the user holds a document completely motionless.
 */
export class MotionStabilityDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private prevFrameData: Uint8ClampedArray | null = null;
  private stableStartTimestamp: number | null = null;
  private lastTriggerTimestamp = 0;
  private isRunning = false;
  private animFrameId: number | null = null;
  private readonly threshold: number;
  private readonly requiredDurationMs: number;
  private readonly onProgress: (progress: number) => void;
  private readonly onTrigger: () => void;

  constructor(options: StabilityDetectorOptions) {
    this.threshold = options.threshold ?? 6.5;
    this.requiredDurationMs = options.requiredDurationMs ?? 1200;
    this.onProgress = options.onStabilityProgress;
    this.onTrigger = options.onTriggerShutter;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 48;
    this.canvas.height = 48;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  }

  public start(video: HTMLVideoElement): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.prevFrameData = null;
    this.stableStartTimestamp = null;

    const checkFrame = (timestamp: number) => {
      if (!this.isRunning) return;

      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        this.ctx
      ) {
        // Enforce a 1.5s cooldown after shutter triggers so the user can flip pages
        if (timestamp - this.lastTriggerTimestamp > 1500) {
          this.ctx.drawImage(video, 0, 0, 48, 48);
          const imageData = this.ctx.getImageData(0, 0, 48, 48);
          const currentData = imageData.data;

          if (this.prevFrameData) {
            let totalDiff = 0;
            const pixelCount = 48 * 48;

            for (let i = 0; i < currentData.length; i += 4) {
              const curLum =
                0.299 * currentData[i] +
                0.587 * currentData[i + 1] +
                0.114 * currentData[i + 2];
              const prevLum =
                0.299 * this.prevFrameData[i] +
                0.587 * this.prevFrameData[i + 1] +
                0.114 * this.prevFrameData[i + 2];
              totalDiff += Math.abs(curLum - prevLum);
            }

            const meanDiff = totalDiff / pixelCount;

            if (meanDiff < this.threshold) {
              if (this.stableStartTimestamp === null) {
                this.stableStartTimestamp = timestamp;
              }
              const elapsed = timestamp - this.stableStartTimestamp;
              const progress = Math.min(1, elapsed / this.requiredDurationMs);
              this.onProgress(progress);

              if (progress >= 1) {
                this.lastTriggerTimestamp = timestamp;
                this.stableStartTimestamp = null;
                this.onProgress(1);
                this.onTrigger();
              }
            } else {
              // Motion detected: reset stability timer
              this.stableStartTimestamp = null;
              this.onProgress(0);
            }
          }

          // Cache current frame for next comparison
          this.prevFrameData = new Uint8ClampedArray(currentData);
        } else {
          this.onProgress(0);
        }
      }

      this.animFrameId = requestAnimationFrame(checkFrame);
    };

    this.animFrameId = requestAnimationFrame(checkFrame);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.prevFrameData = null;
    this.stableStartTimestamp = null;
    this.onProgress(0);
  }
}

// ============================================================================
// 3. HARDWARE CAMERA STREAM & ZOOM ENGINE
// ============================================================================

export interface CameraInitializationResult {
  stream: MediaStream;
  actualWidth: number;
  actualHeight: number;
  supportsTorch: boolean;
  supportsZoom: boolean;
  zoomRange?: { min: number; max: number; step: number };
}

/**
 * High-resolution camera stream initializer with cascading graceful fallback.
 * Prevents OverconstrainedError on Mac FaceTime cameras, iPhone Continuity, and USB webcams.
 */
export async function initializeCameraStream(options: {
  deviceId?: string;
  facingMode?: "user" | "environment";
  resolutionPreset?: "720p" | "1080p" | "4k";
}): Promise<CameraInitializationResult> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error("Camera API is not supported in this browser or environment.");
  }

  const { deviceId, facingMode = "environment", resolutionPreset = "1080p" } = options;

  let idealW = 1920;
  let idealH = 1080;

  if (resolutionPreset === "4k") {
    idealW = 2560;
    idealH = 1440;
  } else if (resolutionPreset === "720p") {
    idealW = 1280;
    idealH = 720;
  }

  // Cascading constraint sets from highest desired resolution down to basic video
  const constraintTiers: MediaStreamConstraints[] = [
    {
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } }),
        width: { ideal: idealW },
        height: { ideal: idealH },
      },
      audio: false,
    },
    {
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } }),
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    },
    {
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false,
    },
  ];

  let stream: MediaStream | null = null;
  let lastError: unknown = null;

  for (const constraints of constraintTiers) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) break;
    } catch (err) {
      lastError = err;
      // If error is NotAllowedError (permission denied), don't keep looping
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        throw err;
      }
    }
  }

  if (!stream) {
    throw lastError || new Error("Failed to initialize camera video stream.");
  }

  const videoTrack = stream.getVideoTracks()[0];
  const settings = videoTrack.getSettings();
  const actualWidth = settings.width || idealW;
  const actualHeight = settings.height || idealH;

  // Inspect track capabilities for hardware torch and optical/digital zoom
  let supportsTorch = false;
  let supportsZoom = false;
  let zoomRange: { min: number; max: number; step: number } | undefined;

  try {
    if (typeof videoTrack.getCapabilities === "function") {
      const caps = videoTrack.getCapabilities() as {
        torch?: boolean;
        zoom?: { min: number; max: number; step: number };
      };
      supportsTorch = Boolean(caps.torch);
      if (caps.zoom) {
        supportsZoom = true;
        zoomRange = caps.zoom;
      }
    }
  } catch {
    // Capabilities inspection failed safely
  }

  return {
    stream,
    actualWidth,
    actualHeight,
    supportsTorch,
    supportsZoom,
    zoomRange,
  };
}

/**
 * Apply hardware zoom or torch constraints safely to a video track
 */
export async function applyTrackConstraint(
  track: MediaStreamTrack,
  constraint: { zoom?: number; torch?: boolean }
): Promise<boolean> {
  try {
    if (typeof track.applyConstraints !== "function") return false;
    await track.applyConstraints({
      advanced: [constraint as unknown as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Completely terminates all media stream tracks to shut off hardware green lights immediately.
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Track already stopped
      }
    });
  } catch {
    // Stream already disposed
  }
}

// ============================================================================
// 4. IMAGE ENHANCEMENT & DOCUMENT FILTER ALGORITHMS
// ============================================================================

/**
 * Creates a fast lookup table for Brightness (-100 to 100) and Contrast (-100 to 100).
 */
function buildBrightnessContrastLUT(brightness: number, contrast: number): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  // Contrast factor formula
  const c = Math.max(-100, Math.min(100, contrast));
  const b = Math.max(-100, Math.min(100, brightness)) * 2.55;
  const factor = (259 * (c + 255)) / (255 * (259 - c));

  for (let i = 0; i < 256; i++) {
    const val = factor * (i - 128) + 128 + b;
    lut[i] = val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
  }
  return lut;
}

/**
 * High-performance 3x3 Laplacian Unsharp Mask Sharpening
 */
function applySharpening(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number // 0 to 100
): void {
  if (strength <= 0) return;

  const factor = (strength / 100) * 0.75;
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width * 4;
    const upOffset = (y - 1) * width * 4;
    const downOffset = (y + 1) * width * 4;

    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x * 4;

      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const up = copy[upOffset + x * 4 + c];
        const down = copy[downOffset + x * 4 + c];
        const left = copy[rowOffset + (x - 1) * 4 + c];
        const right = copy[rowOffset + (x + 1) * 4 + c];

        // Laplacian kernel [ 0 -1 0; -1 5 -1; 0 -1 0 ]
        const laplacian = 5 * center - up - down - left - right;
        const sharpened = center + (laplacian - center) * factor;

        data[idx + c] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;
      }
    }
  }
}

/**
 * Magic Color Scan Filter:
 * - Detects paper document background (low saturation, mid-to-high luminance)
 * - Cleanly whitens background paper while preserving subtle text anti-aliasing
 * - Boosts saturation for stamps, color logos, signatures, and highlighter pens
 */
function applyMagicColorScan(data: Uint8ClampedArray): void {
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxDiff = Math.max(Math.abs(r - lum), Math.abs(g - lum), Math.abs(b - lum));

    // Detect if this pixel is paper background (high luminance, low chromatic difference)
    if (lum > 155 && maxDiff < 28) {
      const whitenScale = Math.min(1, (lum - 155) / 80);
      data[i] = Math.round(r + (255 - r) * whitenScale * 0.96);
      data[i + 1] = Math.round(g + (255 - g) * whitenScale * 0.96);
      data[i + 2] = Math.round(b + (255 - b) * whitenScale * 0.96);
    } else if (lum < 130 && maxDiff < 30) {
      // Dark text / line art: boost contrast and darken slightly for razor-sharp legibility
      const darkenFactor = Math.min(0.35, ((130 - lum) / 130) * 0.35);
      data[i] = Math.round(r * (1 - darkenFactor));
      data[i + 1] = Math.round(g * (1 - darkenFactor));
      data[i + 2] = Math.round(b * (1 - darkenFactor));
    } else if (maxDiff >= 20) {
      // Colored stamp / signature / ink: boost saturation by 35% so stamps pop vividly
      data[i] = Math.max(0, Math.min(255, Math.round(lum + (r - lum) * 1.35)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(lum + (g - lum) * 1.35)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(lum + (b - lum) * 1.35)));
    }
  }
}

/**
 * Fast Bradley-Roth Integral Image Adaptive Thresholding
 * Generates pure crisp black text on pure white paper regardless of uneven ambient room lighting.
 */
function applyAdaptiveBwThreshold(
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const pixelCount = width * height;
  const grayscale = new Uint8Array(pixelCount);

  // 1. Convert to grayscale
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    grayscale[p] = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
  }

  // 2. Build 2D Integral Image (using Uint32Array, safe for up to 4K resolutions)
  const integral = new Uint32Array((width + 1) * (height + 1));
  const intW = width + 1;

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const grayRow = y * width;
    const intRow = (y + 1) * intW;
    const prevIntRow = y * intW;

    for (let x = 0; x < width; x++) {
      rowSum += grayscale[grayRow + x];
      integral[intRow + (x + 1)] = integral[prevIntRow + (x + 1)] + rowSum;
    }
  }

  // 3. Local window thresholding with 12% ink offset
  const s = Math.max(12, Math.floor(width / 32));
  const sHalf = Math.floor(s / 2);
  const thresholdFactor = 0.88; // 12% lower than local neighborhood mean

  for (let y = 0; y < height; y++) {
    const y1 = Math.max(0, y - sHalf);
    const y2 = Math.min(height, y + sHalf);
    const intRow1 = y1 * intW;
    const intRow2 = y2 * intW;

    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - sHalf);
      const x2 = Math.min(width, x + sHalf);

      const count = (x2 - x1) * (y2 - y1);
      const sum =
        integral[intRow2 + x2] -
        integral[intRow1 + x2] -
        integral[intRow2 + x1] +
        integral[intRow1 + x1];

      const localMean = sum / count;
      const pixelVal = grayscale[y * width + x];
      const binary = pixelVal < localMean * thresholdFactor ? 0 : 255;

      const idx = (y * width + x) * 4;
      data[idx] = binary;
      data[idx + 1] = binary;
      data[idx + 2] = binary;
    }
  }
}

/**
 * Clean Grayscale Filter with Auto-Levels Contrast Stretch
 */
function applyCleanGrayscale(data: Uint8ClampedArray): void {
  const len = data.length;
  let minLum = 255;
  let maxLum = 0;

  // First pass: find luminance range
  for (let i = 0; i < len; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = Math.max(20, maxLum - minLum);

  // Second pass: apply contrast stretch
  for (let i = 0; i < len; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const stretched = Math.max(0, Math.min(255, Math.round(((lum - minLum) / range) * 255)));
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }
}

/**
 * Shadow & Glare Reducer:
 * Fast block-based background illumination normalization.
 * Estimates ambient lighting gradients across the page and equalizes them.
 */
function applyShadowAndGlareReducer(
  data: Uint8ClampedArray,
  width: number,
  height: number
): void {
  const blockSize = Math.max(24, Math.floor(Math.min(width, height) / 16));
  const blocksX = Math.ceil(width / blockSize);
  const blocksY = Math.ceil(height / blockSize);
  const bgMap = new Float32Array(blocksX * blocksY);

  // Estimate background level in each grid block (approximate paper background)
  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const startX = bx * blockSize;
      const endX = Math.min(width, startX + blockSize);
      const startY = by * blockSize;
      const endY = Math.min(height, startY + blockSize);

      let maxBlockLum = 120;
      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * width + x) * 4;
          const lum =
            0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum > maxBlockLum) maxBlockLum = lum;
        }
      }
      bgMap[by * blocksX + bx] = Math.max(80, maxBlockLum);
    }
  }

  // Normalize each pixel by its local estimated background illumination
  for (let y = 0; y < height; y++) {
    const by = Math.min(blocksY - 1, Math.floor(y / blockSize));
    for (let x = 0; x < width; x++) {
      const bx = Math.min(blocksX - 1, Math.floor(x / blockSize));
      const bg = bgMap[by * blocksX + bx];
      const scale = 230 / bg;

      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.round(data[idx] * scale));
      data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * scale));
      data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * scale));
    }
  }
}

// ============================================================================
// 5. MASTER SCAN PROCESSOR (CROP, ROTATE, FILTER, ENHANCE)
// ============================================================================

/**
 * Processes a source image (ImageBitmap, HTMLImageElement, or HTMLCanvasElement)
 * through rotation, crop bounds, document filter presets, brightness/contrast, and unsharp mask.
 * Returns an HTMLCanvasElement containing the enhanced result.
 */
export async function processScannedImage(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  adjustments: ScanAdjustments
): Promise<HTMLCanvasElement> {
  const { filter, brightness, contrast, sharpness, rotation, crop } = adjustments;

  // 1. Calculate Crop Bounds in Source Coordinates
  const normX = Math.max(0, Math.min(1, crop.x));
  const normY = Math.max(0, Math.min(1, crop.y));
  const normW = Math.max(0.05, Math.min(1 - normX, crop.width));
  const normH = Math.max(0.05, Math.min(1 - normY, crop.height));

  const cropSrcX = Math.round(normX * sourceWidth);
  const cropSrcY = Math.round(normY * sourceHeight);
  const cropSrcW = Math.round(normW * sourceWidth);
  const cropSrcH = Math.round(normH * sourceHeight);

  // 2. Rotation Handling (0, 90, 180, 270)
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const destWidth = isRotated90or270 ? cropSrcH : cropSrcW;
  const destHeight = isRotated90or270 ? cropSrcW : cropSrcH;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, destWidth);
  canvas.height = Math.max(1, destHeight);

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire 2D canvas context for scanner post-processor.");

  ctx.save();

  // Translate and rotate canvas center
  if (rotation === 90) {
    ctx.translate(destWidth, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (rotation === 180) {
    ctx.translate(destWidth, destHeight);
    ctx.rotate((180 * Math.PI) / 180);
  } else if (rotation === 270) {
    ctx.translate(0, destHeight);
    ctx.rotate((270 * Math.PI) / 180);
  }

  // Draw the cropped portion from the source
  ctx.drawImage(
    source,
    cropSrcX,
    cropSrcY,
    cropSrcW,
    cropSrcH,
    0,
    0,
    cropSrcW,
    cropSrcH
  );

  ctx.restore();

  // 3. Pixel-Level Filters and Enhancements
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imgData.data;

  // A. Primary Document Filter Preset
  switch (filter) {
    case "magic-color":
      applyMagicColorScan(pixels);
      break;
    case "bw-threshold":
      applyAdaptiveBwThreshold(pixels, canvas.width, canvas.height);
      break;
    case "grayscale":
      applyCleanGrayscale(pixels);
      break;
    case "shadow-reducer":
      applyShadowAndGlareReducer(pixels, canvas.width, canvas.height);
      break;
    case "original":
    default:
      break;
  }

  // B. Brightness and Contrast LUT
  if (brightness !== 0 || contrast !== 0) {
    const lut = buildBrightnessContrastLUT(brightness, contrast);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = lut[pixels[i]];
      pixels[i + 1] = lut[pixels[i + 1]];
      pixels[i + 2] = lut[pixels[i + 2]];
    }
  }

  // C. Laplacian Sharpening / Unsharp Mask
  if (sharpness > 0) {
    applySharpening(pixels, canvas.width, canvas.height, sharpness);
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Creates a normalized CropBox matching standard document aspect ratios.
 */
export function getPresetCropBox(preset: CropPreset, imgWidth: number, imgHeight: number): CropBox {
  if (preset === "full") {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  let targetRatio = 1; // Width / Height
  if (preset === "a4") {
    targetRatio = 1 / 1.414; // A4 Portrait (~0.707)
  } else if (preset === "letter") {
    targetRatio = 8.5 / 11; // US Letter (~0.772)
  } else if (preset === "receipt") {
    targetRatio = 1 / 2.6; // Long receipt strip (~0.384)
  } else if (preset === "id-card") {
    targetRatio = 85.6 / 53.98; // ISO 7810 ID card (~1.586 landscape)
  }

  const currentRatio = imgWidth / imgHeight;

  let normW = 1;
  let normH = 1;

  if (currentRatio > targetRatio) {
    // Current is wider than target: trim width
    normW = targetRatio / currentRatio;
    normH = 1;
  } else {
    // Current is taller than target: trim height
    normW = 1;
    normH = currentRatio / targetRatio;
  }

  // Bound to 95% of available space for safety
  normW = Math.min(1, normW * 0.95);
  normH = Math.min(1, normH * 0.95);

  const normX = (1 - normW) / 2;
  const normY = (1 - normH) / 2;

  return {
    x: Math.max(0, normX),
    y: Math.max(0, normY),
    width: Math.min(1, normW),
    height: Math.min(1, normH),
  };
}

/**
 * Converts a Canvas into a Blob with quality fallback
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to export canvas to image blob."));
      },
      mimeType,
      quality
    );
  });
}

/**
 * Converts a scanned image blob into an upload-ready File object
 */
export function createScanFile(blob: Blob, pageIndex: number): File {
  const padded = String(pageIndex + 1).padStart(2, "0");
  const filename = `VeloDoc_Scan_Page_${padded}.jpg`;
  return new File([blob], filename, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
