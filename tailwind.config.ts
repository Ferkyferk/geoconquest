import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ── Game palette ────────────────────────────────
        game: {
          bg:       "#1a1510",
          surface:  "#241e16",
          border:   "#3a3020",
          gold:     "#D4AF37",
          "gold-lt":"#F0C040",
          green:    "#22C55E",
          "green-dk":"#15803D",
          red:      "#DC2626",
          "red-dk": "#991B1B",
          muted:    "#7C6E52",
          text:     "#EDE0C4",
          "text-dim":"#9C8A6E",
        },
      },
      fontFamily: {
        cinzel: ["var(--font-cinzel)", "Georgia", "serif"],
        barlow: ["var(--font-barlow)", "system-ui", "sans-serif"],
      },
      keyframes: {
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%":     { transform: "translateX(-8px)" },
          "40%":     { transform: "translateX(8px)" },
          "60%":     { transform: "translateX(-6px)" },
          "80%":     { transform: "translateX(6px)" },
        },
        "score-pop": {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        shake:      "shake 0.45s ease-in-out",
        "score-pop":"score-pop 0.35s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
