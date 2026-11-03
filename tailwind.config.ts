import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#1a2332",
        muted: "#5a6a7e",
        surface: {
          bg: "#f6f8fa",
          card: "#ffffff",
          subtle: "#f8fafb",
          border: "#d8dee6",
          borderSubtle: "#edf0f4",
        },
        accent: {
          DEFAULT: "#0f6b6b",
          hover: "#0b5555",
          light: "#e3f2f2",
          border: "#99f6e4",
          dark: "#0a4a4a",
        },
        good: {
          DEFAULT: "#15803d",
          bg: "#ecfdf5",
          border: "#86efac",
        },
        warn: {
          DEFAULT: "#b45309",
          bg: "#fef3c7",
          border: "#fde68a",
        },
        danger: {
          DEFAULT: "#dc2626",
          bg: "#fef2f2",
          border: "#fecaca",
        },
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        clinical: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        navy: {
          800: "#0f172a",
          850: "#0b132b",
          900: "#0a0f1d",
          950: "#060a14",
        },
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px rgba(0,0,0,.05)",
        md: "0 4px 14px rgba(15,107,107,.08)",
        glow: "0 4px 14px rgba(15,107,107,.25)",
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
