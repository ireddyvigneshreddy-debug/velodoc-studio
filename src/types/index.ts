export type ToolCategory = string;

export type ToolDomain = "all" | "pdf" | "image" | "file";

export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  toolType: "pdf" | "image" | "file";
  description: string;
  shortDesc: string; // Plain-English ~6-word explanation
  inputOutputBadge: string; // e.g. "PDF → Exact KB", "Batch 30x"
  icon: string;
  color: string;
  badge?: string;
  path: string;
  acceptedFileTypes: { [key: string]: string[] };
  multipleFiles: boolean;
}

export interface PageThumbnail {
  pageIndex: number;
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  rotation: number;
  selected?: boolean;
}

export type BatchItemStatus =
  | "idle"
  | "queued"
  | "loading"
  | "processing"
  | "ready"
  | "done"
  | "error";

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  thumbnails?: PageThumbnail[];
  status: BatchItemStatus;
  progress?: number;
  progressMsg?: string;
  error?: string;
  customPageRange?: string; // e.g. "1-3, 5" for merge/split
  processedBlob?: Blob;
  processedBytes?: Uint8Array;
  processedSize?: number;
  processedName?: string;
  previewUrl?: string;
  metrics?: ProcessingMetrics;
}

export interface ProcessingMetrics {
  originalSize: number;
  processedSize: number;
  savedBytes: number;
  savedPercentage: number;
  durationMs: number;
  downloadUrl: string;
  downloadFilename: string;
  pageCount?: number;
  targetAccuracy?: string; // e.g. "Exact (99.8% match)"
}

export interface BatchProcessingSummary {
  totalFiles: number;
  completedFiles: number;
  successfulFiles?: number;
  failedFiles?: number;
  totalOriginalSize: number;
  totalProcessedSize: number;
  totalSavedBytes: number;
  overallSavedPercentage?: number;
  totalDurationMs: number;
  durationMs?: number;
  zipBlob?: Blob;
  zipFilename?: string;
  items?: UploadedFileItem[];
}

export interface SessionHistoryItem {
  id: string;
  toolId: string;
  toolName: string;
  filename: string;
  blob: Blob;
  data: Uint8Array;
  mimeType: string;
  originalSize: number;
  processedSize: number;
  pageCount: number;
  timestamp: number;
  thumbnailUrl?: string;
}

export interface WatermarkSettings {
  enabled: boolean;
  type: "text" | "image";
  text: string;
  imageDataUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  fontSize: number;
  opacity: number;
  color: string;
  diagonal: boolean;
  tiledGrid: boolean; // Full-page diagonal tile grid
  rotationAngle: number; // -90 to +90
  position:
    | "center"
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  pageFilter: "all" | "all-except-first" | "custom";
  customPages?: string;
}

export interface PageNumberSettings {
  enabled: boolean;
  format: "page_x_of_y" | "page_x" | "x_slash_y" | "x" | "dash_x_dash" | "bates";
  batesPrefix?: string; // e.g. "DOC-"
  batesDigits?: number; // e.g. 5 -> 00001
  position:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right"
    | "alternating-margins";
  fontSize: number;
  color: string;
  margin: number;
  startPageOffset: number; // e.g. 1 to skip cover page
  startNumber: number; // starting sequence number
}

export interface SignatureAnnotation {
  id: string;
  type: "signature" | "text" | "date" | "checkmark";
  pageNumber: number;
  xPercent: number; // 0 - 100% of page width
  yPercent: number; // 0 - 100% of page height
  widthPercent: number;
  heightPercent: number;
  content: string; // dataUrl for signature, text content for text/date
  color?: string;
  fontSize?: number;
}

export interface RedactionArea {
  id: string;
  pageNumber: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  color: string; // e.g. #000000 or #FFFFFF
}

export interface CropMargins {
  topPercent: number;
  bottomPercent: number;
  leftPercent: number;
  rightPercent: number;
  applyToAll: boolean;
  standardizeSize?: "match" | "a4" | "letter" | "legal";
}

export interface GrayscaleSettings {
  mode: "grayscale" | "clean-scan"; // clean scan is high contrast b&w
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  threshold: number; // 0 to 255 for clean scan
}

export interface PdfMetadataInfo {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
  pdfVersion?: string;
  pageSizeSummary?: string;
}
