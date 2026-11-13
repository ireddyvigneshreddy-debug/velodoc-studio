import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { hexToPdfRgb } from "@/lib/pdf-engine";
import { toSafeArrayBuffer } from "@/lib/utils";

export type FormFieldType = "text" | "check" | "cross" | "date" | "signature";

export interface PlacedFormField {
  id: string;
  type: FormFieldType;
  pageIndex: number;
  xPercent: number; // 0 - 100 percentage from left
  yPercent: number; // 0 - 100 percentage from top
  value: string; // text string, date, or signature dataUrl
  fontSize?: number; // points
  color?: string; // hex
  width?: number; // for signature
  height?: number; // for signature
}

/**
 * Bakes placed text, checkmarks, dates and signatures directly into PDF pages
 */
export async function bakeFormFieldsIntoPdf(
  pdfBuffer: ArrayBuffer,
  fields: PlacedFormField[]
): Promise<Uint8Array> {
  const safeBuffer = toSafeArrayBuffer(pdfBuffer);
  const pdfDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();

  for (const field of fields) {
    if (field.pageIndex < 0 || field.pageIndex >= pages.length) continue;
    const page = pages[field.pageIndex];
    const { width, height } = page.getSize();

    // Convert percentage to PDF points (Note: PDF origin is bottom-left, UI is top-left)
    const x = (field.xPercent / 100) * width;
    const yFromTop = (field.yPercent / 100) * height;
    const y = height - yFromTop;

    const colorRgb = field.color ? hexToPdfRgb(field.color) : rgb(0.05, 0.05, 0.08);

    if (field.type === "text" || field.type === "date") {
      const size = field.fontSize || 12;
      page.drawText(field.value || "", {
        x,
        y: y - size, // offset for baseline
        size,
        font: fontHelvetica,
        color: colorRgb,
      });
    } else if (field.type === "check") {
      // Checkmark icon rendered as clean bold text
      page.drawText("✓", {
        x,
        y: y - 14,
        size: field.fontSize || 16,
        font: fontHelveticaBold,
        color: field.color ? hexToPdfRgb(field.color) : rgb(0.1, 0.6, 0.2),
      });
    } else if (field.type === "cross") {
      page.drawText("✕", {
        x,
        y: y - 14,
        size: field.fontSize || 16,
        font: fontHelveticaBold,
        color: field.color ? hexToPdfRgb(field.color) : rgb(0.8, 0.1, 0.1),
      });
    } else if (field.type === "signature" && field.value) {
      try {
        const res = await fetch(field.value);
        const imgBuffer = await res.arrayBuffer();
        const embeddedImg = await pdfDoc.embedPng(imgBuffer);
        const w = field.width || 120;
        const h = field.height || 50;

        page.drawImage(embeddedImg, {
          x,
          y: y - h,
          width: w,
          height: h,
        });
      } catch (err) {
        console.error("Failed to embed signature into form:", err);
      }
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}
