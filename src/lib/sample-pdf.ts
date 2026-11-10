import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Generates an in-memory realistic 4-page sample PDF for 1-click testing
 */
export async function generateSamplePdf(): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(0.39, 0.4, 0.95); // Indigo
  const darkTextColor = rgb(0.08, 0.09, 0.12);
  const mutedTextColor = rgb(0.38, 0.42, 0.5);
  const cardBgColor = rgb(0.95, 0.96, 0.98);

  // --- PAGE 1: COVER ---
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width: p1W, height: p1H } = page1.getSize();

  // Decorative top banner
  page1.drawRectangle({
    x: 0,
    y: p1H - 140,
    width: p1W,
    height: 140,
    color: primaryColor,
  });

  page1.drawText("VELODOC PRO RESEARCH LABS", {
    x: 50,
    y: p1H - 60,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText("CLIENT-SIDE DOCUMENT AUTOMATION REPORT", {
    x: 50,
    y: p1H - 95,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText("Confidential • Internal Distribution Only", {
    x: 50,
    y: p1H - 120,
    size: 10,
    font: fontRegular,
    color: rgb(0.85, 0.88, 1),
  });

  // Main title
  page1.drawText("Quarterly Document Security & Performance Audit", {
    x: 50,
    y: p1H - 250,
    size: 24,
    font: fontBold,
    color: darkTextColor,
  });

  page1.drawText(
    "A comprehensive benchmark evaluation of in-memory WebAssembly document manipulation\nand client-side cryptographic verification across high-throughput enterprise pipelines.",
    {
      x: 50,
      y: p1H - 290,
      size: 12,
      font: fontRegular,
      color: mutedTextColor,
      lineHeight: 18,
    }
  );

  // Metadata Box
  page1.drawRectangle({
    x: 50,
    y: p1H - 460,
    width: p1W - 100,
    height: 120,
    color: cardBgColor,
  });

  page1.drawText("Document ID: AUD-2026-X99", {
    x: 70,
    y: p1H - 390,
    size: 11,
    font: fontBold,
    color: darkTextColor,
  });
  page1.drawText("Published: November 2026", {
    x: 70,
    y: p1H - 410,
    size: 10,
    font: fontRegular,
    color: mutedTextColor,
  });
  page1.drawText("Lead Investigator: Dr. Harrison Vance, Principal Systems Architect", {
    x: 70,
    y: p1H - 430,
    size: 10,
    font: fontRegular,
    color: mutedTextColor,
  });

  // --- PAGE 2: EXECUTIVE SUMMARY ---
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { height: p2H } = page2.getSize();

  page2.drawText("1. Executive Summary & Key Findings", {
    x: 50,
    y: p2H - 70,
    size: 18,
    font: fontBold,
    color: darkTextColor,
  });

  const summaryText =
    "In-memory processing reduces compliance risks by 100% since zero sensitive bytes are\ntransmitted across public network perimeters. Furthermore, hardware-accelerated\nArrayBuffer memory pools achieve 8.4x lower latency than traditional cloud converters.\n\nKey takeaways from the Q3 test matrix include:\n  • Zero cloud storage persistence: Files exist solely in volatile client RAM\n  • Lossless structure stripping: Removed 42% average file bloat without re-encoding\n  • Client-side signatures: Cryptographically compliant visual watermarks and stamps\n  • Unlimited scalability: Serverless architecture handles infinite concurrent workloads";

  page2.drawText(summaryText, {
    x: 50,
    y: p2H - 120,
    size: 11,
    font: fontRegular,
    color: darkTextColor,
    lineHeight: 18,
  });

  page2.drawRectangle({
    x: 50,
    y: p2H - 380,
    width: p1W - 100,
    height: 140,
    color: cardBgColor,
  });

  page2.drawText("PERFORMANCE HIGHLIGHTS", {
    x: 70,
    y: p2H - 270,
    size: 11,
    font: fontBold,
    color: primaryColor,
  });

  page2.drawText(
    "• Average Merge Speed: 215ms across 100 combined pages\n• Compression Ratio: Converged to exact target within 0.8% deviation\n• Security Posture: 0 bytes leaked to external telemetry endpoints\n• Supported Environments: Chrome, Safari, Firefox, Edge (Vercel Optimized)",
    {
      x: 70,
      y: p2H - 300,
      size: 10,
      font: fontRegular,
      color: darkTextColor,
      lineHeight: 16,
    }
  );

  // --- PAGE 3: DATA TABLE ---
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  const { height: p3H } = page3.getSize();

  page3.drawText("2. Comparative Performance Benchmarks", {
    x: 50,
    y: p3H - 70,
    size: 18,
    font: fontBold,
    color: darkTextColor,
  });

  // Table Header
  const tableTop = p3H - 120;
  page3.drawRectangle({
    x: 50,
    y: tableTop - 25,
    width: 495,
    height: 25,
    color: primaryColor,
  });

  page3.drawText("Engine Pipeline", { x: 60, y: tableTop - 18, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText("Input Size", { x: 180, y: tableTop - 18, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText("Output Size", { x: 260, y: tableTop - 18, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText("Time (ms)", { x: 350, y: tableTop - 18, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText("Privacy Status", { x: 440, y: tableTop - 18, size: 9, font: fontBold, color: rgb(1, 1, 1) });

  const rows = [
    { engine: "VeloDoc Local Core", input: "12.4 MB", output: "2.8 MB (-77%)", time: "184ms", status: "100% Local" },
    { engine: "Structural Optimizer", input: "4.2 MB", output: "1.1 MB (-74%)", time: "92ms", status: "100% Local" },
    { engine: "Exact-Target Engine", input: "8.9 MB", output: "250 KB (Exact)", time: "340ms", status: "100% Local" },
    { engine: "Image Raster Studio", input: "15.0 MB", output: "3.2 MB (-79%)", time: "260ms", status: "100% Local" },
    { engine: "Vector Watermarker", input: "6.5 MB", output: "6.5 MB (+0%)", time: "45ms", status: "100% Local" },
  ];

  rows.forEach((row, i) => {
    const y = tableTop - 50 - i * 30;
    const isAlt = i % 2 === 1;
    if (isAlt) {
      page3.drawRectangle({
        x: 50,
        y: y - 8,
        width: 495,
        height: 28,
        color: rgb(0.96, 0.97, 0.99),
      });
    }
    page3.drawText(row.engine, { x: 60, y: y, size: 9, font: fontBold, color: darkTextColor });
    page3.drawText(row.input, { x: 180, y: y, size: 9, font: fontRegular, color: mutedTextColor });
    page3.drawText(row.output, { x: 260, y: y, size: 9, font: fontBold, color: primaryColor });
    page3.drawText(row.time, { x: 350, y: y, size: 9, font: fontRegular, color: darkTextColor });
    page3.drawText(row.status, { x: 440, y: y, size: 9, font: fontBold, color: rgb(0.1, 0.65, 0.3) });
  });

  // --- PAGE 4: SIGN-OFF & COMPLIANCE ---
  const page4 = pdfDoc.addPage([595.28, 841.89]);
  const { height: p4H } = page4.getSize();

  page4.drawText("3. Authorization & Verification Sign-Off", {
    x: 50,
    y: p4H - 70,
    size: 18,
    font: fontBold,
    color: darkTextColor,
  });

  page4.drawText(
    "By reviewing this document, the compliance committee confirms that zero customer PII\nor organizational intellectual property was transferred outside the browser security context.\nAll tests adhered strictly to zero-trust architecture guidelines.",
    {
      x: 50,
      y: p4H - 110,
      size: 10,
      font: fontRegular,
      color: darkTextColor,
      lineHeight: 16,
    }
  );

  // Signature Block
  page4.drawRectangle({
    x: 50,
    y: p4H - 300,
    width: 230,
    height: 100,
    borderColor: rgb(0.8, 0.82, 0.88),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  page4.drawText("APPROVED & VERIFIED", {
    x: 65,
    y: p4H - 230,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.65, 0.3),
  });
  page4.drawText("VeloDoc Pro Verification Seal", {
    x: 65,
    y: p4H - 250,
    size: 9,
    font: fontRegular,
    color: mutedTextColor,
  });
  page4.drawText("Hash: 8f9b4c0e2a1d", {
    x: 65,
    y: p4H - 280,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.65, 0.7),
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  return new File([blob], "sample_audit_document.pdf", { type: "application/pdf" });
}
