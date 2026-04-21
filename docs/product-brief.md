# jamie-os Product Brief

> Purpose: define the clean-slate successor direction for Mission Control before implementation begins.

## Product summary

jamie-os is a task-first operating system for Jamie.

It replaces the broad, accumulated shape of Mission Control with a cleaner, more deliberate product:
- a premium command center
- a beautiful and fast task workflow
- a strict design system
- a modular foundation for future communication, agent collaboration, docs, and operations surfaces

## Core product principle

Tasks are the heart of the system.

Everything else should either:
1. help create, prioritize, track, and complete tasks, or
2. be explicitly deferred until the task experience is excellent.

## Product goals for v1

1. Build a premium, modern interface that feels calm, focused, and intentional.
2. Deliver a task workflow that is simpler and cleaner than Mission Control.
3. Establish a real design system so visual changes can be made centrally later.
4. Keep architecture narrow enough that future features can be added without degrading clarity.
5. Create a foundation we can later use together inside the app.

## Non-goals for v1

Do not build these in the first prototype unless explicitly re-approved:
- full internal chat/messaging system
- large analytics/dashboard widget sprawl
- publishing / docs / control-center complexity
- external integrations beyond what is needed for prototype realism
- broad agent orchestration
- clone-level parity with Mission Control

## Product positioning

jamie-os is not “Mission Control but renamed.”

jamie-os is:
- a cleaner successor path
- task-first by design
- design-system-led from day one
- intentionally constrained

Mission Control remains a reference surface, not the template.

## Primary users

### Primary
- Jamie as operator, planner, and executor

### Secondary later
- trusted agents operating inside a visible task system
- collaborators if/when sharing becomes a real requirement

## Primary use cases for v1

1. See the current task landscape immediately.
2. Capture new work quickly.
3. Move work through a clear execution flow.
4. Open a task and understand everything needed to act.
5. Filter work by what matters now.
6. Feel clarity, not clutter.

## UX principles

1. Calm over busy
- whitespace is a feature
- fewer simultaneous surfaces
- less chrome, more content

2. Depth without mess
- advanced details live in drawers, sheets, or secondary surfaces
- primary views stay light and legible

3. One obvious action at a time
- every page should have a clear primary action
- avoid feature competition in the UI

4. Polished motion
- restrained animation
- meaningful transitions
- no flashy motion for its own sake

5. System consistency
- no one-off page styling
- no ad hoc spacing
- no random hover treatments
- no local visual inventions outside the design system

## Product structure for prototype

### Included in prototype
- app shell
- navigation
- dashboard / home
- task list view
- task board view
- task detail panel
- filters and search
- create/edit task flows
- design-system foundation and component library

### Deferred until after prototype review
- comments / communication
- agent collaboration surfaces
- docs / publishing
- external sync
- usage tracking
- proposals / changelog

## Data direction

Prototype should support one of two data modes:

### Preferred early mode
- reuse existing Mission Control Supabase temporarily for speed
- but isolate jamie-os tables or schema names wherever practical

### Future target mode
- dedicated jamie-os Supabase project

Implementation rule:
- app architecture should not assume the shared database is permanent
- data access should be written so migration to a dedicated Supabase later is straightforward

## Brand / visual direction

Desired feel:
- premium
- modern
- minimal
- dark-first
- precise
- editorial where helpful
- high trust and high clarity

Inspirational direction:
- refined SaaS polish like Reflag
- modern UX examples with strong hierarchy, rhythm, and restraint

## Success criteria for prototype

Prototype is successful when:
- it looks distinctly more intentional than Mission Control
- task workflow feels cleaner and more focused
- visual consistency is obvious across screens
- changing tokens in the design system would clearly propagate through the app
- future scope feels easier, not messier

## Key constraints

- keep v1 narrow
- no off-piste styling
- no uncontrolled feature sprawl
- no product areas added without design-system alignment
- no hardcoded page-level design decisions that should be tokenized or componentized

## Build sequence

1. Product brief
2. Design system specification
3. Information architecture and screens
4. Prototype implementation plan
5. App shell + design primitives
6. Task workflow prototype
7. Review and adjust before wider expansion
