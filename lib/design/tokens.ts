/**
 * jamie-os Design Tokens - Linear-Inspired Professional
 * 
 * Refined, minimal, enterprise-grade color system
 * Supports light and dark themes seamlessly
 */

export const tokens = {
  // Light theme
  light: {
    bg: {
      canvas: '#ffffff',
      surface: '#f7f6f3',
      elevated: '#efefed',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    fg: {
      primary: '#000000',
      secondary: '#626262',
      muted: '#8f8f8f',
      inverse: '#ffffff',
    },
    border: {
      subtle: '#e5e5e5',
      default: '#d4d4d4',
      strong: '#bfbfbf',
    },
    brand: {
      primary: '#0d66d0',
      primaryHover: '#0a51a8',
      primaryActive: '#083884',
      secondary: '#6366f1',
      accent: '#06b6d4',
    },
    status: {
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#0284c7',
      neutral: '#6b7280',
    },
  },

  // Dark theme
  dark: {
    bg: {
      canvas: '#0a0a0a',
      surface: '#16161a',
      elevated: '#1e1e24',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    fg: {
      primary: '#ffffff',
      secondary: '#b4b4b4',
      muted: '#808080',
      inverse: '#0a0a0a',
    },
    border: {
      subtle: '#2a2a2e',
      default: '#3a3a3f',
      strong: '#4a4a4f',
    },
    brand: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryActive: '#1d4ed8',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#0ea5e9',
      neutral: '#9ca3af',
    },
  },

  // Shared (works for both themes)
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

  radius: {
    none: '0px',
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadow: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  motion: {
    fast: '100ms',
    base: '150ms',
    slow: '200ms',
    easeStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeEnter: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeExit: 'cubic-bezier(0.7, 0, 0.84, 0)',
  },

  font: {
    display: 'Inter',
    body: 'Inter',
    mono: 'JetBrains Mono',
  },

  icon: {
    xs: '14px',
    sm: '16px',
    md: '18px',
    lg: '20px',
    xl: '24px',
  },
} as const;

export type Token = typeof tokens;
