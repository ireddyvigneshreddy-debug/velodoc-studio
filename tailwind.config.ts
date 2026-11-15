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
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Warm Archival Paper Light Theme (Default)
        paper: {
          50: "#FAF9F5",
          100: "#F7F6F2",
          200: "#EFECE4",
          300: "#E2E0D8",
          400: "#CBC7BD",
          500: "#A8A397",
        },
        ink: {
          primary: "#18181B",
          secondary: "#52525B",
          muted: "#71717A",
          faint: "#A1A1AA",
        },
        // Editorial Accents
        terracotta: {
          DEFAULT: "#C2410C",
          hover: "#9A3412",
          light: "#FDF2ED",
          dark: "#7C2D12",
        },
        rust: {
          DEFAULT: "#C2410C",
          hover: "#9A3412",
          light: "#FDF2ED",
        },
        vermilion: {
          DEFAULT: "#C2410C",
          hover: "#9A3412",
          light: "#FDF2ED",
        },
        navy: {
          DEFAULT: "#1E3A5F",
          hover: "#142740",
          light: "#EBF1F7",
        },
        forest: {
          DEFAULT: "#2E5A44",
          hover: "#224332",
          light: "#EDF5F2",
        },
        sage: {
          DEFAULT: "#2E5A44",
          hover: "#224332",
          light: "#EDF5F2",
        },
        ochre: {
          DEFAULT: "#B45309",
          hover: "#92400E",
          light: "#FEF3C7",
        },
        // Matte Charcoal Dark Theme
        charcoal: {
          900: "#161615",
          800: "#1C1C1B",
          700: "#262624",
          600: "#363633",
          border: "#2A2A28",
        },
        // Compatibility mappings
        darkBg: "#161615",
        darkCard: "#1C1C1B",
        darkCardHover: "#262624",
        darkBorder: "#2A2A28",
        lightBg: "#F7F6F2",
        lightCard: "#FFFFFF",
        lightBorder: "#E2E0D8",
        accentIndigo: "#C2410C",
        accentViolet: "#1E3A5F",
        accentCyan: "#2E5A44",
      },
      boxShadow: {
        "paper": "0 1px 2px rgba(24, 24, 27, 0.04), 0 1px 1px rgba(24, 24, 27, 0.02)",
        "paper-elevated": "0 2px 6px rgba(24, 24, 27, 0.06)",
        "paper-modal": "0 16px 36px -8px rgba(24, 24, 27, 0.12), 0 0 1px rgba(24, 24, 27, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
