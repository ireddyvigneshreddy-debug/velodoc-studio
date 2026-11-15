"use client";

import React, { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generateQrDataUrl } from "@/lib/qr-barcode-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  Award,
  Download,
  CheckCircle,
  Loader2,
} from "@/components/common/icons";

export function CertificateGeneratorTool() {
  const [theme, setTheme] = useState<"gold" | "indigo" | "emerald">("gold");
  const [certTitle, setCertTitle] = useState("CERTIFICATE OF COMPLETION");
  const [recipientName, setRecipientName] = useState("Alexander Vance");
  const [achievementTitle, setAchievementTitle] = useState(
    "Advanced Full-Stack Engineering & Cloud Architecture"
  );
  const [organization, setOrganization] = useState("VeloDoc Global Institute");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [certId, setCertId] = useState("CERT-2026-94821");
  const [signatoryName, setSignatoryName] = useState("Dr. Elena Rostova");
  const [signatoryTitle, setSignatoryTitle] = useState("Academic Dean & Director");

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCertificate = async () => {
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const fontTimesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // A4 Landscape: 841.89 x 595.28 points
      const width = 841.89;
      const height = 595.28;
      const page = pdfDoc.addPage([width, height]);

      // Color scheme based on theme
      let primaryColor = rgb(0.72, 0.53, 0.16); // Gold
      let secondaryColor = rgb(0.85, 0.7, 0.35);
      if (theme === "indigo") {
        primaryColor = rgb(0.39, 0.4, 0.95);
        secondaryColor = rgb(0.6, 0.65, 0.98);
      } else if (theme === "emerald") {
        primaryColor = rgb(0.1, 0.6, 0.35);
        secondaryColor = rgb(0.3, 0.75, 0.5);
      }

      // Background Paper Color
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(0.99, 0.99, 0.98),
      });

      // Outer Ornate Border
      page.drawRectangle({
        x: 24,
        y: 24,
        width: width - 48,
        height: height - 48,
        borderWidth: 3,
        borderColor: primaryColor,
      });

      // Inner Fine Border
      page.drawRectangle({
        x: 32,
        y: 32,
        width: width - 64,
        height: height - 64,
        borderWidth: 1,
        borderColor: secondaryColor,
      });

      // Decorative Corner Accents
      const cornerSize = 25;
      // Top-Left
      page.drawLine({ start: { x: 36, y: height - 36 }, end: { x: 36 + cornerSize, y: height - 36 }, thickness: 2, color: primaryColor });
      page.drawLine({ start: { x: 36, y: height - 36 }, end: { x: 36, y: height - 36 - cornerSize }, thickness: 2, color: primaryColor });
      // Top-Right
      page.drawLine({ start: { x: width - 36, y: height - 36 }, end: { x: width - 36 - cornerSize, y: height - 36 }, thickness: 2, color: primaryColor });
      page.drawLine({ start: { x: width - 36, y: height - 36 }, end: { x: width - 36, y: height - 36 - cornerSize }, thickness: 2, color: primaryColor });
      // Bottom-Left
      page.drawLine({ start: { x: 36, y: 36 }, end: { x: 36 + cornerSize, y: 36 }, thickness: 2, color: primaryColor });
      page.drawLine({ start: { x: 36, y: 36 }, end: { x: 36, y: 36 + cornerSize }, thickness: 2, color: primaryColor });
      // Bottom-Right
      page.drawLine({ start: { x: width - 36, y: 36 }, end: { x: width - 36 - cornerSize, y: 36 }, thickness: 2, color: primaryColor });
      page.drawLine({ start: { x: width - 36, y: 36 }, end: { x: width - 36, y: 36 + cornerSize }, thickness: 2, color: primaryColor });

      // Issuer Organization
      page.drawText(organization.toUpperCase(), {
        x: width / 2 - (organization.length * 4.2),
        y: height - 85,
        size: 13,
        font: fontHelvetica,
        color: rgb(0.35, 0.35, 0.35),
      });

      // Certificate Title
      page.drawText(certTitle, {
        x: width / 2 - (certTitle.length * 7.5),
        y: height - 130,
        size: 26,
        font: fontTimesBold,
        color: primaryColor,
      });

      // Subtitle
      const sub = "THIS IS PROUDLY PRESENTED TO";
      page.drawText(sub, {
        x: width / 2 - (sub.length * 3.2),
        y: height - 170,
        size: 10,
        font: fontHelvetica,
        color: rgb(0.45, 0.45, 0.45),
      });

      // Recipient Name
      page.drawText(recipientName, {
        x: width / 2 - (recipientName.length * 10),
        y: height - 235,
        size: 34,
        font: fontTimesBold,
        color: rgb(0.1, 0.1, 0.15),
      });

      // Decorative underline
      page.drawLine({
        start: { x: width / 2 - 160, y: height - 250 },
        end: { x: width / 2 + 160, y: height - 250 },
        thickness: 1.5,
        color: primaryColor,
      });

      // Achievement / Reason text
      const desc1 = "For successfully completing all requirements and demonstrating exceptional proficiency in";
      page.drawText(desc1, {
        x: width / 2 - (desc1.length * 2.8),
        y: height - 285,
        size: 11,
        font: fontTimesItalic,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(achievementTitle, {
        x: width / 2 - (achievementTitle.length * 4.6),
        y: height - 315,
        size: 16,
        font: fontTimesBold,
        color: rgb(0.12, 0.12, 0.18),
      });

      // Gold Ribbon Seal Circle Graphic in Bottom-Center
      const sealX = width / 2;
      const sealY = 110;
      page.drawCircle({
        x: sealX,
        y: sealY,
        size: 34,
        color: primaryColor,
      });
      page.drawCircle({
        x: sealX,
        y: sealY,
        size: 30,
        borderColor: rgb(1, 1, 1),
        borderWidth: 1.5,
        color: primaryColor,
      });
      page.drawText("OFFICIAL", {
        x: sealX - 18,
        y: sealY + 4,
        size: 7.5,
        font: fontHelvetica,
        color: rgb(1, 1, 1),
      });
      page.drawText("SEAL", {
        x: sealX - 10,
        y: sealY - 8,
        size: 7.5,
        font: fontHelvetica,
        color: rgb(1, 1, 1),
      });

      // Left Footer: Date & Certificate ID
      page.drawText(`Date Issued: ${issueDate}`, {
        x: 65,
        y: 110,
        size: 10,
        font: fontHelvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(`Credential ID: ${certId}`, {
        x: 65,
        y: 92,
        size: 9,
        font: fontHelvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Right Footer: Signatory
      page.drawLine({
        start: { x: width - 260, y: 125 },
        end: { x: width - 65, y: 125 },
        thickness: 1,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText(signatoryName, {
        x: width - 240,
        y: 108,
        size: 11,
        font: fontTimesBold,
        color: rgb(0.15, 0.15, 0.15),
      });
      page.drawText(signatoryTitle, {
        x: width - 240,
        y: 92,
        size: 9,
        font: fontHelvetica,
        color: rgb(0.45, 0.45, 0.45),
      });

      // Embedded Verification QR Code in corner
      try {
        const qrUrl = await generateQrDataUrl({
          text: `https://verify.velodoc.app/cert/${certId}`,
          width: 150,
        });
        const qrRes = await fetch(qrUrl);
        const qrBytes = await qrRes.arrayBuffer();
        const embeddedQr = await pdfDoc.embedPng(qrBytes);

        page.drawImage(embeddedQr, {
          x: 65,
          y: 135,
          width: 50,
          height: 50,
        });
        page.drawText("Verify Credential", { x: 65, y: 128, size: 7, font: fontHelvetica, color: rgb(0.4, 0.4, 0.4) });
      } catch {
        // Continue if QR fails
      }

      const pdfBytes = await pdfDoc.save();
      const blob = createPdfBlob(pdfBytes);
      const url = URL.createObjectURL(blob);

      const downloadFilename = `certificate-${certId}.pdf`;
      sessionHistory.recordExecution({
        toolId: "certificate-generator",
        toolName: "Award & Certificate Studio",
        inputFiles: ["Certificate Data"],
        outputFileName: downloadFilename,
        outputSizeBytes: pdfBytes.byteLength,
        durationMs: 140,
        outputData: pdfBytes,
      });

      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="premium-card p-5 sm:p-7 rounded-3xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Award & Certificate Studio</h3>
                  <p className="text-xs text-zinc-400">Print-ready vector completion diplomas with QR verification</p>
                </div>
              </div>
            </div>

            {/* Design Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Diploma Style & Palette
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: "gold", label: "Classic Royal Gold", color: "bg-amber-500" },
                  { id: "indigo", label: "Modern Tech Indigo", color: "bg-indigo-500" },
                  { id: "emerald", label: "Academic Emerald", color: "bg-emerald-500" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as typeof theme)}
                    className={`py-3 px-2 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                      theme === t.id
                        ? "bg-white/[0.08] border-white/[0.3] text-white font-semibold shadow-lg"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${t.color}`}></span>
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Certificate Title</label>
                  <input
                    type="text"
                    value={certTitle}
                    onChange={(e) => setCertTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Issuing Organization</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient Full Name"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Course / Achievement Title</label>
                <input
                  type="text"
                  value={achievementTitle}
                  onChange={(e) => setAchievementTitle(e.target.value)}
                  placeholder="e.g. Executive Leadership & AI Architecture"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Signatory Full Name</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Signatory Title</label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Credential ID #</label>
                  <input
                    type="text"
                    value={certId}
                    onChange={(e) => setCertId(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Desktop Action Button */}
            <button
              type="button"
              onClick={handleGenerateCertificate}
              disabled={isGenerating}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling Landscape Vector PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Print-Ready Certificate (A4 Landscape)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="premium-card p-6 rounded-3xl border border-white/[0.08] space-y-4">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Live Diploma Preview
            </span>

            <div className="w-full aspect-[1.414/1] bg-amber-50/90 rounded-2xl p-5 shadow-2xl border-4 border-amber-600/40 flex flex-col justify-between text-center relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-sans block">
                  {organization}
                </span>
                <span className="text-xs font-serif font-bold text-amber-900 block">
                  {certTitle}
                </span>
                <span className="text-[8px] text-zinc-500 block">PROUDLY PRESENTED TO</span>
                <span className="text-sm font-serif font-bold text-zinc-900 block pt-1">
                  {recipientName}
                </span>
              </div>

              <div className="text-[8px] text-zinc-600 italic px-2">
                For completion of {achievementTitle}
              </div>

              <div className="flex items-center justify-between text-[7px] text-zinc-500 border-t border-amber-300/40 pt-2">
                <span>{issueDate}</span>
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[5px] font-bold shadow">
                  SEAL
                </div>
                <span>{signatoryName}</span>
              </div>
            </div>

            <div className="text-xs text-zinc-400 space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vector lines & text render razor-sharp at 300+ DPI</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Embedded credential verification QR code</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 pb-safe md:hidden bg-zinc-950/90 backdrop-blur-xl border-t border-white/[0.12] p-3 shadow-2xl">
        <button
          type="button"
          onClick={handleGenerateCertificate}
          disabled={isGenerating}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Certificate</span>
        </button>
      </div>
    </div>
  );
}
