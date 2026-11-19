import imageCompression from "browser-image-compression";
import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";

export interface ImageProcessingOptions {
  format: "image/jpeg" | "image/png" | "image/webp";
  quality: number; // 0.1 to 1.0
  maxWidth?: number;
  maxHeight?: number;
}

export interface ExactImageOptions {
  mode: "exact-kb" | "percentage" | "manual";
  targetKb?: number;
  percentageReduction?: number;
  format: "image/jpeg" | "image/webp" | "image/png";
  maxWidth?: number;
  maxHeight?: number;
  manualQuality?: number;
}

export interface ProcessedImageResult {
  id: string;
  originalFile: File;
  originalSize: number;
  processedBlob: Blob;
  processedSize: number;
  name: string;
  dataUrl: string;
  savedPercentage: number;
  iterationsRun?: number;
}

export async function processSingleImage(
  file: File,
  options: ImageProcessingOptions
): Promise<ProcessedImageResult> {
  const extensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const ext = extensionMap[options.format] || "jpg";
  const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
  const newFilename = `${baseName}_optimized.${ext}`;

  try {
    const compressionOptions = {
      maxSizeMB: Math.max(0.1, (file.size / (1024 * 1024)) * options.quality),
      maxWidthOrHeight: options.maxWidth || 2560,
      useWebWorker: true,
      fileType: options.format,
      initialQuality: options.quality,
    };

    let processedBlob: Blob;

    try {
      processedBlob = await imageCompression(file, compressionOptions);
    } catch {
      processedBlob = await canvasConvertImage(file, options);
    }

    const dataUrl = await imageCompression.getDataUrlFromFile(
      processedBlob as File
    );
    const savedBytes = Math.max(0, file.size - processedBlob.size);
    const savedPercentage = Math.round((savedBytes / file.size) * 100);

    return {
      id: Math.random().toString(36).substring(7),
      originalFile: file,
      originalSize: file.size,
      processedBlob,
      processedSize: processedBlob.size,
      name: newFilename,
      dataUrl,
      savedPercentage,
    };
  } catch (err) {
    console.warn("Canvas conversion fallback due to:", err);
    const processedBlob = await canvasConvertImage(file, options);
    const dataUrl = URL.createObjectURL(processedBlob);
    const savedBytes = Math.max(0, file.size - processedBlob.size);
    const savedPercentage = Math.round((savedBytes / file.size) * 100);

    return {
      id: Math.random().toString(36).substring(7),
      originalFile: file,
      originalSize: file.size,
      processedBlob,
      processedSize: processedBlob.size,
      name: newFilename,
      dataUrl,
      savedPercentage,
    };
  }
}

/**
 * Precision Binary-Search Compression for Single Images
 * Converges to user-specified target size (e.g. 50 KB passport photo) or percentage.
 */
export async function compressImageExact(
  file: File,
  options: ExactImageOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessedImageResult> {
  const originalSize = file.size;
  let targetBytes = originalSize;

  if (options.mode === "exact-kb" && options.targetKb) {
    targetBytes = Math.floor(options.targetKb * 1024);
  } else if (options.mode === "percentage" && options.percentageReduction) {
    targetBytes = Math.floor(originalSize * ((100 - options.percentageReduction) / 100));
  }

  const extensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extensionMap[options.format] || "jpg";
  const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
  const newFilename = `${baseName}_compressed.${ext}`;

  // Manual Mode: Single pass
  if (options.mode === "manual") {
    onProgress?.("Applying manual image settings...", 50);
    const blob = await canvasConvertImage(file, {
      format: options.format,
      quality: options.manualQuality || 0.8,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
    });
    const dataUrl = URL.createObjectURL(blob);
    const savedBytes = Math.max(0, originalSize - blob.size);
    const savedPercentage = Math.round((savedBytes / originalSize) * 100);

    return {
      id: Math.random().toString(36).substring(7),
      originalFile: file,
      originalSize,
      processedBlob: blob,
      processedSize: blob.size,
      name: newFilename,
      dataUrl,
      savedPercentage,
      iterationsRun: 1,
    };
  }

  // Binary search loop
  let low = 0.05;
  let high = 0.98;
  let bestBlob: Blob | null = null;
  let bestDiff = Infinity;
  let iterationsRun = 0;

  onProgress?.("Initiating precision image compression...", 15);

  for (let iter = 0; iter < 7; iter++) {
    iterationsRun++;
    const midQuality = (low + high) / 2;
    // Scale factor tied smoothly to quality
    const scaleFactor = Math.min(1.0, 0.4 + midQuality * 0.6);

    onProgress?.(
      `Iterative convergence pass ${iter + 1}/7 (Quality ${(midQuality * 100).toFixed(0)}%)...`,
      Math.round(20 + (iter / 7) * 70)
    );

    const candidateBlob = await canvasConvertImageWithScale(
      file,
      options.format,
      midQuality,
      scaleFactor,
      options.maxWidth,
      options.maxHeight
    );

    const diff = Math.abs(candidateBlob.size - targetBytes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestBlob = candidateBlob;
    }

    // Convergence threshold: within 3% or within 2KB
    if (diff / targetBytes < 0.03 || diff < 2048) {
      bestBlob = candidateBlob;
      break;
    }

    if (candidateBlob.size > targetBytes) {
      high = midQuality;
    } else {
      low = midQuality;
    }
  }

  onProgress?.("Finalizing compressed image...", 100);

  const finalBlob = bestBlob || (await canvasConvertImage(file, {
    format: options.format,
    quality: 0.7,
  }));
  const dataUrl = URL.createObjectURL(finalBlob);
  const savedBytes = Math.max(0, originalSize - finalBlob.size);
  const savedPercentage = Math.round((savedBytes / originalSize) * 100);

  return {
    id: Math.random().toString(36).substring(7),
    originalFile: file,
    originalSize,
    processedBlob: finalBlob,
    processedSize: finalBlob.size,
    name: newFilename,
    dataUrl,
    savedPercentage,
    iterationsRun,
  };
}

async function canvasConvertImageWithScale(
  file: File,
  format: "image/jpeg" | "image/png" | "image/webp",
  quality: number,
  scaleMultiplier: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let targetWidth = Math.round(img.naturalWidth * scaleMultiplier);
      let targetHeight = Math.round(img.naturalHeight * scaleMultiplier);

      if (maxWidth && targetWidth > maxWidth) {
        const ratio = maxWidth / targetWidth;
        targetWidth = maxWidth;
        targetHeight = Math.round(targetHeight * ratio);
      }
      if (maxHeight && targetHeight > maxHeight) {
        const ratio = maxHeight / targetHeight;
        targetHeight = maxHeight;
        targetWidth = Math.round(targetWidth * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(16, targetWidth);
      canvas.height = Math.max(16, targetHeight);
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas 2D context"));
        return;
      }

      if (format === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          canvas.width = 1;
          canvas.height = 1;
          if (blob) resolve(blob);
          else reject(new Error("Blob generation failed"));
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image failed to load in canvas"));
    };

    img.src = objectUrl;
  });
}

async function canvasConvertImage(
  file: File,
  options: ImageProcessingOptions
): Promise<Blob> {
  return canvasConvertImageWithScale(
    file,
    options.format,
    options.quality,
    1.0,
    options.maxWidth,
    options.maxHeight
  );
}

export async function packageImagesToZip(
  images: ProcessedImageResult[]
): Promise<Blob> {
  const blobWriter = new BlobWriter("application/zip");
  const zipWriter = new ZipWriter(blobWriter);

  for (const img of images) {
    await zipWriter.add(img.name, new BlobReader(img.processedBlob), {
      level: 0,
    });
  }

  return await zipWriter.close();
}
