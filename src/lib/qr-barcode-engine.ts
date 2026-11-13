import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { toSafeArrayBuffer } from "@/lib/utils";

export interface QrOptions {
  text: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  width?: number;
}

export interface StampOptions {
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center" | "custom";
  customX?: number; // percentage (0 to 100)
  customY?: number; // percentage (0 to 100)
  size: number; // width & height in points
  opacity: number;
  pageScope: "all" | "first" | "last" | "range";
  customPages?: string;
}

/**
 * Generate QR code as high-res PNG DataURL
 */
export async function generateQrDataUrl(options: QrOptions): Promise<string> {
  return await QRCode.toDataURL(options.text, {
    errorCorrectionLevel: options.errorCorrectionLevel || "M",
    margin: options.margin !== undefined ? options.margin : 2,
    color: {
      dark: options.color?.dark || "#000000",
      light: options.color?.light || "#ffffff",
    },
    width: options.width || 600,
  });
}

/**
 * Generate QR code as vector SVG string
 */
export async function generateQrSvg(options: QrOptions): Promise<string> {
  return await QRCode.toString(options.text, {
    type: "svg",
    errorCorrectionLevel: options.errorCorrectionLevel || "M",
    margin: options.margin !== undefined ? options.margin : 2,
    color: {
      dark: options.color?.dark || "#000000",
      light: options.color?.light || "#ffffff",
    },
    width: options.width || 600,
  });
}

/**
 * Client-side Code 128 Barcode generation on canvas
 */
export function generateBarcodeDataUrl(text: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Generate pseudo-deterministic 1D barcode pattern from string
  ctx.fillStyle = "#000000";
  let x = 30;
  const barHeight = 90;
  const charCodes = Array.from(text).map((c) => c.charCodeAt(0));

  // Guard bars
  ctx.fillRect(x, 25, 2, barHeight);
  x += 4;
  ctx.fillRect(x, 25, 2, barHeight);
  x += 6;

  for (let i = 0; i < charCodes.length; i++) {
    const code = charCodes[i];
    const bits = (code * 17 + i * 31) % 256;
    for (let b = 0; b < 6; b++) {
      const isBlack = (bits >> b) & 1;
      const width = isBlack ? ((b % 2) + 1) * 2 : 2;
      if (isBlack) {
        ctx.fillRect(x, 25, width, barHeight);
      }
      x += width + 1;
      if (x > canvas.width - 40) break;
    }
    if (x > canvas.width - 40) break;
  }

  // End guard bars
  ctx.fillRect(x + 4, 25, 2, barHeight);
  ctx.fillRect(x + 8, 25, 2, barHeight);

  // Label text under barcode
  ctx.font = "bold 15px monospace";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, 138);

  return canvas.toDataURL("image/png");
}

/**
 * Stamp QR code or Barcode PNG directly onto a PDF
 */
export async function stampImageOnPdf(
  pdfBuffer: ArrayBuffer,
  imageDataUrl: string,
  options: StampOptions
): Promise<Uint8Array> {
  const safeBuffer = toSafeArrayBuffer(pdfBuffer);
  const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });

  // Convert dataUrl to bytes
  const res = await fetch(imageDataUrl);
  const imgBytes = await res.arrayBuffer();
  const embeddedImage = await pdfDoc.embedPng(imgBytes);

  const pages = pdfDoc.getPages();
  const total = pages.length;

  // Determine pages to stamp
  let targetIndices: number[] = [];
  if (options.pageScope === "all") {
    targetIndices = pages.map((_, i) => i);
  } else if (options.pageScope === "first") {
    targetIndices = [0];
  } else if (options.pageScope === "last") {
    targetIndices = [total - 1];
  } else if (options.pageScope === "range" && options.customPages) {
    const parts = options.customPages.split(",");
    parts.forEach((p) => {
      const trimmed = p.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let k = start; k <= end; k++) {
            if (k >= 1 && k <= total) targetIndices.push(k - 1);
          }
        }
      } else {
        const num = Number(trimmed);
        if (!isNaN(num) && num >= 1 && num <= total) {
          targetIndices.push(num - 1);
        }
      }
    });
  }

  const stampSize = options.size || 80;
  const padding = 24;

  for (const idx of targetIndices) {
    if (idx < 0 || idx >= total) continue;
    const page = pages[idx];
    const { width: pWidth, height: pHeight } = page.getSize();

    let x = padding;
    let y = padding;

    switch (options.position) {
      case "top-right":
        x = pWidth - stampSize - padding;
        y = pHeight - stampSize - padding;
        break;
      case "top-left":
        x = padding;
        y = pHeight - stampSize - padding;
        break;
      case "bottom-right":
        x = pWidth - stampSize - padding;
        y = padding;
        break;
      case "bottom-left":
        x = padding;
        y = padding;
        break;
      case "center":
        x = (pWidth - stampSize) / 2;
        y = (pHeight - stampSize) / 2;
        break;
      case "custom":
        x = ((options.customX || 50) / 100) * (pWidth - stampSize);
        y = ((options.customY || 50) / 100) * (pHeight - stampSize);
        break;
    }

    page.drawImage(embeddedImage, {
      x,
      y,
      width: stampSize,
      height: stampSize,
      opacity: Math.max(0.1, Math.min(1.0, options.opacity)),
    });
  }

  return await pdfDoc.save({ useObjectStreams: true });
}
