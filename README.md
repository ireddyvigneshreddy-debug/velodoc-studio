# VeloDoc Studio ⚡

> **Swiss-Precision Client-Side Document & Presentation Workbench**  
> 100% Private • In-Memory WebAssembly & OffscreenCanvas • Zero Server Uploads • Zero File Size Caps

---

## Architecture Overview

**VeloDoc Studio** is an air-gapped, on-device document manipulation and academic presentation suite. Designed with a Swiss Editorial aesthetic (Warm Archival Paper `#F7F6F2`, Deep Charcoal `#18181B`, Terracotta Rust `#C2410C`, and Muted Sage `#2E5A44`), VeloDoc Studio runs entirely client-side inside browser memory using WebAssembly, HTML5 Canvas, and typed `ArrayBuffer` primitives.

- **Air-Gapped Privacy:** Confidential tax filings, contracts, transcripts, and credentials never leave local device RAM.
- **Hardware-Accelerated In-Memory Processing:** Direct typed array manipulation with zero server roundtrips, queue bottlenecks, or rate limits.
- **Uniform 4-Column Tool Directory:** 19 precision modules covering compression, conversion, structural editing, and sanitization.
- **Official IARE Tech Talk / AAT 13-Slide Studio:** Native 16:9 presentation generation with authentic Master Slide geometry, institutional emblem, side headers, and PPTX/PDF export via `pptxgenjs`.
- **Target Binary-Search Compressor:** Converges on exact kilobyte/megabyte boundaries required by government, exam, and visa portals.
- **Pro Camera Document Scanner:** 4K optical capture with auto-stability detection and document filter presets (*Magic Color*, *Crisp B&W*, *Clean Grayscale*).

---

## 19-Tool Precision Catalog

| Tool | Route | Module Family | Description |
|---|---|---|---|
| **Exact-Target Compress PDF** | `/tools/compress-pdf` | Optimization | Hit exact target KB/MB limits or percentage reduction with binary-search canvas compression. |
| **Exact-Target Image Studio** | `/tools/image-studio` | Optimization | Batch compress photos to exact target KB (20 KB / 50 KB portal forms) and convert formats. |
| **Flatten PDF Forms** | `/tools/flatten-pdf` | Optimization | Flatten interactive form fields, annotations, and vector layers into fixed printable pages. |
| **Merge PDFs Pro** | `/tools/merge-pdf` | Sequence | Combine up to 30 documents with drag-and-drop ordering and duplex scan interleaving. |
| **Split & Burst PDF** | `/tools/split-pdf` | Sequence | Split by page ranges, partition every N pages, or burst all pages to an organized ZIP archive. |
| **Organize, Reorder & Rotate** | `/tools/organize-pdf` | Sequence | Rearrange pages, rotate 90° CW/CCW/180°, duplicate sheets, reverse sequence, or sort. |
| **Add & Insert Pages** | `/tools/add-pages` | Sequence | Visual timeline with insertion slots to add blank, lined, grid, or external PDF pages. |
| **Remove / Delete Pages** | `/tools/remove-pages` | Security | Visual thumbnail grid with instant odd/even page selection, inverted selection, and range filters. |
| **Crop & Resize Margins** | `/tools/crop-pdf` | Security | Visually trim margins or standardize documents into A4, US Letter, or Legal bounds. |
| **Images to PDF** | `/tools/image-to-pdf` | Conversion | Compile multi-image collections into formatted PDFs with smart sorting and zero-border full-bleed layout. |
| **Camera to PDF** | `/tools/camera-to-pdf` | Conversion | Hardware webcam and phone camera scanner with auto-shutter, scan filters, alignment guides, and PDF export. |
| **PDF to Images Studio** | `/tools/pdf-to-image` | Conversion | Render pages to high-resolution PNG, JPG, or WebP images up to 600 DPI with ZIP export. |
| **Extract Text & Markdown** | `/tools/pdf-to-text` | Conversion | Extract structured text preserving layout flow with live editor and JSON/MD export. |
| **Markdown to PDF** | `/tools/markdown-to-pdf` | Conversion | Split-screen Markdown editor with live preview, headings, tables, and instant PDF rendering. |
| **Sign & Annotate PDF** | `/tools/sign-pdf` | Security | Draw signatures, generate typographic cursive signatures, stamp images, and add date stamps. |
| **Redact & Sanitize PDF** | `/tools/redact-pdf` | Security | Draw blackout redactions over sensitive text and permanently rasterize pages securely. |
| **Multi-Doc Compare Studio** | `/tools/compare-pdf` | Security | Upload 2–30 PDFs to visually diff page changes with synchronized scrolling and visual diffing. |
| **Stamp & Watermark Pro** | `/tools/watermark-pdf` | Annotation | Add text or image logo watermarks across a 9-point grid or full diagonal tile grid. |
| **Page Numbers & Bates** | `/tools/page-numbers` | Annotation | Add custom page numbers, Bates legal stamping (`DOC-0001`), and alternating book margins. |
| **Grayscale & Clean Scan** | `/tools/grayscale-pdf` | Optimization | Convert color PDFs to pure grayscale or high-contrast black-and-white scan mode. |
| **PDF Metadata Inspector** | `/tools/metadata-pdf` | Security | Inspect, edit, or sanitize all internal PDF dictionary metadata (Title, Author, Producer). |

---

## Academic Presentation Studio (IARE AAT 13-Slide Engine)

Integrated at the base of the homepage, the **IARE Presentation Studio** generates official 13-slide PowerPoint (`.pptx`) and PDF decks adhering strictly to Institute of Aeronautical Engineering (IARE) guidelines:

1. **Title & Student Metadata Slide** (Topic, Student Name, Roll No, Branch, Subject, Assessment Type)
2. **Introduction / Context**
3. **Problem Statement & Engineering Motivation**
4. **Core Technical Architecture / Methodology**
5. **Detailed Algorithm / Working Principles**
6. **Key Formulae / Mathematical Formulation**
7. **Simulation / Implementation Workflow**
8. **Comparative Analysis / Benchmarks**
9. **Real-World Engineering Applications**
10. **Advantages & Limitations**
11. **Future Research Directions**
12. **Conclusion & Key Takeaways**
13. **Standard Academic References**

---

## Technical Specifications

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS + Swiss Editorial Design Tokens
- **Icons:** Phosphor Icons (`@phosphor-icons/react`)
- **PDF Manipulation:** `pdf-lib` (vector manipulation) + `pdfjs-dist` (canvas rendering)
- **Presentation Engine:** `pptxgenjs` (dynamic XML presentation builder)
- **Image Processing:** `browser-image-compression` + HTML5 OffscreenCanvas
- **Archive Generation:** `jszip` (in-memory ZIP compilation)

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/vigneshreddy-dev/velodoc-studio.git
cd velodoc-studio

# Install dependencies
npm install

# Start development server
npm run dev
```

Navigate to `http://localhost:3000` in any modern Chromium, Firefox, or WebKit browser.
