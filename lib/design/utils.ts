/**
 * Design system utility functions
 * Works with CSS variables for dynamic theming
 */

/**
 * CSS variable shortcuts for cleaner code
 */
export const css = {
  // Background colors
  bgCanvas: 'var(--color-bg-canvas)',
  bgSurface: 'var(--color-bg-surface)',
  bgElevated: 'var(--color-bg-elevated)',
  bgOverlay: 'var(--color-bg-overlay)',

  // Foreground colors
  fgPrimary: 'var(--color-fg-primary)',
  fgSecondary: 'var(--color-fg-secondary)',
  fgMuted: 'var(--color-fg-muted)',
  fgInverse: 'var(--color-fg-inverse)',

  // Borders
  borderSubtle: 'var(--color-border-subtle)',
  borderDefault: 'var(--color-border-default)',
  borderStrong: 'var(--color-border-strong)',

  // Brand
  brandPrimary: 'var(--color-brand-primary)',
  brandSecondary: 'var(--color-brand-secondary)',
  brandAccent: 'var(--color-brand-accent)',

  // Status
  statusSuccess: 'var(--color-status-success)',
  statusWarning: 'var(--color-status-warning)',
  statusDanger: 'var(--color-status-danger)',
  statusInfo: 'var(--color-status-info)',

  // Spacing
  spacingXs: 'var(--spacing-xs)',
  spacingSm: 'var(--spacing-sm)',
  spacingMd: 'var(--spacing-md)',
  spacingLg: 'var(--spacing-lg)',
  spacingXl: 'var(--spacing-xl)',

  // Motion
  motionFast: 'var(--motion-fast)',
  motionBase: 'var(--motion-base)',
  motionSlow: 'var(--motion-slow)',
};
