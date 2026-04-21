# jamie-os Prototype Implementation Plan

> For Hermes: use this as the canonical build plan for the first jamie-os prototype.

## Goal

Create a task-first, premium, clean-slate successor prototype to Mission Control with a real design system and a narrow initial product scope.

## Architecture summary

- New Next.js app in a separate `jamie-os` project.
- Tailwind + token-driven design system from day one.
- Task-first UI only in v1.
- Data layer written so we can temporarily reuse existing Mission Control Supabase without coupling the product forever.

## Recommended stack

- Next.js
- React
- TypeScript
- Tailwind 4
- shadcn-style component architecture
- Radix primitives where useful
- Supabase
- lucide-react
- framer-motion only for restrained polish

---

## Phase 1 — Product and system definition

### Task 1: Lock the v1 product scope
Objective: define what is in and out for prototype v1.

Deliverables:
- `docs/product-brief.md`
- approved v1 scope list
- approved non-goals list

Success criteria:
- task-first prototype scope is explicit
- communication/docs/agent orchestration are clearly deferred unless re-approved

### Task 2: Lock the design system specification
Objective: define the visual operating rules before feature implementation.

Deliverables:
- `docs/design-system-spec.md`

Success criteria:
- tokens, scales, component expectations, and product patterns are documented
- “no off-piste styling” rule is explicit

### Task 3: Define prototype route map and IA
Objective: prevent navigation sprawl before building pages.

Routes for v1:
- `/`
- `/tasks`
- `/tasks/list`
- `/tasks/board`
- `/search`
- `/settings`

Success criteria:
- route map is small and deliberate
- each route has a clear reason to exist

---

## Phase 2 — App shell and design system foundations

### Task 4: Create the new app shell
Objective: establish a premium layout skeleton before feature work.

Core shell pieces:
- root layout
- sidebar
- topbar
- page container
- content width rules
- responsive mobile navigation behaviour

Success criteria:
- app shell is visually coherent with placeholder pages
- shell already feels premium without feature complexity

### Task 5: Implement token architecture
Objective: make every core visual attribute configurable centrally.

Required token groups:
- colors
- typography
- spacing
- radius
- shadow
- motion

Success criteria:
- shell/components consume tokens, not hardcoded values
- theme switch to future light mode remains feasible

### Task 6: Implement primitive component set
Objective: create the reusable building blocks first.

Required components:
- button
- input
- textarea
- select
- badge
- card
- sheet
- modal
- tabs
- table
- empty state
- filter chip
- search field
- skeleton

Success criteria:
- all primitives feel visually related
- no task screen needs bespoke base styling to be usable

### Task 7: Implement product-level patterns
Objective: create reusable page/task patterns before feature assembly.

Required patterns:
- page header
- section header
- stat card
- task row
- task card
- task detail sheet
- filter bar
- view switcher

Success criteria:
- pattern library is enough to build task surfaces quickly
- screens use patterns, not raw layout improvisation

---

## Phase 3 — Task-first prototype

### Task 8: Build the home/dashboard page
Objective: create one premium command-center landing view.

Include only a focused set:
- today / next / blocked summary
- recent tasks
- priority queue
- one concise progress area

Do not include widget sprawl.

Success criteria:
- home feels elegant and useful immediately
- no cluttered dashboard syndrome

### Task 9: Build list-based task view
Objective: make the fastest, clearest operational task view.

Core capabilities:
- search
- status filter
- priority filter
- assignee filter if needed
- due date visibility
- quick open task details

Success criteria:
- list view is usable as a primary execution surface
- hierarchy is visually clear

### Task 10: Build board view
Objective: support visual workflow progression without sacrificing polish.

Core capabilities:
- board columns from task statuses
- drag/drop or simulated movement in prototype stage
- compact but readable cards
- consistent status visual treatment

Success criteria:
- board feels premium and calm, not busy
- cards align fully with design-system patterns

### Task 11: Build task detail sheet
Objective: centralize task depth without cluttering the main views.

Include:
- title
- status
- priority
- description
- due date
- assignee
- subtasks placeholder or v1-ready support
- activity placeholder if not yet live

Success criteria:
- opening a task feels like entering a focused execution context
- detail sheet becomes the natural home for future collaboration/comments

### Task 12: Build create/edit flows
Objective: ensure task capture is smooth and polished.

Include:
- create task modal/sheet
- edit task form
- validation states
- success feedback

Success criteria:
- creation is quick
- forms feel system-consistent

---

## Phase 4 — Data layer and Supabase strategy

### Task 13: Define temporary data strategy
Objective: decide how the prototype reads/writes tasks.

Preferred first options:
- Option A: separate jamie-os schema/tables in existing Mission Control Supabase
- Option B: direct reuse of existing task tables with a thin repository layer

Recommendation:
- build a repository/service layer so data implementation can be swapped later

Success criteria:
- UI does not depend directly on one hardcoded schema shape everywhere

### Task 14: Define migration path to dedicated jamie-os Supabase
Objective: avoid accidental permanent coupling.

Deliverables:
- notes in docs or code comments describing how to move to:
  - dedicated Supabase project
  - dedicated env vars
  - dedicated schema

Success criteria:
- shared-Supabase usage remains a tactical shortcut, not a structural trap

---

## Phase 5 — Review and iteration readiness

### Task 15: Run design-system consistency review
Objective: verify the prototype obeys the system it claims to have.

Check:
- no hardcoded design values in feature screens
- no random local styling
- no rogue typography/spacing/radius usage
- all interactive states are consistent

Success criteria:
- app can evolve by changing tokens/variants instead of rewriting screens

### Task 16: Run task-first product review
Objective: ensure the prototype is centered correctly.

Ask:
- does this feel like a task operating system?
- is the core workflow better than Mission Control’s current shape?
- are we still resisting extra product sprawl?

Success criteria:
- prototype is strong enough to review before adding communication or broader system surfaces

---

## Initial file/folder recommendation

Recommended initial structure:

- `app/`
- `components/system/`
- `components/patterns/`
- `components/tasks/`
- `components/layout/`
- `lib/design/`
- `lib/tasks/`
- `lib/supabase/`
- `styles/`
- `docs/`

Suggested docs:
- `docs/product-brief.md`
- `docs/design-system-spec.md`
- `docs/prototype-plan.md`
- `docs/data-strategy.md`

## Prototype acceptance criteria

Prototype v1 is review-ready when:
- shell is polished
- design system is real and enforced
- task list works
- task board works
- task detail sheet works
- create/edit flow works
- product remains narrow and premium

## Explicit deferrals

Do not add these yet unless explicitly brought in:
- full chat
- docs/publishing surfaces
- large dashboard analytics suite
- deep agent orchestration
- external sync complexity
- release/changelog/proposals system parity

## Recommended next immediate build step

Start with:
1. app shell
2. design tokens
3. primitive components
4. task list
5. task detail sheet
6. board view

That order gives the best balance of visual quality and fast visible progress.
