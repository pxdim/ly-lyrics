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
        // LY Design System Colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
      },
      fontSize: {
        // Lyrics display sizes
        'lyrics-xs': '1rem',
        'lyrics-sm': '1.25rem',
        'lyrics-base': '1.5rem',
        'lyrics-lg': '1.75rem',
        'lyrics-xl': '2rem',
        'lyrics-2xl': '2.5rem',
        'lyrics-3xl': '3rem',
        'lyrics-4xl': '3.75rem',
      },
      animation: {
        // Smooth scrolling animation
        'scroll-smooth': 'scroll 300ms ease-out',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
