'use client';

import React from 'react';
import { clsx } from 'clsx';

/**
 * Card Component
 * 
 * Consistent card/panel component using design tokens for:
 * - background color
 * - border
 * - shadow
 * - padding
 * - radius
 * 
 * All values come from the design system, never hardcoded.
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  elevated?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, elevated = false, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        // Base token-driven styles
        'bg-[var(--color-bg-surface)]',
        'border border-[var(--color-border-default)]',
        'rounded-[var(--radius-md)]',
        'p-[var(--spacing-lg)]',
        elevated && [
          'bg-[var(--color-bg-elevated)]',
          'border-[var(--color-border-strong)]',
          'shadow-[var(--shadow-md)]',
        ],
        interactive && [
          'cursor-pointer',
          'transition-all duration-[var(--motion-base)]',
          'hover:border-[var(--color-border-strong)]',
          'hover:shadow-[var(--shadow-md)]',
          'active:opacity-90',
        ],
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('pb-[var(--spacing-lg)] border-b border-[var(--color-border-default)]', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('pt-[var(--spacing-lg)]', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'pt-[var(--spacing-lg)] border-t border-[var(--color-border-default)] flex items-center gap-[var(--spacing-md)]',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
