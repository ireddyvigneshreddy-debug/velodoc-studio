# Extreme Performance, Zero-Crash Resilience & Tool Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform VeloDoc Studio into an ultra-high-performance, zero-crash client-side studio and cleanly separate PDF Tools and Image Tools across navigation, bento grid, quick switchers, and command palette.

**Architecture:**
- **Zero-Crash Resilience Layer:** Implement comprehensive React Error Boundaries (`ToolErrorBoundary`, `GlobalErrorBoundary`, and Next.js App Router `error.tsx` handlers) with diagnostic capture and one-click workspace reset. Introduce defensive input validation, dual-engine fallback (pdf-lib ↔ pdfjs), safe ArrayBuffer sub-view slicing (`toSafeArrayBuffer`), and resilient single-page thumbnail failure isolation.
- **Extreme Performance Engine:** Enforce cooperative multitasking (`yieldToMain(10)`), aggressive canvas dimension zeroing (`canvas.width=1; canvas.height=1`) & pooling, zero-overhead direct Blob/ArrayBuffer pipelines (eliminating manual `atob` character loops and double canvas encodings), and hardware-adaptive multi-threaded batch processing.
- **Tool Domain Separation:** Add `toolType: "pdf" | "image"` to `ToolDefinition`. Re-architect `BentoGrid` with a dedicated segmented switcher (All Tools, PDF Tools, Image Tools), update `Navbar` navigation, group tools in Quick Tool Switcher and Command Palette by domain, and display type-specific badges and layout dividers.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React 18, `pdf-lib`, `pdfjs-dist`, `browser-image-compression`, HTML5 Canvas, Tailwind CSS, Lucide Icons.

---

## Global Constraints
- Preserve 100% client-side privacy (no server uploads, no external data transmissions).
- Keep dark-first aesthetic matching Linear/Raycast design language (`#090A0F` canvas, `#12141D` bento cards, indigo/cyan neon accents).
- Strictly non-breaking: all 19 tools must retain full feature parity and route URLs (`/tools/[toolId]`).
- TypeScript strict compliance (`npm run build` must pass cleanly with zero warnings or errors).

---

## File Structure

### New Files
- `src/components/common/ErrorBoundary.tsx` — Robust class-based React Error Boundary with recovery UI, diagnostic reporting, and auto-reset.
- `src/app/error.tsx` — Next.js root error boundary.
- `src/app/tools/[toolId]/error.tsx` — Next.js per-tool workspace error boundary.

### Modified Files
- `src/types/index.ts` — Add `toolType: "pdf" | "image"` to `ToolDefinition`, add error boundary types.
- `src/lib/constants.ts` — Classify all 19 tools with explicit `toolType`, update categories.
- `src/lib/utils.ts` — Add `toSafeArrayBuffer()`, `createSafeBlob()`, bulletproof buffer slicing.
- `src/lib/pdf-engine.ts` — Add dual-engine fallback (`pdf-lib` + `pdfjs`), safe page thumbnail generation with error isolation, canvas zeroing, cooperative event-loop yields, eliminate double encodings.
- `src/lib/compression-engine.ts` — Replace slow `atob` character loops with direct canvas blobs, canvas dimension zeroing, and cooperative event loop yields.
- `src/lib/batch-queue-engine.ts` — Hardware-adaptive concurrency, robust error suppression, and pool cleanup.
- `src/lib/session-history.ts` — Safe buffer handling when restoring chained files.
- `src/components/dashboard/BentoGrid.tsx` — Primary segmented filter (All, PDF Tools, Image Tools), category sub-filtering, domain headers.
- `src/components/layout/Navbar.tsx` — Direct quick links and filters for PDF Tools and Image Tools.
- `src/components/tools/ToolWorkspaceView.tsx` — Wrap tool views in `ToolErrorBoundary`, group quick switcher by PDF vs Image.
- `src/components/common/CommandPalette.tsx` — Group results into "PDF Tools" and "Image Tools & Converters".
- `src/components/tools/*.tsx` — Replace unsafe `.buffer as ArrayBuffer` with `toSafeArrayBuffer` or direct Blob parts, add defensive input checks (0-byte files, corrupt files, empty selections).

---

## Tasks

### Task 1: Type Definitions, Constants & Safe Buffer Utilities
- [ ] Update `src/types/index.ts` to include `toolType: "pdf" | "image"` on `ToolDefinition`.
- [ ] Update `src/lib/constants.ts` to tag each of the 19 tools with `toolType: "pdf"` or `toolType: "image"`.
- [ ] In `src/lib/utils.ts`, implement `toSafeArrayBuffer(bytes: Uint8Array | ArrayBuffer): ArrayBuffer` to safely handle sub-view offsets without buffer corruption.
- [ ] In `src/lib/utils.ts`, update `createPdfBlob` to accept `Uint8Array | ArrayBuffer` safely without misaligned `.buffer` access.
- [ ] Update `src/lib/session-history.ts` to use safe buffer conversion for chained files.

### Task 2: Zero-Crash Error Boundaries (Global, Workspace, and Route-level)
- [ ] Create `src/components/common/ErrorBoundary.tsx` featuring `ToolErrorBoundary` and `GlobalErrorBoundary` with reset handlers, error diagnostics copy, and sleek dark-mode UI.
- [ ] Create `src/app/error.tsx` for Next.js app-level crash recovery.
- [ ] Create `src/app/tools/[toolId]/error.tsx` for per-tool error isolation.
- [ ] Update `src/components/tools/ToolWorkspaceView.tsx` to wrap active tool components in `ToolErrorBoundary`.

### Task 3: PDF Engine & Compression Engine Extreme Performance & Resilience
- [ ] In `src/lib/pdf-engine.ts`, upgrade `getPdfPageCount` with dual-engine fallback (tries `pdf-lib`, automatically falls back to `pdfjs` on syntax/xref error).
- [ ] In `src/lib/pdf-engine.ts`, update `renderAllPagesThumbnails` to isolate single-page errors with fallback thumbnail cards and zero canvas dimensions on each pass.
- [ ] In `src/lib/pdf-engine.ts`, inject `yieldToMain(10)` in `convertPdfToImages`, `renderAllPagesThumbnails`, and `mergePdfsPro`.
- [ ] In `src/lib/pdf-engine.ts`, optimize `convertPdfToImages` by eliminating double encodings (use `URL.createObjectURL(blob)` instead of recalculating base64 dataUrl).
- [ ] In `src/lib/compression-engine.ts`, replace slow `atob` character-by-character loops with direct `canvas.toBlob` and `arrayBuffer()`.
- [ ] In `src/lib/compression-engine.ts`, add canvas zeroing (`canvas.width = 1; canvas.height = 1`) and cooperative yielding.

### Task 4: Fix Buffer Misalignments & Add Defensive Guards Across All 19 Tools
- [ ] Replace all `.buffer as ArrayBuffer` with `toSafeArrayBuffer(bytes)` or direct `new Blob([bytes])` across:
  - `MergePdfTool.tsx`
  - `CompressPdfTool.tsx`
  - `SplitPdfTool.tsx`
  - `RemovePagesTool.tsx`
  - `AddPagesTool.tsx`
  - `OrganizePdfTool.tsx`
  - `PdfToImageTool.tsx`
  - `ImageToPdfTool.tsx`
  - `ImageStudioTool.tsx`
  - `SignPdfTool.tsx`
  - `RedactPdfTool.tsx`
  - `PageNumbersTool.tsx`
  - `CropPdfTool.tsx`
  - `GrayscalePdfTool.tsx`
  - `PdfToTextTool.tsx`
  - `MarkdownToPdfTool.tsx`
  - `MetadataPdfTool.tsx`
  - `ComparePdfTool.tsx`
  - `WatermarkPdfTool.tsx`
- [ ] Add defensive input guards (0-byte file check, unsupported type check, empty page selection check) to each tool before running operations.

### Task 5: Separate PDF Tools and Image Tools in UI & Navigation
- [ ] Update `src/components/dashboard/BentoGrid.tsx` with a primary segmented toggle: **All Tools (19)** | 📑 **PDF Tools (16)** | 🖼️ **Image Tools (3)**.
- [ ] Add domain grouping headers ("PDF Power Tools" and "Image Studio & Conversion Suite") in the Bento Grid when viewing all tools.
- [ ] Update `src/components/layout/Navbar.tsx` with dedicated "PDF Tools" and "Image Tools" navigation links that activate the respective view.
- [ ] Update Quick Tool Switcher in `src/components/tools/ToolWorkspaceView.tsx` to group tools under "PDF Tools (16)" and "Image Tools (3)".
- [ ] Update `src/components/common/CommandPalette.tsx` to group search results under "PDF Tools" and "Image Tools".

### Task 6: Verification & End-to-End Testing
- [ ] Run `npm run build` to verify clean TypeScript compilation and static page generation.
- [ ] Test PDF tools (Merge, Compress, Remove, Split, Organize) with sample and edge-case inputs.
- [ ] Test Image tools (Image Studio, Image to PDF, PDF to Image) with conversions and batch runs.
- [ ] Verify error boundaries catch simulated faults without unmounting the app.
- [ ] Verify tool switching, URL routing, and search filtering work seamlessly.
