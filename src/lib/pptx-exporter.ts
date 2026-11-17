import pptxgen from "pptxgenjs";
import { TechTalkPresentation } from "@/types/ppt";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { hexToPdfRgb } from "@/lib/pdf-engine";
import {
  IARE_HEADER_BANNER_BASE64,
  IARE_CORNER_LOGO_BASE64,
  IARE_EXACT_COLORS,
} from "@/lib/iare-template-assets";

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
 * 1. Export 16:9 Widescreen PowerPoint (.pptx) with embedded Speaker Notes
 * Exact 13.333" x 7.5" Widescreen Geometry with Auto-Fit Typography
 */
export async function exportToPptx(
  presentation: TechTalkPresentation
): Promise<void> {
  const pptx = new pptxgen();
  // Exact 16:9 widescreen layout (13.333" x 7.5")
  pptx.defineLayout({ name: "IARE_EXACT_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "IARE_EXACT_16x9";

  pptx.title = presentation.topic;
  pptx.subject = "IARE AAT Tech-Talk Presentation";
  pptx.author =
    presentation.iareMetadata?.studentName ||
    presentation.presenterName ||
    "Student";
  pptx.company = "Institute of Aeronautical Engineering (Autonomous)";

  const iare = presentation.iareMetadata;

  const studentName =
    iare?.studentName || presentation.presenterName || "Student";
  const rollNumber = iare?.rollNumber || "";
  const branchName = iare?.department || "";
  const subjectName = iare?.subject || iare?.courseName || "";
  const assessmentTitle =
    iare?.assessmentType || "AAT - TECH TALK";

  for (const s of presentation.slides) {
    const slide = pptx.addSlide();

    // 1. Exact Slide Background: #EDEDEE
    slide.background = { color: IARE_EXACT_COLORS.slideBg };

    // 2. Embedded Stage Speaker Notes
    if (s.speakerNotes) {
      slide.addNotes(s.speakerNotes);
    }

    // 3. Slide Layout Rendering
    if (s.layout === "title") {
      // ======================================================================
      // SLIDE 1: EXACT COVER SLIDE (slideLayout2.xml TITLE_MASTER)
      // ======================================================================
      // Header Banner Image across top: x=0, y=0, w=13.333", h=2.0"
      try {
        slide.addImage({
          data: IARE_HEADER_BANNER_BASE64,
          x: 0,
          y: 0,
          w: 13.333,
          h: 2.0,
        });
      } catch {
        // Fallback
      }

      // Assessment Title: AAT - TECH TALK
      slide.addText(assessmentTitle, {
        x: 0.75,
        y: 2.3,
        w: 11.83,
        h: 0.65,
        fontSize: 30,
        fontFace: "Arial",
        bold: true,
        color: IARE_EXACT_COLORS.headerBannerBg,
        align: "center",
      });

      // Topic Title: Topic - [Topic]
      const topicText = s.title.replace(/^Topic\s*-\s*/i, "").trim();
      const topicProps: pptxgen.TextProps[] = [
        {
          text: "Topic - ",
          options: {
            fontSize: 28,
            fontFace: "Arial",
            bold: true,
            color: IARE_EXACT_COLORS.headerBannerBg,
          },
        },
        {
          text: topicText,
          options: {
            fontSize: 24,
            fontFace: "Calibri",
            bold: false,
            color: IARE_EXACT_COLORS.headerBannerBg,
          },
        },
      ];

      slide.addText(topicProps, {
        x: 1.0,
        y: 3.25,
        w: 11.33,
        h: 0.95,
        align: "left",
      });

      // Student Credentials: Name
      slide.addText(
        [
          {
            text: "Name: ",
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              bold: true,
              color: IARE_EXACT_COLORS.headerBannerBg,
            },
          },
          {
            text: studentName,
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              bold: false,
              color: "111827",
            },
          },
        ],
        { x: 1.0, y: 4.45, w: 11.33, h: 0.45, align: "left" }
      );

      // Roll No
      slide.addText(
        [
          {
            text: "Roll No: ",
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              bold: true,
              color: IARE_EXACT_COLORS.headerBannerBg,
            },
          },
          {
            text: rollNumber,
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              bold: false,
              color: "111827",
            },
          },
        ],
        { x: 1.0, y: 5.05, w: 11.33, h: 0.45, align: "left" }
      );

      // Branch
      slide.addText(
        [
          {
            text: "Branch: ",
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              bold: true,
              color: IARE_EXACT_COLORS.headerBannerBg,
            },
          },
          {
            text: branchName,
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              bold: false,
              color: "111827",
            },
          },
        ],
        { x: 1.0, y: 5.65, w: 11.33, h: 0.45, align: "left" }
      );

      // Subject
      slide.addText(
        [
          {
            text: "Subject: ",
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              bold: true,
              color: IARE_EXACT_COLORS.headerBannerBg,
            },
          },
          {
            text: subjectName,
            options: {
              fontSize: 18,
              fontFace: "Calibri",
              bold: false,
              color: "111827",
            },
          },
        ],
        { x: 1.0, y: 6.25, w: 11.33, h: 0.45, align: "left" }
      );
    } else if (s.layout === "thank-you") {
      // ======================================================================
      // SLIDE 13: EXACT THANK YOU SLIDE (slideLayout2.xml TITLE_MASTER)
      // ======================================================================
      try {
        slide.addImage({
          data: IARE_HEADER_BANNER_BASE64,
          x: 0,
          y: 0,
          w: 13.333,
          h: 2.0,
        });
      } catch {
        // Fallback
      }

      // Shape: THANK YOU (52pt Arial Bold in #51237F)
      slide.addText("THANK YOU", {
        x: 0.75,
        y: 3.0,
        w: 11.83,
        h: 2.5,
        fontSize: 52,
        fontFace: "Arial",
        bold: true,
        color: IARE_EXACT_COLORS.thankYouText,
        align: "center",
      });
    } else {
      // ======================================================================
      // SLIDES 2 TO 12: EXACT CONTENT SLIDES (slideLayout3.xml CONTENT_MASTER)
      // ======================================================================
      // Top-Right Logo: pos=(11.45", 0.08") size=(1.55" x 0.85")
      try {
        slide.addImage({
          data: IARE_CORNER_LOGO_BASE64,
          x: 11.45,
          y: 0.08,
          w: 1.55,
          h: 0.85,
        });
      } catch {
        // Fallback
      }

      // Bottom Footer Bar: pos=(0.0000", 7.12") size=(13.333" x 0.38") solidFill clr=#003366
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 7.12,
        w: 13.333,
        h: 0.38,
        fill: { color: IARE_EXACT_COLORS.footerBar },
        line: { color: IARE_EXACT_COLORS.footerBar, width: 0 },
      });

      // Side-Heading: pos=(0.75", 0.65") size=(10.5" x 0.65") font=Calibri, sz=23pt bold, clr=#003366
      const sideHeading = (s.title || "CONTENT SLIDE").toUpperCase();
      slide.addText(sideHeading, {
        x: 0.75,
        y: 0.65,
        w: 10.5,
        h: 0.65,
        fontSize: 23,
        fontFace: "Calibri",
        bold: true,
        color: IARE_EXACT_COLORS.sideHeading,
        align: "left",
      });

      // Body Text Rendering
      if (s.layout === "index") {
        // INDEX SLIDE: 1.  to 8.  in Title Case inside x: 0.75", y: 1.48", w: 11.83", h: 5.5"
        const items = s.bulletPoints || [];
        const indexProps: pptxgen.TextProps[] = items.map((item) => ({
          text: `${item}\n`,
          options: {
            fontSize: 15.5,
            fontFace: "Calibri",
            color: "111827",
            bold: false,
            lineSpacingMultiple: 1.32,
            paraSpaceAfter: 6,
          },
        }));

        slide.addText(indexProps, {
          x: 0.75,
          y: 1.48,
          w: 11.83,
          h: 5.5,
          valign: "top",
        });
      } else if (s.layout === "paragraph") {
        // INTRODUCTION OR CONCLUSION: One cohesive academic paragraph
        // Box: x: 0.75", y: 1.55", w: 11.83", h: 5.35", 15pt Calibri, auto-scaling to 14pt if > 750 chars
        const paragraphText =
          s.paragraph ||
          s.bulletPoints?.join(" ") ||
          "";

        const pFontSize = paragraphText.length > 750 ? 14 : 15;

        slide.addText(paragraphText, {
          x: 0.75,
          y: 1.55,
          w: 11.83,
          h: 5.35,
          fontSize: pFontSize,
          fontFace: "Calibri",
          color: "111827",
          lineSpacingMultiple: 1.4,
          valign: "top",
        });
      } else {
        // 8 CORE TECHNICAL SLIDES: 5 or 6 comprehensive 2-sentence bullets
        // Box: x: 0.75", y: 1.48", w: 11.83", h: 5.5", 14.5pt Calibri, fit: "shrink", auto-scaling to 13.5pt if > 950 chars
        const bullets = s.bulletPoints || [];
        const totalChars = bullets.join("").length;
        const bulletFontSize = totalChars > 950 ? 13.5 : 14.5;

        const bulletProps: pptxgen.TextProps[] = bullets.map((b) => ({
          text: b,
          options: {
            bullet: true,
            fontSize: bulletFontSize,
            fontFace: "Calibri",
            color: "111827",
            lineSpacingMultiple: 1.26,
            paraSpaceAfter: 7,
          },
        }));

        slide.addText(bulletProps, {
          x: 0.75,
          y: 1.48,
          w: 11.83,
          h: 5.5,
          valign: "top",
          fit: "shrink",
        });
      }
    }
  }

  const fileName = getPresentationExportFilename(presentation, "pptx");
  await pptx.writeFile({ fileName });
}

/**
 * Helper for wrapping text in PDF export
 */
function wrapPdfText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (t: string, sz: number) => number },
  fontSize: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * 2. Export 16:9 PDF Slide Deck via pdf-lib
 * Exact 960 x 540 geometry matching 13.333" x 7.5" PowerPoint template
 */
export async function exportToPdfDeck(
  presentation: TechTalkPresentation
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const iare = presentation.iareMetadata;

  // Embed exact extracted template media assets
  let headerBannerImage = null;
  let cornerLogoImage = null;
  try {
    const b64Banner = IARE_HEADER_BANNER_BASE64.replace(/^data:image\/png;base64,/, "");
    headerBannerImage = await pdfDoc.embedPng(
      Uint8Array.from(atob(b64Banner), (c) => c.charCodeAt(0))
    );
  } catch {
    // Fallback
  }

  try {
    const b64Logo = IARE_CORNER_LOGO_BASE64.replace(/^data:image\/png;base64,/, "");
    cornerLogoImage = await pdfDoc.embedPng(
      Uint8Array.from(atob(b64Logo), (c) => c.charCodeAt(0))
    );
  } catch {
    // Fallback
  }

  const studentName =
    iare?.studentName || presentation.presenterName || "Student";
  const rollNumber = iare?.rollNumber || "";
  const branchName = iare?.department || "";
  const subjectName = iare?.subject || iare?.courseName || "";
  const assessmentTitle =
    iare?.assessmentType || "AAT - TECH TALK";

  const slideBgRgb = hexToPdfRgb("#" + IARE_EXACT_COLORS.slideBg);
  const headerBgRgb = hexToPdfRgb("#" + IARE_EXACT_COLORS.headerBannerBg);
  const sideHeadingRgb = hexToPdfRgb("#" + IARE_EXACT_COLORS.sideHeading);
  const footerBarRgb = hexToPdfRgb("#" + IARE_EXACT_COLORS.footerBar);
  const bodyTextRgb = hexToPdfRgb("#111827");
  const thankYouRgb = hexToPdfRgb("#" + IARE_EXACT_COLORS.thankYouText);

  const pageWidth = 960;
  const pageHeight = 540;

  for (const s of presentation.slides) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // 1. Exact Slide Background: #EDEDEE
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: slideBgRgb,
    });

    if (s.layout === "title") {
      // ======================================================================
      // SLIDE 1: EXACT COVER SLIDE
      // ======================================================================
      if (headerBannerImage) {
        page.drawImage(headerBannerImage, {
          x: 0,
          y: pageHeight - 144,
          width: pageWidth,
          height: 144,
        });
      }

      // Assessment Title: AAT - TECH TALK (size=28, bold, align=ctr, clr=#004170)
      const assessW = fontHelveticaBold.widthOfTextAtSize(assessmentTitle, 28);
      page.drawText(assessmentTitle, {
        x: (pageWidth - assessW) / 2,
        y: pageHeight - 175,
        size: 28,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });

      // Topic Title
      const topicText = s.title.replace(/^Topic\s*-\s*/i, "").trim();
      const topicLine = `Topic - ${topicText}`;
      page.drawText(topicLine.substring(0, 65), {
        x: 72,
        y: pageHeight - 240,
        size: 23,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });

      // Metadata Rows at x=72
      // Name:
      page.drawText("Name: ", {
        x: 72,
        y: pageHeight - 325,
        size: 17,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });
      page.drawText(studentName, {
        x: 155,
        y: pageHeight - 325,
        size: 17,
        font: fontHelvetica,
        color: bodyTextRgb,
      });

      // Roll No:
      page.drawText("Roll No: ", {
        x: 72,
        y: pageHeight - 370,
        size: 17,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });
      page.drawText(rollNumber, {
        x: 170,
        y: pageHeight - 370,
        size: 17,
        font: fontHelvetica,
        color: bodyTextRgb,
      });

      // Branch:
      page.drawText("Branch: ", {
        x: 72,
        y: pageHeight - 415,
        size: 17,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });
      page.drawText(branchName.substring(0, 48), {
        x: 165,
        y: pageHeight - 415,
        size: 17,
        font: fontHelvetica,
        color: bodyTextRgb,
      });

      // Subject:
      page.drawText("Subject: ", {
        x: 72,
        y: pageHeight - 460,
        size: 17,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });
      page.drawText(subjectName.substring(0, 50), {
        x: 170,
        y: pageHeight - 460,
        size: 17,
        font: fontHelvetica,
        color: bodyTextRgb,
      });
    } else if (s.layout === "thank-you") {
      // ======================================================================
      // SLIDE 13: EXACT THANK YOU SLIDE
      // ======================================================================
      if (headerBannerImage) {
        page.drawImage(headerBannerImage, {
          x: 0,
          y: pageHeight - 144,
          width: pageWidth,
          height: 144,
        });
      }

      const thankText = "THANK YOU";
      const thankW = fontHelveticaBold.widthOfTextAtSize(thankText, 52);
      page.drawText(thankText, {
        x: (pageWidth - thankW) / 2,
        y: pageHeight - 275,
        size: 52,
        font: fontHelveticaBold,
        color: thankYouRgb,
      });
    } else {
      // ======================================================================
      // SLIDES 2 TO 12: EXACT CONTENT SLIDES
      // ======================================================================
      // Top-Right Logo: pos=(824, pageHeight - 65)
      if (cornerLogoImage) {
        page.drawImage(cornerLogoImage, {
          x: 824,
          y: pageHeight - 65,
          width: 112,
          height: 60,
        });
      }

      // Bottom Footer Bar: x=0, y=0, w=pageWidth, h=27.5, clr=#003366
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: 27.5,
        color: footerBarRgb,
      });

      // Side-Heading
      const sideHeading = (s.title || "CONTENT SLIDE").toUpperCase();
      page.drawText(sideHeading.substring(0, 60), {
        x: 54,
        y: pageHeight - 56,
        size: 21,
        font: fontHelveticaBold,
        color: sideHeadingRgb,
      });

      if (s.layout === "index") {
        // INDEX SLIDE
        const items = s.bulletPoints || [];
        let curY = pageHeight - 110;
        items.forEach((item) => {
          page.drawText(item.substring(0, 64), {
            x: 54,
            y: curY,
            size: 15.5,
            font: fontHelvetica,
            color: bodyTextRgb,
          });
          curY -= 38;
        });
      } else if (s.layout === "paragraph") {
        // INTRODUCTION OR CONCLUSION
        const paragraphText =
          s.paragraph ||
          s.bulletPoints?.join(" ") ||
          "";

        const pSize = paragraphText.length > 750 ? 13.5 : 14.5;
        const pLineHeight = pSize * 1.5;
        const lines = wrapPdfText(paragraphText, 852, fontHelvetica, pSize);

        let curY = pageHeight - 116;
        for (const line of lines) {
          if (curY < 40) break;
          page.drawText(line, {
            x: 54,
            y: curY,
            size: pSize,
            font: fontHelvetica,
            color: bodyTextRgb,
          });
          curY -= pLineHeight;
        }
      } else {
        // 8 CORE TECHNICAL SLIDES
        const bullets = s.bulletPoints || [];
        const totalChars = bullets.join("").length;
        const bSize = totalChars > 950 ? 12.0 : 13.0;
        const bLineHeight = bSize * 1.32;

        let curY = pageHeight - 112;
        bullets.forEach((bullet) => {
          const bulletLines = wrapPdfText(bullet, 836, fontHelvetica, bSize);
          bulletLines.forEach((line, lineIdx) => {
            if (curY < 38) return;
            if (lineIdx === 0) {
              // Draw bullet marker
              page.drawText("•", {
                x: 54,
                y: curY,
                size: bSize,
                font: fontHelveticaBold,
                color: bodyTextRgb,
              });
              page.drawText(line, {
                x: 68,
                y: curY,
                size: bSize,
                font: fontHelvetica,
                color: bodyTextRgb,
              });
            } else {
              page.drawText(line, {
                x: 68,
                y: curY,
                size: bSize,
                font: fontHelvetica,
                color: bodyTextRgb,
              });
            }
            curY -= bLineHeight;
          });
          curY -= 6; // Extra space after each bullet
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
    `**Content Depth:** ${presentation.contentDepth === "extra-deep" ? "Extra Deep Technical (6 Dense Bullets)" : "Detailed Tech Talk (5 Dense Bullets)"}`
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
