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
        // 背景層次（指向 CSS 變數）
        void: 'hsl(var(--color-void) / <alpha-value>)',
        surface: 'hsl(var(--color-surface) / <alpha-value>)',
        elevated: 'hsl(var(--color-elevated) / <alpha-value>)',

        // Primary Neon Orange
        primary: {
          DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
          50: '#FFF3E6',
          100: '#FFE0BF',
          200: '#FFC285',
          300: '#FFA34A',
          400: '#FF8A1F',
          500: '#FF6A00',
          600: '#CC5500',
          700: '#993F00',
          800: '#662A00',
          900: '#331500',
        },

        // Secondary Neon Cyan
        secondary: {
          DEFAULT: 'hsl(var(--color-secondary) / <alpha-value>)',
          50: '#E6FDFF',
          100: '#B3F8FF',
          200: '#80F3FF',
          300: '#4DEEFF',
          400: '#1AE9FF',
          500: '#00E5FF',
          600: '#00B8CC',
          700: '#008A99',
          800: '#005C66',
          900: '#002E33',
        },

        // Accent Neon Green
        accent: {
          DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
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

        // 文字色（僅 nested object，避免重複）
        text: {
          primary: 'hsl(var(--color-text-primary) / <alpha-value>)',
          muted: 'hsl(var(--color-text-muted) / <alpha-value>)',
          dim: 'hsl(var(--color-text-muted) / 0.7)',
        },

        // 邊框色
        border: {
          dim: 'hsl(var(--color-border-dim))',
          primary: 'hsl(var(--color-primary) / 0.3)',
        },

        // 語意色
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        error: 'hsl(var(--color-error) / <alpha-value>)',
      },

      fontFamily: {
        heading: ['"Archivo Black"', '"Noto Sans TC"', 'sans-serif'],
        body: ['"Noto Sans TC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
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
        'glow-sm': '0 0 10px hsl(var(--color-glow-primary) / 0.3)',
        'glow-md': '0 0 20px hsl(var(--color-glow-primary) / 0.4)',
        'glow-lg': '0 0 30px hsl(var(--color-glow-primary) / 0.5), 0 0 60px hsl(var(--color-glow-primary) / 0.2)',
        'glow-accent': '0 0 10px hsl(var(--color-glow-accent) / 0.5)',
        'glow-secondary': '0 0 15px hsl(var(--color-glow-secondary) / 0.3)',
        'inner-glow': 'inset 0 0 30px hsl(var(--color-glow-primary) / 0.08)',
      },

      animation: {
        'scroll-smooth': 'scroll 300ms ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-in': 'slideIn 300ms ease-out',
        'fade-out': 'fadeOut 300ms ease-in forwards',
        'fade-out-slow': 'fadeOut 3s ease-out forwards',
        'scale-in': 'scaleIn 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'shake': 'shake 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      },

      keyframes: {
        scroll: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px hsl(var(--color-glow-primary))' },
          '100%': { boxShadow: '0 0 20px hsl(var(--color-glow-primary)), 0 0 40px hsl(var(--color-glow-primary))' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.7))',
        'gradient-secondary': 'linear-gradient(135deg, hsl(var(--color-secondary)), hsl(var(--color-secondary) / 0.7))',
        'gradient-accent': 'linear-gradient(135deg, hsl(var(--color-accent)), hsl(var(--color-accent) / 0.7))',
        'scanlines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
