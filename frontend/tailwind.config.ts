import type { Config } from "tailwindcss";

// Tailwind config — extends with Dex design system tokens from style guide §3
// Note: Primary styling is done via CSS custom properties in globals.css.
// Tailwind is used for layout utilities (flex, grid, hidden, md:flex etc.)
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Map CSS vars → Tailwind tokens for use in className
        "dex-base":     "#0D1117",
        "dex-surface":  "#161B22",
        "dex-elevated": "#1C2333",
        "dex-border":   "#30363D",
        "dex-purple":   "#7C3AED",
        "dex-violet":   "#A855F7",
        "dex-gold":     "#F59E0B",
        "dex-teal":     "#2DD4BF",
        "dex-text":     "#E2E8F0",
        "dex-muted":    "#8B949E",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      screens: {
        sm:  "640px",
        md:  "768px",
        lg:  "1024px",
        xl:  "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};

export default config;
