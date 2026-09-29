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
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
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
            700: "#1d4ed8", // Primária Dark Mode / Intermediária
            800: "#1e40af", // Primária Clássica
            900: "#1e3a8a", // Primária Light Mode Institucional
            950: "#172554",
          },
          dark: {
            bg: "#081020",          // Fundo Geral Dark Mode Oficial
            secondary: "#0D172B",   // Fundo Secundário Dark
            surface: "#14213D",     // Superfície / Cards Dark Mode Oficial
            card: "#14213D",
            surfaceSecondary: "#1B2943",
            hover: "#223451",       // Hover em Dark Mode
            border: "#2A3955",      // Bordas Dark Mode Oficial
          },
          gold: {
            50: "#fefce8",
            100: "#fef9c3",
            200: "#fef08a",
            300: "#fbbf24", // Hover Acento
            400: "#f6c445", // Acento Dourado Dark Mode
            500: "#f4b400", // Acento Ouro Light Mode Institucional
            600: "#d97706",
            700: "#b45309",
            800: "#92400e",
            900: "#78350f",
          },
        },
        theme: {
          bg: "var(--background)",
          "bg-secondary": "var(--background-secondary)",
          surface: "var(--surface)",
          "surface-secondary": "var(--surface-secondary)",
          "surface-hover": "var(--surface-hover)",
          border: "var(--border)",
          primary: "var(--primary)",
          "primary-hover": "var(--primary-hover)",
          accent: "var(--accent)",
          "accent-soft": "var(--accent-soft)",
          "text-primary": "var(--text-primary)",
          "text-secondary": "var(--text-secondary)",
          "text-muted": "var(--text-muted)",
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)",
          info: "var(--info)",
        },
      },
      borderRadius: {
        input: "12px",
        btn: "12px",
        card: "16px",
        "card-featured": "20px",
        modal: "20px",
        chip: "999px",
      },
      boxShadow: {
        card: "0 8px 30px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 12px 35px rgba(0, 0, 0, 0.10)",
        "dark-card": "0 8px 30px rgba(0, 0, 0, 0.18)",
        "dark-card-hover": "0 14px 40px rgba(0, 0, 0, 0.28)",
        focus: "0 0 0 3px rgba(37, 99, 235, 0.20)",
        "focus-gold": "0 0 0 3px rgba(244, 180, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
