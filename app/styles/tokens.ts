// ============================================
// LY Design System Tokens
// ============================================
// This file contains all design tokens for the LY Lyrics Display System.
// Import specific token categories as needed:
//   import { colors, typography, spacing } from '@/styles/tokens'
// ============================================

import type { Theme } from '@/types'

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // Primary Brand Colors (Sky Blue / Cyan)
  primary: {
    50: '#e0f7fa',
    100: '#b2ebf2',
    200: '#80deea',
    300: '#4dd0e1',
    400: '#26c6da',
    500: '#00bcd4',  // Primary brand color
    600: '#00acc1',
    700: '#0097a7',
    800: '#00838f',
    900: '#006064',
  },

  // Secondary Colors (Indigo)
  secondary: {
    50: '#e8eaf6',
    100: '#c5cbe9',
    200: '#9fa8da',
    300: '#7986cb',
    400: '#5c6bc0',
    500: '#3f51b5',
    600: '#3949ab',
    700: '#303f9f',
    800: '#283593',
    900: '#1a237e',
  },

  // Accent Colors
  accent: {
    cyan: '#06b6d4',
    sky: '#0ea5e9',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    purple: '#a855f7',
    fuchsia: '#d946ef',
    pink: '#ec4899',
    rose: '#f43f5e',
  },

  // Semantic Colors
  semantic: {
    success: {
      light: '#86efac',
      DEFAULT: '#22c55e',
      dark: '#16a34a',
    },
    warning: {
      light: '#fcd34d',
      DEFAULT: '#f59e0b',
      dark: '#d97706',
    },
    error: {
      light: '#fca5a5',
      DEFAULT: '#ef4444',
      dark: '#dc2626',
    },
    info: {
      light: '#93c5fd',
      DEFAULT: '#3b82f6',
      dark: '#2563eb',
    },
  },

  // Dark Theme Colors
  dark: {
    background: {
      primary: '#0a0a0a',      // Main background
      secondary: '#171717',    // Card/Surface
      tertiary: '#262626',     // Hover state
      elevated: '#1f1f1f',     // Elevated surface
    },
    text: {
      primary: '#fafafa',      // Primary text
      secondary: '#a1a1aa',    // Secondary text
      tertiary: '#71717a',     // Tertiary text
      disabled: '#52525b',     // Disabled text
      inverse: '#0a0a0a',      // Text on primary bg
    },
    border: {
      DEFAULT: '#27272a',
      subtle: '#1e1e20',
      strong: '#3f3f46',
    },
  },

  // Light Theme Colors
  light: {
    background: {
      primary: '#ffffff',      // Main background
      secondary: '#f4f4f5',    // Card/Surface
      tertiary: '#e4e4e7',     // Hover state
      elevated: '#fafafa',     // Elevated surface
    },
    text: {
      primary: '#09090b',      // Primary text
      secondary: '#71717a',    // Secondary text
      tertiary: '#a1a1aa',     // Tertiary text
      disabled: '#d4d4d8',     // Disabled text
      inverse: '#ffffff',      // Text on primary bg
    },
    border: {
      DEFAULT: '#e4e4e7',
      subtle: '#f4f4f5',
      strong: '#d4d4d8',
    },
  },

  // Lyrics Display Specific Colors
  lyrics: {
    dark: {
      text: '#ffffff',
      textActive: '#00d4ff',      // Cyan highlight
      textDim: 'rgba(255, 255, 255, 0.4)',
      textAdjacent: 'rgba(255, 255, 255, 0.7)',
      glow: 'rgba(0, 212, 255, 0.3)',
    },
    light: {
      text: '#0a0a0a',
      textActive: '#0066cc',      // Blue highlight
      textDim: 'rgba(0, 0, 0, 0.4)',
      textAdjacent: 'rgba(0, 0, 0, 0.7)',
      glow: 'rgba(0, 102, 204, 0.2)',
    },
    transparent: {
      text: '#ffffff',
      textActive: '#00d4ff',
      textDim: 'rgba(255, 255, 255, 0.3)',
      textAdjacent: 'rgba(255, 255, 255, 0.6)',
      glow: 'rgba(0, 212, 255, 0.5)',
    },
  },

  // Status Colors
  status: {
    connected: '#22c55e',
    disconnected: '#ef4444',
    connecting: '#f59e0b',
    offline: '#6b7280',
  },
} as const

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  // Font Families
  fontFamily: {
    // Primary: System fonts for performance and native feel
    sans: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(', '),

    // Display: For lyrics (optimized for readability)
    lyrics: [
      '"SF Pro Display"',
      '-apple-system',
      'system-ui',
      'sans-serif',
    ].join(', '),

    // Monospace: For technical content
    mono: [
      '"SF Mono"',
      'Monaco',
      '"Cascadia Code"',
      '"Roboto Mono"',
      'monospace',
    ].join(', '),
  },

  // Font Sizes (Scale: 1.25 Major Third)
  fontSize: {
    // Lyrics Display Sizes
    lyricsXs: '20px',      // 1.25rem - Mobile
    lyricsSm: '24px',      // 1.5rem
    lyricsMd: '32px',      // 2rem - Default
    lyricsLg: '40px',      // 2.5rem
    lyricsXl: '48px',      // 3rem - Large display
    lyrics2Xl: '64px',     // 4rem - Extra large

    // UI Sizes
    xs: '0.75rem',         // 12px
    sm: '0.875rem',        // 14px
    base: '1rem',          // 16px
    lg: '1.125rem',        // 18px
    xl: '1.25rem',         // 20px
    '2xl': '1.5rem',       // 24px
    '3xl': '1.875rem',     // 30px
    '4xl': '2.25rem',      // 36px
  },

  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
    // Lyrics specific
    lyrics: '1.4',         // Optimal for lyrics readability
    lyricsCompact: '1.2',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// ============================================
// SPACING SCALE
// ============================================

export const spacing = {
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
  72: '18rem',       // 288px
  80: '20rem',       // 320px
  96: '24rem',       // 384px
} as const

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',     // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
} as const

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

  // Glow effects for lyrics
  glow: {
    sm: '0 0 10px rgb(0 212 255 / 0.3)',
    DEFAULT: '0 0 20px rgb(0 212 255 / 0.4)',
    lg: '0 0 30px rgb(0 212 255 / 0.5)',
    xl: '0 0 40px rgb(0 212 255 / 0.6)',
  },

  // Inner shadow for inputs
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const

// ============================================
// ANIMATIONS
// ============================================

export const animation = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
    lyricsScroll: '400ms',
  },

  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Custom easing for smooth lyrics transitions
    lyrics: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const

// ============================================
// BREAKPOINTS (Responsive)
// ============================================

export const breakpoints = {
  // Mobile first approach
  sm: '640px',      // Small tablets
  md: '768px',      // Tablets
  lg: '1024px',     // Desktop
  xl: '1280px',     // Large desktop
  '2xl': '1536px',  // Extra large desktop
} as const

// Responsive lyrics display lines
export const responsiveDisplayLines = {
  mobile: 1,        // < 768px
  tablet: 2,        // 768px - 1024px
  desktop: null,    // Use settings.displayLines
} as const

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ThemeColors {
  background: string
  surface: string
  surfaceElevated: string
  text: {
    primary: string
    secondary: string
    tertiary: string
    disabled: string
  }
  border: string
  primary: string
  lyrics: {
    text: string
    textActive: string
    textDim: string
    textAdjacent: string
    glow: string
  }
}

// ============================================
// THEME CONFIGURATIONS
// ============================================

export const themeConfig: Record<Theme, ThemeColors> = {
  dark: {
    background: colors.dark.background.primary,
    surface: colors.dark.background.secondary,
    surfaceElevated: colors.dark.background.elevated,
    text: {
      primary: colors.dark.text.primary,
      secondary: colors.dark.text.secondary,
      tertiary: colors.dark.text.tertiary,
      disabled: colors.dark.text.disabled,
    },
    border: colors.dark.border.DEFAULT,
    primary: colors.primary[500],
    lyrics: colors.lyrics.dark,
  },

  light: {
    background: colors.light.background.primary,
    surface: colors.light.background.secondary,
    surfaceElevated: colors.light.background.elevated,
    text: {
      primary: colors.light.text.primary,
      secondary: colors.light.text.secondary,
      tertiary: colors.light.text.tertiary,
      disabled: colors.light.text.disabled,
    },
    border: colors.light.border.DEFAULT,
    primary: colors.primary[600],
    lyrics: colors.lyrics.light,
  },

  transparent: {
    background: 'transparent',
    surface: 'rgba(10, 10, 10, 0.8)',
    surfaceElevated: 'rgba(30, 30, 30, 0.9)',
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.5)',
      disabled: 'rgba(255, 255, 255, 0.3)',
    },
    border: 'rgba(255, 255, 255, 0.2)',
    primary: colors.primary[500],
    lyrics: colors.lyrics.transparent,
  },
} as const

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get theme colors based on current theme
 */
export function getThemeColors(theme: Theme): ThemeColors {
  return themeConfig[theme]
}

/**
 * Get responsive display lines count
 */
export function getResponsiveDisplayLines(width: number): number | null {
  if (width < 768) return responsiveDisplayLines.mobile
  if (width < 1024) return responsiveDisplayLines.tablet
  return responsiveDisplayLines.desktop
}

/**
 * Generate glow effect for active lyric line
 */
export function getLyricsGlow(theme: Theme): string {
  const config = themeConfig[theme]
  return `0 0 20px ${config.lyrics.textActive}40`
}

// ============================================
// COMPONENT-SPECIFIC TOKENS
// ============================================

// Lyrics Display
export const lyricsDisplay = {
  // Container sizing
  container: {
    minHeight: '200px',
    maxHeight: '80vh',
    padding: { x: spacing[6], y: spacing[8] },
  },

  // Line spacing
  lineSpacing: {
    tight: spacing[2],      // 8px
    DEFAULT: spacing[4],    // 16px
    relaxed: spacing[6],    // 24px
  },

  // Highlight animation
  highlight: {
    transition: 'all 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    scale: '1.05',
    glow: '0 0 20px rgb(0 212 255 / 0.4)',
  },
} as const

// Control Buttons
export const controlButton = {
  size: {
    sm: { width: '32px', height: '32px', icon: '16px' },
    md: { width: '40px', height: '40px', icon: '20px' },
    lg: { width: '48px', height: '48px', icon: '24px' },
  },

  states: {
    default: {
      bg: colors.dark.background.tertiary,
      color: colors.dark.text.primary,
      opacity: 1,
    },
    hover: {
      bg: colors.dark.background.elevated,
      opacity: 0.9,
    },
    active: {
      bg: colors.primary[500],
      color: '#ffffff',
    },
    disabled: {
      bg: 'transparent',
      color: colors.dark.text.disabled,
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
} as const

// Form Controls (Inputs, Selects)
export const formControl = {
  input: {
    height: {
      sm: '36px',
      md: '40px',
      lg: '44px',
    },
    padding: { x: spacing[3], y: spacing[2] },
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.dark.border.DEFAULT}`,
    focus: {
      border: `1px solid ${colors.primary[500]}`,
      ring: `0 0 0 3px rgb(0 188 212 / 0.2)`,
    },
  },

  slider: {
    track: {
      height: '4px',
      bg: colors.dark.background.tertiary,
      borderRadius: borderRadius.full,
    },
    thumb: {
      width: '16px',
      height: '16px',
      bg: colors.primary[500],
      borderRadius: borderRadius.full,
      boxShadow: shadows.md,
    },
  },

  toggle: {
    width: '44px',
    height: '24px',
    track: {
      bg: colors.dark.background.tertiary,
      borderRadius: borderRadius.full,
    },
    thumb: {
      width: '20px',
      height: '20px',
      bg: '#ffffff',
      borderRadius: borderRadius.full,
      offset: '2px',
    },
    active: {
      track: colors.primary[500],
      thumbOffset: '20px',
    },
  },
} as const

// Song Selector
export const songSelector = {
  dropdown: {
    maxHeight: '300px',
    width: '100%',
    minWidth: '280px',
    borderRadius: borderRadius.lg,
    boxShadow: shadows.xl,
    padding: spacing[2],
  },

  item: {
    height: '48px',
    padding: { x: spacing[3], y: spacing[2] },
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,

    states: {
      default: {
        bg: 'transparent',
        color: colors.dark.text.primary,
      },
      hover: {
        bg: colors.dark.background.tertiary,
      },
      selected: {
        bg: `${colors.primary[500]}15`,
        color: colors.primary[500],
      },
    },
  },

  search: {
    height: '40px',
    padding: { x: spacing[3], y: spacing[2] },
    marginBottom: spacing[2],
  },
} as const

// Settings Panel
export const settingsPanel = {
  container: {
    width: '400px',
    maxWidth: '90vw',
    borderRadius: borderRadius.xl,
    padding: spacing[6],
  },

  section: {
    marginBottom: spacing[6],
  },

  header: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[3],
  },

  control: {
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.dark.text.secondary,
      marginBottom: spacing[2],
    },

    row: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[4],
    },
  },
} as const

// Connection Status Indicator
export const connectionIndicator = {
  size: {
    sm: '8px',
    md: '12px',
    lg: '16px',
  },

  status: {
    connected: {
      color: colors.status.connected,
      animation: 'none',
    },
    connecting: {
      color: colors.status.connecting,
      animation: 'pulse 1s ease-in-out infinite',
    },
    disconnected: {
      color: colors.status.disconnected,
      animation: 'none',
    },
  },
} as const
