import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#090A0F",
        darkCard: "#12141D",
        darkCardHover: "#181B26",
        darkBorder: "rgba(255, 255, 255, 0.08)",
        lightBg: "#F8FAFC",
        lightCard: "#FFFFFF",
        lightBorder: "rgba(0, 0, 0, 0.08)",
        accentIndigo: "#6366F1",
        accentViolet: "#8B5CF6",
        accentCyan: "#06B6D4",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-pattern": "radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 1px)",
      },
      animation: {
        "pulse-subtle": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
