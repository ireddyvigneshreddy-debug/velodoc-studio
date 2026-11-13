import { PDFDocument, PageSizes, rgb } from "pdf-lib";
import { toSafeArrayBuffer } from "@/lib/utils";

export interface NUpOptions {
  pagesPerSheet: 2 | 4 | 6 | 8 | 9 | 16;
  pageSize: "a4" | "letter" | "a3" | "legal";
  orientation: "auto" | "portrait" | "landscape";
  direction: "horizontal" | "vertical"; // horizontal = Z-order, vertical = N-order
  drawBorders: boolean;
  drawCutGuides: boolean;
  margin: number; // outer margin in points
  spacing: number; // gap between tiles
}

export async function createNUpPdf(
  pdfBuffer: ArrayBuffer,
  options: NUpOptions,
  onProgress?: (progress: number, msg: string) => void
): Promise<Uint8Array> {
  const safeBuffer = toSafeArrayBuffer(pdfBuffer);
  onProgress?.(15, "Loading source document...");
  const sourceDoc = await PDFDocument.load(safeBuffer, { ignoreEncryption: true });
  const sourcePages = sourceDoc.getPages();
  const totalPages = sourcePages.length;

  if (totalPages === 0) {
    throw new Error("The PDF document contains no pages.");
  }

  onProgress?.(30, "Setting up sheet dimensions and grid...");
  const targetDoc = await PDFDocument.create();

  // Grid dimensions (cols, rows)
  let cols = 2;
  let rows = 2;
  switch (options.pagesPerSheet) {
    case 2:
      cols = 2;
      rows = 1;
      break;
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
    case 9:
      cols = 3;
      rows = 3;
      break;
    case 16:
      cols = 4;
      rows = 4;
      break;
  }

  // Base paper size
  let baseWidth: number;
  let baseHeight: number;
  switch (options.pageSize) {
    case "letter":
      [baseWidth, baseHeight] = PageSizes.Letter;
      break;
    case "a3":
      [baseWidth, baseHeight] = [841.89, 1190.55];
      break;
    case "legal":
      [baseWidth, baseHeight] = PageSizes.Legal;
      break;
    case "a4":
    default:
      [baseWidth, baseHeight] = PageSizes.A4;
      break;
  }

  // Determine orientation: if cols > rows and auto, default to landscape
  let isLandscape = false;
  if (options.orientation === "landscape") {
    isLandscape = true;
  } else if (options.orientation === "portrait") {
    isLandscape = false;
  } else {
    // Auto: match grid ratio
    isLandscape = cols > rows;
  }

  const sheetWidth = isLandscape ? Math.max(baseWidth, baseHeight) : Math.min(baseWidth, baseHeight);
  const sheetHeight = isLandscape ? Math.min(baseWidth, baseHeight) : Math.max(baseWidth, baseHeight);

  onProgress?.(45, "Embedding vector pages into imposition layout...");
  const embeddedPages = await targetDoc.embedPages(sourcePages);

  const pagesPerSheet = options.pagesPerSheet;
  const numSheets = Math.ceil(totalPages / pagesPerSheet);

  const margin = options.margin;
  const spacing = options.spacing;

  const availWidth = sheetWidth - margin * 2 - spacing * (cols - 1);
  const availHeight = sheetHeight - margin * 2 - spacing * (rows - 1);

  const cellWidth = availWidth / cols;
  const cellHeight = availHeight / rows;

  for (let sheetIdx = 0; sheetIdx < numSheets; sheetIdx++) {
    onProgress?.(
      Math.round(50 + (sheetIdx / numSheets) * 45),
      `Arranging sheet ${sheetIdx + 1} of ${numSheets}...`
    );

    const sheet = targetDoc.addPage([sheetWidth, sheetHeight]);

    // Draw cut guides if requested
    if (options.drawCutGuides) {
      // Vertical cut guides
      for (let c = 1; c < cols; c++) {
        const x = margin + c * cellWidth + (c - 0.5) * spacing;
        sheet.drawLine({
          start: { x, y: margin },
          end: { x, y: sheetHeight - margin },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
          dashArray: [3, 3],
        });
      }
      // Horizontal cut guides
      for (let r = 1; r < rows; r++) {
        const y = margin + r * cellHeight + (r - 0.5) * spacing;
        sheet.drawLine({
          start: { x: margin, y },
          end: { x: sheetWidth - margin, y },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
          dashArray: [3, 3],
        });
      }
    }

    // Place mini-pages in grid
    for (let slot = 0; slot < pagesPerSheet; slot++) {
      const pageIndex = sheetIdx * pagesPerSheet + slot;
      if (pageIndex >= totalPages) break;

      const embedded = embeddedPages[pageIndex];
      const origSize = embedded.size();

      // Determine col and row in grid
      let col = 0;
      let row = 0;
      if (options.direction === "horizontal") {
        col = slot % cols;
        row = Math.floor(slot / cols);
      } else {
        row = slot % rows;
        col = Math.floor(slot / rows);
      }

      // PDF coordinates start at bottom-left
      // Rows count from top (row 0 is at top)
      const actualRowFromBottom = rows - 1 - row;

      const cellX = margin + col * (cellWidth + spacing);
      const cellY = margin + actualRowFromBottom * (cellHeight + spacing);

      // Scale to fit inside cell maintaining aspect ratio
      const scaleFactor = Math.min(
        cellWidth / origSize.width,
        cellHeight / origSize.height
      );

      const placedWidth = origSize.width * scaleFactor;
      const placedHeight = origSize.height * scaleFactor;

      // Center within the cell
      const placedX = cellX + (cellWidth - placedWidth) / 2;
      const placedY = cellY + (cellHeight - placedHeight) / 2;

      sheet.drawPage(embedded, {
        x: placedX,
        y: placedY,
        width: placedWidth,
        height: placedHeight,
      });

      // Draw subtle border around page if enabled
      if (options.drawBorders) {
        sheet.drawRectangle({
          x: placedX,
          y: placedY,
          width: placedWidth,
          height: placedHeight,
          borderWidth: 0.5,
          borderColor: rgb(0.65, 0.65, 0.65),
        });
      }
    }
  }

  onProgress?.(98, "Finalizing N-Up PDF compilation...");
  return await targetDoc.save({ useObjectStreams: true });
}
