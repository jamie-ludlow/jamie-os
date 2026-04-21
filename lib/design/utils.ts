/**
 * Design system utility functions
 * 
 * These helpers make it easy to reference and compose tokens
 * without hardcoding values anywhere in the component tree.
 */

import { tokens } from './tokens';

/**
 * Converts a token key path to a CSS variable reference
 * Example: cssVar('color', 'bg', 'canvas') => 'var(--color-bg-canvas)'
 */
export function cssVar(...path: string[]): string {
  return `var(--${path.join('-')})`;
}

/**
 * Gets a color token value
 * Example: color('brand', 'primary') => '#6ee7d8'
 */
export function getColor(
  category: keyof typeof tokens.color,
  ...path: string[]
): string {
  let value: any = tokens.color[category];
  for (const key of path) {
    value = value[key];
  }
  return value;
}

/**
 * Gets a spacing token value
 * Example: space('lg') => '16px'
 */
export function space(key: keyof typeof tokens.spacing): string {
  return tokens.spacing[key];
}

/**
 * Gets a radius token value
 * Example: radius('md') => '16px'
 */
export function radius(key: keyof typeof tokens.radius): string {
  return tokens.radius[key];
}

/**
 * Gets a shadow token value
 * Example: shadow('md') => '0 14px 40px rgba(0,0,0,0.20)'
 */
export function shadow(key: keyof typeof tokens.shadow): string {
  return tokens.shadow[key];
}

/**
 * Gets a motion token value
 * Example: motion('base') => '180ms'
 */
export function motion(key: keyof typeof tokens.motion): string {
  return tokens.motion[key];
}

/**
 * Combines multiple style values without needing style objects
 * Useful for inline styles when necessary
 */
export const styles = {
  focus: {
    outline: 'none',
    boxShadow: `0 0 0 3px ${getColor('bg', 'surface')}, 0 0 0 5px ${getColor('brand', 'primary')}`,
  } as const,
  focusRing: {
    outline: 'none',
    boxShadow: `0 0 0 2px var(--color-bg-surface), 0 0 0 4px var(--color-brand-primary)`,
  } as const,
};

/**
 * Shortcut for common interactive element hover/focus/active states
 */
export const interactiveStates = {
  hover: {
    opacity: 0.8,
    transition: `all ${motion('base')} ${tokens.motion.easeStandard}`,
  },
  active: {
    opacity: 0.6,
    transition: `all ${motion('fast')} ${tokens.motion.easeStandard}`,
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
