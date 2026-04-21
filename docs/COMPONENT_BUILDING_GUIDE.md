# jamie-os Component Building Guide

**Purpose:** This guide ensures all future components respect the design system and never deviate.

---

## The Golden Rule

🚫 **Never hardcode design values in components.**

✅ **Always reference tokens.**

---

## Component Template

Use this template for building new components:

```tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

/**
 * [ComponentName]
 * 
 * Brief description of what this component is and why it exists.
 * 
 * ✅ Design system compliant
 * ✅ No hardcoded values
 * ✅ All colors/spacing/radius/shadows via tokens
 */

const componentNameVariants = cva(
  // Base styles - ALL using CSS variables
  'base-class-here transition-all duration-[var(--motion-base)]',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-brand-primary)] text-[var(--color-fg-inverse)]',
        secondary: 'bg-[var(--color-bg-surface)] text-[var(--color-fg-primary)]',
      },
      size: {
        sm: 'px-[var(--spacing-md)] py-[var(--spacing-sm)]',
        md: 'px-[var(--spacing-lg)] py-[var(--spacing-md)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ComponentNameProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentNameVariants> {}

const ComponentName = React.forwardRef<HTMLDivElement, ComponentNameProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(componentNameVariants({ variant, size }), className)}
      {...props}
    />
  )
);
ComponentName.displayName = 'ComponentName';

export { ComponentName, componentNameVariants };
```

---

## CSS Variable Reference

### Colors
```
bg-[var(--color-bg-canvas)]          Canvas background
bg-[var(--color-bg-surface)]         Surface/card background
bg-[var(--color-bg-elevated)]        Elevated card background

text-[var(--color-fg-primary)]       Primary text
text-[var(--color-fg-secondary)]     Secondary text
text-[var(--color-fg-muted)]         Muted text

border-[var(--color-border-default)] Default border
border-[var(--color-border-subtle)]  Subtle border
border-[var(--color-border-strong)]  Strong border

bg-[var(--color-brand-primary)]      Brand primary
bg-[var(--color-brand-secondary)]    Brand secondary
text-[var(--color-status-success)]   Success green
text-[var(--color-status-danger)]    Danger red
text-[var(--color-task-doing)]       Task: in progress (blue)
text-[var(--color-task-done)]        Task: complete (green)
text-[var(--color-task-blocked)]     Task: blocked (red)
```

### Spacing
```
p-[var(--spacing-xs)]    4px
p-[var(--spacing-sm)]    8px
p-[var(--spacing-md)]    12px
p-[var(--spacing-lg)]    16px
p-[var(--spacing-xl)]    20px
p-[var(--spacing-2xl)]   24px
p-[var(--spacing-3xl)]   32px
gap-[var(--spacing-lg)]  Gap between items
```

### Radius
```
rounded-[var(--radius-xs)]    8px
rounded-[var(--radius-sm)]    12px
rounded-[var(--radius-md)]    16px
rounded-[var(--radius-lg)]    20px
rounded-[var(--radius-xl)]    24px
rounded-[var(--radius-2xl)]   32px
```

### Shadows
```
shadow-[var(--shadow-xs)]   Subtle shadow
shadow-[var(--shadow-sm)]   Card hover
shadow-[var(--shadow-md)]   Elevated card
shadow-[var(--shadow-lg)]   Deep panel
shadow-[var(--shadow-xl)]   Modal overlay
```

### Motion
```
duration-[var(--motion-fast)]          120ms
duration-[var(--motion-base)]          180ms
duration-[var(--motion-slow)]          260ms
```

### Font Families
```
font-display              Inter Tight (headings)
font-body                 Inter (body text)
font-mono                 JetBrains Mono (code)
```

---

## Common Component Patterns

### Button
```tsx
<button className="px-[var(--spacing-lg)] py-[var(--spacing-md)] rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] text-[var(--color-fg-inverse)] hover:bg-[var(--color-brand-primary-hover)] transition-colors duration-[var(--motion-base)]">
  Click me
</button>
```

### Card
```tsx
<div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-md)] p-[var(--spacing-lg)]">
  Content
</div>
```

### Text Hierarchy
```tsx
// Large heading
<h1 className="text-3xl font-bold font-display text-[var(--color-fg-primary)]">
// Medium heading
<h2 className="text-2xl font-semibold font-display text-[var(--color-fg-primary)]">
// Small heading
<h3 className="text-lg font-semibold font-body text-[var(--color-fg-secondary)]">
// Body text
<p className="text-base font-normal font-body text-[var(--color-fg-secondary)]">
// Small text
<p className="text-sm font-normal font-body text-[var(--color-fg-muted)]">
```

### Interactive States
```tsx
<button className="transition-all duration-[var(--motion-base)] hover:opacity-90 active:opacity-75 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-brand-primary)]">
```

### List Items
```tsx
<div className="flex items-center gap-[var(--spacing-md)] px-[var(--spacing-lg)] py-[var(--spacing-md)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors">
```

---

## Variants with CVA (class-variance-authority)

When a component has multiple variations, use CVA to define them centrally:

```tsx
const inputVariants = cva(
  'w-full px-[var(--spacing-md)] py-[var(--spacing-md)] rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-fg-primary)] placeholder-[var(--color-fg-muted)] transition-colors duration-[var(--motion-base)]',
  {
    variants: {
      status: {
        default: 'focus:border-[var(--color-brand-primary)]',
        error: 'border-[var(--color-status-danger)] focus:border-[var(--color-status-danger)]',
        success: 'border-[var(--color-status-success)] focus:border-[var(--color-status-success)]',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed bg-[var(--color-bg-elevated)]',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  }
);
```

---

## Animation Principles

Use `framer-motion` for complex animations, but always reference motion tokens:

```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: parseInt(tokens.motion.base) / 1000,  // Convert ms to s
    ease: tokens.motion.easeStandard,
  }}
/>
```

For simple transitions, use Tailwind + tokens:

```tsx
<div className="transition-all duration-[var(--motion-base)] hover:opacity-90">
```

---

## Icon Usage

All icons come from lucide-react. Reference by name:

```tsx
import { CheckSquare2, AlertCircle, TrendingUp } from 'lucide-react';

// Size classes using token values
<CheckSquare2 className="w-[var(--icon-lg)]" />  // 20px
<AlertCircle className="w-[var(--icon-md)]" />   // 18px
```

Icon sizes:
```
--icon-xs: 14px
--icon-sm: 16px
--icon-md: 18px
--icon-lg: 20px
--icon-xl: 24px
```

---

## Testing for Compliance

Before marking a component complete:

1. ✅ **No inline `style=` attributes** (use Tailwind only)
2. ✅ **No hardcoded hex colors** (use `var(--color-*)`)
3. ✅ **No hardcoded spacing** (use `var(--spacing-*)`)
4. ✅ **No hardcoded radius** (use `var(--radius-*)`)
5. ✅ **No hardcoded shadows** (use `var(--shadow-*)`)
6. ✅ **Motion uses tokens** (durations, easings)
7. ✅ **All text uses approved fonts** (display, body, mono)
8. ✅ **Component responsive and accessible**

---

## Extending the Design System

To add new tokens:

1. **Update `app/globals.css`** `:root` variables
2. **Update `lib/design/tokens.ts`** TypeScript definition
3. **Update `lib/design/utils.ts`** if needed for helpers
4. **Document in this file** with examples

Example: Adding a new breakpoint for mobile:
```css
--breakpoint-mobile: 480px;
```

---

## Questions?

If a component feels like it needs "just a little custom styling," that's a signal:
- It might need a new variant
- The design system might be missing a scale
- Or it's deviating and should be brought back in line

**Always default to the system. That's the whole point.**

---

Document updated: April 21, 2026
