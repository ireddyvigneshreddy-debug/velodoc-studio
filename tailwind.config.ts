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
        // Archival Paper Light Theme (Default)
        paper: {
          50: "#FBFBFA",
          100: "#F6F5F1",
          200: "#EEECE5",
          300: "#E2DFD7",
          400: "#CBC7BD",
          500: "#A8A397",
        },
        ink: {
          primary: "#141413",
          secondary: "#57554E",
          muted: "#88867E",
          faint: "#B5B2A8",
        },
        // Accents
        vermilion: {
          DEFAULT: "#D94E28",
          hover: "#C2411C",
          light: "#FDF2ED",
          dark: "#A33718",
        },
        forest: {
          DEFAULT: "#1B4D3E",
          hover: "#143A2F",
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
        // Backwards compatibility mappings
        darkBg: "#161615",
        darkCard: "#1C1C1B",
        darkCardHover: "#262624",
        darkBorder: "#2A2A28",
        lightBg: "#F6F5F1",
        lightCard: "#FFFFFF",
        lightBorder: "#E2DFD7",
        accentIndigo: "#D94E28",
        accentViolet: "#1B4D3E",
        accentCyan: "#B45309",
      },
      boxShadow: {
        "paper": "0 1px 2px rgba(20, 20, 19, 0.05), 0 1px 3px rgba(20, 20, 19, 0.03)",
        "paper-elevated": "0 4px 12px -2px rgba(20, 20, 19, 0.06), 0 2px 4px -1px rgba(20, 20, 19, 0.04)",
        "paper-modal": "0 20px 40px -8px rgba(20, 20, 19, 0.12), 0 0 1px rgba(20, 20, 19, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
