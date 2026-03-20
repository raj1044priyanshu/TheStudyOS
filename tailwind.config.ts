import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7B6CF6",
        secondary: "#C4B5FD",
        accent: "#6EE7B7",
        darkBg: "#161222",
        cardBg: "#221C31",
        surface: "#2A233A",
        textPrimary: "#1C1B29",
        textSecondary: "#6B6880",
        notePaper: "#FEFCE8",
        noteLines: "#E3E0D4",
        lavenderBase: "#F0EEF8"
      },
      boxShadow: {
        glass: "0 4px 24px rgba(123,108,246,0.08), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
        float: "0 16px 40px rgba(123,108,246,0.14)"
      },
      backdropBlur: {
        xs: "2px"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "shimmer-x": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pen-write": {
          "0%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(180px)" },
          "100%": { transform: "translateX(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out",
        "shimmer-x": "shimmer-x 1.6s linear infinite",
        "pen-write": "pen-write 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
