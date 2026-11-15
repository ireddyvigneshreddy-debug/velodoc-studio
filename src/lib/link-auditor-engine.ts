import { PDFDocument, PDFName, PDFDict, PDFArray, rgb, StandardFonts, PageSizes } from "pdf-lib";
import { toSafeArrayBuffer, createSafeFile } from "@/lib/utils";

export interface ExtractedLink {
  id: string;
  url: string;
  domain: string;
  pageNumber: number;
  rect?: number[];
  type: "web" | "email" | "other";
}

export function extractDomainFromUrl(url: string): string {
  try {
    if (url.startsWith("mailto:")) {
      return url.replace("mailto:", "").split("@")[1] || "email";
    }
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "external";
  }
}

/**
 * Scans a PDF and extracts all embedded URI / mailto link annotations
 */
export async function auditPdfLinks(
  pdfBuffer: ArrayBuffer
): Promise<{ totalLinks: number; links: ExtractedLink[] }> {
  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  const pdfDoc = await PDFDocument.load(safeBuf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const links: ExtractedLink[] = [];

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    const annots = page.node.Annots();
    if (!annots) continue;

    for (let i = 0; i < annots.size(); i++) {
      try {
        const annotRef = annots.get(i);
        const annot = pdfDoc.context.lookup(annotRef);

        if (annot instanceof PDFDict && annot.get(PDFName.of("Subtype"))?.toString() === "/Link") {
          const action = annot.get(PDFName.of("A"));
          const actionDict = pdfDoc.context.lookup(action);

          if (actionDict instanceof PDFDict && actionDict.get(PDFName.of("S"))?.toString() === "/URI") {
            const uriObj = actionDict.get(PDFName.of("URI"));
            let uriStr = "";

            if (uriObj && typeof (uriObj as any).decodeText === "function") {
              uriStr = (uriObj as any).decodeText();
            } else if (uriObj && typeof (uriObj as any).asString === "function") {
              uriStr = (uriObj as any).asString();
            } else if (uriObj) {
              uriStr = String((uriObj as any).value || uriObj);
            }

            if (uriStr) {
              const rectArr = annot.get(PDFName.of("Rect"));
              let rectCoords: number[] | undefined;
              if (rectArr instanceof PDFArray) {
                rectCoords = rectArr.asArray().map((item: any) => Number(item?.value || 0));
              }

              const isEmail = uriStr.toLowerCase().startsWith("mailto:");
              links.push({
                id: `${pageIdx}-${i}-${Math.random().toString(36).substring(6)}`,
                url: uriStr,
                domain: extractDomainFromUrl(uriStr),
                pageNumber: pageIdx + 1,
                rect: rectCoords,
                type: isEmail ? "email" : "web",
              });
            }
          }
        }
      } catch (err) {
        console.warn("Could not parse annotation:", err);
      }
    }
  }

  return { totalLinks: links.length, links };
}

/**
 * Strips all external URI link annotations from the PDF, preserving visual text
 */
export async function stripAllLinksFromPdf(
  pdfBuffer: ArrayBuffer
): Promise<{ strippedCount: number; pdfBytes: Uint8Array }> {
  const safeBuf = toSafeArrayBuffer(pdfBuffer);
  const pdfDoc = await PDFDocument.load(safeBuf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  let strippedCount = 0;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    const annots = page.node.Annots();
    if (!annots) continue;

    const remainingAnnots = pdfDoc.context.obj([]);

    for (let i = 0; i < annots.size(); i++) {
      const annotRef = annots.get(i);
      const annot = pdfDoc.context.lookup(annotRef);

      let isUriLink = false;
      if (annot instanceof PDFDict && annot.get(PDFName.of("Subtype"))?.toString() === "/Link") {
        const action = annot.get(PDFName.of("A"));
        const actionDict = pdfDoc.context.lookup(action);
        if (actionDict instanceof PDFDict && actionDict.get(PDFName.of("S"))?.toString() === "/URI") {
          isUriLink = true;
          strippedCount++;
        }
      }

      if (!isUriLink) {
        remainingAnnots.push(annotRef);
      }
    }

    if (remainingAnnots.size() > 0) {
      page.node.set(PDFName.of("Annots"), remainingAnnots);
    } else {
      page.node.delete(PDFName.of("Annots"));
    }
  }

  const pdfBytes = await pdfDoc.save();
  return { strippedCount, pdfBytes };
}

/**
 * Exports extracted links to CSV format
 */
export function exportLinksToCsv(links: ExtractedLink[]): string {
  const headers = ["Page", "Domain", "Type", "Full URL"];
  const rows = links.map((l) => [
    l.pageNumber,
    `"${l.domain.replace(/"/g, '""')}"`,
    l.type,
    `"${l.url.replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generates a sample PDF with multiple hyperlinks for instant 1-click testing
 */
export async function generateSampleLinkedPdf(): Promise<File> {
  const doc = await PDFDocument.create();
  const page1 = doc.addPage(PageSizes.A4);
  const page2 = doc.addPage(PageSizes.A4);

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  // Helper to add URI annotation
  const addWebLink = (page: any, text: string, url: string, x: number, y: number) => {
    const textWidth = fontBold.widthOfTextAtSize(text, 11);
    page.drawText(text, {
      x,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.12, 0.35, 0.85),
    });

    // Underline
    page.drawLine({
      start: { x, y: y - 2 },
      end: { x: x + textWidth, y: y - 2 },
      thickness: 1,
      color: rgb(0.12, 0.35, 0.85),
    });

    const linkAnnot = doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y - 4, x + textWidth, y + 14],
      Border: [0, 0, 0],
      A: {
        Type: "Action",
        S: "URI",
        URI: url,
      },
    });
    const linkRef = doc.context.register(linkAnnot);
    page.node.addAnnot(linkRef);
  };

  // Page 1
  page1.drawText("RESEARCH REFERENCES & REPOSITORY LINKS", {
    x: 50,
    y: 780,
    size: 15,
    font: fontBold,
    color: rgb(0.1, 0.12, 0.2),
  });

  page1.drawText("This document contains verified external hyperlinks for testing the Link Auditor:", {
    x: 50,
    y: 750,
    size: 10.5,
    font: fontReg,
    color: rgb(0.3, 0.35, 0.45),
  });

  addWebLink(page1, "1. VeloDoc Studio Live Platform", "https://velodoc-studio.vercel.app", 50, 700);
  addWebLink(page1, "2. Official IARE Institutional Portal", "https://www.iare.ac.in", 50, 660);
  addWebLink(page1, "3. GitHub Open Source Repository", "https://github.com/ireddyvigneshreddy-debug/velodoc-studio", 50, 620);
  addWebLink(page1, "4. Research Contact Email", "mailto:research@velodoc.org", 50, 580);
  addWebLink(page1, "5. Tesseract.js WebAssembly Docs", "https://github.com/naptha/tesseract.js", 50, 540);

  // Page 2
  page2.drawText("SUPPLEMENTARY CITATIONS (PAGE 2)", {
    x: 50,
    y: 780,
    size: 15,
    font: fontBold,
    color: rgb(0.1, 0.12, 0.2),
  });

  addWebLink(page2, "6. IEEE Xplore Digital Library", "https://ieeexplore.ieee.org", 50, 720);
  addWebLink(page2, "7. arXiv Preprint Server", "https://arxiv.org", 50, 680);

  const bytes = await doc.save();
  return createSafeFile(bytes, "sample_hyperlinked_document.pdf", "application/pdf");
}
