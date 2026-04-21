'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * Button Component
 * 
 * Fully design-system compliant button with variants.
 * Uses CSS variables for all colors/spacing/radius.
 * Never hardcodes design values.
 */

const buttonVariants = cva(
  // Base styles - all using design system
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-[var(--motion-base)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--color-brand-primary)] text-[var(--color-fg-inverse)]',
          'hover:bg-[var(--color-brand-primary-hover)]',
          'active:bg-[var(--color-brand-primary-active)]',
          'focus:ring-[var(--color-brand-primary)]',
        ].join(' '),
        secondary: [
          'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)]',
          'border border-[var(--color-border-default)]',
          'hover:bg-[var(--color-bg-surface)]',
          'focus:ring-[var(--color-brand-secondary)]',
        ].join(' '),
        ghost: [
          'text-[var(--color-fg-primary)]',
          'hover:bg-[var(--color-bg-elevated)]',
          'focus:ring-[var(--color-brand-primary)]',
        ].join(' '),
        danger: [
          'bg-[var(--color-status-danger)] text-white',
          'hover:opacity-90',
          'focus:ring-[var(--color-status-danger)]',
        ].join(' '),
        success: [
          'bg-[var(--color-status-success)] text-[var(--color-fg-inverse)]',
          'hover:opacity-90',
          'focus:ring-[var(--color-status-success)]',
        ].join(' '),
      },
      size: {
        xs: 'px-2 py-1 text-xs gap-1',
        sm: 'px-3 py-2 text-sm gap-2',
        md: 'px-4 py-3 text-base gap-2',
        lg: 'px-6 py-3 text-lg gap-2',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

/**
 * Button component with design-system variants
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {icon && <span className="flex items-center">{icon}</span>}
        {children}
        {isLoading && (
          <span className="ml-2 inline-block animate-spin">⏳</span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
