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
        school: {
          blue: {
            50: "#eff6ff",
            100: "#dbeafe",
            200: "#bfdbfe",
            300: "#93c5fd",
            400: "#60a5fa",
            500: "#3b82f6",
            600: "#2563eb", // Primária Brilhante
            700: "#1d4ed8",
            800: "#1e40af", // Primária Clássica
            900: "#1e3a8a",
            950: "#172554",
          },
          dark: {
            surface: "#1e293b", // Slate 800 - Superfície Dark Mode
            bg: "#0f172a",      // Slate 900 - Fundo Geral Dark
            card: "#1e293b",
            border: "#334155",
            hover: "#2d3c52",
          },
          gold: {
            50: "#fefce8",
            100: "#fef9c3",
            200: "#fef08a",
            300: "#fde047",
            400: "#facc15", // Acento Amarelo Dourado Claro
            500: "#eab308", // Acento Âmbar Principal
            600: "#ca8a04",
            700: "#a16207",
            800: "#854d0e",
            900: "#713f12",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
