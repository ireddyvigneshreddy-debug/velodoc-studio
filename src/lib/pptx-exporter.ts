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
 * 1. Export 16:9 PowerPoint (.pptx) with embedded Speaker Notes
 * Exact official IARE 13.333" x 7.5" geometry, Times New Roman / Calibri
 * ZERO extra address headers and ZERO footer text lines on Slides 2–13
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

    // 2. Subtle Top Institutional Accent Bar (Maroon + Gold)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.08,
      fill: { color: "8B0000" },
      line: { color: "8B0000", width: 0 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.08,
      w: 13.333,
      h: 0.02,
      fill: { color: "C59B27" },
      line: { color: "C59B27", width: 0 },
    });

    // 3. Embedded Stage Speaker Notes
    if (s.speakerNotes) {
      slide.addNotes(s.speakerNotes);
    }

    // 4. Layout Rendering
    if (s.layout === "title") {
      // ======================================================================
      // SLIDE 1: EXACT 6-LINE TITLE COVER SLIDE
      // ======================================================================
      // Optional Logo at Top-Left (if available)
      if (iareLogoBase64) {
        try {
          slide.addImage({
            data: iareLogoBase64,
            x: 0.9,
            y: 0.35,
            w: 0.95,
            h: 0.95,
          });
        } catch {
          // Fallback
        }
      }

      // Line 1: Centered [Assessment Type] (24pt Bold Times New Roman Navy #002147)
      slide.addText(`[ ${assessmentTitle} ]`, {
        x: 0,
        y: 1.3,
        w: 13.333,
        h: 0.55,
        fontSize: 24,
        fontFace: "Times New Roman",
        bold: true,
        color: "002147",
        align: "center",
      });

      // Line 2: Left-aligned Topic - [Topic] (22pt Bold Times New Roman #111827 at x: 0.9")
      const topicHeading = s.title.startsWith("Topic -")
        ? s.title
        : `Topic - ${s.title}`;
      slide.addText(topicHeading, {
        x: 0.9,
        y: 2.25,
        w: 11.533,
        h: 0.75,
        fontSize: 22,
        fontFace: "Times New Roman",
        bold: true,
        color: "111827",
        align: "left",
      });

      // Line 3: Subtle horizontal Maroon rule
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.9,
        y: 3.15,
        w: 11.533,
        h: 0.035,
        fill: { color: "8B0000" },
        line: { color: "8B0000", width: 0 },
      });

      // Lines 4-7: Cleanly stacked student metadata block at x: 0.9" (18pt Calibri #111827, line spacing 1.4)
      const metaProps: pptxgen.TextProps[] = [
        {
          text: "Name:     ",
          options: {
            fontSize: 18,
            fontFace: "Calibri",
            bold: true,
            color: "002147",
          },
        },
        {
          text: `${studentName}\n`,
          options: {
            fontSize: 18,
            fontFace: "Calibri",
            bold: false,
            color: "111827",
            paraSpaceAfter: 10,
          },
        },
        {
          text: "Roll No:  ",
          options: {
            fontSize: 18,
            fontFace: "Calibri",
            bold: true,
            color: "002147",
          },
        },
        {
          text: `${rollNumber}\n`,
          options: {
            fontSize: 18,
            fontFace: "Calibri",
            bold: false,
            color: "111827",
            paraSpaceAfter: 10,
          },
        },
        {
          text: "Branch:   ",
          options: {
            fontSize: 18,
            fontFace: "Calibri",
            bold: true,
            color: "002147",
          },
        },
        {
          text: `${branchName}\n`,
          options: {
            fontSize: 18,
            fontFace: "Calibri",
            bold: false,
            color: "111827",
            paraSpaceAfter: 10,
          },
        },
        {
          text: "Subject:  ",
          options: {
            fontSize: 18,
            fontFace: "Calibri",
            bold: true,
            color: "002147",
          },
        },
        {
          text: `${subjectName}`,
          options: {
            fontSize: 18,
            fontFace: "Calibri",
            bold: false,
            color: "111827",
          },
        },
      ];

      slide.addText(metaProps, {
        x: 0.9,
        y: 3.55,
        w: 11.533,
        h: 3.2,
        valign: "top",
        lineSpacingMultiple: 1.4,
      });
    } else if (s.layout === "thank-you") {
      // ======================================================================
      // SLIDE 13: CLEAN CENTERED THANK YOU SLIDE (NO EXTRA CLUTTER)
      // ======================================================================
      slide.addText("THANK YOU", {
        x: 0,
        y: 2.8,
        w: 13.333,
        h: 1.1,
        fontSize: 42,
        fontFace: "Times New Roman",
        bold: true,
        color: "002147",
        align: "center",
      });

      // Subtle Maroon Underline Rule
      slide.addShape(pptx.ShapeType.rect, {
        x: 5.266,
        y: 4.05,
        w: 2.8,
        h: 0.04,
        fill: { color: "8B0000" },
        line: { color: "8B0000", width: 0 },
      });
    } else {
      // ======================================================================
      // SLIDES 2 TO 12: CONTENT SLIDE WITH SIDE-HEADING & MAROON UNDERLINE
      // ZERO EXTRA ADDRESS HEADERS & ZERO FOOTER TEXT LINES
      // ======================================================================
      const sideHeading = (s.title || "CONTENT SLIDE").toUpperCase();

      // Left-Aligned Side-Heading (24pt Bold Times New Roman, Navy #002147)
      slide.addText(sideHeading, {
        x: 0.9,
        y: 0.75,
        w: 11.533,
        h: 0.6,
        fontSize: 24,
        fontFace: "Times New Roman",
        bold: true,
        color: "002147",
        valign: "top",
        align: "left",
      });

      // Crisp Maroon (#8B0000) accent rule directly underneath the heading
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.9,
        y: 1.4,
        w: 2.2,
        h: 0.04,
        fill: { color: "8B0000" },
        line: { color: "8B0000", width: 0 },
      });

      if (s.layout === "index") {
        // SLIDE 2: INDEX (Numbered list 1.  to 8.  with two spaces in Title Case)
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
            paraSpaceAfter: 14,
          },
        }));

        slide.addText(col1Props, {
          x: 0.9,
          y: 1.95,
          w: 5.5,
          h: 5.0,
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
              paraSpaceAfter: 14,
            },
          }));

          slide.addText(col2Props, {
            x: 6.8,
            y: 1.95,
            w: 5.5,
            h: 5.0,
            valign: "top",
          });
        }
      } else if (s.layout === "paragraph") {
        // SLIDE 3 (INTRODUCTION) & SLIDE 12 (CONCLUSION): ONE PROSE PARAGRAPH (NO BULLETS)
        const paragraphText =
          s.paragraph ||
          s.bulletPoints?.join(" ") ||
          "";

        slide.addText(paragraphText, {
          x: 0.9,
          y: 1.95,
          w: 11.533,
          h: 4.8,
          fontSize: 17,
          fontFace: "Calibri",
          color: "111827",
          lineSpacingMultiple: 1.5,
          valign: "top",
        });
      } else {
        // SLIDES 4 TO 11: 8 CORE TECHNICAL SLIDES (STRICTLY 5 SUBSTANTIVE BULLETS)
        const bullets = (s.bulletPoints || []).slice(0, 5);
        const bulletProps: pptxgen.TextProps[] = bullets.map((b) => ({
          text: b,
          options: {
            bullet: true,
            fontSize: 16.5,
            fontFace: "Calibri",
            color: "111827",
            lineSpacingMultiple: 1.35,
            paraSpaceAfter: 12,
          },
        }));

        slide.addText(bulletProps, {
          x: 0.9,
          y: 1.9,
          w: 11.533,
          h: 5.1,
          valign: "top",
        });
      }
    }
  }

  const fileName = getPresentationExportFilename(presentation, "pptx");
  await pptx.writeFile({ fileName });
}

/**
 * 2. Export 16:9 PDF Slide Deck via pdf-lib
 * Exact 16:9 widescreen layout matching PowerPoint template (960 x 540)
 * ZERO extra address headers and ZERO footer text lines on Slides 2–13
 */
export async function exportToPdfDeck(
  presentation: TechTalkPresentation
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
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

    // 2. Subtle Top Institutional Accent Bar (Maroon + Gold)
    page.drawRectangle({
      x: 0,
      y: pageHeight - 6,
      width: pageWidth,
      height: 6,
      color: maroonRgb,
    });
    page.drawRectangle({
      x: 0,
      y: pageHeight - 8,
      width: pageWidth,
      height: 2,
      color: goldRgb,
    });

    if (s.layout === "title") {
      // ======================================================================
      // SLIDE 1: EXACT 6-LINE TITLE COVER SLIDE
      // ======================================================================
      if (logoImage) {
        page.drawImage(logoImage, {
          x: 64,
          y: pageHeight - 95,
          width: 65,
          height: 65,
        });
      }

      // Line 1: Centered [Assessment Type]
      const assessText = `[ ${assessmentTitle} ]`;
      const assessWidth = fontTimesRomanBold.widthOfTextAtSize(assessText, 24);
      page.drawText(assessText, {
        x: (pageWidth - assessWidth) / 2,
        y: pageHeight - 140,
        size: 24,
        font: fontTimesRomanBold,
        color: navyRgb,
      });

      // Line 2: Left-aligned Topic - [Topic]
      const topicText = s.title.startsWith("Topic -")
        ? s.title
        : `Topic - ${s.title}`;
      page.drawText(topicText.substring(0, 55), {
        x: 64,
        y: pageHeight - 205,
        size: 22,
        font: fontTimesRomanBold,
        color: charcoalRgb,
      });

      // Line 3: Subtle horizontal Maroon rule
      page.drawRectangle({
        x: 64,
        y: pageHeight - 225,
        width: pageWidth - 128,
        height: 2.5,
        color: maroonRgb,
      });

      // Lines 4-7: Cleanly stacked student metadata block
      page.drawText("Name: ", {
        x: 64,
        y: pageHeight - 275,
        size: 17,
        font: fontHelveticaBold,
        color: navyRgb,
      });
      page.drawText(studentName, {
        x: 155,
        y: pageHeight - 275,
        size: 17,
        font: fontHelvetica,
        color: charcoalRgb,
      });

      page.drawText("Roll No: ", {
        x: 64,
        y: pageHeight - 315,
        size: 17,
        font: fontHelveticaBold,
        color: navyRgb,
      });
      page.drawText(rollNumber, {
        x: 165,
        y: pageHeight - 315,
        size: 17,
        font: fontHelvetica,
        color: charcoalRgb,
      });

      page.drawText("Branch: ", {
        x: 64,
        y: pageHeight - 355,
        size: 17,
        font: fontHelveticaBold,
        color: navyRgb,
      });
      page.drawText(branchName.substring(0, 40), {
        x: 165,
        y: pageHeight - 355,
        size: 17,
        font: fontHelvetica,
        color: charcoalRgb,
      });

      page.drawText("Subject: ", {
        x: 64,
        y: pageHeight - 395,
        size: 17,
        font: fontHelveticaBold,
        color: navyRgb,
      });
      page.drawText(subjectName.substring(0, 45), {
        x: 165,
        y: pageHeight - 395,
        size: 17,
        font: fontHelvetica,
        color: charcoalRgb,
      });
    } else if (s.layout === "thank-you") {
      // ======================================================================
      // SLIDE 13: CLEAN CENTERED THANK YOU SLIDE (NO EXTRA CLUTTER)
      // ======================================================================
      const thankText = "THANK YOU";
      const thankW = fontTimesRomanBold.widthOfTextAtSize(thankText, 42);
      page.drawText(thankText, {
        x: (pageWidth - thankW) / 2,
        y: pageHeight - 250,
        size: 42,
        font: fontTimesRomanBold,
        color: navyRgb,
      });

      // Subtle Maroon underline rule
      page.drawRectangle({
        x: (pageWidth - 200) / 2,
        y: pageHeight - 268,
        width: 200,
        height: 3,
        color: maroonRgb,
      });
    } else {
      // ======================================================================
      // SLIDES 2 TO 12: CONTENT SLIDE WITH SIDE-HEADING & MAROON UNDERLINE
      // ZERO EXTRA ADDRESS HEADERS & ZERO FOOTER TEXT LINES
      // ======================================================================
      const sideHeading = (s.title || "CONTENT SLIDE").toUpperCase();

      page.drawText(sideHeading.substring(0, 55), {
        x: 64,
        y: pageHeight - 75,
        size: 24,
        font: fontTimesRomanBold,
        color: navyRgb,
      });

      // Crisp Maroon (#8B0000) accent rule directly underneath the heading
      page.drawRectangle({
        x: 64,
        y: pageHeight - 88,
        width: 140,
        height: 3,
        color: maroonRgb,
      });

      if (s.layout === "index") {
        // INDEX SLIDE (1.  to 8.  in Title Case in 2 columns)
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
          y1 -= 48;
        });

        let y2 = pageHeight - 145;
        col2.forEach((item) => {
          page.drawText(item.substring(0, 48), {
            x: 500,
            y: y2,
            size: 17,
            font: fontHelveticaBold,
            color: charcoalRgb,
          });
          y2 -= 48;
        });
      } else if (s.layout === "paragraph") {
        // INTRODUCTION OR CONCLUSION (STRICTLY ONE PROSE PARAGRAPH, NO BULLETS)
        const paragraphText =
          s.paragraph ||
          s.bulletPoints?.join(" ") ||
          "";

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
        // 8 CORE TECHNICAL SLIDES (STRICTLY 5 SUBSTANTIVE BULLETS)
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
          bY -= 58;
        });
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
