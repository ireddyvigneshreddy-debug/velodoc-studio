import pptxgen from "pptxgenjs";
import { TechTalkPresentation } from "@/types/ppt";
import { PPT_THEMES } from "@/lib/ppt-themes";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { hexToPdfRgb } from "@/lib/pdf-engine";

/**
 * 1. Export 16:9 PowerPoint (.pptx) with embedded Speaker Notes & Themed Layouts
 */
export async function exportToPptx(presentation: TechTalkPresentation): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9"; // 10 x 5.625 inches
  pptx.title = presentation.topic;
  pptx.subject = "College Tech-Talk Presentation";
  pptx.author = presentation.presenterName || "VeloDoc Studio";
  pptx.company = presentation.collegeName || "Dept. of Computer Science";

  const isIare = Boolean(presentation.iareMetadata?.isIareMode || presentation.themeId === "iare");
  const iare = presentation.iareMetadata;

  const theme = isIare ? PPT_THEMES.iare : (PPT_THEMES[presentation.themeId] || PPT_THEMES.neon);
  const cleanBg = theme.bgHex.replace("#", "");
  const cleanCardBg = theme.cardBgHex.replace("#", "");
  const cleanText = theme.textHex.replace("#", "");
  const cleanSubtext = theme.subtextHex.replace("#", "");
  const cleanAccent = theme.primaryAccentHex.replace("#", "");
  const cleanAccent2 = theme.secondaryAccentHex.replace("#", "");
  const cleanBorder = theme.borderHex.replace("#", "");

  for (const s of presentation.slides) {
    const slide = pptx.addSlide();

    // 1. Background color fill
    slide.background = { color: cleanBg };

    // 2. Embedded Native PowerPoint Speaker Notes Pane
    if (s.speakerNotes) {
      slide.addNotes(s.speakerNotes);
    }

    // 3. Top Accent / Header Strip & Footer Rules
    if (isIare) {
      // Top Maroon Accent Bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: "100%",
        h: 0.08,
        fill: { color: "8B0000" },
        line: { color: "8B0000", width: 0 },
      });

      // Bottom Master Footer on non-title slides
      if (s.layout !== "title") {
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.6,
          y: 5.12,
          w: 8.8,
          h: 0.015,
          fill: { color: "CBD5E1" },
          line: { color: "CBD5E1", width: 0 },
        });

        slide.addText(`${iare?.rollNumber || ""} — ${iare?.studentName || presentation.presenterName}`, {
          x: 0.6,
          y: 5.18,
          w: 3.6,
          h: 0.3,
          fontSize: 8.5,
          fontFace: "Arial",
          color: "475569",
        });

        slide.addText(presentation.topic.substring(0, 48), {
          x: 3.8,
          y: 5.18,
          w: 3.4,
          h: 0.3,
          fontSize: 8.5,
          fontFace: "Arial",
          color: "64748B",
          align: "center",
        });

        slide.addText(`Slide ${s.slideNumber} of ${presentation.slides.length}`, {
          x: 7.8,
          y: 5.18,
          w: 1.6,
          h: 0.3,
          fontSize: 8.5,
          fontFace: "Arial",
          bold: true,
          color: "002147",
          align: "right",
        });
      }
    } else {
      // Top Accent Glow Bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: "100%",
        h: 0.1,
        fill: { color: cleanAccent },
        line: { color: cleanAccent, width: 0 },
      });

      // Slide Footer (Slide Number + Presenter / College credits)
      slide.addText(`${s.slideNumber} / ${presentation.slides.length}`, {
        x: 8.8,
        y: 5.15,
        w: 1.0,
        h: 0.35,
        fontSize: 10,
        fontFace: "Arial",
        color: cleanSubtext,
        align: "right",
      });

      if (presentation.collegeName || presentation.presenterName) {
        const footerCredit = [presentation.presenterName, presentation.collegeName].filter(Boolean).join(" • ");
        slide.addText(footerCredit, {
          x: 0.6,
          y: 5.15,
          w: 6.5,
          h: 0.35,
          fontSize: 9,
          fontFace: "Arial",
          color: cleanSubtext,
        });
      }
    }

    // 4. Layout Rendering
    if (s.layout === "title") {
      if (isIare) {
        // OFFICIAL IARE TITLE COVER SLIDE
        let textStartX = 0.6;
        let textWidth = 8.8;

        if (iare?.customLogoBase64) {
          try {
            slide.addImage({
              data: iare.customLogoBase64,
              x: 0.6,
              y: 0.28,
              w: 1.15,
              h: 1.15,
            });
            textStartX = 1.95;
            textWidth = 7.45;
          } catch {
            // fallback
          }
        }

        slide.addText("INSTITUTE OF AERONAUTICAL ENGINEERING", {
          x: textStartX,
          y: 0.28,
          w: textWidth,
          h: 0.35,
          fontSize: 15,
          fontFace: "Georgia",
          bold: true,
          color: "8B0000",
        });

        slide.addText("(Autonomous)", {
          x: textStartX,
          y: 0.6,
          w: textWidth,
          h: 0.24,
          fontSize: 11,
          fontFace: "Arial",
          bold: true,
          color: "002147",
        });

        slide.addText("Dundigal, Hyderabad - 500 043, Telangana", {
          x: textStartX,
          y: 0.82,
          w: textWidth,
          h: 0.22,
          fontSize: 9,
          fontFace: "Arial",
          color: "475569",
        });

        slide.addText(`DEPARTMENT OF ${(iare?.department || "COMPUTER SCIENCE AND ENGINEERING").toUpperCase()}`, {
          x: textStartX,
          y: 1.05,
          w: textWidth,
          h: 0.3,
          fontSize: 10.5,
          fontFace: "Arial",
          bold: true,
          color: "8B0000",
        });

        // Double Horizontal Rule (Maroon + Gold)
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.6,
          y: 1.42,
          w: 8.8,
          h: 0.035,
          fill: { color: "8B0000" },
          line: { color: "8B0000", width: 0 },
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.6,
          y: 1.47,
          w: 8.8,
          h: 0.02,
          fill: { color: "D97706" },
          line: { color: "D97706", width: 0 },
        });

        // Assessment Pill Badge
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6,
          y: 1.62,
          w: 4.4,
          h: 0.32,
          fill: { color: "FEF3C7" },
          line: { color: "D97706", width: 1 },
          rectRadius: 0.08,
        });
        slide.addText(`[ ${(iare?.assessmentType || "AAT-I TECH TALK").toUpperCase()} PRESENTATION ]`, {
          x: 0.6,
          y: 1.63,
          w: 4.4,
          h: 0.3,
          fontSize: 9.5,
          fontFace: "Arial",
          bold: true,
          color: "8B0000",
          align: "center",
        });

        // Large Topic Title
        slide.addText(s.title, {
          x: 0.6,
          y: 2.05,
          w: 8.8,
          h: 1.0,
          fontSize: 23,
          fontFace: "Arial",
          bold: true,
          color: "002147",
          valign: "top",
        });

        // Course block
        slide.addText(`Course: ${iare?.courseName || ""} (${iare?.courseCode || ""}) • ${iare?.semesterRegulation || ""}`, {
          x: 0.6,
          y: 3.1,
          w: 8.8,
          h: 0.3,
          fontSize: 10.5,
          fontFace: "Arial",
          bold: true,
          color: "334155",
        });

        // 2-Column Metadata Box at Bottom
        const boxY = 3.52;
        const boxH = 1.48;
        const boxW = 4.25;

        // Left box: Presented By
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6,
          y: boxY,
          w: boxW,
          h: boxH,
          fill: { color: "F8FAFC" },
          line: { color: "CBD5E1", width: 1 },
          rectRadius: 0.08,
        });
        slide.addText("PRESENTED BY:", {
          x: 0.8,
          y: boxY + 0.12,
          w: boxW - 0.4,
          h: 0.25,
          fontSize: 9.5,
          fontFace: "Arial",
          bold: true,
          color: "8B0000",
        });
        const studentInfo = [
          `Student Name: ${iare?.studentName || presentation.presenterName}`,
          `Roll Number: ${iare?.rollNumber || "24951A05XX"}`,
          `Department: ${iare?.department || "CSE"}`,
        ].join("\n");
        slide.addText(studentInfo, {
          x: 0.8,
          y: boxY + 0.38,
          w: boxW - 0.4,
          h: 0.95,
          fontSize: 10,
          fontFace: "Arial",
          color: "0F172A",
          lineSpacing: 16,
        });

        // Right box: Evaluated By
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 5.15,
          y: boxY,
          w: boxW,
          h: boxH,
          fill: { color: "F8FAFC" },
          line: { color: "CBD5E1", width: 1 },
          rectRadius: 0.08,
        });
        slide.addText("COURSE COORDINATOR / EVALUATED BY:", {
          x: 5.35,
          y: boxY + 0.12,
          w: boxW - 0.4,
          h: 0.25,
          fontSize: 9.5,
          fontFace: "Arial",
          bold: true,
          color: "002147",
        });
        const facultyInfo = [
          `Faculty Name: ${iare?.facultyName || "Course Coordinator"}`,
          `Department of ${iare?.department || "CSE"}`,
          "IARE (Autonomous), Dundigal, Hyderabad",
        ].join("\n");
        slide.addText(facultyInfo, {
          x: 5.35,
          y: boxY + 0.38,
          w: boxW - 0.4,
          h: 0.95,
          fontSize: 10,
          fontFace: "Arial",
          color: "0F172A",
          lineSpacing: 16,
        });
      } else {
        // GENERAL TITLE SLIDE
        slide.addText(s.category || "COLLEGE TECHNICAL SEMINAR", {
          x: 0.8,
          y: 0.8,
          w: 8.4,
          h: 0.35,
          fontSize: 11,
          fontFace: "Arial",
          color: cleanAccent2,
          bold: true,
          charSpacing: 2,
        });

        slide.addText(s.title, {
          x: 0.8,
          y: 1.25,
          w: 8.4,
          h: 1.6,
          fontSize: 32,
          fontFace: "Arial",
          color: cleanText,
          bold: true,
          valign: "top",
        });

        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 0.8,
            y: 2.9,
            w: 8.4,
            h: 0.8,
            fontSize: 15,
            fontFace: "Arial",
            color: cleanSubtext,
            valign: "top",
          });
        }

        // Presenter Info Card at Bottom
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 3.8,
          w: 8.4,
          h: 1.15,
          fill: { color: cleanCardBg },
          line: { color: cleanBorder, width: 1 },
          rectRadius: 0.1,
        });

        const presenterText = [
          `Lead Presenter: ${presentation.presenterName || "Student Presenter"}`,
          `Institution: ${presentation.collegeName || "Dept. of Computer Science & Engineering"}`,
          `Academic Forum: ${presentation.eventName || "Technical Seminar 2026"}`,
        ].join("\n");

        slide.addText(presenterText, {
          x: 1.0,
          y: 3.9,
          w: 8.0,
          h: 0.95,
          fontSize: 11,
          fontFace: "Arial",
          color: cleanText,
          lineSpacing: 18,
        });
      }
    } else {
      // STANDARD CONTENT SLIDES
      if (isIare) {
        // IARE MASTER CONTENT HEADER STRIP
        const shortDept = (iare?.department || "CSE").replace(/\s*\(.*\)/, "");
        slide.addText(`IARE (Autonomous) • Dept. of ${shortDept}`, {
          x: 0.6,
          y: 0.16,
          w: 5.0,
          h: 0.22,
          fontSize: 9,
          fontFace: "Arial",
          bold: true,
          color: "8B0000",
        });

        slide.addText(`${iare?.assessmentType || "Tech Talk"} — ${iare?.courseCode || ""}`, {
          x: 5.6,
          y: 0.16,
          w: 3.8,
          h: 0.22,
          fontSize: 9,
          fontFace: "Arial",
          color: "475569",
          align: "right",
        });

        slide.addShape(pptx.ShapeType.rect, {
          x: 0.6,
          y: 0.42,
          w: 8.8,
          h: 0.015,
          fill: { color: "CBD5E1" },
          line: { color: "CBD5E1", width: 0 },
        });

        // Left accent bar
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.6,
          y: 0.54,
          w: 0.08,
          h: 0.42,
          fill: { color: "8B0000" },
          line: { color: "8B0000", width: 0 },
        });

        slide.addText(s.title, {
          x: 0.78,
          y: 0.5,
          w: 8.6,
          h: 0.5,
          fontSize: 20,
          fontFace: "Arial",
          bold: true,
          color: "002147",
          valign: "top",
        });

        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 0.78,
            y: 1.0,
            w: 8.6,
            h: 0.35,
            fontSize: 10.5,
            fontFace: "Arial",
            color: "475569",
            valign: "top",
          });
        }
      } else {
        // NON-IARE STANDARD HEADER
        slide.addText((s.category || "TECH TALK").toUpperCase(), {
          x: 0.8,
          y: 0.35,
          w: 8.4,
          h: 0.3,
          fontSize: 10,
          fontFace: "Arial",
          color: cleanAccent,
          bold: true,
          charSpacing: 2,
        });

        slide.addText(s.title, {
          x: 0.8,
          y: 0.65,
          w: 8.4,
          h: 0.6,
          fontSize: 22,
          fontFace: "Arial",
          color: cleanText,
          bold: true,
          valign: "top",
        });

        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 0.8,
            y: 1.25,
            w: 8.4,
            h: 0.4,
            fontSize: 11,
            fontFace: "Arial",
            color: cleanSubtext,
            valign: "top",
          });
        }
      }

      // SLIDE BODY BY LAYOUT
      if (s.layout === "three-card" && s.cards && s.cards.length > 0) {
        const cardW = 2.65;
        const gap = 0.22;
        const startX = 0.8;
        const yPos = 1.75;
        const cardH = 3.15;

        s.cards.slice(0, 3).forEach((card, idx) => {
          const x = startX + idx * (cardW + gap);
          slide.addShape(pptx.ShapeType.roundRect, {
            x,
            y: yPos,
            w: cardW,
            h: cardH,
            fill: { color: cleanCardBg },
            line: { color: cleanBorder, width: 1 },
            rectRadius: 0.1,
          });

          if (card.tag) {
            slide.addText(card.tag.toUpperCase(), {
              x: x + 0.2,
              y: yPos + 0.2,
              w: cardW - 0.4,
              h: 0.3,
              fontSize: 9,
              fontFace: "Arial",
              color: cleanAccent2,
              bold: true,
            });
          }

          slide.addText(card.title, {
            x: x + 0.2,
            y: yPos + 0.55,
            w: cardW - 0.4,
            h: 0.65,
            fontSize: 14,
            fontFace: "Arial",
            color: cleanText,
            bold: true,
            valign: "top",
          });

          slide.addText(card.text, {
            x: x + 0.2,
            y: yPos + 1.25,
            w: cardW - 0.4,
            h: 1.65,
            fontSize: 10.5,
            fontFace: "Arial",
            color: cleanSubtext,
            valign: "top",
            lineSpacing: 16,
          });
        });
      } else if (s.layout === "process-flow" && s.processSteps && s.processSteps.length > 0) {
        const stepW = 1.95;
        const gap = 0.2;
        const startX = 0.8;
        const yPos = 2.0;
        const stepH = 2.8;

        s.processSteps.slice(0, 4).forEach((step, idx) => {
          const x = startX + idx * (stepW + gap);
          slide.addShape(pptx.ShapeType.roundRect, {
            x,
            y: yPos,
            w: stepW,
            h: stepH,
            fill: { color: cleanCardBg },
            line: { color: cleanBorder, width: 1 },
            rectRadius: 0.1,
          });

          // Step circle badge
          slide.addShape(pptx.ShapeType.ellipse, {
            x: x + 0.2,
            y: yPos + 0.2,
            w: 0.4,
            h: 0.4,
            fill: { color: cleanAccent },
            line: { color: cleanAccent, width: 0 },
          });

          slide.addText(step.step.toString(), {
            x: x + 0.2,
            y: yPos + 0.2,
            w: 0.4,
            h: 0.4,
            fontSize: 11,
            fontFace: "Arial",
            color: "FFFFFF",
            bold: true,
            align: "center",
            valign: "middle",
          });

          slide.addText(step.title, {
            x: x + 0.2,
            y: yPos + 0.75,
            w: stepW - 0.4,
            h: 0.65,
            fontSize: 12.5,
            fontFace: "Arial",
            color: cleanText,
            bold: true,
            valign: "top",
          });

          slide.addText(step.desc, {
            x: x + 0.2,
            y: yPos + 1.45,
            w: stepW - 0.4,
            h: 1.25,
            fontSize: 9.5,
            fontFace: "Arial",
            color: cleanSubtext,
            valign: "top",
            lineSpacing: 14,
          });
        });
      } else if (s.layout === "comparison-table" && s.table) {
        // Table layout
        const tableRows: pptxgen.TableRow[] = [];

        // Headers
        tableRows.push(
          s.table.headers.map((h) => ({
            text: h,
            options: {
              fill: { color: cleanAccent },
              color: "FFFFFF",
              bold: true,
              fontSize: 11,
              fontFace: "Arial",
              align: "left",
            },
          }))
        );

        // Body rows
        s.table.rows.forEach((row, rIdx) => {
          tableRows.push(
            row.map((cell) => ({
              text: cell,
              options: {
                fill: { color: rIdx % 2 === 0 ? cleanCardBg : cleanBg },
                color: cleanText,
                fontSize: 10,
                fontFace: "Arial",
                lineSpacing: 14,
              },
            }))
          );
        });

        slide.addTable(tableRows, {
          x: 0.8,
          y: 1.75,
          w: 8.4,
          colW: [2.2, 3.1, 3.1],
          border: { color: cleanBorder, pt: 1 },
        });
      } else if (s.layout === "code-algorithm" && s.codeSnippet) {
        // Code snippet layout
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 1.75,
          w: 8.4,
          h: 3.1,
          fill: { color: "050811" },
          line: { color: cleanAccent, width: 1.5 },
          rectRadius: 0.1,
        });

        slide.addText(`// ${s.codeSnippet.caption || "Core Algorithm Implementation"} (${s.codeSnippet.language})`, {
          x: 1.1,
          y: 1.9,
          w: 7.8,
          h: 0.35,
          fontSize: 10,
          fontFace: "Courier New",
          color: cleanAccent2,
          bold: true,
        });

        slide.addText(s.codeSnippet.code, {
          x: 1.1,
          y: 2.3,
          w: 7.8,
          h: 2.35,
          fontSize: 9.5,
          fontFace: "Courier New",
          color: "E2E8F0",
          valign: "top",
          lineSpacing: 14,
        });
      } else if (s.layout === "metric-highlight" && s.metric) {
        // Big Metric Highlight Card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 1.75,
          w: 4.0,
          h: 3.1,
          fill: { color: cleanCardBg },
          line: { color: cleanAccent, width: 1.5 },
          rectRadius: 0.1,
        });

        slide.addText(s.metric.value, {
          x: 1.0,
          y: 2.0,
          w: 3.6,
          h: 1.0,
          fontSize: 44,
          fontFace: "Arial",
          color: cleanAccent2,
          bold: true,
          valign: "middle",
        });

        slide.addText(s.metric.label, {
          x: 1.0,
          y: 3.1,
          w: 3.6,
          h: 0.65,
          fontSize: 13,
          fontFace: "Arial",
          color: cleanText,
          bold: true,
          valign: "top",
        });

        slide.addText(s.metric.context, {
          x: 1.0,
          y: 3.8,
          w: 3.6,
          h: 0.9,
          fontSize: 10,
          fontFace: "Arial",
          color: cleanSubtext,
          valign: "top",
        });

        // Right side bullets
        if (s.bulletPoints && s.bulletPoints.length > 0) {
          const bulletText = s.bulletPoints.map((b) => `•  ${b}`).join("\n\n");
          slide.addText(bulletText, {
            x: 5.1,
            y: 1.85,
            w: 4.1,
            h: 3.0,
            fontSize: 11,
            fontFace: "Arial",
            color: cleanText,
            valign: "top",
            lineSpacing: 18,
          });
        }
      } else {
        // TWO-COLUMN OR DEFAULT BULLETS
        if (s.columns && s.columns.length >= 2) {
          const colW = 4.05;
          const gap = 0.3;
          s.columns.slice(0, 2).forEach((col, idx) => {
            const x = 0.8 + idx * (colW + gap);
            slide.addShape(pptx.ShapeType.roundRect, {
              x,
              y: 1.75,
              w: colW,
              h: 3.1,
              fill: { color: cleanCardBg },
              line: { color: cleanBorder, width: 1 },
              rectRadius: 0.1,
            });

            slide.addText(col.title, {
              x: x + 0.3,
              y: 1.95,
              w: colW - 0.6,
              h: 0.45,
              fontSize: 13,
              fontFace: "Arial",
              color: cleanAccent,
              bold: true,
            });

            const bullets = col.bullets.map((b) => `•  ${b}`).join("\n\n");
            slide.addText(bullets, {
              x: x + 0.3,
              y: 2.45,
              w: colW - 0.6,
              h: 2.2,
              fontSize: 10.5,
              fontFace: "Arial",
              color: cleanText,
              valign: "top",
              lineSpacing: 16,
            });
          });
        } else if (s.bulletPoints && s.bulletPoints.length > 0) {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: 1.75,
            w: 8.4,
            h: 3.1,
            fill: { color: cleanCardBg },
            line: { color: cleanBorder, width: 1 },
            rectRadius: 0.1,
          });

          const bullets = s.bulletPoints.map((b) => `•  ${b}`).join("\n\n");
          slide.addText(bullets, {
            x: 1.1,
            y: 2.0,
            w: 7.8,
            h: 2.6,
            fontSize: 12,
            fontFace: "Arial",
            color: cleanText,
            valign: "top",
            lineSpacing: 20,
          });
        }
      }
    }
  }

  const safeName = presentation.topic.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 32);
  await pptx.writeFile({ fileName: `${safeName}-TechTalk.pptx` });
}

/**
 * 2. Export 16:9 PDF Slide Deck via pdf-lib
 */
export async function exportToPdfDeck(presentation: TechTalkPresentation): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const isIare = Boolean(presentation.iareMetadata?.isIareMode || presentation.themeId === "iare");
  const iare = presentation.iareMetadata;

  const theme = isIare ? PPT_THEMES.iare : (PPT_THEMES[presentation.themeId] || PPT_THEMES.neon);
  const bgRgb = hexToPdfRgb(theme.bgHex);
  const cardRgb = hexToPdfRgb(theme.cardBgHex);
  const textRgb = hexToPdfRgb(theme.textHex);
  const subtextRgb = hexToPdfRgb(theme.subtextHex);
  const accentRgb = hexToPdfRgb(theme.primaryAccentHex);
  const accent2Rgb = hexToPdfRgb(theme.secondaryAccentHex);
  const borderRgb = hexToPdfRgb(theme.borderHex);

  const maroonRgb = hexToPdfRgb("#8B0000");
  const navyRgb = hexToPdfRgb("#002147");
  const goldRgb = hexToPdfRgb("#D97706");
  const goldPillBgRgb = hexToPdfRgb("#FEF3C7");
  const slateCardRgb = hexToPdfRgb("#F8FAFC");
  const slateBorderRgb = hexToPdfRgb("#CBD5E1");

  // 16:9 widescreen dimensions in points (960 x 540)
  const pageWidth = 960;
  const pageHeight = 540;

  for (const s of presentation.slides) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // 1. Background fill
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: bgRgb,
    });

    // 2. Top Accent / Header Rules
    if (isIare) {
      page.drawRectangle({
        x: 0,
        y: pageHeight - 6,
        width: pageWidth,
        height: 6,
        color: maroonRgb,
      });

      // Bottom Master Footer on non-title slides
      if (s.layout !== "title") {
        page.drawRectangle({
          x: 45,
          y: 35,
          width: pageWidth - 90,
          height: 1,
          color: slateBorderRgb,
        });

        page.drawText(`${iare?.rollNumber || ""} — ${iare?.studentName || presentation.presenterName}`, {
          x: 45,
          y: 18,
          size: 8.5,
          font: fontHelvetica,
          color: subtextRgb,
        });

        page.drawText(presentation.topic.substring(0, 50), {
          x: 360,
          y: 18,
          size: 8.5,
          font: fontHelvetica,
          color: subtextRgb,
        });

        page.drawText(`Slide ${s.slideNumber} of ${presentation.slides.length}`, {
          x: pageWidth - 110,
          y: 18,
          size: 8.5,
          font: fontHelveticaBold,
          color: navyRgb,
        });
      }
    } else {
      page.drawRectangle({
        x: 0,
        y: pageHeight - 8,
        width: pageWidth,
        height: 8,
        color: accentRgb,
      });

      page.drawText(`${s.slideNumber} / ${presentation.slides.length}`, {
        x: pageWidth - 80,
        y: 20,
        size: 9,
        font: fontHelvetica,
        color: subtextRgb,
      });

      const footerText = [presentation.presenterName, presentation.collegeName].filter(Boolean).join(" • ");
      if (footerText) {
        page.drawText(footerText.substring(0, 75), {
          x: 45,
          y: 20,
          size: 9,
          font: fontHelvetica,
          color: subtextRgb,
        });
      }
    }

    if (s.layout === "title") {
      if (isIare) {
        // OFFICIAL IARE TITLE COVER SLIDE
        page.drawText("INSTITUTE OF AERONAUTICAL ENGINEERING", {
          x: 45,
          y: pageHeight - 48,
          size: 16,
          font: fontHelveticaBold,
          color: maroonRgb,
        });

        page.drawText("(Autonomous)", {
          x: 45,
          y: pageHeight - 68,
          size: 11,
          font: fontHelveticaBold,
          color: navyRgb,
        });

        page.drawText("Dundigal, Hyderabad - 500 043, Telangana", {
          x: 45,
          y: pageHeight - 85,
          size: 9.5,
          font: fontHelvetica,
          color: subtextRgb,
        });

        page.drawText(`DEPARTMENT OF ${(iare?.department || "COMPUTER SCIENCE AND ENGINEERING").toUpperCase()}`, {
          x: 45,
          y: pageHeight - 105,
          size: 11,
          font: fontHelveticaBold,
          color: maroonRgb,
        });

        // Double Horizontal Rule
        page.drawRectangle({
          x: 45,
          y: pageHeight - 118,
          width: pageWidth - 90,
          height: 3,
          color: maroonRgb,
        });
        page.drawRectangle({
          x: 45,
          y: pageHeight - 123,
          width: pageWidth - 90,
          height: 2,
          color: goldRgb,
        });

        // Assessment Pill Badge
        page.drawRectangle({
          x: 45,
          y: pageHeight - 156,
          width: 330,
          height: 22,
          color: goldPillBgRgb,
          borderColor: goldRgb,
          borderWidth: 1,
        });
        page.drawText(`[ ${(iare?.assessmentType || "AAT-I TECH TALK").toUpperCase()} PRESENTATION ]`, {
          x: 55,
          y: pageHeight - 149,
          size: 9.5,
          font: fontHelveticaBold,
          color: maroonRgb,
        });

        // Large Topic Title
        page.drawText(s.title.substring(0, 52), {
          x: 45,
          y: pageHeight - 192,
          size: 23,
          font: fontHelveticaBold,
          color: navyRgb,
        });

        // Course block
        page.drawText(`Course: ${iare?.courseName || ""} (${iare?.courseCode || ""}) • ${iare?.semesterRegulation || ""}`, {
          x: 45,
          y: pageHeight - 218,
          size: 11,
          font: fontHelveticaBold,
          color: hexToPdfRgb("#334155"),
        });

        // 2-Column Metadata Box at Bottom
        const boxY = 65;
        const boxH = 135;
        const boxW = 415;

        // Left box (Presented By)
        page.drawRectangle({
          x: 45,
          y: boxY,
          width: boxW,
          height: boxH,
          color: slateCardRgb,
          borderColor: slateBorderRgb,
          borderWidth: 1,
        });
        page.drawText("PRESENTED BY:", {
          x: 65,
          y: boxY + boxH - 25,
          size: 10,
          font: fontHelveticaBold,
          color: maroonRgb,
        });
        page.drawText(`Student Name: ${iare?.studentName || presentation.presenterName}`, {
          x: 65,
          y: boxY + boxH - 52,
          size: 10.5,
          font: fontHelveticaBold,
          color: textRgb,
        });
        page.drawText(`Roll Number: ${iare?.rollNumber || "24951A05XX"}`, {
          x: 65,
          y: boxY + boxH - 74,
          size: 10,
          font: fontHelvetica,
          color: textRgb,
        });
        page.drawText(`Department: ${iare?.department || "CSE"}`, {
          x: 65,
          y: boxY + boxH - 96,
          size: 9.5,
          font: fontHelvetica,
          color: subtextRgb,
        });

        // Right box (Evaluated By)
        page.drawRectangle({
          x: 500,
          y: boxY,
          width: boxW,
          height: boxH,
          color: slateCardRgb,
          borderColor: slateBorderRgb,
          borderWidth: 1,
        });
        page.drawText("COURSE COORDINATOR / EVALUATED BY:", {
          x: 520,
          y: boxY + boxH - 25,
          size: 10,
          font: fontHelveticaBold,
          color: navyRgb,
        });
        page.drawText(`Faculty: ${iare?.facultyName || "Course Coordinator"}`, {
          x: 520,
          y: boxY + boxH - 52,
          size: 10.5,
          font: fontHelveticaBold,
          color: textRgb,
        });
        page.drawText(`Department of ${iare?.department || "CSE"}`, {
          x: 520,
          y: boxY + boxH - 74,
          size: 10,
          font: fontHelvetica,
          color: textRgb,
        });
        page.drawText("IARE (Autonomous), Dundigal, Hyderabad", {
          x: 520,
          y: boxY + boxH - 96,
          size: 9.5,
          font: fontHelvetica,
          color: subtextRgb,
        });
      } else {
        // NON-IARE TITLE SLIDE
        page.drawText((s.category || "COLLEGE TECHNICAL SEMINAR").toUpperCase(), {
          x: 45,
          y: pageHeight - 65,
          size: 11,
          font: fontHelveticaBold,
          color: accent2Rgb,
        });

        page.drawText(s.title.substring(0, 52), {
          x: 45,
          y: pageHeight - 120,
          size: 30,
          font: fontHelveticaBold,
          color: textRgb,
        });

        if (s.subtitle) {
          page.drawText(s.subtitle.substring(0, 85), {
            x: 45,
            y: pageHeight - 155,
            size: 14,
            font: fontHelvetica,
            color: subtextRgb,
          });
        }

        // Presenter card
        page.drawRectangle({
          x: 45,
          y: 80,
          width: pageWidth - 90,
          height: 120,
          color: cardRgb,
          borderColor: borderRgb,
          borderWidth: 1,
        });

        page.drawText(`Lead Presenter: ${presentation.presenterName || "Student Presenter"}`, {
          x: 65,
          y: 165,
          size: 11,
          font: fontHelveticaBold,
          color: textRgb,
        });

        page.drawText(`Institution: ${presentation.collegeName || "Dept. of Computer Science & Engineering"}`, {
          x: 65,
          y: 140,
          size: 10,
          font: fontHelvetica,
          color: subtextRgb,
        });

        page.drawText(`Academic Forum: ${presentation.eventName || "Technical Seminar 2026"}`, {
          x: 65,
          y: 115,
          size: 10,
          font: fontHelvetica,
          color: subtextRgb,
        });
      }
    } else {
      if (isIare) {
        // IARE MASTER CONTENT HEADER STRIP
        const shortDept = (iare?.department || "CSE").replace(/\s*\(.*\)/, "");
        page.drawText(`IARE (Autonomous) • Dept. of ${shortDept}`, {
          x: 45,
          y: pageHeight - 24,
          size: 9,
          font: fontHelveticaBold,
          color: maroonRgb,
        });

        page.drawText(`${iare?.assessmentType || "Tech Talk"} — ${iare?.courseCode || ""}`, {
          x: pageWidth - 260,
          y: pageHeight - 24,
          size: 9,
          font: fontHelvetica,
          color: subtextRgb,
        });

        page.drawRectangle({
          x: 45,
          y: pageHeight - 32,
          width: pageWidth - 90,
          height: 1,
          color: slateBorderRgb,
        });

        // Left accent bar
        page.drawRectangle({
          x: 45,
          y: pageHeight - 64,
          width: 5,
          height: 24,
          color: maroonRgb,
        });

        page.drawText(s.title.substring(0, 60), {
          x: 58,
          y: pageHeight - 60,
          size: 20,
          font: fontHelveticaBold,
          color: navyRgb,
        });

        if (s.subtitle) {
          page.drawText(s.subtitle.substring(0, 95), {
            x: 58,
            y: pageHeight - 80,
            size: 10.5,
            font: fontHelvetica,
            color: subtextRgb,
          });
        }
      } else {
        // NON-IARE STANDARD SLIDE HEADER
        page.drawText((s.category || "TECH TALK").toUpperCase(), {
          x: 45,
          y: pageHeight - 45,
          size: 9.5,
          font: fontHelveticaBold,
          color: accentRgb,
        });

        page.drawText(s.title.substring(0, 60), {
          x: 45,
          y: pageHeight - 75,
          size: 20,
          font: fontHelveticaBold,
          color: textRgb,
        });

        if (s.subtitle) {
          page.drawText(s.subtitle.substring(0, 95), {
            x: 45,
            y: pageHeight - 95,
            size: 11,
            font: fontHelvetica,
            color: subtextRgb,
          });
        }
      }

      // SLIDE BODY
      if (s.layout === "three-card" && s.cards && s.cards.length > 0) {
        const cardW = 275;
        const gap = 22;
        const startX = 45;
        const yPos = 80;
        const cardH = 320;

        s.cards.slice(0, 3).forEach((card, idx) => {
          const x = startX + idx * (cardW + gap);
          page.drawRectangle({
            x,
            y: yPos,
            width: cardW,
            height: cardH,
            color: cardRgb,
            borderColor: borderRgb,
            borderWidth: 1,
          });

          if (card.tag) {
            page.drawText(card.tag.toUpperCase(), {
              x: x + 18,
              y: yPos + cardH - 30,
              size: 8.5,
              font: fontHelveticaBold,
              color: accent2Rgb,
            });
          }

          page.drawText(card.title.substring(0, 28), {
            x: x + 18,
            y: yPos + cardH - 55,
            size: 13,
            font: fontHelveticaBold,
            color: textRgb,
          });

          page.drawText(card.text.substring(0, 140), {
            x: x + 18,
            y: yPos + cardH - 85,
            size: 9.5,
            font: fontHelvetica,
            color: subtextRgb,
            maxWidth: cardW - 36,
            lineHeight: 14,
          });
        });
      } else if (s.layout === "metric-highlight" && s.metric) {
        // Metric card
        page.drawRectangle({
          x: 45,
          y: 80,
          width: 380,
          height: 320,
          color: cardRgb,
          borderColor: accentRgb,
          borderWidth: 1.5,
        });

        page.drawText(s.metric.value, {
          x: 65,
          y: 310,
          size: 46,
          font: fontHelveticaBold,
          color: accent2Rgb,
        });

        page.drawText(s.metric.label.substring(0, 42), {
          x: 65,
          y: 270,
          size: 13,
          font: fontHelveticaBold,
          color: textRgb,
        });

        page.drawText(s.metric.context.substring(0, 160), {
          x: 65,
          y: 235,
          size: 10,
          font: fontHelvetica,
          color: subtextRgb,
          maxWidth: 340,
          lineHeight: 15,
        });

        // Right side bullets
        if (s.bulletPoints) {
          let bY = 360;
          s.bulletPoints.forEach((b) => {
            page.drawText(`•  ${b.substring(0, 75)}`, {
              x: 460,
              y: bY,
              size: 11,
              font: fontHelvetica,
              color: textRgb,
              maxWidth: 450,
              lineHeight: 16,
            });
            bY -= 45;
          });
        }
      } else if (s.columns && s.columns.length >= 2) {
        // Two columns
        const colW = 420;
        const gap = 30;
        s.columns.slice(0, 2).forEach((col, idx) => {
          const x = 45 + idx * (colW + gap);
          page.drawRectangle({
            x,
            y: 80,
            width: colW,
            height: 320,
            color: cardRgb,
            borderColor: borderRgb,
            borderWidth: 1,
          });

          page.drawText(col.title.substring(0, 40), {
            x: x + 20,
            y: 370,
            size: 13,
            font: fontHelveticaBold,
            color: accentRgb,
          });

          let bulletY = 340;
          col.bullets.forEach((b) => {
            page.drawText(`•  ${b.substring(0, 75)}`, {
              x: x + 20,
              y: bulletY,
              size: 9.5,
              font: fontHelvetica,
              color: textRgb,
              maxWidth: colW - 40,
              lineHeight: 14,
            });
            bulletY -= 38;
          });
        });
      } else {
        // Standard large card
        page.drawRectangle({
          x: 45,
          y: 80,
          width: pageWidth - 90,
          height: 320,
          color: cardRgb,
          borderColor: borderRgb,
          borderWidth: 1,
        });

        const bulletsToDraw = s.bulletPoints || [];
        let bY = 360;
        bulletsToDraw.forEach((b) => {
          page.drawText(`•  ${b.substring(0, 110)}`, {
            x: 75,
            y: bY,
            size: 11,
            font: fontHelvetica,
            color: textRgb,
            maxWidth: pageWidth - 150,
            lineHeight: 16,
          });
          bY -= 35;
        });
      }
    }
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * 3. Export Presenter Stage Cheat-Sheet (.md)
 */
export function exportToSpeakerCheatSheet(presentation: TechTalkPresentation): string {
  const lines: string[] = [];
  lines.push(`# COLLEGE TECH-TALK PRESENTER STAGE CHEAT-SHEET`);
  lines.push(`**Topic:** ${presentation.topic}`);
  lines.push(`**Presenter:** ${presentation.presenterName || "Student Presenter"}`);
  lines.push(`**Institution:** ${presentation.collegeName || "Dept. of Computer Science & Engineering"}`);
  lines.push(`**Event:** ${presentation.eventName || "Annual Technical Seminar 2026"}`);
  lines.push(`**Slide Count:** ${presentation.slides.length} Widescreen 16:9 Slides`);
  lines.push(`**Date Generated:** ${new Date().toLocaleDateString()}`);
  lines.push(`\n---\n`);

  presentation.slides.forEach((s) => {
    lines.push(`## Slide ${s.slideNumber}: ${s.title}`);
    if (s.subtitle) lines.push(`*${s.subtitle}*`);
    lines.push(`**Category:** \`${s.category || "TECH TALK"}\` | **Layout:** \`${s.layout}\`\n`);

    lines.push(`### 🎙️ WHAT TO SAY ON STAGE (VERBAL SPEAKER SCRIPT):`);
    lines.push(`> "${s.speakerNotes}"\n`);

    if (s.bulletPoints && s.bulletPoints.length > 0) {
      lines.push(`**Slide Key Points:**`);
      s.bulletPoints.forEach((b) => lines.push(`- ${b}`));
      lines.push("");
    }

    if (s.columns) {
      s.columns.forEach((col) => {
        lines.push(`**${col.title}:**`);
        col.bullets.forEach((b) => lines.push(`  - ${b}`));
      });
      lines.push("");
    }

    if (s.cards) {
      s.cards.forEach((c) => {
        lines.push(`- **[${c.tag || "CARD"}] ${c.title}:** ${c.text}`);
      });
      lines.push("");
    }

    if (s.metric) {
      lines.push(`**Metric Callout:** ${s.metric.value} — *${s.metric.label}* (${s.metric.context})\n`);
    }

    lines.push(`---\n`);
  });

  return lines.join("\n");
}
