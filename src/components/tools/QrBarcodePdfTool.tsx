"use client";

import React, { useState, useEffect } from "react";
import { DropZone } from "@/components/common/DropZone";
import { ResultPreviewStudio } from "@/components/ResultPreviewStudio";
import { UploadedFileItem, ProcessingMetrics } from "@/types";
import {
  generateQrDataUrl,
  generateBarcodeDataUrl,
  stampImageOnPdf,
  StampOptions,
} from "@/lib/qr-barcode-engine";
import { getPdfPageCount } from "@/lib/pdf-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  QrCode,
  Barcode,
  Wifi,
  Globe,
  User,
  CreditCard,
  Download,
  Stamp,
  AlertCircle,
  Loader2,
} from "lucide-react";

export function QrBarcodePdfTool() {
  const [activeTab, setActiveTab] = useState<"stamp" | "generator">("stamp");
  const [qrType, setQrType] = useState<"url" | "wifi" | "vcard" | "payment" | "barcode">("url");

  // Form Fields
  const [urlInput, setUrlInput] = useState("https://velodoc.app");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [vcardName, setVcardName] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [payUpi, setPayUpi] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [barcodeText, setBarcodeText] = useState("VELODOC-2026-X9");

  // QR Preview Data URL
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");

  // PDF Stamp State
  const [fileItem, setFileItem] = useState<UploadedFileItem | null>(null);
  const [originalBuffer, setOriginalBuffer] = useState<ArrayBuffer | null>(null);
  const [stampOptions, setStampOptions] = useState<StampOptions>({
    position: "top-right",
    size: 70,
    opacity: 1.0,
    pageScope: "all",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute QR string whenever inputs change
  useEffect(() => {
    let textToEncode = "";

    if (qrType === "url") {
      textToEncode = urlInput || "https://velodoc.app";
    } else if (qrType === "wifi") {
      textToEncode = `WIFI:S:${wifiSsid};T:WPA;P:${wifiPass};;`;
    } else if (qrType === "vcard") {
      textToEncode = `BEGIN:VCARD\nVERSION:3.0\nFN:${vcardName}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
    } else if (qrType === "payment") {
      textToEncode = payAmount
        ? `upi://pay?pa=${payUpi}&am=${payAmount}&cu=INR`
        : `upi://pay?pa=${payUpi}`;
    } else if (qrType === "barcode") {
      const url = generateBarcodeDataUrl(barcodeText || "12345678");
      setPreviewDataUrl(url);
      return;
    }

    generateQrDataUrl({ text: textToEncode || "https://velodoc.app" }).then((url) => {
      setPreviewDataUrl(url);
    });
  }, [qrType, urlInput, wifiSsid, wifiPass, vcardName, vcardPhone, vcardEmail, payUpi, payAmount, barcodeText]);

  const handleFileAdded = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const file = newFiles[0];
    setErrorMessage(null);
    setMetrics(null);
    setOutputBytes(null);

    const item: UploadedFileItem = {
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: "loading",
    };
    setFileItem(item);

    try {
      const buffer = await file.arrayBuffer();
      setOriginalBuffer(buffer);
      const count = await getPdfPageCount(buffer);
      item.pageCount = count;
      item.status = "ready";
      setFileItem({ ...item });
    } catch (err) {
      console.error(err);
      item.status = "error";
      setErrorMessage("Could not load PDF document.");
      setFileItem({ ...item });
    }
  };

  const handleStampPdf = async () => {
    if (!fileItem || !originalBuffer || !previewDataUrl) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const processed = await stampImageOnPdf(originalBuffer, previewDataUrl, stampOptions);
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      setOutputBytes(processed);
      const originalSize = fileItem.size;
      const processedSize = processed.byteLength;
      const savedBytes = originalSize - processedSize;
      const savedPercentage = 0;

      const blob = createPdfBlob(processed);
      const downloadUrl = URL.createObjectURL(blob);
      const downloadFilename = fileItem.name.replace(/\.pdf$/i, "-stamped.pdf");

      setMetrics({
        originalSize,
        processedSize,
        savedBytes,
        savedPercentage,
        durationMs,
        downloadUrl,
        downloadFilename,
        pageCount: fileItem.pageCount,
      });

      sessionHistory.recordExecution({
        toolId: "qr-barcode-pdf",
        toolName: "QR Code & Barcode Studio",
        inputFiles: [fileItem.name],
        outputFileName: downloadFilename,
        outputSizeBytes: processedSize,
        durationMs,
        outputData: processed,
      });
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to stamp QR code on PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadStandalonePng = () => {
    if (!previewDataUrl) return;
    const a = document.createElement("a");
    a.href = previewDataUrl;
    a.download = qrType === "barcode" ? "barcode.png" : "qrcode.png";
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Mode Toggle Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-pill max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab("stamp")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === "stamp"
              ? "bg-indigo-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.3)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Stamp className="w-3.5 h-3.5" />
          <span>Stamp onto PDF Document</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("generator")}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === "generator"
              ? "bg-indigo-600 text-white shadow-[0_0_16px_rgba(99,102,241,0.3)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Standalone Generator</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Settings Column */}
        <div className="lg:col-span-6 space-y-5">
          <div className="premium-card p-5 sm:p-6 rounded-3xl space-y-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-400" />
              Configure QR or Barcode
            </h3>

            {/* Type selector */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: "url", label: "URL", icon: Globe },
                { id: "wifi", label: "Wi-Fi", icon: Wifi },
                { id: "vcard", label: "Contact", icon: User },
                { id: "payment", label: "Payment", icon: CreditCard },
                { id: "barcode", label: "Barcode", icon: Barcode },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = qrType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQrType(item.id as typeof qrType)}
                    className={`py-2.5 px-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-500 text-white font-semibold"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.14]"
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-[11px] block">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Inputs based on type */}
            <div className="space-y-3 pt-1">
              {qrType === "url" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Website URL / Destination Link</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/invoice"
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {qrType === "wifi" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Wi-Fi Network Name (SSID)</label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="Guest-Office-5G"
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Password</label>
                    <input
                      type="password"
                      value={wifiPass}
                      onChange={(e) => setWifiPass(e.target.value)}
                      placeholder="SecretPassword"
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {qrType === "vcard" && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={vcardName}
                    onChange={(e) => setVcardName(e.target.value)}
                    placeholder="Full Name (e.g. Dr. Jane Smith)"
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={vcardPhone}
                      onChange={(e) => setVcardPhone(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="email"
                      value={vcardEmail}
                      onChange={(e) => setVcardEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {qrType === "payment" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">UPI ID or PayPal handle</label>
                    <input
                      type="text"
                      value={payUpi}
                      onChange={(e) => setPayUpi(e.target.value)}
                      placeholder="name@okaxis or paypal.me/id"
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Amount (Optional)</label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="50.00"
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {qrType === "barcode" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Barcode Text / Serial Number</label>
                  <input
                    type="text"
                    value={barcodeText}
                    onChange={(e) => setBarcodeText(e.target.value)}
                    placeholder="INV-2026-98124"
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Stamp Specific Settings (if Stamp tab is active) */}
            {activeTab === "stamp" && (
              <div className="border-t border-white/[0.08] pt-4 space-y-4">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                  Stamp Placement on PDF
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "top-right", label: "Top Right" },
                    { id: "top-left", label: "Top Left" },
                    { id: "bottom-right", label: "Bottom Right" },
                    { id: "bottom-left", label: "Bottom Left" },
                    { id: "center", label: "Center" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setStampOptions({ ...stampOptions, position: pos.id as StampOptions["position"] })}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                        stampOptions.position === pos.id
                          ? "bg-indigo-600 border-indigo-500 text-white font-semibold"
                          : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Stamp Size: {stampOptions.size} pt</label>
                    <input
                      type="range"
                      min="40"
                      max="140"
                      value={stampOptions.size}
                      onChange={(e) => setStampOptions({ ...stampOptions, size: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Page Scope</label>
                    <select
                      value={stampOptions.pageScope}
                      onChange={(e) => setStampOptions({ ...stampOptions, pageScope: e.target.value as StampOptions["pageScope"] })}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-base sm:text-xs text-white"
                    >
                      <option value="all">All Pages</option>
                      <option value="first">First Page Only</option>
                      <option value="last">Last Page Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Preview Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="premium-card p-6 rounded-3xl flex flex-col items-center justify-center min-h-[380px] border border-white/[0.08] space-y-4">
            <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
              Live Generated Preview
            </span>

            {previewDataUrl ? (
              <div className="p-4 rounded-2xl bg-white shadow-2xl border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewDataUrl}
                  alt="QR Preview"
                  className="max-h-[190px] w-auto object-contain block mx-auto"
                />
              </div>
            ) : (
              <div className="w-40 h-40 rounded-2xl bg-white/[0.04] animate-pulse flex items-center justify-center text-zinc-600">
                <QrCode className="w-10 h-10" />
              </div>
            )}

            {/* Standalone Download Buttons */}
            {activeTab === "generator" && (
              <div className="flex items-center gap-3 w-full max-w-xs pt-2">
                <button
                  type="button"
                  onClick={handleDownloadStandalonePng}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(99,102,241,0.3)] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download High-Res PNG</span>
                </button>
              </div>
            )}
          </div>

          {/* Stamp onto PDF File Dropzone & Button */}
          {activeTab === "stamp" && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {!fileItem && (
                <DropZone
                  files={[]}
                  onFilesAdded={handleFileAdded}
                  onRemoveFile={() => {}}
                  acceptedFileTypes={{ "application/pdf": [".pdf"] }}
                  multiple={false}
                  title="Drop PDF Document to Stamp"
                  subtitle="Select invoice, contract, or form to stamp with the generated QR/Barcode"
                />
              )}

              {fileItem && !metrics && (
                <div className="premium-card p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-white block">{fileItem.name}</span>
                    <span className="text-zinc-400">{fileItem.pageCount || 1} pages</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStampPdf}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-xs flex items-center gap-2 shadow-[0_0_16px_rgba(99,102,241,0.3)] cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Stamping...</span>
                      </>
                    ) : (
                      <>
                        <Stamp className="w-3.5 h-3.5" />
                        <span>Stamp on PDF</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {metrics && (
        <ResultPreviewStudio
          metrics={metrics}
          outputBytes={outputBytes || undefined}
          originalBytes={originalBuffer || undefined}
          outputMimeType="application/pdf"
          title="QR / Barcode Stamped Successfully"
          onAdjustSettings={() => {
            setMetrics(null);
          }}
        />
      )}
    </div>
  );
}
