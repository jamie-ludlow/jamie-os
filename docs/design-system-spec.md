# jamie-os Design System Specification

> Goal: ensure every visual decision is made through a reusable system, not page-by-page improvisation.

## Design system philosophy

The design system is the product's visual operating system.

Nothing should be styled “just for this one page” unless it becomes a reusable pattern immediately.

## System rules

1. No hardcoded hex values inside feature components.
2. No hardcoded spacing values unless they are on the approved spacing scale.
3. No page-specific hover/focus treatments outside semantic tokens or shared component variants.
4. No new icon set without explicit approval.
5. No local font overrides outside typography tokens.
6. No local shadow/radius inventions outside the token set.
7. Feature work must consume the design system, not bypass it.

## Foundation tokens

## Color model

Use semantic tokens, not literal colours, at component level.

### Base tokens
- --bg-canvas
- --bg-surface
- --bg-elevated
- --bg-overlay
- --fg-primary
- --fg-secondary
- --fg-muted
- --fg-inverse
- --border-subtle
- --border-default
- --border-strong
- --ring-focus

### Brand tokens
- --brand-primary
- --brand-primary-hover
- --brand-primary-active
- --brand-secondary
- --brand-accent

### Status tokens
- --status-success
- --status-warning
- --status-danger
- --status-info
- --status-neutral

### Task-specific semantic tokens
- --task-todo
- --task-doing
- --task-done
- --task-blocked
- --task-backlog

Implementation note:
- feature components should use semantic task/status tokens rather than inventing their own badge colours

## Theme direction

### Primary mode for prototype
- dark-first
- rich black/graphite canvas
- elevated surfaces with subtle contrast separation
- restrained teal/ice accent family unless revised later

### Future support
- light theme may be added later
- all tokens must be themeable from the start

## Typography

## Font roles
- Display: one premium sans family for hero/page headers
- Body/UI: one highly legible sans family
- Mono: one code/data mono family

## Typography scale
- display-xl
- display-lg
- h1
- h2
- h3
- title-lg
- title-md
- body-lg
- body-md
- body-sm
- label-lg
- label-md
- label-sm
- meta

Implementation rule:
- components reference named text styles, not ad hoc text classes

## Spacing scale

Approved spacing scale:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48
- 56
- 64
- 80
- 96

Rule:
- component internals and page layout spacing should come from this scale only

## Radius scale
- radius-xs
- radius-sm
- radius-md
- radius-lg
- radius-xl
- radius-2xl

Rule:
- cards, inputs, dialogs, sheets, badges all consume shared radius tokens

## Shadow scale
- shadow-xs
- shadow-sm
- shadow-md
- shadow-lg
- shadow-xl

Rule:
- no custom shadows in feature code

## Motion

### Duration tokens
- motion-fast: 120ms
- motion-base: 180ms
- motion-slow: 260ms

### Easing tokens
- ease-standard
- ease-enter
- ease-exit

### Motion principles
- transitions should clarify structure
- hover motion should be subtle
- entrance motion should be minimal and fast
- large page transitions should never feel theatrical

## Iconography

Approved icon system:
- lucide-react only for v1

Rules:
- icon size scale must be standardized
- icon stroke weight should remain consistent
- do not mix icon families

## Interaction states

Every interactive component should define:
- default
- hover
- active
- focus-visible
- disabled
- destructive if relevant

These states must come from system tokens/variants, not feature-local CSS inventions.

## Core components

## Required primitives
- Button
- IconButton
- Input
- Textarea
- Select
- Command palette
- Tabs
- Badge
- Card
- Panel
- Divider
- Tooltip
- Modal
- Sheet / Drawer
- Table
- EmptyState
- SearchField
- FilterChip
- Avatar
- Skeleton

## Product-specific components
- AppShell
- SidebarNavItem
- TopbarAction
- PageHeader
- SectionHeader
- StatCard
- TaskCard
- TaskRow
- TaskStatusBadge
- PriorityBadge
- TaskDetailSheet
- FilterBar
- ViewSwitcher

## Product patterns

## Page composition patterns
- shell + sidebar + topbar + content
- shell + content only for focus pages
- split view for list/detail workflows
- board layout with fixed board rhythm

## Task patterns
- compact task row
- rich task card
- task detail sheet
- create task modal/sheet
- saved filter / view bar

## Empty-state patterns
Every empty state should include:
- concise headline
- one-sentence explanation
- one clear CTA
- optional illustration/icon only if it adds clarity

## Information architecture for prototype

Primary nav should be minimal:
- Home
- Tasks
- Views
- Search
- Settings

Potential prototype routes:
- /
- /tasks
- /tasks/board
- /tasks/list
- /search
- /settings

Avoid broad top-level nav sprawl in v1.

## Design QA checklist

Before any screen is considered done:
- Is it using tokens instead of hardcoded design values?
- Are typography styles from the shared scale?
- Are spacing values on the approved scale?
- Are interactive states consistent with the system?
- Are icons from the approved set?
- Would a token change propagate through this screen correctly?
- Does the screen look like it belongs to the rest of the product?

## Future-proofing rule

If later we want to shift visual direction, we should be able to change:
- color tokens
- typography tokens
- spacing/radius/shadow tokens
- component variants

and see the app update broadly without rewriting feature screens.

That is the standard jamie-os must meet.
