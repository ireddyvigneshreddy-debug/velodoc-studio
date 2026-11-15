"use client";

import React, { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generateQrDataUrl } from "@/lib/qr-barcode-engine";
import { sessionHistory } from "@/lib/session-history";
import { createPdfBlob } from "@/lib/utils";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Building,
  User,
  Sparkles,
  QrCode,
  Loader2,
} from "@/components/common/icons";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export function InvoiceGeneratorTool() {
  const [currency, setCurrency] = useState("$");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-001");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );

  // Sender details
  const [senderName, setSenderName] = useState("Acme Studio Design Inc.");
  const [senderEmail, setSenderEmail] = useState("billing@acmestudio.com");
  const [senderAddress, setSenderAddress] = useState("742 Evergreen Terrace, San Francisco, CA");
  const [senderTaxId, setSenderTaxId] = useState("TAX-US-984210");

  // Client details
  const [clientName, setClientName] = useState("Global Horizon Tech LLC");
  const [clientEmail, setClientEmail] = useState("accounts@globalhorizon.com");
  const [clientAddress, setClientAddress] = useState("100 Innovation Way, Suite 400, Austin, TX");

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "1",
      description: "Brand Identity Design & Interactive UI System",
      quantity: 1,
      unitPrice: 1800,
      taxPercent: 0,
    },
    {
      id: "2",
      description: "Frontend Next.js Engineering (Phase 1 Deliverable)",
      quantity: 40,
      unitPrice: 85,
      taxPercent: 0,
    },
  ]);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(5);
  const [shipping, setShipping] = useState(0);
  const [notes, setNotes] = useState(
    "Thank you for your business! Payment is due within 14 days via Wire Transfer or scan the QR code below."
  );
  const [paymentUpiOrLink, setPaymentUpiOrLink] = useState("billing@acmestudio.com");

  const [isGenerating, setIsGenerating] = useState(false);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount + shipping;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(7),
        description: "New Item / Service",
        quantity: 1,
        unitPrice: 100,
        taxPercent: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof LineItem, val: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      let y = height - 50;

      // Header Bar
      page.drawRectangle({
        x: 0,
        y: height - 12,
        width,
        height: 12,
        color: rgb(0.39, 0.4, 0.95), // Indigo accent
      });

      // Invoice Title & Details
      page.drawText("INVOICE", {
        x: 40,
        y: y - 10,
        size: 24,
        font: fontBold,
        color: rgb(0.08, 0.08, 0.12),
      });

      page.drawText(`# ${invoiceNumber}`, {
        x: 40,
        y: y - 30,
        size: 11,
        font: fontBold,
        color: rgb(0.39, 0.4, 0.95),
      });

      // Right Header Details
      page.drawText(`Date: ${invoiceDate}`, {
        x: width - 180,
        y: y - 10,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
      });

      page.drawText(`Due Date: ${dueDate}`, {
        x: width - 180,
        y: y - 26,
        size: 9.5,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      y -= 75;

      // Sender & Client Box
      page.drawLine({
        start: { x: 40, y },
        end: { x: width - 40, y },
        thickness: 0.75,
        color: rgb(0.88, 0.88, 0.92),
      });

      y -= 20;

      // From / To columns
      page.drawText("FROM:", { x: 40, y, size: 8, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
      page.drawText("BILL TO:", { x: width / 2 + 10, y, size: 8, font: fontBold, color: rgb(0.5, 0.5, 0.5) });

      y -= 15;
      page.drawText(senderName, { x: 40, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(clientName, { x: width / 2 + 10, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

      y -= 14;
      page.drawText(senderEmail, { x: 40, y, size: 9, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
      page.drawText(clientEmail, { x: width / 2 + 10, y, size: 9, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });

      y -= 14;
      page.drawText(senderAddress.substring(0, 45), { x: 40, y, size: 8.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(clientAddress.substring(0, 45), { x: width / 2 + 10, y, size: 8.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

      if (senderTaxId) {
        y -= 13;
        page.drawText(`Tax ID: ${senderTaxId}`, { x: 40, y, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
      }

      y -= 30;

      // Items Table Header
      page.drawRectangle({
        x: 40,
        y: y - 8,
        width: width - 80,
        height: 24,
        color: rgb(0.96, 0.96, 0.98),
      });

      page.drawText("DESCRIPTION", { x: 50, y: y, size: 8.5, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText("QTY", { x: width - 210, y: y, size: 8.5, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText("RATE", { x: width - 150, y: y, size: 8.5, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText("AMOUNT", { x: width - 90, y: y, size: 8.5, font: fontBold, color: rgb(0.3, 0.3, 0.3) });

      y -= 25;

      // Table Rows
      for (const item of items) {
        const itemTotal = item.quantity * item.unitPrice;

        page.drawText(item.description.substring(0, 48), {
          x: 50,
          y,
          size: 9,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.15),
        });

        page.drawText(item.quantity.toString(), {
          x: width - 200,
          y,
          size: 9,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });

        page.drawText(`${currency}${item.unitPrice.toFixed(2)}`, {
          x: width - 150,
          y,
          size: 9,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });

        page.drawText(`${currency}${itemTotal.toFixed(2)}`, {
          x: width - 90,
          y,
          size: 9,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });

        y -= 20;
      }

      y -= 10;
      page.drawLine({
        start: { x: 40, y },
        end: { x: width - 40, y },
        thickness: 0.75,
        color: rgb(0.88, 0.88, 0.92),
      });

      y -= 25;

      // Totals Box (Right aligned)
      const totalsX = width - 220;
      page.drawText(`Subtotal:`, { x: totalsX, y, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(`${currency}${subtotal.toFixed(2)}`, { x: width - 90, y, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

      if (discountPercent > 0) {
        y -= 16;
        page.drawText(`Discount (${discountPercent}%):`, { x: totalsX, y, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(`-${currency}${discountAmount.toFixed(2)}`, { x: width - 90, y, size: 9, font: fontRegular, color: rgb(0.8, 0.2, 0.2) });
      }

      if (taxRate > 0) {
        y -= 16;
        page.drawText(`Tax / VAT (${taxRate}%):`, { x: totalsX, y, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(`${currency}${taxAmount.toFixed(2)}`, { x: width - 90, y, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      }

      y -= 22;
      page.drawRectangle({
        x: totalsX - 10,
        y: y - 6,
        width: width - totalsX - 30,
        height: 26,
        color: rgb(0.94, 0.95, 0.99),
      });

      page.drawText(`Total Due:`, { x: totalsX, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(`${currency}${grandTotal.toFixed(2)}`, { x: width - 90, y, size: 11, font: fontBold, color: rgb(0.39, 0.4, 0.95) });

      // Embed Payment QR Code in Footer
      if (paymentUpiOrLink) {
        try {
          const qrDataUrl = await generateQrDataUrl({ text: paymentUpiOrLink, width: 200 });
          const qrRes = await fetch(qrDataUrl);
          const qrBytes = await qrRes.arrayBuffer();
          const embeddedQr = await pdfDoc.embedPng(qrBytes);

          page.drawImage(embeddedQr, {
            x: 45,
            y: 50,
            width: 70,
            height: 70,
          });

          page.drawText("Instant Payment QR", { x: 125, y: 100, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
          page.drawText("Scan with phone camera or UPI app to pay", { x: 125, y: 86, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
          page.drawText(paymentUpiOrLink.substring(0, 45), { x: 125, y: 72, size: 7.5, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
        } catch {
          // Ignore QR embedding if failed
        }
      }

      // Notes & Terms Footer
      if (notes) {
        page.drawText("Terms & Instructions:", { x: 40, y: 145, size: 8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(notes.substring(0, 95), { x: 40, y: 132, size: 8, font: fontRegular, color: rgb(0.45, 0.45, 0.45) });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = createPdfBlob(pdfBytes);
      const url = URL.createObjectURL(blob);

      const downloadFilename = `${invoiceNumber}.pdf`;
      sessionHistory.recordExecution({
        toolId: "invoice-generator",
        toolName: "Smart Invoice & Receipt Studio",
        inputFiles: ["Invoice Data"],
        outputFileName: downloadFilename,
        outputSizeBytes: pdfBytes.byteLength,
        durationMs: 120,
        outputData: pdfBytes,
      });

      // Trigger instant download
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
        {/* Editor Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="premium-card p-5 sm:p-7 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Smart Invoice & Receipt Studio</h3>
                  <p className="text-xs text-zinc-400">100% Private vector PDF with instant payment QR</p>
                </div>
              </div>

              {/* Currency Selector & Invoice # */}
              <div className="flex items-center gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-zinc-900 border border-white/[0.1] rounded-xl px-2.5 py-2 text-sm text-white font-bold"
                >
                  <option value="$">USD ($)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                  <option value="₹">INR (₹)</option>
                  <option value="CAD $">CAD ($)</option>
                  <option value="AUD $">AUD ($)</option>
                  <option value="¥">JPY (¥)</option>
                  <option value="AED ">AED</option>
                </select>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="bg-zinc-900 border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white font-mono w-32"
                />
              </div>
            </div>

            {/* Sender & Client Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Sender Details */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  Your Business Info (Sender)
                </span>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Business / Your Name"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="Billing Email"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="Address, City, Country"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
                <input
                  type="text"
                  value={senderTaxId}
                  onChange={(e) => setSenderTaxId(e.target.value)}
                  placeholder="Tax ID / VAT / GST"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
              </div>

              {/* Client Details */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Billed Client Details
                </span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client / Company Name"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Client Email"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Client Address"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
              </div>
            </div>

            {/* Invoice Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400">Issue Date</span>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-zinc-400">Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Line Items & Services
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                  >
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                      placeholder="Item description"
                      className="flex-1 bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          placeholder="Qty"
                          className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-2 py-2 text-base sm:text-xs text-white text-center"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          placeholder="Rate"
                          className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-2 py-2 text-base sm:text-xs text-white text-right"
                        />
                      </div>
                      <span className="w-20 text-xs font-mono font-semibold text-white text-right">
                        {currency}{(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1}
                        className="text-zinc-500 hover:text-rose-400 p-1.5 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Payment QR row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-white/[0.08]">
              {/* Payment QR Settings */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                  Footer Payment QR Code (UPI or Link)
                </span>
                <input
                  type="text"
                  value={paymentUpiOrLink}
                  onChange={(e) => setPaymentUpiOrLink(e.target.value)}
                  placeholder="UPI ID, PayPal.me link, or Stripe URL"
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-base sm:text-xs text-white"
                />
                <span className="text-[11px] text-zinc-400 block">
                  A payment QR code will be dynamically generated and stamped onto the invoice footer.
                </span>
              </div>

              {/* Totals Summary */}
              <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Subtotal:</span>
                  <span className="text-white font-mono">{currency}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Discount (%):</span>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-14 bg-zinc-900 border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-right text-white"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Tax / VAT (%):</span>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-14 bg-zinc-900 border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-right text-white"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Shipping:</span>
                  <input
                    type="number"
                    value={shipping}
                    onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                    className="w-14 bg-zinc-900 border border-white/[0.08] rounded px-1.5 py-0.5 text-xs text-right text-white"
                  />
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/[0.08]">
                  <span>Grand Total:</span>
                  <span className="text-indigo-400 font-mono text-base">{currency}{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Instructions */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-300">Terms & Payment Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-zinc-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white resize-none"
              />
            </div>

            {/* Desktop Action Button */}
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling Vector PDF Invoice...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Clean PDF Invoice ({currency}{grandTotal.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="lg:col-span-4 space-y-4">
          <div className="premium-card p-6 rounded-3xl space-y-4 border border-white/[0.08]">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              100% Client-Side Privacy
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Unlike cloud invoicing platforms that store your client lists and financial revenue on their servers, VeloDoc compiles this entire invoice in your browser memory.
            </p>
            <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Crisp vector typography (A4 standard)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Automatic payment QR code integration</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Zero login or signup required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 pb-safe md:hidden bg-zinc-950/90 backdrop-blur-xl border-t border-white/[0.12] p-3 shadow-2xl">
        <button
          type="button"
          onClick={handleGeneratePdf}
          disabled={isGenerating}
          className="w-full py-3.5 rounded-2xl bg-vermilion hover:bg-vermilion-hover text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-paper cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Invoice ({currency}{grandTotal.toFixed(2)})</span>
        </button>
      </div>
    </div>
  );
}
