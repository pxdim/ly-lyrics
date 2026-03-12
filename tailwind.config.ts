import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Tech Color Palette
        void: '#030304',
        surface: '#0A0A0C',
        elevated: '#0F1115',

        // Primary Electric Blue
        primary: {
          DEFAULT: '#00D9FF',
          50: '#E6FAFF',
          100: '#CCF5FF',
          200: '#99EBFF',
          300: '#66E0FF',
          400: '#33D6FF',
          500: '#00D9FF',
          600: '#00AECC',
          700: '#008299',
          800: '#005566',
          900: '#002933',
        },

        // Secondary Neon Purple
        secondary: {
          DEFAULT: '#A855F7',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },

        // Accent Neon Green
        accent: {
          DEFAULT: '#00FF88',
          50: '#E6FFF3',
          100: '#CCFFE7',
          200: '#99FFCE',
          300: '#66FFB5',
          400: '#33FF9C',
          500: '#00FF88',
          600: '#00CC6D',
          700: '#009952',
          800: '#006637',
          900: '#00331B',
        },

        // Text colors
        text: {
          primary: '#FFFFFF',
          muted: '#8A8F98',
          dim: '#6B7280',
        },

        // Border colors
        border: {
          dim: 'rgba(255, 255, 255, 0.08)',
          primary: 'rgba(0, 217, 255, 0.3)',
        },
      },

      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body: ['Exo 2', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      fontSize: {
        // Scale
        'xs': '0.75rem',    // 12px
        'sm': '0.875rem',   // 14px
        'base': '1rem',     // 16px
        'lg': '1.125rem',   // 18px
        'xl': '1.25rem',    // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
        '6xl': '3.75rem',   // 60px
        '7xl': '4.5rem',    // 72px
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

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      borderRadius: {
        '4xl': '2rem',
      },

      boxShadow: {
        'glow-sm': '0 0 5px rgba(0, 217, 255, 0.5)',
        'glow-md': '0 0 10px rgba(0, 217, 255, 0.6)',
        'glow-lg': '0 0 20px rgba(0, 217, 255, 0.7), 0 0 40px rgba(0, 217, 255, 0.4)',
        'glow-accent': '0 0 10px rgba(0, 255, 136, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(0, 217, 255, 0.1)',
      },

      animation: {
        'scroll-smooth': 'scroll 300ms ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-in': 'slideIn 300ms ease-out',
      },

      keyframes: {
        scroll: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #00D9FF' },
          '100%': { boxShadow: '0 0 20px #00D9FF, 0 0 40px #00D9FF' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #00D9FF, #00B8FF)',
        'gradient-secondary': 'linear-gradient(135deg, #A855F7, #9333EA)',
        'gradient-accent': 'linear-gradient(135deg, #00FF88, #00CC6D)',
        'scanlines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
