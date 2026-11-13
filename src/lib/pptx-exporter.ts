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

  const theme = PPT_THEMES[presentation.themeId] || PPT_THEMES.neon;
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

    // 2. Top Accent Glow Bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: "100%",
      h: 0.1,
      fill: { color: cleanAccent },
      line: { color: cleanAccent, width: 0 },
    });

    // 3. Embedded Native PowerPoint Speaker Notes Pane
    if (s.speakerNotes) {
      slide.addNotes(s.speakerNotes);
    }

    // 4. Slide Footer (Slide Number + Presenter / College credits)
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

    // 5. Layout Rendering
    if (s.layout === "title") {
      // TITLE SLIDE
      // Decorative glowing badge
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
    } else {
      // STANDARD SLIDES (Header)
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

  const theme = PPT_THEMES[presentation.themeId] || PPT_THEMES.neon;
  const bgRgb = hexToPdfRgb(theme.bgHex);
  const cardRgb = hexToPdfRgb(theme.cardBgHex);
  const textRgb = hexToPdfRgb(theme.textHex);
  const subtextRgb = hexToPdfRgb(theme.subtextHex);
  const accentRgb = hexToPdfRgb(theme.primaryAccentHex);
  const accent2Rgb = hexToPdfRgb(theme.secondaryAccentHex);
  const borderRgb = hexToPdfRgb(theme.borderHex);

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

    // 2. Top Accent Glow Bar
    page.drawRectangle({
      x: 0,
      y: pageHeight - 8,
      width: pageWidth,
      height: 8,
      color: accentRgb,
    });

    // 3. Slide Number & Footer
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

    if (s.layout === "title") {
      // TITLE SLIDE
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
    } else {
      // STANDARD SLIDE HEADER
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
