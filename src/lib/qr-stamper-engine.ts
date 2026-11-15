import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toSafeArrayBuffer, createSafeFile } from "@/lib/utils";

export interface QrStampOptions {
  text: string; // URL, text, Roll No, etc.
  caption?: string; // Optional caption below QR
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
  size: "small" | "medium" | "large";
  fgColor: string; // Hex color (e.g. #000000)
  bgColor: string; // Hex color (e.g. #FFFFFF)
  pageScope: "first" | "last" | "all";
  margin: number; // In points from edge
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Stamps a generated QR Code onto a PDF document
 */
export async function stampQrCodeOnPdf(
  pdfBuffer: ArrayBuffer,
  options: QrStampOptions
): Promise<Uint8Array> {
  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  const pdfDoc = await PDFDocument.load(safeBuf, { ignoreEncryption: true });

  // Generate QR Code data URL via qrcode package
  const qrDataUrl = await QRCode.toDataURL(options.text || "https://velodoc-studio.vercel.app", {
    errorCorrectionLevel: "H",
    margin: 1,
    color: {
      dark: options.fgColor || "#000000",
      light: options.bgColor || "#FFFFFF",
    },
    width: 400,
  });

  const qrBytes = await (await fetch(qrDataUrl)).arrayBuffer();
  const embeddedQr = await pdfDoc.embedPng(qrBytes);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Dimension mapping in points
  let qrDim = 90; // Medium
  if (options.size === "small") qrDim = 65;
  if (options.size === "large") qrDim = 125;

  const captionHeight = options.caption ? 14 : 0;
  const totalStampHeight = qrDim + captionHeight;
  const margin = options.margin ?? 25;

  const pages = pdfDoc.getPages();
  const targetIndices: number[] = [];

  if (options.pageScope === "first") {
    targetIndices.push(0);
  } else if (options.pageScope === "last") {
    targetIndices.push(pages.length - 1);
  } else {
    for (let i = 0; i < pages.length; i++) targetIndices.push(i);
  }

  for (const pageIdx of targetIndices) {
    const page = pages[pageIdx];
    const { width: pW, height: pH } = page.getSize();

    let x = pW - qrDim - margin;
    let y = margin + captionHeight;

    switch (options.position) {
      case "bottom-left":
        x = margin;
        y = margin + captionHeight;
        break;
      case "top-right":
        x = pW - qrDim - margin;
        y = pH - totalStampHeight - margin + captionHeight;
        break;
      case "top-left":
        x = margin;
        y = pH - totalStampHeight - margin + captionHeight;
        break;
      case "center":
        x = (pW - qrDim) / 2;
        y = (pH - totalStampHeight) / 2 + captionHeight;
        break;
      case "bottom-right":
      default:
        x = pW - qrDim - margin;
        y = margin + captionHeight;
        break;
    }

    // Optional background plate behind QR for maximum contrast & readability
    const bgRgb = parseHexColor(options.bgColor || "#FFFFFF");
    page.drawRectangle({
      x: x - 4,
      y: y - captionHeight - 4,
      width: qrDim + 8,
      height: totalStampHeight + 8,
      color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
      borderWidth: 0.5,
      borderColor: rgb(0.85, 0.85, 0.88),
    });

    // Draw QR image
    page.drawImage(embeddedQr, {
      x,
      y,
      width: qrDim,
      height: qrDim,
    });

    // Draw Caption below QR
    if (options.caption) {
      const fgRgb = parseHexColor(options.fgColor || "#000000");
      const captionText = options.caption;
      const fontSize = Math.max(7, Math.min(9, qrDim / 12));
      const textWidth = fontBold.widthOfTextAtSize(captionText, fontSize);
      const textX = x + (qrDim - textWidth) / 2;

      page.drawText(captionText, {
        x: Math.max(x, textX),
        y: y - 10,
        size: fontSize,
        font: fontBold,
        color: rgb(fgRgb.r, fgRgb.g, fgRgb.b),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Generates a sample project report PDF for 1-click QR stamping testing
 */
export async function generateSampleReportForQr(): Promise<File> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 40,
    y: 720,
    width: 515,
    height: 80,
    color: rgb(0.96, 0.97, 0.99),
    borderWidth: 1,
    borderColor: rgb(0.85, 0.88, 0.94),
  });

  page.drawText("TECHNICAL PROJECT CAPSTONE REPORT", {
    x: 60,
    y: 765,
    size: 16,
    font: fontBold,
    color: rgb(0.08, 0.12, 0.2),
  });

  page.drawText("B.Tech Major Project Submission • Batch 2024-2028", {
    x: 60,
    y: 742,
    size: 10,
    font: fontReg,
    color: rgb(0.35, 0.42, 0.52),
  });

  const content = [
    "Project Title: Autonomous Document Processing Pipeline with In-Memory WebAssembly",
    "Candidate Name: K. Vignesh Reddy (Roll No: 26951A6701)",
    "Department: Computer Science and Engineering (Data Science)",
    "Institution: Institute of Aeronautical Engineering, Hyderabad",
    "",
    "Abstract:",
    "This capstone report investigates the efficacy of client-side document automation engines.",
    "By compiling binary cryptographic verification routines into WebAssembly execution units,",
    "the architecture completely circumvents third-party server exposure, eliminating privacy breaches.",
    "",
    "Scan the accompanying QR code for live deployment demonstration, verified source code repository,",
    "and interactive benchmark telemetry dashboards.",
  ];

  let y = 670;
  content.forEach((line) => {
    const isBold = line.startsWith("Project Title") || line.startsWith("Abstract:") || line.startsWith("Candidate");
    page.drawText(line, {
      x: 50,
      y,
      size: 10.5,
      font: isBold ? fontBold : fontReg,
      color: isBold ? rgb(0.1, 0.15, 0.22) : rgb(0.25, 0.3, 0.38),
    });
    y -= 22;
  });

  const bytes = await doc.save();
  return createSafeFile(bytes, "sample_project_report.pdf", "application/pdf");
}
