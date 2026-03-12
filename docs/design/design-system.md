# LY Design System Specification

**Version:** 1.0
**Last Updated:** 2026-03-12
**Author:** UI/UX Designer

---

## Overview

This document defines the complete design token specification for the LY Lyrics Display System. All frontend components must reference these tokens to ensure visual consistency across the application.

---

## 1. Design Tokens (TypeScript)

### 1.1 Token File Location

```
app/styles/tokens.ts
```

### 1.2 Complete Token Specification

```typescript
// ============================================
// LY Design System Tokens
// ============================================

import { type Theme } from '@/types'

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

  // Keyframe definitions (for CSS)
  keyframes: {
    fadeIn: 'fadeIn 300ms ease-out',
    fadeOut: 'fadeOut 300ms ease-in',
    slideUp: 'slideUp 300ms ease-out',
    slideDown: 'slideDown 300ms ease-out',
    scaleIn: 'scaleIn 200ms ease-out',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    spin: 'spin 1s linear infinite',
    glow: 'glow 1.5s ease-in-out infinite alternate',
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

// Type definitions
interface ThemeColors {
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
```

---

## 2. Component Specifications

### 2.1 LyricsDisplay Component

**File:** `app/components/lyrics/LyricsDisplay.tsx`

#### Container Dimensions

| Breakpoint | Width | Height | Display Lines |
|------------|-------|--------|---------------|
| Mobile (< 768px) | 100% | 200px | 1 |
| Tablet (768-1024px) | 100% | 300px | 2-3 |
| Desktop (> 1024px) | 100% | 60vh | User setting |

#### Typography

| Property | Value |
|----------|-------|
| Font Family | `typography.fontFamily.lyrics` |
| Font Size | Settings-based (20px - 64px) |
| Line Height | 1.4 (recommended) |
| Letter Spacing | 0.01em (slightly wider for readability) |
| Text Align | Center (default), configurable |

#### Line Spacing

- **Tight:** 8px between lines
- **Default:** 16px between lines
- **Relaxed:** 24px between lines

#### Highlight Effects

**Active Line:**
- Color: `textActive` from theme
- Scale: 1.05
- Glow: `0 0 20px ${textActive}40`
- Transition: `all 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`

**Adjacent Lines:**
- Color: `textAdjacent` (70% opacity)
- Scale: 1.0

**Other Lines:**
- Color: `textDim` (40% opacity)
- Scale: 1.0

#### Animation Specifications

| Property | Value |
|----------|-------|
| Scroll Duration | 400ms |
| Scroll Easing | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| Highlight Fade | 300ms ease-out |

### 2.2 LyricsControl Component

**File:** `app/components/lyrics/LyricsControl.tsx`

#### Button Styles

**Size Variants:**

| Size | Width | Height | Icon Size | Border Radius |
|------|-------|--------|-----------|---------------|
| sm | 32px | 32px | 16px | 8px |
| md | 40px | 40px | 20px | 8px |
| lg | 48px | 48px | 24px | 12px |

**States:**

| State | Background | Color | Opacity |
|-------|------------|-------|---------|
| Default | `background.tertiary` | `text.primary` | 1 |
| Hover | `background.elevated` | - | 0.9 |
| Active | `primary[500]` | `#ffffff` | 1 |
| Disabled | Transparent | `text.disabled` | 0.5 |

**Transitions:**
- Duration: 150ms
- Easing: `ease-out`

#### Control Panel Layout

```
┌─────────────────────────────────────┐
│  [◀]  [▶]     [Settings]   [Status] │
└─────────────────────────────────────┘
```

- Gap between buttons: 12px
- Padding: 16px
- Border radius: 12px

### 2.3 SongSelector Component

**File:** `app/components/songs/SongSelector.tsx`

#### Dropdown Styles

| Property | Value |
|----------|-------|
| Max Height | 300px |
| Width | 100% (min 280px) |
| Border Radius | 12px |
| Box Shadow | `xl` |
| Padding | 8px |

#### Dropdown Item Styles

| Property | Value |
|----------|-------|
| Height | 48px |
| Padding | 12px horizontal, 8px vertical |
| Border Radius | 6px |
| Font Size | 16px |
| Font Weight | 400 |

**Item States:**
- **Default:** Transparent background
- **Hover:** `background.tertiary`
- **Selected:** `primary[500]` at 15% opacity with `primary[500]` text

#### Search Input Styles

| Property | Value |
|----------|-------|
| Height | 40px |
| Padding | 12px horizontal, 8px vertical |
| Margin Bottom | 8px |
| Border Radius | 6px |
| Font Size | 14px |

### 2.4 SettingsPanel Component

**File:** `app/components/settings/SettingsPanel.tsx`

#### Container Styles

| Property | Value |
|----------|-------|
| Width | 400px (max 90vw) |
| Border Radius | 16px |
| Padding | 24px |
| Background | `surface` |

#### Section Styles

| Property | Value |
|----------|-------|
| Margin Bottom | 24px |

#### Control Row Styles

```
┌─────────────────────────────────┐
│ Label                    [Control] │
└─────────────────────────────────┘
```

- Display: flex
- Align items: center
- Justify content: space-between
- Gap: 16px

#### Form Control Styles

**Slider:**
- Track height: 4px
- Track background: `background.tertiary`
- Thumb size: 16px x 16px
- Thumb color: `primary[500]`

**Toggle Switch:**
- Width: 44px
- Height: 24px
- Thumb size: 20px
- Animation: 200ms ease-out

---

## 3. Color Palette Reference

### 3.1 Primary Brand Colors (Cyan/Sky)

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#e0f7fa` | Background tints |
| 100-400 | - | Hover states |
| **500** | `#00bcd4` | **Primary brand color** |
| 600-900 | - | Emphasis, gradients |

### 3.2 Dark Theme Colors

| Element | Hex | Usage |
|---------|-----|-------|
| Background (primary) | `#0a0a0a` | Main background |
| Background (secondary) | `#171717` | Cards, surfaces |
| Background (tertiary) | `#262626` | Hover states |
| Text (primary) | `#fafafa` | Main text |
| Text (secondary) | `#a1a1aa` | Labels, descriptions |
| Text (dim) | `#71717a` | Disabled, tertiary |
| Border | `#27272a` | Dividers, borders |

### 3.3 Light Theme Colors

| Element | Hex | Usage |
|---------|-----|-------|
| Background (primary) | `#ffffff` | Main background |
| Background (secondary) | `#f4f4f5` | Cards, surfaces |
| Background (tertiary) | `#e4e4e7` | Hover states |
| Text (primary) | `#09090b` | Main text |
| Text (secondary) | `#71717a` | Labels, descriptions |
| Text (dim) | `#a1a1aa` | Disabled, tertiary |
| Border | `#e4e4e7` | Dividers, borders |

### 3.4 Semantic Colors

| Type | Light | Default | Dark | Usage |
|------|-------|---------|------|-------|
| Success | `#86efac` | `#22c55e` | `#16a34a` | Connected, saved |
| Warning | `#fcd34d` | `#f59e0b` | `#d97706` | Connecting |
| Error | `#fca5a5` | `#ef4444` | `#dc2626` | Disconnected, failed |
| Info | `#93c5fd` | `#3b82f6` | `#2563eb` | Information |

### 3.5 Lyrics Display Colors

**Dark Theme:**
| Element | Hex |
|---------|-----|
| Text | `#ffffff` |
| Text Active | `#00d4ff` |
| Text Dim | `rgba(255, 255, 255, 0.4)` |
| Text Adjacent | `rgba(255, 255, 255, 0.7)` |
| Glow | `rgba(0, 212, 255, 0.3)` |

**Light Theme:**
| Element | Hex |
|---------|-----|
| Text | `#0a0a0a` |
| Text Active | `#0066cc` |
| Text Dim | `rgba(0, 0, 0, 0.4)` |
| Text Adjacent | `rgba(0, 0, 0, 0.7)` |
| Glow | `rgba(0, 102, 204, 0.2)` |

**Transparent (NDI):**
| Element | Hex |
|---------|-----|
| Text | `#ffffff` |
| Text Active | `#00d4ff` |
| Text Dim | `rgba(255, 255, 255, 0.3)` |
| Text Adjacent | `rgba(255, 255, 255, 0.6)` |
| Glow | `rgba(0, 212, 255, 0.5)` |

---

## 4. Typography Reference

### 4.1 Font Family Stack

**Primary (UI):**
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

**Lyrics Display:**
```
"SF Pro Display", -apple-system, system-ui, sans-serif
```

**Monospace:**
```
"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace
```

### 4.2 Font Size Scale

| Name | Size | Usage |
|------|------|-------|
| lyricsXs | 20px | Mobile lyrics |
| lyricsSm | 24px | Small lyrics |
| lyricsMd | 32px | Default lyrics |
| lyricsLg | 40px | Large lyrics |
| lyricsXl | 48px | Extra large lyrics |
| lyrics2Xl | 64px | Huge display |
| xs | 12px | Labels, captions |
| sm | 14px | Secondary text |
| base | 16px | Body text |
| lg | 18px | Emphasized text |
| xl | 20px | Subheadings |
| 2xl | 24px | Headings |

### 4.3 Font Weight Scale

| Name | Value | Usage |
|------|-------|-------|
| normal | 400 | Body text |
| medium | 500 | Emphasis |
| semibold | 600 | Headings |
| bold | 700 | Strong emphasis |

### 4.4 Line Height Scale

| Name | Value | Usage |
|------|-------|-------|
| tight | 1.25 | Compact display |
| normal | 1.5 | Body text |
| lyrics | 1.4 | Lyrics display (optimized) |
| loose | 2 | Spaced out text |

---

## 5. Animation Specifications

### 5.1 Duration

| Name | Duration | Usage |
|------|----------|-------|
| instant | 0ms | No animation |
| fast | 150ms | Hover, focus |
| normal | 300ms | Modal, transitions |
| slow | 500ms | Page transitions |
| lyricsScroll | 400ms | Lyrics line change |

### 5.2 Easing Functions

| Name | Cubic Bezier | Usage |
|------|--------------|-------|
| easeOut | `(0, 0, 0.2, 1)` | Exits, appearing |
| easeIn | `(0.4, 0, 1, 1)` | Entries, disappearing |
| easeInOut | `(0.4, 0, 0.2, 1)` | Bidirectional |
| lyrics | `(0.25, 0.46, 0.45, 0.94)` | Smooth lyrics scroll |

### 5.3 Keyframe Animations

**FadeIn:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Glow (for active lyrics):**
```css
@keyframes glow {
  from {
    text-shadow: 0 0 10px var(--glow-color);
  }
  to {
    text-shadow: 0 0 20px var(--glow-color);
  }
}
```

**Pulse (for connection status):**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 6. Implementation Guidelines

### 6.1 Tailwind CSS Configuration

Add these tokens to `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'
import { colors, typography, spacing, borderRadius, shadows, animation, breakpoints } from './app/styles/tokens'

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors,
      typography,
      spacing,
      borderRadius,
      boxShadow: shadows,
      animation,
      screens: breakpoints,
    },
  },
  plugins: [],
} satisfies Config
```

### 6.2 CSS Custom Properties (Optional)

For runtime theme switching, define CSS custom properties:

```css
:root {
  --color-primary: #00bcd4;
  --color-bg-primary: #0a0a0a;
  --color-text-primary: #fafafa;
  /* ... other tokens */
}

[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-text-primary: #09090b;
  /* ... other light theme overrides */
}
```

### 6.3 Component Implementation Example

```typescript
// Example: LyricsDisplay using design tokens
import { colors, typography, animation } from '@/styles/tokens'

export function LyricsDisplay({ lyrics, currentIndex, theme }) {
  const themeColors = getThemeColors(theme)

  return (
    <div
      className="lyrics-display"
      style={{
        color: themeColors.lyrics.text,
        fontFamily: typography.fontFamily.lyrics,
        fontSize: '32px', // from settings
        lineHeight: typography.lineHeight.lyrics,
      }}
    >
      {lyrics.map((line, index) => (
        <div
          key={index}
          style={{
            color: index === currentIndex
              ? themeColors.lyrics.textActive
              : index === currentIndex - 1 || index === currentIndex + 1
              ? themeColors.lyrics.textAdjacent
              : themeColors.lyrics.textDim,
            transform: index === currentIndex ? 'scale(1.05)' : 'scale(1)',
            textShadow: index === currentIndex
              ? getLyricsGlow(theme)
              : 'none',
            transition: animation.duration.lyricsScroll,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  )
}
```

---

## 7. Accessibility Considerations

### 7.1 Color Contrast

All text combinations must meet WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text (18px+): 3:1 contrast ratio

### 7.2 Focus States

All interactive elements must have visible focus indicators:
- Ring: `0 0 0 3px rgb(0 188 212 / 0.2)`
- Border: `1px solid #00bcd4`

### 7.3 Reduced Motion

Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Related Documents

- [Component Contracts](../spec/component-contracts.md)
- [Core Type Definitions](../spec/types.md)
- [Prioritization](../prioritization.md)

---

**Document Version:** 1.0
**Last Updated:** 2026-03-12
