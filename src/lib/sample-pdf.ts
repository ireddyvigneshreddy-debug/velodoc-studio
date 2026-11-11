import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Generates an in-memory realistic 4-page sample PDF for 1-click testing
 */
export async function generateSamplePdf(
  customTitle = "Quarterly Document Security & Performance Audit",
  customFilename = "sample_audit_document.pdf"
): Promise<File> {
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
  page1.drawText(customTitle, {
    x: 50,
    y: p1H - 250,
    size: 22,
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

  // --- PAGE 2: ARCHITECTURE OVERVIEW ---
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { height: p2H } = page2.getSize();

  page2.drawText("1. Client-Side Cryptographic Isolation Architecture", {
    x: 50,
    y: p2H - 70,
    size: 18,
    font: fontBold,
    color: darkTextColor,
  });

  page2.drawText(
    "The primary challenge with enterprise document handling is data sovereignty. Traditional cloud\nsolutions require transferring proprietary contracts and identity files across external networks.\nBy executing byte-level PDF transformations strictly in browser memory, zero telemetry\nor raw byte payload ever exits the local client sandbox.",
    {
      x: 50,
      y: p2H - 120,
      size: 10.5,
      font: fontRegular,
      color: darkTextColor,
      lineHeight: 17,
    }
  );

  // Feature Points
  const bulletPoints = [
    { title: "Binary-Search Canvas Compression:", desc: "Converges onto exact target KB targets in 6 iterations." },
    { title: "Controlled 2-File Concurrency:", desc: "Processes up to 30 files without crashing browser memory limits." },
    { title: "Non-Destructive Vector Retain:", desc: "Preserves sharp vector curves while optimizing embedded image streams." },
    { title: "Memory Recycling Pipeline:", desc: "Recycles canvas buffers to maintain a flat 60 FPS UI." },
  ];

  bulletPoints.forEach((point, i) => {
    const yPos = p2H - 220 - i * 55;
    page2.drawCircle({ x: 60, y: yPos + 4, size: 3.5, color: primaryColor });
    page2.drawText(point.title, { x: 75, y: yPos, size: 10.5, font: fontBold, color: darkTextColor });
    page2.drawText(point.desc, { x: 75, y: yPos - 16, size: 9.5, font: fontRegular, color: mutedTextColor });
  });

  // --- PAGE 3: BENCHMARKS ---
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  const { height: p3H } = page3.getSize();

  page3.drawText("2. Empirical Performance Metrics", {
    x: 50,
    y: p3H - 70,
    size: 18,
    font: fontBold,
    color: darkTextColor,
  });

  // Table header
  page3.drawRectangle({
    x: 50,
    y: p3H - 120,
    width: 495,
    height: 25,
    color: primaryColor,
  });

  page3.drawText("Test Scenario", { x: 60, y: p3H - 110, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText("Input Size", { x: 180, y: p3H - 110, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText("Output Size", { x: 260, y: p3H - 110, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText("Latency", { x: 350, y: p3H - 110, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page3.drawText("Accuracy", { x: 440, y: p3H - 110, size: 10, font: fontBold, color: rgb(1, 1, 1) });

  const rows = [
    { engine: "Target 200 KB Exact", input: "4.8 MB (Scan)", output: "199.4 KB", time: "380 ms", status: "Pass (Exact)" },
    { engine: "Target 500 KB Exact", input: "12.2 MB (CAD)", output: "498.2 KB", time: "640 ms", status: "Pass (Exact)" },
    { engine: "30-File Batch Merge", input: "30 Files", output: "1 Combined PDF", time: "1,120 ms", status: "Pass (0 Crash)" },
    { engine: "Bates Stamp 50 Pgs", input: "1.4 MB", output: "1.5 MB", time: "290 ms", status: "Pass" },
  ];

  rows.forEach((row, i) => {
    const y = p3H - 150 - i * 30;
    if (i % 2 === 0) {
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
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
  return new File([blob], customFilename, { type: "application/pdf" });
}

/**
 * Generate a 10-document batch of varied PDFs for instant 10-file batch testing
 */
export async function generateSamplePdfBatch(count = 10): Promise<File[]> {
  const sampleDefinitions = [
    { title: "Enterprise Master Services Agreement", name: "01_Master_Services_Agreement.pdf", pages: 3 },
    { title: "Q3 Financial Statement & Audit", name: "02_Financial_Audit_Q3.pdf", pages: 2 },
    { title: "Non-Disclosure & Confidentiality Form", name: "03_NDA_Mutual_Agreement.pdf", pages: 2 },
    { title: "Vendor Procurement Invoice INV-902", name: "04_Vendor_Invoice_902.pdf", pages: 1 },
    { title: "Engineering System Architecture Spec", name: "05_Architecture_Spec_v2.pdf", pages: 4 },
    { title: "Employee Onboarding & Policy Handbook", name: "06_Employee_Handbook_2026.pdf", pages: 3 },
    { title: "Medical Diagnostic Health Summary", name: "07_Medical_Report_Summary.pdf", pages: 2 },
    { title: "Legal Patent Filing Application", name: "08_Patent_Filing_Draft.pdf", pages: 2 },
    { title: "Quarterly Marketing Analytics Deck", name: "09_Marketing_Analytics_Deck.pdf", pages: 2 },
    { title: "Annual Compliance Certification", name: "10_Compliance_Certificate.pdf", pages: 1 },
  ];

  const files: File[] = [];
  const total = Math.min(count, sampleDefinitions.length);

  for (let i = 0; i < total; i++) {
    const def = sampleDefinitions[i];
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (let p = 1; p <= def.pages; p++) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();

      // Top Header
      page.drawRectangle({
        x: 0,
        y: height - 80,
        width,
        height: 80,
        color: rgb(0.15 + i * 0.03, 0.2 + (i % 3) * 0.1, 0.45 + (i % 2) * 0.2),
      });

      page.drawText(`VELODOC PRO BATCH SUITE • FILE ${i + 1} OF ${total}`, {
        x: 40,
        y: height - 35,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(def.title, {
        x: 40,
        y: height - 60,
        size: 14,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      // Page Body
      page.drawText(`Page ${p} of ${def.pages}`, {
        x: 40,
        y: height - 120,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.25),
      });

      page.drawText(
        `This is authentic synthetic benchmark document data generated for stress testing 30-document zero-crash batch operations.\nDocument sequence identifier: DOC-BATCH-TEST-${1000 + i}-PAGE-${p}.\nAll processing occurs strictly client-side inside local browser memory.`,
        {
          x: 40,
          y: height - 150,
          size: 10.5,
          font: fontRegular,
          color: rgb(0.35, 0.38, 0.45),
          lineHeight: 16,
        }
      );

      // Decorative content box
      page.drawRectangle({
        x: 40,
        y: height - 320,
        width: width - 80,
        height: 140,
        color: rgb(0.95, 0.96, 0.98),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1,
      });

      page.drawText(`Data Payload Section ${p}`, {
        x: 60,
        y: height - 210,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.15),
      });

      page.drawText(
        `Checksum: 0x${Math.random().toString(16).substring(2, 10).toUpperCase()}\nLatency Budget: < 50ms\nSecurity Level: High (Isolated WASM Context)`,
        {
          x: 60,
          y: height - 250,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.3, 0.35, 0.4),
          lineHeight: 16,
        }
      );
    }

    const bytes = await pdfDoc.save({ useObjectStreams: true });
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    files.push(new File([blob], def.name, { type: "application/pdf" }));
  }

  return files;
}

/**
 * Generate a 10-file batch of sample images for image-to-pdf and image-studio testing
 */
export async function generateSampleImageBatch(count = 10): Promise<File[]> {
  const files: File[] = [];
  const colors = [
    "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444",
    "#06B6D4", "#EC4899", "#6366F1", "#14B8A6", "#84CC16",
  ];

  if (typeof document === "undefined") {
    return files;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < Math.min(count, 10); i++) {
    if (ctx) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(0, 0, 800, 600);

      // Card overlay
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(50, 50, 700, 500);

      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(50, 50, 700, 70);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`VELODOC SAMPLE IMAGE #${i + 1}`, 80, 95);

      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`Photo Specimen - 800x600 (${i + 1} of ${count})`, 80, 180);

      ctx.fillStyle = "#64748B";
      ctx.font = "16px sans-serif";
      ctx.fillText("Ready for batch conversion, resizing, or exact KB compression.", 80, 220);
      ctx.fillText(`Timestamp: ${new Date().toLocaleTimeString()}`, 80, 250);

      // Checkered decorative block
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 8; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? colors[i % colors.length] : "#E2E8F0";
          ctx.fillRect(80 + c * 40, 290 + r * 40, 35, 35);
        }
      }
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    files.push(new File([blob], `sample_photo_${i + 1}.jpg`, { type: "image/jpeg" }));
  }

  // Cleanup
  canvas.width = 1;
  canvas.height = 1;

  return files;
}
