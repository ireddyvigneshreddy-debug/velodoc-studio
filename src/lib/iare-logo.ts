/**
 * Official IARE Circular Institutional Crest Generator
 * High-DPI (512x512) Canvas Drawing exported to Base64 PNG
 */

let cachedLogoDataUrl: string | null = null;

// Safe pre-rendered valid PNG data URI fallback for SSR / non-browser environments
export const FALLBACK_IARE_LOGO_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVR4nGPoZmD4TwlmGDVg1IBRA4aLAQDU4YoQkpXs3QAAAABJRU5ErkJggg==";

/**
 * Draws the high-resolution 512x512 official IARE circular emblem
 * onto an offscreen HTML5 <canvas> and exports canvas.toDataURL("image/png")
 */
export function getIareLogoPngBase64(): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return cachedLogoDataUrl || FALLBACK_IARE_LOGO_DATA_URL;
  }

  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return FALLBACK_IARE_LOGO_DATA_URL;

    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const cx = 256;
    const cy = 256;

    // Clear canvas
    ctx.clearRect(0, 0, 512, 512);

    // 1. Outer Gold Ring
    ctx.beginPath();
    ctx.arc(cx, cy, 248, 0, Math.PI * 2);
    ctx.fillStyle = "#C59B27";
    ctx.fill();

    // 2. Main Navy Circular Band
    ctx.beginPath();
    ctx.arc(cx, cy, 240, 0, Math.PI * 2);
    ctx.fillStyle = "#002147";
    ctx.fill();

    // 3. Inner Gold Ring Divider
    ctx.beginPath();
    ctx.arc(cx, cy, 168, 0, Math.PI * 2);
    ctx.fillStyle = "#C59B27";
    ctx.fill();

    // 4. Inner Maroon Crest Core
    ctx.beginPath();
    ctx.arc(cx, cy, 162, 0, Math.PI * 2);
    ctx.fillStyle = "#8B0000";
    ctx.fill();

    // 5. Inner White Core
    ctx.beginPath();
    ctx.arc(cx, cy, 136, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    // Helper: Draw curved text along circle arc
    const drawCurvedText = (
      text: string,
      radius: number,
      startAngle: number,
      endAngle: number,
      font: string,
      color: string,
      inward: boolean = true
    ) => {
      ctx.save();
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const angleStep = (endAngle - startAngle) / (text.length - 1 || 1);
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const angle = startAngle + i * angleStep;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(0, inward ? -radius : radius);
        if (!inward) ctx.rotate(Math.PI);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    };

    // Draw "INSTITUTE OF AERONAUTICAL ENGINEERING" on top navy band
    drawCurvedText(
      "INSTITUTE OF AERONAUTICAL ENGINEERING",
      204,
      -Math.PI * 0.82,
      -Math.PI * 0.18,
      "bold 19px 'Times New Roman', Georgia, serif",
      "#FFFFFF"
    );

    // Draw "HYDERABAD • AUTONOMOUS" along bottom navy band
    drawCurvedText(
      "HYDERABAD  ★  AUTONOMOUS",
      204,
      Math.PI * 0.28,
      Math.PI * 0.72,
      "bold 18px 'Times New Roman', Georgia, serif",
      "#C59B27",
      false
    );

    // 6. Engineering Gear Teeth around radius 146
    ctx.save();
    ctx.fillStyle = "#C59B27";
    const teethCount = 18;
    for (let t = 0; t < teethCount; t++) {
      const angle = (t * Math.PI * 2) / teethCount;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillRect(-6, -156, 12, 16);
      ctx.restore();
    }
    ctx.restore();

    // 7. Clean inner circle to cut gear teeth cleanly
    ctx.beginPath();
    ctx.arc(cx, cy, 142, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    // 8. Aeronautical Wings Motif (Maroon & Gold)
    ctx.save();
    // Left Wing
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20);
    ctx.bezierCurveTo(cx - 50, cy - 65, cx - 115, cy - 40, cx - 128, cy - 10);
    ctx.bezierCurveTo(cx - 90, cy + 10, cx - 45, cy + 5, cx - 10, cy + 25);
    ctx.closePath();
    ctx.fillStyle = "#8B0000";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#C59B27";
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20);
    ctx.bezierCurveTo(cx + 50, cy - 65, cx + 115, cy - 40, cx + 128, cy - 10);
    ctx.bezierCurveTo(cx + 90, cy + 10, cx + 45, cy + 5, cx + 10, cy + 25);
    ctx.closePath();
    ctx.fillStyle = "#8B0000";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#C59B27";
    ctx.stroke();

    // Wing feather accents in gold
    ctx.beginPath();
    ctx.moveTo(cx - 110, cy - 8);
    ctx.lineTo(cx - 30, cy + 5);
    ctx.moveTo(cx - 95, cy - 22);
    ctx.lineTo(cx - 35, cy - 5);
    ctx.moveTo(cx + 110, cy - 8);
    ctx.lineTo(cx + 30, cy + 5);
    ctx.moveTo(cx + 95, cy - 22);
    ctx.lineTo(cx + 35, cy - 5);
    ctx.strokeStyle = "#C59B27";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 9. Atom Orbital Rings (Science & Technology)
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 75, 24, Math.PI / 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#002147";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, 75, 24, -Math.PI / 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#002147";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Center atom bead
    ctx.beginPath();
    ctx.arc(cx, cy + 10, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#C59B27";
    ctx.fill();

    // 10. Lamp of Knowledge / Torch of Learning
    // Torch Bowl
    ctx.beginPath();
    ctx.ellipse(cx, cy + 38, 28, 10, 0, 0, Math.PI);
    ctx.fillStyle = "#C59B27";
    ctx.fill();
    ctx.strokeStyle = "#002147";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Torch stem
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 46);
    ctx.lineTo(cx - 8, cy + 72);
    ctx.lineTo(cx + 8, cy + 72);
    ctx.lineTo(cx + 4, cy + 46);
    ctx.closePath();
    ctx.fillStyle = "#C59B27";
    ctx.fill();

    // Flame
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.bezierCurveTo(cx + 16, cy + 8, cx + 18, cy + 30, cx, cy + 36);
    ctx.bezierCurveTo(cx - 18, cy + 30, cx - 16, cy + 8, cx, cy - 12);
    ctx.closePath();
    ctx.fillStyle = "#D97706";
    ctx.fill();

    // Inner bright flame
    ctx.beginPath();
    ctx.moveTo(cx, cy + 4);
    ctx.bezierCurveTo(cx + 8, cy + 18, cx + 8, cy + 30, cx, cy + 34);
    ctx.bezierCurveTo(cx - 8, cy + 30, cx - 8, cy + 18, cx, cy + 4);
    ctx.closePath();
    ctx.fillStyle = "#FEF08A";
    ctx.fill();

    // 11. Bottom Banner "IARE" Ribbon
    ctx.beginPath();
    ctx.roundRect(cx - 56, cy + 78, 112, 28, 6);
    ctx.fillStyle = "#002147";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#C59B27";
    ctx.stroke();

    ctx.font = "bold 16px 'Times New Roman', Georgia, serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("IARE", cx, cy + 92);

    ctx.restore();

    cachedLogoDataUrl = canvas.toDataURL("image/png");
    return cachedLogoDataUrl;
  } catch (err) {
    console.error("Failed to render IARE logo canvas:", err);
    return FALLBACK_IARE_LOGO_DATA_URL;
  }
}
