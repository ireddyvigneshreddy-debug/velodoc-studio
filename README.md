# VeloDoc Pro ⚡ — Ultra-Premium Tactile Edition

> **Award-Winning Client-Side Document & PDF Studio**  
> 100% Private • In-Memory WebAssembly & Canvas Engine • Zero Server Uploads • Zero File Size Limits

---

## 🚀 Overview

**VeloDoc Pro** is an ultra-premium, tactile web application with velvety surface textures, cursor-reactive lighting, and 60 FPS spring physics. Engineered with a **"Linear meets Raycast & CleanShot X"** aesthetic, VeloDoc Pro processes documents **100% client-side** inside the browser sandbox using Web Workers, HTML5 Canvas, and ArrayBuffers.

- 🔒 **Zero-Cloud Privacy:** Confidential contracts, tax forms, and IDs never leave your device.
- ⚡ **Zero-Latency Execution:** Instant hardware-accelerated processing without network queue delays.
- 📦 **30-Document Zero-Crash Batch Engine:** Bounded only by local device RAM; process up to 30 files in parallel.
- 🎨 **5-Layer Tactile Aesthetic:** Deep obsidian base (`#05060B`), film-grain noise texture, masked architectural grid, breathing aurora mesh, and cursor-reactive spotlight cards (`SpotlightCard`).
- 🎯 **Binary-Search Compression:** Hit exact target KB/MB sizes (passport & portal safe) with precision tolerances.
- 📷 **Pro Camera Document Scanner:** 4K optics, hands-free auto-shutter stability detection, Leica-style HUD, and live document filters (*Magic Color*, *Crisp B&W*, *Clean Grayscale*).

---

## 🛠️ Complete 19-Tool Studio Catalog

| Tool | Route | Family | Description |
|---|---|---|---|
| **Exact-Target Compress PDF** | `/tools/compress-pdf` | Emerald/Teal | Hit exact target KB/MB limits or % reduction with binary-search canvas compression. |
| **Exact-Target Image Studio** | `/tools/image-studio` | Emerald/Teal | Batch compress photos to exact target KB (20 KB/50 KB passport forms) and convert formats. |
| **Merge PDFs Pro** | `/tools/merge-pdf` | Indigo/Violet | Combine up to 30 documents with drag-and-drop ordering and duplex scan interleaving. |
| **Split & Burst PDF** | `/tools/split-pdf` | Indigo/Violet | Split by ranges, split every N pages, extract visual selections, or burst all pages to ZIP. |
| **Organize, Reorder & Rotate** | `/tools/organize-pdf` | Indigo/Violet | Rearrange pages, rotate 90° CW/CCW/180°, duplicate, reverse sequence, or sort. |
| **Add & Insert Pages** | `/tools/add-pages` | Indigo/Violet | Visual timeline with '+ Insert Here' buttons to add blank, lined, grid, or external pages. |
| **Remove / Delete Pages** | `/tools/remove-pages` | Indigo/Violet | Visual thumbnail grid with instant odd/even page selection and range filters. |
| **Crop & Resize Margins** | `/tools/crop-pdf` | Indigo/Violet | Visually trim margins or standardize documents into A4, Letter, or Legal sizes. |
| **Images & Camera to PDF** | `/tools/image-to-pdf` | Cyan/Sky | Scan documents with 4K camera studio or compile multi-image collections into PDFs. |
| **PDF to Images Studio** | `/tools/pdf-to-image` | Cyan/Sky | Render pages to high-res PNG, JPG, or WebP images up to 600 DPI with ZIP export. |
| **Extract Text & Markdown** | `/tools/pdf-to-text` | Cyan/Sky | Extract structured text preserving layout flow with live editor and JSON/MD export. |
| **Markdown to PDF** | `/tools/markdown-to-pdf` | Cyan/Sky | Split-screen Markdown editor with live preview, headings, tables, and instant PDF rendering. |
| **Sign & Annotate PDF** | `/tools/sign-pdf` | Amber/Rose | Draw signatures, generate cursive signatures, stamp images, add date stamps, and text boxes. |
| **Redact & Sanitize PDF** | `/tools/redact-pdf` | Amber/Rose | Draw blackout boxes over sensitive areas and permanently rasterize pages securely. |
| **Multi-Doc Compare Studio** | `/tools/compare-pdf` | Amber/Rose | Upload 2–30 PDFs to visually diff page changes with synchronized scrolling and red diff. |
| **Stamp & Watermark Pro** | `/tools/watermark-pdf` | Amber/Rose | Add text or image logo watermarks across a 9-point grid or full diagonal tile grid. |
| **Page Numbers & Bates** | `/tools/page-numbers` | Amber/Rose | Add custom page numbers, Bates legal stamping (`DOC-0001`), and alternating book margins. |
| **Grayscale & Clean Scan** | `/tools/grayscale-pdf` | Amber/Rose | Convert color PDFs to pure grayscale or high-contrast black-and-white scan mode. |
| **PDF Metadata Inspector** | `/tools/metadata-pdf` | Amber/Rose | Inspect, edit, or sanitize all internal PDF dictionary fields (Title, Author, Producer). |

---

## 🏗️ Architecture & Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript, strictly `"use client"` interactive tool views)
- **Styling:** Tailwind CSS + 5-layer surface & texture architecture + dark/light mode toggle
- **Motion & Icons:** Framer Motion spring physics + Lucide Icons + `canvas-confetti`
- **PDF Engine:** `pdf-lib` (vector manipulation) + `pdfjs-dist` (canvas rendering)
- **Image Engine:** `browser-image-compression` + HTML5 Offscreen Canvas + `jspdf`
- **Archiving:** `jszip` (client-side ZIP generation)

---

## 💻 Getting Started Locally

```bash
# Clone the repository
git clone https://github.com/your-username/velodoc-studio.git
cd velodoc-studio

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
