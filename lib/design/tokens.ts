/**
 * jamie-os Design Tokens
 * 
 * This is the single source of truth for all visual design.
 * Never hardcode color/spacing/radius/shadow values in components.
 * Always reference tokens from here.
 * 
 * Changes made here automatically cascade through the entire app
 * via CSS variables and component variants.
 */

export const tokens = {
  // Colors - Dark cinematic theme
  color: {
    bg: {
      canvas: '#07090b',
      surface: '#0d1117',
      elevated: '#131922',
      overlay: 'rgba(5, 8, 12, 0.72)',
    },
    fg: {
      primary: '#f5f7fa',
      secondary: '#c8d0db',
      muted: '#8b97a7',
      inverse: '#081018',
    },
    border: {
      subtle: 'rgba(255,255,255,0.06)',
      default: 'rgba(255,255,255,0.10)',
      strong: 'rgba(255,255,255,0.18)',
    },
    brand: {
      primary: '#6ee7d8',
      primaryHover: '#8af1e4',
      primaryActive: '#4fd7c6',
      secondary: '#7dd3fc',
      accent: '#b8f3ff',
    },
    status: {
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#fb7185',
      info: '#60a5fa',
      neutral: '#94a3b8',
    },
    task: {
      todo: '#94a3b8',
      doing: '#60a5fa',
      done: '#34d399',
      blocked: '#fb7185',
      backlog: '#c084fc',
    },
  },

  // Spacing scale - 4px base
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
    '6xl': '56px',
    '7xl': '64px',
    '8xl': '80px',
    '9xl': '96px',
  },

  // Border radius scale
  radius: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px',
  },

  // Shadows - depth system
  shadow: {
    xs: '0 1px 2px rgba(0,0,0,0.18)',
    sm: '0 8px 24px rgba(0,0,0,0.16)',
    md: '0 14px 40px rgba(0,0,0,0.20)',
    lg: '0 22px 60px rgba(0,0,0,0.24)',
    xl: '0 32px 90px rgba(0,0,0,0.28)',
  },

  // Motion - animation timings
  motion: {
    fast: '120ms',
    base: '180ms',
    slow: '260ms',
    easeStandard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    easeEnter: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeExit: 'cubic-bezier(0.7, 0, 0.84, 0)',
  },

  // Typography - font families
  font: {
    display: 'var(--font-inter-tight)',
    body: 'var(--font-inter)',
    mono: 'var(--font-jetbrains-mono)',
  },

  // Icon sizes
  icon: {
    xs: '14px',
    sm: '16px',
    md: '18px',
    lg: '20px',
    xl: '24px',
  },
} as const;

/**
 * Export types for TypeScript component definitions
 */
export type Token = typeof tokens;
export type ColorKey = keyof typeof tokens.color;
export type SpacingKey = keyof typeof tokens.spacing;
export type RadiusKey = keyof typeof tokens.radius;
export type ShadowKey = keyof typeof tokens.shadow;
export type MotionKey = keyof typeof tokens.motion;
