import React from "react";

export function BrandLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
      >
        <defs>
          <linearGradient id="veloGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="veloGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        {/* Origami geometric folded document */}
        {/* Background sheet */}
        <path
          d="M10 6C8.89543 6 8 6.89543 8 8V32C8 33.1046 8.89543 34 10 34H26C27.1046 34 28 33.1046 28 32V14L20 6H10Z"
          fill="url(#veloGrad1)"
          opacity="0.85"
        />

        {/* Dynamic velocity chevrons cut into sheet */}
        <path
          d="M13 18L19 23L13 28"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 18L25 23L19 28"
          stroke="#A5F3FC"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Folded corner flap */}
        <path
          d="M20 6V13C20 13.5523 20.4477 14 21 14H28L20 6Z"
          fill="#FFFFFF"
          fillOpacity="0.45"
        />

        {/* Foreground accent facet */}
        <path
          d="M24 14L32 22V32C32 33.1046 31.1046 34 30 34H28V18L24 14Z"
          fill="url(#veloGrad2)"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
