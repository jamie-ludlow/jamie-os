# jamie-os Development Roadmap

**Current Status:** Foundation Complete (v0.1.0-alpha)  
**Ready for:** Phase 3 — Task Features

---

## Phase 3: Task-First Prototype (Next)

### Overview
Transform the app from shell + home page into a working task management system. All built with design-system components from day one.

### Tasks to Implement

#### Task 3.1: Task List View
**Goal:** Make the fastest, clearest task list view.

Components needed:
- [ ] `TaskRow` component (checkbox + title + status + priority + due)
- [ ] `TaskFilters` component (status, priority, assignee filters)
- [ ] `TaskSearch` input with debounce
- [ ] `TaskListPage` combining above
- [ ] Empty state for no tasks

Design decisions:
- Single-column list with horizontal scrollable action buttons
- Status colors via `--color-task-*` tokens
- Row hover state lifts card shadow
- Clicking row opens detail sheet

**Files to create:**
- `components/tasks/TaskRow.tsx`
- `components/tasks/TaskFilters.tsx`
- `components/tasks/TaskSearch.tsx`
- `components/patterns/TaskList.tsx`
- Update `app/tasks/page.tsx`

---

#### Task 3.2: Task Board View
**Goal:** Kanban board respecting design system.

Components needed:
- [ ] `BoardColumn` component (status column)
- [ ] `TaskCard` component (compact, colorized)
- [ ] `BoardGrid` layout
- [ ] Drag-drop logic (react-beautiful-dnd or custom)
- [ ] Empty column state

Design decisions:
- 5 columns: Todo, Doing, Done, Blocked, Backlog
- Card height fixed, title truncates
- Card colors reflect priority not status
- Smooth column scrolling on small screens

**Files to create:**
- `components/tasks/TaskCard.tsx`
- `components/tasks/BoardColumn.tsx`
- `components/patterns/TaskBoard.tsx`
- Update `app/board/page.tsx`

---

#### Task 3.3: Task Detail Sheet
**Goal:** Focused editing/viewing context.

Components needed:
- [ ] `TaskDetailSheet` component (right-side sheet)
- [ ] `TaskTitle` editable field
- [ ] `TaskDescription` markdown-supported textarea
- [ ] `TaskStatus` dropdown
- [ ] `TaskPriority` picker
- [ ] `TaskDueDate` date picker
- [ ] `TaskAssignee` selector
- [ ] `TaskSubtasks` list
- [ ] `TaskActivityFeed` (placeholder)
- [ ] Close/save buttons

Design decisions:
- Slides in from right on desktop
- Full-screen modal on mobile
- Save on blur for fields
- Undo support for multifield changes

**Files to create:**
- `components/tasks/TaskDetailSheet.tsx`
- `components/tasks/TaskFields.tsx` (all the field components)
- `components/patterns/TaskDetail.tsx`

---

#### Task 3.4: Create/Edit Task Flows
**Goal:** Smooth task capture and modification.

Components needed:
- [ ] `CreateTaskModal` (quick capture)
- [ ] `QuickTaskInput` (title + press Enter)
- [ ] Form validation
- [ ] Success feedback (toast)

Design decisions:
- "New Task" button opens modal with title field focused
- Tab key moves to description
- Escape cancels, Cmd+Enter saves
- Flash success state before sheet opens

**Files to create:**
- `components/tasks/CreateTaskModal.tsx`
- `components/tasks/TaskForm.tsx`
- `components/system/Toast.tsx`

---

### Component Library Expansion

Build these system components (used by task features):

- [ ] `Input.tsx` — text input with status states
- [ ] `Select.tsx` — dropdown selector
- [ ] `Textarea.tsx` — multi-line text
- [ ] `DatePicker.tsx` — date selection
- [ ] `Checkbox.tsx` — task checkbox
- [ ] `Badge.tsx` — status/priority badges
- [ ] `Tabs.tsx` — for task list/board switcher
- [ ] `Sheet.tsx` — side panel
- [ ] `Modal.tsx` — dialog
- [ ] `Toast.tsx` — notifications
- [ ] `Skeleton.tsx` — loading state
- [ ] `EmptyState.tsx` — no data placeholder

---

### Data Layer Setup

#### Task 4.1: Supabase Schema
**Goal:** Define task table structure.

Schema:
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(50) DEFAULT 'medium',
  due_date TIMESTAMP,
  assignee_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID NOT NULL,
  workspace_id UUID NOT NULL
);
```

**Files to create:**
- `lib/supabase/schema.sql` — full schema definition
- Update `docs/data-strategy.md` with schema

---

#### Task 4.2: Repository Layer
**Goal:** Decouple UI from data structure.

Pattern:
```tsx
// UI never talks to Supabase directly
const tasks = await taskRepository.list({ status: 'doing' });

// Repository handles all queries
// Can be swapped to new Supabase project later without UI changes
```

**Files to create:**
- `lib/tasks/TaskRepository.ts`
- `lib/tasks/types.ts` — Task, TaskStatus, TaskPriority types
- `lib/supabase/client.ts` — Supabase initialization

---

### Testing Readiness

- [ ] No console errors or TypeScript issues
- [ ] Design tokens used consistently
- [ ] All colors from `--color-*` variables
- [ ] All spacing from `--spacing-*` variables
- [ ] No hardcoded design values anywhere
- [ ] Responsive layout on mobile (sidebar becomes hamburger)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Framer-motion animations smooth and purposeful

---

## Phase 5: Polish & Launch Readiness

After Phase 3/4 complete:

- [ ] Design system audit (no off-piste styling)
- [ ] Accessibility pass (WCAG AA minimum)
- [ ] Performance audit (Lighthouse scores)
- [ ] Mobile responsiveness complete
- [ ] Error states and edge cases handled
- [ ] Loading states polished
- [ ] Empty states beautiful
- [ ] Onboarding flow (first-time user)
- [ ] Theming infrastructure ready (for future light mode)

---

## Build Priorities

**Must Do First:**
1. Task list view (core execution surface)
2. Task detail sheet (editing context)
3. Create task flow (new item capture)

**Then:**
4. Board view (alternative visualization)
5. System components (used by features)
6. Data layer (real backend)

**Polish after:**
7. Animations & micro-interactions
8. Accessibility & keyboard nav
9. Performance optimization

---

## Deferred (Explicitly Out of Scope)

These are **not** part of the initial prototype:

- ❌ Communication/chat
- ❌ Documents/publishing
- ❌ Deep analytics
- ❌ Agent orchestration
- ❌ External sync
- ❌ Advanced permissions
- ❌ Changelog/proposals system

**These can be added after Phase 3-4 are solid.**

---

## Entry Point for Phase 3

When ready to start Phase 3:

1. Go to `app/tasks/page.tsx`
2. Replace placeholder with `TaskListPage` component
3. Build `TaskRow` and related components
4. Wire up filters
5. Test design system compliance
6. Iterate based on look and feel

**Command to start dev:**
```bash
npm run dev
# Visit http://localhost:3000/tasks
```

---

## Success Criteria for Phase 3

Prototype is review-ready when:
- ✅ Task list works and feels natural
- ✅ Board view looks beautiful and is usable
- ✅ Task detail sheet feels right
- ✅ Create/edit flows are smooth
- ✅ All design system tokens are respected
- ✅ No visual regressions from home page
- ✅ Performance is excellent (Lighthouse >90)
- ✅ Mobile layout is clean and usable

---

**Next Review:** After Phase 3 implementation complete  
**Estimated Timeline:** 2-3 days for Phase 3 with focused effort  
**Checkpoint:** Task list + detail sheet working before board

---

Document created: April 21, 2026
Ready for Phase 3 implementation when approved
