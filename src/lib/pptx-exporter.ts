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
 * 1. Export 16:9 PowerPoint (.pptx) with embedded Speaker Notes
 * Exact 1:1 XML geometry from reference Vigneshreddy_EPS_AAT-1.pptx (10.0" x 5.625")
 */
export async function exportToPptx(
  presentation: TechTalkPresentation
): Promise<void> {
  const pptx = new pptxgen();
  // Exact 16:9 widescreen layout matching PowerPoint template (10.0" x 5.625")
  pptx.defineLayout({ name: "IARE_EXACT_16x9", width: 10.0, height: 5.625 });
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
      // Header Banner Image across top: x=0, y=0, w=10.0", h=1.5"
      try {
        slide.addImage({
          data: IARE_HEADER_BANNER_BASE64,
          x: 0,
          y: 0,
          w: 10.0,
          h: 1.5,
        });
      } catch {
        // Fallback
      }

      // Shape 'Text 0': AAT - TECH TALK
      // pos=(0.5000", 1.8000") size=(9.0000" x 0.5") font=Arial, sz=28.0pt, bold=True, clr=#004170, align=ctr
      slide.addText(assessmentTitle, {
        x: 0.5,
        y: 1.8,
        w: 9.0,
        h: 0.55,
        fontSize: 28,
        fontFace: "Arial",
        bold: true,
        color: IARE_EXACT_COLORS.headerBannerBg,
        align: "center",
      });

      // Shape 'Text 1': Topic - [Topic]
      // pos=(1.0000", 2.5000") size=(8.0000" x 0.8") font=Arial 28pt bold + Calibri 24pt regular, clr=#004170
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
        y: 2.5,
        w: 8.0,
        h: 0.85,
        align: "left",
      });

      // Shape 'Text 2': Name: [Name]
      // pos=(1.0000", 3.5000") size=(8.0000" x 0.4")
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
              color: IARE_EXACT_COLORS.bodyText,
            },
          },
        ],
        { x: 1.0, y: 3.5, w: 8.0, h: 0.4, align: "left" }
      );

      // Shape 'Text 3': Roll No: [Roll No]
      // pos=(1.0000", 4.0000") size=(8.0000" x 0.4")
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
              color: IARE_EXACT_COLORS.bodyText,
            },
          },
        ],
        { x: 1.0, y: 4.0, w: 8.0, h: 0.4, align: "left" }
      );

      // Shape 'Text 4': Branch: [Branch]
      // pos=(1.0000", 4.5000") size=(8.0000" x 0.4")
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
              color: IARE_EXACT_COLORS.bodyText,
            },
          },
        ],
        { x: 1.0, y: 4.5, w: 8.0, h: 0.4, align: "left" }
      );

      // Shape 'Text 5': Subject: [Subject]
      // pos=(1.0000", 5.0000") size=(8.0000" x 0.4")
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
              color: IARE_EXACT_COLORS.bodyText,
            },
          },
        ],
        { x: 1.0, y: 5.0, w: 8.0, h: 0.4, align: "left" }
      );
    } else if (s.layout === "thank-you") {
      // ======================================================================
      // SLIDE 13: EXACT THANK YOU SLIDE (slideLayout2.xml TITLE_MASTER)
      // ======================================================================
      // Header Banner Image across top: x=0, y=0, w=10.0", h=1.5"
      try {
        slide.addImage({
          data: IARE_HEADER_BANNER_BASE64,
          x: 0,
          y: 0,
          w: 10.0,
          h: 1.5,
        });
      } catch {
        // Fallback
      }

      // Shape 'Text 0': THANK YOU
      // pos=(0.5000", 1.5000") size=(9.0000" x 2.8125") font=Arial, sz=48.0pt, bold=True, clr=#51237F, align=ctr
      slide.addText("THANK YOU", {
        x: 0.5,
        y: 2.2,
        w: 9.0,
        h: 1.8,
        fontSize: 48,
        fontFace: "Arial",
        bold: true,
        color: IARE_EXACT_COLORS.thankYouText,
        align: "center",
      });
    } else {
      // ======================================================================
      // SLIDES 2 TO 12: EXACT CONTENT SLIDES (slideLayout3.xml CONTENT_MASTER)
      // ======================================================================
      // Top-Right Logo: pos=(8.5000", 0.0500") size=(1.2000" x 0.7000")
      try {
        slide.addImage({
          data: IARE_CORNER_LOGO_BASE64,
          x: 8.5,
          y: 0.05,
          w: 1.2,
          h: 0.7,
        });
      } catch {
        // Fallback
      }

      // Bottom Footer Bar: pos=(0.0000", 5.3438") size=(10.0000" x 0.4000") solidFill clr=#003366
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 5.3438,
        w: 10.0,
        h: 0.4,
        fill: { color: IARE_EXACT_COLORS.footerBar },
        line: { color: IARE_EXACT_COLORS.footerBar, width: 0 },
      });

      // Shape 'Text 0': Side-Heading
      // pos=(0.5000", 0.8200") size=(8.0000" x 0.5500") font=Calibri, sz=22.0pt, bold=True, clr=#003366, align=l
      const sideHeading = (s.title || "CONTENT SLIDE").toUpperCase();
      slide.addText(sideHeading, {
        x: 0.5,
        y: 0.82,
        w: 8.0,
        h: 0.55,
        fontSize: 22,
        fontFace: "Calibri",
        bold: true,
        color: IARE_EXACT_COLORS.sideHeading,
        align: "left",
      });

      // Shape 'Text 1': Body Text
      // pos=(0.5000", 1.5000") size=(9.0000" x 3.6500")
      if (s.layout === "index") {
        // INDEX SLIDE: 1.  to 8.  in Title Case (sz=16.0pt, bold=False, clr=#000000)
        const items = s.bulletPoints || [];
        const indexProps: pptxgen.TextProps[] = items.map((item) => ({
          text: `${item}\n`,
          options: {
            fontSize: 16,
            fontFace: "Calibri",
            color: IARE_EXACT_COLORS.bodyText,
            bold: false,
            lineSpacingMultiple: 1.35,
            paraSpaceAfter: 6,
          },
        }));

        slide.addText(indexProps, {
          x: 0.5,
          y: 1.5,
          w: 9.0,
          h: 3.65,
          valign: "top",
        });
      } else if (s.layout === "paragraph") {
        // INTRODUCTION OR CONCLUSION: One cohesive 4-sentence paragraph (sz=15.0pt, bold=False, clr=#000000)
        const paragraphText =
          s.paragraph ||
          s.bulletPoints?.join(" ") ||
          "";

        slide.addText(paragraphText, {
          x: 0.5,
          y: 1.5,
          w: 9.0,
          h: 3.65,
          fontSize: 15,
          fontFace: "Calibri",
          color: IARE_EXACT_COLORS.bodyText,
          lineSpacingMultiple: 1.4,
          valign: "top",
        });
      } else {
        // 8 CORE TECHNICAL SLIDES: Exactly 5 single-sentence bullet points (sz=14.0pt, bold=False, clr=#000000)
        const bullets = (s.bulletPoints || []).slice(0, 5);
        const bulletProps: pptxgen.TextProps[] = bullets.map((b) => ({
          text: b,
          options: {
            bullet: true,
            fontSize: 14,
            fontFace: "Calibri",
            color: IARE_EXACT_COLORS.bodyText,
            lineSpacingMultiple: 1.35,
            paraSpaceAfter: 8,
          },
        }));

        slide.addText(bulletProps, {
          x: 0.5,
          y: 1.5,
          w: 9.0,
          h: 3.65,
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
 * Exact 1:1 match with PowerPoint template (960 x 540)
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
  const bodyTextRgb = hexToPdfRgb("#" + IARE_EXACT_COLORS.bodyText);
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
      // Header Banner Image across top: y = pageHeight - 144, h = 144
      if (headerBannerImage) {
        page.drawImage(headerBannerImage, {
          x: 0,
          y: pageHeight - 144,
          width: pageWidth,
          height: 144,
        });
      }

      // Shape 'Text 0': AAT - TECH TALK (size=27, bold, align=ctr, clr=#004170)
      const assessW = fontHelveticaBold.widthOfTextAtSize(assessmentTitle, 27);
      page.drawText(assessmentTitle, {
        x: (pageWidth - assessW) / 2,
        y: pageHeight - 173,
        size: 27,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });

      // Shape 'Text 1': Topic - [Topic] (size=23, clr=#004170)
      const topicText = s.title.replace(/^Topic\s*-\s*/i, "").trim();
      const topicLine = `Topic - ${topicText}`;
      page.drawText(topicLine.substring(0, 58), {
        x: 96,
        y: pageHeight - 240,
        size: 23,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });

      // Metadata Rows at x=96
      // Name:
      page.drawText("Name: ", {
        x: 96,
        y: pageHeight - 336,
        size: 17,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });
      page.drawText(studentName, {
        x: 180,
        y: pageHeight - 336,
        size: 17,
        font: fontHelvetica,
        color: bodyTextRgb,
      });

      // Roll No:
      page.drawText("Roll No: ", {
        x: 96,
        y: pageHeight - 384,
        size: 17,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });
      page.drawText(rollNumber, {
        x: 195,
        y: pageHeight - 384,
        size: 17,
        font: fontHelvetica,
        color: bodyTextRgb,
      });

      // Branch:
      page.drawText("Branch: ", {
        x: 96,
        y: pageHeight - 432,
        size: 17,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });
      page.drawText(branchName.substring(0, 40), {
        x: 190,
        y: pageHeight - 432,
        size: 17,
        font: fontHelvetica,
        color: bodyTextRgb,
      });

      // Subject:
      page.drawText("Subject: ", {
        x: 96,
        y: pageHeight - 480,
        size: 17,
        font: fontHelveticaBold,
        color: headerBgRgb,
      });
      page.drawText(subjectName.substring(0, 45), {
        x: 195,
        y: pageHeight - 480,
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
      const thankW = fontHelveticaBold.widthOfTextAtSize(thankText, 46);
      page.drawText(thankText, {
        x: (pageWidth - thankW) / 2,
        y: pageHeight - 280,
        size: 46,
        font: fontHelveticaBold,
        color: thankYouRgb,
      });
    } else {
      // ======================================================================
      // SLIDES 2 TO 12: EXACT CONTENT SLIDES
      // ======================================================================
      // Top-Right Logo: x=816, y=pageHeight - 67.2, w=115.2, h=67.2
      if (cornerLogoImage) {
        page.drawImage(cornerLogoImage, {
          x: 816,
          y: pageHeight - 67,
          width: 115,
          height: 67,
        });
      }

      // Bottom Footer Bar: x=0, y=0, w=pageWidth, h=38.4, clr=#003366
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: 38.4,
        color: footerBarRgb,
      });

      // Side-Heading
      const sideHeading = (s.title || "CONTENT SLIDE").toUpperCase();
      page.drawText(sideHeading.substring(0, 52), {
        x: 48,
        y: pageHeight - 79,
        size: 21,
        font: fontHelveticaBold,
        color: sideHeadingRgb,
      });

      if (s.layout === "index") {
        // INDEX SLIDE
        const items = s.bulletPoints || [];
        let curY = pageHeight - 144;
        items.forEach((item) => {
          page.drawText(item.substring(0, 56), {
            x: 48,
            y: curY,
            size: 15.5,
            font: fontHelvetica,
            color: bodyTextRgb,
          });
          curY -= 36;
        });
      } else if (s.layout === "paragraph") {
        // INTRODUCTION OR CONCLUSION
        const paragraphText =
          s.paragraph ||
          s.bulletPoints?.join(" ") ||
          "";

        page.drawText(paragraphText, {
          x: 48,
          y: pageHeight - 144,
          size: 14.5,
          font: fontHelvetica,
          color: bodyTextRgb,
          maxWidth: pageWidth - 96,
          lineHeight: 26,
        });
      } else {
        // 8 CORE TECHNICAL SLIDES
        const bullets = (s.bulletPoints || []).slice(0, 5);
        let bY = pageHeight - 144;
        bullets.forEach((b) => {
          page.drawText(`•  ${b}`, {
            x: 48,
            y: bY,
            size: 13.5,
            font: fontHelvetica,
            color: bodyTextRgb,
            maxWidth: pageWidth - 96,
            lineHeight: 20,
          });
          bY -= 56;
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
