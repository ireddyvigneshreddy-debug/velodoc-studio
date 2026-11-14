"use client";

import React from "react";
import { IareAssessmentType, IareDepartment } from "@/types/ppt";

export const IARE_ASSESSMENT_TYPES: IareAssessmentType[] = [
  "AAT - TECH TALK",
  "AAT - I",
  "AAT - II",
  "CONCEPT VIDEO",
  "SEMINAR",
];

export const BRANCH_QUICK_CHIPS = [
  "CSE",
  "CSD",
  "CSM",
  "CSC",
  "IT",
  "ECE",
  "EEE",
  "AE",
  "ME",
  "CE",
] as const;

export const IARE_DEPARTMENTS: IareDepartment[] = [
  "Freshman Engineering (I B.Tech)",
  "Computer Science and Engineering (CSE)",
  "CSE (Artificial Intelligence & Machine Learning)",
  "CSE (Data Science)",
  "CSE (Cyber Security)",
  "Information Technology (IT)",
  "Electronics and Communication Engineering (ECE)",
  "Electrical and Electronics Engineering (EEE)",
  "Aeronautical Engineering (AE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
];

export interface IareEmblemProps {
  className?: string;
  size?: number;
}

/**
 * Crisp Institutional Vector Crest for IARE (Autonomous)
 * Featuring Aeronautical Wings, Open Book of Learning, Atom Orbital, and Maroon/Navy/Gold Shield
 */
export function IareEmblem({ className = "w-16 h-16", size = 64 }: IareEmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IARE Institutional Crest"
    >
      <defs>
        <radialGradient id="iareGoldGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <linearGradient id="iareMaroonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#991B1B" />
          <stop offset="50%" stopColor="#8B0000" />
          <stop offset="100%" stopColor="#580000" />
        </linearGradient>
        <linearGradient id="iareNavyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0A2540" />
          <stop offset="100%" stopColor="#001833" />
        </linearGradient>
        <linearGradient id="iareWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* Outer Golden Concentric Ring */}
      <circle cx="100" cy="100" r="95" stroke="url(#iareGoldGlow)" strokeWidth="4" fill="#FFFFFF" />
      <circle cx="100" cy="100" r="88" stroke="#002147" strokeWidth="2.5" fill="url(#iareNavyGrad)" />

      {/* Circular Institutional Text Arc (Simulated Crisp Geometry) */}
      <circle cx="100" cy="100" r="76" stroke="#D97706" strokeWidth="1" strokeDasharray="3 3" />

      {/* Aeronautical Supersonic Wings Motif */}
      <path
        d="M30 92 C55 76 80 84 96 98 C100 85 108 72 120 62 C105 78 104 88 104 98 C120 84 145 76 170 92 C146 102 125 101 106 108 C105 101 100 96 95 96 C90 96 85 101 84 108 C65 101 44 102 30 92 Z"
        fill="url(#iareWingGrad)"
        stroke="#78350F"
        strokeWidth="1.2"
      />

      {/* Central Academic Shield */}
      <path
        d="M68 64 H132 V118 C132 144 100 162 100 162 C100 162 68 144 68 118 V64 Z"
        fill="url(#iareMaroonGrad)"
        stroke="#D97706"
        strokeWidth="3"
      />

      {/* Orbiting Atomic Electron Ellipses (Engineering Symbol) */}
      <ellipse
        cx="100"
        cy="104"
        rx="26"
        ry="9"
        transform="rotate(-30 100 104)"
        stroke="#FEF3C7"
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
      />
      <ellipse
        cx="100"
        cy="104"
        rx="26"
        ry="9"
        transform="rotate(30 100 104)"
        stroke="#FEF3C7"
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
      />
      <circle cx="100" cy="104" r="3.5" fill="#F59E0B" />

      {/* Open Book of Knowledge at Bottom of Shield */}
      <path
        d="M78 132 C88 126 97 127 100 131 C103 127 112 126 122 132 V142 C112 136 103 137 100 141 C97 137 88 136 78 142 V132 Z"
        fill="#FFFFFF"
        stroke="#1E293B"
        strokeWidth="1.2"
      />
      <path d="M100 131 V141" stroke="#8B0000" strokeWidth="1.2" />

      {/* Torch of Enlightenment Flame */}
      <path
        d="M97 68 C94 62 98 56 100 52 C102 56 106 62 103 68 C101 70 99 70 97 68 Z"
        fill="#F59E0B"
      />
      <circle cx="100" cy="62" r="2" fill="#FEF3C7" />

      {/* Top Banner Ribbon: IARE */}
      <rect x="72" y="32" width="56" height="18" rx="4" fill="#002147" stroke="#D97706" strokeWidth="2" />
      <text
        x="100"
        y="45"
        textAnchor="middle"
        fill="#FEF3C7"
        fontSize="12"
        fontWeight="900"
        fontFamily="sans-serif"
        letterSpacing="2"
      >
        IARE
      </text>

      {/* Bottom Ribbon: AUTONOMOUS */}
      <path
        d="M50 166 L100 178 L150 166 L144 178 L100 190 L56 178 Z"
        fill="#D97706"
        stroke="#78350F"
        strokeWidth="1.2"
      />
      <text
        x="100"
        y="178"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="8"
        fontWeight="800"
        fontFamily="sans-serif"
        letterSpacing="1"
      >
        AUTONOMOUS
      </text>
    </svg>
  );
}

/**
 * Returns a standalone SVG XML string for canvas rasterization
 */
export function getIareCrestSvgString(): string {
  return `<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="95" stroke="#D97706" stroke-width="4" fill="#FFFFFF"/>
  <circle cx="100" cy="100" r="88" stroke="#002147" stroke-width="3" fill="#002147"/>
  <circle cx="100" cy="100" r="76" stroke="#D97706" stroke-width="1" stroke-dasharray="3 3"/>
  <path d="M30 92 C55 76 80 84 96 98 C100 85 108 72 120 62 C105 78 104 88 104 98 C120 84 145 76 170 92 C146 102 125 101 106 108 C105 101 100 96 95 96 C90 96 85 101 84 108 C65 101 44 102 30 92 Z" fill="#F59E0B" stroke="#78350F" stroke-width="1.2"/>
  <path d="M68 64 H132 V118 C132 144 100 162 100 162 C100 162 68 144 68 118 V64 Z" fill="#8B0000" stroke="#D97706" stroke-width="3"/>
  <ellipse cx="100" cy="104" rx="26" ry="9" transform="rotate(-30 100 104)" stroke="#FEF3C7" stroke-width="1.5" fill="none"/>
  <ellipse cx="100" cy="104" rx="26" ry="9" transform="rotate(30 100 104)" stroke="#FEF3C7" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="104" r="3.5" fill="#F59E0B"/>
  <path d="M78 132 C88 126 97 127 100 131 C103 127 112 126 122 132 V142 C112 136 103 137 100 141 C97 137 88 136 78 142 V132 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="1.2"/>
  <path d="M100 131 V141" stroke="#8B0000" stroke-width="1.2"/>
  <path d="M97 68 C94 62 98 56 100 52 C102 56 106 62 103 68 C101 70 99 70 97 68 Z" fill="#F59E0B"/>
  <rect x="72" y="32" width="56" height="18" rx="4" fill="#002147" stroke="#D97706" stroke-width="2"/>
  <text x="100" y="45" text-anchor="middle" fill="#FEF3C7" font-size="12" font-weight="900" font-family="Arial, sans-serif" letter-spacing="2">IARE</text>
  <path d="M50 166 L100 178 L150 166 L144 178 L100 190 L56 178 Z" fill="#D97706" stroke="#78350F" stroke-width="1.2"/>
  <text x="100" y="178" text-anchor="middle" fill="#FFFFFF" font-size="8" font-weight="800" font-family="Arial, sans-serif" letter-spacing="1">AUTONOMOUS</text>
</svg>`;
}

let cachedCrestDataUrl: string | null = null;

/**
 * Generates an in-memory high-res PNG data URL from the vector crest
 * for PPTX / PDF export embedding without external network requests
 */
export async function getIareCrestDataUrl(): Promise<string> {
  if (cachedCrestDataUrl) return cachedCrestDataUrl;
  if (typeof window === "undefined") return "";

  return new Promise((resolve) => {
    try {
      const svgStr = getIareCrestSvgString();
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, 400, 400);
            const dataUrl = canvas.toDataURL("image/png");
            cachedCrestDataUrl = dataUrl;
            URL.revokeObjectURL(url);
            resolve(dataUrl);
            return;
          }
        } catch {
          // fallback
        }
        URL.revokeObjectURL(url);
        resolve("");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("");
      };
      img.src = url;
    } catch {
      resolve("");
    }
  });
}
