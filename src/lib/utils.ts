import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatTimeMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Extracts a completely isolated and properly aligned ArrayBuffer from any Uint8Array or ArrayBuffer.
 * Completely immune to byteOffset/buffer sharing corruptions.
 */
export function toSafeArrayBuffer(bytes: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) {
    return bytes.slice(0);
  }
  if (bytes instanceof Uint8Array) {
    // If it's a sub-array view, slice exact byte boundary
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
  return new ArrayBuffer(0);
}

/**
 * Creates a standard Blob from Uint8Array or ArrayBuffer without offset memory corruption.
 */
export function createSafeBlob(
  bytes: Uint8Array | ArrayBuffer,
  mimeType: string = "application/pdf"
): Blob {
  return new Blob([toSafeArrayBuffer(bytes)], { type: mimeType });
}

export function createPdfBlob(bytes: Uint8Array | ArrayBuffer): Blob {
  return createSafeBlob(bytes, "application/pdf");
}

export function createSafeFile(
  bytes: Uint8Array | ArrayBuffer,
  filename: string,
  mimeType: string
): File {
  return new File([toSafeArrayBuffer(bytes)], filename, { type: mimeType });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
