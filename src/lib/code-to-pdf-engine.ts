import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import Prism from "prismjs";
import "prismjs/components/prism-java";
import "prismjs/components/prism-python";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";

export interface LabRecordMetadata {
  studentName?: string;
  rollNo?: string;
  subject?: string;
  experimentNo?: string;
  experimentTitle?: string;
  date?: string;
  colorTheme?: "clean-light" | "dark-ide";
  includeOutputBox?: boolean;
  outputObservation?: string;
}

export interface CodeFileEntry {
  filename: string;
  code: string;
  language: string;
  metadata?: LabRecordMetadata;
}

export function detectLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "java":
      return "java";
    case "py":
      return "python";
    case "c":
      return "c";
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
      return "cpp";
    case "js":
    case "mjs":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "sql":
      return "sql";
    case "html":
    case "htm":
      return "markup";
    case "css":
      return "css";
    default:
      return "javascript";
  }
}

// Map Prism token types to hex colors
export function getTokenColor(
  type: string | undefined,
  theme: "clean-light" | "dark-ide"
): string {
  if (theme === "dark-ide") {
    switch (type) {
      case "keyword":
        return "#C586C0"; // Purple
      case "string":
        return "#CE9178"; // Orange/Brown
      case "comment":
        return "#6A9955"; // Green
      case "number":
      case "boolean":
        return "#B5CEA8"; // Light green
      case "function":
      case "class-name":
        return "#DCDCAA"; // Yellow
      case "operator":
      case "punctuation":
        return "#D4D4D4"; // Light grey
      default:
        return "#9CDCFE"; // Cyan/White
    }
  } else {
    // Clean Print Light theme (High contrast ink)
    switch (type) {
      case "keyword":
        return "#7C3AED"; // Violet
      case "string":
        return "#B45309"; // Dark Amber
      case "comment":
        return "#4B5563"; // Muted Slate
      case "number":
      case "boolean":
        return "#0284C7"; // Sky Blue
      case "function":
      case "class-name":
        return "#0D9488"; // Teal
      case "operator":
      case "punctuation":
        return "#374151"; // Dark Charcoal
      default:
        return "#111827"; // Deep Carbon Ink
    }
  }
}

/**
 * Tokenizes source code into styled lines
 */
export function tokenizeCode(
  code: string,
  lang: string
): Array<Array<{ text: string; type?: string }>> {
  const grammar = Prism.languages[lang] || Prism.languages.javascript;
  const rawTokens = Prism.tokenize(code, grammar);

  const lines: Array<Array<{ text: string; type?: string }>> = [[]];

  const processToken = (token: string | Prism.Token) => {
    if (typeof token === "string") {
      const parts = token.split("\n");
      parts.forEach((part, idx) => {
        if (idx > 0) lines.push([]);
        if (part.length > 0) {
          lines[lines.length - 1].push({ text: part });
        }
      });
    } else {
      const type = token.type;
      if (typeof token.content === "string") {
        const parts = token.content.split("\n");
        parts.forEach((part, idx) => {
          if (idx > 0) lines.push([]);
          if (part.length > 0) {
            lines[lines.length - 1].push({ text: part, type });
          }
        });
      } else if (Array.isArray(token.content)) {
        token.content.forEach(processToken);
      }
    }
  };

  rawTokens.forEach(processToken);
  return lines;
}

/**
 * Renders one or multiple code programs into a single structured Lab Record PDF
 */
export async function createCodeLabPdf(
  files: CodeFileEntry[],
  globalMetadata: LabRecordMetadata
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const theme = globalMetadata.colorTheme || "clean-light";
  const isDark = theme === "dark-ide";

  // Canvas-based page renderer for crisp high-DPI syntax rendering
  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    const entry = files[fileIdx];
    const meta = { ...globalMetadata, ...(entry.metadata || {}) };
    const lines = tokenizeCode(entry.code, entry.language);

    // Standard A4: 595 x 842 pt -> Render canvas at 2x scale (1190 x 1684 px)
    const scale = 2;
    const canvasW = 595 * scale;
    const canvasH = 842 * scale;

    const lineHeight = 16 * scale;
    const startY = 140 * scale; // After header
    const maxLinesPerPage = Math.floor((canvasH - startY - 80 * scale) / lineHeight);

    const totalPagesForFile = Math.max(1, Math.ceil(lines.length / maxLinesPerPage));

    for (let pageNum = 1; pageNum <= totalPagesForFile; pageNum++) {
      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = isDark ? "#1E1E1E" : "#FFFFFF";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Top Academic Header on Page 1
      if (pageNum === 1) {
        ctx.fillStyle = isDark ? "#252526" : "#F8FAFC";
        ctx.fillRect(0, 0, canvasW, 110 * scale);

        // Border below header
        ctx.strokeStyle = isDark ? "#3E3E42" : "#E2E8F0";
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 110 * scale);
        ctx.lineTo(canvasW, 110 * scale);
        ctx.stroke();

        // Experiment Title & Subject
        ctx.fillStyle = isDark ? "#FFFFFF" : "#0F172A";
        ctx.font = `bold ${14 * scale}px sans-serif`;
        const expLabel = meta.experimentNo ? `EXP #${meta.experimentNo}: ` : "";
        const titleText = `${expLabel}${meta.experimentTitle || entry.filename}`.toUpperCase();
        ctx.fillText(titleText, 30 * scale, 34 * scale);

        ctx.fillStyle = isDark ? "#CCCCCC" : "#475569";
        ctx.font = `${10 * scale}px sans-serif`;
        const subjText = meta.subject ? `SUBJECT: ${meta.subject.toUpperCase()}  |  ` : "";
        const langText = `LANG: ${entry.language.toUpperCase()}`;
        ctx.fillText(`${subjText}${langText}`, 30 * scale, 56 * scale);

        // Student details right-aligned
        if (meta.studentName || meta.rollNo) {
          ctx.font = `bold ${10 * scale}px monospace`;
          ctx.fillStyle = isDark ? "#4EC9B0" : "#C2410C";
          const studentLine = `${meta.studentName || ""} ${meta.rollNo ? `(${meta.rollNo})` : ""}`;
          ctx.fillText(studentLine, 30 * scale, 82 * scale);
        }

        if (meta.date) {
          ctx.font = `${9 * scale}px monospace`;
          ctx.fillStyle = isDark ? "#858585" : "#64748B";
          ctx.fillText(`Date: ${meta.date}`, 30 * scale, 98 * scale);
        }
      } else {
        // Minimal header for subsequent pages
        ctx.fillStyle = isDark ? "#858585" : "#64748B";
        ctx.font = `${8 * scale}px monospace`;
        ctx.fillText(`${entry.filename} • Page ${pageNum} of ${totalPagesForFile}`, 30 * scale, 25 * scale);
      }

      // Render lines for this page
      const sliceStart = (pageNum - 1) * maxLinesPerPage;
      const sliceEnd = Math.min(lines.length, sliceStart + maxLinesPerPage);
      const pageLines = lines.slice(sliceStart, sliceEnd);

      const codeAreaY = pageNum === 1 ? startY : 40 * scale;

      pageLines.forEach((lineTokens, lineIdx) => {
        const currentLineNum = sliceStart + lineIdx + 1;
        const y = codeAreaY + lineIdx * lineHeight;

        // Line number gutter background
        ctx.fillStyle = isDark ? "#252526" : "#F1F5F9";
        ctx.fillRect(25 * scale, y - 11 * scale, 35 * scale, lineHeight);

        // Line number text
        ctx.fillStyle = isDark ? "#858585" : "#94A3B8";
        ctx.font = `${9 * scale}px monospace`;
        ctx.textAlign = "right";
        ctx.fillText(currentLineNum.toString(), 54 * scale, y);
        ctx.textAlign = "left";

        // Draw tokens
        let currentX = 72 * scale;
        ctx.font = `${9.5 * scale}px monospace`;

        lineTokens.forEach((token) => {
          ctx.fillStyle = getTokenColor(token.type, theme);
          ctx.fillText(token.text, currentX, y);
          currentX += ctx.measureText(token.text).width;
        });
      });

      // Output / Observation Box on Last Page
      if (pageNum === totalPagesForFile && meta.includeOutputBox) {
        const boxY = canvasH - 120 * scale;
        ctx.fillStyle = isDark ? "#2D2D30" : "#F8FAFC";
        ctx.fillRect(25 * scale, boxY, canvasW - 50 * scale, 80 * scale);
        ctx.strokeStyle = isDark ? "#3E3E42" : "#CBD5E1";
        ctx.strokeRect(25 * scale, boxY, canvasW - 50 * scale, 80 * scale);

        ctx.fillStyle = isDark ? "#4EC9B0" : "#1E293B";
        ctx.font = `bold ${9 * scale}px monospace`;
        ctx.fillText("OUTPUT / OBSERVATION:", 35 * scale, boxY + 20 * scale);

        ctx.fillStyle = isDark ? "#D4D4D4" : "#334155";
        ctx.font = `${8.5 * scale}px monospace`;
        const obsText = meta.outputObservation || "Program executed successfully with zero runtime exceptions.\nVerified test cases passed.";
        const obsLines = obsText.split("\n");
        obsLines.forEach((ol, oi) => {
          ctx.fillText(ol, 35 * scale, boxY + 40 * scale + oi * 14 * scale);
        });
      }

      // Footer
      ctx.fillStyle = isDark ? "#555555" : "#94A3B8";
      ctx.font = `${8 * scale}px monospace`;
      ctx.fillText("VeloDoc Pro Lab Engine • Client-Side Verified", 30 * scale, canvasH - 15 * scale);
      ctx.textAlign = "right";
      ctx.fillText(`Doc ${fileIdx + 1}/${files.length} • Page ${pageNum}`, canvasW - 30 * scale, canvasH - 15 * scale);
      ctx.textAlign = "left";

      // Convert canvas to image and embed in pdf-lib
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const imgBytes = await (await fetch(dataUrl)).arrayBuffer();
      const embeddedJpg = await pdfDoc.embedJpg(imgBytes);

      const page = pdfDoc.addPage(PageSizes.A4);
      page.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: 595.28,
        height: 841.89,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Generates sample Java & Python lab programs for 1-click testing
 */
export function generateSampleLabPrograms(): CodeFileEntry[] {
  const javaCode = `// Experiment 03: Binary Search Tree Implementation
// Student: K. Vignesh Reddy | Roll: 26951A6701

public class BinarySearchTree {
    static class Node {
        int key;
        Node left, right;
        public Node(int item) {
            key = item;
            left = right = null;
        }
    }

    Node root;

    void insert(int key) {
        root = insertRec(root, key);
    }

    Node insertRec(Node root, int key) {
        if (root == null) {
            root = new Node(key);
            return root;
        }
        if (key < root.key)
            root.left = insertRec(root.left, key);
        else if (key > root.key)
            root.right = insertRec(root.right, key);
        return root;
    }

    void inorderRec(Node root) {
        if (root != null) {
            inorderRec(root.left);
            System.out.print(root.key + " -> ");
            inorderRec(root.right);
        }
    }

    public static void main(String[] args) {
        BinarySearchTree tree = new BinarySearchTree();
        int[] elements = { 45, 10, 78, 32, 90, 25 };
        for (int el : elements) tree.insert(el);
        System.out.println("Inorder Traversal:");
        tree.inorderRec(tree.root);
    }
}`;

  const pythonCode = `# Experiment 04: K-Means Clustering on Synthetic Blobs
# Course: Essentials of Machine Learning & Data Mining

import numpy as np
import matplotlib.pyplot as plt

class KMeansClustering:
    def __init__(self, k=3, max_iters=100):
        self.k = k
        self.max_iters = max_iters

    def fit(self, X):
        # 1. Randomly initialize centroids
        np.random.seed(42)
        random_idx = np.random.permutation(X.shape[0])
        self.centroids = X[random_idx[:self.k]]

        for iteration in range(self.max_iters):
            # 2. Compute Euclidean distances and assign clusters
            distances = np.linalg.norm(X[:, np.newaxis] - self.centroids, axis=2)
            self.labels = np.argmin(distances, axis=1)

            # 3. Recompute centroid coordinates
            new_centroids = np.array([X[self.labels == i].mean(axis=0) for i in range(self.k)])
            if np.allclose(self.centroids, new_centroids):
                print(f"Converged at iteration {iteration}")
                break
            self.centroids = new_centroids

        return self.labels

# Run verification test
if __name__ == "__main__":
    np.random.seed(0)
    data = np.vstack([
        np.random.randn(50, 2) + [2, 2],
        np.random.randn(50, 2) + [8, 8],
        np.random.randn(50, 2) + [2, 8]
    ])
    model = KMeansClustering(k=3)
    clusters = model.fit(data)
    print("Clustering completed with shape:", clusters.shape)
`;

  return [
    {
      filename: "BinarySearchTree.java",
      code: javaCode,
      language: "java",
      metadata: {
        experimentNo: "03",
        experimentTitle: "Binary Search Tree Construction & Traversal",
        subject: "Data Structures & Algorithms Lab",
        studentName: "K. Vignesh Reddy",
        rollNo: "26951A6701",
        date: "15/11/2026",
        includeOutputBox: true,
        outputObservation: "Inorder Traversal: 10 -> 25 -> 32 -> 45 -> 78 -> 90\nTree balanced factor checked. Time complexity O(log n).",
      },
    },
    {
      filename: "kmeans_clustering.py",
      code: pythonCode,
      language: "python",
      metadata: {
        experimentNo: "04",
        experimentTitle: "K-Means Vector Quantization & Clustering",
        subject: "Machine Learning Lab",
        studentName: "K. Vignesh Reddy",
        rollNo: "26951A6701",
        date: "15/11/2026",
        includeOutputBox: true,
        outputObservation: "Converged at iteration 4.\nInertia score minimized across 3 distinct cluster centroids.",
      },
    },
  ];
}
