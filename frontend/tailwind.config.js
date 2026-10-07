/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#000000",
          hover: "#18181B",
          dark: "#FFFFFF",
        },
        surface: {
          light: "#F6F7F9",
          dark: "#171A21",
        },
        bg: {
          light: "#FFFFFF",
          dark: "#0F1115",
        },
        border: {
          light: "#E4E7EC",
          dark: "#2A2F3A",
        },
        text: {
          light: "#101828",
          dark: "#E6E8EC",
        },
        muted: {
          light: "#667085",
          dark: "#98A2B3",
        },
        highlight: "rgba(250, 204, 21, 0.45)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        pulseHighlight: {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
      },
      animation: {
        "pulse-highlight": "pulseHighlight 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
