# VeloDoc Studio ⚡

> **Next-Gen Client-Side Document & PDF Studio**  
> 100% Private • In-Memory WebAssembly & Canvas Engine • Zero Server Uploads • Zero File Size Limits

---

## 🚀 Overview

**VeloDoc Studio** is an all-in-one document and PDF manipulation web application engineered with a **"Linear meets Raycast"** aesthetic. Unlike traditional online PDF tools that transmit confidential documents to remote cloud servers, VeloDoc Studio executes all document processing **100% client-side** inside the browser sandbox using Web Workers, HTML5 Canvas, and ArrayBuffers.

- 🔒 **Zero-Cloud Privacy:** Confidential contracts, tax forms, and IDs never leave your device.
- ⚡ **Zero-Latency Execution:** Instant hardware-accelerated processing without network queue delays.
- 📦 **Unlimited File Sizes:** No artificial 25MB paywalls; bounded only by local device RAM.
- 🎨 **Sleek Aesthetic:** Dark-first `#090A0F` canvas, `#12141D` bento cards, ambient glows, keyboard command palette (`⌘K`), and fluid transitions.

---

## 🛠️ Complete 10-Tool Suite

| Tool | Route | Core Technology | Description |
|---|---|---|---|
| **Merge PDFs** | `/tools/merge-pdf` | `pdf-lib` | Combine multiple PDF documents with drag-and-drop file reordering and page inspection. |
| **Remove Pages** | `/tools/remove-pages` | `pdfjs-dist` + `pdf-lib` | Visual page thumbnail grid with clickable red deletion overlays and range filters. |
| **Add / Insert Pages** | `/tools/add-pages` | `pdf-lib` | Insert custom blank pages (A4, Letter, match-original) or graft pages from an auxiliary PDF. |
| **Split & Extract** | `/tools/split-pdf` | `pdf-lib` + `jszip` | Extract selected pages into a new PDF or split every page into a packaged `.zip` archive. |
| **Reorder & Rotate** | `/tools/organize-pdf` | `pdf-lib` | Visual grid with 90° CW/CCW rotation, page duplication, shift left/right, and sequence management. |
| **Compress PDF** | `/tools/compress-pdf` | `pdfjs-dist` + Canvas + `pdf-lib` | Extreme, Recommended, and Lossless structural presets with byte-saving guarantees. |
| **PDF to Images** | `/tools/pdf-to-image` | `pdfjs-dist` + Canvas + `jszip` | Render pages to crisp PNG, JPG, or WebP images at 1x, 2x, or 3x DPI with ZIP download. |
| **Images to PDF** | `/tools/image-to-pdf` | `pdf-lib` + Canvas | Convert multi-image collections into formatted PDFs with custom page sizes, orientations, and margins. |
| **Watermark & Numbers** | `/tools/watermark-pdf` | `pdf-lib` | Text watermarks (diagonal 45° / centered, custom opacity, color) and header/footer page numbering. |
| **Image Studio** | `/tools/image-studio` | `browser-image-compression` + `jszip` | Batch image compression and format transcoding (PNG ↔ JPG ↔ WebP) with live quality slider. |

---

## 🏗️ Architecture & Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript, strictly `"use client"` interactive tool views)
- **Styling:** Tailwind CSS + custom glassmorphic cards + dark/light mode toggle
- **Motion & Icons:** Lucide Icons + `canvas-confetti`
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

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Zero-Config Vercel Deployment

Deploy directly to Vercel with zero configuration:

```bash
npm run build
```

The application is built to be 100% serverless-safe:
- No backend API routes needed.
- No Node canvas native bindings needed.
- Static HTML generation (SSG) for instant page loads.
- Client-side Web Workers for all PDF and image workloads.

---

## 📜 License

MIT License. 100% Original IP and open-source permissive code.
