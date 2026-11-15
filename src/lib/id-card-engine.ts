import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";

export interface IdCardOptions {
  mode: "2in1-id" | "passport-sheet";
  paperSize: "a4" | "4x6";
  orientation: "portrait" | "landscape";
  filter: "original" | "magic-scan" | "grayscale";
  drawCutGuides: boolean;
  passportPreset: "indian-uk-35x45" | "us-visa-2x2" | "stamp-25x30";
  photoCount: 4 | 6 | 8 | 12 | 16;
}

/**
 * Applies visual filters (Grayscale, Magic Scan) to an image file via offscreen canvas
 */
export async function applyImageFilter(
  imageSource: File | Blob | string,
  filter: "original" | "magic-scan" | "grayscale"
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Canvas context unavailable"));
      }

      ctx.drawImage(img, 0, 0);

      if (filter === "grayscale") {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
      } else if (filter === "magic-scan") {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // High-contrast adaptive stretch
          if (gray > 190) gray = 255;
          else if (gray < 70) gray = 0;
          else gray = Math.min(255, (gray - 70) * (255 / 120));
          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.onerror = (e) => reject(e);

    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Generates a 2-in-1 ID card PDF (Front top, Back bottom on A4)
 */
export async function create2In1IdPdf(
  frontImage: File | Blob | string,
  backImage: File | Blob | string | null,
  options: IdCardOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // A4 Page: 595.28 x 841.89 pt
  const page = pdfDoc.addPage(PageSizes.A4);
  const { width: pW, height: pH } = page.getSize();

  // Process Front Image
  const frontProcessed = await applyImageFilter(frontImage, options.filter);
  const frontBytes = await (await fetch(frontProcessed.dataUrl)).arrayBuffer();
  const frontEmbedded = await pdfDoc.embedJpg(frontBytes);

  // Process Back Image (if provided; if null, duplicate or show placeholder)
  let backEmbedded = frontEmbedded;
  if (backImage) {
    const backProcessed = await applyImageFilter(backImage, options.filter);
    const backBytes = await (await fetch(backProcessed.dataUrl)).arrayBuffer();
    backEmbedded = await pdfDoc.embedJpg(backBytes);
  }

  // Standard ID Card dimension ratio: 85.6mm x 53.98mm = 242.6 pt x 153.0 pt
  // Display scaled up to crisp readable size (approx 340 pt x 215 pt)
  const cardW = 340;
  const cardH = 215;

  const centerX = (pW - cardW) / 2;
  const topHalfCenterY = pH * 0.72 - cardH / 2;
  const bottomHalfCenterY = pH * 0.28 - cardH / 2;

  // Header banner on sheet
  page.drawText("2-IN-1 IDENTIFICATION CARD PRINT SHEET", {
    x: 50,
    y: pH - 45,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.15),
  });
  page.drawText("Standard A4 Layout • Front & Back Verification Copy", {
    x: 50,
    y: pH - 62,
    size: 9,
    font: fontRegular,
    color: rgb(0.45, 0.45, 0.5),
  });

  // Dividing center fold guide line
  page.drawLine({
    start: { x: 40, y: pH / 2 },
    end: { x: pW - 40, y: pH / 2 },
    thickness: 0.8,
    color: rgb(0.75, 0.75, 0.8),
    dashArray: [4, 4],
  });
  page.drawText("--- FOLD OR CUT LINE ---", {
    x: pW / 2 - 50,
    y: pH / 2 - 3,
    size: 7,
    font: fontRegular,
    color: rgb(0.55, 0.55, 0.6),
  });

  // FRONT CARD LABEL & IMAGE
  page.drawText("CARD FRONT", {
    x: centerX,
    y: topHalfCenterY + cardH + 10,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });

  page.drawImage(frontEmbedded, {
    x: centerX,
    y: topHalfCenterY,
    width: cardW,
    height: cardH,
  });

  if (options.drawCutGuides) {
    page.drawRectangle({
      x: centerX - 1,
      y: topHalfCenterY - 1,
      width: cardW + 2,
      height: cardH + 2,
      borderWidth: 0.75,
      borderColor: rgb(0.6, 0.6, 0.65),
      borderDashArray: [3, 3],
    });
  }

  // BACK CARD LABEL & IMAGE
  page.drawText(backImage ? "CARD BACK" : "CARD BACK (DUPLICATE / BLANK)", {
    x: centerX,
    y: bottomHalfCenterY + cardH + 10,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });

  page.drawImage(backEmbedded, {
    x: centerX,
    y: bottomHalfCenterY,
    width: cardW,
    height: cardH,
  });

  if (options.drawCutGuides) {
    page.drawRectangle({
      x: centerX - 1,
      y: bottomHalfCenterY - 1,
      width: cardW + 2,
      height: cardH + 2,
      borderWidth: 0.75,
      borderColor: rgb(0.6, 0.6, 0.65),
      borderDashArray: [3, 3],
    });
  }

  // Footer metadata
  page.drawText("Generated by VeloDoc Studio • Air-Gapped In-Memory Print Engine", {
    x: 50,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.55),
  });

  return await pdfDoc.save();
}

/**
 * Generates a tiled Passport Photo Print Sheet PDF
 */
export async function createPassportSheetPdf(
  photoSource: File | Blob | string,
  options: IdCardOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Determine sheet dimensions
  // A4 = 595.28 x 841.89; 4x6" = 288 x 432 pt
  let sheetW = 595.28;
  let sheetH = 841.89;
  if (options.paperSize === "4x6") {
    sheetW = options.orientation === "landscape" ? 432 : 288;
    sheetH = options.orientation === "landscape" ? 288 : 432;
  }

  const page = pdfDoc.addPage([sheetW, sheetH]);

  // Process Photo
  const processed = await applyImageFilter(photoSource, options.filter);
  const photoBytes = await (await fetch(processed.dataUrl)).arrayBuffer();
  const photoEmbedded = await pdfDoc.embedJpg(photoBytes);

  // Passport dimensions in pt (72 points = 1 inch = 25.4 mm)
  let photoW = 99.2; // 35mm
  let photoH = 127.5; // 45mm
  let presetLabel = "35 x 45 mm (Indian / UK Standard)";

  if (options.passportPreset === "us-visa-2x2") {
    photoW = 144; // 2 inches
    photoH = 144; // 2 inches
    presetLabel = "2 x 2 inch (51x51 mm US / Schengen / Visa)";
  } else if (options.passportPreset === "stamp-25x30") {
    photoW = 70.8; // 25mm
    photoH = 85.0; // 30mm
    presetLabel = "25 x 30 mm (Stamp Size)";
  }

  // Calculate grid layout based on count
  let cols = 2;
  let rows = 2;
  switch (options.photoCount) {
    case 4:
      cols = 2;
      rows = 2;
      break;
    case 6:
      cols = 3;
      rows = 2;
      break;
    case 8:
      cols = 4;
      rows = 2;
      break;
    case 12:
      cols = 4;
      rows = 3;
      break;
    case 16:
      cols = 4;
      rows = 4;
      break;
  }

  const spacing = 16;
  const totalGridW = cols * photoW + (cols - 1) * spacing;
  const totalGridH = rows * photoH + (rows - 1) * spacing;

  const startX = (sheetW - totalGridW) / 2;
  const startY = (sheetH - totalGridH) / 2;

  // Header info
  page.drawText("PASSPORT PHOTO PRINT SHEET", {
    x: startX,
    y: startY + totalGridH + 30,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.15),
  });
  page.drawText(`${presetLabel} • ${options.photoCount} Copies • Cut along dotted guides`, {
    x: startX,
    y: startY + totalGridH + 16,
    size: 8,
    font: fontRegular,
    color: rgb(0.45, 0.45, 0.5),
  });

  // Tile photos
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (photoW + spacing);
      // PDF Y is from bottom to top
      const y = startY + (rows - 1 - r) * (photoH + spacing);

      page.drawImage(photoEmbedded, {
        x,
        y,
        width: photoW,
        height: photoH,
      });

      if (options.drawCutGuides) {
        page.drawRectangle({
          x: x - 1,
          y: y - 1,
          width: photoW + 2,
          height: photoH + 2,
          borderWidth: 0.6,
          borderColor: rgb(0.65, 0.65, 0.7),
          borderDashArray: [2, 2],
        });
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Creates sample Front & Back ID Card image files for 1-click testing
 */
export async function generateSampleIdCardPair(): Promise<{ front: File; back: File }> {
  // Front Card Canvas
  const canvasF = document.createElement("canvas");
  canvasF.width = 680;
  canvasF.height = 430;
  const ctxF = canvasF.getContext("2d")!;

  // Background
  ctxF.fillStyle = "#F8FAFC";
  ctxF.fillRect(0, 0, 680, 430);

  // Top header banner
  ctxF.fillStyle = "#002147";
  ctxF.fillRect(0, 0, 680, 85);
  ctxF.fillStyle = "#C59B27";
  ctxF.fillRect(0, 85, 680, 4);

  ctxF.fillStyle = "#FFFFFF";
  ctxF.font = "bold 20px sans-serif";
  ctxF.fillText("INSTITUTE OF AERONAUTICAL ENGINEERING", 40, 42);
  ctxF.font = "13px sans-serif";
  ctxF.fillStyle = "#E2E8F0";
  ctxF.fillText("Autonomous Institution • Dundigal, Hyderabad - 500043", 40, 66);

  // Photo Avatar placeholder
  ctxF.fillStyle = "#CBD5E1";
  ctxF.fillRect(40, 120, 140, 175);
  ctxF.fillStyle = "#475569";
  ctxF.beginPath();
  ctxF.arc(110, 180, 35, 0, Math.PI * 2);
  ctxF.fill();
  ctxF.beginPath();
  ctxF.ellipse(110, 260, 50, 40, 0, 0, Math.PI, true);
  ctxF.fill();

  // Student Info
  ctxF.fillStyle = "#0F172A";
  ctxF.font = "bold 22px sans-serif";
  ctxF.fillText("K. VIGNESH REDDY", 210, 150);

  ctxF.fillStyle = "#64748B";
  ctxF.font = "bold 13px monospace";
  ctxF.fillText("STUDENT IDENTITY CARD", 210, 175);

  ctxF.fillStyle = "#334155";
  ctxF.font = "15px sans-serif";
  ctxF.fillText("Roll No: 26951A6701", 210, 210);
  ctxF.fillText("Branch: Computer Science & Data Science (CSD)", 210, 235);
  ctxF.fillText("Valid Upto: JUNE 2028", 210, 260);
  ctxF.fillText("Blood Group: O+ve", 210, 285);

  // Bottom barcode simulation
  ctxF.fillStyle = "#0F172A";
  for (let x = 40; x < 640; x += 6) {
    if ((x % 14) !== 0) {
      ctxF.fillRect(x, 340, (x % 5) + 1, 45);
    }
  }

  // Back Card Canvas
  const canvasB = document.createElement("canvas");
  canvasB.width = 680;
  canvasB.height = 430;
  const ctxB = canvasB.getContext("2d")!;

  ctxB.fillStyle = "#FFFFFF";
  ctxB.fillRect(0, 0, 680, 430);

  ctxB.fillStyle = "#002147";
  ctxB.fillRect(0, 0, 680, 20);

  ctxB.fillStyle = "#0F172A";
  ctxB.font = "bold 16px sans-serif";
  ctxB.fillText("TERMS & INSTRUCTIONS", 40, 60);

  ctxB.font = "13px sans-serif";
  ctxB.fillStyle = "#475569";
  const terms = [
    "1. This card is non-transferable and must be presented upon request.",
    "2. Loss of this card must be immediately reported to the Administration Office.",
    "3. The holder is entitled to access academic laboratories, library, and sports facilities.",
    "4. Return this identity card upon completion or discontinuance of the program.",
  ];
  terms.forEach((t, i) => {
    ctxB.fillText(t, 40, 95 + i * 28);
  });

  ctxB.fillStyle = "#0F172A";
  ctxB.font = "bold 14px sans-serif";
  ctxB.fillText("Emergency Contact: +91 98765 43210 / security@iare.ac.in", 40, 240);
  ctxB.fillText("Permanent Address: Hyderabad, Telangana, India - 500043", 40, 270);

  // Principal Signature
  ctxB.strokeStyle = "#1E293B";
  ctxB.lineWidth = 1.5;
  ctxB.beginPath();
  ctxB.moveTo(480, 360);
  ctxB.bezierCurveTo(500, 340, 520, 370, 560, 345);
  ctxB.bezierCurveTo(580, 330, 600, 360, 620, 350);
  ctxB.stroke();

  ctxB.font = "12px sans-serif";
  ctxB.fillStyle = "#64748B";
  ctxB.fillText("Authorized Signatory", 500, 385);

  const blobF = await new Promise<Blob>((res) => canvasF.toBlob((b) => res(b!), "image/jpeg", 0.95));
  const blobB = await new Promise<Blob>((res) => canvasB.toBlob((b) => res(b!), "image/jpeg", 0.95));

  const front = new File([blobF], "sample_college_id_front.jpg", { type: "image/jpeg" });
  const back = new File([blobB], "sample_college_id_back.jpg", { type: "image/jpeg" });

  return { front, back };
}
