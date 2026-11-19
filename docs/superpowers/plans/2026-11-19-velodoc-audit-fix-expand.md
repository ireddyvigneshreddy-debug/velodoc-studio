# VeloDoc Studio Audit, Optimization & Feature Expansion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate performance bottlenecks and browser freezing in PDF compression, fix memory leaks by revoking object URLs, register orphaned tools to prevent 404s with dynamic catalog category counts, and implement 7 high-utility client-side tools (Folder & File ZIP Creator, ZIP Extractor/Inspector, Lock & Unlock PDF, File Hash & Hex Inspector, Data Converter, QR Code Studio, Text & Code Diff Checker).

**Architecture:** Client-side 100% in-browser Swiss Editorial architecture with zero server uploads. PDF compression uses analytical calibration and page sampling with a single closed-loop pass and OffscreenCanvas + PDF.js buffer cleanup. Utilities leverage WebCrypto, JSZip, qrcode, and diff.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, pdf-lib, pdfjs-dist, JSZip, diff, qrcode, WebCrypto, Phosphor Icons, Framer Motion.

---

## Global Constraints
- Zero server uploads: All processing must occur strictly in-memory client-side.
- Clean Next.js build: `npm run lint` and `npm run build` must succeed without errors.
- 100% Tool Workspace Resolution: Every tool in `TOOLS` must resolve without 404 in `ToolWorkspaceView.tsx`.
- Responsive Swiss Editorial UI: All tools adhere to light/dark mode, archival typography, and standardized metrics / download cards.

---

### Task 1: Next.js Configuration Caching & Clean Build Stabilization
- Modify: `next.config.mjs`
- [ ] Remove `generateBuildId: async () => \`velodoc-${Date.now()}\`` to preserve caching across builds.
- [ ] Clean up any unwanted comments.

### Task 2: High-Performance Large-PDF Compression Engine
- Modify: `src/lib/compression-engine.ts`, `src/lib/batch-queue-engine.ts`, `src/components/tools/CompressPdfTool.tsx`
- [ ] Implement fast page sampling (e.g. 2–3 pages) to measure compressed bytes-per-pixel and analytically determine `(scale, quality)`.
- [ ] Replace 6 full-document binary-search iterations with a single full-document pass featuring closed-loop per-page budget tracking.
- [ ] Use `OffscreenCanvas` where available with standard canvas fallback.
- [ ] Call `page.cleanup?.()` immediately after each page render.
- [ ] Add `AbortSignal` support to `executeExactCompression`, `renderPdfPagesToCompressedDocument`, and `processBatchQueue`.
- [ ] Default `exactBytePadding` to `false` in `CompressPdfTool.tsx` and add Cancel button.

### Task 3: Object URL Lifecycle Management & Memory Leak Fixes
- Create: `src/hooks/useObjectUrls.ts`
- Modify: `src/components/tools/CompressPdfTool.tsx` and audit other tools in `src/components/tools/`
- [ ] Track all `URL.createObjectURL` instances and ensure revocation on reset, new upload, and unmount.

### Task 4: Fix Orphaned Tools & Dynamic Category Count
- Modify: `src/types/index.ts`, `src/lib/constants.ts`, `src/components/tools/ToolWorkspaceView.tsx`, `src/components/dashboard/ToolDirectory.tsx`, `src/components/common/ToolIcon.tsx`, `src/components/common/icons.tsx`
- [ ] Register 9 orphaned tools (`flatten-pdf`, `passport-photo`, `qr-barcode-pdf`, `invoice-generator`, `certificate-generator`, `pdf-diff-text`, `html-to-pdf`, `pdf-form-filler`, `presentation-pdf`) in `TOOLS`.
- [ ] Make category count label `"All Studio Tools (N)"` dynamic based on `TOOLS.length`.
- [ ] Support `"file"` in `toolType`.
- [ ] Ensure all required icons are registered in `TOOL_ICON_MAP`.

### Task 5: Create ZIP from Folders & Files (`/tools/create-zip`)
- Create: `src/components/tools/CreateZipTool.tsx`
- [ ] Support dragging & dropping folders (recursive `DataTransferItem.webkitGetAsEntry()`) and `<input webkitdirectory>`.
- [ ] Preserve relative directory hierarchy (`folder/subfolder/file.ext`).
- [ ] Interactive tree preview with file/folder counts, total size, and item deletion.
- [ ] Compression selector (`Store / Fast / Balanced / Maximum`) with smart bypass for pre-compressed formats.
- [ ] Live progress and cancellation support.

### Task 6: Extract & Inspect ZIP Archives (`/tools/unzip-files`)
- Create: `src/components/tools/UnzipTool.tsx`
- [ ] Parse archive via `JSZip.loadAsync`.
- [ ] Display folder structure, file sizes, compression ratio, file types.
- [ ] Individual and batch extraction with direct downloads.

### Task 7: Additional High-Utility In-Browser Tools
- Create: `src/components/tools/ProtectPdfTool.tsx` (Password protect AES-256-GCM / unlock)
- Create: `src/components/tools/FileHashTool.tsx` (SHA-256/512/1 checksums + magic-byte hex viewer)
- Create: `src/components/tools/DataConverterTool.tsx` (JSON / CSV / Markdown table converter)
- Create: `src/components/tools/QrStudioTool.tsx` (High-res PNG & SVG QR studio)
- Create: `src/components/tools/TextDiffTool.tsx` (Side-by-side text & code diff viewer)

### Task 8: Catalog Routing, Workspace Wiring & Verification
- Modify: `src/lib/constants.ts`, `src/components/tools/ToolWorkspaceView.tsx`
- [ ] Register all new tools in `TOOLS` and wire into `ToolWorkspaceView.tsx`.
- [ ] Run `npm run lint` and `npm run build` to verify zero errors.
