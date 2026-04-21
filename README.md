# jamie-os

**Task-first, premium command center**  
Design-system led. Built with Next.js, React, and Tailwind CSS.

```
Version 0.1.0-alpha
Status: Foundation complete ✅ | Dev server running
```

---

## Quick Start

```bash
# Install (already done)
npm install

# Start development server
npm run dev

# Open in browser
# http://localhost:3000
```

---

## What This Is

jamie-os is a task management command center designed around two principles:

1. **Task-first** — Everything else serves the core workflow
2. **Premium design** — Built with a real design system, not accumulated UI debt

It's being rebuilt from the ground up (separate from Mission Control) with:
- Clean architecture
- Design-system-led components
- No hardcoded styling
- Beautiful, consistent UI
- Fast iteration capability

---

## Key Features (In Progress)

- 📋 **Task Management** — List, board, filters, search
- 🎯 **Dashboard** — Today's focus, priority queue, progress
- 📝 **Task Details** — Rich editing, subtasks, due dates
- 🔄 **Board View** — Visual workflow progression
- ⚙️ **Settings** — Workspace configuration
- 🎨 **Design System** — Every pixel is a token

---

## Architecture

### Foundation Layer ✅
- Design tokens (colors, spacing, radius, shadows, motion)
- CSS variables (all design values)
- Typography system (3 approved font families)
- Icon system (lucide-react)
- Layout shell (sidebar + topbar)

### Component System (In Progress)
- Primitive components (Button, Card, Input, etc.)
- Pattern components (TaskRow, TaskCard, etc.)
- Page components (Dashboard, TaskList, Board)

### Data Layer (Next)
- Supabase schema
- Repository pattern
- Real-time updates

---

## Design System Philosophy

**No hardcoded design values anywhere.**

Every color, spacing, shadow, and animation comes from tokens:

```tsx
// ❌ Wrong
<div style={{ backgroundColor: '#6ee7d8', padding: '16px' }}>

// ✅ Right
<div className="bg-[var(--color-brand-primary)] p-[var(--spacing-lg)]">
```

Change the design by updating tokens. Everything updates automatically.

---

## Documentation

- **[BUILD_SUMMARY.md](docs/BUILD_SUMMARY.md)** — What's been built so far
- **[COMPONENT_BUILDING_GUIDE.md](docs/COMPONENT_BUILDING_GUIDE.md)** — How to build compliant components
- **[PHASE_3_ROADMAP.md](docs/PHASE_3_ROADMAP.md)** — Next steps and implementation plan
- **[design-system-spec.md](docs/design-system-spec.md)** — Visual design rules
- **[prototype-plan.md](docs/prototype-plan.md)** — Full 16-task build plan
- **[product-brief.md](docs/product-brief.md)** — Product scope and vision

---

## Project Structure

```
jamie-os/
├── app/                      # Next.js pages and layouts
│   ├── page.tsx             # Dashboard/Home
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Design tokens + utilities
│   ├── tasks/               # Tasks list page
│   ├── board/               # Kanban board page
│   ├── search/              # Search page
│   └── settings/            # Settings page
│
├── components/              # React components
│   ├── layout/             # Shell components
│   ├── system/             # Primitive components (Button, Card, etc.)
│   ├── patterns/           # Pattern components (future)
│   └── tasks/              # Task-specific components (future)
│
├── lib/                     # Utilities and helpers
│   ├── design/             # Design token utilities
│   ├── tasks/              # Task business logic (future)
│   └── supabase/           # Data layer (future)
│
├── docs/                    # Documentation
│   ├── BUILD_SUMMARY.md
│   ├── COMPONENT_BUILDING_GUIDE.md
│   ├── PHASE_3_ROADMAP.md
│   ├── design-system-spec.md
│   ├── design-tokens-starter.json
│   ├── prototype-plan.md
│   ├── product-brief.md
│   └── data-strategy.md
│
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.ts
```

---

## Tech Stack

- **Framework:** Next.js 16 + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Design:** CVA (class-variance-authority) + token system
- **Animations:** Framer-motion
- **Icons:** lucide-react
- **Backend:** Supabase (in progress)
- **Deployment:** Vercel (ready)

---

## Development Guidelines

### 1. Always Use Design Tokens
Never hardcode colors, spacing, or any design value.

### 2. Build Components with Variants
Use CVA for component variations instead of inline logic.

### 3. Reference the Design System
Check [COMPONENT_BUILDING_GUIDE.md](docs/COMPONENT_BUILDING_GUIDE.md) before building.

### 4. Test Design Compliance
Before completing a component:
- ✅ No inline styles
- ✅ No hardcoded colors
- ✅ All values from tokens
- ✅ Responsive layout
- ✅ Keyboard accessible

---

## What's Next?

**Phase 3 (Next):** Task features
- Task list view with search/filters
- Kanban board with drag-drop
- Task detail editing panel
- Create/edit flows

See [PHASE_3_ROADMAP.md](docs/PHASE_3_ROADMAP.md) for details.

---

## Running Commands

```bash
# Development
npm run dev          # Start dev server (localhost:3000)

# Production
npm run build        # Build for production
npm start           # Start production server

# Linting
npm run lint        # Check code quality
```

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Responsive design for:
- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)

---

## Questions & Next Steps

1. **See what's been built?** → Visit `http://localhost:3000`
2. **Understand the design system?** → Read [COMPONENT_BUILDING_GUIDE.md](docs/COMPONENT_BUILDING_GUIDE.md)
3. **Know what comes next?** → Check [PHASE_3_ROADMAP.md](docs/PHASE_3_ROADMAP.md)
4. **Want to change the design?** → Edit tokens in `app/globals.css`

---

**Built with ❤️ by Jasper · April 21, 2026**

*Design-system led, product-focused, built for speed and consistency.*
