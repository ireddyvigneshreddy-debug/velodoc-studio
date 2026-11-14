import pptxgen from "pptxgenjs";
import { TechTalkPresentation } from "@/types/ppt";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { hexToPdfRgb } from "@/lib/pdf-engine";
import { getIareLogoPngBase64 } from "@/lib/iare-logo";

/**
 * Standardized Export Filename:
 * e.g. [Name]_[SubjectInitials]_AAT-1.pptx / .pdf
 */
export function getPresentationExportFilename(
  presentation: TechTalkPresentation,
  ext: "pptx" | "pdf" | "md"
): string {
  const isIare = Boolean(
    presentation.iareMetadata?.isIareMode || presentation.themeId === "iare"
  );
  if (isIare) {
    const rawName =
      presentation.iareMetadata?.studentName ||
      presentation.presenterName ||
      "Student";
    const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, "");

    const rawSubject =
      presentation.iareMetadata?.subject ||
      presentation.iareMetadata?.courseName ||
      "AAT";
    const subjectWords = rawSubject.trim().split(/\s+/).filter(Boolean);
    let subjectInitials = "";
    if (subjectWords.length === 1 && subjectWords[0].length <= 5) {
      subjectInitials = subjectWords[0].toUpperCase();
    } else {
      subjectInitials = subjectWords
        .map((w) => w[0]?.toUpperCase())
        .join("")
        .substring(0, 5);
    }
    if (!subjectInitials) subjectInitials = "AAT";

    let assessSlug = "AAT-1";
    const rawAssess =
      presentation.iareMetadata?.assessmentType || "AAT - TECH TALK";
    if (rawAssess === "AAT - II") assessSlug = "AAT-2";
    else if (rawAssess === "CONCEPT VIDEO") assessSlug = "ConceptVideo";
    else if (rawAssess === "SEMINAR") assessSlug = "Seminar";
    else assessSlug = "AAT-1";

    return `${cleanName || "Student"}_${subjectInitials}_${assessSlug}.${ext}`;
  }

  const safeName = presentation.topic
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 32);
  return `${safeName}-TechTalk.${ext}`;
}

/**
 * 1. Export 16:9 PowerPoint (.pptx) with embedded Speaker Notes & Themed Layouts
 * Using exact official IARE 13.333" x 7.5" geometry, Times New Roman / Calibri, and Logo
 */
export async function exportToPptx(
  presentation: TechTalkPresentation
): Promise<void> {
  const pptx = new pptxgen();
  // Exact 16:9 widescreen layout (13.333" x 7.5")
  pptx.defineLayout({ name: "IARE_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "IARE_16x9";

  pptx.title = presentation.topic;
  pptx.subject = "IARE AAT Tech-Talk Presentation";
  pptx.author =
    presentation.iareMetadata?.studentName ||
    presentation.presenterName ||
    "Student";
  pptx.company = "Institute of Aeronautical Engineering (Autonomous)";

  const iare = presentation.iareMetadata;

  // Retrieve crisp Base64 PNG logo (custom uploaded logo or built-in 512x512 emblem)
  const iareLogoBase64 = iare?.customLogoBase64 || getIareLogoPngBase64();

  const studentName =
    iare?.studentName || presentation.presenterName || "Student";
  const rollNumber = iare?.rollNumber || "";
  const branchName = iare?.department || "";
  const subjectName = iare?.subject || iare?.courseName || "";
  const assessmentTitle = (
    iare?.assessmentType || "AAT - TECH TALK"
  ).toUpperCase();

  for (const s of presentation.slides) {
    const slide = pptx.addSlide();

    // 1. Crisp White Background
    slide.background = { color: "FFFFFF" };

    // 2. Embedded Speaker Notes
    if (s.speakerNotes) {
      slide.addNotes(s.speakerNotes);
    }

    // 3. Layout Rendering
    if (s.layout === "title") {
      // ======================================================================
      // SLIDE 1: EXACT TITLE COVER SLIDE
      // ======================================================================
      // Left-aligned IARE Logo (1.05" x 1.05")
      try {
        slide.addImage({
          data: iareLogoBase64,
          x: 0.75,
          y: 0.5,
          w: 1.05,
          h: 1.05,
        });
      } catch {
        // Fallback
      }

      // Top Institutional Header text alongside logo
      slide.addText("INSTITUTE OF AERONAUTICAL ENGINEERING", {
        x: 2.0,
        y: 0.45,
        w: 10.5,
        h: 0.38,
        fontSize: 20,
        fontFace: "Times New Roman",
        bold: true,
        color: "8B0000",
      });

      slide.addText("(Autonomous)", {
        x: 2.0,
        y: 0.83,
        w: 10.5,
        h: 0.28,
        fontSize: 13,
        fontFace: "Times New Roman",
        bold: true,
        color: "002147",
      });

      slide.addText("Dundigal, Hyderabad - 500 043, Telangana", {
        x: 2.0,
        y: 1.11,
        w: 10.5,
        h: 0.24,
        fontSize: 11,
        fontFace: "Calibri",
        color: "374151",
      });

      // Horizontal Double Divider Rule across slide (Maroon + Gold)
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.75,
        y: 1.68,
        w: 11.833,
        h: 0.04,
        fill: { color: "8B0000" },
        line: { color: "8B0000", width: 0 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.75,
        y: 1.74,
        w: 11.833,
        h: 0.02,
        fill: { color: "C59B27" },
        line: { color: "C59B27", width: 0 },
      });

      // Assessment Title: [ASSESSMENT TYPE]
      slide.addText(`[ ${assessmentTitle} ]`, {
        x: 0.75,
        y: 2.05,
        w: 11.833,
        h: 0.42,
        fontSize: 18,
        fontFace: "Times New Roman",
        bold: true,
        color: "002147",
        align: "center",
      });

      // Topic Line: Topic - [User's Entered Topic]
      const topicHeading = s.title.startsWith("Topic -")
        ? s.title
        : `Topic - ${s.title}`;
      slide.addText(topicHeading, {
        x: 0.75,
        y: 2.65,
        w: 11.833,
        h: 1.15,
        fontSize: 22,
        fontFace: "Times New Roman",
        bold: true,
        color: "111827",
        align: "center",
        valign: "top",
      });

      // Student Details Block at bottom half of Slide 1
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.75,
        y: 4.15,
        w: 11.833,
        h: 2.65,
        fill: { color: "F8FAFC" },
        line: { color: "CBD5E1", width: 1 },
        rectRadius: 0.08,
      });

      // Left Column: Name & Roll No
      const leftColProps: pptxgen.TextProps[] = [
        {
          text: "Name: ",
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            bold: true,
            color: "002147",
          },
        },
        {
          text: `${studentName}\n\n`,
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            bold: false,
            color: "111827",
          },
        },
        {
          text: "Roll No: ",
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            bold: true,
            color: "002147",
          },
        },
        {
          text: rollNumber,
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            bold: false,
            color: "111827",
          },
        },
      ];

      slide.addText(leftColProps, {
        x: 1.5,
        y: 4.65,
        w: 4.8,
        h: 1.7,
        valign: "top",
      });

      // Right Column: Branch & Subject
      const rightColProps: pptxgen.TextProps[] = [
        {
          text: "Branch: ",
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            bold: true,
            color: "002147",
          },
        },
        {
          text: `${branchName}\n\n`,
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            bold: false,
            color: "111827",
          },
        },
        {
          text: "Subject: ",
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            bold: true,
            color: "002147",
          },
        },
        {
          text: subjectName,
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            bold: false,
            color: "111827",
          },
        },
      ];

      slide.addText(rightColProps, {
        x: 6.8,
        y: 4.65,
        w: 5.2,
        h: 1.7,
        valign: "top",
      });
    } else {
      // ======================================================================
      // SLIDES 2 TO N: MASTER HEADER + FOOTER STRIP
      // ======================================================================
      // Top Header Strip: Small IARE Logo (0.42" x 0.42")
      try {
        slide.addImage({
          data: iareLogoBase64,
          x: 0.75,
          y: 0.25,
          w: 0.42,
          h: 0.42,
        });
      } catch {
        // Fallback
      }

      slide.addText("INSTITUTE OF AERONAUTICAL ENGINEERING", {
        x: 1.25,
        y: 0.26,
        w: 6.5,
        h: 0.35,
        fontSize: 10,
        fontFace: "Times New Roman",
        bold: true,
        color: "8B0000",
      });

      slide.addText(`[ ${assessmentTitle} ]`, {
        x: 8.0,
        y: 0.26,
        w: 4.583,
        h: 0.35,
        fontSize: 10,
        fontFace: "Times New Roman",
        bold: true,
        color: "002147",
        align: "right",
      });

      // Top rule
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.75,
        y: 0.72,
        w: 11.833,
        h: 0.015,
        fill: { color: "CBD5E1" },
        line: { color: "CBD5E1", width: 0 },
      });

      // Bottom Footer Strip
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.75,
        y: 6.85,
        w: 11.833,
        h: 0.015,
        fill: { color: "CBD5E1" },
        line: { color: "CBD5E1", width: 0 },
      });

      slide.addText(`${rollNumber} - ${studentName}`, {
        x: 0.75,
        y: 6.95,
        w: 4.5,
        h: 0.35,
        fontSize: 9.5,
        fontFace: "Calibri",
        color: "4B5563",
      });

      slide.addText(subjectName, {
        x: 5.3,
        y: 6.95,
        w: 3.8,
        h: 0.35,
        fontSize: 9.5,
        fontFace: "Calibri",
        color: "4B5563",
        align: "center",
      });

      slide.addText(`Slide ${s.slideNumber} of ${presentation.slides.length}`, {
        x: 9.3,
        y: 6.95,
        w: 3.283,
        h: 0.35,
        fontSize: 9.5,
        fontFace: "Calibri",
        color: "4B5563",
        align: "right",
      });

      if (s.layout === "thank-you") {
        // ====================================================================
        // SLIDE N: THANK YOU SLIDE
        // ====================================================================
        slide.addText("THANK YOU", {
          x: 0.75,
          y: 1.85,
          w: 11.833,
          h: 0.95,
          fontSize: 40,
          fontFace: "Times New Roman",
          bold: true,
          color: "002147",
          align: "center",
        });

        // Double Divider Line (Maroon + Gold)
        slide.addShape(pptx.ShapeType.rect, {
          x: 4.666,
          y: 2.88,
          w: 4.0,
          h: 0.035,
          fill: { color: "8B0000" },
          line: { color: "8B0000", width: 0 },
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 4.666,
          y: 2.93,
          w: 4.0,
          h: 0.02,
          fill: { color: "C59B27" },
          line: { color: "C59B27", width: 0 },
        });

        slide.addText("Questions & Discussion", {
          x: 0.75,
          y: 3.15,
          w: 11.833,
          h: 0.45,
          fontSize: 18,
          fontFace: "Times New Roman",
          color: "4B5563",
          align: "center",
        });

        // Student Details Card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 2.166,
          y: 4.05,
          w: 9.0,
          h: 2.3,
          fill: { color: "F8FAFC" },
          line: { color: "CBD5E1", width: 1 },
          rectRadius: 0.08,
        });

        const thankYouDetails: pptxgen.TextProps[] = [
          {
            text: `Presented by: ${studentName} (${rollNumber})\n\n`,
            options: {
              fontSize: 16,
              fontFace: "Calibri",
              bold: true,
              color: "002147",
            },
          },
          {
            text: `Department of ${branchName} • Subject: ${subjectName}\n\n`,
            options: {
              fontSize: 14,
              fontFace: "Calibri",
              bold: false,
              color: "111827",
            },
          },
          {
            text: "INSTITUTE OF AERONAUTICAL ENGINEERING (Autonomous)\n",
            options: {
              fontSize: 13,
              fontFace: "Times New Roman",
              bold: true,
              color: "8B0000",
            },
          },
          {
            text: "Dundigal, Hyderabad - 500 043, Telangana",
            options: {
              fontSize: 11,
              fontFace: "Calibri",
              color: "4B5563",
            },
          },
        ];

        slide.addText(thankYouDetails, {
          x: 2.3,
          y: 4.3,
          w: 8.733,
          h: 1.85,
          align: "center",
          valign: "middle",
        });
      } else {
        // ====================================================================
        // SLIDES 2 TO N-1: CONTENT SLIDE WITH SIDE-HEADING & MAROON UNDERLINE
        // ====================================================================
        const sideHeading = (s.title || "CONTENT SLIDE").toUpperCase();

        // Left-Aligned Side-Heading (23pt Bold Times New Roman, Navy #002147)
        slide.addText(sideHeading, {
          x: 0.75,
          y: 0.88,
          w: 11.833,
          h: 0.55,
          fontSize: 23,
          fontFace: "Times New Roman",
          bold: true,
          color: "002147",
          valign: "top",
        });

        // Crisp Maroon (#8B0000) accent rule directly underneath the heading
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.75,
          y: 1.48,
          w: 1.8,
          h: 0.04,
          fill: { color: "8B0000" },
          line: { color: "8B0000", width: 0 },
        });

        if (s.layout === "index") {
          // SLIDE 2: INDEX (Numbered list 1 to 8 matching core titles in Title Case)
          const items = s.bulletPoints || [];
          const half = Math.ceil(items.length / 2);
          const col1 = items.slice(0, half);
          const col2 = items.slice(half);

          const col1Props: pptxgen.TextProps[] = col1.map((item) => ({
            text: `${item}\n`,
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              color: "111827",
              bold: true,
              lineSpacingMultiple: 1.5,
              paraSpaceAfter: 12,
            },
          }));

          slide.addText(col1Props, {
            x: 0.85,
            y: 1.9,
            w: 5.6,
            h: 4.6,
            valign: "top",
          });

          if (col2.length > 0) {
            const col2Props: pptxgen.TextProps[] = col2.map((item) => ({
              text: `${item}\n`,
              options: {
                fontSize: 18,
                fontFace: "Calibri",
                color: "111827",
                bold: true,
                lineSpacingMultiple: 1.5,
                paraSpaceAfter: 12,
              },
            }));

            slide.addText(col2Props, {
              x: 6.85,
              y: 1.9,
              w: 5.6,
              h: 4.6,
              valign: "top",
            });
          }
        } else if (s.layout === "paragraph") {
          // SLIDE 3 (INTRODUCTION) & SLIDE N-1 (CONCLUSION): ONE PROSE PARAGRAPH (NO BULLETS)
          const paragraphText =
            s.paragraph ||
            s.bulletPoints?.join(" ") ||
            "Academic synthesis conforming strictly to Institute of Aeronautical Engineering OBE continuous evaluation standards.";

          slide.addText(paragraphText, {
            x: 0.85,
            y: 1.95,
            w: 11.6,
            h: 4.5,
            fontSize: 17,
            fontFace: "Calibri",
            color: "111827",
            lineSpacingMultiple: 1.45,
            valign: "top",
          });
        } else {
          // SLIDES 4 TO N-2: 8 CORE TECHNICAL SLIDES (EXACTLY 5 SUBSTANTIVE BULLETS)
          const bullets = (s.bulletPoints || []).slice(0, 5);
          const bulletProps: pptxgen.TextProps[] = bullets.map((b) => ({
            text: b,
            options: {
              bullet: true,
              fontSize: 16,
              fontFace: "Calibri",
              color: "111827",
              lineSpacingMultiple: 1.35,
              paraSpaceAfter: 10,
            },
          }));

          slide.addText(bulletProps, {
            x: 0.85,
            y: 1.85,
            w: 11.6,
            h: 4.7,
            valign: "top",
          });
        }
      }
    }
  }

  const fileName = getPresentationExportFilename(presentation, "pptx");
  await pptx.writeFile({ fileName });
}

/**
 * 2. Export 16:9 PDF Slide Deck via pdf-lib
 * Exact 16:9 widescreen layout matching PowerPoint template (960 x 540)
 */
export async function exportToPdfDeck(
  presentation: TechTalkPresentation
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontTimesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesRomanBold = await pdfDoc.embedFont(
    StandardFonts.TimesRomanBold
  );
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const iare = presentation.iareMetadata;

  // Retrieve logo for embedding in PDF
  const iareLogoDataUrl = iare?.customLogoBase64 || getIareLogoPngBase64();
  let logoImage = null;
  try {
    const rawB64 = iareLogoDataUrl.replace(/^data:image\/png;base64,/, "");
    const logoBytes = Uint8Array.from(atob(rawB64), (c) => c.charCodeAt(0));
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch {
    // Fallback if logo fails to decode
  }

  const studentName =
    iare?.studentName || presentation.presenterName || "Student";
  const rollNumber = iare?.rollNumber || "";
  const branchName = iare?.department || "";
  const subjectName = iare?.subject || iare?.courseName || "";
  const assessmentTitle = (
    iare?.assessmentType || "AAT - TECH TALK"
  ).toUpperCase();

  const whiteRgb = hexToPdfRgb("#FFFFFF");
  const maroonRgb = hexToPdfRgb("#8B0000");
  const navyRgb = hexToPdfRgb("#002147");
  const goldRgb = hexToPdfRgb("#C59B27");
  const charcoalRgb = hexToPdfRgb("#111827");
  const grayRgb = hexToPdfRgb("#4B5563");
  const borderRgb = hexToPdfRgb("#CBD5E1");
  const cardRgb = hexToPdfRgb("#F8FAFC");

  const pageWidth = 960;
  const pageHeight = 540;

  for (const s of presentation.slides) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // 1. Crisp White Background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: whiteRgb,
    });

    if (s.layout === "title") {
      // ======================================================================
      // SLIDE 1: EXACT TITLE COVER SLIDE
      // ======================================================================
      if (logoImage) {
        page.drawImage(logoImage, {
          x: 54,
          y: pageHeight - 110,
          width: 75,
          height: 75,
        });
      }

      page.drawText("INSTITUTE OF AERONAUTICAL ENGINEERING", {
        x: 145,
        y: pageHeight - 55,
        size: 20,
        font: fontTimesRomanBold,
        color: maroonRgb,
      });

      page.drawText("(Autonomous)", {
        x: 145,
        y: pageHeight - 80,
        size: 13,
        font: fontTimesRomanBold,
        color: navyRgb,
      });

      page.drawText("Dundigal, Hyderabad - 500 043, Telangana", {
        x: 145,
        y: pageHeight - 100,
        size: 11,
        font: fontHelvetica,
        color: grayRgb,
      });

      // Double Divider Rule
      page.drawRectangle({
        x: 54,
        y: pageHeight - 122,
        width: pageWidth - 108,
        height: 3,
        color: maroonRgb,
      });
      page.drawRectangle({
        x: 54,
        y: pageHeight - 127,
        width: pageWidth - 108,
        height: 2,
        color: goldRgb,
      });

      // Assessment Title
      const assessText = `[ ${assessmentTitle} ]`;
      const assessWidth = fontTimesRomanBold.widthOfTextAtSize(assessText, 18);
      page.drawText(assessText, {
        x: (pageWidth - assessWidth) / 2,
        y: pageHeight - 165,
        size: 18,
        font: fontTimesRomanBold,
        color: navyRgb,
      });

      // Topic Line
      const topicText = s.title.startsWith("Topic -")
        ? s.title
        : `Topic - ${s.title}`;
      const topicWidth = fontTimesRomanBold.widthOfTextAtSize(
        topicText.substring(0, 50),
        22
      );
      page.drawText(topicText.substring(0, 50), {
        x: Math.max(54, (pageWidth - topicWidth) / 2),
        y: pageHeight - 215,
        size: 22,
        font: fontTimesRomanBold,
        color: charcoalRgb,
      });

      // Student Details Block
      const cardY = 50;
      const cardH = 200;
      page.drawRectangle({
        x: 54,
        y: cardY,
        width: pageWidth - 108,
        height: cardH,
        color: cardRgb,
        borderColor: borderRgb,
        borderWidth: 1,
      });

      // Left Column
      page.drawText("Name: ", {
        x: 95,
        y: cardY + cardH - 55,
        size: 16,
        font: fontHelveticaBold,
        color: navyRgb,
      });
      page.drawText(studentName, {
        x: 155,
        y: cardY + cardH - 55,
        size: 16,
        font: fontHelvetica,
        color: charcoalRgb,
      });

      page.drawText("Roll No: ", {
        x: 95,
        y: cardY + cardH - 120,
        size: 16,
        font: fontHelveticaBold,
        color: navyRgb,
      });
      page.drawText(rollNumber, {
        x: 170,
        y: cardY + cardH - 120,
        size: 16,
        font: fontHelvetica,
        color: charcoalRgb,
      });

      // Right Column
      page.drawText("Branch: ", {
        x: 510,
        y: cardY + cardH - 55,
        size: 16,
        font: fontHelveticaBold,
        color: navyRgb,
      });
      page.drawText(branchName.substring(0, 32), {
        x: 580,
        y: cardY + cardH - 55,
        size: 16,
        font: fontHelvetica,
        color: charcoalRgb,
      });

      page.drawText("Subject: ", {
        x: 510,
        y: cardY + cardH - 120,
        size: 16,
        font: fontHelveticaBold,
        color: navyRgb,
      });
      page.drawText(subjectName.substring(0, 32), {
        x: 585,
        y: cardY + cardH - 120,
        size: 16,
        font: fontHelvetica,
        color: charcoalRgb,
      });
    } else {
      // ======================================================================
      // SLIDES 2 TO N: MASTER HEADER & FOOTER STRIP
      // ======================================================================
      if (logoImage) {
        page.drawImage(logoImage, {
          x: 54,
          y: pageHeight - 38,
          width: 25,
          height: 25,
        });
      }

      page.drawText("INSTITUTE OF AERONAUTICAL ENGINEERING", {
        x: 88,
        y: pageHeight - 30,
        size: 10,
        font: fontTimesRomanBold,
        color: maroonRgb,
      });

      page.drawText(`[ ${assessmentTitle} ]`, {
        x: pageWidth - 220,
        y: pageHeight - 30,
        size: 10,
        font: fontTimesRomanBold,
        color: navyRgb,
      });

      // Top rule
      page.drawRectangle({
        x: 54,
        y: pageHeight - 48,
        width: pageWidth - 108,
        height: 1,
        color: borderRgb,
      });

      // Bottom Footer Strip
      page.drawRectangle({
        x: 54,
        y: 42,
        width: pageWidth - 108,
        height: 1,
        color: borderRgb,
      });

      page.drawText(`${rollNumber} - ${studentName}`, {
        x: 54,
        y: 24,
        size: 9.5,
        font: fontHelvetica,
        color: grayRgb,
      });

      const subW = fontHelvetica.widthOfTextAtSize(
        subjectName.substring(0, 35),
        9.5
      );
      page.drawText(subjectName.substring(0, 35), {
        x: (pageWidth - subW) / 2,
        y: 24,
        size: 9.5,
        font: fontHelvetica,
        color: grayRgb,
      });

      const slideNumText = `Slide ${s.slideNumber} of ${presentation.slides.length}`;
      page.drawText(slideNumText, {
        x: pageWidth - 145,
        y: 24,
        size: 9.5,
        font: fontHelvetica,
        color: grayRgb,
      });

      if (s.layout === "thank-you") {
        // ====================================================================
        // SLIDE N: THANK YOU SLIDE
        // ====================================================================
        const thankText = "THANK YOU";
        const thankW = fontTimesRomanBold.widthOfTextAtSize(thankText, 40);
        page.drawText(thankText, {
          x: (pageWidth - thankW) / 2,
          y: pageHeight - 160,
          size: 40,
          font: fontTimesRomanBold,
          color: navyRgb,
        });

        // Double Divider Line (Maroon + Gold)
        page.drawRectangle({
          x: (pageWidth - 280) / 2,
          y: pageHeight - 180,
          width: 280,
          height: 3,
          color: maroonRgb,
        });
        page.drawRectangle({
          x: (pageWidth - 280) / 2,
          y: pageHeight - 185,
          width: 280,
          height: 2,
          color: goldRgb,
        });

        const qText = "Questions & Discussion";
        const qW = fontTimesRoman.widthOfTextAtSize(qText, 18);
        page.drawText(qText, {
          x: (pageWidth - qW) / 2,
          y: pageHeight - 215,
          size: 18,
          font: fontTimesRoman,
          color: grayRgb,
        });

        // Student Card
        const thankCardY = 70;
        const thankCardH = 170;
        const thankCardW = 600;
        page.drawRectangle({
          x: (pageWidth - thankCardW) / 2,
          y: thankCardY,
          width: thankCardW,
          height: thankCardH,
          color: cardRgb,
          borderColor: borderRgb,
          borderWidth: 1,
        });

        const line1 = `Presented by: ${studentName} (${rollNumber})`;
        const w1 = fontHelveticaBold.widthOfTextAtSize(line1, 15);
        page.drawText(line1, {
          x: (pageWidth - w1) / 2,
          y: thankCardY + thankCardH - 45,
          size: 15,
          font: fontHelveticaBold,
          color: navyRgb,
        });

        const line2 = `Department of ${branchName} • Subject: ${subjectName}`;
        const w2 = fontHelvetica.widthOfTextAtSize(line2, 13);
        page.drawText(line2, {
          x: (pageWidth - w2) / 2,
          y: thankCardY + thankCardH - 80,
          size: 13,
          font: fontHelvetica,
          color: charcoalRgb,
        });

        const line3 = "INSTITUTE OF AERONAUTICAL ENGINEERING (Autonomous)";
        const w3 = fontTimesRomanBold.widthOfTextAtSize(line3, 12.5);
        page.drawText(line3, {
          x: (pageWidth - w3) / 2,
          y: thankCardY + thankCardH - 115,
          size: 12.5,
          font: fontTimesRomanBold,
          color: maroonRgb,
        });

        const line4 = "Dundigal, Hyderabad - 500 043, Telangana";
        const w4 = fontHelvetica.widthOfTextAtSize(line4, 11);
        page.drawText(line4, {
          x: (pageWidth - w4) / 2,
          y: thankCardY + thankCardH - 142,
          size: 11,
          font: fontHelvetica,
          color: grayRgb,
        });
      } else {
        // ====================================================================
        // SLIDES 2 TO N-1: CONTENT SLIDE WITH SIDE-HEADING & MAROON UNDERLINE
        // ====================================================================
        const sideHeading = (s.title || "CONTENT SLIDE").toUpperCase();

        page.drawText(sideHeading.substring(0, 60), {
          x: 54,
          y: pageHeight - 90,
          size: 23,
          font: fontTimesRomanBold,
          color: navyRgb,
        });

        // Crisp Maroon (#8B0000) accent rule directly underneath the heading
        page.drawRectangle({
          x: 54,
          y: pageHeight - 100,
          width: 130,
          height: 3,
          color: maroonRgb,
        });

        if (s.layout === "index") {
          // INDEX SLIDE
          const items = s.bulletPoints || [];
          const half = Math.ceil(items.length / 2);
          const col1 = items.slice(0, half);
          const col2 = items.slice(half);

          let y1 = pageHeight - 145;
          col1.forEach((item) => {
            page.drawText(item.substring(0, 48), {
              x: 64,
              y: y1,
              size: 17,
              font: fontHelveticaBold,
              color: charcoalRgb,
            });
            y1 -= 44;
          });

          let y2 = pageHeight - 145;
          col2.forEach((item) => {
            page.drawText(item.substring(0, 48), {
              x: 510,
              y: y2,
              size: 17,
              font: fontHelveticaBold,
              color: charcoalRgb,
            });
            y2 -= 44;
          });
        } else if (s.layout === "paragraph") {
          // INTRODUCTION OR CONCLUSION (NO BULLETS)
          const paragraphText =
            s.paragraph ||
            s.bulletPoints?.join(" ") ||
            "Academic synthesis conforming strictly to Institute of Aeronautical Engineering OBE continuous evaluation standards.";

          page.drawText(paragraphText, {
            x: 64,
            y: pageHeight - 150,
            size: 16.5,
            font: fontHelvetica,
            color: charcoalRgb,
            maxWidth: pageWidth - 128,
            lineHeight: 28,
          });
        } else {
          // 8 CORE TECHNICAL SLIDES (EXACTLY 5 SUBSTANTIVE BULLETS)
          const bullets = (s.bulletPoints || []).slice(0, 5);
          let bY = pageHeight - 145;
          bullets.forEach((b) => {
            page.drawText(`•  ${b}`, {
              x: 64,
              y: bY,
              size: 15.5,
              font: fontHelvetica,
              color: charcoalRgb,
              maxWidth: pageWidth - 128,
              lineHeight: 22,
            });
            bY -= 56;
          });
        }
      }
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * 3. Export Presenter Stage Cheat-Sheet (.md)
 */
export function exportToSpeakerCheatSheet(
  presentation: TechTalkPresentation
): string {
  const lines: string[] = [];
  lines.push(`# COLLEGE TECH-TALK PRESENTER STAGE CHEAT-SHEET`);
  lines.push(`**Topic:** ${presentation.topic}`);
  lines.push(
    `**Presenter:** ${presentation.iareMetadata?.studentName || presentation.presenterName || "Student Presenter"}`
  );
  if (presentation.iareMetadata?.rollNumber) {
    lines.push(`**Roll No:** ${presentation.iareMetadata.rollNumber}`);
  }
  if (presentation.iareMetadata?.department) {
    lines.push(`**Branch:** ${presentation.iareMetadata.department}`);
  }
  if (presentation.iareMetadata?.subject) {
    lines.push(`**Subject:** ${presentation.iareMetadata.subject}`);
  }
  lines.push(
    `**Institution:** ${presentation.collegeName || "Institute of Aeronautical Engineering (Autonomous)"}`
  );
  lines.push(
    `**Event:** ${presentation.eventName || "AAT - TECH TALK Presentation"}`
  );
  lines.push(
    `**Slide Count:** ${presentation.slides.length} Widescreen 16:9 Slides`
  );
  lines.push(`**Date Generated:** ${new Date().toLocaleDateString()}`);
  lines.push(`\n---\n`);

  presentation.slides.forEach((s) => {
    lines.push(`## Slide ${s.slideNumber}: ${s.title}`);
    if (s.subtitle) lines.push(`*${s.subtitle}*`);
    lines.push(
      `**Category:** \`${s.category || "TECH TALK"}\` | **Layout:** \`${s.layout}\`\n`
    );

    lines.push(`### 🎙️ WHAT TO SAY ON STAGE (VERBAL SPEAKER SCRIPT):`);
    lines.push(`> "${s.speakerNotes}"\n`);

    if (s.paragraph) {
      lines.push(`**Slide Academic Text:**\n${s.paragraph}\n`);
    }

    if (s.bulletPoints && s.bulletPoints.length > 0) {
      lines.push(`**Slide Key Points:**`);
      s.bulletPoints.forEach((b) => lines.push(`- ${b}`));
      lines.push("");
    }

    lines.push(`---\n`);
  });

  return lines.join("\n");
}
