"use client";

import React, { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { triggerFileDownload } from "@/lib/batch-queue-engine";
import {
  QrCode,
  Download,
  Copy,
  Check,
  Globe,
  FileText,
  Wifi,
  User,
  Sliders,
} from "@/components/common/icons";

type QrContentType = "url" | "text" | "wifi" | "vcard" | "email";

export function QrStudioTool() {
  const [contentType, setContentType] = useState<QrContentType>("url");

  // Content inputs
  const [urlInput, setUrlInput] = useState("https://velodoc.studio");
  const [textInput, setTextInput] = useState("Precision client-side document engineering.");
  const [wifiSsid, setWifiSsid] = useState("VeloDoc-Guest");
  const [wifiPass, setWifiPass] = useState("Velodoc@2026");
  const [wifiType, setWifiType] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);

  const [vcardName, setVcardName] = useState("Alexander Vance");
  const [vcardEmail, setVcardEmail] = useState("alex@velodoc.studio");
  const [vcardPhone, setVcardPhone] = useState("+1 (555) 234-5678");
  const [vcardOrg, setVcardOrg] = useState("VeloDoc Global");

  const [emailTo, setEmailTo] = useState("hello@velodoc.studio");
  const [emailSubject, setEmailSubject] = useState("Inquiry via QR");
  const [emailBody, setEmailBody] = useState("Hi VeloDoc Team,\n\n");

  // Visual Styling
  const [fgColor, setFgColor] = useState("#0F172A");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [isTransparentBg, setIsTransparentBg] = useState(false);
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("M");
  const [margin, setMargin] = useState(2);
  const [resolution, setResolution] = useState<number>(1024);

  const [svgOutput, setSvgOutput] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Compute final payload string based on type
  const getPayload = useCallback((): string => {
    switch (contentType) {
      case "url":
        return urlInput.trim();
      case "text":
        return textInput.trim();
      case "wifi":
        return `WIFI:T:${wifiType};S:${wifiSsid};P:${wifiPass};H:${wifiHidden ? "true" : "false"};;`;
      case "vcard":
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardName}\nFN:${vcardName}\nORG:${vcardOrg}\nEMAIL:${vcardEmail}\nTEL:${vcardPhone}\nEND:VCARD`;
      case "email":
        return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      default:
        return urlInput;
    }
  }, [
    contentType,
    urlInput,
    textInput,
    wifiSsid,
    wifiPass,
    wifiType,
    wifiHidden,
    vcardName,
    vcardEmail,
    vcardPhone,
    vcardOrg,
    emailTo,
    emailSubject,
    emailBody,
  ]);

  const generateCodes = useCallback(async () => {
    const payload = getPayload();
    if (!payload) return;

    try {
      const actualBg = isTransparentBg ? "#00000000" : bgColor;

      // 1. Generate Vector SVG
      const svg = await QRCode.toString(payload, {
        type: "svg",
        errorCorrectionLevel: errorCorrection,
        margin,
        color: {
          dark: fgColor,
          light: actualBg,
        },
      });
      setSvgOutput(svg);

      // 2. Generate High-Res PNG DataURL
      const png = await QRCode.toDataURL(payload, {
        width: resolution,
        errorCorrectionLevel: errorCorrection,
        margin,
        color: {
          dark: fgColor,
          light: actualBg,
        },
      });
      setPngDataUrl(png);
    } catch (err: unknown) {
      console.error("QR Code generation error:", err);
    }
  }, [getPayload, fgColor, bgColor, isTransparentBg, errorCorrection, margin, resolution]);

  useEffect(() => {
    generateCodes();
  }, [generateCodes]);

  const handleDownloadPng = () => {
    if (!pngDataUrl) return;
    const a = document.createElement("a");
    a.href = pngDataUrl;
    a.download = `qrcode_${contentType}_${resolution}px.png`;
    a.click();
  };

  const handleDownloadSvg = () => {
    if (!svgOutput) return;
    const blob = new Blob([svgOutput], { type: "image/svg+xml" });
    triggerFileDownload(blob, `qrcode_${contentType}_vector.svg`);
  };

  const handleCopySvg = () => {
    if (!svgOutput) return;
    navigator.clipboard.writeText(svgOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 text-[#C2410C] dark:bg-amber-500/20 dark:text-amber-300 border border-orange-200 dark:border-amber-500/30">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              High-Resolution Vector &amp; PNG QR Code Studio
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Generate custom branded QR codes with SVG export, transparent backgrounds, and print-grade resolution.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form & Styling (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Content Type Tabs */}
          <div className="p-1 rounded-2xl bg-zinc-100 dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border grid grid-cols-5 gap-1 text-xs font-mono">
            {[
              { id: "url", label: "URL", icon: Globe },
              { id: "text", label: "Text", icon: FileText },
              { id: "wifi", label: "Wi-Fi", icon: Wifi },
              { id: "vcard", label: "vCard", icon: User },
              { id: "email", label: "Email", icon: QrCode },
            ].map((tab) => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setContentType(tab.id as QrContentType)}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    contentType === tab.id
                      ? "bg-white dark:bg-charcoal-700 text-zinc-950 dark:text-white font-bold shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Type-Specific Inputs */}
          <div className="p-5 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-4">
            {contentType === "url" && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                  Website URL
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                />
              </div>
            )}

            {contentType === "text" && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                  Plain Text Content
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type any message, note, or serial number..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none focus:border-[#C2410C]"
                />
              </div>
            )}

            {contentType === "wifi" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                    Network Name (SSID)
                  </label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                    Wi-Fi Password
                  </label>
                  <input
                    type="text"
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <select
                    value={wifiType}
                    onChange={(e) => setWifiType(e.target.value as "WPA" | "WEP" | "nopass")}
                    className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border text-zinc-950 dark:text-white outline-none"
                  >
                    <option value="WPA">WPA/WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">No Password (Open)</option>
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wifiHidden}
                      onChange={(e) => setWifiHidden(e.target.checked)}
                      className="rounded text-[#C2410C]"
                    />
                    <span>Hidden SSID</span>
                  </label>
                </div>
              </div>
            )}

            {contentType === "vcard" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="text-zinc-500 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={vcardName}
                    onChange={(e) => setVcardName(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Organization</label>
                  <input
                    type="text"
                    value={vcardOrg}
                    onChange={(e) => setVcardOrg(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={vcardEmail}
                    onChange={(e) => setVcardEmail(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={vcardPhone}
                    onChange={(e) => setVcardPhone(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                  />
                </div>
              </div>
            )}

            {contentType === "email" && (
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="text-zinc-500 block mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Body Text</label>
                  <textarea
                    rows={2}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Color & Visual Tuning Controls */}
          <div className="p-5 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">
              <Sliders className="w-4 h-4 text-[#C2410C]" />
              <span>Palette &amp; Export Precision</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 block mb-1.5 font-semibold">
                  Foreground Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 block mb-1.5 font-semibold">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={isTransparentBg}
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 disabled:opacity-30"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTransparentBg}
                      onChange={(e) => setIsTransparentBg(e.target.checked)}
                      className="rounded text-[#C2410C]"
                    />
                    <span>Transparent</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div>
                <label className="text-zinc-500 block mb-1">Error Correction</label>
                <select
                  value={errorCorrection}
                  onChange={(e) => setErrorCorrection(e.target.value as "L" | "M" | "Q" | "H")}
                  className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                >
                  <option value="L">L (7% recovery)</option>
                  <option value="M">M (15% standard)</option>
                  <option value="Q">Q (25% high)</option>
                  <option value="H">H (30% maximum)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Quiet Zone Margin</label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value))}
                  className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                >
                  <option value={0}>0 (Flush)</option>
                  <option value={1}>1 Module</option>
                  <option value={2}>2 Modules</option>
                  <option value={4}>4 Modules (Standard)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">PNG Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(parseInt(e.target.value))}
                  className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-charcoal-700 border border-zinc-200 dark:border-charcoal-border"
                >
                  <option value={512}>512 x 512 px</option>
                  <option value={1024}>1024 x 1024 px</option>
                  <option value={2048}>2048 x 2048 px</option>
                  <option value={4096}>4096 x 4096 px (Print)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live High-Precision Preview & Download Cards (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-3xl bg-white dark:bg-charcoal-800 border border-zinc-200 dark:border-charcoal-border shadow-paper text-center space-y-4">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold block">
              Live Vector Preview
            </span>

            {/* QR Preview Frame */}
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-[#0A0D14] border border-zinc-200 dark:border-white/10 flex items-center justify-center min-h-[260px]">
              {svgOutput ? (
                <div
                  className="w-56 h-56 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: svgOutput }}
                />
              ) : (
                <div className="text-zinc-400 font-mono text-xs">Generating QR...</div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!pngDataUrl}
                className="w-full py-3 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res PNG ({resolution}px)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  disabled={!svgOutput}
                  className="py-2 rounded-xl border border-zinc-200 dark:border-charcoal-border hover:bg-zinc-100 dark:hover:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Vector SVG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySvg}
                  disabled={!svgOutput}
                  className="py-2 rounded-xl border border-zinc-200 dark:border-charcoal-border hover:bg-zinc-100 dark:hover:bg-charcoal-700 text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SVG</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
