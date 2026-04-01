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
        primary: "#E58B79",
        secondary: "#F2DFD0",
        accent: "#86B29D",
        darkBg: "#16111A",
        cardBg: "#241B24",
        surface: "#342630",
        textPrimary: "#2C2431",
        textSecondary: "#756675",
        notePaper: "#FFFAF3",
        noteLines: "#E6D7CB",
        lavenderBase: "#FCF7F0"
      },
      boxShadow: {
        glass: "0 18px 46px rgba(205,168,147,0.14), 0 3px 12px rgba(48,27,38,0.05), inset 0 1px 0 rgba(255,255,255,0.96)",
        float: "0 20px 44px rgba(229,139,121,0.18)"
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
