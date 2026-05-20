import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090b",
          900: "#0c0d10",
          850: "#101216",
          800: "#14171c",
          700: "#1c2026",
          600: "#262b33",
          500: "#3a4049",
          400: "#5b6471",
          300: "#8a92a0",
          200: "#b6bcc6",
          100: "#dcdfe5",
          50: "#f0f2f5",
        },
        accent: {
          // restrained warm amber — feels like a terminal cursor, not SaaS purple
          DEFAULT: "#f5c451",
          soft: "#f5c45122",
          dim: "#a07c1f",
        },
        ok: "#7fb685",
        warn: "#e3a857",
        err: "#e07a7a",
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        // tight, opinionated scale
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
      },
      letterSpacing: {
        tightish: "-0.01em",
      },
      boxShadow: {
        "elev-1": "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.04)",
      },
      keyframes: {
        caret: {
          "0%, 50%": { opacity: "1" },
          "50.01%, 100%": { opacity: "0.25" },
        },
      },
      animation: {
        caret: "caret 1.1s steps(1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
